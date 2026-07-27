import React from 'react';
import { X } from 'lucide-react';
import type { Territory } from '../types';
import { TERRITORY_TYPES } from '../constants/status';

interface ElectoralTerritoryModalProps {
  territoryForm: Partial<Territory>;
  setTerritoryForm: React.Dispatch<React.SetStateAction<Partial<Territory>>>;
  territories: Territory[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const TERRITORY_TYPE_LABELS: Record<string, string> = {
  REGION: 'Região',
  STATE: 'Estado (UF)',
  CITY: 'Município',
  ZONE: 'Zona Eleitoral',
  POLING_PLACE: 'Local de Votação',
};

export default function ElectoralTerritoryModal({
  territoryForm,
  setTerritoryForm,
  territories,
  onClose,
  onSubmit,
}: ElectoralTerritoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] select-none animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl text-left select-text">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <span className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">
            Registrar Território e Zoneamento
          </span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Nome do Território (Ex: Centro, Zona Sul)</label>
            <input
              type="text"
              value={territoryForm.name || ''}
              onChange={(event) => setTerritoryForm(prev => ({ ...prev, name: event.target.value }))}
              required
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Tipo Geográfico</label>
              <select
                value={territoryForm.type || 'REGION'}
                onChange={(event) => setTerritoryForm(prev => ({ ...prev, type: event.target.value as Territory['type'] }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold text-rose-500"
              >
                {TERRITORY_TYPES.map((type) => (
                  <option key={type} value={type}>{TERRITORY_TYPE_LABELS[type] || type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Código Local</label>
              <input
                type="text"
                value={territoryForm.code || ''}
                onChange={(event) => setTerritoryForm(prev => ({ ...prev, code: event.target.value }))}
                placeholder="Opcional. Ex: 015, EX, BH"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Subordinado de / Parent ID</label>
            <select
              value={territoryForm.parentId || ''}
              onChange={(event) => setTerritoryForm(prev => ({ ...prev, parentId: event.target.value }))}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
            >
              <option value="">Nenhum (Nível Superior / Raiz)</option>
              {territories.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name} ({territory.type})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-[var(--border-color)]/30 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--border-color)]/20 text-[var(--text-main)] text-xs font-bold rounded-lg transition cursor-pointer">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-[var(--blue-accent)] hover:opacity-95 text-white text-xs font-bold rounded-lg transition cursor-pointer">Confirmar Cadastro</button>
          </div>
        </form>
      </div>
    </div>
  );
}
