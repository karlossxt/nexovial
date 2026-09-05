import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertItem, AlertType, DashboardStats, TileLayerType, ThemeMode, RouteOption, RoutePlan } from './types';
import { INITIAL_REALTIME_ALERTS } from './data/initialAlerts';
import { fetchFeed, requestGeolocate, requestClassify, requestClassifyBatch, BatchClassifyResult } from './services/apiClient';
import { soundManager } from './services/soundEffects';
import { notificationService, NotificationPermissionState } from './services/notificationService';
import { MapComponent } from './components/MapComponent';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { AlertDetailModal } from './components/AlertDetailModal';
import { SimulateAlertModal } from './components/SimulateAlertModal';
import { WeatherModal } from './components/WeatherModal';
import { EmergencyDirectoryModal } from './components/EmergencyDirectoryModal';
import { NotificationModal } from './components/NotificationModal';
import { RoutePlannerModal } from './components/RoutePlannerModal';
import { Menu, Bell, Sparkles, CloudRain, PhoneCall, Sun, Moon, BellRing, Route } from 'lucide-react';

// Alert normalization helper for robust semantic deduplication
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics / accents
    .replace(/[^a-z0-9]/g, '')       // keep only alphanumeric
    .trim();
}

function createAlertFingerprint(title: string, desc?: string): string {
  const normTitle = normalizeText(title);
  if (normTitle.length >= 15) {
    return normTitle.substring(0, 80);
  }
  return (normTitle + normalizeText(desc || '')).substring(0, 80);
}

