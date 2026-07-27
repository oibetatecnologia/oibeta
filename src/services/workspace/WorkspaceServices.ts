import type { Project, ProjectState, Decision, Task, Memory } from '../../types';
import type { AppModule, WorkspaceTabId } from '../../types/workspace/WorkspaceState';

export const DEFAULT_ORGANIZATION_ID = 'org-oi-beta';
export const DEFAULT_WORKSPACE_ID = 'default-workspace';
export const DEFAULT_USER_ID = 'dev-user-douglas';

export const WORKSPACE_TAB_MODULE_MAPPING: Record<string, string> = {
  beta_gov: 'beta_gov',
  transparencia: 'sistema_1',
  ouvidoria: 'sistema_1',
  esic: 'sistema_1',
  zeropapel: 'sistema_5',
  beta_licita: 'beta_licita',
  beta_amendments: 'beta_amendments',
  beta_health: 'beta_health',
  beta_education: 'beta_education',
  beta_electoral: 'beta_electoral',
};

interface WorkspaceIdentity {
  id?: string;
  organizationId?: string;
  workspaceId?: string;
}

export function createTenantOnlyHeaders(user?: WorkspaceIdentity | null): Record<string, string> {
  return {
    'x-organization-id': user?.organizationId || DEFAULT_ORGANIZATION_ID,
    'x-workspace-id': user?.workspaceId || DEFAULT_WORKSPACE_ID,
    'x-user-id': user?.id || DEFAULT_USER_ID,
  };
}

export function createTenantJsonHeaders(user?: WorkspaceIdentity | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...createTenantOnlyHeaders(user),
  };
}

export function getCurrentProject(projects: Project[], selectedProjectId: string): Project | null {
  return projects.find(project => project.id === selectedProjectId) || null;
}

export function getCurrentProjectState(
  projectStates: ProjectState[],
  selectedProjectId: string,
): ProjectState | null {
  return projectStates.find(projectState => projectState.projectId === selectedProjectId) || null;
}

export function getActiveProjectsCount(projects: Project[]): number {
  return projects.filter(project => project.status === 'active').length;
}

export function getPendingTasksCount(tasks: Task[]): number {
  return tasks.filter(task => task.status !== 'completed').length;
}

export function getProjectTasks(tasks: Task[], selectedProjectId: string): Task[] {
  return tasks.filter(task => task.projectId === selectedProjectId);
}

export function getProjectDecisions(decisions: Decision[], selectedProjectId: string): Decision[] {
  return decisions.filter(decision => decision.projectId === selectedProjectId);
}

export function getProjectMemories(memories: Memory[], selectedProjectId: string): Memory[] {
  return memories.filter(memory => memory.projectId === selectedProjectId);
}

export function getRequiredModuleForTab(activeTab: WorkspaceTabId): string | undefined {
  return WORKSPACE_TAB_MODULE_MAPPING[activeTab];
}

export function isWorkspaceModuleActive(activeModules: AppModule[], code: string): boolean {
  if (code.toLowerCase() === 'sistema_1') {
    return true;
  }

  if (activeModules.length === 0) {
    return false;
  }

  return activeModules.some(module => module.code?.toLowerCase() === code.toLowerCase());
}

export function isWorkspaceModuleAllowed(
  activeModules: AppModule[],
  requiredModule?: string,
): boolean {
  if (!requiredModule) {
    return true;
  }

  return isWorkspaceModuleActive(activeModules, requiredModule);
}
