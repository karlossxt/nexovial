import React, { useState } from 'react';
import { AlertItem, AlertType, ThemeMode } from '../types';
import { requestGeolocate, requestClassify } from '../services/apiClient';
import { X, Send, Sparkles } from 'lucide-react';

interface SimulateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAlert: (alert: AlertItem) => void;
  theme?: ThemeMode;
}

export const SimulateAlertModal: React.FC<SimulateAlertModalProps> = ({ isOpen, onClose, onAddAlert, theme = 'dark' }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [feedSource, setFeedSource] = useState('Reporte Operador / Alerta C5');
  const [manualType, setManualType] = useState<AlertType | 'auto'>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isLight = theme === 'light';

  if (!isOpen) return null;

  const quickTemplates = [
    {
      title: 'Bloqueo en Caseta Palmillas',
      desc: 'Transportistas bloquean carriles centrales en la autopista México-Querétaro km 148 a la altura de Palmillas.',
      type: 'red' as AlertType
    },
    {
      title: 'Choque múltiple en Arco Norte',
      desc: 'Accidente vial con 3 vehículos involucrados en el km 125 tramo Tula-Pachuca. Cierre parcial de carril.',
      type: 'orange' as AlertType
    },
    {
      title: 'Operativo y zona de riesgo en Matehuala',
      desc: 'Presencia armada y alerta de seguridad en la Carretera 57 km 110 tramo San Luis Potosí.',
      type: 'security' as AlertType
    },
    {
      title: 'Vía libre en México-Toluca',
      desc: 'Tráfico fluido y circulación normalizada en ambos sentidos a la altura de La Marquesa.',
      type: 'green' as AlertType
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsProcessing(true);
    setErrorMsg('');
    const combinedText = `${title} ${description}`;

    try {
      // Classify and Geolocate
      const detectedType = manualType === 'auto' ? await requestClassify(combinedText) : manualType;
      const geo = await requestGeolocate(combinedText);

      const newAlert: AlertItem = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        description: description.trim() || title.trim(),
        feedSource: feedSource.trim(),
        type: detectedType,
        coords: geo.coords,
        locationName: geo.locationName || 'Ubicación identificada',
        state: geo.state || 'México',
        highway: geo.highway || 'Carretera Nacional',
        detectedAt: Date.now(),
        ignored: !geo.coords,
        severityScore: detectedType === 'security' ? 9 : detectedType === 'red' ? 8 : detectedType === 'orange' ? 6 : 2,
        verified: true
      };

      onAddAlert(newAlert);
      onClose();
      setTitle('');
      setDescription('');
      setErrorMsg('');
    } catch (err) {
      console.warn('Simulate alert processing failed:', err);
      setErrorMsg('No se pudo procesar la alerta. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[7500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#070B10] border-white/10 text-[#E6EEF6]'
      }`}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#05070A] border-white/5'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isLight ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-none">Ingresar Alerta / Probar IA</h2>
              <p className="text-[10px] text-slate-500 font-mono mt-1">Geocodificación y clasificación en tiempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ingreso de alerta"
            title="Cerrar"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[75vh]">
          {/* Quick Presets */}
          <div>
            <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Plantillas Rápidas de Prueba
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {quickTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTitle(tmpl.title);
                    setDescription(tmpl.desc);
                    setManualType(tmpl.type);
                  }}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      : 'bg-white/5 hover:bg-white/10 border-white/5'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{tmpl.title}</div>
                  <div className="text-[9px] text-slate-400 truncate mt-0.5">{tmpl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Título del Evento *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Cierre total por bloqueo en Autopista México-Querétaro km 148"
              className={`w-full px-3 py-2 rounded-lg text-xs transition-colors focus:outline-none focus:border-blue-500 ${
                isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Descripción / Reporte Completo</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles de kilometraje, caseta, tramo carretero o condiciones de circulación..."
              className={`w-full px-3 py-2 rounded-lg text-xs resize-none transition-colors focus:outline-none focus:border-blue-500 ${
                isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Categoría</label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value as AlertType | 'auto')}
                className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-white border border-slate-300 text-slate-900' : 'bg-[#070B10] border border-white/10 text-white'
                }`}
              >
                <option value="auto">✨ Detección Automática (IA)</option>
                <option value="red">🔴 Bloqueo (Rojo)</option>
                <option value="orange">🟠 Incidente (Naranja)</option>
                <option value="green">🟢 Vía Libre (Verde)</option>
                <option value="security">🚨 Zona Roja (Seguridad)</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Fuente</label>
              <input
                type="text"
                value={feedSource}
                onChange={(e) => setFeedSource(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-white border border-slate-300 text-slate-900' : 'bg-white/5 border border-white/10 text-white'
                }`}
              />
            </div>
          </div>

          {errorMsg && (
            <div className={`px-3 py-2 rounded-lg border text-[11px] font-medium ${
              isLight ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div className={`pt-3 border-t flex items-center justify-end gap-2 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md border border-blue-400/30 cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Procesando IA...' : 'Publicar en Monitoreo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
