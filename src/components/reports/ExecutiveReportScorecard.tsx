import React from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ExecutiveReportSnapshot } from '../../core/reports/ExecutiveReportTypes';

export default function ExecutiveReportScorecard({ snapshot }: { snapshot: ExecutiveReportSnapshot }) {
  const Icon = snapshot.risk === 'saudável' ? CheckCircle2 : snapshot.risk === 'atenção' ? Activity : AlertTriangle;
  return <div className="grid lg:grid-cols-[260px_1fr] gap-4">
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><div className="flex items-center justify-between"><Icon className="w-7 h-7 text-[var(--blue-accent)]"/><span className="text-xs font-bold uppercase text-[var(--text-secondary)]">{snapshot.risk}</span></div><div className="text-5xl font-black text-[var(--text-main)] mt-5">{snapshot.executiveScore}%</div><p className="text-xs text-[var(--text-secondary)] mt-1">Índice executivo geral</p></div>
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><h4 className="font-extrabold text-[var(--text-main)]">Leitura da Beta</h4><p className="text-sm text-[var(--text-secondary)] mt-2">{snapshot.headline}</p><div className="mt-4 grid sm:grid-cols-3 gap-3">{snapshot.recommendations.map((item, index) => <div key={item} className="rounded-xl bg-[var(--bg-sidebar)] p-3 text-xs text-[var(--text-main)]"><strong className="block text-[var(--blue-accent)] mb-1">Prioridade {index + 1}</strong>{item}</div>)}</div></div>
  </div>;
}
