import { useEffect, useState } from 'react';
import type { ActionLogEntry } from '../types/workspace/WorkspaceState';

interface UseActionLogsStateArgs {
  selectedProjectId: string;
  tenantOnlyHeaders: () => Record<string, string>;
}

/**
 * useActionLogsState
 * Estado e sincronização dos logs de ações operacionais.
 *
 * Responsabilidade:
 * - carregar histórico de ações;
 * - reagir à troca de projeto;
 * - proteger contra 429 sem quebrar a Área de Trabalho;
 * - não renderizar UI.
 */
export default function useActionLogsState({
  selectedProjectId,
  tenantOnlyHeaders,
}: UseActionLogsStateArgs) {
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);

  const fetchActionLogs = async () => {
    try {
      const res = await fetch('/api/actions', { headers: tenantOnlyHeaders() });

      if (res.status === 429) {
        console.warn('[Beta Platform] /api/actions retornou 429. Pausando atualização de logs para preservar a Área de Trabalho.');
        return;
      }

      if (res.ok) {
        const data = await res.json() as ActionLogEntry[];
        setActionLogs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching action logs:', error);
    }
  };

  useEffect(() => {
    fetchActionLogs();
  }, [selectedProjectId]);

  return {
    actionLogs,
    fetchActionLogs,
  };
}
