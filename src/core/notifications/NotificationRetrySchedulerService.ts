import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { NotificationRetrySchedulerSnapshot } from './NotificationRetrySchedulerTypes';

const ENDPOINT = '/api/notification-deliveries/retry-scheduler';

export class NotificationRetrySchedulerService {
  static get(): Promise<NotificationRetrySchedulerSnapshot> {
    return HttpRepositoryClient.get<NotificationRetrySchedulerSnapshot>(
      ENDPOINT,
    );
  }

  static run(): Promise<NotificationRetrySchedulerSnapshot> {
    return HttpRepositoryClient.post<NotificationRetrySchedulerSnapshot>(
      `${ENDPOINT}/run`,
      {},
    );
  }
}
