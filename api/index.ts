import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.set('trust proxy', 1);

// Groq (OpenAI-compatible) configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Feed, seguridad y límites ---
const FEED_MAX_HOURS = Number(process.env.FEED_MAX_HOURS || 24);
const RSS_BUNDLE = (process.env.RSS_BUNDLE || '').trim();
const API_ACCESS_TOKEN = (process.env.API_ACCESS_TOKEN || '').trim();
const AI_RATE_PER_MIN = Number(process.env.AI_RATE_PER_MIN || 60);

const geolocateCache = new Map<string, Record<string, unknown>>();
const GEO_CACHE_MAX = 200;

function esEntradaReciente(pub: string | number | undefined, horas: number = FEED_MAX_HOURS): boolean {
  if (pub === undefined || pub === null) return true;
  let t = typeof pub === 'number' ? pub : Date.parse(String(pub));
  if (typeof pub === 'number' && t < 1e13) t *= 1000;
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= horas * 3600 * 1000;
}

function decodificarXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}

function extraerEtiqueta(bloque: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = bloque.match(re);
  return m ? decodificarXml(m[1].replace(/<[^>]*>/g, ' ').trim()) : '';
}

// Parsea feeds RSS 2.0 / Atom y normaliza items al mismo formato que usa el frontend.
function parsearRssXml(xml: string): Record<string, unknown>[] | null {
  const cabecera = xml.slice(0, 600).toLowerCase();
  if (!/<(rss|rdf|feed)\b/.test(cabecera)) return null;

  const bloques: string[] = [];
  const itemRe = /<(item|entry)[\s>][\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) bloques.push(m[0]);

  const feedTitleM = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  const feedTitle = feedTitleM ? decodificarXml(feedTitleM[1].trim()) : 'NEXO — Red Vial';

  const resultado = bloques
    .map((bloque, i) => {
      const titulo = extraerEtiqueta(bloque, 'title');
      const desc = extraerEtiqueta(bloque, 'description') || extraerEtiqueta(bloque, 'summary') || extraerEtiqueta(bloque, 'content');
      const linkM = bloque.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || bloque.match(/<link[^>]*href=["']([^"' >]+)["']/i);
      const link = linkM ? decodificarXml(linkM[1].trim()) : '';
      const guid = extraerEtiqueta(bloque, 'guid') || link || `rss-item-${i}`;
      const pub = extraerEtiqueta(bloque, 'pubDate') || extraerEtiqueta(bloque, 'published') || extraerEtiqueta(bloque, 'updated') || extraerEtiqueta(bloque, 'date');
      let fechaIso: string;
      try {
        fechaIso = pub ? new Date(pub).toISOString() : new Date().toISOString();
      } catch {
        fechaIso = new Date().toISOString();
      }
      return {
        id: guid,
        title: titulo || 'Sin título',
        description: desc || titulo,
        content: desc || titulo,
        link,
        pubDate: fechaIso,
        isoDate: fechaIso,
        source: 'Sindicación RSS',
        feedSource: feedTitle,
      };
    })
    .filter((it) => esEntradaReciente(it.pubDate as string));

  // Un feed válido sin items recientes sigue estando disponible.
  return resultado;
}

// Auth opcional: se exige la cabecera X-Access-Token solo si API_ACCESS_TOKEN está definido.
function requireAccessToken(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!API_ACCESS_TOKEN) return next();
  const header = (req.headers['x-access-token'] as string) || '';
  if (header === API_ACCESS_TOKEN) return next();
  res.status(401).json({ error: 'Acceso denegado: token inválido o ausente' });
}

// Límite de tasa en memoria para proteger la cuota de Groq.
const rateHits = new Map<string, number[]>();
function enRateLimit(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const now = Date.now();
  const key = req.ip || 'global';
  const times = (rateHits.get(key) || []).filter((t) => now - t < 60_000);
  if (times.length >= AI_RATE_PER_MIN) {
    rateHits.set(key, times);
    res.set('Retry-After', '30');
    res.status(429).json({ error: 'Demasiadas solicitudes; intenta en un momento.' });
    return;
  }
  times.push(now);
  rateHits.set(key, times);
  next();
}

