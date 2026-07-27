import type { DeploymentConfigurationSummary } from './DeploymentConfigurationTypes';
import type { DeploymentConnectivitySummary } from './DeploymentConnectivityTypes';

export type DeploymentValidationStatus =
  | 'approved'
  | 'attention'
  | 'blocked';

export interface DeploymentValidationRun {
  id: string;
  status: DeploymentValidationStatus;
  score: number;
  productionBlocked: boolean;
  configurationScore: number;
  connectivityScore: number;
  configured: number;
  missing: number;
  invalid: number;
  warnings: number;
  healthyProbes: number;
  attentionProbes: number;
  criticalProbes: number;
  skippedProbes: number;
  environment: string;
  provider: string;
  databaseMode: string;
  configuration: DeploymentConfigurationSummary;
  connectivity: DeploymentConnectivitySummary;
  createdAt: string;
}

export interface DeploymentValidationSummary {
  totalRuns: number;
  approvedRuns: number;
  attentionRuns: number;
  blockedRuns: number;
  latest?: DeploymentValidationRun;
  latestApprovedAt?: string;
  readinessScore: number;
}
