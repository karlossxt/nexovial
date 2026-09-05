// POST /api/geolocate — función autocontenida (sin imports compartidos para Vercel)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);
const AI_RATE_PER_MIN = Number(process.env.AI_RATE_PER_MIN || 60);
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

interface Req {
  body: { text?: unknown };
  headers: Record<string, string | string[] | undefined>;
  headers_fallback?: { forwarded?: string };
  ip?: string;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGroqWithFallback(
  prompt: string,
  options?: { responseJson?: boolean }
): Promise<string | null> {
  if (!GROQ_API_KEY) {
    console.warn('GROQ_API_KEY no configurada; usando heurística local.');
    return null;
  }
  const baseBody: Record<string, unknown> = {
    messages: [
      {
        role: 'system',
        content:
          'Eres un analista senior de tráfico y seguridad vial de México. Responde únicamente con JSON válido, sin markdown.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 700,
  };
  if (options?.responseJson) baseBody.response_format = { type: 'json_object' };

  for (const model of GROQ_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(GROQ_BASE, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({ ...baseBody, model }),
        });
        clearTimeout(timer);
        if (!response.ok) {
          if (response.status === 429 && attempt < 2) {
            const retryAfter = Number(response.headers.get('retry-after') || 1);
            console.warn(`[Groq ${model}] 429, reintentando en ${retryAfter}s.`);
            await delay(Math.max(retryAfter, 1) * 1000);
            continue;
          }
          console.warn(`[Groq ${model}] HTTP ${response.status}`);
          break;
        }
        const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
        break;
      } catch (err) {
        clearTimeout(timer);
        if ((err as Error)?.name === 'AbortError') {
          console.warn(`[Groq ${model}] timeout (30s)`);
          break;
        }
        console.warn(`[Groq ${model}] intento ${attempt + 1}: ${(err as Error)?.message}`);
        if (attempt < 2) await delay(500 * (attempt + 1));
      }
    }
  }
  return null;
}

// Rate limiting (Upstash Redis con fallback en memoria)
interface Limiter {
  limit(identifier: string): Promise<{ success: boolean; retryAfter?: number }>;
}
function memoryLimiter(max: number): Limiter {
  const hits = new Map<string, number[]>();
  return {
    async limit(identifier: string) {
      const now = Date.now();
      const times = (hits.get(identifier) || []).filter((t) => now - t < 60_000);
      if (times.length >= max) {
        hits.set(identifier, times);
        return { success: false, retryAfter: 30 };
      }
      times.push(now);
      hits.set(identifier, times);
      return { success: true };
    },
  };
}
function redisLimiter(prefix: string, max: number): Limiter {
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(max, '1 m'),
    prefix,
  });
  return {
    async limit(identifier: string) {
      const { success, reset } = await ratelimit.limit(identifier);
      const retryAfter = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 30;
      return { success, retryAfter };
    },
  };
}
const hasUpstash = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
const aiLimiter = hasUpstash ? redisLimiter('nexo:geo', AI_RATE_PER_MIN) : memoryLimiter(AI_RATE_PER_MIN);

function clientIdentifier(req: Req): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'global';
  return ip;
}

// Caché geolocation (Redis con fallback en memoria)
const memCache = new Map<string, Record<string, unknown>>();
const redisClient = hasUpstash ? Redis.fromEnv() : null;
async function cacheGeolocate(key: string, payload: Record<string, unknown>): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.set(`nexo:geo:${key}`, JSON.stringify(payload), { ex: 60 * 60 * 24 * 7 });
      return;
    } catch {
      // cae a memoria
    }
  }
  memCache.set(key, payload);
  if (memCache.size > 200) {
    const primera = memCache.keys().next().value;
    if (primera !== undefined) memCache.delete(primera);
  }
}
async function getCachedGeolocate(key: string): Promise<Record<string, unknown> | undefined> {
  if (redisClient) {
    try {
      const raw = await redisClient.get<string>(`nexo:geo:${key}`);
      if (raw) return JSON.parse(raw) as Record<string, unknown>;
      return undefined;
    } catch {
      // cae a memoria
    }
  }
  return memCache.get(key);
}

