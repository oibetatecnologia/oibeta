export type DeploymentLifecycleStatus =
  | "preparing"
  | "deployed"
  | "verified"
  | "completed"
  | "rollback_required"
  | "rolled_back";

export type DeploymentEvidenceType =
  | "lint"
  | "build"
  | "migration"
  | "gate"
  | "approval"
  | "deploy"
  | "health_check"
  | "other";

export interface DeploymentCutoverItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

export interface DeploymentEvidence {
  id: string;
  type: DeploymentEvidenceType;
  label: string;
  reference: string;
  recordedBy: string;
  recordedAt: string;
}

export interface DeploymentPostDeployCheck {
  id: string;
  label: string;
  status: "healthy" | "attention" | "critical";
  detail: string;
  checkedAt: string;
}

export interface DeploymentRollbackRecord {
  id: string;
  reason: string;
  responsible: string;
  sourceVersion: string;
  targetVersion: string;
  deploymentRecordId: string;
  executedAt: string;
}

export interface DeploymentReleaseLifecycle {
  id: string;
  executionId: string;
  approvalId: string;
  validationRunId: string;
  environmentId: string;
  organizationId: string;
  target: "staging" | "production";
  version: string;
  status: DeploymentLifecycleStatus;
  responsible: string;
  checklist: DeploymentCutoverItem[];
  evidences: DeploymentEvidence[];
  postDeployChecks: DeploymentPostDeployCheck[];
  rollback?: DeploymentRollbackRecord;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DeploymentReleaseLifecycleSummary {
  total: number;
  preparing: number;
  verified: number;
  completed: number;
  rollbackRequired: number;
  rolledBack: number;
  checklistCompletion: number;
  evidenceCompletion: number;
  latest?: DeploymentReleaseLifecycle;
  productionCompleted: boolean;
  readinessScore: number;
}
