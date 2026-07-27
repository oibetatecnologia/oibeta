import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-[var(--blue-accent)] hover:opacity-90 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-[var(--border-color)] p-5">
          <div className="rounded-full bg-amber-500/15 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-main)]">{title}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-main)]"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
