import { useCallback, useEffect, useState } from 'react';
import { CustomerOperationsService } from '../core/customerOperations/CustomerOperationsService';
import type {
  CustomerOperationsPlan,
  CustomerOperationsSummary,
  UpsertCustomerOperationsPlanInput,
} from '../core/customerOperations/CustomerOperationsTypes';

const EMPTY: CustomerOperationsSummary = {
  totalClients: 0,
  managedClients: 0,
  onboardingClients: 0,
  healthyClients: 0,
  attentionClients: 0,
  criticalClients: 0,
  overdueReviews: 0,
  openRisks: 0,
  onboardingProgress: 0,
  readinessScore: 0,
};

export default function useCustomerOperations() {
  const [plans, setPlans] = useState<CustomerOperationsPlan[]>([]);
  const [summary, setSummary] = useState<CustomerOperationsSummary>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const [nextPlans, nextSummary] = await Promise.all([
        CustomerOperationsService.list(),
        CustomerOperationsService.summary(),
      ]);
      setPlans(nextPlans);
      setSummary(nextSummary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (input: UpsertCustomerOperationsPlanInput) => {
    setIsSaving(true);
    setError(undefined);
    try {
      const saved = await CustomerOperationsService.upsert(input);
      setPlans((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      const nextSummary = await CustomerOperationsService.summary();
      setSummary(nextSummary);
      return saved;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { plans, summary, isLoading, isSaving, error, refresh, save };
}
