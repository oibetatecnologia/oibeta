import { useCallback, useEffect, useRef, useState } from 'react';
import { NotificationRetrySchedulerService } from '../core/notifications/NotificationRetrySchedulerService';
import type { NotificationRetrySchedulerSnapshot } from '../core/notifications/NotificationRetrySchedulerTypes';

const INITIAL: NotificationRetrySchedulerSnapshot = {
  running: false,
  intervalMs: 60_000,
  lastProcessed: 0,
  lastRetried: 0,
  lastDeadLettered: 0,
};

export default function useNotificationRetryScheduler(
  refreshIntervalMs = 0,
) {
  const [snapshot, setSnapshot] =
    useState<NotificationRetrySchedulerSnapshot>(INITIAL);
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
        await NotificationRetrySchedulerService.get(),
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
        await NotificationRetrySchedulerService.run();
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