// Shared resilient Groq call helper with multi-model fallback & retries
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

  if (options?.responseJson) {
    baseBody.response_format = { type: 'json_object' };
  }

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
          // 400/401/403/404: no vale la pena intentar más con este modelo
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

// Fallback coordinate extractor for standard Mexican Highway references
function fallbackMexicanGeocode(text: string): { lat: number; lon: number; locationName: string; state: string; highway: string } | null {
  const lower = (text || '').toLowerCase();

  const rules = [
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
    { key: 'nogales', lat: 31.3020, lon: -110.9450, name: 'Nogales, Sonora', state: 'Sonora', highway: 'Carretera Federal 15' }
  ];

  for (const r of rules) {
    if (lower.includes(r.key)) {
      return { lat: r.lat, lon: r.lon, locationName: r.name, state: r.state, highway: r.highway };
    }
  }

  // Regex for coordinates (e.g. 19.4326, -99.1332)
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

// Heuristic domain generator for rich analysis when upstream AI models face transient demand surges
function generateFallbackAlertAnalysis(text: string): {
  summary: string;
  severityScore: number;
  affectedLanes: string;
  alternativeRouteAdvice: string;
  estimatedDurationHours: number;
} {
  const lower = (text || '').toLowerCase();

  if (/\b(violencia|balacera|disparos|enfrentamiento|armados|emboscada|delincuencia|seguridad|peligro)\b/i.test(lower)) {
    return {
      summary: 'Alerta prioritaria de seguridad por presencia de riesgo o despliegue policial.',
      severityScore: 9,
      affectedLanes: 'Tramo carretero de alto riesgo — Tránsito no recomendado',
      alternativeRouteAdvice: 'Suspender circulación en el corredor. Resguardarse en paradero seguro o caseta con presencia de la Guardia Nacional.',
      estimatedDurationHours: 4,
    };
  }

  if (/\b(bloqueo|cierre total|manifestaci[oó]n|protesta|toma de caseta|incomunicad)\b/i.test(lower)) {
    return {
      summary: 'Bloqueo o interrupción total de tránsito por manifestación o retén carretero.',
      severityScore: 8,
      affectedLanes: 'Ambos sentidos / Cierre total de plaza de cobro o tramo',
      alternativeRouteAdvice: 'Tomar desvío por vía libre alterna o autopistas perimetrales como Arco Norte / CEM.',
      estimatedDurationHours: 3,
    };
  }

  if (/\b(choque|accidente|volcadura|carambola|averiado|tractocami[oó]n|incidente)\b/i.test(lower)) {
    return {
      summary: 'Incidente vial con reducción de flujo por maniobras de auxilio y retiro de unidades.',
      severityScore: 6,
      affectedLanes: 'Carril central y de alta velocidad con afectación parcial',
      alternativeRouteAdvice: 'Reducir velocidad a 60 km/h, activar intermitentes y ceder paso a unidades de CAPUFE / GN.',
      estimatedDurationHours: 1.5,
    };
  }

  if (/\b(niebla|lluvia|derrumbe|deslave|clima|granizo|pavimento resbaladizo)\b/i.test(lower)) {
    return {
      summary: 'Condiciones climáticas adversas o afectación de terreno en carpeta asfáltica.',
      severityScore: 5,
      affectedLanes: 'Acotamiento y carril de baja con visibilidad reducida',
      alternativeRouteAdvice: 'Encender luces de niebla, extremar distancia de frenado y no rebasar en curva.',
      estimatedDurationHours: 2,
    };
  }

  if (/\b(libre|fluye|abierto|normaliz|restablecid|despejad)\b/i.test(lower)) {
    return {
      summary: 'Circulación vial abierta y restablecida sin novedades de consideración.',
      severityScore: 2,
      affectedLanes: 'Todos los carriles habilitados y transitables',
      alternativeRouteAdvice: 'Conducir respetando los límites de velocidad reglamentarios.',
      estimatedDurationHours: 0,
    };
  }

  return {
    summary: text.substring(0, 95) || 'Alerta vial registrada en el sistema.',
    severityScore: 5,
    affectedLanes: 'Afectación parcial de carriles',
    alternativeRouteAdvice: 'Consultar reportes en tiempo real y moderar velocidad.',
    estimatedDurationHours: 1,
  };
}

// 1. API: Geolocate
app.post('/api/geolocate', enRateLimit, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const cacheKey = text.trim().toLowerCase();
    const cached = geolocateCache.get(cacheKey);
    if (cached) return res.json(cached);

    const responder = (payload: Record<string, unknown>) => {
      geolocateCache.set(cacheKey, payload);
      if (geolocateCache.size > GEO_CACHE_MAX) {
        const primerClave = geolocateCache.keys().next().value;
        if (primerClave !== undefined) geolocateCache.delete(primerClave);
      }
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
        // Fall through to heuristic
      }
    }

    // Heuristic fallback
    const fallback = fallbackMexicanGeocode(text);
    if (fallback) {
      return responder(fallback);
    }

    return responder({ lat: null, lon: null, locationName: 'Sin ubicación detectada' });
  } catch (error) {
    console.warn('Geolocate processing fallback triggered:', error);
    const fallback = fallbackMexicanGeocode(req.body?.text || '');
    if (fallback) {
      return res.json(fallback);
    }
    return res.json({ lat: null, lon: null, locationName: 'Sin ubicación detectada' });
  }
});

