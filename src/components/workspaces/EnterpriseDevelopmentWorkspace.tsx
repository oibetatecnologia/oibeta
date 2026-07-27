import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  GitBranch,
  Layers3,
  ListChecks,
  Plus,
  Rocket,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import useClientsWorkspace from '../../hooks/useClientsWorkspace';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useRuntimeConfiguration from '../../hooks/useRuntimeConfiguration';
import usePersistenceHealth from '../../hooks/usePersistenceHealth';
import useObservabilitySummary from '../../hooks/useObservabilitySummary';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useSessionHealth from '../../hooks/useSessionHealth';
import { IntegrationReadinessService } from '../../core/integrations/IntegrationReadinessService';
import { BetaOperationalIntelligenceService } from '../../core/betaBrain/BetaOperationalIntelligenceService';
import type { Task } from '../../types';
import useReleaseGovernance from '../../hooks/useReleaseGovernance';
import ReleaseGovernanceCommandCenter from '../releases/ReleaseGovernanceCommandCenter';
import CutoverCommandCenter from '../cutover/CutoverCommandCenter';
import { CutoverReadinessService } from '../../core/cutover/CutoverReadinessService';
import useSaasSecurityReadiness from '../../hooks/useSaasSecurityReadiness';
import SaasSecurityCommandCenter from '../security/SaasSecurityCommandCenter';
import useProductionOperations from '../../hooks/useProductionOperations';
import ProductionOperationsCommandCenter from '../productionOperations/ProductionOperationsCommandCenter';

type DevelopmentLaneStatus = 'done' | 'running' | 'next' | 'blocked';

interface DevelopmentLane {
  id: string;
  title: string;
  status: DevelopmentLaneStatus;
  description: string;
  deliverable: string;
}

interface EngineeringAction {
  id: string;
  title: string;
  description: string;
  priority: 'alta' | 'média';
  taskTitle: string;
}

const LANE_STATUS_LABELS: Record<DevelopmentLaneStatus, string> = {
  done: 'Concluído',
  running: 'Em execução',
  next: 'Próximo',
  blocked: 'Bloqueado',
};

