import { useMemo } from 'react';
import type { ClientsWorkspaceClient } from './useClientsWorkspace';
import { SupportIntelligenceService } from '../core/support/SupportIntelligenceService';

export default function useSupportIntelligence(clients: ClientsWorkspaceClient[]) {
  return useMemo(() => SupportIntelligenceService.buildSummary(clients), [clients]);
}
