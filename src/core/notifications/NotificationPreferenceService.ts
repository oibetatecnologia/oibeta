import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  NotificationPreference,
  UpdateNotificationPreferenceInput,
} from './NotificationPreferenceTypes';

const ENDPOINT = '/api/notification-preferences';

export class NotificationPreferenceService {
  static get(): Promise<NotificationPreference> {
    return HttpRepositoryClient.get<NotificationPreference>(
      ENDPOINT,
    );
  }

  static update(
    input: UpdateNotificationPreferenceInput,
  ): Promise<NotificationPreference> {
    return HttpRepositoryClient.put<NotificationPreference>(
      ENDPOINT,
      input,
    );
  }
}
