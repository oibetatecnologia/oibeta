import type { Campaign, Coordinator, Invite, Territory } from '../types';

/**
 * Validadores simples do módulo Beta Electoral.
 *
 * Estes validadores não substituem validação de backend.
 * Eles apenas centralizam verificações de interface para evitar duplicação.
 */

export function hasValidCampaignForm(form: Partial<Campaign>): boolean {
  return Boolean(form.name && form.electionYear);
}

export function hasValidTerritoryForm(form: Partial<Territory>): boolean {
  return Boolean(form.name && form.type);
}

export function hasValidCoordinatorForm(form: Partial<Coordinator>): boolean {
  return Boolean(form.name && form.level && form.status);
}

export function hasValidInviteForm(form: Partial<Invite>): boolean {
  return Boolean(form.campaignId && form.role);
}

export function isNonEmptyList<T>(items: T[] | undefined | null): items is T[] {
  return Array.isArray(items) && items.length > 0;
}
