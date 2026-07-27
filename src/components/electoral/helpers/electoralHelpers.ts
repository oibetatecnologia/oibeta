import type { Campaign, Territory } from '../types';

/**
 * Helpers de domínio do módulo Beta Electoral.
 */

export function getCampaignName(campaigns: Campaign[], campaignId?: string): string {
  if (!campaignId) return 'Geral da Organização';
  return campaigns.find((campaign) => campaign.id === campaignId)?.name || 'Campanha não encontrada';
}

export function getTerritoryName(territories: Territory[], territoryId?: string): string {
  if (!territoryId) return 'Geral do Município';
  return territories.find((territory) => territory.id === territoryId)?.name || 'Território não encontrado';
}

export function getTerritoryParentLabel(territories: Territory[], parentId?: string): string {
  if (!parentId) return 'Raiz';
  const parent = territories.find((territory) => territory.id === parentId);
  return parent ? `${parent.name} (${parent.type})` : `ID ${parentId.slice(0, 6)}`;
}

export function filterRootTerritories(territories: Territory[]): Territory[] {
  return territories.filter((territory) => !territory.parentId);
}

export function filterChildrenTerritories(territories: Territory[], parentId: string): Territory[] {
  return territories.filter((territory) => territory.parentId === parentId);
}
