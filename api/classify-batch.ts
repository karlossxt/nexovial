import type { Request, Response } from 'express';
import { callGroqWithFallback } from './lib/groq';
import { rateLimitExceeded } from './lib/http';

// POST /api/classify-batch (hasta 10 alertas en una sola llamada IA)
export default async function handler(req: Request, res: Response) {
  if (rateLimitExceeded(req, res)) return;

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
}