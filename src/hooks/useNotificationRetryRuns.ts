import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationRetryRunService } from '../core/notifications/NotificationRetryRunService';
import type { NotificationRetryRun } from '../core/notifications/NotificationRetryRunTypes';

export default function useNotificationRetryRuns(
  limit = 100,
  refreshIntervalMs = 0,
) {
  const [runs, setRuns] = useState<NotificationRetryRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const hasLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    if (!hasLoadedRef.current) setIsLoading(true);
    setError(undefined);

    try {
      setRuns(await NotificationRetryRunService.list(limit));
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
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(
    () => NotificationRetryRunService.buildSummary(runs),
    [runs],
  );

  return {
    runs,
    summary,
    isLoading,
    error,
    refresh,
  };
}
