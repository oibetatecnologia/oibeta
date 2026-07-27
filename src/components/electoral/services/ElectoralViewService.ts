import type { Campaign, Coordinator, Invite, SavedAnalysis, Territory } from '../types';

/**
 * ElectoralViewService
 *
 * Serviço leve de apresentação do módulo eleitoral.
 *
 * Não acessa API.
 * Não altera estado.
 * Não substitui ElectoralService.
 *
 * Responsabilidade:
 * - preparar pequenas estruturas de exibição;
 * - centralizar cálculos derivados usados na UI.
 */
export const ElectoralViewService = {
  countPendingInvites(invites: Invite[]): number {
    return invites.filter((invite) => invite.status === 'PENDING').length;
  },

  countAcceptedInvites(invites: Invite[]): number {
    return invites.filter((invite) => invite.status === 'ACCEPTED').length;
  },

  countDeclinedInvites(invites: Invite[]): number {
    return invites.filter((invite) => invite.status === 'DECLINED').length;
  },

  hasOperationalData(params: {
    campaigns: Campaign[];
    territories: Territory[];
    coordinators: Coordinator[];
  }): boolean {
    return (
      params.campaigns.length > 0 ||
      params.territories.length > 0 ||
      params.coordinators.length > 0
    );
  },

  getLatestReports(reports: SavedAnalysis[], limit = 5): SavedAnalysis[] {
    return [...reports]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit);
  },
};
