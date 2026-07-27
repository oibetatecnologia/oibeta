import type { TaskRiskLevel } from '../../core/tasks/TaskExecutionIntelligenceService';

const labels: Record<TaskRiskLevel, string> = {
  healthy: 'Em dia',
  attention: 'Atenção',
  overdue: 'Atrasado',
};

const classes: Record<TaskRiskLevel, string> = {
  healthy: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  attention: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  overdue: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
};

export default function RiskBadge({ level }: { level: TaskRiskLevel }) {
  return <span className={`text-[9px] uppercase font-black rounded-full border px-2 py-1 ${classes[level]}`}>{labels[level]}</span>;
}
