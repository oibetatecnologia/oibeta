import { useCallback, useEffect, useState } from 'react';
import { usePlatformContext } from '../contexts/platform/usePlatformContext';
import { SessionHealthService } from '../core/auth/SessionHealthService';
import type { SessionHealthSummary } from '../core/auth/SessionHealthTypes';

const INITIAL_SUMMARY: SessionHealthSummary = {
  authenticated: false,
  source: 'none',
  tokenRequired: false,
  tokenPresent: false,
  checkedAt: '',
  score: 0,
  status: 'attention',
  issues: [],
};

export default function useSessionHealth() {
  const platform = usePlatformContext();
  const [summary, setSummary] = useState<SessionHealthSummary>(INITIAL_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setSummary(await SessionHealthService.loadSummary({
        organizationId: platform.currentTenant.organizationId,
        workspaceId: platform.currentTenant.workspaceId,
        userId: platform.currentUser?.id || 'dev-user-douglas',
        role: platform.currentUser?.role || 'master_admin',
      }));
    } finally {
      setIsLoading(false);
    }
  }, [
    platform.currentTenant.organizationId,
    platform.currentTenant.workspaceId,
    platform.currentUser?.id,
    platform.currentUser?.role,
  ]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { ...summary, isLoading, refresh };
}
