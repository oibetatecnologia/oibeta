import React from 'react';
import { Landmark } from 'lucide-react';

/**
 * GovLoadingState
 *
 * Estado de carregamento oficial do Beta Gov.
 */
export default function GovLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3 font-mono text-xs text-[var(--text-secondary)]">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-t border-b-2 border-indigo-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Landmark className="w-4 h-4 text-indigo-400 animate-pulse" />
        </div>
      </div>
      <span>Carregando dados reais de gestão pública...</span>
    </div>
  );
}
