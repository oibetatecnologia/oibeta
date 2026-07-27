import React from 'react';
import WorkspaceRouter from '../WorkspaceRouter';
import ModuleAccessGuard from '../shell/ModuleAccessGuard';

import EnterpriseDashboardWorkspace from './EnterpriseDashboardWorkspace';
import EnterpriseAreaWorkspace from './EnterpriseAreaWorkspace';
import ProjectsWorkspace from './ProjectsWorkspace';
import SettingsWorkspace from './SettingsWorkspace';
import TasksWorkspace from './TasksWorkspace';
import DecisionsWorkspace from './DecisionsWorkspace';
import MemoriesWorkspace from './MemoriesWorkspace';
import DocumentsWorkspace from './DocumentsWorkspace';
import ClientsWorkspace from './ClientsWorkspace';
import EnterpriseClientsWorkspace from './EnterpriseClientsWorkspace';
import EnterpriseSupportWorkspace from './EnterpriseSupportWorkspace';
import EnterpriseFinanceWorkspace from './EnterpriseFinanceWorkspace';
import EnterpriseImplementationsWorkspace from './EnterpriseImplementationsWorkspace';
import EnterpriseDevelopmentWorkspace from './EnterpriseDevelopmentWorkspace';
import EnterpriseBetaBrainWorkspace from './EnterpriseBetaBrainWorkspace';
import EnterpriseKnowledgeWorkspace from './EnterpriseKnowledgeWorkspace';
import EnterpriseProductsWorkspace from './EnterpriseProductsWorkspace';
import EnterpriseMonitoringWorkspace from './EnterpriseMonitoringWorkspace';
import EnterpriseClientEnvironmentsWorkspace from './EnterpriseClientEnvironmentsWorkspace';
import ClientOrganizationWorkspace from './ClientOrganizationWorkspace';
import ClientProductsWorkspace from './ClientProductsWorkspace';
import ClientUsersWorkspace from './ClientUsersWorkspace';
import ClientSettingsWorkspace from './ClientSettingsWorkspace';
import ClientOnboardingWorkspace from './ClientOnboardingWorkspace';
import ClientAuditWorkspace from './ClientAuditWorkspace';
import ReleaseCandidateWorkspace from './ReleaseCandidateWorkspace';
import PlatformHealthWorkspace from './PlatformHealthWorkspace';
import DeploymentMonitorWorkspace from './DeploymentMonitorWorkspace';
import PilotHomologationWorkspace from './PilotHomologationWorkspace';
import ProvisioningRecoveryWorkspace from './ProvisioningRecoveryWorkspace';
import TenantSecurityWorkspace from './TenantSecurityWorkspace';
import BetaContextSecurityWorkspace from './BetaContextSecurityWorkspace';
import OperationalIncidentsWorkspace from './OperationalIncidentsWorkspace';
import ApiPerformanceWorkspace from './ApiPerformanceWorkspace';
import { OperationalContextResolver } from '../../core/tenants/OperationalContextResolver';
import { ProductAccessService } from '../../core/licensing/ProductAccessService';
import ReportsWorkspace from './ReportsWorkspace';
import AdministrationWorkspace from './AdministrationWorkspace';
import ScheduleWorkspace from './ScheduleWorkspace';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';


interface WorkspaceTabsRouterProps {
  [key: string]: unknown;
}

/**
 * WorkspaceTabsRouter
 * Roteador interno das abas do ManagerPanel.
 *
 * Responsabilidade:
 * - decidir qual workspace interno renderizar;
 * - consumir o estado consolidado via WorkspaceContext;
 * - reduzir o repasse manual de props entre ManagerPanel e Workspaces;
 * - não buscar dados;
 * - não executar regra de negócio.
 */
