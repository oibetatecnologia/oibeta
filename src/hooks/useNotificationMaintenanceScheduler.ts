import { useCallback, useEffect, useRef, useState } from 'react';
import { NotificationMaintenanceSchedulerService } from '../core/notifications/NotificationMaintenanceSchedulerService';
import type { NotificationMaintenanceSchedulerSnapshot } from '../core/notifications/NotificationMaintenanceSchedulerTypes';

const INITIAL: NotificationMaintenanceSchedulerSnapshot = {
  enabled: false,
  running: false,
  intervalMs: 24 * 60 * 60 * 1_000,
  lastCandidates: 0,
  lastRemoved: 0,
  lastDurationMs: 0,
};

export default function useNotificationMaintenanceScheduler(
  refreshIntervalMs = 0,
) {
  const [snapshot, setSnapshot] =
    useState<NotificationMaintenanceSchedulerSnapshot>(INITIAL);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [error, setError] = useState<string>();
  const hasLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    if (!hasLoadedRef.current) setIsLoading(true);
    setError(undefined);

    try {
      setSnapshot(
        await NotificationMaintenanceSchedulerService.get(),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : String(loadError),
      );
    } finally {
      hasLoadedRef.current = true;
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runNow = useCallback(async () => {
    setIsRunningNow(true);
    setError(undefined);

    try {
      const next =
        await NotificationMaintenanceSchedulerService.run();
      setSnapshot(next);
      return next;
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : String(runError),
      );
      throw runError;
    } finally {
      setIsRunningNow(false);
    }
  }, []);

  return {
    ...snapshot,
    isLoading,
    isRunningNow,
    error,
    refresh,
    runNow,
  };
}
