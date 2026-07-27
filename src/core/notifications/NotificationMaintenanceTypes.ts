export interface NotificationRetentionPolicy {
  readNotificationsDays: number;
  readDeliveriesDays: number;
  deadLetterDays: number;
  retryRunsDays: number;
}

export interface NotificationMaintenancePreview {
  policy: NotificationRetentionPolicy;
  readNotifications: number;
  readDeliveries: number;
  deadLetterDeliveries: number;
  retryRuns: number;
  totalCandidates: number;
  checkedAt: string;
}

export interface NotificationMaintenanceRun {
  id: string;
  trigger: 'manual' | 'scheduled';
  readNotificationsRemoved: number;
  readDeliveriesRemoved: number;
  deadLetterDeliveriesRemoved: number;
  retryRunsRemoved: number;
  totalRemoved: number;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

export interface NotificationMaintenanceResult {
  preview: NotificationMaintenancePreview;
  run: NotificationMaintenanceRun;
}

export interface NotificationMaintenanceSummary {
  pendingCleanup: number;
  totalRuns: number;
  totalRemoved: number;
  lastRunAt?: string;
  readinessScore: number;
}
