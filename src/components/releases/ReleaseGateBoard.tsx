import React from 'react';
import type { ReleaseGate } from '../../core/releases/ReleaseGovernanceTypes';

const labels = { saudavel: 'Saudável', atencao: 'Atenção', critico: 'Crítico' };
export default function ReleaseGateBoard({ gates }: { gates: ReleaseGate[] }) {
  return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><h3 className="font-black text-[var(--text-main)]">Gates de liberação</h3><div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">{gates.map((gate) => <div key={gate.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4"><div className="flex justify-between gap-3"><div><strong className="text-sm text-[var(--text-main)]">{gate.label}</strong><p className="text-xs text-[var(--text-secondary)] mt-1">{gate.description}</p></div><span className="text-xs font-black text-[var(--cyan-accent)]">{gate.score}%</span></div><div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden mt-3"><div className="h-full bg-[var(--blue-accent)]" style={{ width: `${gate.score}%` }} /></div><span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] mt-2 block">{labels[gate.status]}</span></div>)}</div></div>;
}
