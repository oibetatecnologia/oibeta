import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeploymentReleaseApprovalService } from '../core/configuration/DeploymentReleaseApprovalService';
import type {
  CreateDeploymentReleaseApprovalInput,
  DecideDeploymentReleaseApprovalInput,
  DeploymentReleaseApproval,
} from '../core/configuration/DeploymentReleaseApprovalTypes';

export default function useDeploymentReleaseApprovals(limit = 100) {
  const [approvals, setApprovals] =
    useState<DeploymentReleaseApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setApprovals(
        await DeploymentReleaseApprovalService.list(limit),
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
    async (input: CreateDeploymentReleaseApprovalInput) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const created =
          await DeploymentReleaseApprovalService.create(input);
        setApprovals((current) => [
          created,
          ...current.filter((item) => item.id !== created.id),
        ]);
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

  const decide = useCallback(
    async (
      approvalId: string,
      input: DecideDeploymentReleaseApprovalInput,
    ) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const updated =
          await DeploymentReleaseApprovalService.decide(
            approvalId,
            input,
          );
        setApprovals((current) =>
          current.map((item) =>
            item.id === updated.id ? updated : item,
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
    () =>
      DeploymentReleaseApprovalService.buildSummary(
        approvals,
      ),
    [approvals],
  );

  return {
    approvals,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    create,
    decide,
  };
}