const LANE_STATUS_CLASSES: Record<DevelopmentLaneStatus, string> = {
  done: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  running: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  next: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  blocked: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const DEVELOPMENT_LANES: DevelopmentLane[] = [
  {
    id: 'platform-foundation',
    title: 'Fundação da plataforma',
    status: 'done',
    description: 'Workspace Framework, Beta Core, navegação modular e painel empresarial.',
    deliverable: 'Base operacional estabilizada.',
  },
  {
    id: 'commercial-operation',
    title: 'Operação comercial',
    status: 'running',
    description: 'Radar Comercial, CRM, Clientes, Implantações, Financeiro e Suporte.',
    deliverable: 'Oi Beta operando dentro da própria plataforma.',
  },
  {
    id: 'persistence',
    title: 'Persistência oficial',
    status: 'running',
    description: 'Substituição incremental de armazenamento local por API/backend/Supabase.',
    deliverable: 'Dados confiáveis, persistentes e preparados para multiempresa.',
  },
  {
    id: 'integrations',
    title: 'Integrações',
    status: 'next',
    description: 'PNCP, Compras.gov, portais públicos e provedores de IA.',
    deliverable: 'Radar Comercial alimentado por fontes reais.',
  },
  {
    id: 'operational-ai',
    title: 'Beta operacional',
    status: 'next',
    description: 'Beta consultando contexto real, sugerindo ações e apoiando decisões.',
    deliverable: 'Assistente operacional realmente conectada ao estado da empresa.',
  },
  {
    id: 'products',
    title: 'Produtos oficiais',
    status: 'next',
    description: 'Configuração produto por produto sobre a plataforma empresarial consolidada.',
    deliverable: 'Produtos vendáveis usando a mesma infraestrutura.',
  },
];

const ENGINEERING_CHECKLIST = [
  'Lint aprovado',
  'Build aprovado',
  'Arquivo completo entregue',
  'Sem patch ZIP',
  'Sem dados fictícios como fonte da verdade',
  'Compatível com a arquitetura existente',
];

export default function EnterpriseDevelopmentWorkspace() {
  const workspace = useWorkspace();
  const { clientExecutiveSummary, productCommercializationSummary } = useClientsWorkspace();
  const productionReadiness = useProductionReadiness();
  const runtimeConfiguration = useRuntimeConfiguration();
  const persistenceHealth = usePersistenceHealth();
  const observabilitySummary = useObservabilitySummary();
  const accessControl = useAccessControlHealth();
  const sessionHealth = useSessionHealth();
  const saasSecurity = useSaasSecurityReadiness();
  const productionOperations = useProductionOperations();
  const integrationReadinessSummary = IntegrationReadinessService.buildSummary();
  const [engineeringTaskTitle, setEngineeringTaskTitle] = useState('Registrar próximo lote da plataforma empresarial');

  const {
    projects,
    activeProjectsCount,
    currentProject,
  } = workspace.projects;

  const {
    tasks,
    pendingTasksCount,
    createTask,
  } = workspace.tasks;

  const [creatingActionTaskId, setCreatingActionTaskId] = useState<string | null>(null);

  const {
    decisions,
    totalDecisions,
  } = workspace.decisions;

  const {
    totalMemories,
  } = workspace.memories;

  const {
    activeModules,
    activeFeatures,
    isApiError,
    isModulesLoading,
  } = workspace.modules;

  const betaIntelligenceSummary = useMemo(
    () =>
      BetaOperationalIntelligenceService.buildSummary({
        clientExecutiveSummary,
        integrationReadinessSummary,
        activeModulesCount: activeModules.length,
        activeFeaturesCount: activeFeatures.length,
        pendingTasksCount,
        totalMemories,
        totalDecisions,
        isApiError,
      }),
    [
      activeFeatures.length,
      activeModules.length,
      clientExecutiveSummary,
      integrationReadinessSummary,
      isApiError,
      pendingTasksCount,
      totalDecisions,
      totalMemories,
    ]
  );

  const cutoverReadiness = useMemo(() => CutoverReadinessService.buildSummary({
    persistence: persistenceHealth,
    session: sessionHealth,
    accessControl,
    production: productionReadiness,
  }), [accessControl, persistenceHealth, productionReadiness, sessionHealth]);

  const releaseGovernance = useReleaseGovernance(projects, tasks, decisions, {
    production: productionReadiness.score,
    persistence: persistenceHealth.score,
    observability: observabilitySummary.score,
    accessControl: accessControl.score,
    session: sessionHealth.score,
  });

  const developmentTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const text = `${task.title} ${task.description || ''}`.toLowerCase();
        return text.includes('sprint') || text.includes('build') || text.includes('lint') || text.includes('arquitetura') || text.includes('plataforma');
      }),
    [tasks]
  );

  const openDevelopmentTasks = developmentTasks.filter((task) => task.status !== 'completed');
  const completedDevelopmentTasks = developmentTasks.filter((task) => task.status === 'completed');

  const engineeringHealthScore = useMemo(() => {
    const base = 55;
    const projectScore = Math.min(projects.length * 4, 16);
    const decisionScore = Math.min(totalDecisions * 2, 12);
    const memoryScore = Math.min(totalMemories * 1.5, 9);
    const taskPenalty = Math.min(openDevelopmentTasks.length * 3, 18);
    const apiPenalty = isApiError ? 8 : 0;

    return Math.max(0, Math.min(100, Math.round(base + projectScore + decisionScore + memoryScore - taskPenalty - apiPenalty)));
  }, [projects.length, totalDecisions, totalMemories, openDevelopmentTasks.length, isApiError]);

  const nextEngineeringActions = useMemo<EngineeringAction[]>(() => {
    const actions: EngineeringAction[] = sessionHealth.issues
      .slice(0, 4)
      .map((issue): EngineeringAction => ({
        id: `session-health-${issue.id}`,
        title: `Sessão: ${issue.title}`,
        description: issue.description,
        priority: issue.priority === 'alta' ? 'alta' : 'média',
        taskTitle: `[Engenharia] ${issue.taskTitle}`,
      }));

    actions.push(
      ...accessControl.issues
      .slice(0, 4)
      .map((issue): EngineeringAction => ({
        id: `access-control-${issue.id}`,
        title: `Segurança: ${issue.title}`,
        description: issue.description,
        priority: issue.priority === 'alta' ? 'alta' : 'média',
        taskTitle: `[Engenharia] ${issue.taskTitle}`,
      }))
    );

    actions.push(
      ...persistenceHealth.issues
      .slice(0, 4)
      .map((issue): EngineeringAction => ({
        id: `persistence-health-${issue.id}`,
        title: `Persistência: ${issue.title}`,
        description: issue.description,
        priority: issue.priority === 'alta' ? 'alta' : 'média',
        taskTitle: `[Engenharia] ${issue.taskTitle}`,
      }))
    );

    actions.push(
      ...runtimeConfiguration.issues
      .slice(0, 4)
      .map((issue): EngineeringAction => ({
        id: `runtime-configuration-${issue.id}`,
        title: `Configuração: ${issue.title}`,
        description: issue.description,
        priority: issue.priority === 'alta' ? 'alta' : 'média',
        taskTitle: `[Engenharia] ${issue.taskTitle}`,
      }))
    );

    actions.push(
      ...observabilitySummary.issues
      .slice(0, 4)
      .map((issue): EngineeringAction => ({
        id: `observability-${issue.id}`,
        title: `Observabilidade: ${issue.title}`,
        description: issue.description,
        priority: issue.priority === 'alta' ? 'alta' : 'média',
        taskTitle: `[Engenharia] ${issue.taskTitle}`,
      }))
    );

    actions.push(
      ...productionReadiness.areas
      .filter((area) => area.status !== 'ready')
      .slice(0, 4)
      .map((area): EngineeringAction => ({
        id: `production-readiness-${area.id}`,
        title: `Produção: ${area.title}`,
        description: area.description,
        priority: area.priority === 'alta' ? 'alta' : 'média',
        taskTitle: `[Engenharia] ${area.taskTitle}`,
      }))
    );

    actions.push(
      ...productCommercializationSummary.items
      .filter((item) => item.commercialStatus !== 'vendavel')
      .slice(0, 3)
      .map((item): EngineeringAction => ({
        id: `product-commercialization-${item.service.id}`,
        title: `Produto: ${item.service.shortName}`,
        description: item.nextAction,
        priority: item.readinessScore < 55 ? 'alta' : 'média',
        taskTitle: `[Engenharia] ${item.taskTitle}`,
      }))
    );

    actions.push(
      ...betaIntelligenceSummary.priorities
      .slice(0, 3)
      .map((priority): EngineeringAction => ({
        id: `beta-intelligence-${priority.id}`,
        title: `Beta IA: ${priority.title}`,
        description: priority.description,
        priority: priority.priority === 'baixa' ? 'média' : priority.priority,
        taskTitle: `[Engenharia] Apoiar Beta IA: ${priority.taskTitle}`,
      }))
    );

    actions.push(
      {
        id: 'operational-workspaces',
        title: 'Consolidar áreas operacionais',
        description: 'Revisar os workspaces próprios e garantir que cada área gere ações, tarefas e sinais operacionais reais.',
        priority: 'alta',
        taskTitle: '[Engenharia] Consolidar áreas operacionais da plataforma empresarial',
      },
      {
        id: 'persistence',
        title: 'Reduzir persistência local',
        description: 'Continuar movendo dados operacionais para API/backend/Supabase sem quebrar o fluxo atual.',
        priority: 'alta',
        taskTitle: '[Engenharia] Reduzir persistência local e consolidar backend/Supabase',
      },
      {
        id: 'integrations',
        title: 'Preparar integrações reais',
        description: 'Criar camada isolada para PNCP, Compras.gov e demais fontes antes de conectar APIs diretamente ao Radar.',
        priority: 'média',
        taskTitle: '[Engenharia] Preparar camada isolada de integrações externas',
      },
    );

    if (clientExecutiveSummary.strategicPriorities.length > 0) {
      clientExecutiveSummary.strategicPriorities
        .slice(0, 3)
        .reverse()
        .forEach((priority) => {
          actions.unshift({
            id: `executive-${priority.id}`,
            title: `Apoiar: ${priority.title}`,
            description: priority.description,
            priority: priority.priority === 'baixa' ? 'média' : priority.priority,
            taskTitle: `[Engenharia] Apoiar prioridade executiva: ${priority.taskTitle}`,
          });
        });
    }

    if (isApiError) {
      actions.unshift({
        id: 'internal-api',
        title: 'Verificar disponibilidade das APIs internas',
        description: 'O estado de módulos indica erro de API. Priorizar estabilidade antes de novas integrações externas.',
        priority: 'alta',
        taskTitle: '[Engenharia] Verificar disponibilidade das APIs internas da plataforma',
      });
    }

    if (openDevelopmentTasks.length > 8) {
      actions.push({
        id: 'backlog-triage',
        title: 'Triar backlog técnico',
        description: 'Existe volume alto de tarefas técnicas abertas. Revisar prioridade antes de abrir novas frentes.',
        priority: 'média',
        taskTitle: '[Engenharia] Triar backlog técnico da plataforma',
      });
    }

    return actions.slice(0, 5);
  }, [sessionHealth.issues, accessControl.issues, betaIntelligenceSummary.priorities, clientExecutiveSummary.strategicPriorities, isApiError, openDevelopmentTasks.length, observabilitySummary.issues, productCommercializationSummary.items, persistenceHealth.issues, productionReadiness.areas, runtimeConfiguration.issues]);

  const handleCreateEngineeringTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!engineeringTaskTitle.trim()) return;

    await createTask(engineeringTaskTitle.trim());

    setEngineeringTaskTitle('Registrar próximo lote da plataforma empresarial');
  };

  const handleCreateActionTask = async (action: EngineeringAction) => {
    setCreatingActionTaskId(action.id);

    try {
      await createTask(action.taskTitle);
    } finally {
      setCreatingActionTaskId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ProductionOperationsCommandCenter
        summary={productionOperations.summary}
        isLoading={productionOperations.isLoading}
        error={productionOperations.error}
        tasks={tasks}
        onRefresh={productionOperations.refresh}
        onCreateTask={async (title) => { await createTask(title); }}
      />

      <SaasSecurityCommandCenter
        summary={saasSecurity}
        tasks={tasks}
        onCreateTask={async (title) => { await createTask(title); }}
        onRefresh={saasSecurity.refresh}
      />

      <CutoverCommandCenter
        summary={cutoverReadiness}
        tasks={tasks}
        onCreateTask={async (title) => { await createTask(title); }}
      />

      <ReleaseGovernanceCommandCenter
        summary={releaseGovernance}
        tasks={tasks}
        onCreateTask={async (title) => { await createTask(title); }}
      />

      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-indigo-300 font-black">
              Oi Beta / Engenharia
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Code2 className="w-7 h-7 text-indigo-300" />
              Desenvolvimento
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área para controlar a evolução da Beta Platform, acompanhar sprints, builds, decisões técnicas, pendências de engenharia e próximos lotes da plataforma empresarial.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-indigo-200 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Beta na engenharia
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Eu ajudo a manter o desenvolvimento orientado por build, pequenos lotes e preservação da arquitetura atual da plataforma.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <DevelopmentMetricCard icon={<Layers3 className="w-4 h-4" />} label="Projetos" value={projects.length} helper={`${activeProjectsCount} ativos`} />
        <DevelopmentMetricCard icon={<ListChecks className="w-4 h-4" />} label="Tarefas" value={tasks.length} helper={`${pendingTasksCount} pendentes`} />
        <DevelopmentMetricCard icon={<Code2 className="w-4 h-4" />} label="Engenharia" value={developmentTasks.length} helper={`${openDevelopmentTasks.length} abertas`} />
        <DevelopmentMetricCard icon={<ClipboardCheck className="w-4 h-4" />} label="Concluídas" value={completedDevelopmentTasks.length} helper="Tarefas técnicas" />
        <DevelopmentMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Decisões" value={decisions.length || totalDecisions} helper="Arquitetura registrada" />
        <DevelopmentMetricCard icon={<GitBranch className="w-4 h-4" />} label="Módulos" value={activeModules.length} helper={`${activeFeatures.length} features`} />
        <DevelopmentMetricCard icon={<Activity className="w-4 h-4" />} label="APIs" value={isModulesLoading ? '...' : isApiError ? 'Atenção' : 'OK'} helper="Módulos internos" />
        <DevelopmentMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Cutover" value={persistenceHealth.fallbackPolicy.enabled ? 'Fallback' : 'API'} helper={`${persistenceHealth.missingTables} tabelas pendentes`} />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Roadmap de engenharia
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Lotes e frentes da plataforma</h2>
            </div>

            <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              RC-1 Empresarial
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {DEVELOPMENT_LANES.map((lane) => (
              <DevelopmentLaneCard key={lane.id} lane={lane} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleCreateEngineeringTask} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Nova tarefa técnica
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Registrar próximo lote</h2>
            </div>

            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Tarefa</span>
              <input
                value={engineeringTaskTitle}
                onChange={(event) => setEngineeringTaskTitle(event.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-indigo-500"
                placeholder="Ex.: Implementar workspace de monitoramento"
              />
            </label>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-3">
              <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block">
                Contexto ativo
              </span>
              <p className="text-sm text-[var(--text-main)] font-bold mt-1">
                {currentProject?.name || 'Nenhum projeto operacional selecionado'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                A tarefa será criada usando o fluxo atual de tarefas da plataforma.
              </p>
            </div>

            <button
              type="submit"
              disabled={!engineeringTaskTitle.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Criar tarefa técnica
            </button>
          </form>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Checklist
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Regras do lote</h2>
            </div>

            <div className="space-y-2">
              {ENGINEERING_CHECKLIST.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="text-xs font-bold text-[var(--text-main)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
            Prioridades da Beta
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Próximas ações recomendadas</h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {nextEngineeringActions.map((action) => (
            <div key={action.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black text-[var(--text-main)]">{action.title}</h3>
                <span className={`text-[10px] uppercase font-mono font-black ${action.priority === 'alta' ? 'text-red-300' : 'text-amber-300'}`}>
                  {action.priority}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{action.description}</p>

              <button
                type="button"
                onClick={() => void handleCreateActionTask(action)}
                disabled={creatingActionTaskId === action.id}
                className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-black text-indigo-200 hover:bg-indigo-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingActionTaskId === action.id ? 'Criando tarefa...' : 'Criar tarefa técnica'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DevelopmentMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-secondary)] font-black block mt-4">
        {label}
      </span>
      <strong className="text-2xl font-black text-[var(--text-main)] block mt-1">{value}</strong>
      <span className="text-xs text-[var(--text-secondary)]">{helper}</span>
    </div>
  );
}

function DevelopmentLaneCard({ lane }: { lane: DevelopmentLane }) {
  const Icon = lane.status === 'done'
    ? CheckCircle2
    : lane.status === 'running'
      ? Timer
      : lane.status === 'blocked'
        ? AlertTriangle
        : Rocket;

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[var(--text-main)]">{lane.title}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{lane.description}</p>
          </div>
        </div>

        <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border whitespace-nowrap ${LANE_STATUS_CLASSES[lane.status]}`}>
          {LANE_STATUS_LABELS[lane.status]}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/55 p-3">
        <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block">
          Entregável
        </span>
        <p className="text-xs text-[var(--text-main)] font-bold mt-1">{lane.deliverable}</p>
      </div>
    </article>
  );
}
