export type RadarConnectorStatus = 'planned' | 'available' | 'disabled' | 'error';
export type RadarConnectorAuthPolicy = 'PUBLIC_NO_AUTH' | 'GLOBAL_PLATFORM' | 'TENANT_PROVIDED' | 'GLOBAL_OR_TENANT';
export type RadarConnectorCredentialScope = 'global' | 'tenant';

export interface RadarConnectorCredentialMetadata {
  connectorId: string;
  scope: RadarConnectorCredentialScope;
  organizationId?: string;
  configured: boolean;
  maskedValue?: string;
  label?: string;
  updatedAt?: string;
}
export type RadarSyncRunStatus = 'idle' | 'running' | 'completed' | 'completed_with_warnings' | 'failed';

export interface RadarConnectorDescriptor {
  id: string;
  sourceId: string;
  label: string;
  description: string;
  status: RadarConnectorStatus;
  supportsIncremental: boolean;
  supportsPagination: boolean;
  available: boolean;
  unavailableReason?: string;
  defaultLookbackDays?: number;
  documentationUrl?: string;
  authPolicy: RadarConnectorAuthPolicy;
  credentialConfigured?: boolean;
  credentialScope?: RadarConnectorCredentialScope;
  credentialMaskedValue?: string;
  canConfigureCredential?: boolean;
}

export interface RadarSyncRunMetrics {
  received: number;
  normalized: number;
  created: number;
  updated: number;
  duplicates: number;
  ignored: number;
  rejected: number;
  failures: number;
}

export interface RadarSyncRunRequest {
  dateFrom?: string;
  dateTo?: string;
  maxPages?: number;
  pageSize?: number;
  cursorBefore?: string;
}

export interface RadarSyncRun {
  id: string;
  organizationId: string;
  workspaceId?: string;
  connectorId: string;
  sourceId: string;
  status: RadarSyncRunStatus;
  startedAt: string;
  finishedAt?: string;
  cursorBefore?: string;
  cursorAfter?: string;
  metrics: RadarSyncRunMetrics;
  warnings: string[];
  errors: string[];
  initiatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
