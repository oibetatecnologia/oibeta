import React, { useState } from 'react';
import type { ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import type { CustomerPortfolioAction } from '../../core/customerSuccess/CustomerPortfolioTypes';
import useCustomerPortfolioIntelligence from '../../hooks/useCustomerPortfolioIntelligence';
import CustomerPortfolioKpis from './CustomerPortfolioKpis';
import CustomerRiskTable from './CustomerRiskTable';
import CustomerPriorityActions from './CustomerPriorityActions';
import CustomerExpansionPanel from './CustomerExpansionPanel';

interface Props { clients: ClientsWorkspaceClient[]; existingTaskTitles: string[]; onCreateTask: (title: string) => Promise<unknown> | unknown; }

export default function CustomerPortfolioCommandCenter({ clients, existingTaskTitles, onCreateTask }: Props) {
  const summary = useCustomerPortfolioIntelligence(clients);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const handleCreate = async (action: CustomerPortfolioAction) => { setCreatingId(action.id); try { await onCreateTask(action.taskTitle); } finally { setCreatingId(null); } };

  return <div className="space-y-5"><section className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6"><span className="text-[10px] uppercase font-mono tracking-[0.28em] text-purple-300 font-black">Beta / Customer Success</span><h2 className="text-2xl font-black text-[var(--text-main)] mt-2">Centro de saúde e expansão da carteira</h2><p className="text-sm text-[var(--text-secondary)] mt-2 max-w-4xl">Acompanha risco de retenção, receita recorrente, evolução da implantação, relacionamento e oportunidades de expansão dos clientes contratados.</p></section><CustomerPortfolioKpis summary={summary}/><div className="grid grid-cols-1 2xl:grid-cols-3 gap-5"><div className="2xl:col-span-2"><CustomerPriorityActions actions={summary.priorityActions} existingTaskTitles={existingTaskTitles} creatingId={creatingId} onCreate={(action) => void handleCreate(action)}/></div><CustomerExpansionPanel snapshots={summary.snapshots}/></div><CustomerRiskTable snapshots={summary.snapshots}/></div>;
}
