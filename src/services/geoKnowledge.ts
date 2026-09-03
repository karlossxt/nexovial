// Knowledge base of Mexican Highways, Casetas, State Capitals & Corridors

export interface HighwayGeo {
  name: string;
  state: string;
  coords: [number, number];
  aliases: string[];
}

export const KNOWN_HIGHWAYS_AND_PLACES: HighwayGeo[] = [
  {
    name: 'México–Toluca (La Marquesa)',
    state: 'EdoMex',
    coords: [19.3082, -99.3756],
    aliases: ['mexico-toluca', 'mexico toluca', 'la marquesa', 'marquesa', 'lerma', 'ocoyoacac', 'caseta la venta']
  },
  {
    name: 'México–Querétaro (Tepotzotlán)',
    state: 'EdoMex',
    coords: [19.7155, -99.2241],
    aliases: ['mexico-queretaro', 'mexico queretaro', 'tepotzotlan', 'caseta tepotzotlan', 'jilotepec', 'km 80', 'km 90']
  },
  {
    name: 'México–Querétaro (Palmillas / San Juan del Río)',
    state: 'Querétaro',
    coords: [20.3541, -99.9678],
    aliases: ['palmillas', 'san juan del rio', 'pedro escobedo', 'km 140', 'km 150', 'km 160']
  },
  {
    name: 'Arco Norte (Tula / Pachuca)',
    state: 'Hidalgo',
    coords: [20.0526, -99.3412],
    aliases: ['arco norte', 'arconorte', 'caseta tula', 'atitalaquia', 'apaxco', 'km 120', 'km 150']
  },
  {
    name: 'Arco Norte (San Martín Texmelucan)',
    state: 'Puebla',
    coords: [19.2842, -98.4344],
    aliases: ['arco norte puebla', 'texmelucan arco', 'sanctorum']
  },
  {
    name: 'Autopista del Sol (Cuernavaca)',
    state: 'Morelos',
    coords: [18.9242, -99.2216],
    aliases: ['autopista del sol', 'mexico-cuernavaca', 'mexico cuernavaca', 'tres marias', 'la pera', 'tres marías', 'caseta tlalpan']
  },
  {
    name: 'Autopista del Sol (Paso Morelos / Chilpancingo)',
    state: 'Guerrero',
    coords: [17.5516, -99.5056],
    aliases: ['chilpancingo', 'paso morelos', 'acapulco', 'caseta palo blanco']
  },
  {
    name: 'México–Puebla (Caseta San Marcos)',
    state: 'EdoMex',
    coords: [19.3331, -98.8872],
    aliases: ['mexico-puebla', 'mexico puebla', 'caseta san marcos', 'chalco', 'ixtapaluca', 'rio frio', 'río frío']
  },
  {
    name: 'México–Puebla (San Martín Texmelucan)',
    state: 'Puebla',
    coords: [19.2842, -98.4344],
    aliases: ['texmelucan', 'santa rita tlahuapan', 'huejotzingo']
  },
  {
    name: 'México–Pachuca (Ojo de Agua / Tecámac)',
    state: 'EdoMex',
    coords: [19.6841, -98.9882],
    aliases: ['mexico-pachuca', 'mexico pachuca', 'ojo de agua', 'tecamac', 'tecámac', 'caseta ojo de agua', 'tizayuca']
  },
  {
    name: 'México–Veracruz (La Tinaja / Córdoba)',
    state: 'Veracruz',
    coords: [18.8842, -96.9312],
    aliases: ['mexico-veracruz', 'mexico veracruz', 'cordoba', 'córdoba', 'orizaba', 'cumbres de maltrata', 'la tinaja', 'fortin']
  },
  {
    name: 'Guadalajara–Tepic (Plan de Barrancas)',
    state: 'Jalisco',
    coords: [20.9126, -103.8821],
    aliases: ['guadalajara-tepic', 'guadalajara tepic', 'plan de barrancas', 'magdalena', 'arenas', 'ixtlan del rio']
  },
  {
    name: 'Monterrey–Nuevo Laredo (La Carbonera / Ciénaga)',
    state: 'Nuevo León',
    coords: [26.0421, -100.2541],
    aliases: ['monterrey-laredo', 'monterrey laredo', 'nuevo laredo', 'caseta sabinas', 'sabinas hidalgo', 'la cuesta']
  },
  {
    name: 'Guadalajara–Colima',
    state: 'Jalisco',
    coords: [19.7842, -103.5412],
    aliases: ['guadalajara-colima', 'guadalajara colima', 'ciudad guzman', 'sayula', 'acatlan de juarez']
  },
  {
    name: 'Querétaro–San Luis Potosí (Carretera 57)',
    state: 'Guanajuato',
    coords: [21.1561, -100.8341],
    aliases: ['carretera 57', 'san diego de la union', 'santa maria del rio']
  },
  {
    name: 'Carretera 57 (Matehuala / SLP)',
    state: 'San Luis Potosí',
    coords: [23.6483, -100.6433],
    aliases: ['matehuala', 'el huizache', 'cedral', 'real de catorce']
  },
  {
    name: 'Tuxtla Gutiérrez–San Cristóbal',
    state: 'Chiapas',
    coords: [16.7412, -93.0841],
    aliases: ['chiapas', 'tuxtla', 'san cristobal de las casas', 'chiapa de corzo', 'arriaga']
  },
  {
    name: 'Morelia–Guadalajara (Autopista de Occidente)',
    state: 'Michoacán',
    coords: [19.8241, -101.4521],
    aliases: ['autopista de occidente', 'morelia', 'maravatio', 'churintzio', 'panindicuaro', 'zinapécuaro']
  },
  {
    name: 'Hermosillo–Nogales (Carretera Federal 15)',
    state: 'Sonora',
    coords: [30.6841, -110.9412],
    aliases: ['sonora', 'nogales', 'hermosillo', 'santa ana', 'imuris', 'magdalena de kino', 'cananea']
  },
  {
    name: 'CDMX - Periférico / Insurgentes / Calzada de Tlalpan',
    state: 'CDMX',
    coords: [19.4326, -99.1332],
    aliases: ['cdmx', 'ciudad de mexico', 'periferico', 'insurgentes', 'viaducto', 'circuito interior', 'zaragoza', 'tlalpan']
  }
];

