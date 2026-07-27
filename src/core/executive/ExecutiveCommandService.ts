import { CommercialExecutiveIntelligenceService } from '../commercial/CommercialExecutiveIntelligenceService';
import type { CommercialOpportunity } from '../commercial/OpportunityTypes';
import { TaskExecutionIntelligenceService } from '../tasks/TaskExecutionIntelligenceService';
import type { Task } from '../../types';
import { ExecutiveActionFactory } from './ExecutiveActionFactory';
import type { ExecutiveCommandSummary, ExecutiveSeverity } from './ExecutiveCommandTypes';

const activeOpportunity = (item: CommercialOpportunity): boolean =>
  !['lost', 'archived', 'won', 'client_active'].includes(item.status) && item.qualificationStatus !== 'disqualified';

const severityFor = (score: number, overdue: number): ExecutiveSeverity =>
  overdue > 0 || score < 45 ? 'critical' : score < 70 ? 'attention' : 'healthy';

export class ExecutiveCommandService {
  static build(opportunities: CommercialOpportunity[], tasks: Task[]): ExecutiveCommandSummary {
    const commercial = CommercialExecutiveIntelligenceService.buildSummary(opportunities);
    const execution = TaskExecutionIntelligenceService.buildSummary(tasks);
    const active = opportunities.filter(activeOpportunity);

    const opportunityActions = active.map((item) => ExecutiveActionFactory.fromOpportunity(item));
    const taskActions = tasks
      .filter((task) => task.status !== 'completed')
      .map((task) => ExecutiveActionFactory.fromTask(task));
    const actionQueue = [...opportunityActions, ...taskActions]
      .filter((item) => item.severity !== 'healthy')
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);

    const commercialScore = active.length === 0
      ? 55
      : Math.round((commercial.averageCompatibility + commercial.conversionPotential) / 2);
    const executionScore = Math.max(0, execution.completionRate - execution.overdue * 8 - execution.stale * 3);
    const healthScore = Math.max(0, Math.min(100, Math.round(commercialScore * 0.55 + executionScore * 0.45)));
    const severity = severityFor(healthScore, execution.overdue);
    const headline = severity === 'critical'
      ? 'A operação exige intervenção imediata.'
      : severity === 'attention'
        ? 'A operação está avançando, mas há riscos que precisam de acompanhamento.'
        : 'A operação está saudável e com execução controlada.';

    const opportunitySpotlight = active
      .sort((left, right) => {
        const leftAction = ExecutiveActionFactory.fromOpportunity(left);
        const rightAction = ExecutiveActionFactory.fromOpportunity(right);
        return rightAction.score - leftAction.score;
      })
      .slice(0, 5);

    return {
      generatedAt: new Date().toISOString(),
      healthScore,
      severity,
      headline,
      activePipelineValue: commercial.pipelineValue,
      qualifiedPipelineValue: commercial.qualifiedPipelineValue,
      commercialCompatibility: commercial.averageCompatibility,
      executionRate: execution.completionRate,
      urgentOpportunities: commercial.urgentOpportunities,
      overdueTasks: execution.overdue,
      staleItems: commercial.staleOpportunities + execution.stale,
      actionQueue,
      opportunitySpotlight,
      taskSpotlight: execution.nextDueTasks,
    };
  }
}
