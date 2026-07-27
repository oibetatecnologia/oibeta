export type CutoverStatus = 'healthy' | 'attention' | 'critical';

export interface CutoverGate {
  id: string;
  title: string;
  score: number;
  status: CutoverStatus;
  description: string;
  evidence: string;
  taskTitle: string;
}

export interface CutoverDomainPlan {
  institutionalUrl: string;
  applicationUrl: string;
  loginRedirectUrl: string;
  institutionalStack: 'Next.js';
  applicationStack: 'Vite + React';
}

export interface CutoverReadinessSummary {
  score: number;
  status: CutoverStatus;
  databaseMode: string;
  fallbackEnabled: boolean;
  fallbackProductionSafe: boolean;
  authenticated: boolean;
  sessionScore: number;
  tenantScore: number;
  readyTables: number;
  requiredTables: number;
  productionScore: number;
  gates: CutoverGate[];
  domainPlan: CutoverDomainPlan;
  blockers: CutoverGate[];
}
