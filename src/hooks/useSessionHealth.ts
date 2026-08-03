import { useCallback, useEffect, useState } from 'react';
import { usePlatformContext } from '../contexts/platform/usePlatformContext';
import { SessionHealthService } from '../core/auth/SessionHealthService';
import { normalizeAuthenticatedUser } from '../core/auth/AuthenticatedUserContext';
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
      const currentUser = normalizeAuthenticatedUser(platform.currentUser);

      if (!currentUser) {
        setSummary(SessionHealthService.buildSummary({
          authenticated: false,
          source: 'none',
          tokenRequired: false,
          tokenPresent: false,
          checkedAt: new Date().toISOString(),
        }, new Error('Sessão sem identidade operacional completa. Faça login novamente.')));
        return;
      }

      setSummary(await SessionHealthService.loadSummary({
        organizationId: String(currentUser.organizationId),
        workspaceId: String(currentUser.workspaceId),
        userId: String(currentUser.id),
        role: String(currentUser.role),
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
