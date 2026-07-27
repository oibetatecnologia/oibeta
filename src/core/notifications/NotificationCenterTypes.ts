export interface PlatformNotification {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  message?: string;
  notificationType?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  readAt?: string;
  status: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCenterSummary {
  total: number;
  unread: number;
  critical: number;
  incidentAlerts: number;
  readinessScore: number;
}
