import { useCallback, useEffect, useState } from 'react';
import { SaasSecurityService } from '../core/security/SaasSecurityService';
import type { SaasSecurityReadiness } from '../core/security/SaasSecurityTypes';

const EMPTY: SaasSecurityReadiness = {
  score: 0,
  status: 'critical',
  databaseMode: 'unknown',
  tablesReady: 0,
  tablesRequired: 7,
  rlsEnabledTables: 0,
  membershipTablesReady: false,
  licenseTableReady: false,
  auditTableReady: false,
  sessionSource: 'none',
  authenticated: false,
  checkedAt: '',
  gates: [],
};

export default function useSaasSecurityReadiness() {
  const [summary, setSummary] = useState<SaasSecurityReadiness>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try { setSummary(await SaasSecurityService.load()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao validar segurança SaaS.'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { ...summary, isLoading, error, refresh };
}
