import React, { useState, useEffect } from 'react';
import { ThemeMode } from '../types';
import {
  notificationService,
  NotificationPermissionState,
  NotificationSettings
} from '../services/notificationService';
import {
  BellRing,
  BellOff,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Sparkles
} from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: ThemeMode;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    notificationService.getPermissionStatus()
  );
  const [settings, setSettings] = useState<NotificationSettings>(
    notificationService.getSettings()
  );
  const [testSent, setTestSent] = useState<boolean>(false);
  const [testError, setTestError] = useState<string>('');
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      setPermission(notificationService.getPermissionStatus());
      setSettings(notificationService.getSettings());
      setTestSent(false);
      setTestError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const result = await notificationService.requestPermission();
    setPermission(result);
    const updatedSettings = notificationService.getSettings();
    setSettings(updatedSettings);
    setIsRequesting(false);
  };

  const handleUpdateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    notificationService.saveSettings(updated);
  };

  const handleSendTest = () => {
    const ok = notificationService.sendTestNotification();
    if (ok) {
      setTestSent(true);
      setTestError('');
      setTimeout(() => setTestSent(false), 4000);
    } else {
      setTestSent(false);
      setTestError(
        'No se pudo enviar la notificación. Asegúrate de otorgar permisos de notificación en tu navegador.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isLight
            ? 'bg-white text-slate-900 border-slate-200'
            : 'bg-[#090E16] text-[#E6EEF6] border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]'
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
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Notificaciones Nativas del Navegador
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-500 uppercase">
                  Push / Web API
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 font-mono ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Alertas automáticas de Seguridad y Bloqueos incluso con pestaña inactiva
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar notificaciones"
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Permission Status Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              permission === 'granted'
                ? isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : permission === 'denied'
                ? isLight
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-red-500/10 border-red-500/30 text-red-200'
                : isLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {permission === 'granted' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : permission === 'denied' ? (
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <BellOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {permission === 'granted'
                    ? 'Permiso de Notificaciones Activo'
                    : permission === 'denied'
                    ? 'Permiso Bloqueado por el Navegador'
                    : 'Permiso de Notificaciones Pendiente'}
                </div>
                <div
                  className={`text-xs mt-0.5 ${
                    isLight ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {permission === 'granted'
                    ? 'El sistema te notificará cuando se detecten bloqueos totales o incidentes de seguridad carretera.'
                    : permission === 'denied'
                    ? 'Debes hacer clic en el candado o icono de configuración en la barra de direcciones de tu navegador y habilitar "Notificaciones".'
                    : 'Autoriza al navegador para recibir avisos urgentes en segundo plano mientras viajas o monitoreas.'}
                </div>
              </div>
            </div>

            {permission !== 'granted' && (
              <button
                type="button"
                disabled={isRequesting || permission === 'denied'}
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shrink-0 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {isRequesting ? 'Solicitando...' : 'Habilitar Notificaciones'}
              </button>
            )}
          </div>

          {/* Alert Type Selection Switches */}
          <div className="space-y-3">
            <h3
              className={`text-[11px] font-bold uppercase tracking-widest font-mono ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Niveles de Alerta para Notificación
            </h3>

            {/* Zonas Rojas / Seguridad */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white/5 border-white/5 hover:border-pink-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-500 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span>Alertas de Seguridad & Zonas Rojas</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-500 border border-pink-500/30">
                      CRÍTICO
                    </span>
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Asaltos, persecuciones, presencia armada y retenes irregulares.
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.notifyOnSecurity}
                aria-label="Notificar alertas de seguridad y zonas rojas"
                onClick={() =>
                  handleUpdateSetting('notifyOnSecurity', !settings.notifyOnSecurity)
                }
                className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  settings.notifyOnSecurity
                    ? 'bg-pink-600 justify-end'
                    : isLight
                    ? 'bg-slate-300 justify-start'
                    : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
              </button>
            </div>

            {/* Bloqueos Totales */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white/5 border-white/5 hover:border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span>Bloqueos Totales de Carretera</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-500 border border-red-500/30">
                      ALTA PRIORIDAD
                    </span>
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Cierres por manifestaciones, deslaves graves, casetas tomadas y accidentes totales.
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.notifyOnRed}
                aria-label="Notificar bloqueos y cierres totales"
                onClick={() =>
                  handleUpdateSetting('notifyOnRed', !settings.notifyOnRed)
                }
                className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  settings.notifyOnRed
                    ? 'bg-red-600 justify-end'
                    : isLight
                    ? 'bg-slate-300 justify-start'
                    : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
              </button>
            </div>

            {/* Incidentes Mayores */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white/5 border-white/5 hover:border-orange-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span>Incidentes Mayores & Tráfico Denso</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-500 border border-orange-500/30">
                      MODERADO
                    </span>
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Reducción de carriles, volcaduras parciales, obras y tráfico severo.
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.notifyOnOrange}
                aria-label="Notificar incidentes mayores y tráfico denso"
                onClick={() =>
                  handleUpdateSetting('notifyOnOrange', !settings.notifyOnOrange)
                }
                className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  settings.notifyOnOrange
                    ? 'bg-orange-600 justify-end'
                    : isLight
                    ? 'bg-slate-300 justify-start'
                    : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
              </button>
            </div>
          </div>

          {/* Advanced Tab Visibility Option */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
            }`}
          >
            <div>
              <div className="font-bold text-xs">
                Notificar solo cuando la pestaña esté en segundo plano
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Si está desactivado, recibirás notificaciones en el sistema incluso mientras miras el mapa.
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.onlyWhenInactive}
              aria-label="Notificar solo cuando la pestaña esté inactiva"
              onClick={() =>
                handleUpdateSetting('onlyWhenInactive', !settings.onlyWhenInactive)
              }
              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                settings.onlyWhenInactive
                  ? 'bg-blue-600 justify-end'
                  : isLight
                  ? 'bg-slate-300 justify-start'
                  : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
            </button>
          </div>
        </div>

        {testError && (
          <div className={`px-4 py-2.5 text-[11px] font-medium ${
            isLight ? 'bg-red-50 text-red-700' : 'bg-red-500/10 text-red-400'
          }`}>
            ⚠️ {testError}
          </div>
        )}

        {/* Modal Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex items-center justify-between shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-[#0C121D]'
          }`}
        >
          <button
            type="button"
            onClick={handleSendTest}
            disabled={permission !== 'granted'}
            className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>{testSent ? '¡Notificación enviada!' : 'Probar Notificación'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
