import { useMemo } from 'react';
import type { ClientsWorkspaceClient } from './useClientsWorkspace';
import { CustomerPortfolioIntelligenceService } from '../core/customerSuccess/CustomerPortfolioIntelligenceService';

export default function useCustomerPortfolioIntelligence(clients: ClientsWorkspaceClient[]) {
  return useMemo(() => CustomerPortfolioIntelligenceService.buildSummary(clients), [clients]);
}