export default function WorkspaceTabsRouter(_props: WorkspaceTabsRouterProps) {
  const workspace = useWorkspace();

  const { activeTab, setActiveTab } = workspace.navigation;
  const { user } = workspace.tenant;
  const operationalContext = OperationalContextResolver.resolve(user);
  const {
    allModules,
    activeModules,
    activeFeatures,
    isApiError,
    isModulesLoading,
    isModuleActive,
    isCurrentModuleAllowed,
    requiredModule,
  } = workspace.modules;

  const {
    projects,
    selectedProjectId,
    currentProject,
  } = workspace.projects;

  const {
    filteredTasks,
    newTaskTitle,
    setNewTaskTitle,
    handleCreateTaskSubmit,
    onToggleTaskStatus,
    onDeleteTask,
  } = workspace.tasks;

  const {
    objectives,
    newObjectiveTitle,
    setNewObjectiveTitle,
    handleCreateObjectiveSubmit,
    handleToggleObjectiveStatus,
    handleDeleteObjective,
  } = workspace.objectives;


  const accessSnapshot = ProductAccessService.buildSnapshot(user);
  const clientBaseTabs = new Set(['dashboard', 'client_onboarding', 'client_products', 'client_settings', 'client_audit', 'beta_brain', 'memories', 'knowledge', 'decisions']);
  if (operationalContext.role === 'tenant_admin') clientBaseTabs.add('client_users');
  const isContextTabAllowed = operationalContext.isOiBetaMasterAdmin
    ? true
    : clientBaseTabs.has(activeTab) || ProductAccessService.canAccessTab(activeTab, accessSnapshot);

  if (!isContextTabAllowed) {
    return <ModuleAccessGuard allowed={false} requiredModule="permissão do tenant" />;
  }

  if (!isCurrentModuleAllowed) {
    return (
      <ModuleAccessGuard
        allowed={false}
        requiredModule={requiredModule}
      />
    );
  }

  return (
    <>
      {activeTab === 'dashboard' && (operationalContext.isOiBetaMasterAdmin ? <EnterpriseDashboardWorkspace /> : <ClientOrganizationWorkspace />)}

      {activeTab === 'client_onboarding' && <ClientOnboardingWorkspace />}

      {activeTab === 'client_products' && <ClientProductsWorkspace />}

      {activeTab === 'client_users' && <ClientUsersWorkspace />}

      {activeTab === 'client_settings' && <ClientSettingsWorkspace />}

      {activeTab === 'client_audit' && <ClientAuditWorkspace />}

      {activeTab === 'crm' && <ClientsWorkspace />}

      {activeTab === 'enterprise_clients' && <EnterpriseClientsWorkspace />}

      {activeTab === 'implementations' && <EnterpriseImplementationsWorkspace />}

      {activeTab === 'finance' && <EnterpriseFinanceWorkspace />}

      {activeTab === 'development' && <EnterpriseDevelopmentWorkspace />}

      {activeTab === 'support' && <EnterpriseSupportWorkspace />}

      {activeTab === 'beta_brain' && <EnterpriseBetaBrainWorkspace />}

      {activeTab === 'knowledge' && <EnterpriseKnowledgeWorkspace />}

      {activeTab === 'platform_products' && <EnterpriseProductsWorkspace />}

      {activeTab === 'platform_monitoring' && <EnterpriseMonitoringWorkspace />}

      {activeTab === 'platform_health' && <PlatformHealthWorkspace />}

      {activeTab === 'deployment_monitor' && <DeploymentMonitorWorkspace />}

      {activeTab === 'release_candidate' && <ReleaseCandidateWorkspace />}

      {activeTab === 'pilot_homologation' && <PilotHomologationWorkspace />}

      {activeTab === 'provisioning_recovery' && <ProvisioningRecoveryWorkspace />}

      {activeTab === 'tenant_security' && <TenantSecurityWorkspace />}

      {activeTab === 'beta_context_security' && <BetaContextSecurityWorkspace />}

      {activeTab === 'operational_incidents' && <OperationalIncidentsWorkspace />}

      {activeTab === 'api_performance' && <ApiPerformanceWorkspace />}

      {activeTab === 'client_environments' && <EnterpriseClientEnvironmentsWorkspace />}

      {activeTab === 'settings' && (
        <SettingsWorkspace />
      )}

      {activeTab === 'projects' && <ProjectsWorkspace />}

      {activeTab === 'tasks' && <TasksWorkspace />}

      {activeTab === 'decisions' && <DecisionsWorkspace />}

      {activeTab === 'memories' && <MemoriesWorkspace />}

      {activeTab === 'documents' && <DocumentsWorkspace />}

      {activeTab === 'clients' && <ClientsWorkspace />}

      {activeTab === 'reports' && <ReportsWorkspace />}

      {activeTab === 'schedule' && <ScheduleWorkspace />}

      <WorkspaceRouter
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        selectedProjectId={selectedProjectId}
        projects={projects}
      />

      <AdministrationWorkspace
        activeTab={activeTab}
        allModules={allModules}
        activeModules={activeModules}
        activeFeatures={activeFeatures}
        isApiError={isApiError}
        isModulesLoading={isModulesLoading}
        isModuleActive={isModuleActive}
      />
    </>
  );
}
