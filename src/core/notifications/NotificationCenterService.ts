import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  NotificationCenterSummary,
  PlatformNotification,
} from './NotificationCenterTypes';

const ENDPOINT = '/api/notifications';

export class NotificationCenterService {
  static list(limit = 100): Promise<PlatformNotification[]> {
    return HttpRepositoryClient.get<PlatformNotification[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static markRead(notificationId: string): Promise<PlatformNotification> {
    return HttpRepositoryClient.put<PlatformNotification>(
      `${ENDPOINT}/${encodeURIComponent(notificationId)}/read`,
      {},
    );
  }

  static markAllRead(): Promise<{ updated: number }> {
    return HttpRepositoryClient.put<{ updated: number }>(
      `${ENDPOINT}/read-all`,
      {},
    );
  }

  static buildSummary(
    notifications: PlatformNotification[],
  ): NotificationCenterSummary {
    const unread = notifications.filter(
      (item) => String(item.status).toUpperCase() !== 'READ',
    ).length;
    const critical = notifications.filter(
      (item) => item.metadataJson?.escalationLevel === 'critical',
    ).length;
    const incidentAlerts = notifications.filter(
      (item) => item.notificationType === 'INCIDENT_ESCALATION',
    ).length;

    return {
      total: notifications.length,
      unread,
      critical,
      incidentAlerts,
      readinessScore: Math.max(
        0,
        Math.min(100, 100 - unread * 4 - critical * 8),
      ),
    };
  }
}
