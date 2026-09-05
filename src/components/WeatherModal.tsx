import React, { useEffect, useState } from 'react';
import { CloudRain, Wind, Eye, Droplets, Thermometer, ShieldAlert, CheckCircle, RefreshCw, X, Search, Compass, AlertTriangle, CloudFog, Sun, CloudLightning } from 'lucide-react';
import { KEY_HIGHWAY_CORRIDORS, HighwayCorridorWeather, fetchLiveWeather, WeatherInfo } from '../services/weatherService';
import { ThemeMode } from '../types';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCorridor?: (coords: [number, number], name: string) => void;
  theme: ThemeMode;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  onSelectCorridor,
  theme
}) => {
  const [corridors, setCorridors] = useState<HighwayCorridorWeather[]>(KEY_HIGHWAY_CORRIDORS);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'alert' | 'rain' | 'fog'>('all');

  const isLight = theme === 'light';

  const loadAllCorridorsWeather = async () => {
    setLoading(true);
    const updated = await Promise.all(
      KEY_HIGHWAY_CORRIDORS.map(async (corridor) => {
        const weather = await fetchLiveWeather(corridor.coords[0], corridor.coords[1]);
        return {
          ...corridor,
          weather: weather || undefined
        };
      })
    );
    setCorridors(updated);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadAllCorridorsWeather();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCorridors = corridors.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.highway.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase()) ||
      c.segment.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (selectedCategory === 'alert') {
      return c.weather && c.weather.roadCondition !== 'Óptima';
    }
    if (selectedCategory === 'rain') {
      return c.weather && c.weather.isRain;
    }
    if (selectedCategory === 'fog') {
      return c.weather && c.weather.isFog;
    }

    return true;
  });

  const getWeatherIcon = (weather?: WeatherInfo) => {
    if (!weather) return <Sun className="w-5 h-5 text-amber-400" />;
    if (weather.isFog) return <CloudFog className="w-5 h-5 text-yellow-400" />;
    if (weather.weatherCode >= 95) return <CloudLightning className="w-5 h-5 text-red-400" />;
    if (weather.isRain) return <CloudRain className="w-5 h-5 text-sky-400" />;
    if (weather.windSpeed > 40) return <Wind className="w-5 h-5 text-amber-400" />;
    return <Sun className="w-5 h-5 text-amber-400" />;
  };

  const getConditionBadge = (condition?: WeatherInfo['roadCondition']) => {
    switch (condition) {
      case 'Óptima':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
            isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}>
            <CheckCircle className="w-3 h-3" /> VÍA SECA / ÓPTIMA
          </span>
        );
      case 'Precaución por Lluvia':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
            isLight ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
          }`}>
            <CloudRain className="w-3 h-3" /> PAVIMENTO MOJADO
          </span>
        );
      case 'Niebla Densa':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
            isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
          }`}>
            <CloudFog className="w-3 h-3" /> NIEBLA / VISIBILIDAD BAJA
          </span>
        );
      case 'Viento Fuerte':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
            isLight ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
          }`}>
            <Wind className="w-3 h-3" /> RÁFAGAS DE VIENTO
          </span>
        );
      case 'Peligro por Tormenta':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
            isLight ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse'
          }`}>
            <AlertTriangle className="w-3 h-3" /> TORMENTA SEVERA
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[7500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isLight
            ? 'bg-white border border-slate-200 text-slate-900'
            : 'bg-[#070B10] border border-white/10 text-[#E6EEF6]'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#05070A] border-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Clima y Condiciones en Tramos Carreteros
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  EN VIVO
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Monitoreo meteorológico en tiempo real de los principales corredores y autopistas federales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllCorridorsWeather}
              disabled={loading}
              title="Actualizar mediciones de clima"
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline text-[11px] font-mono">Actualizar</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar clima vial"
              title="Cerrar"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className={`p-4 border-b space-y-3 ${isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-black/20 border-white/5'}`}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar autopista, tramo o estado (ej. Marquesa, Maltrata, 57D)..."
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs transition-colors focus:outline-none ${
                  isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500'
                    : 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-sky-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-sky-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Todos ({corridors.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('alert')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'alert'
                    ? 'bg-amber-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Con Alerta Activa
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('rain')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'rain'
                    ? 'bg-blue-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Lluvia
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('fog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'fog'
                    ? 'bg-yellow-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Niebla
              </button>
            </div>
          </div>
        </div>

        {/* Corridor Weather Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {filteredCorridors.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <CloudRain className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No se encontraron tramos con los criterios de búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCorridors.map((c) => {
                const w = c.weather;
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isLight
                        ? 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-md'
                        : 'bg-white/5 border-white/5 hover:border-sky-500/40 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'
                          }`}>
                            {c.highway}
                          </span>
                          <h3 className="font-bold text-sm mt-1 leading-snug">{c.name}</h3>
                          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {c.segment}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {w ? (
                            <div className="flex items-center gap-1 text-lg font-bold font-mono">
                              {getWeatherIcon(w)}
                              <span>{w.temperature}°C</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">Cargando...</span>
                          )}
                        </div>
                      </div>

                      {/* Condition Badge */}
                      <div className="mb-3">
                        {getConditionBadge(w?.roadCondition)}
                      </div>

                      {/* Detailed Weather Stats */}
                      {w && (
                        <div className={`grid grid-cols-3 gap-2 p-2.5 rounded-lg text-xs font-mono mb-3 ${
                          isLight ? 'bg-slate-50 border border-slate-200' : 'bg-black/40 border border-white/5'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <Wind className="w-3.5 h-3.5 text-slate-400" />
                            <div>
                              <div className="text-[9px] text-slate-500 uppercase">Viento</div>
                              <div className="font-bold">{w.windSpeed} km/h</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Droplets className="w-3.5 h-3.5 text-blue-400" />
                            <div>
                              <div className="text-[9px] text-slate-500 uppercase">Humedad</div>
                              <div className="font-bold">{w.relativeHumidity}%</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <div>
                              <div className="text-[9px] text-slate-500 uppercase">Visibilidad</div>
                              <div className="font-bold">{w.visibilityKm} km</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    {onSelectCorridor && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCorridor(c.coords, c.name);
                          onClose();
                        }}
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300'
                            : 'bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/10 hover:border-sky-500/30'
                        }`}
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Ver en Mapa</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#05070A] border-white/5 text-slate-400'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-mono text-[11px]">Modelos meteorológicos actualizados cada 15 min</span>
          </div>
          <div className="text-[11px] font-mono">
            Fuente: Sensores viales y Open-Meteo Road Climatology
          </div>
        </div>
      </div>
    </div>
  );
};
