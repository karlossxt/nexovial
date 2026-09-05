// POST /api/ai-analyze-alert — función autocontenida

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);
const RATE_PER_MIN = Number(process.env.API_RATE_PER_MIN || 60);
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

interface Req {
  body: { text?: unknown };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string | number | string[]): Res;
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

interface Limiter {
  limit(identifier: string): Promise<{ success: boolean; retryAfter?: number }>;
}
const hasUpstash = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
function makeLimiter(): Limiter {
  if (hasUpstash) {
    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(RATE_PER_MIN, '1 m'),
      prefix: 'nexo:analysis',
    });
    return {
      async limit(identifier: string) {
        const { success, reset } = await ratelimit.limit(identifier);
        const retryAfter = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 1000)) : 30;
        return { success, retryAfter };
      },
    };
  }
  const hits = new Map<string, number[]>();
  return {
    async limit(identifier: string) {
      const now = Date.now();
      const times = (hits.get(identifier) || []).filter((t) => now - t < 60_000);
      if (times.length >= RATE_PER_MIN) {
        hits.set(identifier, times);
        return { success: false, retryAfter: 30 };
      }
      times.push(now);
      hits.set(identifier, times);
      return { success: true };
    },
  };
}
const limiter = makeLimiter();

function clientIdentifier(req: Req): string {
  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'global';
}

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

export default async function handler(req: Req, res: Res) {
  const { success, retryAfter } = await limiter.limit(clientIdentifier(req));
  if (!success) {
    res.setHeader('Retry-After', String(retryAfter ?? 30));
    return res.status(429).json({ error: 'Demasiadas solicitudes; intenta en un momento.' });
  }

  try {
    const { text } = req.body || {};
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
        // fall through to heuristic
      }
    }

    const fallback = generateFallbackAlertAnalysis(alertText);
    return res.json(fallback);
  } catch (error) {
    console.warn('AI analyze alert fallback applied:', error);
    const fallback = generateFallbackAlertAnalysis(typeof req.body?.text === 'string' ? req.body.text : '');
    return res.json(fallback);
  }
}
