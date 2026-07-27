import { useMemo } from 'react';
import type { ClientsWorkspaceClient } from './useClientsWorkspace';
import { FinanceIntelligenceService } from '../core/finance/FinanceIntelligenceService';

export default function useFinanceIntelligence(clients: ClientsWorkspaceClient[]) {
  return useMemo(() => FinanceIntelligenceService.build(clients), [clients]);
}
