import { useCallback, useEffect, useMemo, useState } from 'react';
import { OperationalIncidentService } from '../core/observability/OperationalIncidentService';
import type {
  CreateOperationalIncidentInput,
  OperationalIncident,
  UpdateOperationalIncidentInput,
} from '../core/observability/OperationalIncidentTypes';

export default function useOperationalIncidents(limit = 100) {
  const [incidents, setIncidents] = useState<OperationalIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setIncidents(await OperationalIncidentService.list(limit));
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

  const createIncident = useCallback(
    async (input: CreateOperationalIncidentInput) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const created =
          await OperationalIncidentService.create(input);
        setIncidents((current) => [created, ...current]);
        return created;
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
    [],
  );

  const synchronizeDetected = useCallback(async () => {
    setIsSaving(true);
    setError(undefined);

    try {
      const result =
        await OperationalIncidentService.synchronizeDetected();
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
  }, [refresh]);

  const updateIncident = useCallback(
    async (
      incidentId: string,
      input: UpdateOperationalIncidentInput,
    ) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const updated =
          await OperationalIncidentService.update(
            incidentId,
            input,
          );
        setIncidents((current) =>
          current.map((incident) =>
            incident.id === updated.id ? updated : incident,
          ),
        );
        return updated;
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
    [],
  );

  const summary = useMemo(
    () => OperationalIncidentService.buildSummary(incidents),
    [incidents],
  );

  return {
    incidents,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    createIncident,
    synchronizeDetected,
    updateIncident,
  };
}
