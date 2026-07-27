import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ElectoralErrorStateProps {
  error: unknown;
  onRetry: () => void;
}

/**
 * ElectoralErrorState
 *
 * Estado de erro oficial do Beta Electoral.
 */
export default function ElectoralErrorState({
  error,
  onRetry,
}: ElectoralErrorStateProps) {
  const message = error instanceof Error ? error.message : String(error || 'Erro desconhecido.');

  return (
    <div className="p-6 border border-rose-500/10 bg-rose-500/5 rounded-xl text-center space-y-3 max-w-lg mx-auto my-12">
      <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
      <h3 className="text-sm font-bold text-[var(--text-main)]">Sincronização Interrompida</h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer transition"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
