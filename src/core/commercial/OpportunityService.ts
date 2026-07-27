import type { CommercialDomainSnapshot } from './CommercialInterfaces';
import { analyzeOpportunity } from './OpportunityAnalyzer';
import { generateTasksFromOpportunityAnalysis } from './OpportunityTaskGenerator';
import type { CommercialOpportunity, OpportunityAnalysisResult, GeneratedCommercialTask } from './OpportunityTypes';

export class OpportunityService {
  static buildDomainSnapshot(opportunities: CommercialOpportunity[] = []): CommercialDomainSnapshot {
    const normalized = opportunities.map((opportunity) => ({
      ...opportunity,
      qualificationStatus: opportunity.qualificationStatus || 'unqualified',
      analysis: opportunity.analysis || analyzeOpportunity(opportunity),
    }));
    const analyses = normalized.map((opportunity) => opportunity.analysis as OpportunityAnalysisResult);
    const generatedTasks: GeneratedCommercialTask[] = analyses.flatMap((analysis) => generateTasksFromOpportunityAnalysis(analysis));
    return { opportunities: normalized, analyses, generatedTasks, readiness: { opportunityRegistry: true, opportunityService: true, opportunityAnalyzer: true, opportunityMatcher: true, commercialScore: true, taskGenerator: true, externalSources: false } };
  }
  static calculateAverageIac(analyses: OpportunityAnalysisResult[]): number { return analyses.length ? Math.round(analyses.reduce((sum, item) => sum + item.iac, 0) / analyses.length) : 0; }
  static calculateTotalIpc(analyses: OpportunityAnalysisResult[]): number { return analyses.reduce((sum, item) => sum + item.ipc, 0); }
}
