export interface NotificationMaintenanceSchedulerSnapshot {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  lastCheckAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastCandidates: number;
  lastRemoved: number;
  lastDurationMs: number;
  lastError?: string;
}
