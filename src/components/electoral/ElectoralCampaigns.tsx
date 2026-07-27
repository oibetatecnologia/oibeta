import React from 'react';
import { Edit, Eye, Plus, Target } from 'lucide-react';
import type { Campaign } from './types';


interface ElectoralCampaignsProps {
  campaigns: Campaign[];
  onCreate: () => void;
  onView: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

/**
 * ElectoralCampaigns
 *
 * Lista de campanhas do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar a tela de campanhas;
 * - exibir estado vazio;
 * - delegar ações para o ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralCampaigns({
  campaigns,
  onCreate,
  onView,
  onEdit,
  getStatusBadge,
}: ElectoralCampaignsProps) {
  return (
  <div className="space-y-6 animate-fade-in" id="electoral-tab-campaigns">
    
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Campanhas Ativas</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Listagem e governança de campanhas eleitorais sob seu portfólio.</p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Nova Campanha
      </button>
    </div>

    {campaigns.length === 0 ? (
      <div className="border border-[var(--border-color)] rounded-xl p-12 text-center bg-[var(--bg-card)] max-w-xl mx-auto space-y-4">
        <Target className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto" />
        <div>
          <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Ainda não há campanhas eleitorais cadastradas para esta organização corporativa.</p>
        </div>
        <button 
          onClick={onCreate}
          className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          Registrar Primeira Campanha
        </button>
      </div>
    ) : (
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[var(--border-color)]/25 text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-mono border-b border-[var(--border-color)]">
              <tr>
                <th className="p-4 font-bold">Nome</th>
                <th className="p-4 font-bold">Candidato / Partido</th>
                <th className="p-4 font-bold">Cargo</th>
                <th className="p-4 font-bold">Ano</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/50 text-[var(--text-main)]">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-[var(--border-color)]/5 transition duration-150">
                  <td className="p-4 font-bold">{camp.name}</td>
                  <td className="p-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold block">{camp.candidateName || 'NÃO ESPECIFICADO'}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">{camp.party || 'SEM PARTIDO'}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-medium text-[10.5px] uppercase text-rose-400">{camp.office}</td>
                  <td className="p-4 font-mono">{camp.electionYear || '2026'}</td>
                  <td className="p-4">{getStatusBadge(camp.status)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onView(camp)}
                        className="p-1.5 bg-[var(--border-color)]/30 hover:bg-[var(--border-color)]/50 rounded-md text-[var(--text-main)] transition cursor-pointer"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(camp)}
                        className="p-1.5 bg-[var(--border-color)]/30 hover:bg-[var(--blue-accent)]/10 hover:text-[var(--blue-accent)] rounded-md text-[var(--text-main)] transition cursor-pointer"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

  </div>
  );
}
