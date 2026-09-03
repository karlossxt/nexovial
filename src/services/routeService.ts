import { AlertItem, RouteOption, RoutePlan, RouteSafetyLevel, RouteCheckpoint } from '../types';

export interface MexicanCity {
  id: string;
  name: string;
  state: string;
  coords: [number, number]; // [lat, lng]
  isMajor: boolean;
}

export const MEXICAN_CITIES: MexicanCity[] = [
  { id: 'cdmx', name: 'Ciudad de México (CDMX)', state: 'CDMX', coords: [19.4326, -99.1332], isMajor: true },
  { id: 'qro', name: 'Querétaro', state: 'Querétaro', coords: [20.5888, -100.3899], isMajor: true },
  { id: 'pue', name: 'Puebla', state: 'Puebla', coords: [19.0414, -98.2063], isMajor: true },
  { id: 'gdl', name: 'Guadalajara', state: 'Jalisco', coords: [20.6597, -103.3496], isMajor: true },
  { id: 'mty', name: 'Monterrey', state: 'Nuevo León', coords: [25.6866, -100.3161], isMajor: true },
  { id: 'aca', name: 'Acapulco', state: 'Guerrero', coords: [16.8531, -99.8237], isMajor: true },
  { id: 'tol', name: 'Toluca', state: 'Edomex', coords: [19.2826, -99.6557], isMajor: true },
  { id: 'cuer', name: 'Cuernavaca', state: 'Morelos', coords: [18.9242, -99.2216], isMajor: true },
  { id: 'ver', name: 'Veracruz / Boca del Río', state: 'Veracruz', coords: [19.1738, -96.1342], isMajor: true },
  { id: 'pac', name: 'Pachuca', state: 'Hidalgo', coords: [20.1011, -98.7591], isMajor: true },
  { id: 'leon', name: 'León', state: 'Guanajuato', coords: [21.1221, -101.6826], isMajor: true },
  { id: 'slp', name: 'San Luis Potosí', state: 'San Luis Potosí', coords: [22.1565, -100.9855], isMajor: true },
  { id: 'mor', name: 'Morelia', state: 'Michoacán', coords: [19.7060, -101.1950], isMajor: true },
  { id: 'ags', name: 'Aguascalientes', state: 'Aguascalientes', coords: [21.8853, -102.2916], isMajor: true },
  { id: 'sal', name: 'Saltillo', state: 'Coahuila', coords: [25.4383, -100.9737], isMajor: true },
  { id: 'tor', name: 'Torreón', state: 'Coahuila', coords: [25.5428, -103.4068], isMajor: true },
  { id: 'oax', name: 'Oaxaca de Juárez', state: 'Oaxaca', coords: [17.0732, -96.7266], isMajor: true },
  { id: 'cun', name: 'Cancún', state: 'Quintana Roo', coords: [21.1619, -86.8515], isMajor: true },
  { id: 'mid', name: 'Mérida', state: 'Yucatán', coords: [20.9674, -89.5926], isMajor: true },
  { id: 'pvr', name: 'Puerto Vallarta', state: 'Jalisco', coords: [20.6534, -105.2253], isMajor: true },
  { id: 'tij', name: 'Tijuana', state: 'Baja California', coords: [32.5149, -117.0382], isMajor: true },
  { id: 'mxl', name: 'Mexicali', state: 'Baja California', coords: [32.6245, -115.4523], isMajor: true },
  { id: 'hmo', name: 'Hermosillo', state: 'Sonora', coords: [29.0729, -110.9559], isMajor: true },
  { id: 'cul', name: 'Culiacán', state: 'Sinaloa', coords: [24.8091, -107.3940], isMajor: true },
  { id: 'mzt', name: 'Mazatlán', state: 'Sinaloa', coords: [23.2494, -106.4111], isMajor: true },
  { id: 'tgx', name: 'Tuxtla Gutiérrez', state: 'Chiapas', coords: [16.7569, -93.1292], isMajor: true },
  { id: 'vsa', name: 'Villahermosa', state: 'Tabasco', coords: [17.9892, -92.9281], isMajor: true },
  { id: 'tam', name: 'Tampico', state: 'Tamaulipas', coords: [22.2331, -97.8611], isMajor: true },
  { id: 'nld', name: 'Nuevo Laredo', state: 'Tamaulipas', coords: [27.4763, -99.5164], isMajor: true },
  { id: 'cdj', name: 'Ciudad Juárez', state: 'Chihuahua', coords: [31.6904, -106.4245], isMajor: true },
  { id: 'cuu', name: 'Chihuahua', state: 'Chihuahua', coords: [28.6353, -106.0889], isMajor: true },
  { id: 'dgo', name: 'Durango', state: 'Durango', coords: [24.0277, -104.6532], isMajor: true },
  { id: 'zcl', name: 'Zacatecas', state: 'Zacatecas', coords: [22.7709, -102.5832], isMajor: true },
  { id: 'col', name: 'Colima / Manzanillo', state: 'Colima', coords: [19.2452, -103.7241], isMajor: true },
  { id: 'urupan', name: 'Uruapan / Lázaro Cárdenas', state: 'Michoacán', coords: [19.4174, -102.0628], isMajor: true }
];

// Helper: Haversine distance in km between two lat/lng pairs
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from point P to segment AB in km
function distanceToSegmentKm(p: [number, number], a: [number, number], b: [number, number]): number {
  const [pLat, pLng] = p;
  const [aLat, aLng] = a;
  const [bLat, bLng] = b;

  const dx = bLng - aLng;
  const dy = bLat - aLat;

  if (dx === 0 && dy === 0) {
    return calculateDistanceKm(pLat, pLng, aLat, aLng);
  }

  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)));
  const projLat = aLat + t * dy;
  const projLng = aLng + t * dx;

  return calculateDistanceKm(pLat, pLng, projLat, projLng);
}

