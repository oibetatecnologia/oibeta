import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminAccessReviewService } from '../core/admin/AdminAccessReviewService';
import type {
  AdminAccessReview,
  AdminGovernanceOverview,
  DecideAdminAccessReviewItemInput,
} from '../core/admin/AdminAccessReviewTypes';

export default function useAdminAccessReviews(limit = 50) {
  const [overview, setOverview] = useState<AdminGovernanceOverview>();
  const [reviews, setReviews] = useState<AdminAccessReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const [nextOverview, nextReviews] = await Promise.all([
        AdminAccessReviewService.overview(),
        AdminAccessReviewService.list(limit),
      ]);
      setOverview(nextOverview);
      setReviews(nextReviews);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async () => {
    setIsSaving(true);
    setError(undefined);
    try {
      const review = await AdminAccessReviewService.create();
      setReviews((current) => [review, ...current.filter((item) => item.id !== review.id)]);
      await refresh();
      return review;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const decide = useCallback(async (
    reviewId: string,
    userId: string,
    input: DecideAdminAccessReviewItemInput,
  ) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const review = await AdminAccessReviewService.decide(reviewId, userId, input);
      setReviews((current) =>
        current.map((item) => item.id === review.id ? review : item),
      );
      await refresh();
      return review;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [refresh]);

  const activeReview = useMemo(
    () => reviews.find((review) => review.status === 'open'),
    [reviews],
  );

  return {
    overview,
    reviews,
    activeReview,
    isLoading,
    isSaving,
    error,
    refresh,
    create,
    decide,
  };
}
