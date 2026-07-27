import React from 'react';
import type { ReleaseCandidateInsight } from '../../core/releases/ReleaseGovernanceTypes';

export default function ReleaseCandidateTable({ candidates }: { candidates: ReleaseCandidateInsight[] }) {
  return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 overflow-x-auto"><h3 className="font-black text-[var(--text-main)] mb-4">Candidatos a release</h3><table className="w-full text-sm min-w-[760px]"><thead><tr className="text-left text-[10px] uppercase font-mono text-[var(--text-secondary)]"><th className="pb-3">Projeto</th><th>Pontuação</th><th>Pendentes</th><th>Críticas</th><th>Atrasadas</th><th>Decisões</th><th>Recomendação</th></tr></thead><tbody>{candidates.map((item) => <tr key={item.id} className="border-t border-[var(--border-color)]"><td className="py-3 font-bold text-[var(--text-main)]">{item.projectName}</td><td>{item.score}%</td><td>{item.openTasks}</td><td>{item.criticalTasks}</td><td>{item.overdueTasks}</td><td>{item.decisions}</td><td className="text-xs text-[var(--text-secondary)] max-w-[280px]">{item.recommendation}</td></tr>)}</tbody></table></div>;
}
