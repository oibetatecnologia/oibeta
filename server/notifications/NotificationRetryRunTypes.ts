export type NotificationRetryRunTrigger =
  | "scheduled"
  | "manual";

export type NotificationRetryRunStatus =
  | "success"
  | "failed"
  | "skipped";

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

export interface CreateNotificationRetryRunInput {
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
