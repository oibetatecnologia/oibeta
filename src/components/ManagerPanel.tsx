import React, { useState, useEffect, useCallback } from 'react';
import { Project, Decision, Task, Memory, ProjectState } from '../types';
import {
  LayoutDashboard, Layers, CheckSquare, FileText, BrainCircuit,
  Files, Users, BarChart3, Building2, Clock, X, Activity,
  Target, Landmark, ShieldAlert, Heart, GraduationCap, UserCheck,
  Settings, Globe, Mail, LineChart, FolderOpen, Briefcase,
  FileSignature, CheckCircle2, AlertCircle, FileEdit, Package, Rocket, LifeBuoy, ShieldCheck, Siren, Gauge
} from 'lucide-react';
import WorkspaceTabsRouter from './workspaces/WorkspaceTabsRouter';
import WorkspaceProvider from '../providers/workspace/WorkspaceProvider';
import PlatformProvider from '../contexts/platform/PlatformProvider';
import { NotificationCenterProvider } from '../contexts/notifications/NotificationCenterContext';
import { ProductAccessService } from '../core/licensing/ProductAccessService';
import { ClientSessionStorage } from '../core/auth/ClientSessionStorage';
import type { WorkspaceContextValue } from '../types/workspace/WorkspaceState';
import ProjectFocusHeader from './shell/ProjectFocusHeader';
import SidebarStatusFooter from './shell/SidebarStatusFooter';
import SidebarBrandHeader from './shell/SidebarBrandHeader';
import SidebarWorkspaceBadge from './shell/SidebarWorkspaceBadge';
import SidebarSectionTitle from './shell/SidebarSectionTitle';
import SidebarProjectsList from './shell/SidebarProjectsList';
import MobileSidebarBackdrop from './shell/MobileSidebarBackdrop';
import ModuleAccessGuard from './shell/ModuleAccessGuard';
import useObjectives from '../hooks/useObjectives';
import useDocumentState from '../hooks/useDocumentState';
import useClientState from '../hooks/useClientState';
import useScheduleState from '../hooks/useScheduleState';
import useProjectState from '../hooks/useProjectState';
import useTaskState from '../hooks/useTaskState';
import useDecisionState from '../hooks/useDecisionState';
import useMemoryState from '../hooks/useMemoryState';
import useAIConnectionsState from '../hooks/useAIConnectionsState';
import useDebugLogsState from '../hooks/useDebugLogsState';
import useActionLogsState from '../hooks/useActionLogsState';
import { OperationalContextResolver } from '../core/tenants/OperationalContextResolver';
import { buildAuthenticatedHeaders } from '../core/auth/AuthenticatedUserContext';

