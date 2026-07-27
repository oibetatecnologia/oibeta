import React from 'react';
import { AlertTriangle, HeartPulse, TrendingUp } from 'lucide-react';
import type { CustomerPortfolioSummary } from '../../core/customerSuccess/CustomerPortfolioTypes';

interface Props {
  summary: CustomerPortfolioSummary;
  onOpenClients: () => void;
}

export default function CustomerPortfolioExecutiveSnapshot({ summary, onOpenClients }: Props) {
  return (
    <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.22em] text-purple-300 font-black">Customer Success</span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Saúde da carteira contratada</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-2">Visão executiva de retenção, receita em risco e expansão.</p>
        </div>
        <button type="button" onClick={onOpenClients} className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-black text-purple-200 hover:bg-purple-500/15">Abrir carteira</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <Metric icon={<HeartPulse className="w-4 h-4" />} label="Saúde" value={`${summary.portfolioHealth}%`} helper={summary.riskLevel} />
        <Metric icon={<AlertTriangle className="w-4 h-4" />} label="Em risco" value={summary.criticalClients + summary.attentionClients} helper={formatCurrency(summary.revenueAtRisk)} />
        <Metric icon={<TrendingUp className="w-4 h-4" />} label="Expansão" value={summary.expansionReadyClients} helper="clientes preparados" />
      </div>
    </section>
  );
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3"><div className="flex items-center gap-2 text-purple-300">{icon}<span className="text-[9px] uppercase font-mono tracking-widest font-black">{label}</span></div><strong className="block text-xl font-black text-[var(--text-main)] mt-2">{value}</strong><span className="block text-[10px] text-[var(--text-secondary)] mt-1 capitalize">{helper}</span></div>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
}
