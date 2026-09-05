import type { Request, Response } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { AI_RATE_PER_MIN, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from './env';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export { delay };

// Rate limiting distribuido para proteger la cuota de Groq.
// Usa Upstash Redis cuando está configurado (ventana deslizante, consistente entre
// instancias serverless). Si no hay Redis configurado, cae a un contador en memoria
// (solo válido para una única instancia / entorno local).

const hasUpstash = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

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

function makeLimiter(prefix: string, max: number): Limiter {
  return hasUpstash ? redisLimiter(prefix, max) : memoryLimiter(max);
}

// Limitadores compartidos para endpoints IA.
export const aiLimiter = makeLimiter('nexo:ai', AI_RATE_PER_MIN);

export function clientIdentifier(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'global';
  return ip;
}

// Devuelve true si la petición fue bloqueada (429) y no debe continuar.
export async function rateLimitExceeded(req: Request, res: Response): Promise<boolean> {
  const { success, retryAfter } = await aiLimiter.limit(clientIdentifier(req));
  if (!success) {
    res.set('Retry-After', String(retryAfter ?? 30));
    res.status(429).json({ error: 'Demasiadas solicitudes; intenta en un momento.' });
    return true;
  }
  return false;
}