import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Headphones, ShieldAlert, TimerReset } from 'lucide-react';
import type { SupportIntelligenceSummary } from '../../core/support/SupportIntelligenceTypes';

export default function SupportKpiGrid({ summary }: { summary: SupportIntelligenceSummary }) {
  const items = [
    { label: 'Saúde do suporte', value: `${summary.healthScore}%`, helper: 'Índice consolidado', icon: <Headphones className="w-4 h-4" /> },
    { label: 'Ativos', value: summary.activeTickets, helper: `${summary.totalTickets} chamados`, icon: <Clock3 className="w-4 h-4" /> },
    { label: 'SLA violado', value: summary.slaBreaches, helper: 'Exigem recuperação', icon: <ShieldAlert className="w-4 h-4" /> },
    { label: 'Críticos', value: summary.criticalOpenTickets, helper: 'Prioridade máxima', icon: <AlertTriangle className="w-4 h-4" /> },
    { label: 'Primeira resposta', value: summary.firstResponseRisk, helper: 'Abertos há 8h+', icon: <TimerReset className="w-4 h-4" /> },
    { label: 'Resolvidos', value: `${summary.averageResolutionPotential}%`, helper: `${summary.resolvedTickets} concluídos`, icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">{items.map((item) => <div key={item.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 flex items-center justify-center">{item.icon}</div><span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[var(--text-secondary)] font-black block mt-4">{item.label}</span><strong className="text-2xl font-black text-[var(--text-main)] block mt-1">{item.value}</strong><span className="text-xs text-[var(--text-secondary)]">{item.helper}</span></div>)}</div>;
}
