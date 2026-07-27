import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LicitaLoadingStateProps {
  initializingWorkspace: boolean;
}

export default function LicitaLoadingState({ initializingWorkspace }: LicitaLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      <p className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider animate-pulse">
        {initializingWorkspace ? 'Tracionando infraestrutura do Workspace...' : 'Formatando bases de dados reais...'}
      </p>
    </div>
  );
}
