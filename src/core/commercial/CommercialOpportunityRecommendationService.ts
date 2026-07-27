import type { CommercialOpportunity, CommercialOpportunityPriority } from './OpportunityTypes';

export type CommercialRecommendationUrgency = 'imediata' | 'alta' | 'normal';
export type CommercialPursuitStage = 'qualificacao' | 'documentacao' | 'proposta' | 'submissao';

export interface CommercialPursuitPlanStep {
  id: CommercialPursuitStage;
  title: string;
  description: string;
  status: 'pronto' | 'pendente' | 'bloqueado';
  taskTitle: string;
}

export interface CommercialPursuitPlan {
  readinessScore: number;
  readinessLabel: 'Pronto para avançar' | 'Avanço condicionado' | 'Ainda não avançar';
  blockers: string[];
  steps: CommercialPursuitPlanStep[];
}

export interface CommercialOpportunityRecommendation {
  opportunity: CommercialOpportunity;
  rank: number;
  recommendationScore: number;
  compatibilityScore: number;
  productName: string;
  urgency: CommercialRecommendationUrgency;
  deadlineLabel: string;
  reasons: string[];
  nextAction: string;
  taskTitle: string;
  pursuitPlan: CommercialPursuitPlan;
}

export interface CommercialRecommendationSummary {
  totalAnalyzed: number;
  totalRecommended: number;
  averageCompatibility: number;
  urgentCount: number;
  readyToAdvanceCount: number;
  recommendations: CommercialOpportunityRecommendation[];
}

const PRIORITY_WEIGHT: Record<CommercialOpportunityPriority, number> = {
  critical: 100,
  high: 75,
  medium: 45,
  low: 20,
};

function getDeadlineContext(deadline?: string): { points: number; urgency: CommercialRecommendationUrgency; label: string; days?: number } {
  if (!deadline) {
    return { points: 0, urgency: 'normal', label: 'Prazo não informado' };
  }

  const timestamp = new Date(deadline).getTime();
  if (!Number.isFinite(timestamp)) {
    return { points: 0, urgency: 'normal', label: 'Prazo inválido' };
  }

  const days = Math.ceil((timestamp - Date.now()) / 86_400_000);
  if (days < 0) return { points: -40, urgency: 'normal', label: `Encerrada há ${Math.abs(days)} dia(s)`, days };
  if (days <= 3) return { points: 25, urgency: 'imediata', label: `Encerra em ${days} dia(s)`, days };
  if (days <= 10) return { points: 18, urgency: 'alta', label: `Encerra em ${days} dia(s)`, days };
  if (days <= 30) return { points: 10, urgency: 'normal', label: `Encerra em ${days} dia(s)`, days };
  return { points: 4, urgency: 'normal', label: `Encerra em ${days} dia(s)`, days };
}

export class CommercialOpportunityRecommendationService {
  static buildSummary(opportunities: CommercialOpportunity[], limit = 5): CommercialRecommendationSummary {
    const recommendations = opportunities
      .map((opportunity) => this.buildRecommendation(opportunity))
      .filter((item): item is Omit<CommercialOpportunityRecommendation, 'rank'> => Boolean(item))
      .sort((left, right) => right.recommendationScore - left.recommendationScore)
      .slice(0, limit)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const averageCompatibility = recommendations.length === 0
      ? 0
      : Math.round(recommendations.reduce((total, item) => total + item.compatibilityScore, 0) / recommendations.length);

    return {
      totalAnalyzed: opportunities.length,
      totalRecommended: recommendations.length,
      averageCompatibility,
      urgentCount: recommendations.filter((item) => item.urgency === 'imediata' || item.urgency === 'alta').length,
      readyToAdvanceCount: recommendations.filter((item) => item.pursuitPlan.readinessScore >= 75).length,
      recommendations,
    };
  }

