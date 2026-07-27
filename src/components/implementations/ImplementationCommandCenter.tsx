import React from 'react';
import { Bot, Rocket } from 'lucide-react';
import type { ImplementationActionItem, ImplementationIntelligenceSummary } from '../../core/implementations/ImplementationIntelligenceTypes';
import ImplementationKpiGrid from './ImplementationKpiGrid';
import ImplementationStageBoard from './ImplementationStageBoard';
import ImplementationRiskTable from './ImplementationRiskTable';
import ImplementationActionQueue from './ImplementationActionQueue';

export default function ImplementationCommandCenter({ summary, creatingId, onCreateTask }: { summary: ImplementationIntelligenceSummary; creatingId: string | null; onCreateTask: (action: ImplementationActionItem) => void }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_42%)] pointer-events-none" />
        <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div><span className="text-[10px] uppercase font-mono tracking-[0.28em] text-[var(--blue-accent)] font-black">Inteligência de entrega</span><h2 className="text-2xl font-black text-[var(--text-main)] mt-2 flex items-center gap-3"><Rocket className="w-6 h-6 text-[var(--cyan-accent)]" />Centro de Comando de Implantações</h2><p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl">Prontidão, cronograma, bloqueios, go-lives e ações para conduzir cada cliente até a operação real.</p></div>
          <div className="rounded-2xl border border-[var(--blue-accent)]/20 bg-[var(--blue-accent)]/5 p-4 max-w-lg"><div className="flex items-center gap-2 text-sm font-black text-[var(--cyan-accent)]"><Bot className="w-4 h-4" />Leitura da Beta</div><p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{summary.executiveMessage}</p></div>
        </div>
      </section>
      <ImplementationKpiGrid summary={summary} />
      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-5"><div className="2xl:col-span-2"><ImplementationRiskTable summary={summary} /></div><ImplementationStageBoard summary={summary} /></div>
      <ImplementationActionQueue actions={summary.actions} creatingId={creatingId} onCreateTask={onCreateTask} />
    </div>
  );
}
