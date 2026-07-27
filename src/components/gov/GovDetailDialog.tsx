import React from 'react';
import { X } from 'lucide-react';

interface GovDetailDialogProps {
  detail: any;
  detailType: string;
  onClose: () => void;
  formatStatus: (status: string) => string;
}

/**
 * GovDetailDialog
 *
 * Modal de detalhamento do Beta Gov.
 */
export default function GovDetailDialog({
  detail,
  detailType,
  onClose,
  formatStatus,
}: GovDetailDialogProps) {
  if (!detail) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-lg rounded-xl overflow-hidden shadow-xl animate-scale-in">
        <div className="p-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-main)] uppercase font-mono tracking-wider">
            Detalhamento Estratégico - {detailType}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--border-color)]/30 rounded text-[var(--text-secondary)] hover:text-[var(--text-main)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">ID do Registro</span>
            <p className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-main)] p-2 rounded border border-[var(--border-color)]">
              {detail.id}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">Nome / Identificação</span>
            <p className="text-sm font-bold text-[var(--text-main)]">
              {detail.name || detail.indicatorName || detail.description || detail.metadata?.descricaoMeta}
            </p>
          </div>

          {detail.description && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">Descrição Técnica</span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{detail.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">Status do Registro</span>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400">
                  {formatStatus(detail.status)}
                </span>
              </div>
            </div>

            {detail.metadata && Object.keys(detail.metadata).map(key => (
              <div key={key} className="space-y-1">
                <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold capitalize">{key}</span>
                <p className="text-xs text-[var(--text-main)]">{detail.metadata[key]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Concluir Leitura
          </button>
        </div>
      </div>
    </div>
  );
}
