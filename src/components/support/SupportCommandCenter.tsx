import React, { useMemo, useState } from 'react';
import type { Task } from '../../types';
import type { SupportIntelligenceSummary, SupportKnowledgeSuggestion, SupportPriorityAction } from '../../core/support/SupportIntelligenceTypes';
import SupportKpiGrid from './SupportKpiGrid';
import SupportSlaBoard from './SupportSlaBoard';
import SupportClientRiskTable from './SupportClientRiskTable';
import SupportKnowledgePanel from './SupportKnowledgePanel';
import SupportActionQueue from './SupportActionQueue';

export default function SupportCommandCenter({ summary, tasks, createTask }: { summary: SupportIntelligenceSummary; tasks: Task[]; createTask: (title: string) => Promise<void> }) {
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const existingTitles = useMemo(() => new Set(tasks.map((task) => task.title.trim().toLocaleLowerCase('pt-BR'))), [tasks]);
  const create = async (item: SupportPriorityAction | SupportKnowledgeSuggestion) => { setCreatingId(item.id); try { await createTask(item.taskTitle); } finally { setCreatingId(null); } };
  return <div className="space-y-6"><SupportKpiGrid summary={summary} /><div className="grid grid-cols-1 2xl:grid-cols-2 gap-6"><SupportSlaBoard items={summary.ticketItems} /><SupportActionQueue items={summary.priorityActions} existingTitles={existingTitles} onCreateTask={create} creatingId={creatingId} /></div><SupportClientRiskTable items={summary.clientRisks} /><SupportKnowledgePanel items={summary.knowledgeSuggestions} existingTitles={existingTitles} onCreateTask={create} creatingId={creatingId} /></div>;
}