export function findLocationInText(text: string): { coords: [number, number]; locationName: string; state: string; highway: string } | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // 1. Check direct highway/alias matches
  for (const item of KNOWN_HIGHWAYS_AND_PLACES) {
    for (const alias of item.aliases) {
      if (lower.includes(alias)) {
        return {
          coords: item.coords,
          locationName: item.name,
          state: item.state,
          highway: item.name.split('(')[0].trim()
        };
      }
    }
  }

  // 2. Check general states
  const stateDefaults: Record<string, [number, number]> = {
    cdmx: [19.4326, -99.1332],
    edomex: [19.3569, -99.6453],
    jalisco: [20.6597, -103.3496],
    'nuevo león': [25.6866, -100.3161],
    'nuevo leon': [25.6866, -100.3161],
    puebla: [19.0414, -98.2063],
    guanajuato: [21.0190, -101.2574],
    querétaro: [20.5888, -100.3899],
    queretaro: [20.5888, -100.3899],
    hidalgo: [20.1011, -98.7591],
    veracruz: [19.1738, -96.1342],
    chiapas: [16.7569, -93.1292],
    morelos: [18.9242, -99.2216],
    michoacán: [19.7060, -101.1950],
    michoacan: [19.7060, -101.1950],
    sonora: [29.0729, -110.9559],
    sinaloa: [24.8091, -107.3940],
    guerrero: [17.5516, -99.5056],
    tamaulipas: [23.7369, -99.1411]
  };

  for (const [st, coords] of Object.entries(stateDefaults)) {
    if (lower.includes(st)) {
      const formattedState = st.charAt(0).toUpperCase() + st.slice(1);
      return {
        coords,
        locationName: `Tramo en ${formattedState}`,
        state: formattedState,
        highway: 'Carretera Estatal/Federal'
      };
    }
  }

  return null;
}
