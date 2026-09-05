import { AlertItem, AlertType } from '../types';
import { findLocationInText } from './geoKnowledge';

export async function fetchFeed(): Promise<{ title: string; items: Record<string, unknown>[]; status?: string }> {
  try {
    // Query internal backend feed proxy
    const resp = await fetch('/api/feed-proxy');
    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.items)) {
        return {
          title: data.title || 'NEXO',
          items: data.items,
          status: data.status
        };
      }
    }
  } catch (err) {
    console.warn('Backend proxy fetch failed:', err);
  }

  return { title: 'NEXO', items: [], status: 'feed_unavailable' };
}

export async function requestGeolocate(text: string): Promise<{ coords: [number, number] | null; locationName: string; state?: string; highway?: string }> {
  // Fast offline heuristic check first for sub-millisecond response
  const fastKnown = findLocationInText(text);
  if (fastKnown) {
    return fastKnown;
  }

  // Call server-side AI geolocate
  try {
    const resp = await fetch('/api/geolocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
        return {
          coords: [data.lat, data.lon],
          locationName: data.locationName || 'Ubicación Geocodificada',
          state: data.state,
          highway: data.highway
        };
      }
    }
  } catch (e) {
    console.warn('API geolocate error:', e);
  }

  // Fallback to Nominatim OpenStreetMap
  try {
    const q = encodeURIComponent(text.substring(0, 140));
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${q}&countrycodes=mx&format=json&limit=1&accept-language=es`;
    const resp = await fetch(osmUrl, {
      headers: { 'User-Agent': 'NEXO-Monitor/1.0 (Highway Traffic Monitor)' }
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data[0]) {
        return {
          coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
          locationName: data[0].display_name
        };
      }
    }
  } catch (osmErr) {
    console.warn('Nominatim fallback error:', osmErr);
  }

  return { coords: null, locationName: 'Sin coordenadas exactas' };
}

export async function requestClassify(text: string): Promise<AlertType> {
  try {
    const resp = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.type) {
        return data.type as AlertType;
      }
    }
  } catch (e) {
    console.warn('API classify error:', e);
  }

  // Fallback heuristic
  const lower = (text || '').toLowerCase();
  if (/\b(violencia|balacera|disparo|ataque|emboscada|seguridad|armados)\b/i.test(lower)) return 'security';
  if (/\b(bloqueo|cierre|protesta|ret[eé]n|manifestaci[oó]n)\b/i.test(lower)) return 'red';
  if (/\b(libre|fluye|normaliz|abierto|despejad)\b/i.test(lower)) return 'green';
  return 'orange';
}

export interface BatchClassifyResult {
  index: number;
  type: AlertType | 'unknown';
  state: string;
  city: string;
  road: string;
  summary: string;
}

export async function requestClassifyBatch(texts: string[]): Promise<BatchClassifyResult[] | null> {
  if (!Array.isArray(texts) || texts.length === 0) return null;
  try {
    const resp = await fetch('/api/classify-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && Array.isArray(data.results)) {
        return data.results as BatchClassifyResult[];
      }
    }
  } catch (e) {
    console.warn('API classify-batch error:', e);
  }
  return null;
}

export async function requestAIDetailedAnalysis(alert: AlertItem): Promise<{
  summary: string;
  severityScore: number;
  affectedLanes: string;
  alternativeRouteAdvice: string;
  estimatedDurationHours: number;
}> {
  try {
    const resp = await fetch('/api/ai-analyze-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${alert.title}. ${alert.description}` })
    });
    if (resp.ok) {
      return await resp.json();
    }
  } catch (err) {
    console.warn('AI deep analysis error:', err);
  }

  return {
    summary: alert.title,
    severityScore: alert.severityScore || (alert.type === 'security' ? 9 : alert.type === 'red' ? 8 : alert.type === 'orange' ? 6 : 2),
    affectedLanes: alert.direction || 'Vía principal',
    alternativeRouteAdvice: 'Consultar reportes en tiempo real o desvío por carreteras secundarias.',
    estimatedDurationHours: alert.type === 'red' ? 3 : alert.type === 'orange' ? 1.5 : 0.5
  };
}
