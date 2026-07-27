import type { ClientImplementationStatus } from '../../hooks/useClientState';

export type ImplementationRiskLevel = 'saudável' | 'atenção' | 'crítico';
export type ImplementationActionPriority = 'baixa' | 'média' | 'alta' | 'crítica';

export interface ImplementationSnapshot {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  status: ClientImplementationStatus;
  responsible: string;
  progress: number;
  checklistCompleted: number;
  checklistTotal: number;
  expectedGoLiveDate?: string;
  daysToGoLive?: number;
  daysWithoutUpdate: number;
  riskLevel: ImplementationRiskLevel;
  readinessScore: number;
  blockers: string[];
  nextMilestone: string;
}

export interface ImplementationActionItem {
  id: string;
  implementationId: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  priority: ImplementationActionPriority;
  targetTab: 'implementations';
  taskTitle: string;
  alreadyCreated: boolean;
}

export interface ImplementationStageSummary {
  status: ClientImplementationStatus;
  label: string;
  count: number;
  percentage: number;
}

export interface ImplementationIntelligenceSummary {
  healthScore: number;
  riskLevel: ImplementationRiskLevel;
  total: number;
  active: number;
  completed: number;
  blocked: number;
  waitingClient: number;
  overdue: number;
  stale: number;
  averageProgress: number;
  averageReadiness: number;
  projectedGoLives30Days: number;
  snapshots: ImplementationSnapshot[];
  stages: ImplementationStageSummary[];
  actions: ImplementationActionItem[];
  executiveMessage: string;
}
