import type { Task } from '../../types';

export type TaskRiskLevel = 'healthy' | 'attention' | 'overdue';

export interface TaskExecutionSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  stale: number;
  completionRate: number;
  riskLevel: TaskRiskLevel;
  nextDueTasks: Task[];
}

export class TaskExecutionIntelligenceService {
  static buildSummary(tasks: Task[], now = new Date()): TaskExecutionSummary {
    const nowMs = now.getTime();
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const pending = tasks.filter((task) => task.status === 'pending').length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.dueDate || task.status === 'completed') return false;
      const dueDate = new Date(task.dueDate).getTime();
      return Number.isFinite(dueDate) && dueDate < nowMs;
    });
    const stale = tasks.filter((task) => {
      if (task.status === 'completed') return false;
      const updatedAt = new Date(task.updatedAt).getTime();
      const threshold = task.status === 'in_progress' ? 7 : 5;
      return Number.isFinite(updatedAt) && nowMs - updatedAt >= threshold * 86_400_000;
    }).length;
    const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    const riskLevel: TaskRiskLevel = overdueTasks.length > 0
      ? 'overdue'
      : stale > 0 || completionRate < 35
        ? 'attention'
        : 'healthy';
    const nextDueTasks = tasks
      .filter((task) => task.status !== 'completed' && task.dueDate)
      .sort((left, right) => new Date(left.dueDate as string).getTime() - new Date(right.dueDate as string).getTime())
      .slice(0, 5);

    return {
      total: tasks.length,
      pending,
      inProgress,
      completed,
      overdue: overdueTasks.length,
      stale,
      completionRate,
      riskLevel,
      nextDueTasks,
    };
  }
}