// Fallback mexicano
interface GeoHit { lat: number; lon: number; locationName: string; state: string; highway: string }
function fallbackMexicanGeocode(text: string): GeoHit | null {
  const lower = (text || '').toLowerCase();
  const rules: { key: string; lat: number; lon: number; name: string; state: string; highway: string }[] = [
    { key: 'la marquesa', lat: 19.3082, lon: -99.3756, name: 'México–Toluca (La Marquesa)', state: 'EdoMex', highway: 'México–Toluca' },
    { key: 'tepotzotlan', lat: 19.7155, lon: -99.2241, name: 'México–Querétaro (Tepotzotlán)', state: 'EdoMex', highway: 'México–Querétaro' },
    { key: 'tepotzotlán', lat: 19.7155, lon: -99.2241, name: 'México–Querétaro (Tepotzotlán)', state: 'EdoMex', highway: 'México–Querétaro' },
    { key: 'palmillas', lat: 20.3541, lon: -99.9678, name: 'México–Querétaro (Palmillas)', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'san juan del rio', lat: 20.3888, lon: -99.9972, name: 'San Juan del Río, Qro', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'arco norte', lat: 20.0526, lon: -99.3412, name: 'Autopista Arco Norte (Hidalgo)', state: 'Hidalgo', highway: 'Arco Norte' },
    { key: 'tres marias', lat: 19.0526, lon: -99.2412, name: 'Autopista México–Cuernavaca (Tres Marías)', state: 'Morelos', highway: 'Autopista del Sol' },
    { key: 'tres marías', lat: 19.0526, lon: -99.2412, name: 'Autopista México–Cuernavaca (Tres Marías)', state: 'Morelos', highway: 'Autopista del Sol' },
    { key: 'cuernavaca', lat: 18.9242, lon: -99.2216, name: 'Autopista del Sol (Cuernavaca)', state: 'Morelos', highway: 'Autopista del Sol' },
    { key: 'san marcos', lat: 19.3331, lon: -98.8872, name: 'México–Puebla (Caseta San Marcos)', state: 'EdoMex', highway: 'México–Puebla' },
    { key: 'rio frio', lat: 19.3512, lon: -98.6741, name: 'México–Puebla (Río Frío)', state: 'EdoMex', highway: 'México–Puebla' },
    { key: 'río frío', lat: 19.3512, lon: -98.6741, name: 'México–Puebla (Río Frío)', state: 'EdoMex', highway: 'México–Puebla' },
    { key: 'ojo de agua', lat: 19.6841, lon: -98.9882, name: 'México–Pachuca (Caseta Ojo de Agua)', state: 'EdoMex', highway: 'México–Pachuca' },
    { key: 'maltrata', lat: 18.8842, lon: -96.9312, name: 'Autopista Puebla–Veracruz (Cumbres de Maltrata)', state: 'Veracruz', highway: 'México–Veracruz' },
    { key: 'barrancas', lat: 20.9126, lon: -103.8821, name: 'Guadalajara–Tepic (Plan de Barrancas)', state: 'Jalisco', highway: 'Guadalajara–Tepic' },
    { key: 'sabinas', lat: 26.5021, lon: -100.1741, name: 'Monterrey–Nuevo Laredo (Sabinas)', state: 'Nuevo León', highway: 'Monterrey–Laredo' },
    { key: 'matehuala', lat: 23.6483, lon: -100.6433, name: 'Carretera 57 (Matehuala/SLP)', state: 'San Luis Potosí', highway: 'Carretera 57' },
    { key: 'chilpancingo', lat: 17.5516, lon: -99.5056, name: 'Autopista del Sol (Chilpancingo)', state: 'Guerrero', highway: 'Autopista del Sol' },
    { key: 'cdmx', lat: 19.4326, lon: -99.1332, name: 'Ciudad de México', state: 'CDMX', highway: 'Vialidad CDMX' },
    { key: 'puebla', lat: 19.0414, lon: -98.2063, name: 'Puebla de Zaragoza', state: 'Puebla', highway: 'México–Puebla' },
    { key: 'queretaro', lat: 20.5888, lon: -100.3899, name: 'Querétaro Capital', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'querétaro', lat: 20.5888, lon: -100.3899, name: 'Querétaro Capital', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'guadalajara', lat: 20.6597, lon: -103.3496, name: 'Guadalajara, Jal', state: 'Jalisco', highway: 'Autopista de Occidente' },
    { key: 'monterrey', lat: 25.6866, lon: -100.3161, name: 'Monterrey, NL', state: 'Nuevo León', highway: 'Monterrey–Laredo' },
    { key: 'veracruz', lat: 19.1738, lon: -96.1342, name: 'Puerto de Veracruz', state: 'Veracruz', highway: 'México–Veracruz' },
    { key: 'hidalgo', lat: 20.1011, lon: -98.7591, name: 'Pachuca / Hidalgo', state: 'Hidalgo', highway: 'México–Pachuca' },
    { key: 'chiapas', lat: 16.7569, lon: -93.1292, name: 'Tuxtla Gutiérrez, Chiapas', state: 'Chiapas', highway: 'Tuxtla–San Cristóbal' },
    { key: 'morelos', lat: 18.9242, lon: -99.2216, name: 'Cuernavaca, Morelos', state: 'Morelos', highway: 'Autopista del Sol' },
    { key: 'michoacan', lat: 19.7060, lon: -101.1950, name: 'Morelia, Michoacán', state: 'Michoacán', highway: 'Autopista de Occidente' },
    { key: 'michoacán', lat: 19.7060, lon: -101.1950, name: 'Morelia, Michoacán', state: 'Michoacán', highway: 'Autopista de Occidente' },
    { key: 'sonora', lat: 29.0729, lon: -110.9559, name: 'Hermosillo, Sonora', state: 'Sonora', highway: 'Carretera Federal 15' },
    { key: 'nogales', lat: 31.3020, lon: -110.9450, name: 'Nogales, Sonora', state: 'Sonora', highway: 'Carretera Federal 15' },
  ];
  for (const r of rules) {
    if (lower.includes(r.key)) {
      return { lat: r.lat, lon: r.lon, locationName: r.name, state: r.state, highway: r.highway };
    }
  }
  const coordMatch = text.match(/(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= 14 && lat <= 33 && lon >= -118 && lon <= -86) {
      return { lat, lon, locationName: `Coord: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, state: 'México', highway: 'Carretera Detectada' };
    }
  }
  return null;
}

export default async function handler(req: Req, res: Res) {
  // rate limit
  {
    const { success, retryAfter } = await aiLimiter.limit(clientIdentifier(req));
    if (!success) {
      res.setHeader('Retry-After', String(retryAfter ?? 30));
      return res.status(429).json({ error: 'Demasiadas solicitudes; intenta en un momento.' });
    }
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const cacheKey = text.trim().toLowerCase();
    const cached = await getCachedGeolocate(cacheKey);
    if (cached) return res.json(cached);

    const responder = (payload: Record<string, unknown>) => {
      void cacheGeolocate(cacheKey, payload);
      return res.json(payload);
    };

    const prompt = `Analiza este reporte de tráfico/seguridad vial en México y extrae las coordenadas geográficas aproximadas (latitud, longitud), el nombre específico del lugar/tramo carretero, el estado de la República Mexicana, y la carretera o autopista.
Texto del reporte: "${text.replace(/"/g, "'")}"

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "lat": 19.4326,
  "lon": -99.1332,
  "locationName": "Nombre del tramo o caseta",
  "state": "Nombre del estado (ej: EdoMex, CDMX, Puebla, Jalisco, etc.)",
  "highway": "Nombre de la carretera (ej: México-Querétaro, Arco Norte, etc.)",
  "confidence": 0.95
}
Si no encuentras una ubicación en México, devuelve lat: null, lon: null.`;

    const rawResponse = await callGroqWithFallback(prompt, { responseJson: true });
    if (rawResponse) {
      try {
        const parsed = JSON.parse(rawResponse);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          return responder({
            lat: parsed.lat,
            lon: parsed.lon,
            locationName: parsed.locationName || 'Ubicación identificada por IA',
            state: parsed.state || 'México',
            highway: parsed.highway || 'Carretera',
          });
        }
      } catch {
        // fall through to heuristic
      }
    }

    const fallback = fallbackMexicanGeocode(text);
    if (fallback) {
      return responder(fallback);
    }

    return responder({ lat: null, lon: null, locationName: 'Sin ubicación detectada' });
  } catch (error) {
    console.warn('Geolocate processing fallback triggered:', error);
    const fallback = fallbackMexicanGeocode(req.body?.text || '');
    if (fallback) return res.json(fallback);
    return res.json({ lat: null, lon: null, locationName: 'Sin ubicación detectada' });
  }
}
