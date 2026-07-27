import type { ProcurementOpportunityType, ProcurementSourceKey } from './CommercialRadarRegistry';

export type CommercialOpportunityStatus =
  | 'draft' | 'new' | 'analysis_pending' | 'analyzed' | 'proposal' | 'negotiation'
  | 'won' | 'implementation' | 'client_active' | 'lost' | 'archived';
export type CommercialOpportunityPriority = 'low' | 'medium' | 'high' | 'critical';
export type CommercialOpportunitySphere = 'federal' | 'state' | 'municipal' | 'other';
export type CommercialOpportunityQualification = 'unqualified' | 'review_required' | 'qualified' | 'disqualified';
export type CommercialFindingKind = 'evidence' | 'inference' | 'hypothesis' | 'missing_information';
export type CommercialSourceType = 'manual' | 'api' | 'import' | 'portal';

export interface CommercialOpportunityInput {
  title: string;
  buyerName: string;
  sphere?: CommercialOpportunitySphere;
  city?: string;
  state?: string;
  type: ProcurementOpportunityType;
  estimatedValue?: number;
  publicationDate?: string;
  submissionDeadline?: string;
  sourceUrl?: string;
  sourceId?: ProcurementSourceKey | 'manual' | string;
  sourceLabel?: string;
  sourceType?: CommercialSourceType;
  externalId?: string;
  processNumber?: string;
  capturedAt?: string;
  lastCheckedAt?: string;
  sourcePublishedAt?: string;
  sourceUpdatedAt?: string;
  sourceHash?: string;
  object: string;
  notes?: string;
}

export interface CommercialFinding {
  id: string;
  kind: CommercialFindingKind;
  label: string;
  detail: string;
  sourceField?: 'title' | 'object' | 'notes' | 'buyerName' | 'metadata';
}

export interface CommercialScoreFactor {
  id: string;
  label: string;
  value: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface OpportunityMatchResult {
  serviceId: string;
  productId: string;
  serviceName: string;
  score: number;
  matchedKeywords: string[];
  findings: CommercialFinding[];
  missingRequirements: string[];
}

export interface OpportunityAnalysisResult {
  opportunityId: string;
  analysisVersion: string;
  analyzedAt: string;
  iac: number;
  ipc: number;
  confidence: 'low' | 'medium' | 'high';
  bestMatches: OpportunityMatchResult[];
  scoreFactors: CommercialScoreFactor[];
  findings: CommercialFinding[];
  recommendedAction: string;
  generatedAt: string;
}

export interface CommercialOpportunity extends CommercialOpportunityInput {
  id: string;
  status: CommercialOpportunityStatus;
  priority: CommercialOpportunityPriority;
  qualificationStatus: CommercialOpportunityQualification;
  duplicateKey?: string;
  probableDuplicateOf?: string;
  analysis?: OpportunityAnalysisResult;
  crmOpportunityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedCommercialTask {
  id: string;
  title: string;
  description: string;
  priority: CommercialOpportunityPriority;
  relatedProductId?: string;
  sourceOpportunityId: string;
}

export function getOpportunitySphereLabel(sphere?: CommercialOpportunitySphere): string {
  const labels: Record<CommercialOpportunitySphere, string> = { federal: 'Federal', state: 'Estadual', municipal: 'Municipal', other: 'Outro' };
  return sphere ? labels[sphere] : 'Não informado';
}

export function getQualificationLabel(status: CommercialOpportunityQualification): string {
  return ({ unqualified: 'Não qualificada', review_required: 'Revisão necessária', qualified: 'Qualificada', disqualified: 'Desqualificada' })[status];
}
