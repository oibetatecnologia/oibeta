export interface NotificationRetrySchedulerSnapshot {
  running: boolean;
  intervalMs: number;
  lastRunAt?: string;
  nextRunAt?: string;
  lastProcessed: number;
  lastRetried: number;
  lastDeadLettered: number;
  lastError?: string;
}
