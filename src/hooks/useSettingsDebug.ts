import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

export interface SettingsDebugLog {
  id: string;
  intentType?: string;
  executed?: boolean;
  errorReturned?: string;
  confidence?: number;
  executionTime?: number;
  createdAt: string;
}

/**
 * useSettingsDebug
 *
 * Hook especializado para Diagnóstico e Logs Beta AI do SettingsWorkspace.
 *
 * Responsabilidade:
 * - consumir o WorkspaceContext;
 * - expor apenas o domínio de logs/debug;
 * - normalizar logs para garantir contrato estável na interface;
 * - remover o repasse manual de props pelo WorkspaceTabsRouter.
 */
export default function useSettingsDebug() {
  const workspace = useWorkspace();

  const {
    debugLogs,
    isFetchingDebug,
    fetchDebugLogs,
  } = workspace.logs;

  const normalizedDebugLogs = useMemo<SettingsDebugLog[]>(
    () =>
      debugLogs.map((log, index) => {
        const safeLog = log as Partial<SettingsDebugLog>;

        return {
          id: safeLog.id ?? `debug-log-${index}`,
          intentType: safeLog.intentType,
          executed: safeLog.executed,
          errorReturned: safeLog.errorReturned,
          confidence: safeLog.confidence,
          executionTime: safeLog.executionTime,
          createdAt: safeLog.createdAt ?? new Date().toISOString(),
        };
      }),
    [debugLogs]
  );

  const refreshDebugLogs = useCallback(() => {
    return fetchDebugLogs();
  }, [fetchDebugLogs]);

  return useMemo(
    () => ({
      debugLogs: normalizedDebugLogs,
      isFetchingDebug,
      refreshDebugLogs,
    }),
    [
      normalizedDebugLogs,
      isFetchingDebug,
      refreshDebugLogs,
    ]
  );
}
