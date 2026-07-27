import React from 'react';
import { Edit, Eye, Plus, Users } from 'lucide-react';
import type { Coordinator } from './types';


interface ElectoralCoordinatorsProps {
  coordinators: Coordinator[];
  onCreate: () => void;
  onView: (coordinator: Coordinator) => void;
  onEdit: (coordinator: Coordinator) => void;
}

/**
 * ElectoralCoordinators
 *
 * Tela de coordenadores do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar coordenadores;
 * - exibir estado vazio;
 * - delegar ações para o ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralCoordinators({
  coordinators,
  onCreate,
  onView,
  onEdit,
}: ElectoralCoordinatorsProps) {
  return (
  <div className="space-y-6 animate-fade-in" id="electoral-tab-coordinators">
    
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Equipes de Coordenação</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Visualização, cadastro e vinculação de Coordenadores em campanhas regionais.</p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Cadastrar Coordenador
      </button>
    </div>

    {coordinators.length === 0 ? (
      <div className="border border-[var(--border-color)] rounded-xl p-12 text-center bg-[var(--bg-card)] max-w-xl mx-auto space-y-4">
        <Users className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto" />
        <div>
          <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Não existem coordenadores operando no sistema de mídias Oi Beta.</p>
        </div>
        <button 
          onClick={onCreate}
          className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          Registrar Primeiro Coordenador
        </button>
      </div>
    ) : (
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[var(--border-color)]/25 text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-mono border-b border-[var(--border-color)]">
              <tr>
                <th className="p-4 font-bold">Nome</th>
                <th className="p-4 font-bold">Contato/E-mail</th>
                <th className="p-4 font-bold">Nível</th>
                <th className="p-4 font-bold">Território Associado</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]/50 text-[var(--text-main)]">
              {coordinators.map((coor) => (
                <tr key={coor.id} className="hover:bg-[var(--border-color)]/5 transition duration-150">
                  <td className="p-4 font-bold">{coor.name}</td>
                  <td className="p-4 font-sans">
                    <div className="space-y-0.5">
                      <span className="block">{coor.email || 'Sem e-mail'}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-mono">{coor.phone || 'Sem telefone'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[var(--border-color)]/40 rounded font-semibold text-[var(--text-main)] uppercase border border-[var(--border-color)]/60">
                      {coor.level}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-rose-400 font-sans">{coor.assignedTerritory || 'TODO MUNICÍPIO'}</td>
                  <td className="p-4">
                    {coor.status === 'ACTIVE' ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">Ativo</span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">{coor.status}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onView(coor)}
                        className="p-1.5 bg-[var(--border-color)]/30 hover:bg-[var(--border-color)]/50 rounded-md text-[var(--text-main)] transition cursor-pointer"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(coor)}
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
