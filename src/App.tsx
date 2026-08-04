import React, { useState, useEffect } from 'react';
import { Project, Decision, Task, Memory, ChatMessage, ProjectState } from './types';
import ChatPanel from './components/ChatPanel';
import ManagerPanel from './components/ManagerPanel';
import AuthOverlay from './components/AuthOverlay';
import { Layers, FileText, CheckSquare, Building2, PanelRight, MessageSquare } from 'lucide-react';
import { ClientSessionStorage } from './core/auth/ClientSessionStorage';
import {
  MASTER_ADMIN_CONTEXT,
  buildAuthenticatedHeaders,
  normalizeAuthenticatedUser,
  isOiBetaInternalUserContext,
  type AuthenticatedUserContext,
} from './core/auth/AuthenticatedUserContext';

type AuthUser = AuthenticatedUserContext;

const DEFAULT_AUTH_USER: AuthUser = MASTER_ADMIN_CONTEXT;

const resolveStoredUser = (): AuthUser | null => {
  const session = ClientSessionStorage.read<AuthUser>();
  return normalizeAuthenticatedUser(session?.user);
};

const persistUser = (
  nextUser: AuthUser | null,
  accessToken?: string,
  refreshToken?: string,
  expiresAt?: number,
) => {
  if (nextUser) {
    ClientSessionStorage.write(nextUser, accessToken, refreshToken, expiresAt);
  } else {
    ClientSessionStorage.clear();
  }
};

const getTenantHeaders = (user: AuthUser | null): Record<string, string> => ({
  ...ClientSessionStorage.buildAuthorizationHeader(),
  ...buildAuthenticatedHeaders(user as AuthUser, true),
});

const getTenantOnlyHeaders = (user: AuthUser | null): Record<string, string> => ({
  ...ClientSessionStorage.buildAuthorizationHeader(),
  ...buildAuthenticatedHeaders(user as AuthUser),
});


const buildChatStorageKey = (user: AuthUser): string =>
  `beta_chat_history:${user.organizationId || 'org'}:${user.workspaceId || 'workspace'}:${user.id || 'user'}`;

const readStoredChatHistory = (user: AuthUser): ChatMessage[] => {
  try {
    const raw = window.sessionStorage.getItem(buildChatStorageKey(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ChatMessage[] : [];
  } catch {
    return [];
  }
};

const asArray = <T,>(value: unknown): T[] => {
  return Array.isArray(value) ? value as T[] : [];
};

const safeJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};


const DEMO_PROJECT_NAMES = new Set([
  'Beta Core',
  'Beta Gov',
  'Sistema Eleitoral',
  'Beta Licita',
  'Fábrica de Software',
]);

const DEMO_PROJECT_NAME_REGEX = /^(projeto test|teste 0|teste 02|test project|demo project)/i;

const isDemoProject = (project: Project): boolean => {
  const name = String(project?.name || '').trim();
  return DEMO_PROJECT_NAMES.has(name) || DEMO_PROJECT_NAME_REGEX.test(name);
};

const fetchJsonArray = async <T,>(url: string, user: AuthUser | null): Promise<T[]> => {
  try {
    const response = await fetch(url, {
      headers: getTenantOnlyHeaders(user)
    });

    if (!response.ok) {
      console.warn(`[Beta Platform] ${url} retornou ${response.status}. Usando lista vazia no frontend.`);
      return [];
    }

    return asArray<T>(await safeJson(response));
  } catch (error) {
    console.error(`[Beta Platform] Falha ao carregar ${url}:`, error);
    return [];
  }
};


const emitProjectCreateDebug = (message: string, payload?: unknown) => {
  console.log(`[CRIAR PROJETO][App.tsx] ${message}`, payload ?? '');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('beta-project-create-debug', {
      detail: {
        source: 'App.tsx',
        message,
        payload,
        time: new Date().toLocaleTimeString()
      }
    }));
  }
};


