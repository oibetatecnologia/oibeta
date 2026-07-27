import React from 'react';
import { X } from 'lucide-react';

import type { Campaign, Territory, Invite } from '../types';


interface ElectoralInviteModalProps {
  inviteForm: Partial<Invite>;
  setInviteForm: React.Dispatch<React.SetStateAction<Partial<Invite>>>;
  campaigns: Campaign[];
  territories: Territory[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export default function ElectoralInviteModal({
  inviteForm,
  setInviteForm,
  campaigns,
  territories,
  onClose,
  onSubmit,
}: ElectoralInviteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] select-none animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl text-left select-text">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <span className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">
            Gerar Novo Convite Eleitoral
          </span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-main)] transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Campanha Convidada</label>
            <select
              value={inviteForm.campaignId || ''}
              onChange={(event) => setInviteForm(prev => ({ ...prev, campaignId: event.target.value }))}
              required
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
            >
              <option value="">Selecione a Campanha...</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">E-mail Convidado (Opcional)</label>
              <input
                type="email"
                value={inviteForm.email || ''}
                onChange={(event) => setInviteForm(prev => ({ ...prev, email: event.target.value }))}
                placeholder="exemplo@gmail.com"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">SMS / Telefone (Opcional)</label>
              <input
                type="text"
                value={inviteForm.phone || ''}
                onChange={(event) => setInviteForm(prev => ({ ...prev, phone: event.target.value }))}
                placeholder="(00) 90000-0000"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Função Solicitada</label>
              <select
                value={inviteForm.role || 'COORDINATOR'}
                onChange={(event) => setInviteForm(prev => ({ ...prev, role: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] font-semibold focus:outline-none focus:border-[var(--blue-accent)] text-rose-500"
              >
                <option value="COORDINATOR">Coordenador Regional</option>
                <option value="MEMBER">Membro Administrativo</option>
                <option value="LEADER">Líder Comunitário</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Território Atribuído (ID)</label>
              <select
                value={inviteForm.assignedTerritoryId || ''}
                onChange={(event) => setInviteForm(prev => ({ ...prev, assignedTerritoryId: event.target.value }))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
              >
                <option value="">Geral do Município</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>{territory.name} ({territory.type})</option>
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
              Gerar Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
