import React from 'react';
import type { ReleaseGovernanceSummary } from '../../core/releases/ReleaseGovernanceTypes';
import type { Task } from '../../types';
import ReleaseGovernanceKpis from './ReleaseGovernanceKpis';
import ReleaseGateBoard from './ReleaseGateBoard';
import ReleaseCandidateTable from './ReleaseCandidateTable';
import ReleaseActionQueue from './ReleaseActionQueue';

export default function ReleaseGovernanceCommandCenter({ summary, tasks, onCreateTask }: { summary: ReleaseGovernanceSummary; tasks: Task[]; onCreateTask: (title: string, description: string) => Promise<void> }) {
  return <section className="space-y-4"><div><span className="text-[10px] uppercase font-mono font-black text-[var(--cyan-accent)]">Governança de entrega</span><h2 className="text-xl font-black text-[var(--text-main)] mt-1">Centro de Release e Qualidade</h2><p className="text-sm text-[var(--text-secondary)] mt-1">Consolidação de gates técnicos, riscos, candidatos e ações necessárias para publicar com segurança.</p></div><ReleaseGovernanceKpis summary={summary} /><ReleaseGateBoard gates={summary.gates} /><ReleaseCandidateTable candidates={summary.candidates} /><ReleaseActionQueue actions={summary.actions} tasks={tasks} onCreateTask={onCreateTask} /></section>;
}
