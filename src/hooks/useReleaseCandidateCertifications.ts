import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReleaseCandidateCertificationService } from '../core/production/ReleaseCandidateCertificationService';
import type {
  CreateReleaseCandidateCertificationInput,
  ReleaseCandidateCertification,
  UpdateReleaseCandidateControlInput,
} from '../core/production/ReleaseCandidateCertificationTypes';

export default function useReleaseCandidateCertifications(
  limit = 100,
) {
  const [items, setItems] = useState<
    ReleaseCandidateCertification[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      setItems(
        await ReleaseCandidateCertificationService.list(limit),
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
    async (input: CreateReleaseCandidateCertificationInput) => {
      setIsSaving(true);
      setError(undefined);
      try {
        const created =
          await ReleaseCandidateCertificationService.create(
            input,
          );
        setItems((current) => [
          created,
          ...current.filter(
            (item) => item.id !== created.id,
          ),
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

  const updateControl = useCallback(
    async (
      certificationId: string,
      controlId: string,
      input: UpdateReleaseCandidateControlInput,
    ) => {
      setIsSaving(true);
      setError(undefined);
      try {
        const updated =
          await ReleaseCandidateCertificationService.updateControl(
            certificationId,
            controlId,
            input,
          );
        setItems((current) =>
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

  const approve = useCallback(
    async (
      certificationId: string,
      approvedBy: string,
    ) => {
      setIsSaving(true);
      setError(undefined);
      try {
        const updated =
          await ReleaseCandidateCertificationService.approve(
            certificationId,
            approvedBy,
          );
        setItems((current) =>
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
      ReleaseCandidateCertificationService.buildSummary(
        items,
      ),
    [items],
  );

  return {
    items,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    create,
    updateControl,
    approve,
  };
}
