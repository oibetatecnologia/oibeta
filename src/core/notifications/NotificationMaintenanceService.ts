import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  NotificationMaintenancePreview,
  NotificationMaintenanceResult,
  NotificationMaintenanceRun,
  NotificationMaintenanceSummary,
} from './NotificationMaintenanceTypes';

const ENDPOINT = '/api/notification-maintenance';

export class NotificationMaintenanceService {
  static preview(): Promise<NotificationMaintenancePreview> {
    return HttpRepositoryClient.get<NotificationMaintenancePreview>(
      `${ENDPOINT}/preview`,
    );
  }

  static execute(): Promise<NotificationMaintenanceResult> {
    return HttpRepositoryClient.post<NotificationMaintenanceResult>(
      `${ENDPOINT}/execute`,
      {},
    );
  }

  static listRuns(limit = 50): Promise<NotificationMaintenanceRun[]> {
    return HttpRepositoryClient.get<NotificationMaintenanceRun[]>(
      `${ENDPOINT}/runs?limit=${Math.max(1, Math.min(limit, 200))}`,
    );
  }

  static buildSummary(
    preview: NotificationMaintenancePreview | undefined,
    runs: NotificationMaintenanceRun[],
  ): NotificationMaintenanceSummary {
    const totalRemoved = runs.reduce(
      (total, run) => total + run.totalRemoved,
      0,
    );

    return {
      pendingCleanup: preview?.totalCandidates || 0,
      totalRuns: runs.length,
      totalRemoved,
      lastRunAt: runs[0]?.finishedAt,
      readinessScore: Math.max(
        0,
        Math.min(
          100,
          100 - Math.min(preview?.totalCandidates || 0, 50) * 2,
        ),
      ),
    };
  }
}
