import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeploymentReleaseLifecycleService } from '../core/configuration/DeploymentReleaseLifecycleService';
import type {
  DeploymentEvidenceType,
  DeploymentReleaseLifecycle,
} from '../core/configuration/DeploymentReleaseLifecycleTypes';

export default function useDeploymentReleaseLifecycles(limit = 100) {
  const [lifecycles, setLifecycles] = useState<DeploymentReleaseLifecycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      setLifecycles(await DeploymentReleaseLifecycleService.list(limit));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => { void refresh(); }, [refresh]);

  const mutate = useCallback(async (
    operation: () => Promise<DeploymentReleaseLifecycle>,
  ) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const updated = await operation();
      setLifecycles((current) => [
        updated,
        ...current.filter((item) => item.id !== updated.id),
      ]);
      return updated;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const summary = useMemo(
    () => DeploymentReleaseLifecycleService.buildSummary(lifecycles),
    [lifecycles],
  );

  return {
    lifecycles,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    initialize: (executionId: string, responsible: string) =>
      mutate(() => DeploymentReleaseLifecycleService.initialize(executionId, responsible)),
    updateChecklist: (
      lifecycleId: string,
      itemId: string,
      completed: boolean,
      responsible: string,
      notes?: string,
    ) => mutate(() => DeploymentReleaseLifecycleService.updateChecklist(
      lifecycleId, itemId, completed, responsible, notes,
    )),
    addEvidence: (
      lifecycleId: string,
      input: { type: DeploymentEvidenceType; label: string; reference: string; recordedBy: string },
    ) => mutate(() => DeploymentReleaseLifecycleService.addEvidence(lifecycleId, input)),
    verify: (lifecycleId: string) =>
      mutate(() => DeploymentReleaseLifecycleService.verifyPostDeploy(lifecycleId)),
    rollback: (lifecycleId: string, reason: string, responsible: string) =>
      mutate(() => DeploymentReleaseLifecycleService.rollback(lifecycleId, reason, responsible)),
    complete: (lifecycleId: string) =>
      mutate(() => DeploymentReleaseLifecycleService.complete(lifecycleId)),
  };
}
