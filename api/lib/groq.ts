import { GROQ_API_KEY, GROQ_BASE, GROQ_MODELS } from './env';
import { delay } from './http';

// Llamada resiliente a Groq con fallback multi-modelo y reintentos.
export async function callGroqWithFallback(
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