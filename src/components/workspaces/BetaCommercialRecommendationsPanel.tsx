import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  ListChecks,
  ListTodo,
  LockKeyhole,
  Radar,
  Sparkles,
  Target,
  TimerReset,
  Wrench,
} from 'lucide-react';
import type {
  CommercialOpportunityRecommendation,
  CommercialPursuitPlanStep,
  CommercialRecommendationSummary,
} from '../../core/commercial/CommercialOpportunityRecommendationService';
import type { Task } from '../../types';

interface BetaCommercialRecommendationsPanelProps {
  summary: CommercialRecommendationSummary;
  creatingTaskId: string | null;
  creatingPlanId: string | null;
  onOpenRadar: () => void;
  onCreateTask: (recommendationId: string, taskTitle: string) => Promise<void>;
  onCreatePlan: (recommendationId: string, taskTitles: string[]) => Promise<void>;
  existingTasks: Task[];
}

type OperationalFilter = 'all' | 'attention' | 'delayed';
type PlanExecutionRisk = 'normal' | 'attention' | 'delayed';

type PlanStepExecution = CommercialPursuitPlanStep & {
  linkedTask?: Task;
  taskCreated: boolean;
  taskCompleted: boolean;
  taskInProgress: boolean;
  taskOverdue: boolean;
  taskStalled: boolean;
};

interface RecommendationExecutionView {
  item: CommercialOpportunityRecommendation;
  planSteps: PlanStepExecution[];
  planTasks: string[];
  executionProgress: number;
  overdueTasksCount: number;
  stalledTasksCount: number;
  risk: PlanExecutionRisk;
  riskLabel: string;
  recoveryTaskTitle: string;
  recoveryTaskCreated: boolean;
}

const URGENCY_CLASSES = {
  imediata: 'border-red-500/25 bg-red-500/10 text-red-300',
  alta: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  normal: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
};

const PLAN_STATUS_CLASSES: Record<CommercialPursuitPlanStep['status'], string> = {
  pronto: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  pendente: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  bloqueado: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
};

const RISK_CLASSES: Record<PlanExecutionRisk, string> = {
  normal: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  attention: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  delayed: 'border-red-500/25 bg-red-500/10 text-red-300',
};

const DAY_IN_MS = 86_400_000;
const STALLED_PENDING_DAYS = 5;
const STALLED_IN_PROGRESS_DAYS = 7;

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase('pt-BR');
}

