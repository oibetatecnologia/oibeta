import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationCenterService } from '../core/notifications/NotificationCenterService';
import type { PlatformNotification } from '../core/notifications/NotificationCenterTypes';

export default function useNotificationCenter(
  limit = 100,
  refreshIntervalMs = 0,
) {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const hasLoadedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    if (!hasLoadedRef.current) setIsLoading(true);
    setError(undefined);
    try {
      setNotifications(await NotificationCenterService.list(limit));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      hasLoadedRef.current = true;
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(async (notificationId: string) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const updated = await NotificationCenterService.markRead(notificationId);
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
      return updated;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setIsSaving(true);
    setError(undefined);
    try {
      const result = await NotificationCenterService.markAllRead();
      await refresh();
      return result;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const summary = useMemo(
    () => NotificationCenterService.buildSummary(notifications),
    [notifications],
  );

  return {
    notifications,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}
