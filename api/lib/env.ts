// Configuración central de entorno para las Vercel Functions.

export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
export const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export const FEED_MAX_HOURS = Number(process.env.FEED_MAX_HOURS || 24);
export const RSS_BUNDLE = (process.env.RSS_BUNDLE || '').trim();
export const API_ACCESS_TOKEN = (process.env.API_ACCESS_TOKEN || '').trim();
export const AI_RATE_PER_MIN = Number(process.env.AI_RATE_PER_MIN || 60);