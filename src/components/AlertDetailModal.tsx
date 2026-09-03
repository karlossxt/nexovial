import React, { useEffect, useState } from 'react';
import { AlertItem, ThemeMode } from '../types';
import { requestAIDetailedAnalysis } from '../services/apiClient';
import { fetchLiveWeather, WeatherInfo } from '../services/weatherService';
import { X, MapPin, Clock, Sparkles, Navigation, CheckCircle, Copy, CloudRain } from 'lucide-react';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onFocusOnMap: (alert: AlertItem) => void;
  theme?: ThemeMode;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({ alert, onClose, onFocusOnMap, theme = 'dark' }) => {
  const [aiDetails, setAiDetails] = useState<{
    summary: string;
    severityScore: number;
    affectedLanes: string;
    alternativeRouteAdvice: string;
    estimatedDurationHours: number;
  } | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLight = theme === 'light';

  useEffect(() => {
    if (!alert) {
      setAiDetails(null);
      setWeather(null);
      return;
    }

    let isMounted = true;
    setLoadingAi(true);

    requestAIDetailedAnalysis(alert)
      .then((res) => {
        if (isMounted) {
          setAiDetails(res);
          setLoadingAi(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingAi(false);
      });

    // Fetch live weather if coordinates exist
    if (alert.coords) {
      setLoadingWeather(true);
      fetchLiveWeather(alert.coords[0], alert.coords[1])
        .then((w) => {
          if (isMounted) {
            setWeather(w);
            setLoadingWeather(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoadingWeather(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [alert]);

  if (!alert) return null;

  const copyToClipboard = () => {
    const text = `🚨 ALERTA NEXO: ${alert.title}\n📍 ${alert.locationName}\n📅 ${new Date(alert.detectedAt).toLocaleString()}\nDetalle: ${alert.description}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback para navegadores sin API de portapapeles
    });
  };

  const getBadgeStyle = () => {
    switch (alert.type) {
      case 'red': return { bg: isLight ? 'bg-red-100 text-red-700 border-red-300' : 'bg-red-500/10 text-red-400 border-red-500/30', text: 'BLOQUEO / CIERRE TOTAL' };
      case 'orange': return { bg: isLight ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-orange-500/10 text-orange-400 border-orange-500/30', text: 'INCIDENTE MAYOR' };
      case 'green': return { bg: isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-emerald-500/10 text-green-400 border-green-500/30', text: 'VÍA LIBRE' };
      case 'security': return { bg: isLight ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-pink-500/10 text-pink-400 border-pink-500/30', text: 'ZONA ROJA / SEGURIDAD' };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className="fixed inset-0 z-[7500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#070B10] border-white/10 text-[#E6EEF6]'
      }`}>
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#05070A] border-white/5'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border tracking-wider uppercase ${badge.bg}`}>
              {badge.text}
            </span>
            {alert.verified && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                isLight ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}>
                <CheckCircle className="w-3 h-3" /> VERIFICADO
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar alerta"
            title="Cerrar"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div>
            <h2 className="text-base sm:text-lg font-bold leading-snug">{alert.title}</h2>
            <p className={`text-xs sm:text-sm mt-2 leading-relaxed p-3 rounded-lg border ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
            }`}>
              {alert.description}
            </p>
          </div>

          {/* Location & Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-3 rounded-lg border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
            }`}>
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-500" /> Ubicación
              </div>
              <div className="font-bold truncate">{alert.locationName}</div>
              {alert.coords && (
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {alert.coords[0].toFixed(4)}, {alert.coords[1].toFixed(4)}
                </div>
              )}
            </div>

            <div className={`p-3 rounded-lg border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
            }`}>
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-500" /> Detección
              </div>
              <div className="font-bold font-mono">{new Date(alert.detectedAt).toLocaleTimeString()}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                Fuente: <span className="font-medium text-slate-500">{alert.feedSource}</span>
              </div>
            </div>
          </div>

          {/* Weather at Alert Location */}
          {alert.coords && (
            <div className={`p-3 rounded-lg border ${
              isLight ? 'bg-sky-50/60 border-sky-200 text-slate-800' : 'bg-sky-950/20 border-sky-500/20 text-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-300">
                  <CloudRain className="w-3.5 h-3.5" />
                  <span>Clima en este Tramo Carretero</span>
                </div>
                {loadingWeather && <span className="text-[10px] font-mono text-sky-500 animate-pulse">Consultando clima...</span>}
              </div>

              {weather ? (
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  <div className={`p-2 rounded border text-center ${isLight ? 'bg-white border-sky-100' : 'bg-black/30 border-white/5'}`}>
                    <div className="text-[9px] text-slate-400">Temp</div>
                    <div className="font-bold text-sm">{weather.temperature}°C</div>
                  </div>
                  <div className={`p-2 rounded border text-center ${isLight ? 'bg-white border-sky-100' : 'bg-black/30 border-white/5'}`}>
                    <div className="text-[9px] text-slate-400">Condición</div>
                    <div className="font-bold text-[10px] truncate">{weather.weatherDescription}</div>
                  </div>
                  <div className={`p-2 rounded border text-center ${isLight ? 'bg-white border-sky-100' : 'bg-black/30 border-white/5'}`}>
                    <div className="text-[9px] text-slate-400">Viento</div>
                    <div className="font-bold">{weather.windSpeed} km/h</div>
                  </div>
                  <div className={`p-2 rounded border text-center ${isLight ? 'bg-white border-sky-100' : 'bg-black/30 border-white/5'}`}>
                    <div className="text-[9px] text-slate-400">Visibilidad</div>
                    <div className="font-bold">{weather.visibilityKm} km</div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Obteniendo telemetría meteorológica...
                </div>
              )}
            </div>
          )}

          {/* AI Intelligence Assessment */}
          <div className={`p-3.5 rounded-lg border space-y-2.5 ${
            isLight
              ? 'bg-blue-50/70 border-blue-200 text-slate-800'
              : 'bg-gradient-to-br from-blue-950/20 to-slate-900/40 border-blue-500/20 text-[#E6EEF6]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Dictamen Inteligente (IA NEXO)</span>
              </div>
              {loadingAi && <span className="text-[10px] text-blue-500 animate-pulse font-mono">Analizando red...</span>}
            </div>

            {aiDetails ? (
              <div className="space-y-2 text-xs">
                <div className={`flex items-center justify-between p-2 rounded-lg border ${
                  isLight ? 'bg-white border-blue-100' : 'bg-black/40 border-white/5'
                }`}>
                  <span className="text-slate-500 font-mono">Severidad Vial:</span>
                  <span className="font-mono font-bold text-orange-500 text-sm">
                    {aiDetails.severityScore}/10
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Carriles afectados: </span>
                  <span>{aiDetails.affectedLanes}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Ruta alterna sugerida: </span>
                  <span className="font-medium text-blue-600 dark:text-blue-300">{aiDetails.alternativeRouteAdvice}</span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic">
                Evaluando impacto vial y condiciones perimetrales...
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#05070A] border-white/5'
        }`}>
          <button
            onClick={copyToClipboard}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
            }`}
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Copiado!' : 'Compartir'}</span>
          </button>

          {alert.coords && (
            <button
              onClick={() => {
                onFocusOnMap(alert);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Centrar en Mapa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