interface ManagerPanelProps {
  projects: Project[];
  projectStates: ProjectState[];
  decisions: Decision[];
  tasks: Task[];
  memories: Memory[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (proj: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateProjectStopPoint: (id: string, stopPoint: string) => Promise<void>;
  onUpdateProjectState: (id: string, objective: string, stage: string) => Promise<void>;
  onRecalculateState: (id: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onToggleProjectStatus: (id: string, status: 'active' | 'paused' | 'completed') => Promise<void>;
  
  onCreateDecision: (dec: Omit<Decision, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  onDeleteDecision: (id: string) => Promise<void>;
  
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  onToggleTaskStatus: (id: string, currentStatus: any) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  
  onCreateMemory: (mem: Omit<Memory, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;

  theme?: string;
  setTheme?: (t: string) => void;
  followSystem?: boolean;
  setFollowSystem?: (f: boolean) => void;
  user?: any;
  onLogout?: () => Promise<void>;
}

interface AppModule {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface AppFeature {
  id: number;
  code: string;
  name: string;
  moduleCode: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: string;
  module?: string;
  count?: number | null;
  disabled?: boolean;
  subItems?: MenuItem[];
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

export default function ManagerPanel({
  projects,
  projectStates,
  decisions,
  tasks,
  memories,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProjectStopPoint,
  onUpdateProjectState,
  onRecalculateState,
  onDeleteProject,
  onToggleProjectStatus,
  
  onCreateDecision,
  onDeleteDecision,
  
  onCreateTask,
  onToggleTaskStatus,
  onDeleteTask,
  
  onCreateMemory,
  onDeleteMemory,

  theme = 'dark',
  setTheme = () => {},
  followSystem = false,
  setFollowSystem = () => {},
  user,
  onLogout
}: ManagerPanelProps) {
  // Navigation categories inside visual corporate panel
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const productAccessSnapshot = ProductAccessService.buildSnapshot(user);
  const operationalContext = OperationalContextResolver.resolve(user);

  useEffect(() => {
    setActiveTab('dashboard');
  }, [operationalContext.organizationId, operationalContext.userId]);
  
  // SPRINT 27.1 Module Access & Dynamic Navigation States
  const [allModules, setAllModules] = useState<AppModule[]>([]);
  const [activeModules, setActiveModules] = useState<AppModule[]>([]);
  const [activeFeatures, setActiveFeatures] = useState<AppFeature[]>([]);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState<boolean>(true);
  const [isElectoralExpanded, setIsElectoralExpanded] = useState<boolean>(true);
  const [isLicitaExpanded, setIsLicitaExpanded] = useState<boolean>(true);
  const [isGovExpanded, setIsGovExpanded] = useState<boolean>(true);
  const [isSistema1Expanded, setIsSistema1Expanded] = useState<boolean>(true);
  const [isSistema5Expanded, setIsSistema5Expanded] = useState<boolean>(true);
  const [isModulesLoading, setIsModulesLoading] = useState<boolean>(true);
  const [isApiError, setIsApiError] = useState<boolean>(false);

  const tenantOnlyHeaders = useCallback((): Record<string, string> => ({
    ...ClientSessionStorage.buildAuthorizationHeader(),
    ...buildAuthenticatedHeaders(user),
  }), [user]);

  const tenantJsonHeaders = useCallback((): Record<string, string> => ({
    ...ClientSessionStorage.buildAuthorizationHeader(),
    ...buildAuthenticatedHeaders(user, true),
  }), [user]);

  const fetchModulesAndFeatures = useCallback(async () => {
    try {
      setIsApiError(false);
      const [resAll, resActive, resFeatures] = await Promise.all([
        fetch('/api/core/modules', { headers: tenantOnlyHeaders() }),
        fetch('/api/core/modules/active', { headers: tenantOnlyHeaders() }),
        fetch('/api/core/features/active', { headers: tenantOnlyHeaders() })
      ]);
      
      if (resAll.ok && resActive.ok && resFeatures.ok) {
        const data = await resAll.json();
        setAllModules(data);
        
        const activeData = await resActive.json();
        setActiveModules(activeData);
        
        const featuresData = await resFeatures.json();
        setActiveFeatures(featuresData);
      } else {
        setIsApiError(true);
      }
    } catch (err) {
      console.warn("Could not retrieve module info from backend API:", err);
      setIsApiError(true);
    } finally {
      setIsModulesLoading(false);
    }
  }, [tenantOnlyHeaders]);

  useEffect(() => {
    void fetchModulesAndFeatures();
  }, [fetchModulesAndFeatures]);

  // Module activation helper
  const isModuleActive = (code: string) => {
    if (code.toLowerCase() === 'sistema_1') return true;
    if (activeModules && activeModules.length > 0) {
      return activeModules.some(m => m.code?.toLowerCase() === code.toLowerCase());
    }
    return false;
  };
  
  const {
    objectives,
    newObjectiveTitle,
    setNewObjectiveTitle,
    handleCreateObjectiveSubmit,
    handleToggleObjectiveStatus,
    handleDeleteObjective
  } = useObjectives({
    selectedProjectId,
    tenantOnlyHeaders,
    tenantJsonHeaders
  });
  
  // Local states for collapsible left sidebar and mobile view drawer
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const {
    currentProject,
    currentProjectState,
    isEditingStopPoint,
    setIsEditingStopPoint,
    tempStopPoint,
    setTempStopPoint,
    newProjectName,
    setNewProjectName,
    newProjectDesc,
    setNewProjectDesc,
    newProjectStop,
    setNewProjectStop,
    isEditingState,
    setIsEditingState,
    editObjective,
    setEditObjective,
    editStage,
    setEditStage,
    isRecalculating,
    editingStopPointId,
    setEditingStopPointId,
    tempStopPointText,
    setTempStopPointText,
    handleRecalculateContext,
    startEditingState,
    handleSaveState,
    handleSaveStopPoint,
    handleCreateProjectSubmit,
    startEditingStopPoint,
    saveStopPoint
  } = useProjectState({
    projects,
    projectStates,
    selectedProjectId,
    user,
    onCreateProject,
    onUpdateProjectStopPoint,
    onUpdateProjectState,
    onRecalculateState
  });

  const {
    newDecisionTitle,
    setNewDecisionTitle,
    newDecisionDesc,
    setNewDecisionDesc,
    handleCreateDecisionSubmit
  } = useDecisionState({
    selectedProjectId,
    onCreateDecision
  });
  
  const {
    newTaskTitle,
    setNewTaskTitle,
    createTask,
    handleCreateTaskSubmit
  } = useTaskState({
    selectedProjectId,
    onCreateTask
  });
  const {
    newMemoryContent,
    setNewMemoryContent,
    handleCreateMemorySubmit
  } = useMemoryState({
    selectedProjectId,
    onCreateMemory
  });

  const {
    selecteddocTemplate,
    setSelectedDocTemplate,
    docCityName,
    setDocCityName,
    docSubject,
    setDocSubject,
    generatedDoc,
    handleGenerateDocument
  } = useDocumentState();

  const {
    clientsList,
    setClientsList,
    newClientCity,
    setNewClientCity,
    newClientEntity,
    setNewClientEntity,
    newClientManager,
    setNewClientManager,
    newClientContact,
    setNewClientContact,
    handleAddClient
  } = useClientState();

  const {
    events,
    setEvents,
    newEventTitle,
    setNewEventTitle,
    newEventDate,
    setNewEventDate,
    newEventTime,
    setNewEventTime,
    newEventProj,
    setNewEventProj,
    handleAddEvent
  } = useScheduleState();

  const {
    actionLogs,
    fetchActionLogs
  } = useActionLogsState({
    selectedProjectId,
    tenantOnlyHeaders
  });

  const {
    debugLogs,
    isFetchingDebug,
    fetchDebugLogs
  } = useDebugLogsState({
    tenantOnlyHeaders
  });

  const {
    aiConns,
    aiHealth,
    loadingConns,
    testingConnId,
    testResult,
    showAddConn,
    setShowAddConn,
    newConnName,
    setNewConnName,
    newConnProvider,
    setNewConnProvider,
    newConnApiKey,
    setNewConnApiKey,
    newConnBaseUrl,
    setNewConnBaseUrl,
    newConnModel,
    setNewConnModel,
    savingConn,
    fetchAIConnections,
    handleCreateAIConnection,
    handleDeleteAIConnection,
    handleTestAIConnection
  } = useAIConnectionsState({
    tenantOnlyHeaders,
    tenantJsonHeaders
  });

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchDebugLogs();
      fetchAIConnections();
    }
  }, [activeTab]);

  // Calculated numbers for standard cards
  const totalProjects = projects.length;
  const activeProjectsCount = projects.filter(p => p.status === 'active').length;
  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const totalDecisions = decisions.length;
  const totalMemories = memories.length;

  // Filter items based on selected project
  const filteredDecisions = decisions.filter(d => d.projectId === selectedProjectId);
  const filteredTasks = tasks.filter(t => t.projectId === selectedProjectId);
  const filteredMemories = memories.filter(m => m.projectId === selectedProjectId);

  // Form handlers
  const tabModuleMapping: Record<string, string> = {
    beta_gov: 'beta_gov',
    transparencia: 'sistema_1',
    ouvidoria: 'sistema_1',
    esic: 'sistema_1',
    zeropapel: 'sistema_5',
    beta_licita: 'beta_licita',
    beta_amendments: 'beta_amendments',
    beta_health: 'beta_health',
    beta_education: 'beta_education',
    beta_electoral: 'beta_electoral'
  };
  const requiredModuleCode = tabModuleMapping[activeTab];
  const requiredProduct = ProductAccessService.getRequiredProductForTab(activeTab);
  const isCurrentProductAllowed = ProductAccessService.canAccessTab(
    activeTab,
    productAccessSnapshot,
  );
  const isCurrentModuleActive = requiredModuleCode
    ? isModuleActive(requiredModuleCode)
    : true;
  const requiredModule = !isCurrentProductAllowed
    ? requiredProduct?.commercialName
    : requiredModuleCode;
  const isCurrentModuleAllowed =
    isCurrentProductAllowed && isCurrentModuleActive;

  const fallbackInitialTabByMenuId: Record<string, string> = {
    projects: 'projects',
    beta_gov: 'gov_dashboard',
    sistema_1: 's1_dashboard',
    sistema_5: 's5_dashboard',
    beta_licita: 'licita_dashboard',
    beta_electoral: 'electoral_dashboard',
    beta_core: 'core_admin'
  };

  const isMenuItemExpanded = (itemId: string): boolean => {
    if (itemId === 'projects') return isWorkspaceExpanded;
    if (itemId === 'beta_electoral') return isElectoralExpanded;
    if (itemId === 'beta_licita') return isLicitaExpanded;
    if (itemId === 'beta_gov') return isGovExpanded;
    if (itemId === 'sistema_1') return isSistema1Expanded;
    if (itemId === 'sistema_5') return isSistema5Expanded;
    return true;
  };

  const toggleMenuItemExpanded = (itemId: string) => {
    if (itemId === 'projects') {
      setIsWorkspaceExpanded(prev => !prev);
      return;
    }
    if (itemId === 'beta_electoral') {
      setIsElectoralExpanded(prev => !prev);
      return;
    }
    if (itemId === 'beta_licita') {
      setIsLicitaExpanded(prev => !prev);
      return;
    }
    if (itemId === 'beta_gov') {
      setIsGovExpanded(prev => !prev);
      return;
    }
    if (itemId === 'sistema_1') {
      setIsSistema1Expanded(prev => !prev);
      return;
    }
    if (itemId === 'sistema_5') {
      setIsSistema5Expanded(prev => !prev);
    }
  };

  const handleParentMenuClick = (item: MenuItem) => {
    if (!item.subItems) {
      setActiveTab(item.id);
      setIsMobileSidebarOpen(false);
      return;
    }

    const hasActiveSubItem = item.subItems.some(sub => activeTab === sub.id);
    toggleMenuItemExpanded(item.id);

    if (!hasActiveSubItem) {
      setActiveTab(fallbackInitialTabByMenuId[item.id] || item.subItems[0]?.id || item.id);
    }
  };

  const handleSubMenuClick = (sub: MenuItem) => {
    if (sub.disabled) return;
    setActiveTab(sub.id);
    setIsMobileSidebarOpen(false);
  };

  const workspaceContextValue = {
    navigation: {
      activeTab,
      setActiveTab
    },
    tenant: {
      user,
      tenantOnlyHeaders,
      tenantJsonHeaders
    },
    theme: {
      theme,
      setTheme,
      followSystem,
      setFollowSystem,
      onLogout
    },
    modules: {
      allModules,
      activeModules,
      activeFeatures,
      isModulesLoading,
      isApiError,
      requiredModule,
      isCurrentModuleAllowed,
      isModuleActive,
      fetchModulesAndFeatures
    },
    projects: {
      projects,
      projectStates,
      selectedProjectId,
      currentProject,
      currentProjectState,
      totalProjects,
      activeProjectsCount,
      isEditingState,
      setIsEditingState,
      editObjective,
      setEditObjective,
      editStage,
      setEditStage,
      isRecalculating,
      isEditingStopPoint,
      setIsEditingStopPoint,
      tempStopPoint,
      setTempStopPoint,
      editingStopPointId,
      setEditingStopPointId,
      tempStopPointText,
      setTempStopPointText,
      newProjectName,
      setNewProjectName,
      newProjectDesc,
      setNewProjectDesc,
      newProjectStop,
      setNewProjectStop,
      onSelectProject,
      onToggleProjectStatus,
      onDeleteProject,
      handleRecalculateContext,
      startEditingState,
      handleSaveState,
      handleSaveStopPoint,
      handleCreateProjectSubmit,
      startEditingStopPoint,
      saveStopPoint
    },
    tasks: {
      tasks,
      filteredTasks,
      pendingTasksCount,
      newTaskTitle,
      setNewTaskTitle,
      createTask,
      handleCreateTaskSubmit,
      onToggleTaskStatus,
      onDeleteTask
    },
    decisions: {
      decisions,
      filteredDecisions,
      totalDecisions,
      newDecisionTitle,
      setNewDecisionTitle,
      newDecisionDesc,
      setNewDecisionDesc,
      handleCreateDecisionSubmit,
      onDeleteDecision
    },
    memories: {
      memories,
      filteredMemories,
      totalMemories,
      newMemoryContent,
      setNewMemoryContent,
      handleCreateMemorySubmit,
      onDeleteMemory
    },
    objectives: {
      objectives,
      newObjectiveTitle,
      setNewObjectiveTitle,
      handleCreateObjectiveSubmit,
      handleToggleObjectiveStatus,
      handleDeleteObjective
    },
    documents: {
      selecteddocTemplate,
      setSelectedDocTemplate,
      docCityName,
      setDocCityName,
      docSubject,
      setDocSubject,
      generatedDoc,
      handleGenerateDocument
    },
    clients: {
      clientsList,
      setClientsList,
      newClientCity,
      setNewClientCity,
      newClientEntity,
      setNewClientEntity,
      newClientManager,
      setNewClientManager,
      newClientContact,
      setNewClientContact,
      handleAddClient
    },
    schedule: {
      events,
      setEvents,
      newEventTitle,
      setNewEventTitle,
      newEventDate,
      setNewEventDate,
      newEventTime,
      setNewEventTime,
      newEventProj,
      setNewEventProj,
      handleAddEvent
    },
    ai: {
      aiConns,
      aiHealth,
      loadingConns,
      testingConnId,
      testResult,
      showAddConn,
      setShowAddConn,
      newConnName,
      setNewConnName,
      newConnProvider,
      setNewConnProvider,
      newConnApiKey,
      setNewConnApiKey,
      newConnBaseUrl,
      setNewConnBaseUrl,
      newConnModel,
      setNewConnModel,
      savingConn,
      fetchAIConnections,
      handleCreateAIConnection,
      handleDeleteAIConnection,
      handleTestAIConnection
    },
    logs: {
      actionLogs,
      fetchActionLogs,
      debugLogs,
      isFetchingDebug,
      fetchDebugLogs
    }
  } as unknown as WorkspaceContextValue;

  return (
    <PlatformProvider
      user={user || null}
      selectedProjectId={selectedProjectId}
      projects={projects}
      activeTab={activeTab}
    >
      <NotificationCenterProvider>
        <WorkspaceProvider value={workspaceContextValue}>
      <div className="flex-grow flex flex-col lg:flex-row h-full w-full bg-[var(--bg-main)] overflow-hidden text-[var(--text-main)] transition-colors duration-200 relative select-text" id="oi-beta-admin-workspace">
      
      {/* 1. Left Explorer Sidebar Menu (Knowledge / File-explorer style) */}
      <div 
        className={`bg-[var(--bg-sidebar)] text-[var(--text-secondary)] flex flex-col shrink-0 border-r border-[var(--border-color)] transition-all duration-300 z-30 absolute lg:relative h-full ${
          isMobileSidebarOpen 
            ? 'w-[280px] translate-x-0' 
            : 'translate-x-0 ' + (isLeftSidebarCollapsed ? 'lg:w-[64px]' : 'lg:w-[280px]')
        } ${isMobileSidebarOpen ? 'left-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <SidebarBrandHeader
          collapsed={isLeftSidebarCollapsed}
          onToggleCollapsed={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <SidebarWorkspaceBadge
          collapsed={isLeftSidebarCollapsed}
          organizationName={operationalContext.isOiBetaMasterAdmin ? 'Oi Beta Tecnologia' : String(user?.organizationName || user?.organizationId || 'Organização cliente')}
        />

        <SidebarProjectsList
          collapsed={isLeftSidebarCollapsed}
          projects={projects}
          selectedProjectId={selectedProjectId}
          totalProjects={totalProjects}
          activeTab={activeTab}
          onSelectProject={onSelectProject}
          setActiveTab={setActiveTab}
        />

        <SidebarSectionTitle
          collapsed={isLeftSidebarCollapsed}
          title="Menu Corporativo"
        />

        <nav className="flex-1 px-2 pb-4 pt-2 space-y-4 overflow-y-auto">
          {(() => {
            const masterMenuGroups: MenuGroup[] = [
              {
                id: 'oi_beta',
                label: '🏢 OI BETA',
                items: [
                  { id: 'dashboard', label: 'Painel Empresarial', icon: LayoutDashboard },
                  { id: 'commercial_radar', label: 'Radar Comercial', icon: Globe },
                  { id: 'crm', label: 'CRM', icon: Users },
                  { id: 'enterprise_clients', label: 'Clientes', icon: Building2 },
                  { id: 'implementations', label: 'Implantações', icon: CheckCircle2 },
                  { id: 'finance', label: 'Financeiro', icon: BarChart3 },
                  { id: 'development', label: 'Desenvolvimento', icon: LineChart },
                  { id: 'support', label: 'Suporte', icon: Mail }
                ]
              },
              {
                id: 'beta',
                label: '🧠 BETA',
                items: [
                  { id: 'beta_brain', label: 'Cérebro Operacional', icon: BrainCircuit },
                  { id: 'memories', label: 'Memórias', icon: BrainCircuit, count: selectedProjectId ? filteredMemories.length : null, disabled: !selectedProjectId },
                  { id: 'knowledge', label: 'Conhecimento', icon: Files },
                  { id: 'decisions', label: 'Decisões', icon: FileText, count: selectedProjectId ? filteredDecisions.length : null, disabled: !selectedProjectId }
                ]
              },
              {
                id: 'plataforma',
                label: '⚙️ PLATAFORMA',
                items: [
                  {
                    id: 'beta_core',
                    label: 'Beta Core',
                    icon: ShieldAlert,
                    subItems: [
                      { id: 'core_admin', label: 'Visão Geral', icon: LayoutDashboard },
                      { id: 'tenants', label: 'Tenants', icon: Building2 },
                      { id: 'users', label: 'Usuários', icon: Users },
                      { id: 'organization', label: 'Organização', icon: Landmark },
                      { id: 'modules_contracted', label: 'Licenciamento', icon: Layers },
                      { id: 'platform_products', label: 'Produtos', icon: Briefcase },
                      { id: 'platform_monitoring', label: 'Monitoramento', icon: Activity },
                      { id: 'operational_incidents', label: 'Central de incidentes', icon: Siren },
                      { id: 'api_performance', label: 'Performance das APIs', icon: Gauge },
                      { id: 'platform_health', label: 'Saúde da Plataforma', icon: Activity },
                      { id: 'deployment_monitor', label: 'Monitor de Implantação', icon: Building2 },
                      { id: 'release_candidate', label: 'Checklist RC-1', icon: CheckCircle2 },
                      { id: 'pilot_homologation', label: 'Clientes piloto', icon: Rocket },
                      { id: 'provisioning_recovery', label: 'Recuperar implantação', icon: LifeBuoy },
                      { id: 'tenant_security', label: 'Segurança de tenants', icon: ShieldCheck },
                      { id: 'beta_context_security', label: 'Contexto seguro da Beta', icon: BrainCircuit },
                      { id: 'settings', label: 'Configurações', icon: Settings }
                    ]
                  }
                ]
              },
              {
                id: 'clientes',
                label: '🏛 CLIENTES',
                items: [
                  { id: 'client_environments', label: 'Nenhum cliente cadastrado', icon: Building2 }
                ]
              }
            ];

            const clientProductItems: MenuItem[] = productAccessSnapshot.availableProducts
              .filter((product) => product.tabs.length > 0)
              .map((product) => ({
                id: product.tabs[0].id,
                label: product.commercialName,
                icon: Package,
                subItems: product.tabs.slice(1).map((tab) => ({ id: tab.id, label: tab.label, icon: FileText })),
              }));

            const clientMenuGroups: MenuGroup[] = [
              {
                id: 'organization',
                label: '🏛 ORGANIZAÇÃO',
                items: [
                  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
                  { id: 'client_onboarding', label: 'Implantação', icon: CheckCircle2 },
                  { id: 'client_products', label: 'Produtos contratados', icon: Package },
                  ...(operationalContext.role === 'tenant_admin' ? [{ id: 'client_users', label: 'Usuários', icon: Users }, { id: 'client_audit', label: 'Auditoria', icon: Activity }] : []),
                  { id: 'client_settings', label: 'Configurações', icon: Settings },
                ],
              },
              {
                id: 'beta',
                label: '🧠 BETA',
                items: [
                  { id: 'beta_brain', label: 'Beta', icon: BrainCircuit },
                  { id: 'memories', label: 'Memórias', icon: BrainCircuit, count: selectedProjectId ? filteredMemories.length : null, disabled: !selectedProjectId },
                  { id: 'knowledge', label: 'Conhecimento', icon: Files },
                  { id: 'decisions', label: 'Decisões', icon: FileText, count: selectedProjectId ? filteredDecisions.length : null, disabled: !selectedProjectId },
                ],
              },
              ...(clientProductItems.length > 0 ? [{ id: 'products', label: '📦 PRODUTOS', items: clientProductItems }] : []),
            ];

            const menuGroups = operationalContext.isOiBetaMasterAdmin
              ? masterMenuGroups
              : clientMenuGroups;

            const activeGroups = menuGroups
              .map((group) => {
                const visibleItems = group.items
                  .map((item) => {
                    const licensedSubItems = item.subItems?.filter((subItem) =>
                      operationalContext.isOiBetaMasterAdmin
                        ? ProductAccessService.canAccessTab(
                            subItem.id,
                            productAccessSnapshot,
                          )
                        : ProductAccessService.canAccessClientTab(
                            subItem.id,
                            operationalContext.role,
                            productAccessSnapshot,
                          ),
                    );
                    const itemLicensed = operationalContext.isOiBetaMasterAdmin
                      ? ProductAccessService.canAccessTab(
                          item.id,
                          productAccessSnapshot,
                        )
                      : ProductAccessService.canAccessClientTab(
                          item.id,
                          operationalContext.role,
                          productAccessSnapshot,
                        );
                    const moduleActive = item.module
                      ? isModuleActive(item.module)
                      : true;

                    if (
                      !moduleActive ||
                      (!itemLicensed &&
                        (!licensedSubItems || licensedSubItems.length === 0))
                    ) {
                      return null;
                    }

                    return {
                      ...item,
                      subItems: item.subItems ? licensedSubItems : undefined,
                    };
                  })
                  .filter((item) => item !== null) as MenuItem[];

                return { ...group, items: visibleItems };
              })
              .filter((group) => group.items.length > 0);

            if (isLeftSidebarCollapsed) {
              const visibleItemsList = activeGroups.flatMap(g => g.items);
              return (
                <div className="space-y-4">
                  {visibleItemsList.map((item) => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                        }}
                        className={`w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition duration-150 cursor-pointer ${
                          isSelected 
                            ? 'bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] font-bold border border-[var(--blue-accent)]/30'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/45'
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              );
            }

            return (
              <div className="space-y-5">
                {activeGroups.map(group => (
                  <div key={group.id} className="space-y-1">
                    <span className="px-3 text-[9px] font-black text-[var(--text-secondary)]/75 uppercase tracking-widest font-mono block select-none mb-1.5">{group.label}</span>
                    <div className="space-y-0.5">
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const isSelected = activeTab === item.id || (item.subItems && item.subItems.some(sub => activeTab === sub.id));
                        return (
                          <div key={item.id} className="space-y-0.5">
                            <button
                              onClick={() => handleParentMenuClick(item)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-md transition duration-150 cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] font-bold border border-[var(--blue-accent)]/20'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/45'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--blue-accent)]' : ''}`} />
                                <span>{item.label}</span>
                              </div>
                              {item.badge && (
                                <span className="text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold leading-none bg-[var(--green-accent)]/10 text-[var(--green-accent)] border border-[var(--green-accent)]/20">{item.badge}</span>
                              )}
                            </button>

                            {/* Render sub-items if present and expanded */}
                            {item.subItems && isMenuItemExpanded(item.id) && (
                              <div className="ml-4 pl-3.5 border-l border-[var(--border-color)]/50 mt-1 space-y-1">
                                {item.subItems.map(sub => {
                                  const SubIcon = sub.icon;
                                  const isSubSelected = activeTab === sub.id;
                                  return (
                                    <button
                                      key={sub.id}
                                      onClick={() => handleSubMenuClick(sub)}
                                      disabled={sub.disabled}
                                      title={sub.disabled ? 'Selecione um projeto na lista primeiro.' : sub.label}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-medium rounded-md transition duration-150 ${
                                        sub.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                                      } ${
                                        isSubSelected
                                          ? 'bg-[var(--blue-accent)]/8 text-[var(--blue-accent)] font-bold'
                                          : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/45'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{sub.label}</span>
                                      </div>
                                      {sub.count !== undefined && sub.count !== null && (
                                        <span className="text-[9px] bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] px-1.5 rounded font-mono font-semibold">{sub.count}</span>
                                      )}
                                      {sub.badge && (
                                        <span className="text-[8.5px] px-1 py-0.2 rounded font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">{sub.badge}</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </nav>

        {/* User status info */}
        {!isLeftSidebarCollapsed && <SidebarStatusFooter />}
      </div>

      <MobileSidebarBackdrop
        open={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />


      {/* 2. Área de Trabalho content area */}
      <div className="flex-1 flex flex-col bg-[var(--bg-main)] min-w-0 transition-colors duration-200 h-full overflow-hidden">
        
        <ProjectFocusHeader
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onCreateProjectClick={() => {
            setActiveTab('tasks');
            setIsMobileSidebarOpen(false);
          }}
          onNotificationNavigate={(tabId) => {
            setActiveTab(tabId);
            setIsMobileSidebarOpen(false);
          }}
        />

        {/* Área de Trabalho content panel */}
        <div className="flex-1 p-6 overflow-y-auto" id="canvas-workspace-viewport">
          <WorkspaceTabsRouter
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            selectedProjectId={selectedProjectId}
            projects={projects}
            currentProject={currentProject}
            currentProjectState={currentProjectState}
            isEditingState={isEditingState}
            setIsEditingState={setIsEditingState}
            editObjective={editObjective}
            setEditObjective={setEditObjective}
            editStage={editStage}
            setEditStage={setEditStage}
            handleSaveState={handleSaveState}
            startEditingState={startEditingState}
            handleRecalculateContext={handleRecalculateContext}
            isRecalculating={isRecalculating}
            activeProjectsCount={activeProjectsCount}
            totalProjects={totalProjects}
            filteredTasks={filteredTasks}
            filteredDecisions={filteredDecisions}
            filteredMemories={filteredMemories}
            tempStopPoint={tempStopPoint}
            setTempStopPoint={setTempStopPoint}
            isEditingStopPoint={isEditingStopPoint}
            setIsEditingStopPoint={setIsEditingStopPoint}
            handleSaveStopPoint={handleSaveStopPoint}
            onToggleTaskStatus={onToggleTaskStatus}
            actionLogs={actionLogs}
            theme={theme}
            setTheme={setTheme}
            followSystem={followSystem}
            setFollowSystem={setFollowSystem}
            onLogout={onLogout}
            showAddConn={showAddConn}
            setShowAddConn={setShowAddConn}
            handleCreateAIConnection={handleCreateAIConnection}
            newConnName={newConnName}
            setNewConnName={setNewConnName}
            newConnProvider={newConnProvider}
            setNewConnProvider={setNewConnProvider}
            newConnApiKey={newConnApiKey}
            setNewConnApiKey={setNewConnApiKey}
            newConnBaseUrl={newConnBaseUrl}
            setNewConnBaseUrl={setNewConnBaseUrl}
            newConnModel={newConnModel}
            setNewConnModel={setNewConnModel}
            savingConn={savingConn}
            loadingConns={loadingConns}
            aiConns={aiConns}
            aiHealth={aiHealth}
            testResult={testResult}
            handleTestAIConnection={handleTestAIConnection}
            testingConnId={testingConnId}
            handleDeleteAIConnection={handleDeleteAIConnection}
            debugLogs={debugLogs}
            isFetchingDebug={isFetchingDebug}
            fetchDebugLogs={fetchDebugLogs}
            editingStopPointId={editingStopPointId}
            tempStopPointText={tempStopPointText}
            setTempStopPointText={setTempStopPointText}
            setEditingStopPointId={setEditingStopPointId}
            startEditingStopPoint={startEditingStopPoint}
            saveStopPoint={saveStopPoint}
            onSelectProject={onSelectProject}
            onToggleProjectStatus={onToggleProjectStatus}
            onDeleteProject={onDeleteProject}
            newProjectName={newProjectName}
            setNewProjectName={setNewProjectName}
            newProjectDesc={newProjectDesc}
            setNewProjectDesc={setNewProjectDesc}
            newProjectStop={newProjectStop}
            setNewProjectStop={setNewProjectStop}
            handleCreateProjectSubmit={handleCreateProjectSubmit}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            handleCreateTaskSubmit={handleCreateTaskSubmit}
            onDeleteTask={onDeleteTask}
            objectives={objectives}
            newObjectiveTitle={newObjectiveTitle}
            setNewObjectiveTitle={setNewObjectiveTitle}
            handleCreateObjectiveSubmit={handleCreateObjectiveSubmit}
            handleToggleObjectiveStatus={handleToggleObjectiveStatus}
            handleDeleteObjective={handleDeleteObjective}
            newDecisionTitle={newDecisionTitle}
            setNewDecisionTitle={setNewDecisionTitle}
            newDecisionDesc={newDecisionDesc}
            setNewDecisionDesc={setNewDecisionDesc}
            handleCreateDecisionSubmit={handleCreateDecisionSubmit}
            onDeleteDecision={onDeleteDecision}
            newMemoryContent={newMemoryContent}
            setNewMemoryContent={setNewMemoryContent}
            handleCreateMemorySubmit={handleCreateMemorySubmit}
            onDeleteMemory={onDeleteMemory}
            selecteddocTemplate={selecteddocTemplate}
            setSelectedDocTemplate={setSelectedDocTemplate}
            docCityName={docCityName}
            setDocCityName={setDocCityName}
            docSubject={docSubject}
            setDocSubject={setDocSubject}
            generatedDoc={generatedDoc}
            handleGenerateDocument={handleGenerateDocument}
            clientsList={clientsList}
            setClientsList={setClientsList}
            newClientCity={newClientCity}
            setNewClientCity={setNewClientCity}
            newClientEntity={newClientEntity}
            setNewClientEntity={setNewClientEntity}
            newClientManager={newClientManager}
            setNewClientManager={setNewClientManager}
            newClientContact={newClientContact}
            setNewClientContact={setNewClientContact}
            handleAddClient={handleAddClient}
            events={events}
            setEvents={setEvents}
            newEventTitle={newEventTitle}
            setNewEventTitle={setNewEventTitle}
            newEventDate={newEventDate}
            setNewEventDate={setNewEventDate}
            newEventTime={newEventTime}
            setNewEventTime={setNewEventTime}
            newEventProj={newEventProj}
            setNewEventProj={setNewEventProj}
            handleAddEvent={handleAddEvent}
            allModules={allModules}
            activeModules={activeModules}
            activeFeatures={activeFeatures}
            isApiError={isApiError}
            isModulesLoading={isModulesLoading}
            isModuleActive={isModuleActive}
            isCurrentModuleAllowed={isCurrentModuleAllowed}
            requiredModule={requiredModule}
          />
        </div>
      </div>
      
      </div>
        </WorkspaceProvider>
      </NotificationCenterProvider>
    </PlatformProvider>
  );
}
