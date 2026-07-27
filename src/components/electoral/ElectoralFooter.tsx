import React from 'react';

interface ElectoralFooterProps {
  organizationId?: string;
}

/**
 * ElectoralFooter
 *
 * Rodapé oficial do Beta Electoral.
 *
 * Responsabilidade:
 * - exibir identificação da organização;
 * - exibir versão operacional do módulo;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralFooter({
  organizationId,
}: ElectoralFooterProps) {
  return (
    <div className="pt-4 mt-6 border-t border-[var(--border-color)]/30 text-[10px] font-mono text-[var(--text-secondary)] flex flex-col sm:flex-row items-center justify-between gap-1 select-none">
      <span>Organização ID: #{organizationId || 'default-organization'}</span>
      <span>Beta Electoral v1.0.0 — Todos os dados providos de APIs reais</span>
    </div>
  );
}
