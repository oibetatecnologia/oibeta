export type CustomerLifecycleStage =
  | "onboarding"
  | "adoption"
  | "value"
  | "renewal"
  | "risk"
  | "expanded";

export type CustomerHealthStatus =
  | "healthy"
  | "attention"
  | "critical";

export interface CustomerOnboardingItem {
  id: string;
  label: string;
  completed: boolean;
  responsible?: string;
  completedAt?: string;
}

export interface CustomerSuccessObjective {
  id: string;
  title: string;
  target?: string;
  status: "pending" | "in_progress" | "achieved" | "cancelled";
}

export interface CustomerRisk {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "mitigated" | "closed";
  mitigation?: string;
}

export interface CustomerOperationsPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  clientId: string;
  clientName: string;
  lifecycleStage: CustomerLifecycleStage;
  owner: string;
  healthStatus: CustomerHealthStatus;
  healthScore: number;
  onboardingChecklist: CustomerOnboardingItem[];
  objectives: CustomerSuccessObjective[];
  risks: CustomerRisk[];
  supportSlaHours: number;
  nextReviewAt?: string;
  renewalAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCustomerOperationsPlanInput {
  clientId: string;
  lifecycleStage: CustomerLifecycleStage;
  owner: string;
  healthStatus: CustomerHealthStatus;
  healthScore: number;
  onboardingChecklist: CustomerOnboardingItem[];
  objectives: CustomerSuccessObjective[];
  risks: CustomerRisk[];
  supportSlaHours: number;
  nextReviewAt?: string;
  renewalAt?: string;
  notes?: string;
}

export interface CustomerOperationsSummary {
  totalClients: number;
  managedClients: number;
  onboardingClients: number;
  healthyClients: number;
  attentionClients: number;
  criticalClients: number;
  overdueReviews: number;
  openRisks: number;
  onboardingProgress: number;
  readinessScore: number;
}
