import React from 'react';
import type { OrganizationUnitStatus } from '../../core/organization/organizationTypes';

interface OrganizationMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  helper: string;
}

export function OrganizationMetricCard({ icon, label, value, helper }: OrganizationMetricCardProps) {
  return (
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">
          {label}
        </span>
        <span className="text-lg font-black text-[var(--text-main)] block mt-1 truncate">
          {value}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
          {helper}
        </span>
      </div>
    </div>
  );
}

interface OrganizationStatusBadgeProps {
  status: OrganizationUnitStatus;
  label: string;
}

export function OrganizationStatusBadge({ status, label }: OrganizationStatusBadgeProps) {
  const className =
    status === 'active'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : status === 'implementation'
      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      : status === 'paused'
      ? 'bg-slate-500/10 text-slate-300 border-slate-500/20'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  return (
    <span className={`inline-flex items-center text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  );
}

interface OrganizationChecklistItemProps {
  label: string;
  done?: boolean;
}

export function OrganizationChecklistItem({ label, done = false }: OrganizationChecklistItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
      <span className="text-[11px] text-[var(--text-main)] font-semibold">{label}</span>
      <span className={`text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border ${
        done
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      }`}>
        {done ? 'OK' : 'Pendente'}
      </span>
    </div>
  );
}
