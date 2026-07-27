import React from 'react';
import { X } from 'lucide-react';
import type { Campaign } from '../types';
import { formatCampaignCandidate, formatCampaignOffice } from '../utils/formatters';


interface ElectoralCampaignViewModalProps {
  campaign: Campaign;
  onClose: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export default function ElectoralCampaignViewModal({
  campaign,
  onClose,
  getStatusBadge,
}: ElectoralCampaignViewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] select-none animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl text-left select-text">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <span className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">
            Detalhes da Campanha Eleitoral
          </span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-4 border-b border-[var(--border-color)]/30 pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Nome Oficial</span>
              <p className="text-sm font-bold text-[var(--text-main)]">{campaign.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Status da Campanha</span>
              <div>{getStatusBadge(campaign.status)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-[var(--border-color)]/30 pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Candidato / Partido</span>
              <p className="font-semibold text-[var(--text-main)]">{formatCampaignCandidate(campaign)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Cargo / Ano</span>
              <p className="font-mono text-rose-400 font-semibold">{formatCampaignOffice(campaign)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">Descrição e Escopo Operacional</span>
            <p className="text-[12px] leading-relaxed text-[var(--text-main)] italic py-2 px-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)]/40 rounded-xl">
              {campaign.description || 'Não há descrição operacional inserida.'}
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--blue-accent)] hover:opacity-95 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
