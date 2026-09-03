import React from 'react';
import { AlertItem, AlertType, ThemeMode } from '../types';
import { Crosshair, Search, MapPin, ShieldAlert } from 'lucide-react';

interface RightPanelProps {
  isOpen: boolean;
  alerts: AlertItem[];
  selectedAlertId: string | null;
  onSelectAlert: (alert: AlertItem) => void;
  followGPS: boolean;
  onToggleGPS: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme?: ThemeMode;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  alerts,
  selectedAlertId,
  onSelectAlert,
  followGPS,
  onToggleGPS,
  searchQuery,
  onSearchChange,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const getBorderColor = (type: AlertType) => {
    if (isLight) {
      switch (type) {
        case 'red': return 'border-l-red-600 bg-white hover:bg-slate-50 border-slate-200 shadow-sm';
        case 'orange': return 'border-l-orange-500 bg-white hover:bg-slate-50 border-slate-200 shadow-sm';
        case 'green': return 'border-l-emerald-600 bg-white hover:bg-slate-50 border-slate-200 shadow-sm';
        case 'security': return 'border-l-pink-600 bg-white hover:bg-slate-50 border-slate-200 shadow-sm';
        default: return 'border-l-slate-400 bg-white border-slate-200';
      }
    } else {
      switch (type) {
        case 'red': return 'border-l-red-500 bg-[#0F151F] hover:bg-[#151e2c] border-white/5';
        case 'orange': return 'border-l-orange-400 bg-[#0F151F] hover:bg-[#151e2c] border-white/5';
        case 'green': return 'border-l-green-500 bg-[#0F151F] hover:bg-[#151e2c] border-white/5';
        case 'security': return 'border-l-pink-500 bg-[#0F151F] hover:bg-[#151e2c] border-white/5';
        default: return 'border-l-slate-600 bg-[#0F151F] border-white/5';
      }
    }
  };

  const getTypeLabel = (type: AlertType) => {
    switch (type) {
      case 'red': return <span className="text-[10px] font-bold text-red-500 uppercase font-mono">Bloqueo Crítico</span>;
      case 'orange': return <span className="text-[10px] font-bold text-orange-500 uppercase font-mono">Incidente Mayor</span>;
      case 'green': return <span className="text-[10px] font-bold text-emerald-600 uppercase font-mono">Vía Libre</span>;
      case 'security': return <span className="text-[10px] font-bold text-pink-600 uppercase font-mono">Seguridad / Zona Roja</span>;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <aside
      id="rightPanel"
      className={`fixed lg:absolute top-0 right-0 bottom-0 w-[290px] sm:w-[320px] p-4 flex flex-col z-[6000] border-l shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out ${
        isLight
          ? 'bg-white/95 text-slate-800 border-slate-200'
          : 'bg-[#070B10]/95 text-[#E6EEF6] border-white/5 shadow-[-10px_0_30px_rgba(0,0,0,0.8)]'
      } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between pb-3.5 border-b mb-3 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
        <h2 className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Feed en Tiempo Real
        </h2>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
          isLight ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        }`}>
          {alerts.length} ALERTAS
        </span>
      </div>

      {/* Search Filter */}
      <div className="relative mb-3">
        <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar km, carretera, ciudad..."
          className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs transition-colors focus:outline-none focus:border-blue-500 ${
            isLight
              ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400'
              : 'bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-500'
          }`}
        />
      </div>

      {/* List Feed */}
      <div id="alertsListRight" className="flex-1 overflow-y-auto pr-1 space-y-2.5">
        {alerts.length === 0 ? (
          <div className="text-center py-16 px-3 text-slate-400 text-xs">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="font-mono text-[11px]">Sin alertas coincidentes con los filtros activos</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isSelected = alert.id === selectedAlertId;
            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`p-3 rounded-r-lg border-l-4 border-y border-r cursor-pointer transition-all active:scale-[0.98] ${getBorderColor(
                  alert.type
                )} ${
                  isSelected
                    ? isLight
                      ? 'ring-2 ring-blue-500 shadow-md'
                      : 'ring-2 ring-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  {getTypeLabel(alert.type)}
                  <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {formatTimeAgo(alert.detectedAt)}
                  </span>
                </div>

                <h3 className={`font-bold text-xs leading-snug mb-1 line-clamp-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {alert.title}
                </h3>

                <p className={`text-[10px] line-clamp-2 leading-relaxed mb-2 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  {alert.description}
                </p>

                <div className={`flex flex-wrap items-center gap-1.5 pt-1.5 border-t ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono truncate max-w-[150px] border ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-slate-300'
                  }`}>
                    <MapPin className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                    <span className="truncate">{alert.locationName || 'Sin ubicación'}</span>
                  </div>
                  {alert.state && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-slate-400'
                    }`}>
                      {alert.state}
                    </span>
                  )}
                  {alert.kilometer && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      isLight ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white/5 border-white/10 text-blue-400'
                    }`}>
                      km {alert.kilometer}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom GPS Toggle */}
      <div className={`pt-3 border-t mt-2 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
        <button
          id="gpsToggle"
          type="button"
          onClick={onToggleGPS}
          className={`w-full py-2 px-3 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
            followGPS
              ? 'bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-300 shadow-sm'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
          }`}
        >
          <Crosshair className={`w-3.5 h-3.5 ${followGPS ? 'text-blue-500 animate-spin' : 'text-slate-400'}`} />
          <span>SEGUIMIENTO GPS: {followGPS ? 'ACTIVO' : 'EN ESPERA'}</span>
        </button>
      </div>
    </aside>
  );
};
