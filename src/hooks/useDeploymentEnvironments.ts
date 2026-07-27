import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeploymentEnvironmentService } from '../core/deployment/DeploymentEnvironmentService';
import type {
  CreateDeploymentRecordInput,
  DeploymentEnvironment,
  DeploymentRecord,
  UpdateDeploymentEnvironmentInput,
} from '../core/deployment/DeploymentEnvironmentTypes';

export default function useDeploymentEnvironments(tenantId: string) {
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [deploymentsByEnvironment, setDeploymentsByEnvironment] =
    useState<Record<string, DeploymentRecord[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const next = await DeploymentEnvironmentService.list(tenantId);
      setEnvironments(next);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : String(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateEnvironment = useCallback(
    async (
      environmentId: string,
      input: UpdateDeploymentEnvironmentInput,
    ) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const updated = await DeploymentEnvironmentService.update(
          environmentId,
          input,
        );
        setEnvironments((current) =>
          current.map((environment) =>
            environment.id === updated.id ? updated : environment,
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

  const loadDeployments = useCallback(async (environmentId: string) => {
    const deployments =
      await DeploymentEnvironmentService.listDeployments(environmentId);
    setDeploymentsByEnvironment((current) => ({
      ...current,
      [environmentId]: deployments,
    }));
    return deployments;
  }, []);

  const recordDeployment = useCallback(
    async (
      environmentId: string,
      input: CreateDeploymentRecordInput,
    ) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const result = await DeploymentEnvironmentService.recordDeployment(
          environmentId,
          input,
        );
        setEnvironments((current) =>
          current.map((environment) =>
            environment.id === result.environment.id
              ? result.environment
              : environment,
          ),
        );
        setDeploymentsByEnvironment((current) => ({
          ...current,
          [environmentId]: [
            result.deployment,
            ...(current[environmentId] || []),
          ],
        }));
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
    () => DeploymentEnvironmentService.buildSummary(environments),
    [environments],
  );

  return {
    environments,
    deploymentsByEnvironment,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    updateEnvironment,
    loadDeployments,
    recordDeployment,
  };
}
