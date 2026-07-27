/**
 * Constantes oficiais do módulo Beta Electoral.
 */

export const CAMPAIGN_STATUS = [
  'PLANNING',
  'ACTIVE',
  'COMPLETED',
  'SUSPENDED',
] as const;

export const INVITE_STATUS = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'REVOKED',
] as const;

export const COORDINATOR_LEVELS = [
  'REGIONAL',
  'MUNICIPAL',
  'ZONE',
  'LOCAL',
] as const;

export const TERRITORY_TYPES = [
  'REGION',
  'STATE',
  'CITY',
  'ZONE',
  'POLING_PLACE',
] as const;

export const ELECTORAL_OFFICES = [
  'PRESIDENTE',
  'GOVERNADOR',
  'SENADOR',
  'DEPUTADO_FEDERAL',
  'DEPUTADO_ESTADUAL',
  'PREFEITO',
  'VEREADOR',
] as const;

export const DEFAULT_ELECTION_YEARS = [2024,2026,2028,2030] as const;
