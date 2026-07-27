import { useCallback, useEffect, useMemo, useState } from 'react';
import { IncidentEscalationService } from '../core/observability/IncidentEscalationService';
import type {
  IncidentEscalationAlert,
} from '../core/observability/IncidentEscalationTypes';

export default function useIncidentEscalations(limit = 100) {
  const [alerts, setAlerts] = useState<IncidentEscalationAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setAlerts(await IncidentEscalationService.listAlerts(limit));
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

  const escalate = useCallback(
    async (incidentId: string) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const result =
          await IncidentEscalationService.escalate(incidentId);
        await refresh();
        return result;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : String(saveError),
        );
        throw saveError;
      } finally {
        setIsSaving(false);
      }
    },
    [refresh],
  );

  const summary = useMemo(
    () => IncidentEscalationService.buildSummary(alerts),
    [alerts],
  );

  return {
    alerts,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    escalate,
  };
}
