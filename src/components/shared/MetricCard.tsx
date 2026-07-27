import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  emptyLabel?: string;
}

export default function MetricCard({
  label,
  value,
  icon: Icon,
  emptyLabel = 'NO_DATA'
}: MetricCardProps) {
  const isEmpty = value === 0 || value === '0' || value === null || value === undefined || value === '';

  return (
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between shadow-sm hover:border-[var(--blue-accent)]/30 transition duration-150">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider font-mono">{label}</span>
        <Icon className="w-4 h-4 text-rose-500" />
      </div>
      <div className="mt-4 flex items-baseline">
        <span className="text-2xl font-black text-[var(--text-main)] font-sans tracking-tight">
          {isEmpty ? emptyLabel : value}
        </span>
      </div>
    </div>
  );
}
