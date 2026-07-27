import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  CreateOperationalIncidentInput,
  OperationalIncident,
  OperationalIncidentSummary,
  UpdateOperationalIncidentInput,
} from './OperationalIncidentTypes';

const ENDPOINT = '/api/observability/incidents';

export class OperationalIncidentService {
  static list(limit = 100): Promise<OperationalIncident[]> {
    return HttpRepositoryClient.get<OperationalIncident[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static create(
    input: CreateOperationalIncidentInput,
  ): Promise<OperationalIncident> {
    return HttpRepositoryClient.post<OperationalIncident>(
      ENDPOINT,
      input,
    );
  }

  static synchronizeDetected(): Promise<{
    checkedAt: string;
    detected: number;
    created: number;
    updated: number;
    incidents: OperationalIncident[];
  }> {
    return HttpRepositoryClient.post(
      `${ENDPOINT}/synchronize`,
      {},
    );
  }

  static update(
    incidentId: string,
    input: UpdateOperationalIncidentInput,
  ): Promise<OperationalIncident> {
    return HttpRepositoryClient.put<OperationalIncident>(
      `${ENDPOINT}/${encodeURIComponent(incidentId)}`,
      input,
    );
  }

  static buildSummary(
    incidents: OperationalIncident[],
  ): OperationalIncidentSummary {
    const open = incidents.filter(
      (incident) => incident.status === 'open',
    );
    const investigating = incidents.filter(
      (incident) => incident.status === 'investigating',
    );
    const mitigated = incidents.filter(
      (incident) => incident.status === 'mitigated',
    );
    const resolved = incidents.filter(
      (incident) => incident.status === 'resolved',
    );
    const resolvedDurations = resolved
      .filter((incident) => incident.resolvedAt)
      .map((incident) => {
        const openedAt = new Date(incident.openedAt).getTime();
        const resolvedAt = new Date(
          incident.resolvedAt as string,
        ).getTime();

        return Math.max(0, resolvedAt - openedAt);
      });

    const active = [...open, ...investigating, ...mitigated];
    const criticalOpen = active.filter(
      (incident) => incident.severity === 'critical',
    ).length;
    const highOpen = active.filter(
      (incident) => incident.severity === 'high',
    ).length;
    const automatedActive = active.filter(
      (incident) => incident.automated,
    ).length;
    const repeatedActive = active.filter(
      (incident) => incident.occurrenceCount > 1,
    ).length;
    const readinessScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          criticalOpen * 30 -
          highOpen * 15 -
          open.length * 4 -
          investigating.length * 2,
      ),
    );

    return {
      total: incidents.length,
      open: open.length,
      investigating: investigating.length,
      mitigated: mitigated.length,
      resolved: resolved.length,
      criticalOpen,
      highOpen,
      automatedActive,
      repeatedActive,
      meanResolutionHours:
        resolvedDurations.length === 0
          ? 0
          : Math.round(
              (
                resolvedDurations.reduce(
                  (total, duration) => total + duration,
                  0,
                ) /
                resolvedDurations.length /
                3_600_000
              ) *
                10,
            ) / 10,
      readinessScore,
    };
  }
}
