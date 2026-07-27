import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminAuditService } from '../core/admin/AdminAuditService';
import type { AdminAuditEntry } from '../core/admin/AdminAuditTypes';

export default function useAdminAudit(limit = 100) {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setEntries(await AdminAuditService.list(limit));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : String(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(
    () => AdminAuditService.buildSummary(entries),
    [entries],
  );

  return {
    entries,
    summary,
    isLoading,
    error,
    refresh,
  };
}
