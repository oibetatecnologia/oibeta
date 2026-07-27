import React from 'react';
import { AlertCircle } from 'lucide-react';

interface GovErrorStateProps {
  onRetry: () => void;
}

/**
 * GovErrorState
 *
 * Estado de erro oficial do Beta Gov.
 */
export default function GovErrorState({
  onRetry,
}: GovErrorStateProps) {
  return (
    <div className="p-6 border border-rose-500/10 bg-rose-500/5 rounded-xl text-center space-y-3 max-w-lg mx-auto my-8">
      <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
      <h3 className="text-sm font-bold text-[var(--text-main)]">Sincronização Gov interrompida</h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        Não foi possível carregar os dados do workspace público no momento.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer transition"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
