import React from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Gauge, Rocket } from 'lucide-react';
import type { ImplementationIntelligenceSummary } from '../../core/implementations/ImplementationIntelligenceTypes';

export default function ImplementationKpiGrid({ summary }: { summary: ImplementationIntelligenceSummary }) {
  const metrics = [
    { label: 'Saúde da entrega', value: `${summary.healthScore}%`, helper: summary.riskLevel, icon: <Gauge className="w-4 h-4" /> },
    { label: 'Em andamento', value: summary.active, helper: `${summary.total} no total`, icon: <Rocket className="w-4 h-4" /> },
    { label: 'Progresso médio', value: `${summary.averageProgress}%`, helper: `${summary.averageReadiness}% prontidão`, icon: <Clock3 className="w-4 h-4" /> },
    { label: 'Bloqueadas', value: summary.blocked, helper: `${summary.waitingClient} aguardando cliente`, icon: <AlertTriangle className="w-4 h-4" /> },
    { label: 'Go-lives em 30 dias', value: summary.projectedGoLives30Days, helper: `${summary.overdue} atrasados`, icon: <CalendarClock className="w-4 h-4" /> },
    { label: 'Concluídas', value: summary.completed, helper: 'Transferidas para operação', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
      {metrics.map((metric) => (
        <article key={metric.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">{metric.icon}<span className="text-[10px] font-black uppercase tracking-wider">{metric.label}</span></div>
          <div className="text-2xl font-black text-[var(--text-main)] mt-3">{metric.value}</div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 capitalize">{metric.helper}</p>
        </article>
      ))}
    </section>
  );
}