export default function App() {
  // Theme state with localStorage persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('cv_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  const isLight = theme === 'light';

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cv_theme', next);
      return next;
    });
  }, []);

  // Alert collections
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_REALTIME_ALERTS);
  const [history, setHistory] = useState<AlertItem[]>(INITIAL_REALTIME_ALERTS);
  const [ignoredCount, setIgnoredCount] = useState<number>(0);

  // Synchronous deduplication tracking refs
  const processedIdsRef = useRef<Set<string>>(
    new Set(INITIAL_REALTIME_ALERTS.map(a => a.id))
  );
  const seenFingerprintsRef = useRef<Set<string>>(
    new Set(INITIAL_REALTIME_ALERTS.map(a => createAlertFingerprint(a.title, a.description)))
  );

  // Filters and toggles
  const [enabledTypes, setEnabledTypes] = useState<Record<AlertType, boolean>>({
    red: true,
    orange: true,
    green: true,
    security: true
  });
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedRoad, setSelectedRoad] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI States & Modals
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState<boolean>(false);
  const [activeRoutePlan, setActiveRoutePlan] = useState<RoutePlan | null>(null);
  const [activeRouteOption, setActiveRouteOption] = useState<RouteOption | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    notificationService.getPermissionStatus()
  );
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);

  // Apply route selected from the Route Planner Modal
  const handleApplyRoute = useCallback((plan: RoutePlan, option: RouteOption) => {
    setActiveRoutePlan(plan);
    setActiveRouteOption(option);
    soundManager.play('click');
  }, []);

  // Clear active route from map
  const handleClearRoute = useCallback(() => {
    setActiveRoutePlan(null);
    setActiveRouteOption(null);
    soundManager.play('click');
  }, []);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [tileStyle, setTileStyle] = useState<TileLayerType>(isLight ? 'standard' : 'dark');
  const [statusText, setStatusText] = useState<string>('SISTEMA OPERATIVO');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Register notification focus callback
  useEffect(() => {
    notificationService.setSelectAlertCallback((alert) => {
      setSelectedAlert(alert);
      if (alert.coords) {
        setFocusCoords(alert.coords);
      }
    });
  }, []);

  // Keep default tileStyle in sync with theme if user hasn't explicitly switched
  useEffect(() => {
    if (theme === 'light') {
      setTileStyle('standard');
    } else {
      setTileStyle('dark');
    }
  }, [theme]);

  // Live ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-MX', { hour12: false }) + ' CST');
      setCurrentDate(now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // GPS state
  const [followGPS, setFollowGPS] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync mute state with sound controller
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  }, [isMuted]);

  // Handle new incoming alert item with deduplication
  const ingestNewAlert = useCallback(async (
    rawTitle: string,
    rawContent: string,
    feedSource: string,
    pubDate?: string | number,
    explicitId?: string,
    preClassifiedType?: AlertType
  ) => {
    const cleanTitle = (rawTitle || '').trim();
    const cleanDesc = (rawContent || '').trim();
    if (!cleanTitle && !cleanDesc) return;

    // 1. Calculate semantic fingerprint
    const fingerprint = createAlertFingerprint(cleanTitle, cleanDesc);

    // 2. Derive stable content ID (ignoring dynamic timestamp jitter)
    const rawContentKey = `${cleanTitle}|${cleanDesc}|${feedSource}`;
    const id = explicitId || ('alert-' + Math.abs(rawContentKey.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(16));

    // 3. Synchronous deduplication check via Ref Sets
    if (processedIdsRef.current.has(id) || seenFingerprintsRef.current.has(fingerprint)) {
      return;
    }

    // Register immediately in refs to block concurrent duplicate requests
    processedIdsRef.current.add(id);
    seenFingerprintsRef.current.add(fingerprint);

    const fullText = `${cleanTitle} ${cleanDesc}`;
    const detectedType = preClassifiedType || await requestClassify(fullText);
    const geo = await requestGeolocate(fullText);
    const detectedAt = pubDate ? new Date(pubDate).getTime() : Date.now();

    const alertItem: AlertItem = {
      id,
      title: cleanTitle || 'Alerta Vial',
      description: cleanDesc || cleanTitle,
      feedSource: feedSource || 'Feed Red Vial',
      type: detectedType,
      coords: geo.coords,
      locationName: geo.locationName || 'Sin ubicación exacta',
      state: geo.state,
      highway: geo.highway,
      detectedAt: isNaN(detectedAt) ? Date.now() : detectedAt,
      ignored: !geo.coords,
      severityScore: detectedType === 'security' ? 9 : detectedType === 'red' ? 8 : detectedType === 'orange' ? 6 : 2,
      verified: true
    };

    if (!geo.coords) {
      setIgnoredCount(prev => prev + 1);
      setHistory(prev => {
        const filtered = prev.filter(a => a.id !== id && createAlertFingerprint(a.title, a.description) !== fingerprint);
        return [alertItem, ...filtered].slice(0, 5000);
      });
    } else {
      setAlerts(prev => {
        const filtered = prev.filter(a => a.id !== id && createAlertFingerprint(a.title, a.description) !== fingerprint);
        return [alertItem, ...filtered].slice(0, 500);
      });
      setHistory(prev => {
        const filtered = prev.filter(a => a.id !== id && createAlertFingerprint(a.title, a.description) !== fingerprint);
        return [alertItem, ...filtered].slice(0, 5000);
      });

      // Trigger audio notification
      soundManager.playAlertSound(detectedType);

      // Trigger native browser push notification for Security or Blockade alerts
      notificationService.notifyAlert(alertItem, (selected) => {
        setSelectedAlert(selected);
        if (selected.coords) {
          setFocusCoords(selected.coords);
        }
      });
    }
  }, []);

  // Main Feed Polling Loop
  const pollFeed = useCallback(async () => {
    setIsRefreshing(true);
    setStatusText('Sincronizando alertas...');
    try {
      const feedData = await fetchFeed();
      if (feedData.status === 'feed_unavailable') {
        setStatusText('⛔ Feed RSS no disponible: revisa RSS_BUNDLE en Vercel');
      } else if (feedData && Array.isArray(feedData.items)) {
        const items = feedData.items as Record<string, unknown>[];

        // Deduplicar ANTES de llamar a Groq. Así cada ciclo de 30 s no vuelve
        // a gastar cuota clasificando las mismas noticias.
        const candidates = items.map((itemRecord) => {
          const itemId = itemRecord.id ? String(itemRecord.id) : undefined;
          const title = String(itemRecord.title || itemRecord.titlePlain || '');
          const content = String(itemRecord.content || itemRecord.description || itemRecord.summary || '');
          const pub = (itemRecord.pubDate || itemRecord.isoDate || Date.now()) as string | number;
          const source = String(itemRecord.feedSource || itemRecord.source || feedData.title || 'Feed Central');
          const fingerprint = createAlertFingerprint(title.trim(), content.trim());
          return { itemId, title, content, pub, source, fingerprint };
        }).filter((candidate) => {
          if (!candidate.title.trim() && !candidate.content.trim()) return false;
          if (candidate.itemId && processedIdsRef.current.has(candidate.itemId)) return false;
          return !seenFingerprintsRef.current.has(candidate.fingerprint);
        });

        // Procesamos como máximo 10 nuevos items por ciclo para mantener
        // predecible el consumo de Groq y la duración de la función.
        const batchCandidates = candidates.slice(0, 10);
        let batchResults: BatchClassifyResult[] | null = null;
        if (batchCandidates.length > 0) {
          const texts = batchCandidates.map(({ title, content }) =>
            `${title} ${content}`.trim().slice(0, 500)
          );
          batchResults = await requestClassifyBatch(texts);
        }

        for (let idx = 0; idx < batchCandidates.length; idx++) {
          const candidate = batchCandidates[idx];
          const result = batchResults?.find((r) => r.index === idx);

          // Si Groq dice unknown, no se inventa una alerta. Se marca como
          // procesada para evitar reclasificarla cada 30 segundos.
          if (result?.type === 'unknown') {
            if (candidate.itemId) processedIdsRef.current.add(candidate.itemId);
            seenFingerprintsRef.current.add(candidate.fingerprint);
            setIgnoredCount(prev => prev + 1);
            continue;
          }

          const preClassified = result?.type as AlertType | undefined;
          await ingestNewAlert(
            candidate.title,
            candidate.content,
            candidate.source,
            candidate.pub,
            candidate.itemId,
            preClassified
          );
        }
      }
      setStatusText('SISTEMA OPERATIVO');
    } catch (e) {
      console.warn('Feed polling error:', e);
      setStatusText('⚠️ Reintentando conexión');
    } finally {
      setIsRefreshing(false);
    }
  }, [ingestNewAlert]);

  // Start polling interval
  useEffect(() => {
    pollFeed();
    fetchTimerRef.current = setInterval(pollFeed, 30000); // 30s interval
    return () => {
      if (fetchTimerRef.current) clearInterval(fetchTimerRef.current);
    };
  }, [pollFeed]);

  // Real GPS watch position
  const toggleGPS = useCallback(() => {
    if (!followGPS) {
      if (!navigator.geolocation) {
        alert('Geolocalización no soportada por su navegador');
        return;
      }
      setFollowGPS(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn('GPS location permission error:', err);
          setUserCoords(null);
          setFollowGPS(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setFollowGPS(false);
    }
  }, [followGPS]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // 1. Category filter
      if (!enabledTypes[alert.type]) return false;

      // 2. State filter
      if (selectedState !== 'all') {
        const stateMatch = alert.state?.toLowerCase() === selectedState.toLowerCase() ||
                           alert.locationName?.toLowerCase().includes(selectedState.toLowerCase()) ||
                           alert.description?.toLowerCase().includes(selectedState.toLowerCase());
        if (!stateMatch) return false;
      }

      // 3. Road filter
      if (selectedRoad !== 'all') {
        const cleanRoad = selectedRoad.toLowerCase();
        const roadMatch = alert.highway?.toLowerCase().includes(cleanRoad) ||
                          alert.locationName?.toLowerCase().includes(cleanRoad) ||
                          alert.title?.toLowerCase().includes(cleanRoad);
        if (!roadMatch) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchMatch = alert.title.toLowerCase().includes(q) ||
                            alert.description.toLowerCase().includes(q) ||
                            alert.locationName.toLowerCase().includes(q) ||
                            (alert.highway && alert.highway.toLowerCase().includes(q));
        if (!searchMatch) return false;
      }

      return true;
    });
  }, [alerts, enabledTypes, selectedState, selectedRoad, searchQuery]);

  // Compute Dashboard Statistics
  const stats: DashboardStats = useMemo(() => {
    const oneMinAgo = Date.now() - 60000;
    const byType: Record<AlertType, number> = { red: 0, orange: 0, green: 0, security: 0 };

    alerts.forEach(a => {
      if (a.coords && !a.ignored) {
        byType[a.type] = (byType[a.type] || 0) + 1;
      }
    });

    return {
      total: history.filter(h => !h.ignored).length,
      active: alerts.filter(a => a.coords && !a.ignored).length,
      newLastMinute: alerts.filter(a => a.detectedAt >= oneMinAgo && a.coords && !a.ignored).length,
      noLocation: ignoredCount,
      byType
    };
  }, [alerts, history, ignoredCount]);

  // Clear all
  const handleClearAll = useCallback(() => {
    setAlerts([]);
    setHistory([]);
    processedIdsRef.current.clear();
    seenFingerprintsRef.current.clear();
    setIgnoredCount(0);
    setSelectedAlert(null);
  }, []);

  // Download CSV report
  const handleDownloadCSV = useCallback(() => {
    if (!history.length) {
      alert('No hay registros en el historial para exportar.');
      return;
    }

    const csvHeaders = ['Fecha', 'Hora', 'Tipo', 'Fuente', 'Ubicación', 'Título', 'Descripción', '¿Tiene ubicación?'];
    const csvRows = history.map(r => {
      const d = new Date(r.detectedAt);
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        r.type,
        esc(r.feedSource),
        esc(r.locationName),
        esc(r.title),
        esc(r.description),
        r.ignored ? 'No' : 'Sí'
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CentralVialMX_Reporte_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [history]);

  // Add manual simulated alert
  const handleAddManualAlert = useCallback((newAlert: AlertItem) => {
    const fingerprint = createAlertFingerprint(newAlert.title, newAlert.description);
    processedIdsRef.current.add(newAlert.id);
    seenFingerprintsRef.current.add(fingerprint);

    setAlerts(prev => {
      const filtered = prev.filter(a => a.id !== newAlert.id && createAlertFingerprint(a.title, a.description) !== fingerprint);
      return [newAlert, ...filtered];
    });

    setHistory(prev => {
      const filtered = prev.filter(a => a.id !== newAlert.id && createAlertFingerprint(a.title, a.description) !== fingerprint);
      return [newAlert, ...filtered];
    });

    if (newAlert.coords) {
      soundManager.playAlertSound(newAlert.type);
      setSelectedAlert(newAlert);
      notificationService.notifyAlert(newAlert, (selected) => {
        setSelectedAlert(selected);
        if (selected.coords) {
          setFocusCoords(selected.coords);
        }
      });
    } else {
      setIgnoredCount(prev => prev + 1);
    }
  }, []);

  return (
    <div className={`relative w-screen h-screen overflow-hidden flex flex-col font-sans select-none transition-colors ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#05070A] text-[#E6EEF6]'
    }`}>
      {/* Top Header Bar */}
      <header className={`h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between z-[5000] shrink-0 border-b transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#070B10] border-white/5 text-white'
      }`}>
        {/* Brand & Identity */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-base sm:text-lg shadow-[0_0_12px_rgba(6,182,212,0.4)] text-white shrink-0 font-mono">
            N
          </div>
          <div>
            <div className="flex items-center">
              <span className="font-bold text-sm sm:text-base tracking-tight">NEXO</span>
              <span className="text-blue-500 ml-2 text-[9px] uppercase border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
                VIAL
              </span>
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 hidden sm:block font-mono">
              Monitoreo Carretero en Tiempo Real
            </div>
          </div>
        </div>

        {/* Center Live Clock & System Status Indicator (Desktop) */}
        <div className="hidden xl:flex items-center gap-6">
          <div className={`flex items-center gap-2 font-mono text-xs font-medium px-2.5 py-1 rounded-full border ${
            isLight
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-green-500/10 text-green-400 border-green-500/20'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{statusText}</span>
          </div>

          <div className="flex items-center gap-2 text-right font-mono">
            <div className="text-[10px] text-slate-500 uppercase">{currentDate}</div>
            <div className={`h-3 w-px ${isLight ? 'bg-slate-300' : 'bg-white/10'}`}></div>
            <div className="text-xs font-semibold">{currentTime}</div>
          </div>
        </div>

        {/* Header Right Utility Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Route Generator Button */}
          <button
            onClick={() => setIsRouteModalOpen(true)}
            title="Generador de Rutas y Evaluación de Seguridad Vial"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer relative ${
              activeRouteOption
                ? isLight
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : 'bg-blue-600/30 text-blue-300 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                : isLight
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200 shadow-sm'
                : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline font-mono">
              {activeRouteOption ? 'Ruta Activa' : 'Rutas'}
            </span>
            {activeRouteOption && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 animate-pulse"></span>
            )}
          </button>

          {/* Weather Corridor Button */}
          <button
            onClick={() => setIsWeatherModalOpen(true)}
            title="Ver Clima y Condiciones en Tramos Carreteros"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isLight
                ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200 shadow-sm'
                : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden md:inline font-mono">Clima</span>
          </button>

          {/* Emergency Directory Button */}
          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            title="Directorio Telefónico de Emergencias Carreteros"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isLight
                ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200 shadow-sm'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden md:inline font-mono">Emergencias (074)</span>
          </button>

          {/* Native Browser Push Notifications Button */}
          <button
            onClick={() => setIsNotificationModalOpen(true)}
            title={
              notificationPermission === 'granted'
                ? 'Notificaciones Push Nativas Activas (Seguridad y Bloqueos)'
                : 'Configurar Notificaciones Nativas del Navegador'
            }
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer relative ${
              notificationPermission === 'granted'
                ? isLight
                  ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30'
                : isLight
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${notificationPermission === 'granted' ? 'text-blue-500' : 'text-amber-500'}`} />
            <span className="hidden lg:inline font-mono">
              {notificationPermission === 'granted' ? 'Push Activo' : 'Push'}
            </span>
            <span
              className={`w-2 h-2 rounded-full absolute -top-0.5 -right-0.5 ${
                notificationPermission === 'granted' ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'
              }`}
            ></span>
          </button>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
            aria-label={isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-amber-400 border-white/10'
            }`}
          >
            {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Route Generator CTA in Header */}
          <button
            onClick={() => setIsRouteModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md border transition-all active:scale-95 cursor-pointer ${
              activeRouteOption
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40 shadow-blue-500/20'
                : isLight
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/30'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeRouteOption ? 'Ruta Trazada' : 'Rutas Seguras'}</span>
            <span className="sm:hidden">Rutas</span>
          </button>

          {/* Quick Simulation CTA */}
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md border border-blue-400/30 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ingresar Alerta</span>
          </button>

          {/* Left Panel Toggle Button */}
          <button
            id="toggleLeft"
            onClick={() => setLeftPanelOpen(prev => !prev)}
            title={leftPanelOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              leftPanelOpen
                ? isLight
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>

          {/* Right Feed Toggle Button */}
          <button
            onClick={() => setRightPanelOpen(prev => !prev)}
            title={rightPanelOpen ? 'Ocultar feed de alertas' : 'Mostrar feed de alertas'}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              rightPanelOpen
                ? isLight
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                : isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Feed</span>
            {filteredAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1 right-1"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* LEFT CONTROL PANEL */}
        <LeftPanel
          isOpen={leftPanelOpen}
          enabledTypes={enabledTypes}
          onToggleType={(type) => setEnabledTypes(prev => ({ ...prev, [type]: !prev[type] }))}
          selectedState={selectedState}
          onChangeState={setSelectedState}
          selectedRoad={selectedRoad}
          onChangeRoad={setSelectedRoad}
          stats={stats}
          onClearAll={handleClearAll}
          onDownloadCSV={handleDownloadCSV}
          onOpenSimulateModal={() => setIsSimulateModalOpen(true)}
          onOpenWeatherModal={() => setIsWeatherModalOpen(true)}
          onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
          onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
          onOpenRoutePlanner={() => setIsRouteModalOpen(true)}
          activeRouteOption={activeRouteOption}
          hasNotificationPermission={notificationPermission === 'granted'}
          onManualRefresh={pollFeed}
          isRefreshing={isRefreshing}
          statusText={statusText}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap(prev => !prev)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* CENTER INTERACTIVE LEAFLET MAP */}
        <main id="map" className="w-full h-full">
          <MapComponent
            alerts={filteredAlerts}
            selectedAlertId={selectedAlert?.id || null}
            onSelectAlert={setSelectedAlert}
            followGPS={followGPS}
            onToggleGPS={toggleGPS}
            userCoords={userCoords}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap(prev => !prev)}
            tileStyle={tileStyle}
            onChangeTileStyle={setTileStyle}
            theme={theme}
            focusCoords={focusCoords}
            activeRoute={activeRouteOption}
            activeRoutePlan={activeRoutePlan}
            onClearRoute={handleClearRoute}
            onOpenRoutePlanner={() => setIsRouteModalOpen(true)}
          />
        </main>

        {/* RIGHT RECENT ALERTS FEED */}
        <RightPanel
          isOpen={rightPanelOpen}
          alerts={filteredAlerts}
          selectedAlertId={selectedAlert?.id || null}
          onSelectAlert={(a) => setSelectedAlert(a)}
          followGPS={followGPS}
          onToggleGPS={toggleGPS}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          theme={theme}
        />
      </div>

      {/* Bottom Status Footer */}
      <footer className={`h-9 sm:h-10 px-4 sm:px-6 flex items-center justify-between text-[10px] z-[5000] shrink-0 font-mono border-t transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#070B10] border-white/5 text-slate-400'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span>FEED: <strong className="font-semibold text-blue-600 dark:text-blue-400">RSS ACTIVO</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${followGPS ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>GPS: <strong className="font-semibold">{followGPS ? 'EN SEGUIMIENTO' : 'STANDBY'}</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>MONITOR: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">ONLINE</strong></span>
          </div>
          <div className="hidden lg:inline text-slate-400">
            PROCESADAS: <span className="text-blue-500 font-bold">{history.length}</span>
          </div>
        </div>

        <div className="text-slate-400 text-right truncate">
          <span className="hidden sm:inline">NEXO · </span>
          <span>MONITOREO CARRETERO EN VIVO</span>
        </div>
      </footer>

      {/* Alert Detail Inspection Modal */}
      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onFocusOnMap={(a) => {
          setSelectedAlert(a);
          if (a.coords) setFocusCoords(a.coords);
        }}
        theme={theme}
      />

      {/* Simulate / Manual Alert Injection Modal */}
      <SimulateAlertModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onAddAlert={handleAddManualAlert}
        theme={theme}
      />

      {/* Highway Weather Modal */}
      <WeatherModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        onSelectCorridor={(coords) => {
          setFocusCoords(coords);
          setIsWeatherModalOpen(false);
        }}
        theme={theme}
      />

      {/* Emergency Directory Modal */}
      <EmergencyDirectoryModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        theme={theme}
      />

      {/* Native Browser Push Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => {
          setIsNotificationModalOpen(false);
          setNotificationPermission(notificationService.getPermissionStatus());
        }}
        theme={theme}
      />

      {/* Highway Route Generator and Safety Evaluator Modal */}
      <RoutePlannerModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        activeAlerts={alerts}
        userCoords={userCoords}
        currentRoutePlan={activeRoutePlan}
        onApplyRoute={handleApplyRoute}
        onSelectAlert={(alert) => {
          setSelectedAlert(alert);
          if (alert.coords) {
            setFocusCoords(alert.coords);
          }
        }}
        theme={theme}
      />
    </div>
  );
}
