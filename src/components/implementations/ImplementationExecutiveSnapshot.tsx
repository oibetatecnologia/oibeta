import React from 'react';
import { ArrowRight, Rocket } from 'lucide-react';
import type { ImplementationIntelligenceSummary } from '../../core/implementations/ImplementationIntelligenceTypes';

export default function ImplementationExecutiveSnapshot({ summary, onOpen }: { summary: ImplementationIntelligenceSummary; onOpen: () => void }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-[var(--blue-accent)]/10 p-3 text-[var(--cyan-accent)]"><Rocket className="w-5 h-5" /></div><div><span className="text-[10px] uppercase font-mono tracking-[0.22em] text-[var(--text-secondary)] font-black">Entrega ao cliente</span><h3 className="text-base font-black text-[var(--text-main)] mt-1">Implantações em {summary.healthScore}% de saúde</h3><p className="text-xs text-[var(--text-secondary)] mt-1">{summary.blocked} bloqueadas · {summary.overdue} atrasadas · {summary.projectedGoLives30Days} go-lives em 30 dias</p></div></div>
        <div className="flex flex-wrap items-center gap-4"><div><div className="text-[10px] uppercase text-[var(--text-secondary)] font-black">Progresso médio</div><div className="text-xl font-black text-[var(--text-main)]">{summary.averageProgress}%</div></div><button type="button" onClick={onOpen} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-black text-[var(--text-main)] hover:border-[var(--blue-accent)]/50">Abrir implantações <ArrowRight className="w-3.5 h-3.5" /></button></div>
      </div>
    </section>
  );
}
