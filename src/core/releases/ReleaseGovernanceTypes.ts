import type { Decision, Project, Task } from '../../types';

export type ReleaseRisk = 'saudavel' | 'atencao' | 'critico';

export interface ReleaseGovernanceInput {
  projects: Project[];
  tasks: Task[];
  decisions: Decision[];
  productionScore: number;
  persistenceScore: number;
  observabilityScore: number;
  accessControlScore: number;
  sessionScore: number;
}

export interface ReleaseGate {
  id: string;
  label: string;
  score: number;
  status: ReleaseRisk;
  description: string;
}

export interface ReleaseCandidateInsight {
  id: string;
  projectId: string;
  projectName: string;
  score: number;
  status: ReleaseRisk;
  openTasks: number;
  criticalTasks: number;
  overdueTasks: number;
  decisions: number;
  recommendation: string;
}

export interface ReleaseAction {
  id: string;
  title: string;
  description: string;
  priority: 'alta' | 'media';
  taskTitle: string;
}

export interface ReleaseGovernanceSummary {
  score: number;
  status: ReleaseRisk;
  gates: ReleaseGate[];
  candidates: ReleaseCandidateInsight[];
  actions: ReleaseAction[];
  readyProjects: number;
  blockedProjects: number;
  openTasks: number;
  overdueTasks: number;
}
