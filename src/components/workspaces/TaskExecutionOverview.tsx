import { AlertTriangle, CheckCircle2, Clock3, ListTodo } from 'lucide-react';
import type { TaskExecutionSummary } from '../../core/tasks/TaskExecutionIntelligenceService';
import ProgressBar from '../shared/ProgressBar';
import RiskBadge from '../shared/RiskBadge';

export default function TaskExecutionOverview({ summary }: { summary: TaskExecutionSummary }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-800">Execução operacional</h3><p className="text-xs text-slate-400">Visão automática do andamento, atrasos e próximos vencimentos.</p></div><RiskBadge level={summary.riskLevel}/></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><ListTodo className="w-4 h-4 text-blue-600"/><strong className="block text-lg text-slate-800 mt-2">{summary.pending}</strong><span className="text-[10px] text-slate-500">Pendentes</span></div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><Clock3 className="w-4 h-4 text-amber-600"/><strong className="block text-lg text-slate-800 mt-2">{summary.inProgress}</strong><span className="text-[10px] text-slate-500">Em execução</span></div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><CheckCircle2 className="w-4 h-4 text-emerald-600"/><strong className="block text-lg text-slate-800 mt-2">{summary.completed}</strong><span className="text-[10px] text-slate-500">Concluídas</span></div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><AlertTriangle className="w-4 h-4 text-rose-600"/><strong className="block text-lg text-slate-800 mt-2">{summary.overdue}</strong><span className="text-[10px] text-slate-500">Atrasadas</span></div>
      </div>
      <ProgressBar value={summary.completionRate} label="Progresso do plano" helper={`${summary.completionRate}% concluído`} />
      {summary.nextDueTasks.length > 0 && <div><h4 className="text-[10px] uppercase font-black text-slate-500">Próximos vencimentos</h4><div className="mt-2 grid gap-2">{summary.nextDueTasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"><span className="text-xs font-semibold text-slate-700 truncate">{task.title}</span><span className="text-[9px] font-mono text-slate-500 shrink-0">{new Date(task.dueDate as string).toLocaleDateString('pt-BR')}</span></div>)}</div></div>}
    </section>
  );
}
