export type DeploymentEnvironmentKind =
  | 'development'
  | 'staging'
  | 'production';

export type DeploymentEnvironmentStatus =
  | 'ready'
  | 'attention'
  | 'pending'
  | 'offline';

export interface DeploymentEnvironment {
  id: string;
  tenantId: string;
  organizationId: string;
  workspaceId?: string;
  kind: DeploymentEnvironmentKind;
  name: string;
  status: DeploymentEnvironmentStatus;
  version: string;
  url: string;
  databaseStatus: DeploymentEnvironmentStatus;
  storageStatus: DeploymentEnvironmentStatus;
  apiStatus: DeploymentEnvironmentStatus;
  notes: string;
  lastDeployAt?: string;
  lastDeployVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentRecord {
  id: string;
  environmentId: string;
  tenantId: string;
  organizationId: string;
  version: string;
  status: 'success' | 'failed' | 'rolled_back';
  responsible: string;
  notes?: string;
  deployedAt: string;
}

export interface UpdateDeploymentEnvironmentInput {
  name?: string;
  status?: DeploymentEnvironmentStatus;
  version?: string;
  url?: string;
  databaseStatus?: DeploymentEnvironmentStatus;
  storageStatus?: DeploymentEnvironmentStatus;
  apiStatus?: DeploymentEnvironmentStatus;
  notes?: string;
}

export interface CreateDeploymentRecordInput {
  version: string;
  status: DeploymentRecord['status'];
  responsible: string;
  notes?: string;
}

export interface DeploymentEnvironmentSummary {
  totalEnvironments: number;
  readyEnvironments: number;
  attentionEnvironments: number;
  pendingEnvironments: number;
  offlineEnvironments: number;
  productionReady: boolean;
  stagingReady: boolean;
  readinessScore: number;
}
