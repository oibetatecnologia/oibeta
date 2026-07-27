import { useMemo } from 'react';
import type { Campaign, Coordinator, DashboardMetrics, Invite, SavedAnalysis, Territory } from '../types';

interface UseElectoralDashboardParams {
  campaigns: Campaign[];
  territories: Territory[];
  coordinators: Coordinator[];
  invites: Invite[];
  savedAnalyses: SavedAnalysis[];
}

/**
 * useElectoralDashboard
 *
 * Centraliza o cálculo das métricas do dashboard eleitoral.
 */
export function useElectoralDashboard({
  campaigns,
  territories,
  coordinators,
  invites,
  savedAnalyses,
}: UseElectoralDashboardParams): DashboardMetrics {
  return useMemo(
    () => ({
      totalCampaigns: campaigns.length,
      totalTerritories: territories.length,
      totalCoordinators: coordinators.length,
      totalInvites: invites.length,
      totalAnalyses: savedAnalyses.length,
    }),
    [campaigns, territories, coordinators, invites, savedAnalyses]
  );
}