export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStates, setProjectStates] = useState<ProjectState[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatStorageReady, setChatStorageReady] = useState(false);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Layout states for pro workspace controls
  const [isBetaCollapsed, setIsBetaCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Theme states
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('oi_beta_theme') || 'dark');
  const [followSystem, setFollowSystem] = useState<boolean>(() => localStorage.getItem('oi_beta_follow_system') === 'true');

  useEffect(() => {
    localStorage.setItem('oi_beta_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('oi_beta_follow_system', String(followSystem));
  }, [followSystem]);


  useEffect(() => {
    if (!user) {
      setChatStorageReady(false);
      return;
    }
    setChatHistory(readStoredChatHistory(user));
    setChatStorageReady(true);
  }, [user?.id, user?.organizationId, user?.workspaceId]);

  useEffect(() => {
    if (!user || !chatStorageReady) return;
    window.sessionStorage.setItem(buildChatStorageKey(user), JSON.stringify(chatHistory));
  }, [chatHistory, chatStorageReady, user?.id, user?.organizationId, user?.workspaceId]);

  useEffect(() => {
    const applyTheme = () => {
      let activeTheme = theme;
      if (followSystem) {
        const isDarkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = isDarkOS ? 'dark' : 'light';
      }

      const root = document.documentElement;
      if (activeTheme === 'dark') {
        root.style.setProperty('--bg-main', '#0d1117');
        root.style.setProperty('--bg-sidebar', '#010409');
        root.style.setProperty('--bg-card', '#161b22');
        root.style.setProperty('--border-color', '#30363d');
        root.style.setProperty('--text-main', '#f0f6fc');
        root.style.setProperty('--text-secondary', '#8b949e');
        root.style.setProperty('--blue-accent', '#2f81f7');
        root.style.setProperty('--cyan-accent', '#58a6ff');
        root.style.setProperty('--green-accent', '#3fb950');
      } else if (activeTheme === 'light') {
        root.style.setProperty('--bg-main', '#ffffff');
        root.style.setProperty('--bg-sidebar', '#f6f8fa');
        root.style.setProperty('--bg-card', '#ffffff');
        root.style.setProperty('--border-color', '#d0d7de');
        root.style.setProperty('--text-main', '#24292f');
        root.style.setProperty('--text-secondary', '#57606a');
        root.style.setProperty('--blue-accent', '#0969da');
        root.style.setProperty('--cyan-accent', '#0550ae');
        root.style.setProperty('--green-accent', '#1a7f37');
      } else if (activeTheme === 'gov') {
        root.style.setProperty('--bg-main', '#051e14');
        root.style.setProperty('--bg-sidebar', '#02120b');
        root.style.setProperty('--bg-card', '#092c1e');
        root.style.setProperty('--border-color', '#134e35');
        root.style.setProperty('--text-main', '#f0fbf6');
        root.style.setProperty('--text-secondary', '#7dbb9f');
        root.style.setProperty('--blue-accent', '#10b981');
        root.style.setProperty('--cyan-accent', '#34d399');
        root.style.setProperty('--green-accent', '#059669');
      } else if (activeTheme === 'intelligence') {
        root.style.setProperty('--bg-main', '#0b0914');
        root.style.setProperty('--bg-sidebar', '#06040a');
        root.style.setProperty('--bg-card', '#151125');
        root.style.setProperty('--border-color', '#2f264f');
        root.style.setProperty('--text-main', '#f5f3ff');
        root.style.setProperty('--text-secondary', '#a78bfa');
        root.style.setProperty('--blue-accent', '#8b5cf6');
        root.style.setProperty('--cyan-accent', '#c084fc');
        root.style.setProperty('--green-accent', '#10b981');
      }
    };

    applyTheme();

    if (followSystem) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme, followSystem]);

  // Fetch initial collections
  const fetchData = async () => {
    if (isOiBetaInternalUserContext(user) && !user?.workspaceId) {
      setProjects([]);
      setDecisions([]);
      setTasks([]);
      setMemories([]);
      setProjectStates([]);
      setSelectedProjectId('');
      setIsLoading(false);
      return;
    }

    try {
      const [
        dataProj,
        dataDec,
        dataTasks,
        dataMems,
        dataStates,
        workspaceStateResponse
      ] = await Promise.all([
        fetchJsonArray<Project>('/api/projects', user),
        fetchJsonArray<Decision>('/api/decisions', user),
        fetchJsonArray<Task>('/api/tasks', user),
        fetchJsonArray<Memory>('/api/memories', user),
        fetchJsonArray<ProjectState>('/api/project-states', user),
        fetch(`/api/workspace-state?workspaceId=${encodeURIComponent(String(user?.workspaceId || ''))}`, {
            headers: getTenantOnlyHeaders(user)
          })
          .then(async response => {
            if (!response.ok) {
              console.warn(`[Beta Platform] /api/workspace-state retornou ${response.status}.`);
              return null;
            }
            return safeJson(response);
          })
          .catch(error => {
            console.error('[Beta Platform] Falha ao carregar /api/workspace-state:', error);
            return null;
          })
      ]);

      const visibleProjects = dataProj.filter((project) => !isDemoProject(project));
      const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
      const visibleDecisions = dataDec.filter((decision) => !decision.projectId || visibleProjectIds.has(decision.projectId));
      const visibleTasks = dataTasks.filter((task) => !task.projectId || visibleProjectIds.has(task.projectId));
      const visibleMemories = dataMems.filter((memory) => !memory.projectId || visibleProjectIds.has(memory.projectId));
      const visibleProjectStates = dataStates.filter((state) => !state.projectId || visibleProjectIds.has(state.projectId));

      setProjects(visibleProjects);
      setDecisions(visibleDecisions);
      setTasks(visibleTasks);
      setMemories(visibleMemories);
      setProjectStates(visibleProjectStates);

      const dataWS = workspaceStateResponse as {
        success?: boolean;
        state?: {
          activeProjectId?: string;
        };
      } | null;

      let loadedProjectId = '';
      if (dataWS?.success && dataWS.state?.activeProjectId) {
        const exists = visibleProjects.some((p) => p.id === dataWS.state?.activeProjectId);
        if (exists) {
          loadedProjectId = dataWS.state.activeProjectId;
        }
      }

      if (!loadedProjectId && visibleProjects.length > 0) {
        loadedProjectId = visibleProjects[0].id;
      }

      setSelectedProjectId(loadedProjectId);
    } catch (error) {
      console.error('Error synchronization data with Beta Core Server:', error);
      setProjects([]);
      setDecisions([]);
      setTasks([]);
      setMemories([]);
      setProjectStates([]);
      setSelectedProjectId('');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSession = async () => {
    const storedUser = resolveStoredUser();

    try {
      if (storedUser) {
        const hasFreshSession = await ClientSessionStorage.ensureFreshSession(120);
        if (!hasFreshSession && ClientSessionStorage.getAccessToken()) {
          persistUser(null);
          setUser(null);
          return;
        }
      }

      const res = await fetch('/api/auth/session', { headers: ClientSessionStorage.buildAuthorizationHeader() });

      if (res.status === 429) {
        console.warn('[Beta Platform] /api/auth/session retornou 429. Mantendo sessão local apenas se já existir usuário salvo.');
        if (storedUser) {
          setUser(storedUser);
          return;
        }
        setUser(null);
        return;
      }

      const data = await safeJson(res) as any;

      if (res.status === 401) {
        persistUser(null);
        setUser(null);
        return;
      }

      if (res.ok && data?.success && data.user) {
        const normalizedUser = normalizeAuthenticatedUser(data.user);
        if (!normalizedUser) {
          persistUser(null);
          setUser(null);
          return;
        }
        persistUser(normalizedUser);
        setUser(normalizedUser);
        return;
      }

      if (storedUser) {
        setUser(storedUser);
        return;
      }

      setUser(null);
    } catch (e) {
      console.error('Session verification failed. Exibindo login local:', e);
      if (storedUser) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!user) return;

    const refreshSession = async () => {
      const refreshed = await ClientSessionStorage.ensureFreshSession();
      if (!refreshed && ClientSessionStorage.isAccessTokenExpiring(0)) {
        persistUser(null);
        setUser(null);
      }
    };

    const intervalId = window.setInterval(refreshSession, 60_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshSession();
    };
    const handleFocus = () => void refreshSession();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    void refreshSession();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSelectProject = async (id: string) => {
    setSelectedProjectId(id);
    try {
      await fetch('/api/workspace-state', {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify({
          activeProjectId: id,
          workspaceId: String(user?.workspaceId || '')
        })
      });
    } catch (e) {
      console.error("Failed to save workspace state to server:", e);
    }
  };

  // Create Project
  const handleCreateProject = async (newProj: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    emitProjectCreateDebug('1. handleCreateProject entrou no App.tsx', newProj);

    try {
      const headers = getTenantHeaders(user);
      emitProjectCreateDebug('2. Antes do fetch POST /api/projects', headers);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify(newProj)
      });

      emitProjectCreateDebug('3. Depois do fetch POST /api/projects', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      const data = await safeJson(response) as any;
      emitProjectCreateDebug('4. JSON recebido do POST /api/projects', data);

      if (!response.ok) {
        console.error('[Beta Platform] Falha ao criar projeto:', data);
        throw new Error(`POST /api/projects falhou com status ${response.status}`);
      }

      if (!data?.success || !data?.project?.id) {
        throw new Error('POST /api/projects respondeu sem success/project.id');
      }

      emitProjectCreateDebug('5. Projeto criado. Atualizando listas com fetchData()', data.project);
      await fetchData();

      emitProjectCreateDebug('6. Lista atualizada. Selecionando novo projeto', data.project.id);
      setSelectedProjectId(data.project.id);
    } catch (e) {
      emitProjectCreateDebug('ERRO dentro do handleCreateProject no App.tsx', e instanceof Error ? e.message : e);
      console.error('[Beta Platform] Erro ao criar projeto no App.tsx:', e);
      throw e;
    }
  };

  // Toggle state Project status
  const handleToggleProjectStatus = async (id: string, status: 'active' | 'paused' | 'completed') => {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify({ id, status })
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Update stop point
  const handleUpdateProjectStopPoint = async (projectId: string, lastStopPoint: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/stop-point`, {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify({ lastStopPoint })
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update project state manually (Objective and Stage)
  const handleUpdateProjectState = async (pId: string, currentObjective: string, currentStage: string) => {
    try {
      const response = await fetch(`/api/project-states/${pId}/update`, {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify({ currentObjective, currentStage })
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Recalculate Cognitive state automatically via context engine
  const handleRecalculateState = async (pId: string) => {
    try {
      const response = await fetch(`/api/projects/${pId}/rebuild-context`, {
        method: 'POST',
        headers: getTenantOnlyHeaders(user)
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error("Error rebuilding context manually:", e);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getTenantOnlyHeaders(user)
      });
      if (res.ok) {
        await fetchData();
        // Fallback to first remaining project if selected got deleted
        const remaining = projects.filter(p => p.id !== id);
        if (remaining.length > 0) {
          setSelectedProjectId(remaining[0].id);
        } else {
          setSelectedProjectId('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create decision
  const handleCreateDecision = async (dec: Omit<Decision, 'id' | 'createdAt' | 'userId'>) => {
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify(dec)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDecision = async (id: string) => {
    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: 'DELETE',
        headers: getTenantOnlyHeaders(user)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Task
  const handleCreateTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify(task)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTaskStatus = async (id: string, currentStatus: 'pending' | 'in_progress' | 'completed') => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify({ id, status: nextStatus })
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: getTenantOnlyHeaders(user)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Memory
  const handleCreateMemory = async (mem: Omit<Memory, 'id' | 'createdAt' | 'userId'>) => {
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify(mem)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
        headers: getTenantOnlyHeaders(user)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Send message to Beta Chat Core
  const handleSendMessage = async (text: string) => {
    setIsSending(true);
    
    // Optimistic UI update
    const tempUserMsg: ChatMessage = {
      id: "temp_" + Math.random().toString(),
      sender: "user",
      content: text,
      userId: user?.id || "temp",
      projectId: selectedProjectId || undefined,
      createdAt: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: getTenantHeaders(user),
        body: JSON.stringify({
          content: text,
          projectId: selectedProjectId || null,
          currentProjectId: selectedProjectId || null,
          userId: user!.id,
          organizationId: user!.organizationId,
          workspaceId: String(user?.workspaceId || '')
        })
      });

      if (response.ok) {
        const data = await safeJson(response) as any;
        const betaMessage = data?.betaMessage || data?.message || data?.reply || data?.chatMessage || null;
        if (betaMessage) {
          setChatHistory(prev => [...prev, betaMessage]);
        } else {
          setChatHistory(prev => [...prev, {
            id: `beta_error_${Date.now()}`,
            sender: 'beta',
            content: 'Não consegui interpretar a resposta recebida. A comunicação foi concluída, mas o contrato da resposta veio incompleto.',
            userId: user?.id || 'beta',
            createdAt: new Date().toISOString()
          }]);
        }
      } else {
        const errorData = await safeJson(response) as any;
        const errorMessage = errorData?.error || errorData?.message || `Falha de comunicação com a Beta (${response.status}).`;
        setChatHistory(prev => [...prev, {
          id: `beta_error_${Date.now()}`,
          sender: 'beta',
          content: errorMessage,
          userId: user?.id || 'beta',
          createdAt: new Date().toISOString()
        }]);
      }
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, {
        id: `beta_error_${Date.now()}`,
        sender: 'beta',
        content: e instanceof Error ? `Não consegui concluir a comunicação: ${e.message}` : 'Não consegui concluir a comunicação com o servidor.',
        userId: user?.id || 'beta',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  // Clear chat logs
  const handleClearChat = async () => {
    if (!window.confirm("Deseja realmente limpar o histórico do chat com a Beta?")) return;
    try {
      const res = await fetch('/api/chat/clear', {
        method: 'POST',
        headers: getTenantOnlyHeaders(user)
      });
      if (res.ok) {
        setChatHistory([]);
        if (user) {
          window.sessionStorage.removeItem(buildChatStorageKey(user));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Accept a structured automation suggestion made by Beta Core AI
  const handleAcceptSuggestion = async (type: 'project' | 'decision' | 'task' | 'memory' | 'stopPoint', data: any) => {
    try {
      const currentUserId = String(user?.id || '').trim();
      if (!currentUserId) {
        throw new Error('Sessão sem usuário válido para aceitar a sugestão da Beta.');
      }

      if (type === 'project') {
        await handleCreateProject({
          name: data.name,
          description: data.description || '',
          status: 'active',
          lastStopPoint: data.lastStopPoint || 'Projeto iniciado.',
          userId: currentUserId
        });
      } else if (type === 'decision') {
        await handleCreateDecision({
          projectId: data.projectId || selectedProjectId,
          title: data.title,
          description: data.description || ''
        });
      } else if (type === 'task') {
        await handleCreateTask({
          projectId: data.projectId || selectedProjectId,
          title: data.title,
          status: 'pending'
        });
      } else if (type === 'memory') {
        await handleCreateMemory({
          projectId: data.projectId || selectedProjectId,
          content: data.content
        });
      } else if (type === 'stopPoint') {
        await handleUpdateProjectStopPoint(
          data.projectId || selectedProjectId,
          data.stopPoint
        );
      }

      // Append an system confirmation alert into the Chat logs locally
      const systemMessage: ChatMessage = {
        id: "sys_" + Math.random().toString(),
        sender: "beta",
        content: `✨ _Ação executada com sucesso! Cadastrado na base do **Beta Core**:_ **${type.toUpperCase()}** no workspace ativo.`,
        userId: user?.id || "system",
        createdAt: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, systemMessage]);
    } catch (err) {
      console.error(err);
    }
  };

  const activeProjectObj = Array.isArray(projects) ? projects.find(p => p.id === selectedProjectId) || null : null;

  if (isAuthChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010409] text-[#f0f6fc] font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Sincronizando com a base Oi Beta...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthOverlay
        onSuccess={(loggedInUser, accessToken, refreshToken, expiresAt) => {
          const normalizedUser = normalizeAuthenticatedUser(loggedInUser);
          if (!normalizedUser) {
            persistUser(null);
            setUser(null);
            return;
          }
          persistUser(normalizedUser, accessToken, refreshToken, expiresAt);
          setUser(normalizedUser);
        }}
      />
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] font-sans overflow-hidden transition-colors duration-200">
      
      {/* 1. Global Workspace Header */}
      <header className="h-[56px] shrink-0 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between px-4 z-40 select-none">
        
        {/* Brand info */}
        <div className="flex items-center gap-2.5">
          <div className="bg-[var(--blue-accent)]/15 border border-[var(--blue-accent)]/30 text-[var(--blue-accent)] p-1.5 rounded-lg flex items-center justify-center shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold tracking-wider text-sm text-[var(--text-main)] font-sans">
                OI BETA
              </h1>
              <span className="text-[9px] bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] font-semibold border border-[var(--blue-accent)]/20 px-1.5 py-0.2 rounded-full tracking-wider uppercase font-mono">
                Painel Empresarial
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] font-mono tracking-tight font-medium leading-none mt-0.5">Oi Beta Tecnologia</p>
          </div>
        </div>

        {/* Global Statistics Indicators (Desktop only, minimal and elegant) */}
        <div className="hidden md:flex items-center gap-4 text-[11px] font-mono font-semibold">
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Layers className="w-3.5 h-3.5 text-[var(--blue-accent)]" /> Projetos da Oi Beta: <strong className="text-[var(--text-main)] font-bold">{projects.length}</strong>
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <CheckSquare className="w-3.5 h-3.5 text-[var(--green-accent)]" /> Tarefas Ativas: <strong className="text-[var(--text-main)] font-bold">{tasks.filter(t => t.status !== 'completed').length}</strong>
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <FileText className="w-3.5 h-3.5 text-[var(--cyan-accent)]" /> Decisões: <strong className="text-[var(--text-main)] font-bold">{decisions.length}</strong>
          </span>
        </div>

        {/* Layout action controls */}
        <div className="flex items-center gap-2">
          {/* Quick theme toggles inside settings or main controls */}
          <button
            onClick={() => setIsBetaCollapsed(!isBetaCollapsed)}
            className={`p-2 rounded-lg border transition-all duration-150 flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
              !isBetaCollapsed 
                ? 'bg-[var(--blue-accent)]/10 border-[var(--blue-accent)]/30 text-[var(--blue-accent)]' 
                : 'bg-transparent border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
            }`}
            title="Abrir ou ocultar a Beta"
          >
            <PanelRight className="w-4 h-4" />
            <span className="hidden sm:inline">Beta</span>
          </button>
        </div>
      </header>

      {/* 2. Full Workspace View split area */}
      <main className="flex-1 w-full flex overflow-hidden min-h-0 relative bg-[var(--bg-main)]" id="oi-beta-dashboard-container">
        
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--border-color)] border-t-[var(--blue-accent)] animate-spin" />
            <p className="text-xs font-semibold text-[var(--text-secondary)] font-mono">Sincronizando o Painel Empresarial...</p>
          </div>
        ) : (
          <>
            {/* Left Area: Operations Sidebar + Content Canvas (using ManagerPanel) */}
            <section className="flex-1 h-full min-w-0 flex flex-col overflow-hidden relative">
              <ManagerPanel 
                projects={projects}
                projectStates={projectStates}
                decisions={decisions}
                tasks={tasks}
                memories={memories}
                selectedProjectId={selectedProjectId}
                onSelectProject={handleSelectProject}
                onCreateProject={handleCreateProject}
                onUpdateProjectStopPoint={handleUpdateProjectStopPoint}
                onUpdateProjectState={handleUpdateProjectState}
                onRecalculateState={handleRecalculateState}
                onDeleteProject={handleDeleteProject}
                onToggleProjectStatus={handleToggleProjectStatus}
                
                onCreateDecision={handleCreateDecision}
                onDeleteDecision={handleDeleteDecision}
                
                onCreateTask={handleCreateTask}
                onToggleTaskStatus={handleToggleTaskStatus}
                onDeleteTask={handleDeleteTask}
                
                onCreateMemory={handleCreateMemory}
                onDeleteMemory={handleDeleteMemory}

                theme={theme}
                setTheme={setTheme}
                followSystem={followSystem}
                setFollowSystem={setFollowSystem}
                user={user}
                onLogout={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST', headers: ClientSessionStorage.buildAuthorizationHeader() });
                  } catch (e) {
                    console.warn('[Beta Platform] Logout remoto falhou, limpando sessão local mesmo assim:', e);
                  }
                  persistUser(null);
                  setUser(null);
                }}
              />
            </section>

            {/* Right Area: Interactive AI Assistant Drawer Panel */}
            <aside 
              className={`h-full border-l border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col overflow-hidden transition-all duration-300 z-30 absolute lg:relative right-0 top-0 shadow-xl lg:shadow-none ${
                isBetaCollapsed 
                  ? 'w-[0px] translate-x-full lg:translate-x-0 lg:w-0 border-l-0 opacity-0 pointer-events-none' 
                  : 'w-[320px] sm:w-[380px] lg:w-[380px] translate-x-0'
              }`}
            >
              <ChatPanel 
                chatHistory={chatHistory}
                projects={projects}
                activeProject={activeProjectObj}
                onSendMessage={handleSendMessage}
                onClearChat={handleClearChat}
                onAcceptSuggestion={handleAcceptSuggestion}
                isSending={isSending}
              />
            </aside>

            {/* Floating button on Mobile/Tablet to quickly trigger collapsed Beta chat */}
            {isBetaCollapsed && (
              <button
                onClick={() => setIsBetaCollapsed(false)}
                className="absolute bottom-6 right-6 lg:hidden z-40 bg-[var(--blue-accent)] text-white p-3 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-[var(--blue-accent)]"
              >
                <MessageSquare className="w-5.5 h-5.5" />
              </button>
            )}
            
            {/* Backdrop for overlay drawer on Mobile / Tablets when open */}
            {!isBetaCollapsed && (
              <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-xs z-20 lg:hidden"
                onClick={() => setIsBetaCollapsed(true)}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Slim Professional Status Bar */}
      <footer className="h-6 shrink-0 bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] flex items-center justify-between px-4 text-[10px] font-mono tracking-wide text-[var(--text-secondary)] select-none z-45">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-accent)] shrink-0 animate-pulse" />
            BETA ONLINE
          </span>
          <span className="text-[var(--border-color)]">|</span>
          <span className="truncate">BASE DE DADOS: INTEGRADA</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>AMBIENTE LOCAL</span>
          <span>•</span>
          <span>© 2026 OI BETA TECNOLOGIA CORPORATIVA S/A</span>
        </div>
      </footer>
    </div>
  );
}
