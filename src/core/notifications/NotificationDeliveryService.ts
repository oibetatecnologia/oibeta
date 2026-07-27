import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  NotificationDeliveryRecord,
  NotificationDeliverySummary,
} from './NotificationDeliveryTypes';

const ENDPOINT = '/api/notification-deliveries';

export class NotificationDeliveryService {
  static list(limit = 100): Promise<NotificationDeliveryRecord[]> {
    return HttpRepositoryClient.get<NotificationDeliveryRecord[]>(
      `${ENDPOINT}?limit=${Math.max(1, Math.min(limit, 500))}`,
    );
  }

  static retry(
    deliveryId: string,
  ): Promise<NotificationDeliveryRecord> {
    return HttpRepositoryClient.post<NotificationDeliveryRecord>(
      `${ENDPOINT}/${encodeURIComponent(deliveryId)}/retry`,
      {},
    );
  }

  static retryAllFailed(): Promise<{
    retried: number;
    records: NotificationDeliveryRecord[];
  }> {
    return HttpRepositoryClient.post<{
      retried: number;
      records: NotificationDeliveryRecord[];
    }>(
      `${ENDPOINT}/retry-failed`,
      {},
    );
  }

  static buildSummary(
    records: NotificationDeliveryRecord[],
  ): NotificationDeliverySummary {
    const delivered = records.filter(
      (record) => record.status === 'delivered',
    ).length;
    const read = records.filter(
      (record) => record.status === 'read',
    ).length;
    const failed = records.filter(
      (record) => record.status === 'failed',
    ).length;
    const deadLetter = records.filter(
      (record) => record.status === 'dead_letter',
    ).length;
    const successful = delivered + read;
    const total = records.length;

    return {
      total,
      delivered,
      read,
      failed,
      retryableFailed: failed,
      deadLetter,
      pendingRead: delivered,
      deliveryRate:
        total === 0 ? 100 : Math.round((successful / total) * 100),
      readRate:
        successful === 0
          ? 100
          : Math.round((read / successful) * 100),
      readinessScore: Math.max(
        0,
        Math.min(
          100,
          100 - failed * 15 - deadLetter * 30 - delivered * 2,
        ),
      ),
    };
  }
}
