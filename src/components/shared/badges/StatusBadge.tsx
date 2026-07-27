import React from 'react';

export type StatusVariant =
  | 'ACTIVE'
  | 'PENDING'
  | 'COMPLETED'
  | 'CRITICAL'
  | 'WARNING'
  | 'INACTIVE'
  | 'DEFAULT';

export interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const styles: Record<StatusVariant, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/30',
  WARNING: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  INACTIVE: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  DEFAULT: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]',
};

const aliases: Record<string, StatusVariant> = {
  ACTIVE: 'ACTIVE',
  ATIVO: 'ACTIVE',
  PENDING: 'PENDING',
  PENDENTE: 'PENDING',
  COMPLETED: 'COMPLETED',
  CONCLUIDO: 'COMPLETED',
  'CONCLUÍDO': 'COMPLETED',
  CRITICAL: 'CRITICAL',
  CRITICO: 'CRITICAL',
  'CRÍTICO': 'CRITICAL',
  WARNING: 'WARNING',
  ALERTA: 'WARNING',
  INACTIVE: 'INACTIVE',
  INATIVO: 'INACTIVE',
};

export default function StatusBadge({
  status,
  variant,
  className = '',
}: StatusBadgeProps) {
  const normalized = status.trim().toUpperCase();
  const resolved = variant ?? aliases[normalized] ?? 'DEFAULT';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1',
        'text-[10px] font-semibold uppercase tracking-wide',
        styles[resolved],
        className,
      ].join(' ')}
    >
      {status}
    </span>
  );
}
