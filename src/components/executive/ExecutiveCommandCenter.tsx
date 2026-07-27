import React from 'react';
import { Activity, ListChecks, Radar } from 'lucide-react';
import type { ExecutiveActionItem, ExecutiveCommandSummary } from '../../core/executive/ExecutiveCommandTypes';
import SeverityBadge from '../shared/SeverityBadge';
import ExecutiveKpiStrip from './ExecutiveKpiStrip';
import ExecutiveActionQueue from './ExecutiveActionQueue';
import ExecutiveOpportunitySpotlight from './ExecutiveOpportunitySpotlight';
import ExecutiveTaskSpotlight from './ExecutiveTaskSpotlight';

export default function ExecutiveCommandCenter({ summary, creatingId, onOpenTab, onCreateTask }: {
  summary: ExecutiveCommandSummary;
  creatingId: string | null;
  onOpenTab: (tab: string) => void;
  onCreateTask: (item: ExecutiveActionItem) => void;
}) {
  return <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 lg:p-6 space-y-5">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div className="flex gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center"><Activity className="w-5 h-5" /></div><div><span className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-300">Centro de comando executivo</span><h2 className="text-lg font-black text-[var(--text-main)] mt-1">Saúde operacional: {summary.healthScore}%</h2><p className="text-xs text-[var(--text-secondary)] mt-1">{summary.headline}</p></div></div>
      <SeverityBadge severity={summary.severity} />
    </div>
    <ExecutiveKpiStrip summary={summary} />
    <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-5">
      <div><div className="flex items-center gap-2 mb-3"><ListChecks className="w-4 h-4 text-indigo-300" /><h3 className="text-sm font-black text-[var(--text-main)]">Fila de ações prioritárias</h3></div><ExecutiveActionQueue items={summary.actionQueue} creatingId={creatingId} onOpen={onOpenTab} onCreateTask={onCreateTask} /></div>
      <div className="space-y-5"><div><div className="flex items-center gap-2 mb-3"><Radar className="w-4 h-4 text-blue-300" /><h3 className="text-sm font-black text-[var(--text-main)]">Oportunidades em destaque</h3></div><ExecutiveOpportunitySpotlight opportunities={summary.opportunitySpotlight} onOpen={() => onOpenTab('commercial_radar')} /></div><div><div className="flex items-center gap-2 mb-3"><ListChecks className="w-4 h-4 text-indigo-300" /><h3 className="text-sm font-black text-[var(--text-main)]">Próximos vencimentos</h3></div><ExecutiveTaskSpotlight tasks={summary.taskSpotlight} onOpen={() => onOpenTab('tasks')} /></div></div>
    </div>
  </section>;
}
