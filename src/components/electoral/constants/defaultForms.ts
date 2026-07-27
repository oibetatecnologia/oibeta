import type { Campaign, Coordinator, Invite, Territory } from '../types';

/**
 * Formulários padrão oficiais do módulo Beta Electoral.
 *
 * Responsabilidade:
 * - centralizar estado inicial dos formulários;
 * - evitar duplicação no ElectoralWorkspace;
 * - preservar os valores padrão usados atualmente.
 */

export function createDefaultCampaignForm(): Partial<Campaign> {
  return {
    name: '',
    candidateName: '',
    party: '',
    office: 'PREFEITO',
    electionYear: 2026,
    status: 'PLANNING',
    description: '',
  };
}

export function createDefaultTerritoryForm(): Partial<Territory> {
  return {
    name: '',
    type: 'REGION',
    parentId: '',
    code: '',
  };
}

export function createDefaultCoordinatorForm(): Partial<Coordinator> {
  return {
    name: '',
    email: '',
    phone: '',
    level: 'REGIONAL',
    status: 'ACTIVE',
    assignedTerritory: '',
    campaignId: '',
  };
}

export function createDefaultInviteForm(): Partial<Invite> {
  return {
    campaignId: '',
    email: '',
    phone: '',
    role: 'COORDINATOR',
    assignedTerritoryId: '',
  };
}
