import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  NotificationRetryRun,
  NotificationRetryRunSummary,
} from './NotificationRetryRunTypes';

const ENDPOINT = '/api/notification-deliveries/retry-runs';

export class NotificationRetryRunService {
  static list(limit = 100): Promise<NotificationRetryRun[]> {
    return HttpRepositoryClient.get<NotificationRetryRun[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static buildSummary(
    runs: NotificationRetryRun[],
  ): NotificationRetryRunSummary {
    const successfulRuns = runs.filter(
      (run) => run.status === 'success',
    ).length;
    const failedRuns = runs.filter(
      (run) => run.status === 'failed',
    ).length;
    const skippedRuns = runs.filter(
      (run) => run.status === 'skipped',
    ).length;
    const totalRuns = runs.length;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      skippedRuns,
      averageDurationMs:
        totalRuns === 0
          ? 0
          : Math.round(
              runs.reduce(
                (total, run) => total + run.durationMs,
                0,
              ) / totalRuns,
            ),
      totalProcessed: runs.reduce(
        (total, run) => total + run.processed,
        0,
      ),
      totalRetried: runs.reduce(
        (total, run) => total + run.retried,
        0,
      ),
      totalDeadLettered: runs.reduce(
        (total, run) => total + run.deadLettered,
        0,
      ),
      successRate:
        totalRuns === 0
          ? 100
          : Math.round((successfulRuns / totalRuns) * 100),
      readinessScore: Math.max(
        0,
        Math.min(
          100,
          100 - failedRuns * 20 - skippedRuns * 5,
        ),
      ),
    };
  }
}
