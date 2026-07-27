import type { GeneratedCommercialTask, OpportunityAnalysisResult } from './OpportunityTypes';

export class OpportunityTaskGenerator {
  static generateTasks(analysis: OpportunityAnalysisResult): GeneratedCommercialTask[] {
    return analysis.bestMatches.flatMap((match) =>
      match.missingRequirements.map((requirement) => ({
        id: `task-${analysis.opportunityId}-${slugify(requirement)}`,
        title: `Avaliar requisito: ${requirement}`,
        description: `Requisito identificado na oportunidade analisada para o serviço ${match.serviceName}.`,
        priority: analysis.iac >= 80 ? 'high' : 'medium',
        relatedProductId: match.productId,
        sourceOpportunityId: analysis.opportunityId,
      })),
    );
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}


export function generateTasksFromOpportunityAnalysis(analysis: OpportunityAnalysisResult): GeneratedCommercialTask[] {
  return OpportunityTaskGenerator.generateTasks(analysis);
}
