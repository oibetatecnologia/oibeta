import { calculateCommercialScore } from './CommercialScore';
import { OpportunityMatcher } from './OpportunityMatcher';
import type { CommercialOpportunity, CommercialScoreFactor, OpportunityAnalysisResult } from './OpportunityTypes';

export const COMMERCIAL_ANALYSIS_VERSION = 'radar-v2.2.0';

export class OpportunityAnalyzer {
  static analyze(opportunity: CommercialOpportunity): OpportunityAnalysisResult {
    const matches = OpportunityMatcher.match(opportunity);
    const score = calculateCommercialScore({ estimatedValue: opportunity.estimatedValue, matches });
    const deadlineFactor = resolveDeadlineFactor(opportunity.submissionDeadline);
    const evidenceCount = matches.flatMap((match) => match.findings).filter((finding) => finding.kind === 'evidence').length;
    const uncertaintyCount = matches.flatMap((match) => match.findings).filter((finding) => finding.kind === 'hypothesis' || finding.kind === 'missing_information').length;
    const scoreFactors: CommercialScoreFactor[] = [
      { id: 'catalog-match', label: 'Aderência ao catálogo', value: score.iac, weight: 0.65, contribution: Math.round(score.iac * 0.65), explanation: 'Resultado do matching determinístico entre objeto, modalidade, comprador e perfis comerciais.' },
      { id: 'deadline', label: 'Janela de prazo', value: deadlineFactor, weight: 0.2, contribution: Math.round(deadlineFactor * 0.2), explanation: 'Considera se existe prazo informado e se ainda há janela operacional para análise.' },
      { id: 'evidence-quality', label: 'Qualidade das evidências', value: resolveEvidenceScore(evidenceCount, uncertaintyCount), weight: 0.15, contribution: Math.round(resolveEvidenceScore(evidenceCount, uncertaintyCount) * 0.15), explanation: 'Compara evidências encontradas com hipóteses e informações ausentes.' },
    ];
    const adjustedIac = Math.min(100, scoreFactors.reduce((sum, factor) => sum + factor.contribution, 0));
    const now = new Date().toISOString();
    return {
      opportunityId: opportunity.id,
      analysisVersion: COMMERCIAL_ANALYSIS_VERSION,
      analyzedAt: now,
      iac: adjustedIac,
      ipc: score.ipc,
      confidence: resolveConfidence(evidenceCount, uncertaintyCount, matches.length),
      bestMatches: matches.slice(0, 4),
      scoreFactors,
      findings: matches.flatMap((match) => match.findings),
      recommendedAction: resolveRecommendedAction(adjustedIac, matches.length, opportunity.submissionDeadline),
      generatedAt: now,
    };
  }
}

function resolveDeadlineFactor(deadline?: string): number {
  if (!deadline) return 45;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return 0;
  if (days <= 3) return 25;
  if (days <= 7) return 55;
  if (days <= 20) return 90;
  return 75;
}
function resolveEvidenceScore(evidence: number, uncertainty: number): number {
  if (evidence === 0) return 20;
  return Math.max(20, Math.min(100, Math.round((evidence / Math.max(1, evidence + uncertainty)) * 100)));
}
function resolveConfidence(evidence: number, uncertainty: number, matches: number): 'low' | 'medium' | 'high' {
  if (matches === 0 || evidence === 0) return 'low';
  if (evidence >= 4 && uncertainty <= evidence) return 'high';
  return 'medium';
}
function resolveRecommendedAction(iac: number, matchesCount: number, deadline?: string): string {
  if (deadline && new Date(deadline).getTime() < Date.now()) return 'Prazo encerrado. Confirme na fonte se houve prorrogação antes de qualquer ação comercial.';
  if (matchesCount === 0) return 'Não há aderência comprovada ao catálogo atual. Encaminhe para revisão manual antes de qualificar.';
  if (iac >= 80) return 'Alta aderência determinística. Revise as evidências, confirme a fonte e qualifique para o CRM.';
  if (iac >= 60) return 'Aderência relevante. Revise hipóteses e informações ausentes antes da qualificação.';
  return 'Aderência inicial limitada. Avalie esforço, prazo e capacidade de entrega antes de prosseguir.';
}
export function analyzeOpportunity(opportunity: CommercialOpportunity): OpportunityAnalysisResult { return OpportunityAnalyzer.analyze(opportunity); }

export function ensureCurrentOpportunityAnalysis(opportunity: CommercialOpportunity): OpportunityAnalysisResult {
  if (opportunity.analysis?.analysisVersion === COMMERCIAL_ANALYSIS_VERSION) return opportunity.analysis;
  return OpportunityAnalyzer.analyze(opportunity);
}
