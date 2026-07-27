import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlatformContext } from '../contexts/platform/usePlatformContext';
import { AccessControlHealthService } from '../core/security/AccessControlHealthService';
import type { AccessControlSummary } from '../core/security/AccessControlHealthTypes';
import { resolveUserProfile } from '../core/users/UserRegistry';

const INITIAL_SUMMARY: AccessControlSummary = {
  authenticated: false,
  permissions: [],
  coverage: {
    profiles: 0,
    permissions: 0,
    routeRules: 0,
    protectedDomains: [],
  },
  checkedAt: '',
  score: 0,
  status: 'attention',
  missingExpectedPermissions: [],
  issues: [],
};

export default function useAccessControlHealth() {
  const platform = usePlatformContext();
  const [summary, setSummary] = useState<AccessControlSummary>(INITIAL_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const expectedProfile = useMemo(
    () => resolveUserProfile(platform.currentUser?.role),
    [platform.currentUser?.role],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      setSummary(
        await AccessControlHealthService.loadSummary(
          {
            organizationId: platform.currentTenant.organizationId,
            workspaceId: platform.currentTenant.workspaceId,
            userId: platform.currentUser?.id || 'dev-user-douglas',
            role: platform.currentUser?.role || expectedProfile,
          },
          expectedProfile,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    expectedProfile,
    platform.currentTenant.organizationId,
    platform.currentTenant.workspaceId,
    platform.currentUser?.id,
    platform.currentUser?.role,
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
