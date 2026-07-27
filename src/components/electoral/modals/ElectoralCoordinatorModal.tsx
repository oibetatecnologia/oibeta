import React from 'react';
import { X } from 'lucide-react';

import type { Campaign, Coordinator } from '../types';
import { COORDINATOR_LEVELS } from '../constants/status';


interface ElectoralCoordinatorModalProps {
  editingCoordinatorId: string | null;
  coordinatorForm: Partial<Coordinator>;
  setCoordinatorForm: React.Dispatch<React.SetStateAction<Partial<Coordinator>>>;
  campaigns: Campaign[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

/**
 * ElectoralCoordinatorModal
 *
 * Modal de criação/edição de coordenadores eleitorais.
 *
 * Responsabilidade:
 * - renderizar formulário de coordenador;
 * - delegar submit e fechamento ao ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralCoordinatorModal({
  editingCoordinatorId,
  coordinatorForm,
  setCoordinatorForm,
  campaigns,
  onClose,
  onSubmit,
}: ElectoralCoordinatorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] select-none animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl text-left select-text">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <span className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">
            {editingCoordinatorId ? 'Editar Cadastro Coordenador' : 'Registrar Novo Coordenador'}
          </span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Nome do Coordenador</label>
            <input
              type="text"
              value={coordinatorForm.name || ''}
              onChange={(event) => setCoordinatorForm(prev => ({ ...prev, name: event.target.value }))}
              required
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">E-mail Corporativo</label>
              <input
                type="email"
                value={coordinatorForm.email || ''}
                onChange={(event) => setCoordinatorForm(prev => ({ ...prev, email: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Telefone / WhatsApp</label>
              <input
                type="text"
                value={coordinatorForm.phone || ''}
                onChange={(event) => setCoordinatorForm(prev => ({ ...prev, phone: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Nível Operacional</label>
              <select
                value={coordinatorForm.level || 'REGIONAL'}
                onChange={(event) => setCoordinatorForm(prev => ({ ...prev, level: event.target.value as Coordinator['level'] }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold text-rose-500"
              >
                {COORDINATOR_LEVELS.map((level) => (
                  <option key={level} value={level}>{level === 'REGIONAL' ? 'Regional' : level === 'MUNICIPAL' ? 'Municipal' : level === 'ZONE' ? 'Zona Eleitoral' : 'Local'}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Status</label>
              <select
                value={coordinatorForm.status || 'ACTIVE'}
                onChange={(event) => setCoordinatorForm(prev => ({ ...prev, status: event.target.value as Coordinator['status'] }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
              >
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="SUSPENDED">Suspenso</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Território (UF / Cidade / Nome)</label>
              <input
                type="text"
                value={coordinatorForm.assignedTerritory || ''}
                onChange={(event) => setCoordinatorForm(prev => ({ ...prev, assignedTerritory: event.target.value }))}
                placeholder="Ex: Minas Gerais, Zona 082"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Campanha Associada</label>
              <select
                value={coordinatorForm.campaignId || ''}
                onChange={(event) => setCoordinatorForm(prev => ({ ...prev, campaignId: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
              >
                <option value="">Geral da Organização</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-color)]/30 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--border-color)]/20 text-[var(--text-main)] text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--blue-accent)] hover:opacity-95 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Confirmar Cadastro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
