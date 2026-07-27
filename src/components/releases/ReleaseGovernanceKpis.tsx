import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Rocket } from 'lucide-react';
import type { ReleaseGovernanceSummary } from '../../core/releases/ReleaseGovernanceTypes';

export default function ReleaseGovernanceKpis({ summary }: { summary: ReleaseGovernanceSummary }) {
  const items = [
    ['Prontidão de release', `${summary.score}%`, <Rocket size={18} />],
    ['Projetos aptos', summary.readyProjects, <CheckCircle2 size={18} />],
    ['Projetos bloqueados', summary.blockedProjects, <AlertTriangle size={18} />],
    ['Tarefas vencidas', summary.overdueTasks, <Clock3 size={18} />],
  ] as const;
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{items.map(([label, value, icon]) => <div key={label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4"><div className="text-[var(--cyan-accent)]">{icon}</div><span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block mt-3">{label}</span><strong className="text-2xl font-black text-[var(--text-main)]">{value}</strong></div>)}</div>;
}
