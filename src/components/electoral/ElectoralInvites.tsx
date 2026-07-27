import React from 'react';
import { Mail, Plus, Trash2 } from 'lucide-react';
import type { Invite } from './types';


interface ElectoralInvitesProps {
  invites: Invite[];
  onCreate: () => void;
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
  onRevoke: (inviteId: string) => void;
  onDelete: (inviteId: string) => void;
  getInviteStatusBadge: (status: string) => React.ReactNode;
}

/**
 * ElectoralInvites
 *
 * Tela de convites do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar convites e contadores;
 * - exibir estado vazio;
 * - delegar ações para o ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralInvites({
  invites,
  onCreate,
  onAccept,
  onDecline,
  onRevoke,
  onDelete,
  getInviteStatusBadge,
}: ElectoralInvitesProps) {
  return (
  <div className="space-y-6 animate-fade-in" id="electoral-tab-invites">
    
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Convites de Campanha (CampaignInviteEngine)</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Emissão de novos links, controle de status das lideranças.</p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Gerar Link de Convite
      </button>
    </div>

    {/* Status counter widgets */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { label: 'Enviados', count: invites.length, colorClass: 'text-rose-500 bg-rose-500/5' },
        { label: 'Pendentes', count: invites.filter(i => i.status === 'PENDING').length, colorClass: 'text-amber-500 bg-amber-500/5' },
        { label: 'Aceitos', count: invites.filter(i => i.status === 'ACCEPTED').length, colorClass: 'text-emerald-500 bg-emerald-500/5' },
        { label: 'Recusados', count: invites.filter(i => i.status === 'DECLINED').length, colorClass: 'text-rose-400 bg-rose-405/5' },
      ].map((stat, idx) => (
        <div key={idx} className={`p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between shadow-xs`}>
          <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase font-mono">{stat.label}</span>
          <span className={`text-base font-black px-2.5 py-1.5 rounded-lg ${stat.colorClass} border border-[var(--border-color)] font-mono`}>{stat.count === 0 ? 'NO_DATA' : stat.count}</span>
        </div>
      ))}
    </div>

    {invites.length === 0 ? (
      <div className="border border-[var(--border-color)] rounded-xl p-12 text-center bg-[var(--bg-card)] max-w-xl mx-auto space-y-4">
        <Mail className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto" />
        <div>
          <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Ainda não há convites registrados por este painel.</p>
        </div>
        <button 
          onClick={onCreate}
          className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          Gerar Primeiro Convite
        </button>
      </div>
    ) : (
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto font-sans text-xs">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[var(--border-color)]/25 text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-mono border-b border-[var(--border-color)]">
              <tr>
                <th className="p-4 font-bold">Destinatário / Contato</th>
                <th className="p-4 font-bold">Perfil Solicitado</th>
                <th className="p-4 font-bold">Link Convite</th>
                <th className="p-4 font-bold">Data Emissão</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Ações Operacionais de Simulação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/50 text-[var(--text-main)]">
              {invites.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--border-color)]/5 transition duration-150">
                  <td className="p-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold block text-[12px]">{inv.email || inv.phone || 'Geral (Sem Destinatário Direto)'}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-semibold text-[10px] text-purple-400 uppercase">{inv.role}</td>
                  <td className="p-4 font-mono">
                    <input 
                      type="text" 
                      readOnly 
                      value={inv.inviteLink || `(Sem link)`} 
                      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-[10px] px-2 py-1 select-all font-mono font-normal w-40 text-[var(--text-secondary)]" 
                    />
                  </td>
                  <td className="p-4 font-mono text-[var(--text-secondary)]">{new Date(inv.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">{getInviteStatusBadge(inv.status)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {inv.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => onAccept(inv.id)}
                            className="text-[10px] font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded hover:bg-emerald-500/20 transition cursor-pointer"
                          >
                            Simular Aceite
                          </button>
                          <button
                            onClick={() => onDecline(inv.id)}
                            className="text-[10px] font-bold px-2 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded hover:bg-rose-500/20 transition cursor-pointer"
                          >
                            Simular Recusa
                          </button>
                          <button
                            onClick={() => onRevoke(inv.id)}
                            className="text-[10px] font-bold px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/15 rounded hover:bg-gray-500/20 transition cursor-pointer"
                          >
                            Revogar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onDelete(inv.id)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded border border-transparent hover:border-rose-500/15 transition cursor-pointer"
                        title="Remover Registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
