import React from 'react';
import { UserCheck } from 'lucide-react';

/**
 * ElectoralLoadingState
 *
 * Estado de carregamento oficial do Beta Electoral.
 */
export default function ElectoralLoadingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3 font-mono text-xs text-[var(--text-secondary)]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-t border-b-2 border-rose-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-rose-500 animate-pulse" />
        </div>
      </div>
      <span>Consumindo repositórios de governança eleitoral...</span>
    </div>
  );
}
