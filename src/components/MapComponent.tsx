import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertItem, AlertType, TileLayerType, ThemeMode, RouteOption, RoutePlan } from '../types';
import { Layers, Compass, Crosshair, ZoomIn, ZoomOut, Flame, Route, X, ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon } from 'lucide-react';

interface MapComponentProps {
  alerts: AlertItem[];
  selectedAlertId: string | null;
  onSelectAlert: (alert: AlertItem) => void;
  followGPS: boolean;
  onToggleGPS: () => void;
  userCoords: [number, number] | null;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  tileStyle: TileLayerType;
  onChangeTileStyle: (style: TileLayerType) => void;
  theme?: ThemeMode;
  focusCoords?: [number, number] | null;
  activeRoute?: RouteOption | null;
  activeRoutePlan?: RoutePlan | null;
  onClearRoute?: () => void;
  onOpenRoutePlanner?: () => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  followGPS,
  onToggleGPS,
  userCoords,
  showHeatmap,
  onToggleHeatmap,
  tileStyle,
  onChangeTileStyle,
  theme = 'dark',
  focusCoords,
  activeRoute,
  activeRoutePlan,
  onClearRoute,
  onOpenRoutePlanner
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const gpsMarkerRef = useRef<L.CircleMarker | null>(null);
  const gpsHaloRef = useRef<L.Circle | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const isLight = theme === 'light';

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.8, -101.5],
      zoom: 6,
      zoomControl: false
    });

    // Base Tile Layer
    const getTileUrl = (style: TileLayerType) => {
      if (style === 'dark') {
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      } else if (style === 'satellite') {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      }
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    };

    const getAttribution = (style: TileLayerType) => {
      if (style === 'dark') {
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
      } else if (style === 'satellite') {
        return 'Imagery &copy; Esri, Maxar, Earthstar Geographics';
      }
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    };

    const tileLayer = L.tileLayer(getTileUrl(tileStyle), {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: getAttribution(tileStyle)
    }).addTo(map);

    baseTileLayerRef.current = tileLayer;

    // Layer groups for markers, routes & heat overlays
    const routesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    const heatGroup = L.layerGroup().addTo(map);

    routesLayerGroupRef.current = routesGroup;
    markersLayerGroupRef.current = markersGroup;
    heatmapLayerGroupRef.current = heatGroup;
    mapInstanceRef.current = map;

    // Resize observer to keep map centered and fluid
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base tile when tileStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current) return;

    let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    if (tileStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (tileStyle === 'standard') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    baseTileLayerRef.current.setUrl(url);
  }, [tileStyle]);

  // Handle external focusCoords (e.g., from Weather Corridor selection)
  useEffect(() => {
    if (!mapInstanceRef.current || !focusCoords) return;
    mapInstanceRef.current.flyTo(focusCoords, 11, { duration: 1.2 });
  }, [focusCoords]);

  // Render Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerGroupRef.current;
    const heatGroup = heatmapLayerGroupRef.current;
    if (!map || !markersGroup || !heatGroup) return;

    markersGroup.clearLayers();
    heatGroup.clearLayers();

    const validAlerts = alerts.filter(a => a.coords && !a.ignored);

    validAlerts.forEach(alert => {
      if (!alert.coords) return;
      const [lat, lon] = alert.coords;

      // Color mapping
      const colorMap: Record<AlertType, { border: string; bg: string; shadow: string; label: string; text: string }> = {
        red: { border: '#ef4444', bg: '#dc2626', shadow: 'rgba(239, 68, 68, 0.6)', label: 'BLOQUEO', text: '#fca5a5' },
        orange: { border: '#f97316', bg: '#ea580c', shadow: 'rgba(249, 115, 22, 0.6)', label: 'INCIDENTE', text: '#fdba74' },
        green: { border: '#22c55e', bg: '#16a34a', shadow: 'rgba(34, 197, 94, 0.6)', label: 'VÍA LIBRE', text: '#86efac' },
        security: { border: '#f43f5e', bg: '#e11d48', shadow: 'rgba(244, 63, 94, 0.7)', label: 'ZONA ROJA', text: '#fda4af' }
      };

      const c = colorMap[alert.type] || colorMap.orange;
      const isSelected = alert.id === selectedAlertId;

      // Custom DivIcon for pulsating highway markers
      const customIcon = L.divIcon({
        className: 'custom-traffic-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group" style="width: 32px; height: 32px;">
            ${isSelected ? `<div class="absolute inset-0 rounded-full animate-ping" style="background: ${c.border}; opacity: 0.6;"></div>` : ''}
            <div class="absolute inset-0 rounded-full" style="background: radial-gradient(circle, ${c.shadow} 0%, transparent 70%); transform: scale(${isSelected ? 1.8 : 1.3});"></div>
            <div class="relative w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-transform transform ${isSelected ? 'scale-125 ring-4 ring-white/50' : 'group-hover:scale-115'}" style="background-color: ${c.bg};">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([lat, lon], { icon: customIcon });

      // Interactive Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 text-xs text-slate-900 dark:text-slate-100 min-w-[220px] max-w-[280px] select-text';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase" style="background-color: ${c.bg}; color: #fff;">
            ${c.label}
          </span>
          <span class="text-[10px] text-slate-500 font-mono">${new Date(alert.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="font-bold text-[13px] leading-tight mb-1">${escapeXml(alert.title)}</div>
        <div class="text-[11px] text-slate-600 dark:text-slate-300 mb-2 leading-relaxed line-clamp-2">${escapeXml(alert.description)}</div>
        <div class="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[10px]">
          <span class="truncate max-w-[130px] font-medium text-slate-600 dark:text-slate-300">📍 ${escapeXml(alert.locationName)}</span>
          <button id="popup-btn-${alert.id}" class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors">
            Detalles
          </button>
        </div>
      `;

      popupContent.querySelector(`#popup-btn-${alert.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectAlert(alert);
      });

      marker.bindPopup(popupContent, { closeButton: false });
      marker.on('click', () => {
        onSelectAlert(alert);
      });

      markersGroup.addLayer(marker);

      // Heatmap density representation with glowing circle halos if enabled
      if (showHeatmap) {
        const radiusMap: Record<AlertType, number> = {
          red: 25000,
          security: 28000,
          orange: 18000,
          green: 14000
        };
        const heatCircle = L.circle([lat, lon], {
          radius: radiusMap[alert.type],
          color: c.border,
          fillColor: c.bg,
          fillOpacity: 0.18,
          weight: 1.2
        });
        heatGroup.addLayer(heatCircle);
      }
    });

    // Auto center if selected alert changes
    if (selectedAlertId) {
      const selected = validAlerts.find(a => a.id === selectedAlertId);
      if (selected && selected.coords) {
        map.flyTo(selected.coords, 12, { duration: 1.2 });
      }
    }
  }, [alerts, selectedAlertId, showHeatmap, onSelectAlert]);

  // Render Routes (Active Route & Alternative Variants)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routesGroup = routesLayerGroupRef.current;
    if (!map || !routesGroup) return;

    routesGroup.clearLayers();

    if (!activeRoute || !activeRoute.waypoints || activeRoute.waypoints.length === 0) {
      return;
    }

    // 1. Draw other alternative route options in dashed subtle styling
    if (activeRoutePlan && activeRoutePlan.options) {
      activeRoutePlan.options.forEach((opt) => {
        if (opt.id === activeRoute.id || !opt.waypoints || opt.waypoints.length < 2) return;

        // Alternative route line (dashed)
        const altPolyline = L.polyline(opt.waypoints, {
          color: '#8b5cf6',
          weight: 4,
          opacity: 0.7,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        });

        altPolyline.bindPopup(`
          <div class="p-2 font-mono text-xs">
            <div class="font-bold text-purple-400">⚡ RUTA ALTERNA: ${escapeXml(opt.name)}</div>
            <div class="text-slate-300 mt-1">${opt.distanceKm} km · ~${Math.floor(opt.durationMinutes / 60)}h ${opt.durationMinutes % 60}m</div>
            <div class="mt-1 text-[11px] text-slate-400">${escapeXml(opt.summary)}</div>
          </div>
        `);

        routesGroup.addLayer(altPolyline);
      });
    }

    // 2. Determine color palette for the selected/active route based on safety level
    let routeColor = '#10b981'; // safe emerald
    let casingColor = '#065f46';
    let haloColor = 'rgba(16, 185, 129, 0.35)';

    if (activeRoute.safetyLevel === 'critical') {
      if (activeRoute.incidentBreakdown.security > 0) {
        routeColor = '#f43f5e'; // security rose
        casingColor = '#881337';
        haloColor = 'rgba(244, 63, 94, 0.4)';
      } else {
        routeColor = '#ef4444'; // red blockade
        casingColor = '#7f1d1d';
        haloColor = 'rgba(239, 68, 68, 0.4)';
      }
    } else if (activeRoute.safetyLevel === 'warning') {
      routeColor = '#f97316'; // orange warning
      casingColor = '#7c2d12';
      haloColor = 'rgba(249, 115, 22, 0.35)';
    } else if (activeRoute.safetyLevel === 'caution') {
      routeColor = '#f59e0b'; // amber caution
      casingColor = '#78350f';
      haloColor = 'rgba(245, 158, 11, 0.35)';
    }

    // Background wide glowing casing
    const glowPolyline = L.polyline(activeRoute.waypoints, {
      color: haloColor,
      weight: 14,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round'
    });
    routesGroup.addLayer(glowPolyline);

    // Dark casing outline
    const casingPolyline = L.polyline(activeRoute.waypoints, {
      color: '#000000',
      weight: 7,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round'
    });
    routesGroup.addLayer(casingPolyline);

    // Core colored route line
    const mainPolyline = L.polyline(activeRoute.waypoints, {
      color: routeColor,
      weight: 4.5,
      opacity: 0.98,
      lineCap: 'round',
      lineJoin: 'round'
    });

    mainPolyline.bindPopup(`
      <div class="p-2.5 font-mono text-xs max-w-xs">
        <div class="font-bold text-sm text-white">${escapeXml(activeRoute.name)}</div>
        <div class="text-xs text-blue-400 mt-0.5">${escapeXml(activeRoute.highwayCode)} · ${activeRoute.distanceKm} km · ~${Math.floor(activeRoute.durationMinutes / 60)}h ${activeRoute.durationMinutes % 60}m</div>
        <div class="mt-2 text-[11px] text-slate-300 leading-relaxed">${escapeXml(activeRoute.recommendation)}</div>
      </div>
    `);

    routesGroup.addLayer(mainPolyline);

    // 3. Render Origin and Destination Flag Markers
    const originCoord = activeRoute.waypoints[0];
    const destCoord = activeRoute.waypoints[activeRoute.waypoints.length - 1];

    // Origin Marker (Green Pin / Letter A)
    const originIcon = L.divIcon({
      className: 'route-origin-pin',
      html: `
        <div style="position:relative; transform: translate(-50%, -100%);">
          <div style="background:#10b981; color:white; font-weight:900; font-family:monospace; font-size:11px; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 12px rgba(16,185,129,0.8);">
            A
          </div>
          <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid #10b981; margin:0 auto;"></div>
        </div>
      `,
      iconSize: [26, 34],
      iconAnchor: [13, 34]
    });

    const originMarker = L.marker(originCoord, { icon: originIcon });
    originMarker.bindPopup('<div class="p-1 font-mono font-bold text-xs text-emerald-400">🚩 PUNTO DE ORIGEN</div>');
    routesGroup.addLayer(originMarker);

    // Destination Marker (Red Pin / Letter B)
    const destIcon = L.divIcon({
      className: 'route-dest-pin',
      html: `
        <div style="position:relative; transform: translate(-50%, -100%);">
          <div style="background:#ef4444; color:white; font-weight:900; font-family:monospace; font-size:11px; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 0 12px rgba(239,68,68,0.8);">
            B
          </div>
          <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid #ef4444; margin:0 auto;"></div>
        </div>
      `,
      iconSize: [26, 34],
      iconAnchor: [13, 34]
    });

    const destMarker = L.marker(destCoord, { icon: destIcon });
    destMarker.bindPopup('<div class="p-1 font-mono font-bold text-xs text-red-400">🏁 DESTINO FINAL</div>');
    routesGroup.addLayer(destMarker);

    // 4. Render Checkpoints / Casetas Along Route
    activeRoute.checkpoints.forEach((chk) => {
      if (chk.type === 'origin' || chk.type === 'destination') return;

      const isToll = chk.type === 'toll';
      const chkIcon = L.divIcon({
        className: 'route-chk-pin',
        html: `
          <div style="transform: translate(-50%, -50%); background:${isToll ? '#3b82f6' : '#64748b'}; width:10px; height:10px; border-radius:50%; border:2px solid white; box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>
        `,
        iconSize: [10, 10],
        iconAnchor: [5, 5]
      });

      const chkMarker = L.marker(chk.coords, { icon: chkIcon });
      chkMarker.bindPopup(`
        <div class="p-1 font-mono text-xs">
          <div class="font-bold ${isToll ? 'text-blue-400' : 'text-slate-200'}">${isToll ? '💳 CASETA' : '📍 PUNTO'}: ${escapeXml(chk.name)}</div>
          ${chk.note ? `<div class="text-[10px] text-slate-400 mt-0.5">${escapeXml(chk.note)}</div>` : ''}
        </div>
      `);
      routesGroup.addLayer(chkMarker);
    });

    // 5. Fit bounds to comfortably display the full calculated route
    try {
      const bounds = L.latLngBounds(activeRoute.waypoints);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 14,
        animate: true,
        duration: 1.2
      });
    } catch (e) {
      console.warn('Could not fit route bounds:', e);
    }
  }, [activeRoute, activeRoutePlan]);

  // GPS Marker handling
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userCoords) {
      const [lat, lon] = userCoords;
      if (!gpsMarkerRef.current) {
        const halo = L.circle([lat, lon], {
          radius: 1200,
          color: '#38bdf8',
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
        gpsHaloRef.current = halo;

        const marker = L.circleMarker([lat, lon], {
          radius: 8,
          color: '#ffffff',
          fillColor: '#0284c7',
          fillOpacity: 0.95,
          weight: 2.5
        }).addTo(map);
        marker.bindPopup('<div class="p-1 font-bold text-xs text-sky-500">📍 Tu Posición Actual (GPS)</div>');
        gpsMarkerRef.current = marker;
      } else {
        gpsMarkerRef.current.setLatLng([lat, lon]);
        if (gpsHaloRef.current) {
          gpsHaloRef.current.setLatLng([lat, lon]);
        }
      }

      if (followGPS) {
        map.panTo([lat, lon]);
      }
    } else {
      if (gpsMarkerRef.current) {
        map.removeLayer(gpsMarkerRef.current);
        gpsMarkerRef.current = null;
      }
      if (gpsHaloRef.current) {
        map.removeLayer(gpsHaloRef.current);
        gpsHaloRef.current = null;
      }
    }
  }, [userCoords, followGPS]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    mapInstanceRef.current?.flyTo([22.8, -101.5], 6, { duration: 1.0 });
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#020406]'}`}>
      {/* Subtle tactical grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-10"
        style={{
          backgroundImage: 'radial-gradient(#888 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls - Top Right */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Layer Selector */}
        <div className="relative">
          <button
            id="btn-map-layers"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            title="Cambiar capa de mapa"
            aria-label="Cambiar capa de mapa"
            className={`p-2.5 rounded-lg border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
              isLight
                ? 'bg-white/95 hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-[#070B10]/90 hover:bg-[#0F151F] text-slate-200 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.8)]'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-500" />
          </button>

          {showLayerMenu && (
            <div className={`absolute right-0 mt-2 w-44 rounded-xl border shadow-2xl p-1.5 backdrop-blur-xl z-30 animate-in fade-in zoom-in-95 duration-150 font-mono ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-800'
                : 'bg-[#070B10]/95 border-white/10 text-white'
            }`}>
              <div className="text-[9px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Estilo de Mapa</div>
              <button
                onClick={() => { onChangeTileStyle('dark'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${tileStyle === 'dark' ? 'bg-blue-600/20 text-blue-500 font-bold' : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'}`}
              >
                <span>Oscuro Táctico</span>
                {tileStyle === 'dark' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
              </button>
              <button
                onClick={() => { onChangeTileStyle('satellite'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${tileStyle === 'satellite' ? 'bg-blue-600/20 text-blue-500 font-bold' : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'}`}
              >
                <span>Satelital Esri</span>
                {tileStyle === 'satellite' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
              </button>
              <button
                onClick={() => { onChangeTileStyle('standard'); setShowLayerMenu(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer ${tileStyle === 'standard' ? 'bg-blue-600/20 text-blue-500 font-bold' : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'}`}
              >
                <span>Calles Clásico</span>
                {tileStyle === 'standard' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
              </button>
            </div>
          )}
        </div>

        {/* Heatmap Toggle */}
        <button
          id="btn-map-heatmap"
          onClick={onToggleHeatmap}
          title={showHeatmap ? 'Ocultar mapas de calor' : 'Mostrar mapas de calor'}
          aria-label={showHeatmap ? 'Ocultar mapas de calor' : 'Mostrar mapas de calor'}
          className={`p-2.5 rounded-lg border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
            showHeatmap
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-500'
              : isLight
              ? 'bg-white/95 hover:bg-slate-100 text-slate-600 border-slate-300'
              : 'bg-[#070B10]/90 hover:bg-[#0F151F] text-slate-400 border-white/10'
          }`}
        >
          <Flame className="w-4 h-4" />
        </button>

        {/* GPS Follow */}
        <button
          id="btn-map-gps"
          onClick={onToggleGPS}
          title={followGPS ? 'Desactivar seguimiento GPS' : 'Seguir mi ubicación GPS'}
          aria-label={followGPS ? 'Desactivar seguimiento GPS' : 'Seguir mi ubicación GPS'}
          className={`p-2.5 rounded-lg border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
            followGPS
              ? 'bg-blue-600/30 border-blue-500 text-blue-600 dark:text-blue-300'
              : isLight
              ? 'bg-white/95 hover:bg-slate-100 text-slate-600 border-slate-300'
              : 'bg-[#070B10]/90 hover:bg-[#0F151F] text-slate-400 border-white/10'
          }`}
        >
          <Crosshair className={`w-4 h-4 ${followGPS ? 'animate-spin text-blue-500' : ''}`} />
        </button>

        {/* Recenter Mexico */}
        <button
          id="btn-map-recenter"
          onClick={handleResetView}
          title="Centrar Red Vial México"
          aria-label="Centrar Red Vial México"
          className={`p-2.5 rounded-lg border shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
            isLight
              ? 'bg-white/95 hover:bg-slate-100 text-emerald-600 border-slate-300'
              : 'bg-[#070B10]/90 hover:bg-[#0F151F] text-emerald-400 border-white/10'
          }`}
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Zoom Controls */}
        <div className={`flex flex-col rounded-lg border shadow-lg overflow-hidden backdrop-blur-md ${
          isLight ? 'bg-white/95 border-slate-300' : 'bg-[#070B10]/90 border-white/10'
        }`}>
          <button
            id="btn-map-zoom-in"
            onClick={handleZoomIn}
            className={`p-2 border-b transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-700 border-slate-200' : 'hover:bg-[#0F151F] text-slate-200 border-white/5'
            }`}
            title="Acercar"
            aria-label="Acercar mapa"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="btn-map-zoom-out"
            onClick={handleZoomOut}
            className={`p-2 transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-[#0F151F] text-slate-200'
            }`}
            title="Alejar"
            aria-label="Alejar mapa"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Route HUD Overlay */}
      {activeRoute && (
        <div className="absolute top-4 left-4 z-20 max-w-sm sm:max-w-md w-[calc(100%-5rem)] sm:w-auto animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`p-3 sm:p-3.5 rounded-xl border shadow-2xl backdrop-blur-xl flex flex-col gap-2 ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-800'
                : 'bg-[#080D15]/95 border-white/15 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)]'
            }`}
          >
            {/* Header / Route Title */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0"></span>
                <span className="font-bold text-xs truncate">
                  {activeRoutePlan?.originName} ➔ {activeRoutePlan?.destinationName}
                </span>
              </div>
              <button
                onClick={onClearRoute}
                className={`p-1 rounded-md border text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ${
                  isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-white/10 hover:bg-white/10'
                }`}
                title="Quitar ruta trazada"
                aria-label="Quitar ruta trazada"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metrics and Safety Level */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono pt-1 border-t border-dashed border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-500">{activeRoute.distanceKm} km</span>
                <span className="opacity-40">·</span>
                <span>~{Math.floor(activeRoute.durationMinutes / 60)}h {activeRoute.durationMinutes % 60}m</span>
                {activeRoute.tollCostMxn > 0 && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="text-emerald-500">${activeRoute.tollCostMxn}</span>
                  </>
                )}
              </div>

              {/* Status pill */}
              <div className="shrink-0">
                {activeRoute.safetyLevel === 'safe' ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> SEGURO ({activeRoute.safetyScore}%)
                  </span>
                ) : activeRoute.safetyLevel === 'caution' ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> PRECAUCIÓN ({activeRoute.safetyScore}%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-500 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <ShieldAlert className="w-3 h-3" /> {activeRoute.incidentBreakdown.security > 0 ? 'ZONA ROJA' : 'BLOQUEO'} ({activeRoute.safetyScore}%)
                  </span>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {activeRoute.incidentsOnRoute.length === 0
                  ? 'Sin incidentes en corredor'
                  : `⚠️ ${activeRoute.incidentsOnRoute.length} evento(s) en trayecto`}
              </div>

              <button
                onClick={onOpenRoutePlanner}
                className="px-2.5 py-1 rounded-md bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Route className="w-3 h-3" />
                <span>Ver Alternas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Scale & Location Stamp HUD */}
      <div className={`absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:flex items-center gap-3 border rounded-lg px-3 py-1.5 backdrop-blur-xl ${
        isLight ? 'bg-white/85 border-slate-200 shadow-sm text-slate-700' : 'bg-black/60 border-white/10 text-slate-400'
      }`}>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>RED VIAL NACIONAL MX</span>
        </div>
        <div className={`h-3 w-px ${isLight ? 'bg-slate-300' : 'bg-white/10'}`}></div>
        <div className="text-[10px] font-mono">
          MAPA ACTIVO: <span className="text-blue-500 font-bold">{alerts.filter(a => a.coords && !a.ignored).length} EVENTOS</span>
        </div>
      </div>
    </div>
  );
};

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
