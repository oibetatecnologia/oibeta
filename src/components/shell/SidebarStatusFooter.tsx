import React from 'react';

interface SidebarStatusFooterProps {
  databaseLabel?: string;
  nodeLabel?: string;
}

/**
 * SidebarStatusFooter
 * Rodapé de status do menu lateral.
 *
 * Responsabilidade:
 * - exibir estado operacional do nó/local;
 * - exibir status de integração da base;
 * - não buscar dados;
 * - não executar regra de negócio.
 */
export default function SidebarStatusFooter({
  databaseLabel = 'SUPABASE DB: INTEGRADO',
  nodeLabel = 'Oi Beta GovTech Node',
}: SidebarStatusFooterProps) {
  return (
    <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-card)]/15 text-[10px] space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[var(--text-main)] font-semibold">{nodeLabel}</span>
      </div>
      <span className="text-[9px] text-[var(--text-secondary)] block font-mono">{databaseLabel}</span>
    </div>
  );
}
