// POST /api/classify-batch (hasta 10 alertas en una sola llamada IA) — autocontenido

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',')
  .map((m: string) => m.trim())
  .filter(Boolean);
const RATE_PER_MIN = Number(process.env.API_RATE_PER_MIN || 90);
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

interface Req {
  body: { texts?: unknown };
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
    console.warn('GROQ_API_KEY no configurada; clasificación IA no disponible.');
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
    max_tokens: 900,
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
      prefix: 'nexo:batch',
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

export default async function handler(req: Req, res: Res) {
  const { success, retryAfter } = await limiter.limit(clientIdentifier(req));
  if (!success) {
    res.setHeader('Retry-After', String(retryAfter ?? 30));
    return res.status(429).json({ error: 'Demasiadas solicitudes; intenta en un momento.' });
  }

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
}
