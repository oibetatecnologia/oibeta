import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionClassName?: string;
}

export default function EmptyState({
  icon: Icon,
  title = 'Nenhum dado encontrado.',
  description,
  actionLabel,
  onAction,
  actionClassName = 'bg-[var(--blue-accent)] hover:opacity-90 text-white'
}: EmptyStateProps) {
  return (
    <div className="border border-[var(--border-color)] rounded-xl p-12 text-center bg-[var(--bg-card)] max-w-xl mx-auto space-y-4">
      <Icon className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto" />
      <div>
        <h4 className="text-sm font-bold text-[var(--text-main)]">{title}</h4>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className={`${actionClassName} text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer`}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
