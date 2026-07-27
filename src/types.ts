export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  lastStopPoint: string; // Onde paramos
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  projectId: string;
  title: string;
  description: string;
  content?: string;
  reason?: string;
  impact?: 'baixo' | 'médio' | 'alto' | 'estratégico';
  importance?: 'baixa' | 'média' | 'alta' | 'crítica';
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'baixa' | 'média' | 'alta' | 'crítica';
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  projectId?: string; // Optional: associated with a specific project or global
  content: string;
  type?: 'decisão' | 'fato' | 'objetivo' | 'preferência' | 'risco' | 'aprendizado' | 'fonte' | 'contexto';
  importance?: 'baixa' | 'média' | 'alta' | 'crítica';
  tags?: string[];
  source?: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  projectId?: string; // Active contextual project during this message
  userId: string;
  sender: 'user' | 'beta';
  content: string;
  createdAt: string;
  suggestions?: {
    suggestedProject?: { name: string; description?: string; lastStopPoint?: string };
    suggestedDecision?: { projectId?: string; title: string; description?: string };
    suggestedTask?: { projectId?: string; title: string };
    suggestedMemory?: { projectId?: string; content: string };
    suggestedStopPointUpdate?: { projectId?: string; stopPoint: string };
  };
}

export interface ProjectState {
  projectId: string;
  projectName: string;
  currentObjective: string; // Objetivo atual do projeto
  currentStage: string; // Etapa atual do projeto
  lastStopPoint: string; // Último ponto de parada registrado
  recentDecisions: string[]; // Títulos das decisões tomadas recentemente
  pendingTasks: string[]; // Títulos das tarefas pendentes de conclusão
  executiveSummary: string; // Resumo executivo automático gerado via LLM / Engine
  nextRecommendedAction?: string;
  importantMemories?: string[];
  risks?: string[];
  confidenceScore?: number;
  lastUpdatedDate: string; // Data da última atualização
  updatedAt?: string;
}

export interface BetaCoreData {
  projects: Project[];
  projectStates: ProjectState[];
  decisions: Decision[];
  tasks: Task[];
  memories: Memory[];
  chatHistory: ChatMessage[];
}
