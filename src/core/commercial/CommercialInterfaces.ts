import type {
  CommercialOpportunity,
  OpportunityAnalysisResult,
  GeneratedCommercialTask,
} from './OpportunityTypes';

export interface CommercialDomainReadiness {
  opportunityRegistry: boolean;
  opportunityService: boolean;
  opportunityAnalyzer: boolean;
  opportunityMatcher: boolean;
  commercialScore: boolean;
  taskGenerator: boolean;
  externalSources: boolean;
}

export interface CommercialDomainSnapshot {
  opportunities: CommercialOpportunity[];
  analyses: OpportunityAnalysisResult[];
  generatedTasks: GeneratedCommercialTask[];
  readiness: CommercialDomainReadiness;
}
