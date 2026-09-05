import type { Request, Response } from 'express';
import { AI_RATE_PER_MIN } from './env';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export { delay };

// Límite de tasa en memoria para proteger la cuota de Groq.
// Devuelve true si la petición ya fue respondida (429) y no debe continuar.
const rateHits = new Map<string, number[]>();
export function rateLimitExceeded(req: Request, res: Response): boolean {
  const now = Date.now();
  const key = req.ip || 'global';
  const times = (rateHits.get(key) || []).filter((t) => now - t < 60_000);
  if (times.length >= AI_RATE_PER_MIN) {
    rateHits.set(key, times);
    res.set('Retry-After', '30');
    res.status(429).json({ error: 'Demasiadas solicitudes; intenta en un momento.' });
    return true;
  }
  times.push(now);
  rateHits.set(key, times);
  return false;
}