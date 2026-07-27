import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  IncidentEscalationAlert,
  IncidentEscalationResult,
  IncidentEscalationSummary,
} from './IncidentEscalationTypes';

const INCIDENTS_ENDPOINT = '/api/observability/incidents';
const ALERTS_ENDPOINT = '/api/observability/incident-alerts';

export class IncidentEscalationService {
  static listAlerts(limit = 100): Promise<IncidentEscalationAlert[]> {
    return HttpRepositoryClient.get<IncidentEscalationAlert[]>(
      `${ALERTS_ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static escalate(
    incidentId: string,
  ): Promise<IncidentEscalationResult> {
    return HttpRepositoryClient.post<IncidentEscalationResult>(
      `${INCIDENTS_ENDPOINT}/${encodeURIComponent(incidentId)}/escalate`,
      {},
    );
  }

  static buildSummary(
    alerts: IncidentEscalationAlert[],
  ): IncidentEscalationSummary {
    const unreadAlerts = alerts.filter(
      (alert) => String(alert.status).toUpperCase() === 'UNREAD',
    ).length;
    const criticalAlerts = alerts.filter(
      (alert) => alert.escalationLevel === 'critical',
    ).length;
    const highAlerts = alerts.filter(
      (alert) => alert.escalationLevel === 'high',
    ).length;
    const affectedIncidents = new Set(
      alerts.map((alert) => alert.incidentId),
    ).size;

    return {
      totalAlerts: alerts.length,
      unreadAlerts,
      criticalAlerts,
      highAlerts,
      affectedIncidents,
      readinessScore: Math.max(
        0,
        Math.min(
          100,
          100 - unreadAlerts * 4 - criticalAlerts * 8 - highAlerts * 4,
        ),
      ),
    };
  }
}
