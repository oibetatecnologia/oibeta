import React from 'react';
import { AlertTriangle, Banknote, CalendarClock, CircleDollarSign, Percent, TrendingUp } from 'lucide-react';
import type { FinanceIntelligenceSummary } from '../../core/finance/FinanceIntelligenceTypes';

export default function FinanceKpiGrid({ summary }: { summary: FinanceIntelligenceSummary }) {
  const cards = [
    ['MRR contratado', money(summary.recurringRevenue), 'Receita mensal', <CircleDollarSign className="w-4 h-4" />],
    ['Recebido', money(summary.receivedRevenue), `${summary.collectionRate}% de recebimento`, <Banknote className="w-4 h-4" />],
    ['Em aberto', money(summary.openRevenue), 'Pendente + vencido', <TrendingUp className="w-4 h-4" />],
    ['Vencido', money(summary.overdueRevenue), `${summary.delinquencyRate}% de inadimplência`, <AlertTriangle className="w-4 h-4" />],
    ['Previsão 30 dias', money(summary.forecast30Days), 'Cobranças previstas', <CalendarClock className="w-4 h-4" />],
    ['Eficiência', `${summary.collectionRate}%`, 'Índice de cobrança', <Percent className="w-4 h-4" />],
  ];
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">{cards.map(([label, value, helper, icon]) => <div key={String(label)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex items-center gap-2 text-emerald-300">{icon}<span className="text-[9px] uppercase font-mono tracking-widest font-black">{label}</span></div><strong className="block text-xl font-black text-[var(--text-main)] mt-2">{value}</strong><span className="text-[10px] text-[var(--text-secondary)]">{helper}</span></div>)}</div>;
}
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
