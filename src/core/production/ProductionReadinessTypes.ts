export type ProductionReadinessStatus = 'ready' | 'attention' | 'blocked';
export type ProductionReadinessPriority = 'alta' | 'média' | 'baixa';

export interface ProductionReadinessArea {
  id: string;
  title: string;
  description: string;
  score: number;
  status: ProductionReadinessStatus;
  targetTab: string;
  taskTitle: string;
  priority: ProductionReadinessPriority;
}

export interface ProductionReadinessSummary {
  score: number;
  status: ProductionReadinessStatus;
  readyAreas: number;
  attentionAreas: number;
  blockedAreas: number;
  nextMilestone: string;
  areas: ProductionReadinessArea[];
}