// 2. API: Classify
app.post('/api/classify', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const lower = text.toLowerCase();
    let type = 'orange';

    if (/\b(violencia|balacera|disparos|enfrentamiento|delincuencia|armados|emboscada|seguridad|peligro)\b/i.test(lower)) {
      type = 'security';
    } else if (/\b(bloqueo|cierre total|manifestaci[oó]n|protesta|ret[eé]n|toma de caseta|incomunicad)\b/i.test(lower)) {
      type = 'red';
    } else if (/\b(libre|fluye|abierto|circulaci[oó]n normal|restablecid|despejad|habilitad)\b/i.test(lower)) {
      type = 'green';
    } else if (/\b(incidente|choque|accidente|volcadura|derrumbe|deslave|averiado|tr[aá]fico lento|carambola)\b/i.test(lower)) {
      type = 'orange';
    }

    const raw = [
      { label: type, score: 0.95 },
      { label: type === 'red' ? 'bloqueo' : type === 'orange' ? 'incidente' : type === 'green' ? 'via_libre' : 'zona_roja', score: 0.95 }
    ];

    res.json({ type, raw });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ error: 'Error classifying alert' });
  }
});

// 2b. API: Batch Classify (hasta 10 alertas en una sola llamada IA)
app.post('/api/classify-batch', enRateLimit, async (req, res) => {
  try {
    const { texts } = req.body || {};
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: "Falta 'texts' (array)" });
    }
    if (texts.length > 10) {
      return res.status(400).json({ error: 'Máximo 10 textos por batch' });
    }

    const SYSTEM_BATCH = `Eres un analizador de alertas viales y de seguridad de México (español).
Recibes un ARRAY de alertas. Debes devolver SOLO un JSON válido, un objeto donde cada key es el índice (0,1,2...) y cada valor es:
{"type":"red|orange|green|security|unknown","state":"...","city":"...","road":"...","summary":"..."}

Reglas type:
- red: bloqueos, cierres, protestas, retenes, manifestaciones.
- orange: incidentes, choques, accidentes, congestión.
- green: vía libre, flujo normal, normalizado.
- security: violencia, balaceras, secuestro, robo, riesgo de seguridad.
- unknown: sin información suficiente.
Usa "unknown" cuando no se pueda determinar estado/ciudad/carretera.`;

    const numbered = texts
      .map((t: unknown, i: number) => `[${i}] ${String(t).slice(0, 500)}`)
      .join('\n\n');

    const prompt = `${SYSTEM_BATCH}\n\nAnaliza este lote de alertas:\n\n${numbered}`;

    const rawResponse = await callGroqWithFallback(prompt, { responseJson: true });
    if (!rawResponse) {
      return res.status(502).json({ error: 'No se pudo obtener respuesta del modelo' });
    }

    let parsed: Record<string, { type?: string; state?: string; city?: string; road?: string; summary?: string }>;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      const m = rawResponse.match(/\{[\s\S]*\}/);
      if (!m) {
        return res.status(502).json({ error: 'Respuesta IA no parseable' });
      }
      parsed = JSON.parse(m[0]);
    }

    const validTypes = ['red', 'orange', 'green', 'security', 'unknown'];
    const results = texts.map((_: unknown, i: number) => {
      const p = parsed?.[String(i)] || {};
      // Nunca convertir una respuesta dudosa en una alerta naranja real.
      const type = validTypes.includes(p.type as string) ? (p.type as string) : 'unknown';
      return {
        index: i,
        type,
        state: p.state ?? 'unknown',
        city: p.city ?? 'unknown',
        road: p.road ?? 'unknown',
        summary: p.summary ?? '',
      };
    });

    return res.json({ results });
  } catch (error) {
    console.warn('Classify batch error:', error);
    return res.status(500).json({ error: 'Error al clasificar lote', detail: String((error as Error)?.message || error) });
  }
});

