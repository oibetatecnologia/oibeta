export type RadarConnectorStatus = 'planned' | 'available' | 'disabled' | 'error';
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
