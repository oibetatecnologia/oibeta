import type { DeploymentConfigurationSummary } from '../configuration/DeploymentConfigurationTypes';
import type { DeploymentConnectivitySummary } from '../configuration/DeploymentConnectivityTypes';

export type ProductionGateStatus = 'healthy' | 'attention' | 'critical';

export interface ProductionDomainTarget {
  id: 'institutional' | 'application';
  label: string;
  hostname: string;
  url: string;
  technology: string;
  responsibility: string;
  status: ProductionGateStatus;
  evidence: string;
}

export interface ProductionOperationsGate {
  id: string;
  title: string;
  description: string;
  status: ProductionGateStatus;
  score: number;
  taskTitle: string;
}

export interface ProductionOperationsSummary {
  score: number;
  status: ProductionGateStatus;
  productionBlocked: boolean;
  configuration: DeploymentConfigurationSummary;
  connectivity: DeploymentConnectivitySummary;
  domains: ProductionDomainTarget[];
  gates: ProductionOperationsGate[];
  nextActions: string[];
  checkedAt: string;
}
