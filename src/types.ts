export type AlertType = 'red' | 'orange' | 'green' | 'security';

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  feedSource: string;
  type: AlertType;
  coords: [number, number] | null;
  locationName: string;
  state?: string;
  highway?: string;
  kilometer?: string | number;
  detectedAt: number;
  ignored: boolean;
  severityScore?: number; // 1 to 10
  direction?: string; // e.g. "Sentido a CDMX", "Ambos sentidos"
  verified?: boolean;
}

export type RouteSafetyLevel = 'safe' | 'caution' | 'warning' | 'critical';

export interface RouteCheckpoint {
  id: string;
  name: string;
  coords: [number, number];
  type: 'origin' | 'checkpoint' | 'toll' | 'warning' | 'destination';
  note?: string;
}

export interface RouteOption {
  id: string;
  name: string;
  tag: string; // 'Recomendada' | 'Alterna Segura' | 'Vía Libre' | 'Libramiento'
  isRecommended: boolean;
  isAlternative: boolean;
  highwayCode: string;
  distanceKm: number;
  durationMinutes: number;
  tollCostMxn: number;
  safetyLevel: RouteSafetyLevel;
  safetyScore: number; // 0 to 100
  summary: string;
  recommendation: string;
  waypoints: [number, number][];
  checkpoints: RouteCheckpoint[];
  incidentsOnRoute: AlertItem[];
  incidentBreakdown: {
    security: number;
    red: number;
    orange: number;
    green: number;
  };
  weatherCondition?: string;
}

export interface RoutePlan {
  id: string;
  originName: string;
  originCoords: [number, number];
  destinationName: string;
  destinationCoords: [number, number];
  selectedOptionId: string;
  options: RouteOption[];
  calculatedAt: number;
}

export interface FilterState {
  enabledTypes: Record<AlertType, boolean>;
  selectedState: string;
  selectedRoad: string;
  searchQuery: string;
  onlyActiveWithCoords: boolean;
}

export interface DashboardStats {
  total: number;
  active: number;
  newLastMinute: number;
  noLocation: number;
  byType: Record<AlertType, number>;
}

export type TileLayerType = 'dark' | 'standard' | 'satellite';

export type ThemeMode = 'dark' | 'light';

