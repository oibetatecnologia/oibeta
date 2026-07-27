import React from 'react';
import type { ExecutiveSeverity } from '../../core/executive/ExecutiveCommandTypes';

const styles: Record<ExecutiveSeverity, string> = {
  healthy: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  attention: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  critical: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

const labels: Record<ExecutiveSeverity, string> = {
  healthy: 'Saudável',
  attention: 'Atenção',
  critical: 'Crítico',
};

export default function SeverityBadge({ severity }: { severity: ExecutiveSeverity }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${styles[severity]}`}>{labels[severity]}</span>;
}
