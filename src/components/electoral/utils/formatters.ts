import type { Campaign, Coordinator, SavedAnalysis } from '../types';

/**
 * Formatadores oficiais do módulo Beta Electoral.
 *
 * Responsabilidade:
 * - centralizar pequenas formatações visuais;
 * - evitar duplicação em componentes;
 * - manter fallback seguro sem alterar regra de negócio.
 */

export function safeText(value: unknown, fallback = 'Não informado'): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

export function formatDate(value?: string, fallback = 'Sem data'): string {
  if (!value) return fallback;

  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return fallback;
  }
}

export function formatShortId(id?: string, length = 6, fallback = 'NO_ID'): string {
  if (!id) return fallback;
  return `#${id.slice(0, length)}`;
}

export function formatCampaignCandidate(campaign: Campaign): string {
  return `${safeText(campaign.candidateName, 'NÃO ESPECIFICADO')} (${safeText(campaign.party, 'SEM PARTIDO')})`;
}

export function formatCampaignOffice(campaign: Campaign): string {
  return `${safeText(campaign.office, 'Cargo não informado')} - ${campaign.electionYear || 2026}`;
}

export function formatCoordinatorContact(coordinator: Coordinator): string {
  return `${safeText(coordinator.email, 'Sem e-mail')} / ${safeText(coordinator.phone, 'Sem telefone')}`;
}

export function formatReportDate(report: SavedAnalysis): string {
  return formatDate(report.createdAt, 'Sem data');
}
