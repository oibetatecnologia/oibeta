import { useMemo } from 'react';
import type { Project, Task, Decision, Memory } from '../types';
import type { CommercialOpportunity } from '../core/commercial/OpportunityTypes';
import type { CustomerPortfolioSummary } from '../core/customerSuccess/CustomerPortfolioTypes';
import type { FinanceIntelligenceSummary } from '../core/finance/FinanceIntelligenceTypes';
import { ExecutiveReportService } from '../core/reports/ExecutiveReportService';

export default function useExecutiveReport(input: { organizationName: string; projects: Project[]; tasks: Task[]; decisions: Decision[]; memories: Memory[]; opportunities: CommercialOpportunity[]; customers: CustomerPortfolioSummary; finance: FinanceIntelligenceSummary; }) {
  return useMemo(() => ExecutiveReportService.build(input), [input.organizationName, input.projects, input.tasks, input.decisions, input.memories, input.opportunities, input.customers, input.finance]);
}
