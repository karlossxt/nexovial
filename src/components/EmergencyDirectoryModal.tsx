import React, { useState } from 'react';
import { Phone, PhoneCall, Copy, Check, Search, Shield, AlertTriangle, LifeBuoy, Wrench, HeartPulse, Building2, X, Info } from 'lucide-react';
import { EMERGENCY_CONTACTS, EmergencyCategory } from '../data/emergencyDirectory';
import { ThemeMode } from '../types';

interface EmergencyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

export const EmergencyDirectoryModal: React.FC<EmergencyDirectoryModalProps> = ({
  isOpen,
  onClose,
  theme
}) => {
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<EmergencyCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isLight = theme === 'light';

  if (!isOpen) return null;

  const handleCopy = (number: string, id: string) => {
    navigator.clipboard.writeText(number.replace(/\s+/g, '')).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      // Copia fallback para navegadores sin API de portapapeles
      try {
        const textarea = document.createElement('textarea');
        textarea.value = number.replace(/\s+/g, '');
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        /* ignorar */
      }
    });
  };

  const filteredContacts = EMERGENCY_CONTACTS.filter((contact) => {
    const matchCategory = category === 'all' || contact.category === category;
    const matchSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.shortNumber.includes(search) ||
      (contact.directPhone && contact.directPhone.includes(search)) ||
      contact.description.toLowerCase().includes(search.toLowerCase()) ||
      contact.scope.toLowerCase().includes(search.toLowerCase());

    return matchCategory && matchSearch;
  });

  const getCategoryIcon = (cat: EmergencyCategory) => {
    switch (cat) {
      case 'auxilio':
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case 'seguridad':
        return <Shield className="w-4 h-4 text-pink-500" />;
      case 'medica':
        return <HeartPulse className="w-4 h-4 text-red-500" />;
      case 'proteccion_civil':
        return <LifeBuoy className="w-4 h-4 text-orange-500" />;
      case 'concesionaria':
        return <Building2 className="w-4 h-4 text-blue-500" />;
      default:
        return <Phone className="w-4 h-4 text-blue-400" />;
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
            <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-sm">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Directorio de Emergencias en Carreteras de México
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-red-500/10 text-red-500 border border-red-500/20">
                  OFICIAL 24/7
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Números directos de asistencia médica, grúas, auxilio vial y seguridad federal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar directorio de emergencias"
            title="Cerrar"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Emergency Protocol Banner */}
        <div className={`px-4 py-3 border-b flex items-center gap-3 ${
          isLight ? 'bg-amber-50/80 border-amber-200/60 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
        }`}>
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Protocolo en caso de avería o siniestro:</span> Enciende luces intermitentes, baja por el lado del copiloto, colócate detrás de la barrera metálica de contención y marca al <strong className="underline">074 (CAPUFE)</strong> o al <strong className="underline">078 (Ángeles Verdes)</strong>.
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
                placeholder="Buscar por nombre, número (ej. 074, 088, 911), servicio o autopista..."
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs transition-colors focus:outline-none ${
                  isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-red-500'
                    : 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-red-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'all'
                    ? 'bg-red-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Todos ({EMERGENCY_CONTACTS.length})
              </button>
              <button
                type="button"
                onClick={() => setCategory('auxilio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'auxilio'
                    ? 'bg-amber-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Auxilio Vial / Grúas
              </button>
              <button
                type="button"
                onClick={() => setCategory('seguridad')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'seguridad'
                    ? 'bg-pink-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Guardia Nacional
              </button>
              <button
                type="button"
                onClick={() => setCategory('medica')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'medica'
                    ? 'bg-red-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                911 / Médica
              </button>
              <button
                type="button"
                onClick={() => setCategory('concesionaria')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'concesionaria'
                    ? 'bg-blue-600 text-white'
                    : isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Concesionarias
              </button>
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Phone className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No se encontraron números de emergencia con ese criterio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredContacts.map((contact) => {
                const primaryNumber = contact.shortNumber;
                return (
                  <div
                    key={contact.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      contact.isPrimary
                        ? isLight
                          ? 'bg-white border-red-200 shadow-sm ring-1 ring-red-100'
                          : 'bg-red-950/10 border-red-500/20'
                        : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div>
                      {/* Top Category & Scope */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                          isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'
                        }`}>
                          {getCategoryIcon(contact.category)}
                          <span>{contact.categoryLabel}</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-500 font-bold">
                          {contact.cost}
                        </span>
                      </div>

                      {/* Contact Name & Phone Display */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-bold text-sm leading-snug">{contact.name}</h3>
                          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {contact.scope}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xl font-black font-mono tracking-wider text-red-500">
                            {contact.shortNumber}
                          </div>
                          {contact.directPhone && (
                            <div className="text-[10px] font-mono text-slate-400">
                              {contact.directPhone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className={`text-xs leading-relaxed mb-3 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        {contact.description}
                      </p>
                    </div>

                    {/* Actions: Call & Copy */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      <a
                        href={`tel:${primaryNumber.replace(/\s+/g, '')}`}
                        className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 text-center"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Marcar {primaryNumber}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(primaryNumber, contact.id)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          copiedId === contact.id
                            ? 'bg-emerald-600 text-white'
                            : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
                        }`}
                      >
                        {copiedId === contact.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
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
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-mono text-[11px]">En tramos de cuota, el boleto de caseta incluye póliza de seguro de responsabilidad civil.</span>
          </div>
          <div className="text-[11px] font-mono">
            Válido en toda la República Mexicana
          </div>
        </div>
      </div>
    </div>
  );
};
