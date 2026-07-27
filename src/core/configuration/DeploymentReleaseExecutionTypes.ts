export type DeploymentReleaseExecutionStatus =
  | 'success'
  | 'failed'
  | 'rolled_back';

export interface DeploymentReleaseExecution {
  id: string;
  approvalId: string;
  validationRunId: string;
  environmentId: string;
  organizationId: string;
  target: 'staging' | 'production';
  version: string;
  status: DeploymentReleaseExecutionStatus;
  responsible: string;
  notes?: string;
  deploymentRecordId: string;
  executedAt: string;
}

export interface CreateDeploymentReleaseExecutionInput {
  approvalId: string;
  environmentId: string;
  status: DeploymentReleaseExecutionStatus;
  responsible: string;
  notes?: string;
}

export interface DeploymentReleaseExecutionSummary {
  total: number;
  successful: number;
  failed: number;
  rolledBack: number;
  productionExecuted: boolean;
  stagingExecuted: boolean;
  latest?: DeploymentReleaseExecution;
  readinessScore: number;
}
