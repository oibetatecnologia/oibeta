import type { CommercialOpportunity } from '../commercial/OpportunityTypes';
import type { Task } from '../../types';
import type { ExecutiveActionItem, ExecutiveSeverity } from './ExecutiveCommandTypes';

const DAY_MS = 86_400_000;

const priorityWeight = (priority: CommercialOpportunity['priority']): number => ({
  critical: 25,
  high: 18,
  medium: 10,
  low: 4,
})[priority];

const severityFromScore = (score: number): ExecutiveSeverity =>
  score >= 80 ? 'critical' : score >= 50 ? 'attention' : 'healthy';

export class ExecutiveActionFactory {
  static fromOpportunity(opportunity: CommercialOpportunity, now = Date.now()): ExecutiveActionItem {
    const compatibility = opportunity.analysis?.bestMatches?.[0]?.score ?? 0;
    const deadline = opportunity.submissionDeadline ? new Date(opportunity.submissionDeadline).getTime() : Number.NaN;
    const daysToDeadline = Number.isFinite(deadline) ? Math.ceil((deadline - now) / DAY_MS) : null;
    const urgencyScore = daysToDeadline === null ? 0 : daysToDeadline < 0 ? 35 : daysToDeadline <= 3 ? 30 : daysToDeadline <= 7 ? 20 : 5;
    const qualificationScore = opportunity.qualificationStatus === 'qualified' ? 0 : 15;
    const score = Math.min(100, priorityWeight(opportunity.priority) + urgencyScore + qualificationScore + Math.round(compatibility * 0.3));
    const product = opportunity.analysis?.bestMatches?.[0]?.serviceName;
    const deadlineText = daysToDeadline === null
      ? 'sem prazo informado'
      : daysToDeadline < 0
        ? `prazo vencido há ${Math.abs(daysToDeadline)} dia(s)`
        : `prazo em ${daysToDeadline} dia(s)`;

    return {
      id: `opportunity-${opportunity.id}`,
      kind: 'commercial',
      severity: severityFromScore(score),
      title: opportunity.title,
      description: `${product ? `${product} · ` : ''}${compatibility}% de compatibilidade · ${deadlineText}.`,
      targetTab: 'commercial_radar',
      taskTitle: `[Comercial] Avançar oportunidade: ${opportunity.title}`,
      score,
    };
  }

  static fromTask(task: Task, now = Date.now()): ExecutiveActionItem {
    const dueDate = task.dueDate ? new Date(task.dueDate).getTime() : Number.NaN;
    const overdueDays = Number.isFinite(dueDate) && dueDate < now ? Math.ceil((now - dueDate) / DAY_MS) : 0;
    const updatedAt = new Date(task.updatedAt).getTime();
    const staleDays = Number.isFinite(updatedAt) ? Math.floor((now - updatedAt) / DAY_MS) : 0;
    const priorityScore = task.priority === 'crítica' ? 35 : task.priority === 'alta' ? 25 : task.priority === 'média' ? 12 : 5;
    const score = Math.min(100, priorityScore + Math.min(40, overdueDays * 8) + (staleDays >= 7 ? 25 : staleDays >= 5 ? 15 : 0));
    const reason = overdueDays > 0
      ? `vencida há ${overdueDays} dia(s)`
      : staleDays >= 5
        ? `sem atualização há ${staleDays} dia(s)`
        : 'requer acompanhamento';

    return {
      id: `task-${task.id}`,
      kind: 'task',
      severity: severityFromScore(score),
      title: task.title,
      description: `Tarefa ${reason}. Status: ${task.status === 'in_progress' ? 'em execução' : 'pendente'}.`,
      targetTab: 'tasks',
      taskTitle: `[Recuperação] ${task.title}`,
      score,
    };
  }
}
