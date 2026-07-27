import { useCallback, useEffect, useRef, useState } from 'react';
import { RuntimeObservabilityService } from '../core/observability/RuntimeObservabilityService';
import type { RuntimeObservabilitySnapshot } from '../core/observability/RuntimeObservabilityTypes';

const INITIAL_SNAPSHOT: RuntimeObservabilitySnapshot = {
  status: 'attention',
  startedAt: '',
  checkedAt: '',
  uptimeSeconds: 0,
  requestCount: 0,
  requestsLastFiveMinutes: 0,
  errorCount: 0,
  errorsLastFiveMinutes: 0,
  errorRate: 0,
  averageDurationMs: 0,
  p95DurationMs: 0,
  slowRequestCount: 0,
  memoryUsageMb: 0,
  heapUsageMb: 0,
  endpoints: [],
  recentErrors: [],
};

export default function useRuntimeObservability(
  refreshIntervalMs = 0,
) {
  const [snapshot, setSnapshot] =
    useState<RuntimeObservabilitySnapshot>(INITIAL_SNAPSHOT);
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
      setSnapshot(await RuntimeObservabilityService.load());
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

  return {
    ...snapshot,
    isLoading,
    error,
    refresh,
  };
}
