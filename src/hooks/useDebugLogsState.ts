import { useState } from 'react';
import type { DebugLogEntry } from '../types/workspace/WorkspaceState';

interface UseDebugLogsStateArgs {
  tenantOnlyHeaders: () => Record<string, string>;
}

/**
 * useDebugLogsState
 * Estado e carregamento dos logs técnicos da Beta.
 *
 * Responsabilidade:
 * - carregar logs de depuração;
 * - controlar estado de carregamento;
 * - não renderizar UI.
 */
export default function useDebugLogsState({
  tenantOnlyHeaders,
}: UseDebugLogsStateArgs) {
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isFetchingDebug, setIsFetchingDebug] = useState(false);

  const fetchDebugLogs = async () => {
    setIsFetchingDebug(true);

    try {
      const res = await fetch('/api/debug-logs', { headers: tenantOnlyHeaders() });

      if (res.ok) {
        const data = await res.json() as DebugLogEntry[];
        setDebugLogs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching debug logs:', error);
    } finally {
      setIsFetchingDebug(false);
    }
  };

  return {
    debugLogs,
    isFetchingDebug,
    fetchDebugLogs,
  };
}
