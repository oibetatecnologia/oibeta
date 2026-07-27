export type NotificationEscalationLevel =
  | 'standard'
  | 'high'
  | 'critical';

export interface NotificationPreference {
  id: string;
  organizationId: string;
  userId: string;
  inAppEnabled: boolean;
  incidentAlertsEnabled: boolean;
  minimumEscalationLevel: NotificationEscalationLevel;
  markReadOnOpen: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface UpdateNotificationPreferenceInput {
  inAppEnabled?: boolean;
  incidentAlertsEnabled?: boolean;
  minimumEscalationLevel?: NotificationEscalationLevel;
  markReadOnOpen?: boolean;
}
