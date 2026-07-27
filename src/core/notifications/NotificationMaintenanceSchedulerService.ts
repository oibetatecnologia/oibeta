import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { NotificationMaintenanceSchedulerSnapshot } from './NotificationMaintenanceSchedulerTypes';

const ENDPOINT = '/api/notification-maintenance/scheduler';

export class NotificationMaintenanceSchedulerService {
  static get(): Promise<NotificationMaintenanceSchedulerSnapshot> {
    return HttpRepositoryClient.get<NotificationMaintenanceSchedulerSnapshot>(
      ENDPOINT,
    );
  }

  static run(): Promise<NotificationMaintenanceSchedulerSnapshot> {
    return HttpRepositoryClient.post<NotificationMaintenanceSchedulerSnapshot>(
      `${ENDPOINT}/run`,
      {},
    );
  }
}
