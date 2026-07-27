import React from 'react';
import { AlertTriangle, BarChart3, Lightbulb } from 'lucide-react';
import type { ProductPortfolioSummary } from '../../core/products/ProductPortfolioTypes';
export default function ProductPortfolioInsights({ summary }: { summary: ProductPortfolioSummary }) {
  const insights = [
    { icon: BarChart3, title: 'Concentração de demanda', value: `${summary.concentrationRisk}%`, text: summary.concentrationRisk >= 55 ? 'A demanda está concentrada em poucos produtos; diversifique a prospecção.' : 'A demanda está distribuída de forma aceitável.' },
    { icon: AlertTriangle, title: 'Produtos sem tração', value: summary.productsWithoutTraction, text: 'Itens sem oportunidades e sem contratação devem ser reavaliados.' },
    { icon: Lightbulb, title: 'Prontidão média', value: `${summary.averageReadiness}%`, text: 'Acelere os produtos com demanda real e menor lacuna de entrega.' },
  ];
  return <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">{insights.map(({ icon: Icon, title, value, text }) => <div key={title} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><Icon className="w-4 h-4 text-emerald-300"/><div className="mt-3 flex items-end justify-between gap-3"><h3 className="text-sm font-black text-[var(--text-main)]">{title}</h3><strong className="text-xl font-black text-[var(--text-main)]">{value}</strong></div><p className="text-xs text-[var(--text-secondary)] mt-2">{text}</p></div>)}</section>;
}
