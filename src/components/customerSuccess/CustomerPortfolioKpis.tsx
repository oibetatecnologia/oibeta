import React from 'react';
import { AlertTriangle, CircleDollarSign, HeartPulse, PackageCheck, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import type { CustomerPortfolioSummary } from '../../core/customerSuccess/CustomerPortfolioTypes';

export default function CustomerPortfolioKpis({ summary }: { summary: CustomerPortfolioSummary }) {
  const items = [
    { label: 'Saúde da carteira', value: `${summary.portfolioHealth}%`, helper: summary.riskLevel, icon: <HeartPulse className="w-4 h-4" /> },
    { label: 'Clientes acompanhados', value: summary.trackedClients, helper: `${summary.healthyClients} saudáveis`, icon: <Users className="w-4 h-4" /> },
    { label: 'Clientes críticos', value: summary.criticalClients, helper: `${summary.attentionClients} em atenção`, icon: <AlertTriangle className="w-4 h-4" /> },
    { label: 'Receita recorrente', value: formatCurrency(summary.monthlyRecurringRevenue), helper: 'mensal contratada', icon: <CircleDollarSign className="w-4 h-4" /> },
    { label: 'Receita em risco', value: formatCurrency(summary.revenueAtRisk), helper: 'clientes não saudáveis', icon: <ShieldCheck className="w-4 h-4" /> },
    { label: 'Implantação média', value: `${summary.averageImplementationProgress}%`, helper: 'carteira operacional', icon: <PackageCheck className="w-4 h-4" /> },
    { label: 'Expansão', value: summary.expansionReadyClients, helper: 'clientes preparados', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3">{items.map((item) => <div key={item.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex items-center gap-2 text-[var(--blue-accent)]">{item.icon}<span className="text-[9px] uppercase font-mono tracking-widest font-black">{item.label}</span></div><strong className="block text-xl font-black text-[var(--text-main)] mt-3">{item.value}</strong><span className="block text-[10px] text-[var(--text-secondary)] mt-1 capitalize">{item.helper}</span></div>)}</div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
}
