import React, { useMemo } from 'react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import useClientsWorkspace from '../../hooks/useClientsWorkspace';
import useCustomerPortfolioIntelligence from '../../hooks/useCustomerPortfolioIntelligence';
import useFinanceIntelligence from '../../hooks/useFinanceIntelligence';
import useExecutiveReport from '../../hooks/useExecutiveReport';
import ExecutiveReportCommandCenter from '../reports/ExecutiveReportCommandCenter';

/**
 * ReportsWorkspace
 * Centro de relatórios executivos consolidado da Oi Beta.
 */
export default function ReportsWorkspace() {
  const workspace = useWorkspace();
  const clientsWorkspace = useClientsWorkspace();
  const customerPortfolio = useCustomerPortfolioIntelligence(clientsWorkspace.clientsList);
  const finance = useFinanceIntelligence(clientsWorkspace.clientsList);
  const snapshot = useExecutiveReport({
    organizationName: workspace.tenant.user?.name ? `Oi Beta · ${workspace.tenant.user.name}` : 'Oi Beta',
    projects: workspace.projects.projects,
    tasks: workspace.tasks.tasks,
    decisions: workspace.decisions.decisions,
    memories: workspace.memories.memories,
    opportunities: clientsWorkspace.radarOpportunities,
    customers: customerPortfolio,
    finance,
  });
  const existingTaskTitles = useMemo(
    () => new Set(workspace.tasks.tasks.map((task) => task.title.trim().toLowerCase())),
    [workspace.tasks.tasks],
  );

  return (
    <ExecutiveReportCommandCenter
      snapshot={snapshot}
      existingTaskTitles={existingTaskTitles}
      onCreateTask={workspace.tasks.createTask}
      onNavigate={workspace.navigation.setActiveTab}
    />
  );
}
