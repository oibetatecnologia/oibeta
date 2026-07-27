import React from 'react';
import { RefreshCw, UserCheck } from 'lucide-react';

interface ElectoralHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

/**
 * ElectoralHeader
 *
 * Cabeçalho oficial do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar marca, descrição e botão de sincronização;
 * - delegar refresh ao ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralHeader({
  loading,
  onRefresh,
}: ElectoralHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-color)] pb-4 space-y-2 sm:space-y-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-rose-500/10 border border-rose-500/15 text-rose-500 rounded-lg">
            <UserCheck className="w-5 h-5 shrink-0" />
          </span>
          <h2 className="text-xl lg:text-2xl font-black text-[var(--text-main)] font-sans tracking-tight">Beta Electoral™</h2>
          <span className="bg-[var(--blue-accent)]/15 text-[var(--blue-accent)] text-[10px] font-extrabold px-2 py-0.5 rounded border border-[var(--blue-accent)]/20 font-mono">V1.0</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed font-sans max-w-2xl">
          Cockpit Operacional de Inteligência e Governança Eleitoral para Campanhas e Mapeamento Territorial.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-center">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 bg-[var(--bg-card)] hover:bg-[var(--border-color)]/20 border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
          title="Recarregar Dados Reais"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </div>
    </div>
  );
}
