export type NotificationRetryRunTrigger =
  | 'scheduled'
  | 'manual';

export type NotificationRetryRunStatus =
  | 'success'
  | 'failed'
  | 'skipped';

export interface NotificationRetryRun {
  id: string;
  trigger: NotificationRetryRunTrigger;
  status: NotificationRetryRunStatus;
  processed: number;
  retried: number;
  deadLettered: number;
  durationMs: number;
  errorMessage?: string;
  startedAt: string;
  finishedAt: string;
}

export interface NotificationRetryRunSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  skippedRuns: number;
  averageDurationMs: number;
  totalProcessed: number;
  totalRetried: number;
  totalDeadLettered: number;
  successRate: number;
  readinessScore: number;
}
