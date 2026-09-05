import React, { useState, useEffect, useMemo } from 'react';
import { AlertItem, RouteOption, RoutePlan, RouteSafetyLevel, ThemeMode } from '../types';
import { MEXICAN_CITIES, routeService } from '../services/routeService';
import { soundManager } from '../services/soundEffects';
import {
  Navigation,
  MapPin,
  Route,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Clock,
  CircleDollarSign,
  Compass,
  ArrowRight,
  Crosshair,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Check,
  Copy,
  Layers,
  X,
  Share2,
  Info,
  Zap,
  ArrowLeftRight,
  TrendingUp,
  Shield,
  CheckCircle2,
  Flame
} from 'lucide-react';

interface RoutePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAlerts: AlertItem[];
  userCoords: [number, number] | null;
  currentRoutePlan: RoutePlan | null;
  onApplyRoute: (plan: RoutePlan, selectedOption: RouteOption) => void;
  onSelectAlert: (alert: AlertItem) => void;
  theme?: ThemeMode;
}

export const RoutePlannerModal: React.FC<RoutePlannerModalProps> = ({
  isOpen,
  onClose,
  activeAlerts,
  userCoords,
  currentRoutePlan,
  onApplyRoute,
  onSelectAlert,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const [originId, setOriginId] = useState<string>('cdmx');
  const [destId, setDestId] = useState<string>('qro');
  const [useGpsOrigin, setUseGpsOrigin] = useState<boolean>(false);
  const [generatedPlan, setGeneratedPlan] = useState<RoutePlan | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null);

  const handleCalculateRoutes = (orig: string, dest: string, gps: boolean) => {
    if (orig === dest && !gps) return;

    let customOriginCoords: [number, number] | undefined;
    let customOriginName: string | undefined;

    if (gps && userCoords) {
      customOriginCoords = userCoords;
      customOriginName = 'Mi Ubicación Actual (GPS)';
    }

    const plan = routeService.generateRoutePlan(
      orig,
      dest,
      activeAlerts,
      customOriginCoords,
      customOriginName
    );

    setGeneratedPlan(plan);
    setSelectedOptionId(plan.selectedOptionId);

    // Check if the initial selected option has high risk and if a cleaner alternative exists
    const initialOption = plan.options.find((o) => o.id === plan.selectedOptionId) || plan.options[0];
    const initialCritical = (initialOption?.incidentBreakdown?.red || 0) + (initialOption?.incidentBreakdown?.security || 0);
    if (initialCritical > 0) {
      const cleanerAlt = plan.options.find(
        (o) => o.id !== initialOption.id && ((o.incidentBreakdown?.red || 0) + (o.incidentBreakdown?.security || 0)) === 0
      );
      if (cleanerAlt) {
        setAutoSwitchNotice(`Alerta: La ruta principal presenta ${initialCritical} evento(s) de alto riesgo. Te sugerimos la ruta alterna "${cleanerAlt.name}".`);
      } else {
        setAutoSwitchNotice(null);
      }
    } else {
      setAutoSwitchNotice(null);
    }
  };

  // Initialize or re-evaluate routes when modal opens or inputs change
  useEffect(() => {
    if (isOpen) {
      if (currentRoutePlan) {
        setGeneratedPlan(currentRoutePlan);
        setSelectedOptionId(currentRoutePlan.selectedOptionId);
      } else {
        handleCalculateRoutes(originId, destId, useGpsOrigin);
      }
    }
  }, [isOpen]);

  const handleQuickCorridor = (orig: string, dest: string) => {
    setOriginId(orig);
    setDestId(dest);
    setUseGpsOrigin(false);
    handleCalculateRoutes(orig, dest, false);
  };

  const activeOption = generatedPlan?.options.find(opt => opt.id === selectedOptionId) || generatedPlan?.options[0];

  // Critical threat evaluation on the currently selected route
  const redIncidents = useMemo(() => {
    return activeOption?.incidentsOnRoute.filter(inc => inc.type === 'red') || [];
  }, [activeOption]);

  const securityIncidents = useMemo(() => {
    return activeOption?.incidentsOnRoute.filter(inc => inc.type === 'security') || [];
  }, [activeOption]);

  const redCount = activeOption?.incidentBreakdown?.red ?? redIncidents.length;
  const securityCount = activeOption?.incidentBreakdown?.security ?? securityIncidents.length;
  const totalCriticalCount = redCount + securityCount;
  const isHighRisk = totalCriticalCount > 0 || activeOption?.safetyLevel === 'critical' || (activeOption?.safetyScore ?? 100) < 65;

  // Search for the best safer alternative among other options
  const saferAlternative = useMemo<RouteOption | null>(() => {
    if (!generatedPlan || !activeOption || !isHighRisk) return null;

    const otherOptions = generatedPlan.options.filter(opt => opt.id !== activeOption.id);
    if (otherOptions.length === 0) return null;

    const sortedAlternatives = [...otherOptions].sort((a, b) => {
      const aCritical = (a.incidentBreakdown?.red || 0) + (a.incidentBreakdown?.security || 0);
      const bCritical = (b.incidentBreakdown?.red || 0) + (b.incidentBreakdown?.security || 0);

      // Prioritize 0 or fewest critical incidents
      if (aCritical !== bCritical) {
        return aCritical - bCritical;
      }
      // Prioritize highest safety score
      if (b.safetyScore !== a.safetyScore) {
        return b.safetyScore - a.safetyScore;
      }
      // Then duration
      return a.durationMinutes - b.durationMinutes;
    });

    const best = sortedAlternatives[0];
    const bestCritical = (best.incidentBreakdown?.red || 0) + (best.incidentBreakdown?.security || 0);

    if (bestCritical < totalCriticalCount || best.safetyScore > (activeOption.safetyScore || 0) + 10) {
      return best;
    }

    return null;
  }, [generatedPlan, activeOption, isHighRisk, totalCriticalCount]);

  const handleApplySaferAlternative = (alt: RouteOption) => {
    setSelectedOptionId(alt.id);
    soundManager.playAlertSound('green');
    setAutoSwitchNotice(`Ruta actualizada a "${alt.name}". Desvío seguro activado.`);
    setTimeout(() => setAutoSwitchNotice(null), 5000);
  };

  const handleConfirmAndDrawRoute = () => {
    if (generatedPlan && activeOption) {
      const updatedPlan = { ...generatedPlan, selectedOptionId: activeOption.id };
      onApplyRoute(updatedPlan, activeOption);
      onClose();
    }
  };

  const handleCopyItinerary = () => {
    if (!generatedPlan || !activeOption) return;

    const safetyLabel =
      activeOption.safetyLevel === 'safe'
        ? '🟢 SEGURO / DESPEJADO'
        : activeOption.safetyLevel === 'caution'
        ? '🟡 PRECAUCIÓN'
        : activeOption.safetyLevel === 'warning'
        ? '🟠 RIESGO MODERADO'
        : '🚨 RIESGO ALTO / BLOQUEO';

    const text = `🛣️ NEXO — REPORTE DE RUTA
━━━━━━━━━━━━━━━━━━━━━━
🚩 Tramo: ${generatedPlan.originName} ➔ ${generatedPlan.destinationName}
🛣️ Vía: ${activeOption.name} (${activeOption.highwayCode})
📏 Distancia: ${activeOption.distanceKm} km (~${Math.floor(activeOption.durationMinutes / 60)}h ${activeOption.durationMinutes % 60}m)
💳 Peaje estimado: $${activeOption.tollCostMxn} MXN
🛡️ Estado de Seguridad: ${safetyLabel} (${activeOption.safetyScore}/100)

📋 RECOMENDACIÓN:
${activeOption.recommendation}

🚨 INCIDENTES ACTIVOS EN EL CORREDOR (${activeOption.incidentsOnRoute.length}):
${
  activeOption.incidentsOnRoute.length === 0
    ? '• Ningún bloqueo o alerta de seguridad detectada en este momento.'
    : activeOption.incidentsOnRoute
        .map(
          (inc, i) =>
            `${i + 1}. [${inc.type.toUpperCase()}] ${inc.title} - ${inc.locationName || 'Km desconocido'}`
        )
        .join('\n')
}

Consultado en NEXO en Vivo.`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  const getSafetyBadge = (level: RouteSafetyLevel, score: number) => {
    switch (level) {
      case 'safe':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-mono text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SEGURO ({score}%)</span>
          </div>
        );
      case 'caution':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 font-mono text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>PRECAUCIÓN ({score}%)</span>
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-500 font-mono text-xs font-bold">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>RIESGO / TRÁFICO ({score}%)</span>
          </div>
        );
      case 'critical':
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-500 font-mono text-xs font-bold animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>BLOQUEO / RIESGO ({score}%)</span>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md bg-black/75 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all ${
          isLight
            ? 'bg-white text-slate-900 border-slate-200'
            : 'bg-[#090E16] text-[#E6EEF6] border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.85)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-[#0C121D]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0 shadow-inner">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Generador de Rutas Seguras e Inteligentes
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 uppercase">
                  IA + Monitoreo Vial
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 font-mono ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Evaluación de riesgos por tramo, detección de bloqueos y recomendación de rutas alternas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar generador de rutas"
            title="Cerrar"
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-slate-200 text-slate-600 border-slate-300'
                : 'hover:bg-white/10 text-slate-400 border-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Origin and Destination Selectors Card */}
          <div
            className={`p-4 rounded-xl border ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-white/5 border-white/5'
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Origin Field */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between font-mono ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Punto de Origen
                  </span>
                  {userCoords && (
                    <button
                      type="button"
                      onClick={() => {
                        const newGps = !useGpsOrigin;
                        setUseGpsOrigin(newGps);
                        handleCalculateRoutes(originId, destId, newGps);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
                        useGpsOrigin
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-500 font-bold'
                          : isLight
                          ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                      <span>{useGpsOrigin ? 'Usando mi GPS' : 'Usar GPS actual'}</span>
                    </button>
                  )}
                </label>

                {useGpsOrigin ? (
                  <div
                    className={`w-full px-3 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                      isLight
                        ? 'bg-blue-50/70 border-blue-200 text-blue-800'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span>Mi Ubicación GPS ({userCoords ? `${userCoords[0].toFixed(3)}, ${userCoords[1].toFixed(3)}` : 'Detectando...'})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUseGpsOrigin(false);
                        handleCalculateRoutes(originId, destId, false);
                      }}
                      className="text-[10px] underline hover:opacity-80 cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <select
                    value={originId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOriginId(val);
                      let newDest = destId;
                      if (val === destId) {
                        const fallbackCity = MEXICAN_CITIES.find((c) => c.id !== val);
                        if (fallbackCity) {
                          newDest = fallbackCity.id;
                          setDestId(newDest);
                        }
                      }
                      handleCalculateRoutes(val, newDest, false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-800'
                        : 'bg-[#06090E] border-white/10 text-white'
                    }`}
                  >
                    {MEXICAN_CITIES.map((city) => (
                      <option key={`orig-${city.id}`} value={city.id}>
                        {city.name} ({city.state})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Destination Field */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-red-500" />
                  Destino
                </label>
                <select
                  value={destId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDestId(val);
                    handleCalculateRoutes(originId, val, useGpsOrigin);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-[#06090E] border-white/10 text-white'
                  }`}
                >
                  {MEXICAN_CITIES.filter((c) => c.id !== originId || useGpsOrigin).map((city) => (
                    <option key={`dest-${city.id}`} value={city.id}>
                      {city.name} ({city.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Corridors Chips */}
            <div className="mt-3.5 pt-3 border-t border-dashed border-white/10 flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[10px] font-mono font-bold mr-1 uppercase ${
                  isLight ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                Rutas Rápidas:
              </span>
              <button
                type="button"
                onClick={() => handleQuickCorridor('cdmx', 'qro')}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                  originId === 'cdmx' && destId === 'qro' && !useGpsOrigin
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                CDMX ➔ Querétaro
              </button>
              <button
                type="button"
                onClick={() => handleQuickCorridor('cdmx', 'aca')}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                  originId === 'cdmx' && destId === 'aca' && !useGpsOrigin
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                CDMX ➔ Acapulco
              </button>
              <button
                type="button"
                onClick={() => handleQuickCorridor('cdmx', 'pue')}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                  originId === 'cdmx' && destId === 'pue' && !useGpsOrigin
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                CDMX ➔ Puebla
              </button>
              <button
                type="button"
                onClick={() => handleQuickCorridor('cdmx', 'gdl')}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                  originId === 'cdmx' && destId === 'gdl' && !useGpsOrigin
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                CDMX ➔ Guadalajara
              </button>
              <button
                type="button"
                onClick={() => handleQuickCorridor('mty', 'sal')}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                  originId === 'mty' && destId === 'sal' && !useGpsOrigin
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                Monterrey ➔ Saltillo
              </button>
              <button
                type="button"
                onClick={() => handleQuickCorridor('gdl', 'pvr')}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                  originId === 'gdl' && destId === 'pvr' && !useGpsOrigin
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                Guadalajara ➔ Vallarta
              </button>
              <button
                type="button"
                onClick={() => handleQuickCorridor('cun', 'mid')}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                  originId === 'cun' && destId === 'mid' && !useGpsOrigin
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                Cancún ➔ Mérida
              </button>
            </div>
          </div>

          {/* Auto-switch or notification toast */}
          {autoSwitchNotice && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
                isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{autoSwitchNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoSwitchNotice(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Route Options Tabs */}
          {generatedPlan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3
                  className={`text-xs font-bold uppercase tracking-wider font-mono ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  Opciones de Trayecto Calculadas ({generatedPlan.options.length})
                </h3>
                <span className="text-[11px] font-mono text-blue-500">
                  Selecciona una opción para inspeccionar
                </span>
              </div>

              {/* Option Selector Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {generatedPlan.options.map((opt) => {
                  const isSelected = opt.id === selectedOptionId;
                  const hasCritical = opt.safetyLevel === 'critical';
                  const isSuggestedSafe = saferAlternative?.id === opt.id;
                  const optRedCount = opt.incidentBreakdown?.red || 0;
                  const optSecCount = opt.incidentBreakdown?.security || 0;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? isLight
                            ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                            : 'bg-blue-600/15 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] ring-1 ring-blue-500/50'
                          : isSuggestedSafe
                          ? isLight
                            ? 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-300'
                            : 'bg-emerald-950/20 hover:bg-emerald-950/30 border-emerald-500/30'
                          : isLight
                          ? 'bg-white hover:bg-slate-50 border-slate-200'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      {/* Badge and Tag */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                isSuggestedSafe
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : opt.isRecommended
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : opt.isAlternative
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              }`}
                            >
                              {isSuggestedSafe ? 'Sugerida Segura' : opt.tag}
                            </span>

                            {optRedCount > 0 && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                ⛔ Bloqueo
                              </span>
                            )}
                            {optSecCount > 0 && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30">
                                🚨 Zona Roja
                              </span>
                            )}
                          </div>
                          {getSafetyBadge(opt.safetyLevel, opt.safetyScore)}
                        </div>

                        <h4 className="font-bold text-sm leading-snug line-clamp-2">
                          {opt.name}
                        </h4>
                        <div
                          className={`text-[11px] font-mono mt-1 ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {opt.highwayCode}
                        </div>
                      </div>

                      {/* Quick Metrics */}
                      <div className="mt-4 pt-3 border-t border-dashed border-white/10 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div
                            className={`text-[10px] font-mono ${
                              isLight ? 'text-slate-400' : 'text-slate-400'
                            }`}
                          >
                            Distancia
                          </div>
                          <div className="text-xs font-bold font-mono mt-0.5">
                            {opt.distanceKm} km
                          </div>
                        </div>
                        <div>
                          <div
                            className={`text-[10px] font-mono ${
                              isLight ? 'text-slate-400' : 'text-slate-400'
                            }`}
                          >
                            Tiempo Est.
                          </div>
                          <div className="text-xs font-bold font-mono mt-0.5">
                            {Math.floor(opt.durationMinutes / 60)}h {opt.durationMinutes % 60}m
                          </div>
                        </div>
                        <div>
                          <div
                            className={`text-[10px] font-mono ${
                              isLight ? 'text-slate-400' : 'text-slate-400'
                            }`}
                          >
                            Peaje
                          </div>
                          <div className="text-xs font-bold font-mono mt-0.5">
                            {opt.tollCostMxn > 0 ? `$${opt.tollCostMxn}` : 'Libre'}
                          </div>
                        </div>
                      </div>

                      {/* Incident Warning Pill */}
                      <div className="mt-3">
                        {opt.incidentsOnRoute.length === 0 ? (
                          <div className="text-[11px] text-emerald-500 flex items-center gap-1 font-semibold">
                            <Check className="w-3 h-3" />
                            <span>0 incidentes en el tramo</span>
                          </div>
                        ) : (
                          <div
                            className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                              hasCritical ? 'text-red-400' : 'text-amber-400'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>
                              {opt.incidentsOnRoute.length} evento(s) detectado(s)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* HIGH-RISK THREAT DETECTION & SAFER ALTERNATIVE SUGGESTION BANNER */}
              {isHighRisk && saferAlternative && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xl relative overflow-hidden ${
                    isLight
                      ? 'bg-gradient-to-br from-red-50 via-amber-50 to-emerald-50/50 border-red-300 text-slate-900 shadow-red-500/10'
                      : 'bg-gradient-to-br from-red-950/40 via-[#160E14] to-emerald-950/20 border-red-500/50 text-white shadow-[0_0_35px_rgba(239,68,68,0.2)]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0 mt-0.5 animate-pulse shadow-inner">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-red-500" />
                            Alerta Táctica: Riesgo Crítico en Trazo Seleccionado
                          </span>
                          {redCount > 0 && (
                            <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30">
                              ⛔ {redCount} Bloqueo(s) 'Red'
                            </span>
                          )}
                          {securityCount > 0 && (
                            <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/15 px-2 py-0.5 rounded border border-pink-500/30">
                              🚨 {securityCount} Zona(s) Roja(s) 'Security'
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                          La ruta actual atraviesa zonas con afectaciones de alto impacto vial o de seguridad a menos de 20 km del trayecto.
                        </p>

                        {/* Suggested Alternative Pill Highlight */}
                        <div
                          className={`mt-2 p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs font-mono ${
                            isLight
                              ? 'bg-white/80 border-emerald-300 text-emerald-950'
                              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="font-bold">
                              Alternativa Sugerida: {saferAlternative.name} ({saferAlternative.highwayCode})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="font-bold text-emerald-400">
                              🛡️ {saferAlternative.safetyScore}% Seguridad (+{saferAlternative.safetyScore - (activeOption?.safetyScore || 0)} pts)
                            </span>
                            <span className="opacity-75">
                              {saferAlternative.distanceKm} km (~{Math.floor(saferAlternative.durationMinutes / 60)}h {saferAlternative.durationMinutes % 60}m)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setShowComparisonModal(true)}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto ${
                          isLight
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                        }`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                        <span>Comparar Detalle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplySaferAlternative(saferAlternative)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Aplicar Desvío Seguro</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Route Deep-Dive Panel */}
              {activeOption && (
                <div
                  className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#080D14] border-white/10'
                  }`}
                >
                  {/* Safety Recommendation Banner */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      activeOption.safetyLevel === 'safe'
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : activeOption.safetyLevel === 'caution'
                        ? isLight
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : isLight
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-red-500/10 border-red-500/30 text-red-200'
                    }`}
                  >
                    {activeOption.safetyLevel === 'safe' ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : activeOption.safetyLevel === 'caution' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold text-xs uppercase tracking-wider font-mono">
                        Evaluación de Seguridad Vial:
                      </div>
                      <p className="text-xs leading-relaxed">{activeOption.recommendation}</p>
                    </div>
                  </div>

                  {/* Incidents on This Route */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2">
                        <span>Incidentes en este Trayecto ({activeOption.incidentsOnRoute.length})</span>
                      </div>
                    </div>

                    {activeOption.incidentsOnRoute.length === 0 ? (
                      <div
                        className={`p-3 rounded-lg border text-center text-xs ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-500'
                            : 'bg-white/5 border-white/5 text-slate-400'
                        }`}
                      >
                        ✅ No se registran cierres totales, retenes irregulares ni zonas de riesgo activo sobre este corredor.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeOption.incidentsOnRoute.map((incident) => {
                          const isSec = incident.type === 'security';
                          const isRed = incident.type === 'red';

                          return (
                            <div
                              key={`route-inc-${incident.id}`}
                              className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                                isSec
                                  ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                                  : isRed
                                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                  : 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 font-bold text-xs">
                                  <span
                                    className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${
                                      isSec
                                        ? 'bg-pink-500/20 text-pink-400'
                                        : isRed
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-orange-500/20 text-orange-400'
                                    }`}
                                  >
                                    {incident.type.toUpperCase()}
                                  </span>
                                  <span>{incident.title}</span>
                                </div>
                                <p className="text-[11px] opacity-90 line-clamp-2">
                                  {incident.description}
                                </p>
                                {incident.locationName && (
                                  <div className="text-[10px] font-mono opacity-75">
                                    📍 {incident.locationName}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onSelectAlert(incident);
                                  onClose();
                                }}
                                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                              >
                                Ver en Mapa
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Corredor Checkpoints / Casetas */}
                  {activeOption.checkpoints.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-dashed border-white/10">
                      <div className="text-xs font-bold font-mono uppercase tracking-wider">
                        Puntos de Control y Casetas en Ruta:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeOption.checkpoints.map((chk, i) => (
                          <div
                            key={chk.id}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                              chk.type === 'toll'
                                ? isLight
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                : isLight
                                ? 'bg-white border-slate-200 text-slate-700'
                                : 'bg-white/5 border-white/10 text-slate-300'
                            }`}
                          >
                            <span className="font-mono text-[9px] opacity-60">#{i + 1}</span>
                            <span className="font-semibold">{chk.name}</span>
                            {chk.note && (
                              <span className="text-[10px] font-mono font-bold text-blue-500">
                                ({chk.note})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side-By-Side Comparison Modal Overlay */}
        {showComparisonModal && saferAlternative && activeOption && (
          <div
            className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-6 backdrop-blur-lg bg-black/80 animate-in fade-in duration-200"
            onClick={() => setShowComparisonModal(false)}
          >
            <div
              className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                isLight
                  ? 'bg-white text-slate-900 border-slate-200'
                  : 'bg-[#090E16] text-white border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.9)]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#0C121D]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold">
                      Comparativa Táctica de Rutas
                    </h3>
                    <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Evaluación de riesgos vs. alternativa recomendada
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowComparisonModal(false)}
                  aria-label="Cerrar comparación de rutas"
                  title="Cerrar"
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isLight ? 'hover:bg-slate-200 text-slate-600 border-slate-300' : 'hover:bg-white/10 text-slate-400 border-white/10'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comparison Matrix Content */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Column 1: Current Selected Route */}
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isLight
                        ? 'bg-red-50/50 border-red-200'
                        : 'bg-red-950/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        Ruta Seleccionada (Actual)
                      </span>
                      {getSafetyBadge(activeOption.safetyLevel, activeOption.safetyScore)}
                    </div>

                    <h4 className="font-bold text-sm">{activeOption.name}</h4>
                    <div className="text-xs font-mono opacity-70">{activeOption.highwayCode}</div>

                    <div className="pt-2 border-t border-dashed border-white/10 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Bloqueos ('Red'):</span>
                        <span className="font-bold text-red-400">{redCount}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Zona Roja ('Security'):</span>
                        <span className="font-bold text-pink-400">{securityCount}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Distancia:</span>
                        <span className="font-bold">{activeOption.distanceKm} km</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Tiempo Estimado:</span>
                        <span className="font-bold">
                          {Math.floor(activeOption.durationMinutes / 60)}h {activeOption.durationMinutes % 60}m
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="opacity-70">Casetas / Peaje:</span>
                        <span className="font-bold">
                          {activeOption.tollCostMxn > 0 ? `$${activeOption.tollCostMxn} MXN` : 'Libre'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Suggested Safer Alternative */}
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isLight
                        ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Alternativa Sugerida
                      </span>
                      {getSafetyBadge(saferAlternative.safetyLevel, saferAlternative.safetyScore)}
                    </div>

                    <h4 className="font-bold text-sm text-emerald-400">{saferAlternative.name}</h4>
                    <div className="text-xs font-mono opacity-70">{saferAlternative.highwayCode}</div>

                    <div className="pt-2 border-t border-dashed border-white/10 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Bloqueos ('Red'):</span>
                        <span className="font-bold text-emerald-400">
                          {saferAlternative.incidentBreakdown?.red || 0}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Zona Roja ('Security'):</span>
                        <span className="font-bold text-emerald-400">
                          {saferAlternative.incidentBreakdown?.security || 0}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Distancia:</span>
                        <span className="font-bold">
                          {saferAlternative.distanceKm} km{' '}
                          <span className="text-[10px] font-mono opacity-75">
                            ({saferAlternative.distanceKm - activeOption.distanceKm >= 0 ? `+${saferAlternative.distanceKm - activeOption.distanceKm}` : `${saferAlternative.distanceKm - activeOption.distanceKm}`} km)
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="opacity-70">Tiempo Estimado:</span>
                        <span className="font-bold">
                          {Math.floor(saferAlternative.durationMinutes / 60)}h {saferAlternative.durationMinutes % 60}m{' '}
                          <span className="text-[10px] font-mono opacity-75">
                            ({saferAlternative.durationMinutes - activeOption.durationMinutes >= 0 ? `+${saferAlternative.durationMinutes - activeOption.durationMinutes}` : `${saferAlternative.durationMinutes - activeOption.durationMinutes}`}m)
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="opacity-70">Casetas / Peaje:</span>
                        <span className="font-bold">
                          {saferAlternative.tollCostMxn > 0 ? `$${saferAlternative.tollCostMxn} MXN` : 'Libre'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span className="font-bold font-mono text-blue-400 uppercase mr-1">
                    Dictamen de Seguridad:
                  </span>
                  {saferAlternative.recommendation}
                </div>
              </div>

              {/* Comparison Footer */}
              <div
                className={`p-4 border-t flex items-center justify-end gap-2 shrink-0 ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#0C121D]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(false)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-semibold opacity-80 hover:opacity-100"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApplySaferAlternative(saferAlternative);
                    setShowComparisonModal(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Seleccionar Ruta Segura</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-[#0C121D]'
          }`}
        >
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyItinerary}
              disabled={!activeOption}
              className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
              <span>{copiedSummary ? '¡Reporte Copiado!' : 'Copiar Itinerario & Alertas'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={!activeOption}
              onClick={handleConfirmAndDrawRoute}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Trazar Ruta en Mapa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
