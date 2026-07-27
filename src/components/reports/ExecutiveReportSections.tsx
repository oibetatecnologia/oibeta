import React from 'react';
import type { ExecutiveReportSection } from '../../core/reports/ExecutiveReportTypes';
import RiskBadge from '../shared/RiskBadge';

export default function ExecutiveReportSections({ sections }: { sections: ExecutiveReportSection[] }) {
  return <div className="grid xl:grid-cols-2 gap-4">{sections.map((section) => <article key={section.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h4 className="font-extrabold text-[var(--text-main)]">{section.title}</h4><p className="text-xs text-[var(--text-secondary)] mt-1">{section.summary}</p></div><div className="flex items-center gap-2"><RiskBadge level={section.risk === 'saudável' ? 'healthy' : section.risk === 'atenção' ? 'attention' : 'overdue'} /><span className="text-sm font-black text-[var(--text-main)]">{section.score}%</span></div></div>
    <div className="grid sm:grid-cols-3 gap-2">{section.metrics.map((metric) => <div key={metric.id} className="rounded-xl bg-[var(--bg-sidebar)] p-3"><div className="text-lg font-black text-[var(--text-main)]">{metric.formattedValue}</div><div className="text-xs font-bold text-[var(--text-secondary)]">{metric.label}</div><div className="text-[10px] text-[var(--text-secondary)] mt-1">{metric.helper}</div></div>)}</div>
    {section.highlights.map((item) => <p key={item} className="text-xs text-[var(--text-secondary)] border-l-2 border-[var(--blue-accent)] pl-3">{item}</p>)}
  </article>)}</div>;
}
