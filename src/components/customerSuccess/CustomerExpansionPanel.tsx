import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { CustomerPortfolioClientSnapshot } from '../../core/customerSuccess/CustomerPortfolioTypes';

export default function CustomerExpansionPanel({ snapshots }: { snapshots: CustomerPortfolioClientSnapshot[] }) {
  const candidates = snapshots.filter((item) => item.expansionPotential >= 60).sort((a, b) => b.expansionPotential - a.expansionPotential).slice(0, 6);
  return <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"><div className="flex items-center gap-2 text-emerald-300"><TrendingUp className="w-5 h-5"/><span className="text-[10px] uppercase font-mono tracking-[0.22em] font-black">Expansão da carteira</span></div><h2 className="text-lg font-black text-[var(--text-main)] mt-2">Clientes com espaço para novos produtos</h2><div className="space-y-3 mt-4">{candidates.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Ainda não há clientes com prontidão suficiente para expansão.</p>}{candidates.map((item) => <div key={item.clientId} className="rounded-xl border border-emerald-500/15 bg-[var(--bg-card)] p-3"><div className="flex items-center justify-between gap-3"><div><strong className="text-sm text-[var(--text-main)]">{item.clientName}</strong><span className="block text-[10px] text-[var(--text-secondary)] mt-1">{item.activeProducts} produto(s) ativo(s) • saúde {item.healthScore}%</span></div><strong className="text-emerald-300">{item.expansionPotential}%</strong></div></div>)}</div></section>;
}
