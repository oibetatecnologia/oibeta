export type NotificationDeliveryChannel = "in_app";

export type NotificationDeliveryStatus =
  | "delivered"
  | "read"
  | "failed"
  | "dead_letter";

export interface NotificationDeliveryRecord {
  id: string;
  organizationId: string;
  notificationId: string;
  userId: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureReason?: string;
  lastRetryAt?: string;
  nextRetryAt?: string;
  deadLetterAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliverySummary {
  total: number;
  delivered: number;
  read: number;
  failed: number;
  retryableFailed: number;
  deadLetter: number;
  pendingRead: number;
  deliveryRate: number;
  readRate: number;
  readinessScore: number;
}
