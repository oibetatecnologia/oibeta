import { buildOpportunityDuplicateKey, normalizeOpportunityInput } from './OpportunityNormalizer';
import { OpportunityAnalyzer } from './OpportunityAnalyzer';
import type { CommercialOpportunity, CommercialOpportunityInput, CommercialOpportunityPriority, CommercialOpportunityStatus } from './OpportunityTypes';

export const EMPTY_COMMERCIAL_OPPORTUNITIES: CommercialOpportunity[] = [];
export function createOpportunityDraft(rawInput: CommercialOpportunityInput): CommercialOpportunity {
  const input = normalizeOpportunityInput(rawInput);
  const now = new Date().toISOString();
  const base: CommercialOpportunity = { id: createOpportunityId(), ...input, status: 'new', priority: resolveOpportunityPriority(input.estimatedValue), qualificationStatus: 'unqualified', duplicateKey: buildOpportunityDuplicateKey(input), createdAt: now, updatedAt: now };
  return { ...base, analysis: OpportunityAnalyzer.analyze(base) };
}
export function getOpportunityStatusLabel(status: CommercialOpportunityStatus): string {
  return ({ draft:'Rascunho', new:'Nova', analysis_pending:'Aguardando análise', analyzed:'Analisada', proposal:'Em proposta', negotiation:'Em negociação', won:'Ganha', implementation:'Implantação', client_active:'Cliente ativo', lost:'Perdida', archived:'Arquivada' })[status];
}
export function getOpportunityPriorityLabel(priority: CommercialOpportunityPriority): string { return ({ low:'Baixa', medium:'Média', high:'Alta', critical:'Crítica' })[priority]; }
export function resolveOpportunityPriority(value?: number): CommercialOpportunityPriority { if (!value) return 'medium'; if (value >= 500000) return 'critical'; if (value >= 150000) return 'high'; if (value >= 50000) return 'medium'; return 'low'; }
function createOpportunityId(): string { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `opp-${crypto.randomUUID()}`; return `opp-${Date.now()}-${Math.round(Math.random()*100000)}`; }
