import { ElectoralService } from '../../../services/electoral/ElectoralService';
import type { Campaign } from '../types';

/**
 * CampaignCrudService
 *
 * Serviço operacional de campanhas eleitorais.
 * Não altera regras de negócio: apenas centraliza chamadas ao ElectoralService
 * e preparação de formulário de edição.
 */
export const CampaignCrudService = {
  create(form: Partial<Campaign>, user: any) {
    return ElectoralService.createCampaign(form, user);
  },

  update(campaignId: string, form: Partial<Campaign>, user: any) {
    return ElectoralService.updateCampaign(campaignId, form, user);
  },

  prepareEditForm(campaign: Campaign): Partial<Campaign> {
    return {
      name: campaign.name,
      candidateName: campaign.candidateName || '',
      party: campaign.party || '',
      office: campaign.office || 'PREFEITO',
      electionYear: campaign.electionYear || 2026,
      status: campaign.status || 'PLANNING',
      description: campaign.description || '',
    };
  },
};
