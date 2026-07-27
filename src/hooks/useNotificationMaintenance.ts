import { useCallback, useEffect, useMemo, useState } from 'react';
import { NotificationMaintenanceService } from '../core/notifications/NotificationMaintenanceService';
import type {
  NotificationMaintenancePreview,
  NotificationMaintenanceRun,
} from '../core/notifications/NotificationMaintenanceTypes';

export default function useNotificationMaintenance() {
  const [preview, setPreview] =
    useState<NotificationMaintenancePreview>();
  const [runs, setRuns] = useState<NotificationMaintenanceRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [nextPreview, nextRuns] = await Promise.all([
        NotificationMaintenanceService.preview(),
        NotificationMaintenanceService.listRuns(50),
      ]);
      setPreview(nextPreview);
      setRuns(nextRuns);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : String(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const execute = useCallback(async () => {
    setIsExecuting(true);
    setError(undefined);

    try {
      const result =
        await NotificationMaintenanceService.execute();
      await refresh();
      return result;
    } catch (executeError) {
      setError(
        executeError instanceof Error
          ? executeError.message
          : String(executeError),
      );
      throw executeError;
    } finally {
      setIsExecuting(false);
    }
  }, [refresh]);

  const summary = useMemo(
    () =>
      NotificationMaintenanceService.buildSummary(
        preview,
        runs,
      ),
    [preview, runs],
  );

  return {
    preview,
    runs,
    summary,
    isLoading,
    isExecuting,
    error,
    refresh,
    execute,
  };
}
