import React from 'react';
import { X } from 'lucide-react';
import type { Campaign } from '../types';
import { CAMPAIGN_STATUS, ELECTORAL_OFFICES, DEFAULT_ELECTION_YEARS } from '../constants/status';

interface ElectoralCampaignModalProps {
  editingCampaignId: string | null;
  campaignForm: Partial<Campaign>;
  setCampaignForm: React.Dispatch<React.SetStateAction<Partial<Campaign>>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planejamento',
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluída',
  SUSPENDED: 'Suspensa',
};

const ELECTORAL_OFFICE_LABELS: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  GOVERNADOR: 'Governador',
  SENADOR: 'Senador',
  DEPUTADO_FEDERAL: 'Deputado Federal',
  DEPUTADO_ESTADUAL: 'Deputado Estadual',
  PREFEITO: 'Prefeito',
  VEREADOR: 'Vereador',
};

/**
 * ElectoralCampaignModal
 *
 * Modal de criação/edição de campanhas eleitorais.
 */
export default function ElectoralCampaignModal({
  editingCampaignId,
  campaignForm,
  setCampaignForm,
  onClose,
  onSubmit,
}: ElectoralCampaignModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] select-none animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl text-left select-text">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <span className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">
            {editingCampaignId ? 'Editar Campanha Eleitoral' : 'Cadastrar Nova Campanha'}
          </span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Nome da Campanha</label>
            <input
              type="text"
              value={campaignForm.name || ''}
              onChange={(event) => setCampaignForm(prev => ({ ...prev, name: event.target.value }))}
              required
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Nome do Candidato</label>
              <input
                type="text"
                value={campaignForm.candidateName || ''}
                onChange={(event) => setCampaignForm(prev => ({ ...prev, candidateName: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Partido Político</label>
              <input
                type="text"
                value={campaignForm.party || ''}
                onChange={(event) => setCampaignForm(prev => ({ ...prev, party: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold opacity-95"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Cargo Pretendido</label>
              <select
                value={campaignForm.office || 'PREFEITO'}
                onChange={(event) => setCampaignForm(prev => ({ ...prev, office: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
              >
                {ELECTORAL_OFFICES.map((office) => (
                  <option key={office} value={office}>{ELECTORAL_OFFICE_LABELS[office] || office}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Ano Eleitoral</label>
              <select
                value={campaignForm.electionYear || 2026}
                onChange={(event) => setCampaignForm(prev => ({ ...prev, electionYear: Number(event.target.value) }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
              >
                {DEFAULT_ELECTION_YEARS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Status</label>
              <select
                value={campaignForm.status || 'PLANNING'}
                onChange={(event) => setCampaignForm(prev => ({ ...prev, status: event.target.value as Campaign['status'] }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold text-rose-500"
              >
                {CAMPAIGN_STATUS.map((status) => (
                  <option key={status} value={status}>{CAMPAIGN_STATUS_LABELS[status] || status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Descrição Operacional</label>
            <textarea
              rows={2}
              value={campaignForm.description || ''}
              onChange={(event) => setCampaignForm(prev => ({ ...prev, description: event.target.value }))}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-medium"
            />
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
              Salvar Campanha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
