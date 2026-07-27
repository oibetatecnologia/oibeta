import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Radar } from 'lucide-react';
import type { ExecutiveCommandSummary } from '../../core/executive/ExecutiveCommandTypes';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function ExecutiveKpiStrip({ summary }: { summary: ExecutiveCommandSummary }) {
  const metrics = [
    { label: 'Pipeline ativo', value: currency.format(summary.activePipelineValue), helper: `${currency.format(summary.qualifiedPipelineValue)} qualificado`, icon: Radar },
    { label: 'Compatibilidade', value: `${summary.commercialCompatibility}%`, helper: `${summary.urgentOpportunities} prazo(s) próximo(s)`, icon: CheckCircle2 },
    { label: 'Execução', value: `${summary.executionRate}%`, helper: `${summary.overdueTasks} tarefa(s) vencida(s)`, icon: Clock3 },
    { label: 'Sinais parados', value: summary.staleItems, helper: 'Radar e tarefas sem avanço', icon: AlertTriangle },
  ];

  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{metrics.map(({ label, value, helper, icon: Icon }) => (
    <div key={label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-4">
      <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Icon className="w-4 h-4" /><span className="text-[10px] uppercase tracking-wider font-black">{label}</span></div>
      <div className="text-xl font-black text-[var(--text-main)] mt-2">{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)] mt-1">{helper}</div>
    </div>
  ))}</div>;
}
