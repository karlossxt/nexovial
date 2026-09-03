export type EmergencyCategory = 'all' | 'auxilio' | 'seguridad' | 'medica' | 'concesionaria' | 'proteccion_civil';

export interface EmergencyContact {
  id: string;
  name: string;
  shortNumber: string;
  directPhone?: string;
  category: EmergencyCategory;
  categoryLabel: string;
  description: string;
  scope: string; // 'Nacional', 'Autopistas de Cuota', 'Carreteras Federales Libres', etc.
  cost: 'Gratuito' | 'Gratuito (mano de obra)' | 'Llamada Gratuita' | 'Llamada local/01800' | 'Servicio con cobro según aseguradora';
  isPrimary?: boolean;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'em-capufe',
    name: 'CAPUFE (Caminos y Puentes Federales)',
    shortNumber: '074',
    directPhone: '800 990 3900',
    category: 'auxilio',
    categoryLabel: 'Auxilio Vial & Grúas',
    description: 'Atención médica prehospitalaria, grúa gratuita hasta el poblado más cercano, abanderamiento y auxilio mecánico en toda la red CAPUFE.',
    scope: 'Autopistas de Cuota Federales',
    cost: 'Gratuito',
    isPrimary: true
  },
  {
    id: 'em-angeles-verdes',
    name: 'Ángeles Verdes (SECTUR)',
    shortNumber: '078',
    directPhone: '55 5250 8221',
    category: 'auxilio',
    categoryLabel: 'Auxilio Mecánico en Carretera',
    description: 'Servicio de auxilio mecánico de emergencia, arrastre de vehículos, información turística y apoyo en tramos carreteros federales libres y de cuota.',
    scope: 'Carreteras Federales de todo México',
    cost: 'Gratuito (mano de obra)',
    isPrimary: true
  },
  {
    id: 'em-guardia-nacional',
    name: 'Guardia Nacional División Carreteras',
    shortNumber: '088',
    directPhone: '800 440 3690',
    category: 'seguridad',
    categoryLabel: 'Seguridad & Vigilancia',
    description: 'Reporte de asaltos, bloqueos, presencia de grupos armados, accidentes mayores y patrullaje de apoyo en carreteras federales.',
    scope: 'Toda la Red Carretera Federal',
    cost: 'Gratuito',
    isPrimary: true
  },
  {
    id: 'em-911',
    name: '911 Número Único de Emergencias',
    shortNumber: '911',
    category: 'medica',
    categoryLabel: 'Emergencias Integrales',
    description: 'Coordinación inmediata con Cruz Roja, Bomberos, Policía Estatal y Protección Civil para cualquier incidente grave.',
    scope: 'Nacional (Todo el país)',
    cost: 'Gratuito',
    isPrimary: true
  },
  {
    id: 'em-cruz-roja',
    name: 'Cruz Roja Mexicana (Sede Nacional)',
    shortNumber: '911',
    directPhone: '55 5395 1111',
    category: 'medica',
    categoryLabel: 'Atención Médica & Rescate',
    description: 'Ambulancias de urgencia, brigadas de rescate urbano y rescate en zonas de barrancos o accidentes carreteros graves.',
    scope: 'Nacional',
    cost: 'Gratuito',
  },
  {
    id: 'em-proteccion-civil',
    name: 'Protección Civil Nacional (CNPC)',
    shortNumber: '55 5128 0000',
    directPhone: '800 004 1300',
    category: 'proteccion_civil',
    categoryLabel: 'Protección Civil & Clima',
    description: 'Monitoreo de derrumbes, deslaves por lluvia, ciclones, sismos e inundaciones en tramos carreteros vulnerables.',
    scope: 'Nacional',
    cost: 'Gratuito',
  },
  {
    id: 'em-denuncia-anonima',
    name: 'Denuncia Anónima Federal',
    shortNumber: '089',
    category: 'seguridad',
    categoryLabel: 'Denuncia Ciudadana',
    description: 'Reporte 100% anónimo de delitos en autopistas, extorsiones, retenes falsos o actividades ilícitas.',
    scope: 'Nacional',
    cost: 'Gratuito',
  },
  {
    id: 'em-sict',
    name: 'SICT (Infraestructura y Transportes)',
    shortNumber: '800 227 8331',
    category: 'auxilio',
    categoryLabel: 'Reporte de Infraestructura',
    description: 'Reporte de baches críticos, socavones, caída de puentes o fallas en señalamientos de la red carretera federal.',
    scope: 'Nacional',
    cost: 'Gratuito',
  },
  {
    id: 'em-arco-norte',
    name: 'Autopista Arco Norte (Concesionaria)',
    shortNumber: '800 890 0888',
    category: 'concesionaria',
    categoryLabel: 'Concesionaria Autopista',
    description: 'Auxilio vial, cobro de seguros de peaje y atención a emergencias en el libramiento Arco Norte (Puebla–Hidalgo–EdoMex–Querétaro).',
    scope: 'Autopista Arco Norte MEX-M40D',
    cost: 'Llamada Gratuita',
  },
  {
    id: 'em-rco',
    name: 'Red de Carreteras de Occidente (RCO)',
    shortNumber: '800 276 7432',
    category: 'concesionaria',
    categoryLabel: 'Concesionaria Autopista',
    description: 'Atención médica y auxilio mecánico en autopistas México–Guadalajara, Maravatío–Zapotlanejo y León–Aguascalientes.',
    scope: 'Occidente y Bajío',
    cost: 'Llamada Gratuita',
  },
  {
    id: 'em-pasa-mty-saltillo',
    name: 'Autopista Monterrey – Saltillo (PASA)',
    shortNumber: '800 837 3800',
    category: 'concesionaria',
    categoryLabel: 'Concesionaria Autopista',
    description: 'Auxilio de grúa y reporte de condiciones climáticas por niebla en el tramo Monterrey–Saltillo de cuota.',
    scope: 'Nuevo León y Coahuila',
    cost: 'Llamada Gratuita',
  },
  {
    id: 'em-autovias-michoacan',
    name: 'Autopistas de Michoacán (Autovías)',
    shortNumber: '800 890 7777',
    category: 'concesionaria',
    categoryLabel: 'Concesionaria Autopista',
    description: 'Asistencia y grúas en la Autopista Siglo XXI (Pátzcuaro–Uruapan–Lázaro Cárdenas).',
    scope: 'Michoacán / Costa Pacífico',
    cost: 'Llamada Gratuita',
  }
];
