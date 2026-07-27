import type { Dispatch, SetStateAction } from 'react';
import type { Project, ProjectState, Decision, Task, Memory } from '../../types';

export type WorkspaceTabId = string;
export type ThemeMode = string;
export type TenantHeaderFactory = () => Record<string, string>;

export interface WorkspaceUser {
  id?: string;
  organizationId?: string;
  workspaceId?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AppModule {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface AppFeature {
  id: number;
  code: string;
  name: string;
  moduleCode: string;
}

export interface WorkspaceObjective {
  id?: string;
  projectId?: string;
  title?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AIConnection {
  id?: string | number;
  name?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AIHealthStatus {
  [connectionId: string]: unknown;
}

export interface ActionLogEntry {
  id?: string | number;
  projectId?: string;
  action?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface DebugLogEntry {
  id?: string | number;
  level?: string;
  message?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ClientEntry {
  id?: string | number;
  city?: string;
  entity?: string;
  manager?: string;
  contact?: string;
  [key: string]: unknown;
}

export interface ScheduleEventEntry {
  id?: string | number;
  title?: string;
  date?: string;
  time?: string;
  projectId?: string;
  [key: string]: unknown;
}

export interface WorkspaceNavigationState {
  activeTab: WorkspaceTabId;
  setActiveTab: Dispatch<SetStateAction<WorkspaceTabId>>;
}

export interface WorkspaceTenantState {
  user?: WorkspaceUser;
  tenantOnlyHeaders: TenantHeaderFactory;
  tenantJsonHeaders: TenantHeaderFactory;
}

export interface WorkspaceProjectStateBlock {
  projects: Project[];
  projectStates: ProjectState[];
  selectedProjectId: string;
  currentProject?: Project | null;
  currentProjectState?: ProjectState | null;
  totalProjects: number;
  activeProjectsCount: number;
  isEditingState: boolean;
  setIsEditingState: Dispatch<SetStateAction<boolean>>;
  editObjective: string;
  setEditObjective: Dispatch<SetStateAction<string>>;
  editStage: string;
  setEditStage: Dispatch<SetStateAction<string>>;
  isRecalculating: boolean;
  isEditingStopPoint: boolean;
  setIsEditingStopPoint: Dispatch<SetStateAction<boolean>>;
  tempStopPoint: string;
  setTempStopPoint: Dispatch<SetStateAction<string>>;
  editingStopPointId: string | null;
  setEditingStopPointId: Dispatch<SetStateAction<string | null>>;
  tempStopPointText: string;
  setTempStopPointText: Dispatch<SetStateAction<string>>;
  newProjectName: string;
  setNewProjectName: Dispatch<SetStateAction<string>>;
  newProjectDesc: string;
  setNewProjectDesc: Dispatch<SetStateAction<string>>;
  newProjectStop: string;
  setNewProjectStop: Dispatch<SetStateAction<string>>;
  onSelectProject: (id: string) => void;
  onToggleProjectStatus: (id: string, status: Project['status']) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  handleRecalculateContext: () => Promise<void> | void;
  startEditingState: () => void;
  handleSaveState: () => Promise<void> | void;
  handleSaveStopPoint: () => Promise<void> | void;
  handleCreateProjectSubmit: (event?: React.FormEvent) => Promise<void> | void;
  startEditingStopPoint: (project: Project) => void;
  saveStopPoint: (projectId: string) => Promise<void> | void;
}

export interface WorkspaceTaskStateBlock {
  tasks: Task[];
  filteredTasks: Task[];
  pendingTasksCount: number;
  newTaskTitle: string;
  setNewTaskTitle: Dispatch<SetStateAction<string>>;
  createTask: (title: string) => Promise<void>;
  handleCreateTaskSubmit: (event?: React.FormEvent) => Promise<void> | void;
  onToggleTaskStatus: (id: string, currentStatus: Task['status']) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export interface WorkspaceDecisionStateBlock {
  decisions: Decision[];
  filteredDecisions: Decision[];
  totalDecisions: number;
  newDecisionTitle: string;
  setNewDecisionTitle: Dispatch<SetStateAction<string>>;
  newDecisionDesc: string;
  setNewDecisionDesc: Dispatch<SetStateAction<string>>;
  handleCreateDecisionSubmit: (event?: React.FormEvent) => Promise<void> | void;
  onDeleteDecision: (id: string) => Promise<void>;
}

export interface WorkspaceMemoryStateBlock {
  memories: Memory[];
  filteredMemories: Memory[];
  totalMemories: number;
  newMemoryContent: string;
  setNewMemoryContent: Dispatch<SetStateAction<string>>;
  handleCreateMemorySubmit: (event?: React.FormEvent) => Promise<void> | void;
  onDeleteMemory: (id: string) => Promise<void>;
}

export interface WorkspaceObjectiveStateBlock {
  objectives: WorkspaceObjective[];
  newObjectiveTitle: string;
  setNewObjectiveTitle: Dispatch<SetStateAction<string>>;
  handleCreateObjectiveSubmit: (event?: React.FormEvent) => Promise<void> | void;
  handleToggleObjectiveStatus: (id: string, currentStatus?: string) => Promise<void> | void;
  handleDeleteObjective: (id: string) => Promise<void> | void;
}

export interface WorkspaceDocumentStateBlock {
  selecteddocTemplate: string;
  setSelectedDocTemplate: Dispatch<SetStateAction<string>>;
  docCityName: string;
  setDocCityName: Dispatch<SetStateAction<string>>;
  docSubject: string;
  setDocSubject: Dispatch<SetStateAction<string>>;
  generatedDoc: string;
  handleGenerateDocument: () => Promise<void> | void;
}

export interface WorkspaceClientStateBlock {
  clientsList: ClientEntry[];
  setClientsList: Dispatch<SetStateAction<ClientEntry[]>>;
  newClientCity: string;
  setNewClientCity: Dispatch<SetStateAction<string>>;
  newClientEntity: string;
  setNewClientEntity: Dispatch<SetStateAction<string>>;
  newClientManager: string;
  setNewClientManager: Dispatch<SetStateAction<string>>;
  newClientContact: string;
  setNewClientContact: Dispatch<SetStateAction<string>>;
  handleAddClient: (event?: React.FormEvent) => Promise<void> | void;
}

export interface WorkspaceScheduleStateBlock {
  events: ScheduleEventEntry[];
  setEvents: Dispatch<SetStateAction<ScheduleEventEntry[]>>;
  newEventTitle: string;
  setNewEventTitle: Dispatch<SetStateAction<string>>;
  newEventDate: string;
  setNewEventDate: Dispatch<SetStateAction<string>>;
  newEventTime: string;
  setNewEventTime: Dispatch<SetStateAction<string>>;
  newEventProj: string;
  setNewEventProj: Dispatch<SetStateAction<string>>;
  handleAddEvent: (event?: React.FormEvent) => Promise<void> | void;
}

export interface WorkspaceAIStateBlock {
  aiConns: AIConnection[];
  aiHealth: AIHealthStatus;
  loadingConns: boolean;
  testingConnId: string | number | null;
  testResult: unknown;
  showAddConn: boolean;
  setShowAddConn: Dispatch<SetStateAction<boolean>>;
  newConnName: string;
  setNewConnName: Dispatch<SetStateAction<string>>;
  newConnProvider: string;
  setNewConnProvider: Dispatch<SetStateAction<string>>;
  newConnApiKey: string;
  setNewConnApiKey: Dispatch<SetStateAction<string>>;
  newConnBaseUrl: string;
  setNewConnBaseUrl: Dispatch<SetStateAction<string>>;
  newConnModel: string;
  setNewConnModel: Dispatch<SetStateAction<string>>;
  savingConn: boolean;
  fetchAIConnections: () => Promise<void> | void;
  handleCreateAIConnection: (event?: React.FormEvent) => Promise<void> | void;
  handleDeleteAIConnection: (id: string | number) => Promise<void> | void;
  handleTestAIConnection: (id: string | number) => Promise<void> | void;
}

export interface WorkspaceLogsStateBlock {
  actionLogs: ActionLogEntry[];
  fetchActionLogs: () => Promise<void> | void;
  debugLogs: DebugLogEntry[];
  isFetchingDebug: boolean;
  fetchDebugLogs: () => Promise<void> | void;
}

export interface WorkspaceThemeStateBlock {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  followSystem: boolean;
  setFollowSystem: (followSystem: boolean) => void;
  onLogout?: () => Promise<void>;
}

export interface WorkspaceModuleStateBlock {
  allModules: AppModule[];
  activeModules: AppModule[];
  activeFeatures: AppFeature[];
  isModulesLoading: boolean;
  isApiError: boolean;
  requiredModule?: string;
  isCurrentModuleAllowed: boolean;
  isModuleActive: (code: string) => boolean;
  fetchModulesAndFeatures: () => Promise<void> | void;
}

export interface WorkspaceContextValue {
  navigation: WorkspaceNavigationState;
  tenant: WorkspaceTenantState;
  theme: WorkspaceThemeStateBlock;
  modules: WorkspaceModuleStateBlock;
  projects: WorkspaceProjectStateBlock;
  tasks: WorkspaceTaskStateBlock;
  decisions: WorkspaceDecisionStateBlock;
  memories: WorkspaceMemoryStateBlock;
  objectives: WorkspaceObjectiveStateBlock;
  documents: WorkspaceDocumentStateBlock;
  clients: WorkspaceClientStateBlock;
  schedule: WorkspaceScheduleStateBlock;
  ai: WorkspaceAIStateBlock;
  logs: WorkspaceLogsStateBlock;
}
