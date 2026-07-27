import React, {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import useNotificationCenter from '../../hooks/useNotificationCenter';
import useNotificationPreferences from '../../hooks/useNotificationPreferences';
import useNotificationDeliveries from '../../hooks/useNotificationDeliveries';
import useNotificationRetryScheduler from '../../hooks/useNotificationRetryScheduler';
import useNotificationRetryRuns from '../../hooks/useNotificationRetryRuns';
import useNotificationMaintenance from '../../hooks/useNotificationMaintenance';
import useNotificationMaintenanceScheduler from '../../hooks/useNotificationMaintenanceScheduler';
import type { PlatformNotification } from '../../core/notifications/NotificationCenterTypes';
import type {
  NotificationPreference,
  UpdateNotificationPreferenceInput,
} from '../../core/notifications/NotificationPreferenceTypes';
import type {
  NotificationDeliveryRecord,
  NotificationDeliverySummary,
} from '../../core/notifications/NotificationDeliveryTypes';
import type { NotificationRetrySchedulerSnapshot } from '../../core/notifications/NotificationRetrySchedulerTypes';
import type {
  NotificationRetryRun,
  NotificationRetryRunSummary,
} from '../../core/notifications/NotificationRetryRunTypes';
import type {
  NotificationMaintenancePreview,
  NotificationMaintenanceRun,
  NotificationMaintenanceResult,
  NotificationMaintenanceSummary,
} from '../../core/notifications/NotificationMaintenanceTypes';
import type { NotificationMaintenanceSchedulerSnapshot } from '../../core/notifications/NotificationMaintenanceSchedulerTypes';

interface NotificationCenterContextValue {
  notifications: PlatformNotification[];
  summary: {
    total: number;
    unread: number;
    critical: number;
    incidentAlerts: number;
    readinessScore: number;
  };
  isLoading: boolean;
  isSaving: boolean;
  error?: string;
  refresh: () => Promise<void>;
  markRead: (
    notificationId: string,
  ) => Promise<PlatformNotification>;
  markAllRead: () => Promise<{ updated: number }>;
  preference?: NotificationPreference;
  isPreferenceLoading: boolean;
  isPreferenceSaving: boolean;
  preferenceError?: string;
  refreshPreference: () => Promise<void>;
  updatePreference: (
    input: UpdateNotificationPreferenceInput,
  ) => Promise<NotificationPreference>;
  deliveryRecords: NotificationDeliveryRecord[];
  deliverySummary: NotificationDeliverySummary;
  isDeliveryLoading: boolean;
  isDeliveryRetrying: boolean;
  deliveryError?: string;
  refreshDeliveries: () => Promise<void>;
  retryDelivery: (
    deliveryId: string,
  ) => Promise<NotificationDeliveryRecord>;
  retryAllFailedDeliveries: () => Promise<{
    retried: number;
    records: NotificationDeliveryRecord[];
  }>;
  retryScheduler: NotificationRetrySchedulerSnapshot;
  isRetrySchedulerLoading: boolean;
  isRetrySchedulerRunningNow: boolean;
  retrySchedulerError?: string;
  refreshRetryScheduler: () => Promise<void>;
  runRetrySchedulerNow: () => Promise<NotificationRetrySchedulerSnapshot>;
  retryRuns: NotificationRetryRun[];
  retryRunSummary: NotificationRetryRunSummary;
  isRetryRunsLoading: boolean;
  retryRunsError?: string;
  refreshRetryRuns: () => Promise<void>;
  maintenancePreview?: NotificationMaintenancePreview;
  maintenanceRuns: NotificationMaintenanceRun[];
  maintenanceSummary: NotificationMaintenanceSummary;
  isMaintenanceLoading: boolean;
  isMaintenanceExecuting: boolean;
  maintenanceError?: string;
  refreshMaintenance: () => Promise<void>;
  executeMaintenance: () => Promise<NotificationMaintenanceResult>;
  maintenanceScheduler: NotificationMaintenanceSchedulerSnapshot;
  isMaintenanceSchedulerLoading: boolean;
  isMaintenanceSchedulerRunningNow: boolean;
  maintenanceSchedulerError?: string;
  refreshMaintenanceScheduler: () => Promise<void>;
  runMaintenanceSchedulerNow: () => Promise<NotificationMaintenanceSchedulerSnapshot>;
}

const NotificationCenterContext =
  createContext<NotificationCenterContextValue | null>(null);

interface NotificationCenterProviderProps {
  children: ReactNode;
  limit?: number;
  refreshIntervalMs?: number;
}

export function NotificationCenterProvider({
  children,
  limit = 100,
  refreshIntervalMs = 0,
}: NotificationCenterProviderProps) {
  const center = useNotificationCenter(
    limit,
    refreshIntervalMs,
  );
  const preferences = useNotificationPreferences();
  const deliveries = useNotificationDeliveries(
    limit,
    refreshIntervalMs,
  );
  const retryScheduler = useNotificationRetryScheduler(
    refreshIntervalMs,
  );
  const retryRuns = useNotificationRetryRuns(
    limit,
    refreshIntervalMs,
  );
  const maintenance = useNotificationMaintenance();
  const maintenanceScheduler =
    useNotificationMaintenanceScheduler(refreshIntervalMs);

  const value: NotificationCenterContextValue = {
    ...center,
    preference: preferences.preference,
    isPreferenceLoading: preferences.isLoading,
    isPreferenceSaving: preferences.isSaving,
    preferenceError: preferences.error,
    refreshPreference: preferences.refresh,
    updatePreference: preferences.update,
    deliveryRecords: deliveries.records,
    deliverySummary: deliveries.summary,
    isDeliveryLoading: deliveries.isLoading,
    isDeliveryRetrying: deliveries.isRetrying,
    deliveryError: deliveries.error,
    refreshDeliveries: deliveries.refresh,
    retryDelivery: deliveries.retry,
    retryAllFailedDeliveries: deliveries.retryAllFailed,
    retryScheduler: {
      running: retryScheduler.running,
      intervalMs: retryScheduler.intervalMs,
      lastRunAt: retryScheduler.lastRunAt,
      nextRunAt: retryScheduler.nextRunAt,
      lastProcessed: retryScheduler.lastProcessed,
      lastRetried: retryScheduler.lastRetried,
      lastDeadLettered: retryScheduler.lastDeadLettered,
      lastError: retryScheduler.lastError,
    },
    isRetrySchedulerLoading: retryScheduler.isLoading,
    isRetrySchedulerRunningNow: retryScheduler.isRunningNow,
    retrySchedulerError: retryScheduler.error,
    refreshRetryScheduler: retryScheduler.refresh,
    runRetrySchedulerNow: retryScheduler.runNow,
    retryRuns: retryRuns.runs,
    retryRunSummary: retryRuns.summary,
    isRetryRunsLoading: retryRuns.isLoading,
    retryRunsError: retryRuns.error,
    refreshRetryRuns: retryRuns.refresh,
    maintenancePreview: maintenance.preview,
    maintenanceRuns: maintenance.runs,
    maintenanceSummary: maintenance.summary,
    isMaintenanceLoading: maintenance.isLoading,
    isMaintenanceExecuting: maintenance.isExecuting,
    maintenanceError: maintenance.error,
    refreshMaintenance: maintenance.refresh,
    executeMaintenance: maintenance.execute,
    maintenanceScheduler: {
      enabled: maintenanceScheduler.enabled,
      running: maintenanceScheduler.running,
      intervalMs: maintenanceScheduler.intervalMs,
      lastCheckAt: maintenanceScheduler.lastCheckAt,
      lastRunAt: maintenanceScheduler.lastRunAt,
      nextRunAt: maintenanceScheduler.nextRunAt,
      lastCandidates: maintenanceScheduler.lastCandidates,
      lastRemoved: maintenanceScheduler.lastRemoved,
      lastDurationMs: maintenanceScheduler.lastDurationMs,
      lastError: maintenanceScheduler.lastError,
    },
    isMaintenanceSchedulerLoading:
      maintenanceScheduler.isLoading,
    isMaintenanceSchedulerRunningNow:
      maintenanceScheduler.isRunningNow,
    maintenanceSchedulerError: maintenanceScheduler.error,
    refreshMaintenanceScheduler:
      maintenanceScheduler.refresh,
    runMaintenanceSchedulerNow:
      maintenanceScheduler.runNow,
  };

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenterContext(): NotificationCenterContextValue {
  const context = useContext(NotificationCenterContext);

  if (!context) {
    throw new Error(
      'useNotificationCenterContext must be used inside NotificationCenterProvider.',
    );
  }

  return context;
}
