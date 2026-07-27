import { useCallback, useEffect, useState } from 'react';
import { usePlatformContext } from '../contexts/platform/usePlatformContext';
import { PersistenceHealthService } from '../core/persistence/PersistenceHealthService';
import type { PersistenceHealthSummary } from '../core/persistence/PersistenceHealthTypes';

const INITIAL_SUMMARY: PersistenceHealthSummary = {
  score: 0,
  status: 'attention',
  backend: {
    mode: 'unknown',
    adapter: 'Carregando',
    configured: false,
    supabaseUrlConfigured: false,
    supabaseKeyConfigured: false,
    serviceRoleConfigured: false,
    checkedAt: '',
  },
  schema: {
    mode: 'unknown',
    checkedAt: '',
    tables: [],
  },
  fallbackPolicy: {
    mode: 'auto',
    enabled: true,
    productionSafe: true,
    description: 'Carregando política de fallback.',
  },
  repositories: [],
  apiRepositories: 0,
  fallbackRepositories: 0,
  errorRepositories: 0,
  unknownRepositories: 0,
  readyTables: 0,
  missingTables: 0,
  requiredTables: 0,
  schemaReadinessScore: 0,
  issues: [],
};

export default function usePersistenceHealth() {
  const platform = usePlatformContext();
  const [summary, setSummary] = useState<PersistenceHealthSummary>(INITIAL_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      setSummary(
        await PersistenceHealthService.loadSummary({
          organizationId: platform.currentTenant.organizationId,
          workspaceId: platform.currentTenant.workspaceId,
          userId: platform.currentUser?.id || 'dev-user-douglas',
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    platform.currentTenant.organizationId,
    platform.currentTenant.workspaceId,
    platform.currentUser?.id,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...summary,
    isLoading,
    refresh,
  };
}
