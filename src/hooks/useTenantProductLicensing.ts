import { useCallback, useEffect, useMemo, useState } from 'react';
import { PRODUCT_REGISTRY } from '../products/productRegistry';
import { TenantProductLicensingService } from '../core/licensing/TenantProductLicensingService';
import type { TenantProductLicenseSnapshot } from '../core/licensing/TenantProductLicensingTypes';

const EMPTY_SNAPSHOT: TenantProductLicenseSnapshot = {
  tenantId: '',
  organizationId: '',
  licensedProductIds: [],
  userCount: 0,
  usersSynchronized: 0,
  updatedAt: '',
};

export default function useTenantProductLicensing(tenantId: string) {
  const [snapshot, setSnapshot] =
    useState<TenantProductLicenseSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(undefined);

    try {
      setSnapshot(
        await TenantProductLicensingService.getTenantLicenses(tenantId),
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
  }, [tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (productIds: string[], synchronizeUsers = true) => {
      if (!tenantId) return;

      setIsSaving(true);
      setError(undefined);

      try {
        const next = await TenantProductLicensingService.updateTenantLicenses(
          tenantId,
          {
            productIds,
            synchronizeUsers,
          },
        );
        setSnapshot(next);
        return next;
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
    [tenantId],
  );

  const summary = useMemo(
    () =>
      TenantProductLicensingService.buildSummary(
        snapshot,
        PRODUCT_REGISTRY.length,
      ),
    [snapshot],
  );

  return {
    snapshot,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    save,
  };
}
