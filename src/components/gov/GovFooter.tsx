import React from 'react';

interface GovFooterProps {
  workspaceId: string;
  healthLabel: string;
}

/**
 * GovFooter
 *
 * Rodapé oficial do Beta Gov.
 */
export default function GovFooter({
  workspaceId,
  healthLabel,
}: GovFooterProps) {
  return (
    <div className="pt-4 mt-6 border-t border-[var(--border-color)]/30 text-[10px] font-mono text-[var(--text-secondary)] flex flex-col sm:flex-row items-center justify-between gap-1 select-none">
      <span>Workspace Gov ID: #{workspaceId}</span>
      <span>Beta Gov v1.0.0 — {healthLabel}</span>
    </div>
  );
}