// 3. API: NER
app.post('/api/ner', async (req, res) => {
  try {
    const { text } = req.body;
    const geo = fallbackMexicanGeocode(text || '');
    res.json({
      raw: {
        highway: geo?.highway || null,
        state: geo?.state || null,
        location: geo?.locationName || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error extracting entities' });
  }
});

// 4. API: Proxy RSS Feed (único origen: RSS_BUNDLE o ?url=; nunca simula eventos)

// Validates that a user-supplied feed URL is a public http(s) endpoint.
// Prevents SSRF against localhost, private ranges, link-local and cloud metadata services.
function isSafePublicUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    let host = url.hostname.toLowerCase();
    if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);

    if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
    if (host.includes(':')) return false; // reject raw IPv6 (covers ::1 and fc00::/7)
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    const m172 = host.match(/^172\.(\d{1,2})\./);
    if (m172) {
      const second = Number(m172[1]);
      if (second >= 16 && second <= 31) return false;
    }
    const m100 = host.match(/^100\.(\d{1,3})\./); // CGNAT 100.64.0.0/10
    if (m100 && Number(m100[1]) >= 64 && Number(m100[1]) <= 127) return false;
    // Cloud metadata endpoints
    if (/^169\.254\.169\.254$/.test(host) || host === 'metadata.google.internal') return false;

    return true;
  } catch {
    return false;
  }
}

