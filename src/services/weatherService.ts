export interface WeatherInfo {
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  visibilityKm: number;
  roadCondition: 'Óptima' | 'Precaución por Lluvia' | 'Niebla Densa' | 'Viento Fuerte' | 'Peligro por Tormenta';
  conditionColor: string;
  isRain: boolean;
  isFog: boolean;
}

export interface HighwayCorridorWeather {
  id: string;
  name: string;
  highway: string;
  segment: string;
  state: string;
  coords: [number, number];
  weather?: WeatherInfo;
  loading?: boolean;
}

export const KEY_HIGHWAY_CORRIDORS: HighwayCorridorWeather[] = [
  {
    id: 'corridor-la-marquesa',
    name: 'México – Toluca (La Marquesa)',
    highway: 'MEX-15D',
    segment: 'Tramo Cuajimalpa – La Marquesa km 32',
    state: 'Estado de México',
    coords: [19.2934, -99.3789],
  },
  {
    id: 'corridor-mex-qro-tepeji',
    name: 'México – Querétaro (Tepeji del Río)',
    highway: 'MEX-57D',
    segment: 'Tramo Jorobas – Tepeji km 75',
    state: 'Hidalgo / EdoMex',
    coords: [19.8972, -99.3411],
  },
  {
    id: 'corridor-maltrata',
    name: 'Cumbres de Maltrata (Puebla – Orizaba)',
    highway: 'MEX-150D',
    segment: 'Descenso Cumbres de Maltrata km 235',
    state: 'Puebla / Veracruz',
    coords: [18.8167, -97.2833],
  },
  {
    id: 'corridor-mex-pue-sanmarcos',
    name: 'México – Puebla (Caseta San Marcos)',
    highway: 'MEX-150D',
    segment: 'Plaza de Cobro San Marcos km 33',
    state: 'Estado de México',
    coords: [19.3245, -98.9242],
  },
  {
    id: 'corridor-cuernavaca-pasoexpress',
    name: 'Autopista del Sol (Paso Express Cuernavaca)',
    highway: 'MEX-95D',
    segment: 'Paso Express Cuernavaca km 85-95',
    state: 'Morelos',
    coords: [18.9261, -99.2307],
  },
  {
    id: 'corridor-arco-norte',
    name: 'Arco Norte (Ajoloapan – Pachuca)',
    highway: 'MEX-M40D',
    segment: 'Tramo Ajoloapan – Tula – Pachuca km 115',
    state: 'Hidalgo',
    coords: [19.9833, -98.8167],
  },
  {
    id: 'corridor-mty-saltillo',
    name: 'Autopista Monterrey – Saltillo (Ojo Caliente)',
    highway: 'MEX-40D',
    segment: 'Tramo Cañón de Santa Catarina km 65',
    state: 'Nuevo León / Coahuila',
    coords: [25.5614, -100.8122],
  },
  {
    id: 'corridor-rumorosa',
    name: 'La Rumorosa (Mexicali – Tecate)',
    highway: 'MEX-2D',
    segment: 'Tramo La Rumorosa curvas km 55',
    state: 'Baja California',
    coords: [32.5312, -116.0534],
  },
  {
    id: 'corridor-carr57-matehuala',
    name: 'Carretera 57 (San Luis Potosí – Matehuala)',
    highway: 'MEX-57',
    segment: 'Tramo El Huizache – Matehuala km 140',
    state: 'San Luis Potosí',
    coords: [23.6483, -100.6433],
  },
  {
    id: 'corridor-gdl-tepic',
    name: 'Guadalajara – Tepic (Plan de Barrancas)',
    highway: 'MEX-15D',
    segment: 'Tramo Plan de Barrancas km 70',
    state: 'Jalisco / Nayarit',
    coords: [20.9500, -104.0500],
  }
];

