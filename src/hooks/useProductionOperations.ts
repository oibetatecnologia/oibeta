import { useCallback, useEffect, useState } from 'react';
import { ProductionOperationsService } from '../core/productionOperations/ProductionOperationsService';
import type { ProductionOperationsSummary } from '../core/productionOperations/ProductionOperationsTypes';

export default function useProductionOperations() {
  const [summary, setSummary] = useState<ProductionOperationsSummary>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      setSummary(await ProductionOperationsService.get());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { summary, isLoading, error, refresh };
}