// Check minimum distance from a point to a polyline
export function distanceToPolylineKm(point: [number, number], polyline: [number, number][]): number {
  if (polyline.length < 2) return 9999;
  let minDistance = 9999;

  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegmentKm(point, polyline[i], polyline[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

// Corridor Database for canonical Mexican highway routes
interface HighwayCorridorDef {
  key: string;
  name: string;
  originId: string;
  destId: string;
  primary: {
    name: string;
    highwayCode: string;
    distanceKm: number;
    durationMinutes: number;
    tollCostMxn: number;
    summary: string;
    waypoints: [number, number][];
    checkpoints: { name: string; coords: [number, number]; type: 'origin' | 'checkpoint' | 'toll' | 'destination'; note?: string }[];
  };
  alternative1?: {
    name: string;
    highwayCode: string;
    distanceKm: number;
    durationMinutes: number;
    tollCostMxn: number;
    summary: string;
    waypoints: [number, number][];
    checkpoints: { name: string; coords: [number, number]; type: 'origin' | 'checkpoint' | 'toll' | 'destination'; note?: string }[];
  };
  alternative2?: {
    name: string;
    highwayCode: string;
    distanceKm: number;
    durationMinutes: number;
    tollCostMxn: number;
    summary: string;
    waypoints: [number, number][];
    checkpoints: { name: string; coords: [number, number]; type: 'origin' | 'checkpoint' | 'toll' | 'destination'; note?: string }[];
  };
}

const PREDEFINED_CORRIDORS: HighwayCorridorDef[] = [
  {
    key: 'cdmx-qro',
    name: 'Corredor Central México — Querétaro',
    originId: 'cdmx',
    destId: 'qro',
    primary: {
      name: 'Autopista México–Querétaro (Cuota Directa)',
      highwayCode: 'MEX-57D',
      distanceKm: 218,
      durationMinutes: 160,
      tollCostMxn: 204,
      summary: 'Vía principal de 4 a 6 carriles por Caseta Tepotzotlán y Palmillas.',
      waypoints: [
        [19.4326, -99.1332],
        [19.7128, -99.2245], // Tepotzotlán
        [19.9328, -99.3245], // Tepeji del Río
        [20.0892, -99.4891], // Jilotepec
        [20.2792, -99.9351], // Palmillas
        [20.3871, -99.9982], // San Juan del Río
        [20.5312, -100.2812], // Pedro Escobedo
        [20.5888, -100.3899] // Querétaro
      ],
      checkpoints: [
        { name: 'Salida CDMX Norte (Periférico)', coords: [19.5012, -99.1991], type: 'origin' },
        { name: 'Caseta Tepotzotlán (CAPUFE)', coords: [19.7128, -99.2245], type: 'toll', note: '$102 MXN' },
        { name: 'Distribuidor Arco Norte (Jilotepec)', coords: [20.0892, -99.4891], type: 'checkpoint' },
        { name: 'Caseta Palmillas (CAPUFE)', coords: [20.2792, -99.9351], type: 'toll', note: '$102 MXN' },
        { name: 'San Juan del Río Bypass', coords: [20.3871, -99.9982], type: 'checkpoint' },
        { name: 'Llegada Querétaro Centro', coords: [20.5888, -100.3899], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Ruta Alterna Arco Norte + Libramiento Norponiente',
      highwayCode: 'MEX-M40D / Libramiento Qro',
      distanceKm: 242,
      durationMinutes: 175,
      tollCostMxn: 320,
      summary: 'Evita atascos en Tepotzotlán y Pedro Escobedo mediante el Arco Norte.',
      waypoints: [
        [19.4326, -99.1332],
        [19.6800, -99.1400], // Autopista Pachuca / San Cristóbal
        [19.8900, -98.9800], // Arco Norte Entronque Tula
        [20.1200, -99.3500], // Arco Norte Jilotepec
        [20.3500, -99.8500], // Huichapan / Polotitlán
        [20.5500, -100.1800], // Libramiento Norponiente
        [20.5888, -100.3899]
      ],
      checkpoints: [
        { name: 'Salida Vía Indios Verdes / Pachuca', coords: [19.4950, -99.1180], type: 'origin' },
        { name: 'Caseta Arco Norte San Martín/Tula', coords: [19.8900, -98.9800], type: 'toll', note: '$180 MXN' },
        { name: 'Caseta Libramiento Norponiente', coords: [20.5500, -100.1800], type: 'toll', note: '$140 MXN' },
        { name: 'Querétaro Norte', coords: [20.5888, -100.3899], type: 'destination' }
      ]
    },
    alternative2: {
      name: 'Ruta Libre Federal 57 (Sin Casetas)',
      highwayCode: 'MEX-57 Libre',
      distanceKm: 226,
      durationMinutes: 240,
      tollCostMxn: 0,
      summary: 'Tránsito local de velocidad moderada por Cuautitlán, Tula y Polotitlán.',
      waypoints: [
        [19.4326, -99.1332],
        [19.6700, -99.1800],
        [19.9800, -99.3200],
        [20.2100, -99.7800],
        [20.3900, -100.0200],
        [20.5888, -100.3899]
      ],
      checkpoints: [
        { name: 'Salida Vía Gustavo Baz', coords: [19.5300, -99.1900], type: 'origin' },
        { name: 'Paso por Tula Centro', coords: [19.9800, -99.3200], type: 'checkpoint', note: 'Zonas urbanas' },
        { name: 'Paso por San Juan del Río Libre', coords: [20.3900, -100.0200], type: 'checkpoint' },
        { name: 'Llegada Querétaro Centro', coords: [20.5888, -100.3899], type: 'destination' }
      ]
    }
  },
  {
    key: 'cdmx-aca',
    name: 'Corredor Centro–Pacífico (Autopista del Sol)',
    originId: 'cdmx',
    destId: 'aca',
    primary: {
      name: 'Autopista del Sol (95D Cuota Completa)',
      highwayCode: 'MEX-95D',
      distanceKm: 378,
      durationMinutes: 245,
      tollCostMxn: 585,
      summary: 'Vía de alta velocidad por Cuernavaca, Paso Express, Chilpancingo y La Venta.',
      waypoints: [
        [19.4326, -99.1332],
        [19.2800, -99.1600], // Caseta Tlalpan
        [19.0800, -99.1900], // Tres Marías
        [18.9242, -99.2216], // Cuernavaca / Paso Express
        [18.6700, -99.2100], // Alpuyeca
        [18.2500, -99.4900], // Iguala Bypass / Paso Morelos
        [17.5500, -99.5000], // Chilpancingo
        [17.2000, -99.5200], // Palo Blanco / Tierra Colorada
        [16.9100, -99.7800], // Caseta La Venta
        [16.8531, -99.8237] // Acapulco Diamante / Costera
      ],
      checkpoints: [
        { name: 'Salida Viaducto Tlalpan', coords: [19.2800, -99.1600], type: 'origin' },
        { name: 'Caseta Tlalpan (CAPUFE)', coords: [19.2300, -99.1700], type: 'toll', note: '$140 MXN' },
        { name: 'Paso Express Cuernavaca', coords: [18.9242, -99.2216], type: 'checkpoint' },
        { name: 'Caseta Paso Morelos (CAPUFE)', coords: [18.2500, -99.4900], type: 'toll', note: '$182 MXN' },
        { name: 'Caseta Palo Blanco (Chilpancingo)', coords: [17.4800, -99.5100], type: 'toll', note: '$168 MXN' },
        { name: 'Caseta La Venta (Acapulco)', coords: [16.9100, -99.7800], type: 'toll', note: '$95 MXN' },
        { name: 'Acapulco Puerto / Diamante', coords: [16.8531, -99.8237], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Ruta Alterna por Autopista Siglo XXI + Morelos',
      highwayCode: 'MEX-160D / MEX-95D',
      distanceKm: 412,
      durationMinutes: 280,
      tollCostMxn: 640,
      summary: 'Ruta alterna por Puebla/Cuautla que evita el tramo urbano de Cuernavaca.',
      waypoints: [
        [19.4326, -99.1332],
        [19.3400, -98.9800], // Chalco
        [18.8100, -98.9500], // Cuautla
        [18.6200, -99.1500], // Jojutla / Siglo XXI
        [18.2500, -99.4900], // Paso Morelos
        [17.5500, -99.5000], // Chilpancingo
        [16.8531, -99.8237]
      ],
      checkpoints: [
        { name: 'Salida Calzada Ignacio Zaragoza', coords: [19.3900, -99.0400], type: 'origin' },
        { name: 'Caseta Chalco / Cuautla', coords: [19.3400, -98.9800], type: 'toll', note: '$85 MXN' },
        { name: 'Entronque Autopista Siglo XXI', coords: [18.6200, -99.1500], type: 'checkpoint' },
        { name: 'Caseta Paso Morelos', coords: [18.2500, -99.4900], type: 'toll', note: '$182 MXN' },
        { name: 'Acapulco', coords: [16.8531, -99.8237], type: 'destination' }
      ]
    }
  },
  {
    key: 'cdmx-pue',
    name: 'Corredor Oriente México — Puebla',
    originId: 'cdmx',
    destId: 'pue',
    primary: {
      name: 'Autopista México–Puebla (150D Cuota)',
      highwayCode: 'MEX-150D',
      distanceKm: 132,
      durationMinutes: 105,
      tollCostMxn: 204,
      summary: 'Vía directa de alta capacidad atravesando Río Frío y San Martín Texmelucan.',
      waypoints: [
        [19.4326, -99.1332],
        [19.3500, -98.9800], // Caseta San Marcos
        [19.3300, -98.6700], // Río Frío
        [19.2800, -98.4300], // San Martín Texmelucan
        [19.1300, -98.2800], // Cholula / Periférico Ecológico
        [19.0414, -98.2063] // Puebla Angelópolis / Centro
      ],
      checkpoints: [
        { name: 'Salida Calzada Ignacio Zaragoza', coords: [19.3900, -99.0400], type: 'origin' },
        { name: 'Caseta San Marcos Huixtoco (CAPUFE)', coords: [19.3500, -98.9800], type: 'toll', note: '$156 MXN' },
        { name: 'Tramo de Montaña Río Frío (Km 63)', coords: [19.3300, -98.6700], type: 'checkpoint', note: 'Precaución por niebla' },
        { name: 'Caseta San Martín Texmelucan', coords: [19.2800, -98.4300], type: 'toll', note: '$48 MXN' },
        { name: 'Puebla Distribuidor Juárez-Serdán', coords: [19.0414, -98.2063], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Ruta Alterna por Arco Norte / Vía Tlaxcala',
      highwayCode: 'MEX-M40D / MEX-119D',
      distanceKm: 168,
      durationMinutes: 135,
      tollCostMxn: 290,
      summary: 'Rodea la Sierra Nevada vía Hidalgo y Tlaxcala cuando hay bloqueos en San Marcos.',
      waypoints: [
        [19.4326, -99.1332],
        [19.6800, -98.9200], // Tecámac
        [19.7800, -98.6200], // Arco Norte Sahagún
        [19.4200, -98.2500], // Calpulalpan / Tlaxcala
        [19.1800, -98.2300], // Panzacola
        [19.0414, -98.2063]
      ],
      checkpoints: [
        { name: 'Salida Autopista Pachuca', coords: [19.5100, -99.0800], type: 'origin' },
        { name: 'Caseta Arco Norte Sanctórum', coords: [19.4800, -98.4500], type: 'toll', note: '$175 MXN' },
        { name: 'Entrada Puebla Norte', coords: [19.0414, -98.2063], type: 'destination' }
      ]
    }
  },
  {
    key: 'cdmx-gdl',
    name: 'Corredor Occidente México — Guadalajara',
    originId: 'cdmx',
    destId: 'gdl',
    primary: {
      name: 'Autopista de Occidente (15D Cuota Completa)',
      highwayCode: 'MEX-15D',
      distanceKm: 535,
      durationMinutes: 340,
      tollCostMxn: 1040,
      summary: 'Vía directa de 4 carriles por Toluca, Maravatío, Morelia Norte, Churintzio y Zapotlanejo.',
      waypoints: [
        [19.4326, -99.1332],
        [19.2826, -99.6557], // Toluca
        [19.8000, -99.8800], // Atlacomulco
        [19.9000, -100.4500], // Maravatío
        [19.9500, -101.2000], // Cuitzeo / Morelia Norte
        [20.1500, -102.0500], // Churintzio
        [20.3500, -102.7500], // Ocotlán
        [20.6200, -103.0500], // Zapotlanejo
        [20.6597, -103.3496] // Guadalajara
      ],
      checkpoints: [
        { name: 'Caseta La Marquesa / Toluca', coords: [19.3100, -99.3700], type: 'toll', note: '$105 MXN' },
        { name: 'Caseta Atlacomulco', coords: [19.8000, -99.8800], type: 'toll', note: '$120 MXN' },
        { name: 'Caseta Zinapécuaro (Michoacán)', coords: [19.8600, -100.8200], type: 'toll', note: '$182 MXN' },
        { name: 'Caseta Panindícuaro', coords: [20.0000, -101.7600], type: 'toll', note: '$235 MXN' },
        { name: 'Caseta Ocotlán (Jalisco)', coords: [20.3500, -102.7500], type: 'toll', note: '$190 MXN' },
        { name: 'Caseta Zapotlanejo (Entrada GDL)', coords: [20.6200, -103.0500], type: 'toll', note: '$208 MXN' },
        { name: 'Guadalajara La Minerva', coords: [20.6597, -103.3496], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Ruta Bajío por Querétaro, Celaya e Irapuato (57D + 45D)',
      highwayCode: 'MEX-57D / MEX-45D',
      distanceKm: 560,
      durationMinutes: 370,
      tollCostMxn: 980,
      summary: 'Conecta por el Bajío industrial vía Querétaro, Salamanca, La Piedad y La Barca.',
      waypoints: [
        [19.4326, -99.1332],
        [20.5888, -100.3899], // Querétaro
        [20.5200, -100.8100], // Celaya
        [20.5700, -101.1900], // Salamanca
        [20.6700, -101.3500], // Irapuato
        [20.3500, -102.0200], // La Piedad
        [20.3000, -102.5500], // La Barca
        [20.6597, -103.3496]
      ],
      checkpoints: [
        { name: 'Caseta Tepotzotlán', coords: [19.7128, -99.2245], type: 'toll', note: '$102 MXN' },
        { name: 'Libramiento Celaya Cuota', coords: [20.5200, -100.8100], type: 'toll', note: '$115 MXN' },
        { name: 'Caseta Salamanca', coords: [20.5700, -101.1900], type: 'toll', note: '$98 MXN' },
        { name: 'Guadalajara Centro', coords: [20.6597, -103.3496], type: 'destination' }
      ]
    }
  },
  {
    key: 'mty-sal',
    name: 'Corredor Noreste Monterrey — Saltillo',
    originId: 'mty',
    destId: 'sal',
    primary: {
      name: 'Autopista Monterrey–Saltillo (40D Cuota)',
      highwayCode: 'MEX-40D',
      distanceKm: 88,
      durationMinutes: 65,
      tollCostMxn: 135,
      summary: 'Vía moderna de cuota de 4 carriles con viaductos para tráfico pesado y particulares.',
      waypoints: [
        [25.6866, -100.3161],
        [25.6700, -100.4600], // Santa Catarina
        [25.6000, -100.6800], // Caseta Los Chorros / García
        [25.5200, -100.8200], // Ojo Caliente
        [25.4383, -100.9737] // Saltillo
      ],
      checkpoints: [
        { name: 'Salida Santa Catarina (Morones Prieto)', coords: [25.6700, -100.4600], type: 'origin' },
        { name: 'Caseta Autopista Saltillo (CAPUFE)', coords: [25.6000, -100.6800], type: 'toll', note: '$135 MXN' },
        { name: 'Entronque Ramos Arizpe', coords: [25.5200, -100.8200], type: 'checkpoint' },
        { name: 'Saltillo Zona Universitaria', coords: [25.4383, -100.9737], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Carretera Libre Monterrey–Saltillo (40 Libre)',
      highwayCode: 'MEX-40 Libre',
      distanceKm: 86,
      durationMinutes: 95,
      tollCostMxn: 0,
      summary: 'Vía libre sin peaje; propensa a bancos densos de niebla y tráfico de tractocamiones.',
      waypoints: [
        [25.6866, -100.3161],
        [25.6600, -100.5100],
        [25.5800, -100.7200],
        [25.4900, -100.9100],
        [25.4383, -100.9737]
      ],
      checkpoints: [
        { name: 'Salida Blvd. Díaz Ordaz', coords: [25.6600, -100.5100], type: 'origin' },
        { name: 'Tramo de Curvas Cañón San Antonio', coords: [25.5800, -100.7200], type: 'checkpoint', note: 'Niebla frecuente' },
        { name: 'Saltillo Entrada Oriente', coords: [25.4383, -100.9737], type: 'destination' }
      ]
    }
  },
  {
    key: 'gdl-pvr',
    name: 'Corredor Occidente–Costa Guadalajara — Puerto Vallarta',
    originId: 'gdl',
    destId: 'pvr',
    primary: {
      name: 'Vía Corta Guadalajara–Vallarta (200D Nueva Cuota)',
      highwayCode: 'MEX-200D',
      distanceKm: 285,
      durationMinutes: 175,
      tollCostMxn: 620,
      summary: 'Nueva autopista por Jala, Compostela, Las Varas y Bucerías. Ahorra 2.5 horas.',
      waypoints: [
        [20.6597, -103.3496],
        [20.8500, -103.7500], // Arenal / Tequila
        [21.1000, -104.3500], // Ixtlán del Río
        [21.2000, -104.6000], // Jala
        [21.2800, -104.9000], // Compostela
        [21.1500, -105.1500], // Las Varas
        [20.8800, -105.3000], // Guayabitos / Sayulita
        [20.7500, -105.2800], // Bucerías / Bahía de Banderas
        [20.6534, -105.2253] // Puerto Vallarta
      ],
      checkpoints: [
        { name: 'Caseta El Arenal (CAPUFE)', coords: [20.8500, -103.7500], type: 'toll', note: '$193 MXN' },
        { name: 'Caseta Plan de Barrancas', coords: [21.0500, -104.2000], type: 'toll', note: '$288 MXN' },
        { name: 'Caseta Compostela (Vía Corta)', coords: [21.2800, -104.9000], type: 'toll', note: '$70 MXN' },
        { name: 'Caseta La Florida / Las Varas', coords: [21.1500, -105.1500], type: 'toll', note: '$69 MXN' },
        { name: 'Puerto Vallarta Malecón', coords: [20.6534, -105.2253], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Ruta Sierra por Ameca, Mascota y San Sebastián del Oeste',
      highwayCode: 'JAL-70 Libre',
      distanceKm: 310,
      durationMinutes: 310,
      tollCostMxn: 0,
      summary: 'Ruta panorámica de montaña sin peaje. Curvas cerradas y riesgo de derrumbes en lluvias.',
      waypoints: [
        [20.6597, -103.3496],
        [20.5500, -104.0500], // Ameca
        [20.6500, -104.5500], // Mixtlán
        [20.5300, -104.7900], // Mascota
        [20.7600, -104.8500], // San Sebastián
        [20.6534, -105.2253]
      ],
      checkpoints: [
        { name: 'Salida Periférico Sur / Ameca', coords: [20.6100, -103.4500], type: 'origin' },
        { name: 'Mascota Pueblo Mágico', coords: [20.5300, -104.7900], type: 'checkpoint' },
        { name: 'Puente El Progreso (Entrada Vallarta)', coords: [20.6800, -105.2000], type: 'checkpoint' },
        { name: 'Puerto Vallarta', coords: [20.6534, -105.2253], type: 'destination' }
      ]
    }
  },
  {
    key: 'cdmx-tol',
    name: 'Corredor México — Toluca',
    originId: 'cdmx',
    destId: 'tol',
    primary: {
      name: 'Autopista México–Toluca (15D Cuota)',
      highwayCode: 'MEX-15D',
      distanceKm: 64,
      durationMinutes: 50,
      tollCostMxn: 105,
      summary: 'Vía de 6 carriles por Santa Fe y La Marquesa de alto flujo vehicular.',
      waypoints: [
        [19.4326, -99.1332],
        [19.3600, -99.2700], // Santa Fe
        [19.3100, -99.3700], // Caseta La Marquesa
        [19.2900, -99.4800], // Lerma
        [19.2826, -99.6557] // Toluca Centro
      ],
      checkpoints: [
        { name: 'Salida Constituyentes / Santa Fe', coords: [19.3800, -99.2400], type: 'origin' },
        { name: 'Caseta La Marquesa (CAPUFE)', coords: [19.3100, -99.3700], type: 'toll', note: '$105 MXN' },
        { name: 'Entronque Libramiento Bicentenario', coords: [19.2900, -99.4800], type: 'checkpoint' },
        { name: 'Toluca Paseo Tollocan', coords: [19.2826, -99.6557], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Carretera Libre México–Toluca (15 Libre)',
      highwayCode: 'MEX-15 Libre',
      distanceKm: 68,
      durationMinutes: 80,
      tollCostMxn: 0,
      summary: 'Vía libre sin peaje; tráfico pesado en El Zarco y La Marquesa.',
      waypoints: [
        [19.4326, -99.1332],
        [19.3500, -99.2900],
        [19.2950, -99.4100],
        [19.2826, -99.6557]
      ],
      checkpoints: [
        { name: 'Salida Cuajimalpa', coords: [19.3500, -99.2900], type: 'origin' },
        { name: 'Paso por La Marquesa Libre', coords: [19.2950, -99.4100], type: 'checkpoint' },
        { name: 'Toluca', coords: [19.2826, -99.6557], type: 'destination' }
      ]
    }
  },
  {
    key: 'cun-mid',
    name: 'Corredor Peninsular Cancún — Mérida',
    originId: 'cun',
    destId: 'mid',
    primary: {
      name: 'Autopista del Mayab (180D Cuota)',
      highwayCode: 'MEX-180D',
      distanceKm: 308,
      durationMinutes: 195,
      tollCostMxn: 614,
      summary: 'Autopista de 4 carriles paralela al Tren Maya vía Valladolid y Chichén Itzá.',
      waypoints: [
        [21.1619, -86.8515],
        [20.9800, -87.4500], // Caseta Tintal
        [20.6900, -88.2000], // Valladolid Bypass
        [20.7300, -88.5800], // Caseta Pisté / Chichén
        [20.8900, -89.2800], // Caseta Kantunil
        [20.9674, -89.5926] // Mérida Periférico
      ],
      checkpoints: [
        { name: 'Salida Cancún Centro', coords: [21.1619, -86.8515], type: 'origin' },
        { name: 'Caseta El Tintal (ICA)', coords: [20.9800, -87.4500], type: 'toll', note: '$385 MXN' },
        { name: 'Caseta Pisté (Chichén Itzá)', coords: [20.7300, -88.5800], type: 'toll', note: '$229 MXN' },
        { name: 'Mérida Periférico Oriente', coords: [20.9674, -89.5926], type: 'destination' }
      ]
    },
    alternative1: {
      name: 'Carretera Costera Libre por Tizimín y Motul (180 / 176 Libre)',
      highwayCode: 'MEX-176 Libre',
      distanceKm: 335,
      durationMinutes: 280,
      tollCostMxn: 0,
      summary: 'Ruta turística libre sin peajes por Kantunilkín, Tizimín, Buctzotz y Motul.',
      waypoints: [
        [21.1619, -86.8515],
        [21.1000, -87.4800],
        [21.1400, -88.1500],
        [21.1700, -88.8000],
        [20.9674, -89.5926]
      ],
      checkpoints: [
        { name: 'Salida Cancún / Leona Vicario', coords: [21.1619, -86.8515], type: 'origin' },
        { name: 'Tizimín Ciudad Ganadera', coords: [21.1400, -88.1500], type: 'checkpoint' },
        { name: 'Motul', coords: [21.0900, -89.2800], type: 'checkpoint' },
        { name: 'Mérida', coords: [20.9674, -89.5926], type: 'destination' }
      ]
    }
  }
];

class RouteService {
  /**
   * Generates route options between two Mexican cities (or custom origin coordinates)
   * and evaluates real-time incidents and safety risks along each corridor.
   */
  public generateRoutePlan(
    originId: string,
    destId: string,
    activeAlerts: AlertItem[] = [],
    customOriginCoords?: [number, number],
    customOriginName?: string
  ): RoutePlan {
    const safeAlerts = Array.isArray(activeAlerts) ? activeAlerts : [];

    const originCity: MexicanCity = customOriginCoords
      ? {
          id: 'custom-gps-origin',
          name: customOriginName || 'Ubicación GPS Actual',
          state: 'GPS',
          coords: customOriginCoords,
          isMajor: true
        }
      : MEXICAN_CITIES.find(c => c.id === originId) || {
          id: originId,
          name: customOriginName || 'Ubicación de Origen',
          state: 'MX',
          coords: [19.4326, -99.1332],
          isMajor: false
        };

    const destCity: MexicanCity = MEXICAN_CITIES.find(c => c.id === destId) || {
      id: destId,
      name: 'Destino',
      state: 'MX',
      coords: [20.5888, -100.3899],
      isMajor: false
    };

    // 1. Check if we have a pre-defined canonical Mexican corridor in our database
    const directKey = `${originId}-${destId}`;
    const reverseKey = `${destId}-${originId}`;

    const corridor = !customOriginCoords ? PREDEFINED_CORRIDORS.find(c => c.key === directKey || c.key === reverseKey) : undefined;

    const generatedOptions: RouteOption[] = [];

    if (corridor) {
      const isReverse = corridor.key === reverseKey;

      // Primary Route
      const primaryWaypoints = isReverse
        ? [...corridor.primary.waypoints].reverse()
        : corridor.primary.waypoints;

      const primaryCheckpoints: RouteCheckpoint[] = (
        isReverse ? [...corridor.primary.checkpoints].reverse() : corridor.primary.checkpoints
      ).map((chk, idx) => ({
        id: `chk-prim-${idx}`,
        name: chk.name,
        coords: chk.coords,
        type: idx === 0 ? 'origin' : idx === corridor.primary.checkpoints.length - 1 ? 'destination' : chk.type,
        note: chk.note
      }));

      const primaryEvaluated = this.evaluateRouteSafety(
        'opt-primary',
        corridor.primary.name,
        'Recomendada (Cuota)',
        true,
        false,
        corridor.primary.highwayCode,
        corridor.primary.distanceKm,
        corridor.primary.durationMinutes,
        corridor.primary.tollCostMxn,
        corridor.primary.summary,
        primaryWaypoints,
        primaryCheckpoints,
        safeAlerts
      );
      generatedOptions.push(primaryEvaluated);

      // Alternative 1 (e.g. Arco Norte, Siglo XXI, Vía Corta)
      const alt1 = corridor.alternative1;
      if (alt1) {
        const alt1Waypoints = isReverse
          ? [...alt1.waypoints].reverse()
          : alt1.waypoints;

        const alt1Checkpoints: RouteCheckpoint[] = (
          isReverse ? [...alt1.checkpoints].reverse() : alt1.checkpoints
        ).map((chk, idx) => ({
          id: `chk-alt1-${idx}`,
          name: chk.name,
          coords: chk.coords,
          type: idx === 0 ? 'origin' : idx === alt1.checkpoints.length - 1 ? 'destination' : chk.type,
          note: chk.note
        }));

        const alt1Evaluated = this.evaluateRouteSafety(
          'opt-alt-1',
          alt1.name,
          'Alterna Táctica',
          false,
          true,
          alt1.highwayCode,
          alt1.distanceKm,
          alt1.durationMinutes,
          alt1.tollCostMxn,
          alt1.summary,
          alt1Waypoints,
          alt1Checkpoints,
          safeAlerts
        );
        generatedOptions.push(alt1Evaluated);
      }

      // Alternative 2 (e.g. Libre)
      const alt2 = corridor.alternative2;
      if (alt2) {
        const alt2Waypoints = isReverse
          ? [...alt2.waypoints].reverse()
          : alt2.waypoints;

        const alt2Checkpoints: RouteCheckpoint[] = (
          isReverse ? [...alt2.checkpoints].reverse() : alt2.checkpoints
        ).map((chk, idx) => ({
          id: `chk-alt2-${idx}`,
          name: chk.name,
          coords: chk.coords,
          type: idx === 0 ? 'origin' : idx === alt2.checkpoints.length - 1 ? 'destination' : chk.type,
          note: chk.note
        }));

        const alt2Evaluated = this.evaluateRouteSafety(
          'opt-alt-2',
          alt2.name,
          'Vía Libre (Sin Peaje)',
          false,
          true,
          alt2.highwayCode,
          alt2.distanceKm,
          alt2.durationMinutes,
          alt2.tollCostMxn,
          alt2.summary,
          alt2Waypoints,
          alt2Checkpoints,
          safeAlerts
        );
        generatedOptions.push(alt2Evaluated);
      }
    } else {
      // Dynamic route synthesis for arbitrary Mexican city pairs
      const generated = this.synthesizeDynamicRoutes(originCity, destCity, safeAlerts);
      generatedOptions.push(...generated);
    }

    // Determine the safest recommended option if the primary is compromised
    const primaryOption = generatedOptions[0];
    const isPrimaryCompromised = primaryOption && (primaryOption.safetyLevel === 'critical' || primaryOption.safetyLevel === 'warning');

    let bestOptionId = primaryOption?.id || '';
    if (isPrimaryCompromised && generatedOptions.length > 1) {
      // Find the alternative with the highest safety score
      const safestAlt = [...generatedOptions].sort((a, b) => b.safetyScore - a.safetyScore)[0];
      if (safestAlt && safestAlt.safetyScore > primaryOption.safetyScore) {
        bestOptionId = safestAlt.id;
      }
    }

    return {
      id: `plan-${Date.now()}`,
      originName: originCity.name,
      originCoords: originCity.coords,
      destinationName: destCity.name,
      destinationCoords: destCity.coords,
      selectedOptionId: bestOptionId,
      options: generatedOptions,
      calculatedAt: Date.now()
    };
  }

  /**
   * Synthesizes 2 dynamic route options for arbitrary city pairs
   */
  private synthesizeDynamicRoutes(
    origin: MexicanCity,
    dest: MexicanCity,
    activeAlerts: AlertItem[]
  ): RouteOption[] {
    const directDistKm = Math.round(
      calculateDistanceKm(origin.coords[0], origin.coords[1], dest.coords[0], dest.coords[1]) * 1.28
    );
    const estDurationMin = Math.round((directDistKm / 85) * 60);

    // Option 1: Direct Highway
    const midLat = (origin.coords[0] + dest.coords[0]) / 2;
    const midLng = (origin.coords[1] + dest.coords[1]) / 2;

    const primaryWaypoints: [number, number][] = [
      origin.coords,
      [origin.coords[0] + (dest.coords[0] - origin.coords[0]) * 0.25, origin.coords[1] + (dest.coords[1] - origin.coords[1]) * 0.25 + 0.05],
      [midLat, midLng],
      [origin.coords[0] + (dest.coords[0] - origin.coords[0]) * 0.75, origin.coords[1] + (dest.coords[1] - origin.coords[1]) * 0.75 - 0.05],
      dest.coords
    ];

    const primaryCheckpoints: RouteCheckpoint[] = [
      { id: 'dyn-chk-1', name: `Salida ${origin.name}`, coords: origin.coords, type: 'origin' },
      { id: 'dyn-chk-2', name: 'Caseta de Peaje Principal', coords: [midLat, midLng], type: 'toll', note: 'Estimado' },
      { id: 'dyn-chk-3', name: `Llegada ${dest.name}`, coords: dest.coords, type: 'destination' }
    ];

    const primaryOption = this.evaluateRouteSafety(
      'dyn-primary',
      `Corredor Carretero ${origin.name} ➔ ${dest.name} (Directo)`,
      'Ruta Principal',
      true,
      false,
      'Red Federal MX',
      directDistKm,
      estDurationMin,
      Math.round(directDistKm * 0.95),
      `Ruta directa por la red de carreteras federales entre ${origin.name} y ${dest.name}.`,
      primaryWaypoints,
      primaryCheckpoints,
      activeAlerts
    );

    // Option 2: Alternative Detour (Shifted lateral midpoint)
    const latDiff = dest.coords[0] - origin.coords[0];
    const lngDiff = dest.coords[1] - origin.coords[1];
    const perpLat = -lngDiff * 0.18;
    const perpLng = latDiff * 0.18;

    const altWaypoints: [number, number][] = [
      origin.coords,
      [origin.coords[0] + latDiff * 0.3 + perpLat * 0.7, origin.coords[1] + lngDiff * 0.3 + perpLng * 0.7],
      [midLat + perpLat, midLng + perpLng],
      [origin.coords[0] + latDiff * 0.7 + perpLat * 0.5, origin.coords[1] + lngDiff * 0.7 + perpLng * 0.5],
      dest.coords
    ];

    const altDistKm = Math.round(directDistKm * 1.15);
    const altDurationMin = Math.round(estDurationMin * 1.2);

    const altCheckpoints: RouteCheckpoint[] = [
      { id: 'dyn-alt-chk-1', name: `Salida ${origin.name} (Vía Alterna)`, coords: origin.coords, type: 'origin' },
      { id: 'dyn-alt-chk-2', name: 'Desvío Periférico / Libramiento', coords: [midLat + perpLat, midLng + perpLng], type: 'checkpoint' },
      { id: 'dyn-alt-chk-3', name: `Llegada ${dest.name}`, coords: dest.coords, type: 'destination' }
    ];

    const altOption = this.evaluateRouteSafety(
      'dyn-alt-1',
      `Ruta Alterna Periférica / Libramiento`,
      'Alterna Táctica',
      false,
      true,
      'Libramiento / Red Estatal',
      altDistKm,
      altDurationMin,
      Math.round(altDistKm * 0.8),
      `Trayecto perimetral alterno diseñado para evadir tramos de alta congestión o riesgo.`,
      altWaypoints,
      altCheckpoints,
      activeAlerts
    );

    return [primaryOption, altOption];
  }

  /**
   * Evaluates active alerts within 18 km of the route's polyline
   * and computes a comprehensive Safety Level, Safety Score and tactical recommendations.
   */
  private evaluateRouteSafety(
    id: string,
    name: string,
    tag: string,
    isRecommended: boolean,
    isAlternative: boolean,
    highwayCode: string,
    distanceKm: number,
    durationMinutes: number,
    tollCostMxn: number,
    summary: string,
    waypoints: [number, number][],
    checkpoints: RouteCheckpoint[],
    activeAlerts: AlertItem[]
  ): RouteOption {
    const BUFFER_RADIUS_KM = 20; // 20 km corridor influence buffer

    const incidentsOnRoute: AlertItem[] = [];
    const incidentBreakdown = {
      security: 0,
      red: 0,
      orange: 0,
      green: 0
    };

    for (const alert of activeAlerts) {
      if (alert.ignored || !alert.coords) continue;

      const dist = distanceToPolylineKm(alert.coords, waypoints);
      if (dist <= BUFFER_RADIUS_KM) {
        incidentsOnRoute.push(alert);
        if (alert.type === 'security') incidentBreakdown.security++;
        else if (alert.type === 'red') incidentBreakdown.red++;
        else if (alert.type === 'orange') incidentBreakdown.orange++;
        else if (alert.type === 'green') incidentBreakdown.green++;
      }
    }

    // Safety Calculation Math
    let safetyLevel: RouteSafetyLevel = 'safe';
    let safetyScore = 100;
    let recommendation = '🟢 TRAMO VERIFICADO: Carretera con flujo normal y sin eventos críticos reportados.';

    if (incidentBreakdown.security > 0) {
      safetyLevel = 'critical';
      safetyScore = Math.max(15, 45 - incidentBreakdown.security * 15 - incidentBreakdown.red * 10);
      recommendation = `🚨 ALERTA DE SEGURIDAD / ZONA ROJA: Se detectaron ${incidentBreakdown.security} reporte(s) de riesgo delictivo o presencia irregular en este corredor. SE RECOMIENDA TOMAR RUTA ALTERNA O VIAJAR ÚNICAMENTE DE DÍA EN CARAVANA.`;
    } else if (incidentBreakdown.red > 0) {
      safetyLevel = 'critical';
      safetyScore = Math.max(25, 60 - incidentBreakdown.red * 15 - incidentBreakdown.orange * 5);
      recommendation = `⛔ BLOQUEO TOTAL EN RUTA: Detectados ${incidentBreakdown.red} cierre(s) totales o casetas tomadas. Desvío inmediato a ruta alterna recomendado.`;
    } else if (incidentBreakdown.orange > 0) {
      safetyLevel = incidentBreakdown.orange >= 3 ? 'warning' : 'caution';
      safetyScore = Math.max(50, 90 - incidentBreakdown.orange * 8);
      recommendation = `⚠️ PRECAUCIÓN: ${incidentBreakdown.orange} incidente(s) de tráfico pesado, reducción de carriles u obras viales reportados.`;
    } else {
      safetyLevel = 'safe';
      safetyScore = 98;
      recommendation = '🟢 RUTA SEGURA: Tránsito fluido sin incidencias mayores en la red de monitoreo oficial.';
    }

    return {
      id,
      name,
      tag,
      isRecommended,
      isAlternative,
      highwayCode,
      distanceKm,
      durationMinutes,
      tollCostMxn,
      safetyLevel,
      safetyScore,
      summary,
      recommendation,
      waypoints,
      checkpoints,
      incidentsOnRoute,
      incidentBreakdown
    };
  }
}

export const routeService = new RouteService();
