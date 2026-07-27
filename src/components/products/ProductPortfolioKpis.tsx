import React from 'react';
import { Activity, BadgeCheck, Crosshair, Layers3, Radar, ShieldAlert } from 'lucide-react';
import type { ProductPortfolioSummary } from '../../core/products/ProductPortfolioTypes';

export default function ProductPortfolioKpis({ summary }: { summary: ProductPortfolioSummary }) {
  const items = [
    ['Saúde', `${summary.healthScore}%`, summary.health, Activity],
    ['Cobertura', `${summary.marketCoverage}%`, 'produtos com demanda', Radar],
    ['Prioritários', summary.activeProducts, 'vendáveis ou quase', BadgeCheck],
    ['Em risco', summary.productsAtRisk, 'pedem intervenção', ShieldAlert],
    ['Sinais de demanda', summary.totalDemandSignals, 'oportunidades ligadas', Crosshair],
    ['Contratações', summary.totalContracts, 'relações ativas', Layers3],
  ] as const;
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">{items.map(([label, value, helper, Icon]) => <div key={label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><Icon className="w-4 h-4 text-emerald-300"/><span className="block mt-3 text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">{label}</span><strong className="block text-2xl font-black text-[var(--text-main)]">{value}</strong><span className="text-[11px] text-[var(--text-secondary)]">{helper}</span></div>)}</div>;
}
