export type DeploymentReleaseTarget =
  | "staging"
  | "production";

export type DeploymentReleaseApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface DeploymentReleaseApproval {
  id: string;
  validationRunId: string;
  target: DeploymentReleaseTarget;
  version: string;
  status: DeploymentReleaseApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
  validationScore: number;
  validationStatus: string;
  productionBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeploymentReleaseApprovalInput {
  validationRunId: string;
  target: DeploymentReleaseTarget;
  version: string;
  requestedBy: string;
  notes?: string;
}

export interface DecideDeploymentReleaseApprovalInput {
  status: "approved" | "rejected" | "cancelled";
  decidedBy: string;
  notes?: string;
}

export interface DeploymentReleaseApprovalSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  productionApproved: boolean;
  stagingApproved: boolean;
  latest?: DeploymentReleaseApproval;
  readinessScore: number;
}
