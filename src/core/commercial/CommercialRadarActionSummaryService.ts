import { isOpportunityExpired, type CommercialOpportunity } from './OpportunityTypes';

export interface CommercialRadarActionItem {
  id: 'critical' | 'ready_for_crm' | 'expiring' | 'unreviewed';
  title: string;
  description: string;
  count: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionLabel: string;
}

export interface CommercialRadarActionSummary {
  generatedAt: string;
  total: number;
  actionable: number;
  highCompatibility: number;
  readyForCrm: number;
  expiringSoon: number;
  unreviewed: number;
  topProduct?: {
    id: string;
    name: string;
    count: number;
  };
  items: CommercialRadarActionItem[];
}

const scoreOf = (opportunity: CommercialOpportunity): number =>
  opportunity.analysis?.bestMatches?.[0]?.score || 0;

const isExpiringSoon = (opportunity: CommercialOpportunity): boolean => {
  if (!opportunity.submissionDeadline || isOpportunityExpired(opportunity)) return false;
  const deadline = new Date(opportunity.submissionDeadline).getTime();
  return deadline - Date.now() <= 7 * 24 * 60 * 60 * 1000;
};

export class CommercialRadarActionSummaryService {
  static build(opportunities: CommercialOpportunity[]): CommercialRadarActionSummary {
    const active = opportunities.filter((item) => !isOpportunityExpired(item) && item.engagementStatus !== 'ignored');
    const highCompatibility = active.filter((item) => scoreOf(item) >= 75).length;
    const readyForCrm = active.filter(
      (item) => item.qualificationStatus === 'qualified' && !item.crmOpportunityId,
    ).length;
    const expiringSoon = active.filter(isExpiringSoon).length;
    const unreviewed = active.filter(
      (item) => !item.qualificationStatus || item.qualificationStatus === 'unqualified',
    ).length;

    const demand = new Map<string, { name: string; count: number }>();
    for (const opportunity of active) {
      const match = opportunity.analysis?.bestMatches?.[0];
      if (!match || match.score <= 0) continue;
      const current = demand.get(match.productId) || { name: match.serviceName, count: 0 };
      current.count += 1;
      demand.set(match.productId, current);
    }

    const topProductEntry = [...demand.entries()].sort((left, right) => right[1].count - left[1].count)[0];
    const topProduct = topProductEntry
      ? { id: topProductEntry[0], name: topProductEntry[1].name, count: topProductEntry[1].count }
      : undefined;

    const items: CommercialRadarActionItem[] = [
      {
        id: 'critical',
        title: 'Oportunidades de alta aderência',
        description: highCompatibility > 0
          ? `${highCompatibility} oportunidade(s) ativas possuem compatibilidade igual ou superior a 75%.`
          : 'Nenhuma oportunidade ativa atingiu 75% de compatibilidade.',
        count: highCompatibility,
        priority: highCompatibility > 0 ? 'high' : 'low',
        actionLabel: 'Ver alta aderência',
      },
      {
        id: 'ready_for_crm',
        title: 'Prontas para o CRM',
        description: readyForCrm > 0
          ? `${readyForCrm} oportunidade(s) já foram qualificadas e aguardam decisão de envio manual ao CRM.`
          : 'Nenhuma oportunidade qualificada está aguardando envio ao CRM.',
        count: readyForCrm,
        priority: readyForCrm > 0 ? 'critical' : 'low',
        actionLabel: 'Ver qualificadas',
      },
      {
        id: 'expiring',
        title: 'Prazos nos próximos 7 dias',
        description: expiringSoon > 0
          ? `${expiringSoon} oportunidade(s) exigem avaliação rápida por proximidade do prazo.`
          : 'Nenhuma oportunidade ativa vence nos próximos 7 dias.',
        count: expiringSoon,
        priority: expiringSoon > 0 ? 'high' : 'low',
        actionLabel: 'Ver por prazo',
      },
      {
        id: 'unreviewed',
        title: 'Aguardando triagem',
        description: unreviewed > 0
          ? `${unreviewed} oportunidade(s) ativas ainda não receberam decisão comercial.`
          : 'Todas as oportunidades ativas possuem uma decisão comercial registrada.',
        count: unreviewed,
        priority: unreviewed > 0 ? 'medium' : 'low',
        actionLabel: 'Iniciar triagem',
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      total: opportunities.length,
      actionable: active.length,
      highCompatibility,
      readyForCrm,
      expiringSoon,
      unreviewed,
      topProduct,
      items,
    };
  }
}
