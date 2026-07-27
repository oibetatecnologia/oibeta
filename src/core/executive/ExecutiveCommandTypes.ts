import type { CommercialOpportunity } from '../commercial/OpportunityTypes';
import type { Task } from '../../types';

export type ExecutiveSeverity = 'healthy' | 'attention' | 'critical';
export type ExecutiveActionKind = 'commercial' | 'task' | 'platform';

export interface ExecutiveActionItem {
  id: string;
  kind: ExecutiveActionKind;
  severity: ExecutiveSeverity;
  title: string;
  description: string;
  targetTab: string;
  taskTitle: string;
  score: number;
}

export interface ExecutiveCommandSummary {
  generatedAt: string;
  healthScore: number;
  severity: ExecutiveSeverity;
  headline: string;
  activePipelineValue: number;
  qualifiedPipelineValue: number;
  commercialCompatibility: number;
  executionRate: number;
  urgentOpportunities: number;
  overdueTasks: number;
  staleItems: number;
  actionQueue: ExecutiveActionItem[];
  opportunitySpotlight: CommercialOpportunity[];
  taskSpotlight: Task[];
}
