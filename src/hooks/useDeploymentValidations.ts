import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeploymentValidationService } from '../core/configuration/DeploymentValidationService';
import type { DeploymentValidationRun } from '../core/configuration/DeploymentValidationTypes';

export default function useDeploymentValidations(limit = 100) {
  const [runs, setRuns] = useState<DeploymentValidationRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setRuns(await DeploymentValidationService.list(limit));
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

  const execute = useCallback(async () => {
    setIsExecuting(true);
    setError(undefined);

    try {
      const run = await DeploymentValidationService.execute();
      setRuns((current) => [run, ...current]);
      return run;
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
  }, []);

  const summary = useMemo(
    () => DeploymentValidationService.buildSummary(runs),
    [runs],
  );

  return {
    runs,
    summary,
    isLoading,
    isExecuting,
    error,
    refresh,
    execute,
  };
}
