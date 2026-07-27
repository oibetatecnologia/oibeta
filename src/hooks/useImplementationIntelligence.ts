import { useMemo } from 'react';
import type { ClientsWorkspaceClient } from './useClientsWorkspace';
import { ImplementationIntelligenceService } from '../core/implementations/ImplementationIntelligenceService';

interface TaskLike {
  title?: string;
  status?: string;
}

export default function useImplementationIntelligence(clients: ClientsWorkspaceClient[], tasks: TaskLike[]) {
  return useMemo(() => ImplementationIntelligenceService.buildSummary(clients, tasks), [clients, tasks]);
}