function getTaskReferenceDate(task: Task): number {
  const timestamp = new Date(task.updatedAt || task.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed' || !task.dueDate) return false;
  const dueDate = new Date(task.dueDate).getTime();
  return Number.isFinite(dueDate) && dueDate < Date.now();
}

function isTaskStalled(task: Task): boolean {
  if (task.status === 'completed') return false;
  const daysWithoutUpdate = Math.floor((Date.now() - getTaskReferenceDate(task)) / DAY_IN_MS);
  return task.status === 'in_progress'
    ? daysWithoutUpdate >= STALLED_IN_PROGRESS_DAYS
    : daysWithoutUpdate >= STALLED_PENDING_DAYS;
}

export default function BetaCommercialRecommendationsPanel({
  summary,
  creatingTaskId,
  creatingPlanId,
  onOpenRadar,
  onCreateTask,
  onCreatePlan,
  existingTasks,
}: BetaCommercialRecommendationsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [operationalFilter, setOperationalFilter] = useState<OperationalFilter>('all');

  const recommendationViews = useMemo<RecommendationExecutionView[]>(() => {
    const taskByNormalizedTitle = new Map(
      existingTasks.map((task) => [normalizeTitle(task.title), task]),
    );

    return summary.recommendations.map((item) => {
      const planSteps = item.pursuitPlan.steps.map<PlanStepExecution>((step) => {
        const linkedTask = taskByNormalizedTitle.get(normalizeTitle(step.taskTitle));
        return {
          ...step,
          linkedTask,
          taskCreated: Boolean(linkedTask),
          taskCompleted: linkedTask?.status === 'completed',
          taskInProgress: linkedTask?.status === 'in_progress',
          taskOverdue: linkedTask ? isTaskOverdue(linkedTask) : false,
          taskStalled: linkedTask ? isTaskStalled(linkedTask) : false,
        };
      });

      const planTasks = planSteps
        .filter((step) => step.status !== 'pronto' && !step.taskCreated)
        .map((step) => step.taskTitle);
      const completedStepsCount = planSteps.filter((step) => step.status === 'pronto' || step.taskCompleted).length;
      const inProgressStepsCount = planSteps.filter((step) => step.taskInProgress).length;
      const createdPendingStepsCount = planSteps.filter((step) => step.taskCreated && !step.taskCompleted && !step.taskInProgress).length;
      const executionProgress = Math.round(
        ((completedStepsCount + inProgressStepsCount * 0.6 + createdPendingStepsCount * 0.25) / planSteps.length) * 100,
      );
      const overdueTasksCount = planSteps.filter((step) => step.taskOverdue).length;
      const stalledTasksCount = planSteps.filter((step) => step.taskStalled && !step.taskOverdue).length;
      const risk: PlanExecutionRisk = overdueTasksCount > 0
        ? 'delayed'
        : stalledTasksCount > 0 || (item.urgency === 'imediata' && executionProgress < 75)
          ? 'attention'
          : 'normal';
      const riskLabel = risk === 'delayed'
        ? `${overdueTasksCount} tarefa(s) atrasada(s)`
        : risk === 'attention'
          ? stalledTasksCount > 0
            ? `${stalledTasksCount} tarefa(s) sem avanço`
            : 'Prazo crítico com execução baixa'
          : 'Execução dentro do esperado';
      const recoveryTaskTitle = `[Beta][Recuperação comercial] ${item.opportunity.title} — ${riskLabel}`;
      const recoveryTaskCreated = taskByNormalizedTitle.has(normalizeTitle(recoveryTaskTitle));

      return {
        item,
        planSteps,
        planTasks,
        executionProgress,
        overdueTasksCount,
        stalledTasksCount,
        risk,
        riskLabel,
        recoveryTaskTitle,
        recoveryTaskCreated,
      };
    });
  }, [existingTasks, summary.recommendations]);

  const delayedPlansCount = recommendationViews.filter((view) => view.risk === 'delayed').length;
  const attentionPlansCount = recommendationViews.filter((view) => view.risk === 'attention').length;
  const totalOverdueTasks = recommendationViews.reduce((total, view) => total + view.overdueTasksCount, 0);
  const visibleRecommendations = recommendationViews.filter((view) => {
    if (operationalFilter === 'delayed') return view.risk === 'delayed';
    if (operationalFilter === 'attention') return view.risk !== 'normal';
    return true;
  });

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-indigo-300 font-black">
            Inteligência comercial
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-300" />
            Top 5 oportunidades recomendadas pela Beta
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
            A Beta acompanha o plano comercial, identifica tarefas atrasadas ou paradas e destaca onde a operação precisa reagir.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenRadar}
          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-black text-indigo-200 hover:bg-indigo-500/20 transition flex items-center gap-2 self-start"
        >
          <Radar className="w-4 h-4" />
          Abrir Radar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard label="Analisadas" value={summary.totalAnalyzed} helper="Oportunidades disponíveis" />
        <SummaryCard label="Prontas para avançar" value={summary.readyToAdvanceCount} helper="Plano com prontidão ≥ 75%" />
        <SummaryCard label="Planos em atenção" value={attentionPlansCount + delayedPlansCount} helper={`${delayedPlansCount} com atraso real`} />
        <SummaryCard label="Tarefas atrasadas" value={totalOverdueTasks} helper="Pendências com vencimento ultrapassado" />
      </div>

      {recommendationViews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] uppercase font-mono tracking-[0.14em] text-[var(--text-secondary)] font-black mr-1">
            Visão operacional
          </span>
          <FilterButton active={operationalFilter === 'all'} onClick={() => setOperationalFilter('all')}>
            Todas ({recommendationViews.length})
          </FilterButton>
          <FilterButton active={operationalFilter === 'attention'} onClick={() => setOperationalFilter('attention')}>
            Exigem atenção ({attentionPlansCount + delayedPlansCount})
          </FilterButton>
          <FilterButton active={operationalFilter === 'delayed'} onClick={() => setOperationalFilter('delayed')}>
            Atrasadas ({delayedPlansCount})
          </FilterButton>
        </div>
      )}

      {summary.recommendations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/35 p-6 text-center">
          <Target className="w-8 h-8 text-[var(--text-secondary)] mx-auto" />
          <h3 className="text-sm font-black text-[var(--text-main)] mt-3">Nenhuma recomendação disponível</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Importe oportunidades e execute a análise de compatibilidade para a Beta montar o ranking comercial.
          </p>
        </div>
      ) : visibleRecommendations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/35 p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto" />
          <h3 className="text-sm font-black text-[var(--text-main)] mt-3">Nenhum plano neste filtro</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Não há atrasos ou sinais operacionais correspondentes à visão selecionada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRecommendations.map((view) => {
            const { item, planSteps, planTasks, executionProgress, overdueTasksCount, stalledTasksCount, risk, riskLabel, recoveryTaskTitle, recoveryTaskCreated } = view;
            const isExpanded = expandedId === item.opportunity.id;
            const isCreatingPlan = creatingPlanId === item.opportunity.id;

            return (
              <article key={item.opportunity.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 font-black">
                      {item.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-[var(--text-main)]">{item.opportunity.title}</h3>
                        <span className={`text-[9px] uppercase font-mono font-black px-2 py-1 rounded-full border ${URGENCY_CLASSES[item.urgency]}`}>
                          {item.urgency}
                        </span>
                        <span className={`text-[9px] uppercase font-mono font-black px-2 py-1 rounded-full border ${RISK_CLASSES[risk]}`}>
                          {risk === 'delayed' ? 'atrasado' : risk === 'attention' ? 'atenção' : 'em dia'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {item.opportunity.buyerName} • {item.productName}
                      </p>

                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
                        <MiniMetric label="Score Beta" value={`${item.recommendationScore}%`} />
                        <MiniMetric label="Compatibilidade" value={`${item.compatibilityScore}%`} />
                        <MiniMetric label="Prontidão" value={`${item.pursuitPlan.readinessScore}%`} />
                        <MiniMetric label="Prazo" value={item.deadlineLabel} />
                        <MiniMetric label="Execução do plano" value={`${executionProgress}%`} />
                      </div>

                      {risk !== 'normal' && (
                        <div className={`mt-3 rounded-xl border p-3 ${RISK_CLASSES[risk]}`}>
                          <div className="flex items-center gap-2">
                            {risk === 'delayed' ? <CalendarClock className="w-4 h-4" /> : <TimerReset className="w-4 h-4" />}
                            <span className="text-[9px] uppercase font-mono tracking-[0.14em] font-black">Risco de execução</span>
                          </div>
                          <p className="text-xs font-bold mt-1.5">{riskLabel}</p>
                        </div>
                      )}

                      {risk !== 'normal' && (
                        <div className="mt-2 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                          <span className="text-[9px] uppercase font-mono tracking-[0.14em] text-amber-300 font-black">Resposta sugerida pela Beta</span>
                          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                            {risk === 'delayed'
                              ? 'Reprogramar imediatamente as tarefas vencidas, confirmar o responsável e proteger o prazo final da oportunidade.'
                              : stalledTasksCount > 0
                                ? 'Cobrar atualização das tarefas paradas, remover impedimentos e registrar o próximo avanço verificável.'
                                : 'Antecipar a execução das etapas pendentes para evitar que o prazo crítico se transforme em atraso real.'}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.reasons.map((reason) => (
                          <span key={reason} className="text-[10px] rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-[var(--text-secondary)]">
                            {reason}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3">
                        <span className="text-[9px] uppercase font-mono tracking-[0.16em] text-indigo-300 font-black">Próxima ação</span>
                        <p className="text-xs text-[var(--text-main)] font-bold mt-2 leading-relaxed">{item.nextAction}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap xl:flex-col gap-2 xl:min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.opportunity.id)}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-black text-[var(--text-main)] hover:border-indigo-500/30 transition flex items-center justify-center gap-2"
                    >
                      <ListChecks className="w-4 h-4" />
                      {isExpanded ? 'Ocultar plano' : 'Ver plano'}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => void onCreatePlan(item.opportunity.id, planTasks)}
                      disabled={isCreatingPlan || planTasks.length === 0}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ListChecks className="w-4 h-4" />
                      {isCreatingPlan ? 'Criando plano...' : planTasks.length > 0 ? `Criar pendências (${planTasks.length})` : 'Plano já encaminhado'}
                    </button>

                    {risk !== 'normal' && (
                      <button
                        type="button"
                        onClick={() => void onCreateTask(`recovery-${item.opportunity.id}`, recoveryTaskTitle)}
                        disabled={creatingTaskId === `recovery-${item.opportunity.id}` || recoveryTaskCreated}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Wrench className="w-4 h-4" />
                        {creatingTaskId === `recovery-${item.opportunity.id}`
                          ? 'Criando recuperação...'
                          : recoveryTaskCreated
                            ? 'Recuperação encaminhada'
                            : 'Criar recuperação'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void onCreateTask(item.opportunity.id, item.taskTitle)}
                      disabled={creatingTaskId === item.opportunity.id}
                      className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-200 hover:bg-indigo-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ListTodo className="w-4 h-4" />
                      {creatingTaskId === item.opportunity.id ? 'Criando...' : 'Criar tarefa única'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <span className="text-[9px] uppercase font-mono tracking-[0.16em] text-[var(--text-secondary)] font-black">Plano de perseguição</span>
                        <h4 className="text-sm font-black text-[var(--text-main)] mt-1">{item.pursuitPlan.readinessLabel}</h4>
                        {(overdueTasksCount > 0 || stalledTasksCount > 0) && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {overdueTasksCount > 0 ? `${overdueTasksCount} atrasada(s)` : ''}
                            {overdueTasksCount > 0 && stalledTasksCount > 0 ? ' • ' : ''}
                            {stalledTasksCount > 0 ? `${stalledTasksCount} sem avanço recente` : ''}
                          </p>
                        )}
                      </div>
                      <div className="w-full lg:w-64">
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mb-1.5">
                          <span>Prontidão comercial</span>
                          <strong className="text-[var(--text-main)]">{item.pursuitPlan.readinessScore}%</strong>
                        </div>
                        <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                          <div className="h-full bg-indigo-400" style={{ width: `${item.pursuitPlan.readinessScore}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-3 mb-1.5">
                          <span>Execução real</span>
                          <strong className="text-[var(--text-main)]">{executionProgress}%</strong>
                        </div>
                        <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                          <div className="h-full bg-emerald-400" style={{ width: `${executionProgress}%` }} />
                        </div>
                      </div>
                    </div>

                    {item.pursuitPlan.blockers.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="flex items-center gap-2 text-amber-300">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-mono font-black">Bloqueios e condicionantes</span>
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {item.pursuitPlan.blockers.map((blocker) => (
                            <li key={blocker} className="text-xs text-[var(--text-secondary)]">• {blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {planSteps.map((step, index) => (
                        <div key={step.id} className={`rounded-xl border bg-[var(--bg-card)] p-3 ${step.taskOverdue ? 'border-red-500/35' : step.taskStalled ? 'border-amber-500/35' : 'border-[var(--border-color)]'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${PLAN_STATUS_CLASSES[step.status]}`}>
                              {step.status === 'pronto' ? <CheckCircle2 className="w-4 h-4" /> : step.status === 'bloqueado' ? <LockKeyhole className="w-4 h-4" /> : <CircleDashed className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[9px] uppercase font-mono text-[var(--text-secondary)] font-black">Etapa {index + 1}</span>
                                <span className={`text-[8px] uppercase font-mono font-black px-2 py-0.5 rounded-full border ${PLAN_STATUS_CLASSES[step.status]}`}>
                                  {step.status}
                                </span>
                                {step.taskOverdue ? (
                                  <span className="text-[8px] uppercase font-mono font-black px-2 py-0.5 rounded-full border border-red-500/25 bg-red-500/10 text-red-300">
                                    tarefa atrasada
                                  </span>
                                ) : step.taskStalled ? (
                                  <span className="text-[8px] uppercase font-mono font-black px-2 py-0.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300">
                                    sem avanço recente
                                  </span>
                                ) : step.taskCompleted ? (
                                  <span className="text-[8px] uppercase font-mono font-black px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                                    tarefa concluída
                                  </span>
                                ) : step.taskInProgress ? (
                                  <span className="text-[8px] uppercase font-mono font-black px-2 py-0.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300">
                                    em execução
                                  </span>
                                ) : step.taskCreated ? (
                                  <span className="text-[8px] uppercase font-mono font-black px-2 py-0.5 rounded-full border border-sky-500/25 bg-sky-500/10 text-sky-300">
                                    tarefa pendente
                                  </span>
                                ) : null}
                              </div>
                              <h5 className="text-xs font-black text-[var(--text-main)] mt-1">{step.title}</h5>
                              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{step.description}</p>
                              {step.linkedTask?.dueDate && (
                                <p className="text-[10px] text-[var(--text-secondary)] mt-2 flex items-center gap-1.5">
                                  <CalendarClock className="w-3 h-3" />
                                  Vencimento: {new Date(step.linkedTask.dueDate).toLocaleDateString('pt-BR')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[10px] font-black transition ${active ? 'border-indigo-500/35 bg-indigo-500/15 text-indigo-200' : 'border-[var(--border-color)] bg-[var(--bg-main)]/35 text-[var(--text-secondary)] hover:border-indigo-500/25'}`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <span className="text-[9px] uppercase font-mono tracking-[0.18em] text-[var(--text-secondary)] font-black">{label}</span>
      <strong className="text-2xl font-black text-[var(--text-main)] block mt-1">{value}</strong>
      <span className="text-xs text-[var(--text-secondary)]">{helper}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2">
      <span className="text-[8px] uppercase font-mono tracking-[0.12em] text-[var(--text-secondary)] font-black block">{label}</span>
      <strong className="text-xs text-[var(--text-main)] block mt-1">{value}</strong>
    </div>
  );
}
