/**
 * Tipos oficiais do módulo Beta Electoral.
 *
 * Este arquivo centraliza as estruturas de dados utilizadas pelo
 * ElectoralWorkspace e pelos componentes do módulo eleitoral.
 *
 * Responsabilidade:
 * - evitar duplicação de interfaces;
 * - manter consistência entre telas, modais e services;
 * - preservar tipagem de domínio sem alterar regra de negócio.
 */

export interface Campaign {
  id: string;
  name: string;
  candidateName?: string;
  party?: string;
  office?: string;
  electionYear?: number;
  status: 'ACTIVE' | 'PLANNING' | 'COMPLETED' | 'SUSPENDED';
  description?: string;
  createdAt?: string;
}

export interface Territory {
  id: string;
  name: string;
  type: 'REGION' | 'STATE' | 'CITY' | 'ZONE' | 'POLING_PLACE';
  parentId?: string;
  code?: string;
}

export interface Coordinator {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  level: 'REGIONAL' | 'MUNICIPAL' | 'ZONE' | 'LOCAL';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  assignedTerritory?: string;
  campaignId?: string;
}

export interface SavedAnalysis {
  id: string;
  title: string;
  type: string;
  summary: string;
  metadata?: any;
  createdAt: string;
}

export interface Invite {
  id: string;
  campaignId: string;
  email?: string;
  phone?: string;
  role: string;
  assignedTerritoryId?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  createdAt: string;
  inviteLink?: string;
}

export interface DashboardMetrics {
  totalCampaigns: number;
  totalTerritories: number;
  totalCoordinators: number;
  totalInvites: number;
  totalAnalyses: number;
}

export interface AnalysisQueryParams {
  campaignId: string;
  territoryId: string;
  limit: string;
}
