import { useCallback, useEffect, useState } from 'react';
import { DeploymentConfigurationService } from '../core/configuration/DeploymentConfigurationService';
import type { DeploymentConfigurationSummary } from '../core/configuration/DeploymentConfigurationTypes';

const EMPTY: DeploymentConfigurationSummary = {
  provider: 'unknown',
  environment: 'unknown',
  databaseMode: 'unknown',
  score: 0,
  productionBlocked: true,
  configured: 0,
  missing: 0,
  invalid: 0,
  warnings: 0,
  checks: [],
  checkedAt: '',
};

export default function useDeploymentConfiguration() {
  const [summary, setSummary] =
    useState<DeploymentConfigurationSummary>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setSummary(await DeploymentConfigurationService.get());
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

  return {
    summary,
    isLoading,
    error,
    refresh,
  };
}