app.get('/api/feed-proxy', async (req, res) => {
  const customUrl = req.query.url as string | undefined;
  const feedUrl = customUrl || RSS_BUNDLE;

  // Intentar el feed (por ?url= o por RSS_BUNDLE del entorno), siempre en URL pública segura
  if (feedUrl && isSafePublicUrl(feedUrl)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CentralVialMX-Bot/1.0 (Highway Traffic Monitor)',
          'Accept': 'application/json, text/xml, application/xml, */*'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const bodyText = await response.text();
        const filtrarItems = (items: unknown[]) =>
          items.filter((it) => {
            const rec = it as Record<string, unknown>;
            return esEntradaReciente((rec?.pubDate ?? rec?.isoDate ?? rec?.date) as string | number | undefined);
          });

        if (/xml|rss|atom/i.test(contentType)) {
          const parsed = parsearRssXml(bodyText);
          if (parsed !== null) {
            return res.json({ title: 'NEXO — Red Vial', status: 'rss_synced', items: parsed });
          }
        } else {
          try {
            const data = JSON.parse(bodyText);
            const rows = Array.isArray(data.items)
              ? data.items
              : Array.isArray(data.channel?.item)
                ? data.channel.item
                : [];
            if (rows.length > 0) {
              return res.json({
                title: data.title || data.channel?.title || 'NEXO — Red Vial',
                status: 'json_synced',
                items: filtrarItems(rows),
              });
            }
          } catch {
            // No es JSON válido; podría ser XML con content-type incorrecto
            const parsed = parsearRssXml(bodyText);
            if (parsed) {
              return res.json({ title: 'NEXO — Red Vial', status: 'rss_synced', items: parsed });
            }
          }
        }
      }
    } catch {
      // el feed falló: se reporta como no disponible (nunca se simulan eventos)
    }
  }

  return res.json({
    title: 'NEXO — Red Vial',
    status: 'feed_unavailable',
    items: [],
    error: feedUrl ? 'No se pudo obtener el feed RSS' : 'RSS_BUNDLE no configurado ni ?url= indicado'
  });
});

// 5. API: Deep AI Alert Inspection
app.post('/api/ai-analyze-alert', enRateLimit, async (req, res) => {
  try {
    const { text } = req.body;
    const alertText = typeof text === 'string' ? text : '';

    const prompt = `Analiza esta alerta vial/seguridad en carreteras de México:
"${alertText.replace(/"/g, "'")}"

Provee un dictamen en JSON con:
{
  "summary": "Resumen conciso en 1 frase",
  "severityScore": 8, // número del 1 al 10
  "affectedLanes": "Ambos carriles / Carril de alta / Acotamiento / Toda la vía",
  "alternativeRouteAdvice": "Recomendación de desvío o ruta alterna",
  "estimatedDurationHours": 2
}`;

    const rawResponse = await callGroqWithFallback(prompt, { responseJson: true });
    if (rawResponse) {
      try {
        const parsed = JSON.parse(rawResponse);
        if (parsed && typeof parsed === 'object') {
          return res.json({
            summary: parsed.summary || alertText.substring(0, 90),
            severityScore: typeof parsed.severityScore === 'number' ? parsed.severityScore : 6,
            affectedLanes: parsed.affectedLanes || 'Carriles principales',
            alternativeRouteAdvice: parsed.alternativeRouteAdvice || 'Precaución en la zona.',
            estimatedDurationHours: typeof parsed.estimatedDurationHours === 'number' ? parsed.estimatedDurationHours : 1.5,
          });
        }
      } catch {
        // Fall through to heuristic
      }
    }

    // Heuristic domain synthesis fallback
    const fallback = generateFallbackAlertAnalysis(alertText);
    return res.json(fallback);
  } catch (error) {
    console.warn('AI analyze alert fallback applied:', error);
    const fallback = generateFallbackAlertAnalysis(req.body?.text || '');
    return res.json(fallback);
  }
});

// Setup Vite development middleware or static production serving
const distPath = path.join(process.cwd(), 'dist');

function applyStaticServing() {
  app.use(express.static(distPath));
  app.get(/(.*)/, (req, res) => {
    const indexHtml = path.join(distPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    res.status(404).send('No se encontró dist/index.html (¿falló el build de Vite?)');
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    // Lazy import: evita cargar Vite en runtime serverless (Vercel).
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    applyStaticServing();
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`NEXO Server running on http://localhost:${PORT}`);
    });
  }
}

if (process.env.VERCEL) {
  console.log('NEXO serverless ready');
} else {
  startServer();
}

export default function handler(req: express.Request, res: express.Response) {
  return app(req, res);
}