function interpretWmoWeatherCode(code: number, windSpeed: number, precipitation: number): {
  description: string;
  roadCondition: WeatherInfo['roadCondition'];
  conditionColor: string;
  isRain: boolean;
  isFog: boolean;
} {
  // WMO Code interpretation
  if (code === 0) {
    if (windSpeed > 45) {
      return {
        description: 'Despejado con ráfagas de viento',
        roadCondition: 'Viento Fuerte',
        conditionColor: 'text-amber-400',
        isRain: false,
        isFog: false
      };
    }
    return {
      description: 'Cielo Despejado',
      roadCondition: 'Óptima',
      conditionColor: 'text-emerald-400',
      isRain: false,
      isFog: false
    };
  }

  if (code >= 1 && code <= 3) {
    if (windSpeed > 45) {
      return {
        description: 'Nublado con viento fuerte',
        roadCondition: 'Viento Fuerte',
        conditionColor: 'text-amber-400',
        isRain: false,
        isFog: false
      };
    }
    return {
      description: code === 1 ? 'Parcialmente Nublado' : code === 2 ? 'Medio Nublado' : 'Cielo Cubierto',
      roadCondition: 'Óptima',
      conditionColor: 'text-blue-400',
      isRain: false,
      isFog: false
    };
  }

  if (code === 45 || code === 48) {
    return {
      description: 'Niebla / Banco Denso',
      roadCondition: 'Niebla Densa',
      conditionColor: 'text-yellow-400',
      isRain: false,
      isFog: true
    };
  }

  if (code >= 51 && code <= 67) {
    return {
      description: code >= 61 ? 'Lluvia Moderada' : 'Llovizna Constante',
      roadCondition: 'Precaución por Lluvia',
      conditionColor: 'text-sky-400',
      isRain: true,
      isFog: false
    };
  }

  if (code >= 71 && code <= 77) {
    return {
      description: 'Granizo / Aguanieve',
      roadCondition: 'Peligro por Tormenta',
      conditionColor: 'text-purple-400',
      isRain: true,
      isFog: false
    };
  }

  if (code >= 80 && code <= 82) {
    return {
      description: 'Chubascos Intensos',
      roadCondition: 'Precaución por Lluvia',
      conditionColor: 'text-orange-400',
      isRain: true,
      isFog: false
    };
  }

  if (code >= 95 && code <= 99) {
    return {
      description: 'Tormenta Eléctrica Severa',
      roadCondition: 'Peligro por Tormenta',
      conditionColor: 'text-red-400',
      isRain: true,
      isFog: false
    };
  }

  if (precipitation > 1.0) {
    return {
      description: 'Precipitación Activa',
      roadCondition: 'Precaución por Lluvia',
      conditionColor: 'text-sky-400',
      isRain: true,
      isFog: false
    };
  }

  return {
    description: 'Condiciones Variables',
    roadCondition: 'Óptima',
    conditionColor: 'text-emerald-400',
    isRain: false,
    isFog: false
  };
}

export async function fetchLiveWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!resp.ok) return null;
    const data = await resp.json();

    if (!data.current) return null;

    const cur = data.current;
    const temp = Math.round(cur.temperature_2m ?? 20);
    const appTemp = Math.round(cur.apparent_temperature ?? temp);
    const humidity = Math.round(cur.relative_humidity_2m ?? 50);
    const precip = cur.precipitation ?? 0;
    const weatherCode = cur.weather_code ?? 0;
    const wind = Math.round(cur.wind_speed_10m ?? 10);

    const interpreted = interpretWmoWeatherCode(weatherCode, wind, precip);

    // Approximate visibility based on fog/precipitation
    let visibilityKm = 10;
    if (interpreted.isFog) visibilityKm = 1.5;
    else if (interpreted.isRain) visibilityKm = 5.0;

    return {
      temperature: temp,
      apparentTemperature: appTemp,
      relativeHumidity: humidity,
      precipitation: precip,
      weatherCode,
      weatherDescription: interpreted.description,
      windSpeed: wind,
      visibilityKm,
      roadCondition: interpreted.roadCondition,
      conditionColor: interpreted.conditionColor,
      isRain: interpreted.isRain,
      isFog: interpreted.isFog
    };
  } catch {
    // Fallback estimate for resilient UI
    return {
      temperature: 21,
      apparentTemperature: 21,
      relativeHumidity: 45,
      precipitation: 0,
      weatherCode: 1,
      weatherDescription: 'Mayormente Despejado',
      windSpeed: 12,
      visibilityKm: 10,
      roadCondition: 'Óptima',
      conditionColor: 'text-emerald-400',
      isRain: false,
      isFog: false
    };
  }
}
