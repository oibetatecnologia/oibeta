import React from 'react';
import { Briefcase, RefreshCw } from 'lucide-react';
import WorkspaceHeader from '../../shared/WorkspaceHeader';

interface LicitaHeaderProps {
  workspaceId: string;
  selectedProjectId?: string;
  loading: boolean;
  onSync: () => void;
}

export default function LicitaHeader({
  workspaceId,
  selectedProjectId,
  loading,
  onSync,
}: LicitaHeaderProps) {
  return (
    <WorkspaceHeader
      icon={Briefcase}
      title="Beta Licita™"
      version="Workspace V1"
      description="Sincronizador e painel operacional de compras públicas, certames licitatórios e contratos da administração municipal."
    >
      {selectedProjectId && (
        <div className="hidden sm:block text-right">
          <span className="block text-[10px] font-mono font-bold uppercase text-[var(--text-secondary)]">
            Workspace Selecionado
          </span>
          <span className="block max-w-[200px] truncate text-xs font-semibold text-indigo-400 font-sans">
            {workspaceId}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onSync}
        disabled={loading}
        className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold border border-[var(--border-color)] hover:bg-[var(--bg-card)] rounded-lg transition-all cursor-pointer disabled:opacity-60"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-[var(--text-secondary)] ${loading ? 'animate-spin' : ''}`} />
        Sincronizar
      </button>
    </WorkspaceHeader>
  );
}
