import React from 'react';
import type { CommercialOpportunity } from '../../core/commercial/OpportunityTypes';

export default function ExecutiveOpportunitySpotlight({ opportunities, onOpen }: { opportunities: CommercialOpportunity[]; onOpen: () => void }) {
  return <div className="space-y-2">{opportunities.length === 0 ? <p className="text-xs text-[var(--text-secondary)]">O Radar ainda não possui oportunidades ativas.</p> : opportunities.map((item) => {
    const match = item.analysis?.bestMatches?.[0];
    return <button type="button" onClick={onOpen} key={item.id} className="w-full text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3 hover:border-blue-500/30 transition-colors">
      <div className="flex justify-between gap-3"><span className="text-xs font-black text-[var(--text-main)] line-clamp-1">{item.title}</span><span className="text-xs font-black text-blue-300 shrink-0">{match?.score ?? 0}%</span></div>
      <div className="text-[10px] text-[var(--text-secondary)] mt-1">{match?.serviceName ?? 'Produto ainda não identificado'} · {item.buyerName}</div>
    </button>;
  })}</div>;
}
