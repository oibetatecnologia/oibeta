import React from 'react';
import type { ImplementationIntelligenceSummary } from '../../core/implementations/ImplementationIntelligenceTypes';

export default function ImplementationStageBoard({ summary }: { summary: ImplementationIntelligenceSummary }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div>
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">Fluxo de entrega</span>
        <h3 className="text-base font-black text-[var(--text-main)] mt-1">Distribuição por etapa</h3>
      </div>
      <div className="space-y-3">
        {summary.stages.map((stage) => (
          <div key={stage.status}>
            <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
              <span className="font-bold text-[var(--text-main)]">{stage.label}</span>
              <span className="text-[var(--text-secondary)]">{stage.count} · {stage.percentage}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-[var(--bg-main)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--blue-accent)]" style={{ width: `${stage.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
