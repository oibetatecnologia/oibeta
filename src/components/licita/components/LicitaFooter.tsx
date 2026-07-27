import React from 'react';

interface LicitaFooterProps {
  workspaceId: string;
  recordsCount: number;
}

export default function LicitaFooter({ workspaceId, recordsCount }: LicitaFooterProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--border-color)] pt-4 text-[10px] font-mono text-[var(--text-secondary)]">
      <span>Beta Licita™ • Workspace operacional de compras públicas</span>
      <span className="truncate">Workspace: {workspaceId} • Registros carregados: {recordsCount}</span>
    </div>
  );
}
