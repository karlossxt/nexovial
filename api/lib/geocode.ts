import { Redis } from '@upstash/redis';
import { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from './env.ts';

const hasUpstash = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
const redis = hasUpstash ? Redis.fromEnv() : null;

const GEO_KEY_PREFIX = 'nexo:geo:';
const GEO_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

// Caché en memoria (solo para cuando no hay Redis configurado).
const memCache = new Map<string, Record<string, unknown>>();
const MEM_CACHE_MAX = 200;

export async function cacheGeolocate(key: string, payload: Record<string, unknown>): Promise<void> {
  if (redis) {
    try {
      await redis.set(`${GEO_KEY_PREFIX}${key}`, JSON.stringify(payload), { ex: GEO_TTL_SECONDS });
      return;
    } catch {
      // cae a memoria
    }
  }
  memCache.set(key, payload);
  if (memCache.size > MEM_CACHE_MAX) {
    const primerClave = memCache.keys().next().value;
    if (primerClave !== undefined) memCache.delete(primerClave);
  }
}

export async function getCachedGeolocate(key: string): Promise<Record<string, unknown> | undefined> {
  if (redis) {
    try {
      const raw = await redis.get<string>(`${GEO_KEY_PREFIX}${key}`);
      if (raw) return JSON.parse(raw) as Record<string, unknown>;
      return undefined;
    } catch {
      // cae a memoria
    }
  }
  return memCache.get(key);
}

// Fallback coordinate extractor for standard Mexican Highway references
export function fallbackMexicanGeocode(text: string): { lat: number; lon: number; locationName: string; state: string; highway: string } | null {
  const lower = (text || '').toLowerCase();

  const rules = [
    { key: 'la marquesa', lat: 19.3082, lon: -99.3756, name: 'México–Toluca (La Marquesa)', state: 'EdoMex', highway: 'México–Toluca' },
    { key: 'tepotzotlan', lat: 19.7155, lon: -99.2241, name: 'México–Querétaro (Tepotzotlán)', state: 'EdoMex', highway: 'México–Querétaro' },
    { key: 'tepotzotlán', lat: 19.7155, lon: -99.2241, name: 'México–Querétaro (Tepotzotlán)', state: 'EdoMex', highway: 'México–Querétaro' },
    { key: 'palmillas', lat: 20.3541, lon: -99.9678, name: 'México–Querétaro (Palmillas)', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'san juan del rio', lat: 20.3888, lon: -99.9972, name: 'San Juan del Río, Qro', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'arco norte', lat: 20.0526, lon: -99.3412, name: 'Autopista Arco Norte (Hidalgo)', state: 'Hidalgo', highway: 'Arco Norte' },
    { key: 'tres marias', lat: 19.0526, lon: -99.2412, name: 'Autopista México–Cuernavaca (Tres Marías)', state: 'Morelos', highway: 'Autopista del Sol' },
    { key: 'cuernavaca', lat: 18.9242, lon: -99.2216, name: 'Autopista del Sol (Cuernavaca)', state: 'Morelos', highway: 'Autopista del Sol' },
    { key: 'san marcos', lat: 19.3331, lon: -98.8872, name: 'México–Puebla (Caseta San Marcos)', state: 'EdoMex', highway: 'México–Puebla' },
    { key: 'rio frio', lat: 19.3512, lon: -98.6741, name: 'México–Puebla (Río Frío)', state: 'EdoMex', highway: 'México–Puebla' },
    { key: 'ojo de agua', lat: 19.6841, lon: -98.9882, name: 'México–Pachuca (Caseta Ojo de Agua)', state: 'EdoMex', highway: 'México–Pachuca' },
    { key: 'maltrata', lat: 18.8842, lon: -96.9312, name: 'Autopista Puebla–Veracruz (Cumbres de Maltrata)', state: 'Veracruz', highway: 'México–Veracruz' },
    { key: 'barrancas', lat: 20.9126, lon: -103.8821, name: 'Guadalajara–Tepic (Plan de Barrancas)', state: 'Jalisco', highway: 'Guadalajara–Tepic' },
    { key: 'sabinas', lat: 26.5021, lon: -100.1741, name: 'Monterrey–Nuevo Laredo (Sabinas)', state: 'Nuevo León', highway: 'Monterrey–Laredo' },
    { key: 'matehuala', lat: 23.6483, lon: -100.6433, name: 'Carretera 57 (Matehuala/SLP)', state: 'San Luis Potosí', highway: 'Carretera 57' },
    { key: 'chilpancingo', lat: 17.5516, lon: -99.5056, name: 'Autopista del Sol (Chilpancingo)', state: 'Guerrero', highway: 'Autopista del Sol' },
    { key: 'cdmx', lat: 19.4326, lon: -99.1332, name: 'Ciudad de México', state: 'CDMX', highway: 'Vialidad CDMX' },
    { key: 'puebla', lat: 19.0414, lon: -98.2063, name: 'Puebla de Zaragoza', state: 'Puebla', highway: 'México–Puebla' },
    { key: 'queretaro', lat: 20.5888, lon: -100.3899, name: 'Querétaro Capital', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'querétaro', lat: 20.5888, lon: -100.3899, name: 'Querétaro Capital', state: 'Querétaro', highway: 'México–Querétaro' },
    { key: 'guadalajara', lat: 20.6597, lon: -103.3496, name: 'Guadalajara, Jal', state: 'Jalisco', highway: 'Autopista de Occidente' },
    { key: 'monterrey', lat: 25.6866, lon: -100.3161, name: 'Monterrey, NL', state: 'Nuevo León', highway: 'Monterrey–Laredo' },
    { key: 'veracruz', lat: 19.1738, lon: -96.1342, name: 'Puerto de Veracruz', state: 'Veracruz', highway: 'México–Veracruz' },
    { key: 'hidalgo', lat: 20.1011, lon: -98.7591, name: 'Pachuca / Hidalgo', state: 'Hidalgo', highway: 'México–Pachuca' },
    { key: 'chiapas', lat: 16.7569, lon: -93.1292, name: 'Tuxtla Gutiérrez, Chiapas', state: 'Chiapas', highway: 'Tuxtla–San Cristóbal' },
    { key: 'morelos', lat: 18.9242, lon: -99.2216, name: 'Cuernavaca, Morelos', state: 'Morelos', highway: 'Autopista del Sol' },
    { key: 'michoacan', lat: 19.7060, lon: -101.1950, name: 'Morelia, Michoacán', state: 'Michoacán', highway: 'Autopista de Occidente' },
    { key: 'michoacán', lat: 19.7060, lon: -101.1950, name: 'Morelia, Michoacán', state: 'Michoacán', highway: 'Autopista de Occidente' },
    { key: 'sonora', lat: 29.0729, lon: -110.9559, name: 'Hermosillo, Sonora', state: 'Sonora', highway: 'Carretera Federal 15' },
    { key: 'nogales', lat: 31.3020, lon: -110.9450, name: 'Nogales, Sonora', state: 'Sonora', highway: 'Carretera Federal 15' }
  ];

  for (const r of rules) {
    if (lower.includes(r.key)) {
      return { lat: r.lat, lon: r.lon, locationName: r.name, state: r.state, highway: r.highway };
    }
  }

  // Regex for coordinates (e.g. 19.4326, -99.1332)
  const coordMatch = text.match(/(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= 14 && lat <= 33 && lon >= -118 && lon <= -86) {
      return { lat, lon, locationName: `Coord: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, state: 'México', highway: 'Carretera Detectada' };
    }
  }

  return null;
}

// Heuristic domain generator for rich analysis when upstream AI models face transient demand surges
export function generateFallbackAlertAnalysis(text: string): {
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