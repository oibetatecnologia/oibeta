import type { OperationalIncident } from './OperationalIncidentTypes';

export type IncidentEscalationLevel =
  | 'critical'
  | 'high'
  | 'standard';

export interface IncidentEscalationAlert {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  message: string;
  escalationLevel: IncidentEscalationLevel;
  incidentId: string;
  incidentSeverity: OperationalIncident['severity'];
  incidentStatus: OperationalIncident['status'];
  occurrenceCount: number;
  status: string;
  createdAt: string;
}

export interface IncidentEscalationResult {
  incident: OperationalIncident;
  escalationLevel: IncidentEscalationLevel;
  recipients: number;
  notificationsCreated: number;
  notificationsReused: number;
  alerts: IncidentEscalationAlert[];
}

export interface IncidentEscalationSummary {
  totalAlerts: number;
  unreadAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  affectedIncidents: number;
  readinessScore: number;
}
