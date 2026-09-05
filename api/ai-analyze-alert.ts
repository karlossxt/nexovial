import type { Request, Response } from 'express';
import { callGroqWithFallback } from './lib/groq';
import { generateFallbackAlertAnalysis } from './lib/geocode';
import { rateLimitExceeded } from './lib/http';

// POST /api/ai-analyze-alert
export default async function handler(req: Request, res: Response) {
  if (await rateLimitExceeded(req, res)) return;

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
}