  private static buildRecommendation(opportunity: CommercialOpportunity): Omit<CommercialOpportunityRecommendation, 'rank'> | null {
    if (opportunity.status === 'lost' || opportunity.status === 'archived' || opportunity.qualificationStatus === 'disqualified') {
      return null;
    }

    const bestMatch = opportunity.analysis?.bestMatches?.[0];
    const compatibilityScore = Math.max(0, Math.min(100, Math.round(bestMatch?.score || 0)));
    if (compatibilityScore <= 0) return null;

    const deadline = getDeadlineContext(opportunity.submissionDeadline);
    const qualificationPoints = opportunity.qualificationStatus === 'qualified'
      ? 20
      : opportunity.qualificationStatus === 'review_required'
        ? 8
        : 0;
    const confidencePoints = opportunity.analysis?.confidence === 'high'
      ? 12
      : opportunity.analysis?.confidence === 'medium'
        ? 6
        : 0;
    const valuePoints = opportunity.estimatedValue && opportunity.estimatedValue > 0 ? 5 : 0;
    const recommendationScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          compatibilityScore * 0.55
          + PRIORITY_WEIGHT[opportunity.priority] * 0.15
          + qualificationPoints
          + confidencePoints
          + valuePoints
          + deadline.points,
        ),
      ),
    );

    const reasons = [
      `${compatibilityScore}% de compatibilidade com ${bestMatch?.serviceName || 'produto identificado'}`,
      `Prioridade ${this.getPriorityLabel(opportunity.priority).toLowerCase()}`,
      deadline.label,
    ];

    if (opportunity.qualificationStatus === 'qualified') reasons.push('Oportunidade já qualificada comercialmente');
    if (opportunity.analysis?.confidence) reasons.push(`Confiança da análise: ${this.getConfidenceLabel(opportunity.analysis.confidence)}`);

    const nextAction = opportunity.qualificationStatus === 'qualified'
      ? 'Preparar proposta e validar requisitos do edital com o responsável comercial.'
      : opportunity.qualificationStatus === 'review_required'
        ? 'Revisar requisitos pendentes e concluir a qualificação antes de preparar proposta.'
        : 'Validar aderência, documentação e capacidade de atendimento antes de avançar.';

    const productName = bestMatch?.serviceName || 'Produto não identificado';
    const pursuitPlan = this.buildPursuitPlan(opportunity, productName, compatibilityScore, deadline.days, bestMatch?.missingRequirements || []);

    return {
      opportunity,
      recommendationScore,
      compatibilityScore,
      productName,
      urgency: deadline.urgency,
      deadlineLabel: deadline.label,
      reasons,
      nextAction,
      taskTitle: `[Radar] ${opportunity.title}: ${nextAction}`,
      pursuitPlan,
    };
  }

  private static buildPursuitPlan(
    opportunity: CommercialOpportunity,
    productName: string,
    compatibilityScore: number,
    daysToDeadline: number | undefined,
    missingRequirements: string[],
  ): CommercialPursuitPlan {
    const blockers: string[] = [];
    if (opportunity.qualificationStatus !== 'qualified') blockers.push('Qualificação comercial ainda não concluída');
    if (!opportunity.submissionDeadline) blockers.push('Prazo de submissão não informado');
    if (!opportunity.sourceUrl && !opportunity.processNumber) blockers.push('Edital ou processo sem referência verificável');
    if (compatibilityScore < 70) blockers.push('Compatibilidade abaixo de 70%');
    if (missingRequirements.length > 0) blockers.push(`${missingRequirements.length} requisito(s) do produto ainda precisam de validação`);
    if (daysToDeadline !== undefined && daysToDeadline < 0) blockers.push('Prazo da oportunidade encerrado');
    if (daysToDeadline !== undefined && daysToDeadline <= 2 && opportunity.qualificationStatus !== 'qualified') {
      blockers.push('Prazo crítico sem qualificação concluída');
    }

    const qualificationReady = opportunity.qualificationStatus === 'qualified';
    const documentationReady = Boolean(opportunity.sourceUrl || opportunity.processNumber) && missingRequirements.length === 0;
    const proposalReady = qualificationReady && compatibilityScore >= 70;
    const submissionReady = proposalReady && documentationReady && daysToDeadline !== undefined && daysToDeadline >= 0;

    const steps: CommercialPursuitPlanStep[] = [
      {
        id: 'qualificacao',
        title: 'Qualificar oportunidade',
        description: 'Confirmar aderência, capacidade de entrega, comprador, escopo e decisão de avançar.',
        status: qualificationReady ? 'pronto' : 'pendente',
        taskTitle: `[Radar][Qualificação] ${opportunity.title} — validar aderência do ${productName}`,
      },
      {
        id: 'documentacao',
        title: 'Validar edital e documentos',
        description: 'Conferir requisitos, certidões, anexos, processo, prazos e impedimentos de participação.',
        status: documentationReady ? 'pronto' : qualificationReady ? 'pendente' : 'bloqueado',
        taskTitle: `[Radar][Documentação] ${opportunity.title} — revisar edital e requisitos`,
      },
      {
        id: 'proposta',
        title: 'Preparar proposta',
        description: 'Montar escopo, preço, cronograma, responsabilidades e evidências de capacidade técnica.',
        status: proposalReady ? 'pendente' : 'bloqueado',
        taskTitle: `[Radar][Proposta] ${opportunity.title} — preparar proposta do ${productName}`,
      },
      {
        id: 'submissao',
        title: 'Revisar e submeter',
        description: 'Executar revisão final, validar autorização responsável e registrar o envio da proposta.',
        status: submissionReady ? 'pendente' : 'bloqueado',
        taskTitle: `[Radar][Submissão] ${opportunity.title} — revisar e protocolar proposta`,
      },
    ];

    const baseReadiness = compatibilityScore * 0.45
      + (qualificationReady ? 25 : opportunity.qualificationStatus === 'review_required' ? 10 : 0)
      + (documentationReady ? 20 : 0)
      + (opportunity.estimatedValue ? 5 : 0)
      + (daysToDeadline !== undefined && daysToDeadline >= 0 ? 5 : 0);
    const readinessScore = Math.max(0, Math.min(100, Math.round(baseReadiness)));
    const readinessLabel = readinessScore >= 75
      ? 'Pronto para avançar'
      : readinessScore >= 50
        ? 'Avanço condicionado'
        : 'Ainda não avançar';

    return { readinessScore, readinessLabel, blockers, steps };
  }

  private static getPriorityLabel(priority: CommercialOpportunityPriority): string {
    return ({ critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' })[priority];
  }

  private static getConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
    return ({ low: 'baixa', medium: 'média', high: 'alta' })[confidence];
  }
}
