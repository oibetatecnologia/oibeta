import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationDeliveryService } from '../core/notifications/NotificationDeliveryService';
import type { NotificationDeliveryRecord } from '../core/notifications/NotificationDeliveryTypes';

export default function useNotificationDeliveries(
  limit = 100,
  refreshIntervalMs = 0,
) {
  const [records, setRecords] =
    useState<NotificationDeliveryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string>();
  const hasLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    if (!hasLoadedRef.current) setIsLoading(true);
    setError(undefined);

    try {
      setRecords(await NotificationDeliveryService.list(limit));
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

  const retry = useCallback(
    async (deliveryId: string) => {
      setIsRetrying(true);
      setError(undefined);

      try {
        const updated =
          await NotificationDeliveryService.retry(deliveryId);
        setRecords((current) =>
          current.map((record) =>
            record.id === updated.id ? updated : record,
          ),
        );
        return updated;
      } catch (retryError) {
        setError(
          retryError instanceof Error
            ? retryError.message
            : String(retryError),
        );
        throw retryError;
      } finally {
        setIsRetrying(false);
      }
    },
    [],
  );

  const retryAllFailed = useCallback(async () => {
    setIsRetrying(true);
    setError(undefined);

    try {
      const result =
        await NotificationDeliveryService.retryAllFailed();
      await refresh();
      return result;
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : String(retryError),
      );
      throw retryError;
    } finally {
      setIsRetrying(false);
    }
  }, [refresh]);

  const summary = useMemo(
    () => NotificationDeliveryService.buildSummary(records),
    [records],
  );

  return {
    records,
    summary,
    isLoading,
    isRetrying,
    error,
    refresh,
    retry,
    retryAllFailed,
  };
}
