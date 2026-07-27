import { useCallback, useEffect, useState } from 'react';
import { DeploymentConnectivityService } from '../core/configuration/DeploymentConnectivityService';
import type { DeploymentConnectivitySummary } from '../core/configuration/DeploymentConnectivityTypes';

const INITIAL: DeploymentConnectivitySummary = {
  status: 'attention',
  score: 0,
  productionBlocked: true,
  healthy: 0,
  attention: 0,
  critical: 0,
  skipped: 0,
  checks: [],
  checkedAt: '',
};

export default function useDeploymentConnectivity() {
  const [summary, setSummary] =
    useState<DeploymentConnectivitySummary>(INITIAL);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setSummary(await DeploymentConnectivityService.load());
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

  return { summary, isLoading, error, refresh };
}
