import type { CommercialOpportunity } from './OpportunityTypes';

export interface CommercialExecutiveMetric {
  id: string;
  label: string;
  value: number;
  helper: string;
}

export interface CommercialExecutiveRankingItem {
  id: string;
  label: string;
  opportunities: number;
  estimatedValue: number;
  averageCompatibility: number;
}

export interface CommercialExecutiveSummary {
  generatedAt: string;
  pipelineValue: number;
  qualifiedPipelineValue: number;
  averageCompatibility: number;
  conversionPotential: number;
  urgentOpportunities: number;
  staleOpportunities: number;
  topProducts: CommercialExecutiveRankingItem[];
  topBuyers: CommercialExecutiveRankingItem[];
  topLocations: CommercialExecutiveRankingItem[];
  recommendations: string[];
}

const getBestCompatibility = (opportunity: CommercialOpportunity): number =>
  opportunity.analysis?.bestMatches?.[0]?.score ?? 0;

const isActiveOpportunity = (opportunity: CommercialOpportunity): boolean =>
  !['lost', 'archived'].includes(opportunity.status) && opportunity.qualificationStatus !== 'disqualified';

const buildRanking = (
  opportunities: CommercialOpportunity[],
  keyResolver: (opportunity: CommercialOpportunity) => { id: string; label: string } | null,
): CommercialExecutiveRankingItem[] => {
  const buckets = new Map<string, CommercialExecutiveRankingItem>();

  opportunities.forEach((opportunity) => {
    const key = keyResolver(opportunity);
    if (!key) return;
    const current = buckets.get(key.id) ?? {
      id: key.id,
      label: key.label,
      opportunities: 0,
      estimatedValue: 0,
      averageCompatibility: 0,
    };
    const compatibility = getBestCompatibility(opportunity);
    const nextCount = current.opportunities + 1;
    current.averageCompatibility = Math.round(
      ((current.averageCompatibility * current.opportunities) + compatibility) / nextCount,
    );
    current.opportunities = nextCount;
    current.estimatedValue += opportunity.estimatedValue ?? 0;
    buckets.set(key.id, current);
  });

  return [...buckets.values()]
    .sort((left, right) =>
      right.opportunities - left.opportunities ||
      right.averageCompatibility - left.averageCompatibility ||
      right.estimatedValue - left.estimatedValue,
    )
    .slice(0, 5);
};

export class CommercialExecutiveIntelligenceService {
  static buildSummary(opportunities: CommercialOpportunity[]): CommercialExecutiveSummary {
    const now = Date.now();
    const active = opportunities.filter(isActiveOpportunity);
    const qualified = active.filter((item) => item.qualificationStatus === 'qualified');
    const compatibilityScores = active.map(getBestCompatibility).filter((score) => score > 0);
    const averageCompatibility = compatibilityScores.length
      ? Math.round(compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length)
      : 0;
    const urgentOpportunities = active.filter((item) => {
      if (!item.submissionDeadline) return false;
      const deadline = new Date(item.submissionDeadline).getTime();
      return deadline >= now && deadline - now <= 7 * 86_400_000;
    }).length;
    const staleOpportunities = active.filter((item) => {
      const updatedAt = new Date(item.updatedAt).getTime();
      return Number.isFinite(updatedAt) && now - updatedAt >= 10 * 86_400_000;
    }).length;
    const pipelineValue = active.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0);
    const qualifiedPipelineValue = qualified.reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0);
    const conversionPotential = active.length
      ? Math.round((qualified.length / active.length) * 100)
      : 0;

    const topProducts = buildRanking(active, (item) => {
      const match = item.analysis?.bestMatches?.[0];
      return match ? { id: match.productId, label: match.serviceName } : null;
    });
    const topBuyers = buildRanking(active, (item) =>
      item.buyerName ? { id: item.buyerName.toLocaleLowerCase('pt-BR'), label: item.buyerName } : null,
    );
    const topLocations = buildRanking(active, (item) => {
      const label = [item.city, item.state].filter(Boolean).join(' / ');
      return label ? { id: label.toLocaleLowerCase('pt-BR'), label } : null;
    });

    const recommendations: string[] = [];
    if (urgentOpportunities > 0) recommendations.push(`Priorizar ${urgentOpportunities} oportunidade(s) com prazo nos próximos 7 dias.`);
    if (staleOpportunities > 0) recommendations.push(`Revisar ${staleOpportunities} oportunidade(s) sem atualização há 10 dias ou mais.`);
    if (averageCompatibility < 60 && active.length > 0) recommendations.push('Revisar palavras-chave e evidências dos produtos para aumentar a precisão da aderência.');
    if (qualified.length === 0 && active.length > 0) recommendations.push('Qualificar as oportunidades mais compatíveis antes de iniciar propostas.');
    if (recommendations.length === 0) recommendations.push('Funil comercial saudável: manter o acompanhamento das próximas entregas e prazos.');

    return {
      generatedAt: new Date().toISOString(),
      pipelineValue,
      qualifiedPipelineValue,
      averageCompatibility,
      conversionPotential,
      urgentOpportunities,
      staleOpportunities,
      topProducts,
      topBuyers,
      topLocations,
      recommendations,
    };
  }
}
