import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeploymentReleaseExecutionService } from '../core/configuration/DeploymentReleaseExecutionService';
import type {
  CreateDeploymentReleaseExecutionInput,
  DeploymentReleaseExecution,
} from '../core/configuration/DeploymentReleaseExecutionTypes';

export default function useDeploymentReleaseExecutions(
  limit = 100,
) {
  const [executions, setExecutions] =
    useState<DeploymentReleaseExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setExecutions(
        await DeploymentReleaseExecutionService.list(limit),
      );
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

  const create = useCallback(
    async (input: CreateDeploymentReleaseExecutionInput) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const result =
          await DeploymentReleaseExecutionService.create(input);
        setExecutions((current) => [
          result.execution,
          ...current,
        ]);
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
    [],
  );

  const summary = useMemo(
    () =>
      DeploymentReleaseExecutionService.buildSummary(
        executions,
      ),
    [executions],
  );

  return {
    executions,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    create,
  };
}
