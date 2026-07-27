import React, { useState } from 'react';
import type { FinanceActionItem, FinanceIntelligenceSummary } from '../../core/finance/FinanceIntelligenceTypes';
import FinanceKpiGrid from './FinanceKpiGrid';
import FinanceRiskTable from './FinanceRiskTable';
import FinanceActionQueue from './FinanceActionQueue';

export default function FinanceCommandCenter({ summary, taskTitles, onCreateTask }: { summary: FinanceIntelligenceSummary; taskTitles: string[]; onCreateTask: (title: string) => Promise<unknown> | unknown }) {
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const create = async (action: FinanceActionItem) => { setCreatingId(action.id); try { await onCreateTask(action.taskTitle); } finally { setCreatingId(null); } };
  return <section className="space-y-4"><div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"><span className="text-[10px] uppercase font-mono tracking-[0.22em] text-emerald-300 font-black">Inteligência financeira</span><h2 className="text-xl font-black text-[var(--text-main)] mt-1">Centro de receita, cobrança e previsão</h2><p className="text-xs text-[var(--text-secondary)] mt-2">Consolida receita recorrente, recebimentos, inadimplência, previsão de caixa e prioridades por cliente.</p></div><FinanceKpiGrid summary={summary} /><div className="grid grid-cols-1 2xl:grid-cols-3 gap-4"><div className="2xl:col-span-2"><FinanceRiskTable clients={summary.clients} /></div><FinanceActionQueue actions={summary.actions} existingTaskTitles={taskTitles} onCreateTask={create} creatingId={creatingId} /></div></section>;
}
