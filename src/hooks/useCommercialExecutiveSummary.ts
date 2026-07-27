import { useMemo } from 'react';
import { CommercialExecutiveIntelligenceService } from '../core/commercial/CommercialExecutiveIntelligenceService';
import type { CommercialOpportunity } from '../core/commercial/OpportunityTypes';

export default function useCommercialExecutiveSummary(opportunities: CommercialOpportunity[]) {
  return useMemo(
    () => CommercialExecutiveIntelligenceService.buildSummary(opportunities),
    [opportunities],
  );
}
