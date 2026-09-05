import React from 'react';
import { AlertType, DashboardStats, ThemeMode, RouteOption } from '../types';
import { Volume2, VolumeX, Download, Trash2, PlusCircle, RefreshCw, Layers, CloudRain, PhoneCall, Sun, Moon, BellRing, Route } from 'lucide-react';

interface LeftPanelProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
  enabledTypes: Record<AlertType, boolean>;
  onToggleType: (type: AlertType) => void;
  selectedState: string;
  onChangeState: (state: string) => void;
  selectedRoad: string;
  onChangeRoad: (road: string) => void;
  stats: DashboardStats;
  onClearAll: () => void;
  onDownloadCSV: () => void;
  onOpenSimulateModal: () => void;
  onOpenWeatherModal?: () => void;
  onOpenEmergencyModal?: () => void;
  onOpenNotificationModal?: () => void;
  onOpenRoutePlanner?: () => void;
  activeRouteOption?: RouteOption | null;
  hasNotificationPermission?: boolean;
  onManualRefresh: () => void;
  isRefreshing: boolean;
  statusText: string;
  isMuted: boolean;
  onToggleMute: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isOpen,
  enabledTypes,
  onToggleType,
  selectedState,
  onChangeState,
  selectedRoad,
  onChangeRoad,
  stats,
  onClearAll,
  onDownloadCSV,
  onOpenSimulateModal,
  onOpenWeatherModal,
  onOpenEmergencyModal,
  onOpenNotificationModal,
  onOpenRoutePlanner,
  activeRouteOption,
  hasNotificationPermission = false,
  onManualRefresh,
  isRefreshing,
  statusText,
  isMuted,
  onToggleMute,
  showHeatmap,
  onToggleHeatmap,
  theme = 'dark',
  onToggleTheme
}) => {
  const isLight = theme === 'light';

  const statesList = [
    'all',
    'CDMX',
    'EdoMex',
    'Jalisco',
    'Nuevo León',
    'Puebla',
    'Guanajuato',
    'Querétaro',
    'San Luis Potosí',
    'Hidalgo',
    'Veracruz',
    'Chiapas',
    'Morelos',
    'Michoacán',
    'Sonora',
    'Sinaloa',
    'Guerrero',
    'Tamaulipas'
  ];

  const roadsList = [
    'all',
    'México–Toluca',
    'México–Querétaro',
    'México–Pachuca',
    'Arco Norte',
    'Autopista del Sol',
    'México–Cuernavaca',
    'México–Puebla',
    'México–Veracruz',
    'Guadalajara–Tepic',
    'Monterrey–Laredo',
    'Carretera 57'
  ];

  return (
    <aside
      id="leftPanel"
      className={`fixed lg:absolute top-0 left-0 bottom-0 w-[290px] sm:w-[310px] lg:w-[320px] p-4 flex flex-col z-[6000] border-r shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out overflow-y-auto ${
        isLight
          ? 'bg-white/95 text-slate-800 border-slate-200'
          : 'bg-[#070B10]/95 text-[#E6EEF6] border-white/5 shadow-[10px_0_30px_rgba(0,0,0,0.8)]'
      } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Header Brand */}
      <div className={`flex items-center gap-3 pb-3.5 border-b mb-3.5 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0 font-mono">
          N
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <h1 className={`text-base font-bold tracking-tight leading-none truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              NEXO
            </h1>
            <span className={`ml-2 text-[9px] uppercase border px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${isLight ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'}`}>
              VIAL
            </span>
          </div>
          <p className={`text-[9px] uppercase tracking-widest mt-1 font-mono truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            MONITOREO CARRETERO EN TIEMPO REAL
          </p>
        </div>
      </div>

      {/* Primary Utility Shortcuts: Clima, Emergencias & Tema */}
      <section className="mb-4">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {onOpenWeatherModal && (
            <button
              type="button"
              onClick={onOpenWeatherModal}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isLight
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200 shadow-sm'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
              }`}
            >
              <CloudRain className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="text-left">
                <div className="font-bold text-[11px] leading-none">Clima Vial</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">Corredores</div>
              </div>
            </button>
          )}

          {onOpenEmergencyModal && (
            <button
              type="button"
              onClick={onOpenEmergencyModal}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isLight
                  ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200 shadow-sm'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-red-500 shrink-0" />
              <div className="text-left">
                <div className="font-bold text-[11px] leading-none">Emergencias</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">074 / 911 / 078</div>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Estado Global (Statistics Cards) */}
      <section className="mb-4">
        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Estado Global
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <p id="totalCount" className="text-2xl font-bold text-blue-500 font-mono leading-none mb-1">
              {stats.total}
            </p>
            <p className={`text-[10px] uppercase tracking-wider font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Alertas Totales</p>
          </div>
          <div className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <p id="activeCount" className="text-2xl font-bold text-red-500 font-mono leading-none mb-1">
              {stats.byType.red}
            </p>
            <p className={`text-[10px] uppercase tracking-wider font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Bloqueos</p>
          </div>
          <div className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <p id="newCount" className="text-2xl font-bold text-orange-500 font-mono leading-none mb-1">
              {stats.active}
            </p>
            <p className={`text-[10px] uppercase tracking-wider font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Activas en Mapa</p>
          </div>
          <div className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <p id="noLocCount" className="text-2xl font-bold text-slate-400 font-mono leading-none mb-1">
              {stats.noLocation}
            </p>
            <p className={`text-[10px] uppercase tracking-wider font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Sin Ubicación</p>
          </div>
        </div>
      </section>

      {/* Filtros de Red (Category Switches) */}
      <section className="mb-4">
        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Filtros de Red
        </h3>
        <div className="space-y-2" role="toolbar" aria-label="Filtros de Red">
          {/* Bloqueos Totales */}
          <button
            id="btn-red"
            type="button"
            onClick={() => onToggleType('red')}
            className={`w-full flex items-center justify-between p-2 rounded transition-all active:scale-[0.98] ${
              enabledTypes.red
                ? isLight
                  ? 'bg-red-50 border border-red-200 text-red-900'
                  : 'bg-red-500/10 border border-red-500/20 text-red-100'
                : isLight
                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60'
                : 'bg-white/5 border border-white/5 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${enabledTypes.red ? 'bg-red-500 shadow-sm' : 'bg-slate-400'}`}></span>
              <span className="text-xs font-medium">Bloqueos Totales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-red-500 font-bold">{stats.byType.red}</span>
              <div
                className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${
                  enabledTypes.red ? 'bg-red-500 justify-end' : isLight ? 'bg-slate-300 justify-start' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </button>

          {/* Incidentes Mayores */}
          <button
            id="btn-orange"
            type="button"
            onClick={() => onToggleType('orange')}
            className={`w-full flex items-center justify-between p-2 rounded transition-all active:scale-[0.98] ${
              enabledTypes.orange
                ? isLight
                  ? 'bg-orange-50 border border-orange-200 text-orange-900'
                  : 'bg-orange-500/10 border border-orange-500/20 text-orange-100'
                : isLight
                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60'
                : 'bg-white/5 border border-white/5 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${enabledTypes.orange ? 'bg-orange-500 shadow-sm' : 'bg-slate-400'}`}></span>
              <span className="text-xs font-medium">Incidentes Mayores</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-orange-500 font-bold">{stats.byType.orange}</span>
              <div
                className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${
                  enabledTypes.orange ? 'bg-orange-500 justify-end' : isLight ? 'bg-slate-300 justify-start' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </button>

          {/* Vía Libre */}
          <button
            id="btn-green"
            type="button"
            onClick={() => onToggleType('green')}
            className={`w-full flex items-center justify-between p-2 rounded transition-all active:scale-[0.98] ${
              enabledTypes.green
                ? isLight
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-green-500/10 border border-green-500/20 text-green-100'
                : isLight
                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60'
                : 'bg-white/5 border border-white/5 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${enabledTypes.green ? 'bg-emerald-500 shadow-sm' : 'bg-slate-400'}`}></span>
              <span className="text-xs font-medium">Vía Libre</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-600 font-bold">{stats.byType.green}</span>
              <div
                className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${
                  enabledTypes.green ? 'bg-emerald-500 justify-end' : isLight ? 'bg-slate-300 justify-start' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </button>

          {/* Zonas Rojas (Seguridad) */}
          <button
            id="btn-security"
            type="button"
            onClick={() => onToggleType('security')}
            className={`w-full flex items-center justify-between p-2 rounded transition-all active:scale-[0.98] ${
              enabledTypes.security
                ? isLight
                  ? 'bg-pink-50 border border-pink-200 text-pink-900'
                  : 'bg-pink-500/10 border border-pink-500/20 text-pink-100'
                : isLight
                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60'
                : 'bg-white/5 border border-white/5 text-slate-400 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${enabledTypes.security ? 'bg-pink-500 shadow-sm animate-pulse' : 'bg-slate-400'}`}></span>
              <span className="text-xs font-medium">Zonas Rojas (Seguridad)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-pink-600 font-bold">{stats.byType.security}</span>
              <div
                className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${
                  enabledTypes.security ? 'bg-pink-500 justify-end' : isLight ? 'bg-slate-300 justify-start' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Jurisdicciones y Rutas */}
      <section className="mb-4">
        <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Jurisdicciones & Rutas
        </h3>
        <div className="space-y-2">
          <div>
            <label htmlFor="stateFilter" className={`block text-[9px] font-mono uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Estado Federal
            </label>
            <select
              id="stateFilter"
              value={selectedState}
              onChange={(e) => onChangeState(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors ${
                isLight
                  ? 'bg-slate-50 border border-slate-300 text-slate-900'
                  : 'bg-white/5 border border-white/10 text-slate-200'
              }`}
            >
              <option value="all" className={isLight ? 'bg-white text-slate-900' : 'bg-[#070B10] text-slate-200'}>Todos los estados</option>
              {statesList.filter(s => s !== 'all').map((st) => (
                <option key={st} value={st} className={isLight ? 'bg-white text-slate-900' : 'bg-[#070B10] text-slate-200'}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="roadFilter" className={`block text-[9px] font-mono uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Carretera / Autopista
            </label>
            <select
              id="roadFilter"
              value={selectedRoad}
              onChange={(e) => onChangeRoad(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors ${
                isLight
                  ? 'bg-slate-50 border border-slate-300 text-slate-900'
                  : 'bg-white/5 border border-white/10 text-slate-200'
              }`}
            >
              <option value="all" className={isLight ? 'bg-white text-slate-900' : 'bg-[#070B10] text-slate-200'}>Todas las carreteras</option>
              {roadsList.filter(r => r !== 'all').map((rd) => (
                <option key={rd} value={rd} className={isLight ? 'bg-white text-slate-900' : 'bg-[#070B10] text-slate-200'}>{rd}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Action CTA and Tools */}
      <div className="flex flex-col gap-2 mb-3.5">
        {onOpenRoutePlanner && (
          <button
            type="button"
            onClick={onOpenRoutePlanner}
            className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-between shadow-md border transition-all active:scale-95 cursor-pointer ${
              activeRouteOption
                ? isLight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-blue-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40 shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                : isLight
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-400" />
              <span>Generador de Rutas</span>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                activeRouteOption
                  ? 'bg-white/20 text-white'
                  : isLight
                  ? 'bg-blue-200/60 text-blue-800'
                  : 'bg-blue-500/30 text-blue-300'
              }`}
            >
              {activeRouteOption ? 'TRAZADA' : 'EVALUAR'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSimulateModal}
          className="w-full py-2.5 px-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center gap-2 border border-blue-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ingresar Alerta / Probar IA</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            id="downloadHistory"
            type="button"
            onClick={onDownloadCSV}
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Descargar CSV</span>
          </button>
          <button
            id="clearAll"
            type="button"
            onClick={onClearAll}
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300'
                : 'bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Audio, Heatmap, Push Notifications and Tools */}
      <div className="flex flex-col gap-2 pb-3 mb-auto">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isMuted
                ? isLight ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-white/5 text-slate-400 border-white/5'
                : isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-blue-500" />}
            <span className="font-mono text-[11px]">{isMuted ? 'Mudo' : 'Audio ON'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleHeatmap}
            className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              showHeatmap
                ? isLight ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                : isLight ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-white/5 text-slate-400 border-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-mono text-[11px]">{showHeatmap ? 'Calor ON' : 'Calor OFF'}</span>
          </button>
        </div>

        {onOpenNotificationModal && (
          <button
            type="button"
            onClick={onOpenNotificationModal}
            className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
              hasNotificationPermission
                ? isLight
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30'
                : isLight
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <BellRing className={`w-3.5 h-3.5 ${hasNotificationPermission ? 'text-blue-500' : 'text-amber-500'}`} />
              <span className="text-[11px]">Notificaciones Push</span>
            </div>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              hasNotificationPermission
                ? isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-300'
                : isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {hasNotificationPermission ? 'ACTIVAS' : 'CONFIGURAR'}
            </span>
          </button>
        )}
      </div>

      {/* Panel Footer / Connection Status */}
      <div className={`pt-3 border-t flex items-center justify-between text-xs mt-2 ${
        isLight ? 'border-slate-200 text-slate-500' : 'border-white/5 text-slate-400'
      }`}>
        <div className="flex items-center gap-2 truncate">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="truncate text-[10px] font-mono">
            {statusText}
          </span>
        </div>

        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isRefreshing}
          title="Actualizar Feed RSS ahora"
          className={`p-1.5 rounded transition-colors disabled:opacity-50 cursor-pointer ${
            isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
        </button>
      </div>
    </aside>
  );
};
