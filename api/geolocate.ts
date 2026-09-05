import type { Request, Response } from 'express';
import { callGroqWithFallback } from './lib/groq.ts';
import { fallbackMexicanGeocode, cacheGeolocate, getCachedGeolocate } from './lib/geocode.ts';
import { rateLimitExceeded } from './lib/http.ts';

// POST /api/geolocate
export default async function handler(req: Request, res: Response) {
  if (await rateLimitExceeded(req, res)) return;

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
}