export type OperationalIncidentSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export type OperationalIncidentStatus =
  | 'open'
  | 'investigating'
  | 'mitigated'
  | 'resolved';

export interface OperationalIncident {
  id: string;
  organizationId: string;
  workspaceId?: string;
  title: string;
  description: string;
  source: string;
  severity: OperationalIncidentSeverity;
  status: OperationalIncidentStatus;
  owner?: string;
  resolutionNotes?: string;
  fingerprint?: string;
  automated: boolean;
  occurrenceCount: number;
  lastDetectedAt?: string;
  openedAt: string;
  acknowledgedAt?: string;
  mitigatedAt?: string;
  resolvedAt?: string;
  updatedAt: string;
}

export interface CreateOperationalIncidentInput {
  title: string;
  description: string;
  source: string;
  severity: OperationalIncidentSeverity;
  owner?: string;
  fingerprint?: string;
  automated?: boolean;
}

export interface UpdateOperationalIncidentInput {
  title?: string;
  description?: string;
  severity?: OperationalIncidentSeverity;
  status?: OperationalIncidentStatus;
  owner?: string;
  resolutionNotes?: string;
}

export interface OperationalIncidentSummary {
  total: number;
  open: number;
  investigating: number;
  mitigated: number;
  resolved: number;
  criticalOpen: number;
  highOpen: number;
  automatedActive: number;
  repeatedActive: number;
  meanResolutionHours: number;
  readinessScore: number;
}
