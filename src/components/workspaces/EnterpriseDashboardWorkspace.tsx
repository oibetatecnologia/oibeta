import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  Cloud,
  Code2,
  FileText,
  Headphones,
  Layers,
  LayoutDashboard,
  MemoryStick,
  PackageCheck,
  Radar,
  Rocket,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import { PRODUCT_REGISTRY } from '../../products/productRegistry';
import useClientsWorkspace from '../../hooks/useClientsWorkspace';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useRuntimeConfiguration from '../../hooks/useRuntimeConfiguration';
import usePersistenceHealth from '../../hooks/usePersistenceHealth';
import useObservabilitySummary from '../../hooks/useObservabilitySummary';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useSessionHealth from '../../hooks/useSessionHealth';
import { IntegrationReadinessService } from '../../core/integrations/IntegrationReadinessService';
import { BetaOperationalIntelligenceService } from '../../core/betaBrain/BetaOperationalIntelligenceService';
import ReleaseCandidateCertificationPanel from '../production/ReleaseCandidateCertificationPanel';
import ExecutiveCommandCenter from '../executive/ExecutiveCommandCenter';
import useExecutiveCommandCenter from '../../hooks/useExecutiveCommandCenter';
import type { ExecutiveActionItem } from '../../core/executive/ExecutiveCommandTypes';
import useCustomerPortfolioIntelligence from '../../hooks/useCustomerPortfolioIntelligence';
import CustomerPortfolioExecutiveSnapshot from '../customerSuccess/CustomerPortfolioExecutiveSnapshot';
import useFinanceIntelligence from '../../hooks/useFinanceIntelligence';
import FinanceExecutiveSnapshot from '../finance/FinanceExecutiveSnapshot';
import useSupportIntelligence from '../../hooks/useSupportIntelligence';
import SupportExecutiveSnapshot from '../support/SupportExecutiveSnapshot';
import useProductPortfolioIntelligence from '../../hooks/useProductPortfolioIntelligence';
import ProductPortfolioExecutiveSnapshot from '../products/ProductPortfolioExecutiveSnapshot';
import useReleaseGovernance from '../../hooks/useReleaseGovernance';
import ReleaseGovernanceExecutiveSnapshot from '../releases/ReleaseGovernanceExecutiveSnapshot';
import useImplementationIntelligence from '../../hooks/useImplementationIntelligence';
import ImplementationExecutiveSnapshot from '../implementations/ImplementationExecutiveSnapshot';

interface EnterpriseActionCardProps {
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface EnterpriseMetricCardProps {
  label: string;
  value: React.ReactNode;
  helper: string;
  icon: React.ReactNode;
}

interface EnterpriseAreaCardProps {
  title: string;
  description: string;
  status: string;
  progress: number;
  icon: React.ReactNode;
  onClick: () => void;
}

export default function EnterpriseDashboardWorkspace() {
  const workspace = useWorkspace();
  const clientsWorkspace = useClientsWorkspace();
  const productionReadiness = useProductionReadiness();
  const runtimeConfiguration = useRuntimeConfiguration();
  const persistenceHealth = usePersistenceHealth();
  const observabilitySummary = useObservabilitySummary();
  const accessControl = useAccessControlHealth();
  const sessionHealth = useSessionHealth();

  const { setActiveTab } = workspace.navigation;
  const { projects, totalProjects, activeProjectsCount } = workspace.projects;
  const {
    tasks,
    pendingTasksCount,
    createTask,
  } = workspace.tasks;
  const [creatingPriorityTask, setCreatingPriorityTask] = useState<string | null>(null);
  const [creatingExecutiveActionId, setCreatingExecutiveActionId] = useState<string | null>(null);
  const { decisions, totalDecisions } = workspace.decisions;
  const { totalMemories } = workspace.memories;
  const { activeModules, activeFeatures, isApiError } = workspace.modules;
  const { user } = workspace.tenant;
  const integrationReadinessSummary = IntegrationReadinessService.buildSummary();

  const {
    clientsList,
    totalClients,
    activeClients,
    leads,
    proposals,
    contractsCount,
    implementationsCount,
    financialRecordsCount,
    overdueAmount,
    supportTicketsCount,
    openSupportTicketsCount,
    averageImplementationProgress,
    averageHealthScore,
    radarOpportunities,
    operationalBacklog,
    operationalFlowSummary,
    clientLifecycleSummary,
    clientRevenueSummary,
    clientSuccessSummary,
    clientServiceLevelSummary,
    clientExecutiveSummary,
    productCommercializationSummary,
  } = clientsWorkspace;

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

  const executiveCommandSummary = useExecutiveCommandCenter(radarOpportunities, tasks);
  const productPortfolioIntelligence = useProductPortfolioIntelligence(productCommercializationSummary, tasks);
  const customerPortfolioSummary = useCustomerPortfolioIntelligence(clientsList);
  const financeIntelligence = useFinanceIntelligence(clientsList);
  const supportIntelligence = useSupportIntelligence(clientsList);
  const implementationIntelligence = useImplementationIntelligence(clientsList, tasks);

  const releaseGovernance = useReleaseGovernance(projects, tasks, decisions, {
    production: productionReadiness.score,
    persistence: persistenceHealth.score,
    observability: observabilitySummary.score,
    accessControl: accessControl.score,
    session: sessionHealth.score,
  });

  const activeProducts = PRODUCT_REGISTRY.filter((product) => product.status === 'active');
  const embeddedProducts = PRODUCT_REGISTRY.filter((product) => product.status === 'embedded');

  const userName = user?.name || 'Douglas';

  const operationalReadiness = useMemo(() => {
    const scores = [
      radarOpportunities.length > 0 ? 80 : 55,
      totalClients > 0 ? 80 : 55,
      implementationsCount > 0 ? Math.max(50, averageImplementationProgress) : 45,
      financialRecordsCount > 0 ? 65 : 40,
      supportTicketsCount > 0 ? 65 : 42,
      totalMemories + totalDecisions > 0 ? 65 : 35,
      operationalFlowSummary.operationalFlowScore,
      clientLifecycleSummary.averageLifecycleScore,
      clientRevenueSummary.revenueHealthScore,
      clientSuccessSummary.successScore,
      clientExecutiveSummary.executiveScore,
      betaIntelligenceSummary.betaReadinessScore,
      betaIntelligenceSummary.automationScore,
      productCommercializationSummary.averageReadiness,
      productionReadiness.score,
      observabilitySummary.score,
      clientServiceLevelSummary.score,
      persistenceHealth.score,
      accessControl.score,
      sessionHealth.score,
      activeModules.length > 0 && !isApiError ? 75 : 45,
    ];

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [
    activeModules.length,
    averageImplementationProgress,
    financialRecordsCount,
    implementationsCount,
    isApiError,
    operationalBacklog.length,
    operationalFlowSummary.operationalFlowScore,
    clientLifecycleSummary.averageLifecycleScore,
    clientRevenueSummary.revenueHealthScore,
    clientSuccessSummary.successScore,
    clientExecutiveSummary.executiveScore,
    betaIntelligenceSummary.automationScore,
    betaIntelligenceSummary.betaReadinessScore,
    productCommercializationSummary.averageReadiness,
    productionReadiness.score,
    observabilitySummary.score,
    clientServiceLevelSummary.score,
    persistenceHealth.score,
    accessControl.score,
    sessionHealth.score,
    radarOpportunities.length,
    supportTicketsCount,
    totalClients,
    totalDecisions,
    totalMemories,
  ]);

  const technicalDiagnostics = useMemo(() => {
    const diagnostics: Array<{
      id: string;
      title: string;
      description: string;
      targetTab: string;
      taskTitle?: string;
      source: string;
    }> = [];

    const appendIssues = (
      source: string,
      prefix: string,
      issues: Array<{ id: string; title: string; description: string; targetTab: string; taskTitle?: string }>,
    ) => {
      issues.forEach((issue) => {
        diagnostics.push({
          id: `${prefix}-${issue.id}`,
          title: issue.title,
          description: issue.description,
          targetTab: issue.targetTab,
          taskTitle: issue.taskTitle,
          source,
        });
      });
    };

    appendIssues('Sessão', 'session-health', sessionHealth.issues);
    appendIssues('Acesso', 'access-control', accessControl.issues);
    appendIssues('Persistência', 'persistence-health', persistenceHealth.issues);
    appendIssues('Ambiente', 'runtime-configuration', runtimeConfiguration.issues);
    appendIssues('Observabilidade', 'observability', observabilitySummary.issues);

    productionReadiness.areas
      .filter((area) => area.status !== 'ready')
      .forEach((area) => {
        diagnostics.push({
          id: `production-${area.id}`,
          title: area.title,
          description: area.description,
          targetTab: area.targetTab,
          taskTitle: area.taskTitle,
          source: 'Produção',
        });
      });

    return diagnostics;
  }, [
    accessControl.issues,
    observabilitySummary.issues,
    persistenceHealth.issues,
    productionReadiness.areas,
    runtimeConfiguration.issues,
    sessionHealth.issues,
  ]);

  const areaScores = useMemo(() => ({
    radar: radarOpportunities.length > 0 ? Math.min(100, 35 + radarOpportunities.length * 5) : 0,
    crm: leads + proposals + contractsCount > 0
      ? Math.min(100, Math.round(((leads + proposals + contractsCount) / Math.max(1, leads + proposals + contractsCount + 5)) * 100))
      : 0,
    clients: totalClients > 0 ? Math.round(averageHealthScore) : 0,
    implementations: implementationsCount > 0 ? Math.round(averageImplementationProgress) : 0,
    finance: financialRecordsCount > 0 ? Math.round(financeIntelligence.collectionRate) : 0,
    support: supportTicketsCount > 0 ? Math.round(supportIntelligence.healthScore) : 100,
    products: Math.round(productPortfolioIntelligence.healthScore),
    environments: Math.round((productionReadiness.score + persistenceHealth.score + observabilitySummary.score) / 3),
  }), [
    averageHealthScore,
    averageImplementationProgress,
    contractsCount,
    financeIntelligence.collectionRate,
    financialRecordsCount,
    implementationsCount,
    leads,
    observabilitySummary.score,
    persistenceHealth.score,
    productPortfolioIntelligence.healthScore,
    productionReadiness.score,
    proposals,
    radarOpportunities.length,
    supportIntelligence.healthScore,
    supportTicketsCount,
    totalClients,
  ]);

  const betaPriorities = useMemo(() => {
    const priorities: Array<{ id: string; text: string; targetTab: string; taskTitle?: string }> = [];

    clientServiceLevelSummary.items.slice(0, 2).forEach((item) => {
      priorities.push({
        id: `service-level-${item.id}`,
        text: `${item.title}: ${item.description}`,
        targetTab: item.targetTab,
        taskTitle: item.taskTitle,
      });
    });

    if (productCommercializationSummary.firstProductToSell) {
      priorities.push({
        id: `product-${productCommercializationSummary.firstProductToSell.service.id}`,
        text: `${productCommercializationSummary.firstProductToSell.service.shortName}: ${productCommercializationSummary.firstProductToSell.nextAction}.`,
        targetTab: 'products',
        taskTitle: productCommercializationSummary.firstProductToSell.taskTitle,
      });
    }

    betaIntelligenceSummary.priorities.slice(0, 3).forEach((priority) => {
      priorities.push({
        id: `intelligence-${priority.id}`,
        text: priority.description,
        targetTab: priority.targetTab,
        taskTitle: priority.taskTitle,
      });
    });

    operationalBacklog.slice(0, 2).forEach((item) => {
      priorities.push({
        id: `backlog-${item.id}`,
        text: item.description,
        targetTab: item.targetTab,
        taskTitle: item.taskTitle,
      });
    });

    if (radarOpportunities.length === 0) {
      priorities.push({
        id: 'radar-feed',
        text: 'O Radar Comercial ainda não possui oportunidades ativas. A próxima ação operacional é executar ou revisar a sincronização de oportunidades.',
        targetTab: 'commercial_radar',
        taskTitle: '[Radar] Sincronizar e validar oportunidades comerciais',
      });
    }

    if (leads > 0 || proposals > 0) {
      priorities.push({
        id: 'crm-conversion',
        text: `O pipeline possui ${leads + proposals} registro(s) entre leads e propostas aguardando avanço comercial.`,
        targetTab: 'crm',
        taskTitle: '[CRM] Revisar conversões pendentes do pipeline',
      });
    }

    if (implementationsCount === 0 && contractsCount > 0) {
      priorities.push({
        id: 'implementation-start',
        text: `${contractsCount} contrato(s) registrado(s) ainda não geraram uma implantação acompanhada.`,
        targetTab: 'implementations',
        taskTitle: '[Implantações] Iniciar onboarding dos contratos ativos',
      });
    }

    if (overdueAmount > 0) {
      priorities.push({
        id: 'finance-overdue',
        text: `Existem R$ ${overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em valores vencidos que exigem acompanhamento.`,
        targetTab: 'finance',
        taskTitle: '[Financeiro] Tratar valores vencidos',
      });
    }

    if (openSupportTicketsCount > 0) {
      priorities.push({
        id: 'support-open',
        text: `${openSupportTicketsCount} chamado(s) de suporte permanecem em aberto.`,
        targetTab: 'support',
        taskTitle: '[Suporte] Priorizar chamados em aberto',
      });
    }

    if (priorities.length === 0) {
      priorities.push({
        id: 'operation-start',
        text: 'Ainda não existem dados operacionais suficientes para definir uma prioridade executiva. Inicie pelo Radar Comercial, CRM ou cadastro de clientes.',
        targetTab: 'commercial_radar',
      });
    }

    const unique = new Map(priorities.map((priority) => [priority.id, priority]));
    return Array.from(unique.values()).slice(0, 4);
  }, [
    betaIntelligenceSummary.priorities,
    clientServiceLevelSummary.items,
    contractsCount,
    implementationsCount,
    leads,
    openSupportTicketsCount,
    operationalBacklog,
    overdueAmount,
    productCommercializationSummary.firstProductToSell,
    proposals,
    radarOpportunities.length,
  ]);

  const handleCreateDashboardPriorityTask = async (priority: { id: string; text: string; taskTitle?: string }) => {
    setCreatingPriorityTask(priority.id);

    try {
      await createTask(priority.taskTitle || `[Beta] ${priority.text}`);
    } finally {
      setCreatingPriorityTask(null);
    }
  };

  const handleCreateExecutiveAction = async (item: ExecutiveActionItem) => {
    setCreatingExecutiveActionId(item.id);
    try {
      await createTask(item.taskTitle);
    } finally {
      setCreatingExecutiveActionId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,129,247,0.18),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-6 items-stretch">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-[var(--blue-accent)] font-black">
                Painel Empresarial Oi Beta
              </span>
              <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight">
                Oi, {userName}.
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
                Este painel agora consolida os sinais reais da operação empresarial: Radar, CRM, Clientes, Implantações, Financeiro, Suporte, Conhecimento e estado técnico da plataforma.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <EnterpriseMetricCard
                icon={<Radar className="w-4 h-4" />}
                label="Radar comercial"
                value={radarOpportunities.length}
                helper="Oportunidades monitoradas"
              />
              <EnterpriseMetricCard
                icon={<Users className="w-4 h-4" />}
                label="Clientes"
                value={totalClients}
                helper={`${activeClients} ativos / ${leads} leads`}
              />
              <EnterpriseMetricCard
                icon={<Target className="w-4 h-4" />}
                label="Maturidade operacional"
                value={`${operationalReadiness}%`}
                helper={`Pressão ${clientExecutiveSummary.operatingPressure}%`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <EnterpriseActionCard
                icon={<ShieldCheck className="w-4 h-4" />}
                title="Abrir Beta Core"
                description="Gerencie tenants, usuários, licenciamento, organização e operação da plataforma."
                actionLabel="Acessar Core"
                onClick={() => setActiveTab('core_admin')}
              />
              <EnterpriseActionCard
                icon={<Building2 className="w-4 h-4" />}
                title="Clientes ativos"
                description="Acompanhe contratos, implantação, financeiro, suporte e health score."
                actionLabel="Ver clientes"
                onClick={() => setActiveTab('enterprise_clients')}
              />
              <EnterpriseActionCard
                icon={<Bot className="w-4 h-4" />}
                title="Beta operacional"
                description="Veja como a Beta interpreta os sinais da empresa e prioriza ações."
                actionLabel="Abrir Beta"
                onClick={() => setActiveTab('beta_brain')}
              />
            </div>
          </div>

          <div className="relative rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col justify-between gap-5">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-indigo-200">Beta</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Cérebro operacional da Oi Beta. Acompanhando dados reais da empresa para sugerir prioridades, reduzir retrabalho e preservar conhecimento.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              {betaPriorities.map((priority) => (
                <BetaInsightLine
                  key={priority.id}
                  text={priority.text}
                  isCreating={creatingPriorityTask === priority.id}
                  onOpenArea={() => setActiveTab(priority.targetTab)}
                  onCreateTask={() => void handleCreateDashboardPriorityTask(priority)}
                />
              ))}
            </div>

            <div className="rounded-xl bg-[var(--bg-main)]/40 border border-[var(--border-color)] p-3">
              <span className="text-[9px] uppercase tracking-widest font-mono font-black text-[var(--text-secondary)] block">
                Próximo marco
              </span>
              <p className="text-xs text-[var(--text-main)] font-semibold mt-1">
                {productionReadiness.nextMilestone}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-300">Diagnóstico técnico</span>
              <h2 className="text-base font-black text-[var(--text-main)] mt-1">
                {technicalDiagnostics.length > 0
                  ? `${technicalDiagnostics.length} verificação(ões) exigem atenção`
                  : 'Infraestrutura sem pendências detectadas'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Área exclusiva do admin mestre. Estes sinais não fazem parte da experiência dos clientes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('platform_monitoring')}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-200 hover:bg-amber-500/20 transition cursor-pointer"
          >
            Abrir monitoramento
          </button>
        </div>

        {technicalDiagnostics.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {technicalDiagnostics.slice(0, 6).map((diagnostic) => (
              <button
                key={diagnostic.id}
                type="button"
                onClick={() => setActiveTab(diagnostic.targetTab)}
                className="text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/70 p-3 hover:border-amber-500/40 transition cursor-pointer"
              >
                <span className="text-[9px] uppercase tracking-widest font-mono font-black text-amber-300">{diagnostic.source}</span>
                <h3 className="text-xs font-black text-[var(--text-main)] mt-1">{diagnostic.title}</h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{diagnostic.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
            Sessão, acesso, persistência, ambiente, observabilidade e produção não reportaram pendências.
          </div>
        )}
      </section>

      <ExecutiveCommandCenter
        summary={executiveCommandSummary}
        creatingId={creatingExecutiveActionId}
        onOpenTab={setActiveTab}
        onCreateTask={(item) => void handleCreateExecutiveAction(item)}
      />

      <CustomerPortfolioExecutiveSnapshot
        summary={customerPortfolioSummary}
        onOpenClients={() => setActiveTab('enterprise_clients')}
      />

      <FinanceExecutiveSnapshot
        summary={financeIntelligence}
        onOpenFinance={() => setActiveTab('enterprise_finance')}
      />

      <SupportExecutiveSnapshot
        summary={supportIntelligence}
        onOpen={() => setActiveTab('support')}
      />

      <ProductPortfolioExecutiveSnapshot
        summary={productPortfolioIntelligence}
        onOpen={() => setActiveTab('platform_products')}
      />
      <ReleaseGovernanceExecutiveSnapshot
        summary={releaseGovernance}
        onOpen={() => setActiveTab('development')}
      />

      <ImplementationExecutiveSnapshot
        summary={implementationIntelligence}
        onOpen={() => setActiveTab('implementations')}
      />

      <ReleaseCandidateCertificationPanel />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <EnterpriseMetricCard icon={<Briefcase className="w-4 h-4" />} label="Projetos" value={totalProjects} helper={`${activeProjectsCount} ativos`} />
        <EnterpriseMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Tarefas" value={pendingTasksCount} helper={`${tasks.length} totais`} />
        <EnterpriseMetricCard icon={<FileText className="w-4 h-4" />} label="Decisões" value={totalDecisions} helper="Memória executiva" />
        <EnterpriseMetricCard icon={<MemoryStick className="w-4 h-4" />} label="Memórias" value={totalMemories} helper="Conhecimento acumulado" />
        <EnterpriseMetricCard icon={<Rocket className="w-4 h-4" />} label="Implantações" value={implementationsCount} helper={`${averageImplementationProgress}% média`} />
        <EnterpriseMetricCard icon={<Headphones className="w-4 h-4" />} label="SLA operacional" value={`${clientServiceLevelSummary.score}%`} helper={`${clientServiceLevelSummary.totalBreaches} violações`} />
        <EnterpriseMetricCard icon={<Layers className="w-4 h-4" />} label="Backlog" value={operationalFlowSummary.totalBacklogItems} helper={`${operationalFlowSummary.highPriorityItems} altas`} />
        <EnterpriseMetricCard icon={<BarChart3 className="w-4 h-4" />} label="Receita" value={`${clientRevenueSummary.revenueHealthScore}%`} helper={`${clientRevenueSummary.clientsAtRevenueRisk} em risco`} />
        <EnterpriseMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Persistência" value={`${persistenceHealth.score}%`} helper={persistenceHealth.fallbackPolicy.enabled ? 'Fallback ativo' : 'API obrigatória'} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h3 className="text-sm font-black text-[var(--text-main)]">Mapa empresarial da Oi Beta</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Os índices abaixo são calculados com dados operacionais disponíveis. Quando não houver registros, o indicador permanece em zero.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EnterpriseAreaCard
              icon={<Radar className="w-4 h-4" />}
              title="Radar Comercial"
              status={`${radarOpportunities.length} oportunidades`}
              progress={areaScores.radar}
              description="Licitações, pregões, dispensas, editais e aderência dos produtos."
              onClick={() => setActiveTab('commercial_radar')}
            />
            <EnterpriseAreaCard
              icon={<Users className="w-4 h-4" />}
              title="CRM"
              status={`${leads + proposals} em pipeline`}
              progress={areaScores.crm}
              description="Leads, órgãos, contatos, propostas, contratos e follow-ups."
              onClick={() => setActiveTab('crm')}
            />
            <EnterpriseAreaCard
              icon={<Building2 className="w-4 h-4" />}
              title="Clientes"
              status={`${activeClients} ativos`}
              progress={areaScores.clients}
              description="Clientes ativos, produtos contratados, licenças, health score e histórico."
              onClick={() => setActiveTab('enterprise_clients')}
            />
            <EnterpriseAreaCard
              icon={<Rocket className="w-4 h-4" />}
              title="Implantações"
              status={`${averageImplementationProgress}% média`}
              progress={areaScores.implementations}
              description="Onboarding, checklist, go-live, pendências e acompanhamento operacional."
              onClick={() => setActiveTab('implementations')}
            />
            <EnterpriseAreaCard
              icon={<BarChart3 className="w-4 h-4" />}
              title="Financeiro"
              status={`${financialRecordsCount} lançamentos`}
              progress={areaScores.finance}
              description="MRR, contratos, faturamento, vencidos, recebimentos e renovações."
              onClick={() => setActiveTab('finance')}
            />
            <EnterpriseAreaCard
              icon={<Headphones className="w-4 h-4" />}
              title="Suporte"
              status={`${openSupportTicketsCount} abertos`}
              progress={areaScores.support}
              description="Chamados, prioridades, SLA, base de conhecimento e histórico do cliente."
              onClick={() => setActiveTab('support')}
            />
            <EnterpriseAreaCard
              icon={<PackageCheck className="w-4 h-4" />}
              title="Produtos"
              status="Catálogo operacional"
              progress={areaScores.products}
              description="Produtos vendáveis, maturidade comercial e relação com oportunidades."
              onClick={() => setActiveTab('platform_products')}
            />
            <EnterpriseAreaCard
              icon={<Cloud className="w-4 h-4" />}
              title="Ambientes"
              status="Dev / staging / produção"
              progress={areaScores.environments}
              description="Ambientes por organização, deploy, storage, API e maturidade operacional."
              onClick={() => setActiveTab('client_environments')}
            />
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h3 className="text-sm font-black text-[var(--text-main)]">Beta Platform</h3>
            <p className="text-xs text-[var(--text-secondary)]">Status do núcleo operacional que sustenta a operação empresarial.</p>
          </div>

          <div className="space-y-3">
            <CoreStatusRow label="Produtos ativos" value={activeProducts.length} helper={`${embeddedProducts.length} embutidos`} />
            <CoreStatusRow label="Módulos ativos" value={activeModules.length} helper={isApiError ? 'API indisponível' : `${activeFeatures.length} recursos`} />
            <CoreStatusRow label="Workspaces próprios" value="10" helper="Empresa, operação e plataforma" />
            <CoreStatusRow label="Fluxo operacional" value={`${operationalFlowSummary.operationalFlowScore}%`} helper={`${operationalFlowSummary.totalBacklogItems} itens no backlog`} />
            <CoreStatusRow label="Ciclo de clientes" value={`${clientLifecycleSummary.averageLifecycleScore}%`} helper={`${clientLifecycleSummary.clientsTracked} clientes monitorados`} />
            <CoreStatusRow label="Saúde da receita" value={`${clientRevenueSummary.revenueHealthScore}%`} helper={`${clientRevenueSummary.clientsReadyToBill} prontos para faturar`} />
            <CoreStatusRow label="Sucesso do cliente" value={`${clientSuccessSummary.successScore}%`} helper={`${clientSuccessSummary.clientsReadyForExpansion} expansões possíveis`} />
            <CoreStatusRow label="Prioridade executiva" value={clientExecutiveSummary.readinessLevel} helper={productionReadiness.nextMilestone} />
            <CoreStatusRow label="Beta Core" value="Online" helper="Admin operacional acessível no menu" />
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-amber-200">Atenção técnica</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {technicalDiagnostics.length > 0
                    ? `${technicalDiagnostics.length} verificação(ões) técnica(s) permanecem abertas. Consulte o Diagnóstico Técnico acima.`
                    : 'Nenhuma pendência técnica crítica foi detectada nesta sessão.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BetaInsightLine({
  text,
  isCreating,
  onOpenArea,
  onCreateTask,
}: {
  text: string;
  isCreating: boolean;
  onOpenArea: () => void;
  onCreateTask: () => void;
}) {
  return (
    <div className="p-2 rounded-lg bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
      <div className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
        <span className="text-[11px] text-[var(--text-main)] leading-relaxed">{text}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2 pl-3.5">
        <button
          type="button"
          onClick={onOpenArea}
          className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 text-[10px] font-black text-[var(--text-main)] hover:border-indigo-500/50 transition cursor-pointer"
        >
          Abrir área
        </button>
        <button
          type="button"
          onClick={onCreateTask}
          disabled={isCreating}
          className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[10px] font-black text-indigo-200 hover:bg-indigo-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Criando...' : 'Criar tarefa'}
        </button>
      </div>
    </div>
  );
}

function EnterpriseMetricCard({ icon, label, value, helper }: EnterpriseMetricCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--cyan-accent)] flex items-center justify-center">
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

function EnterpriseActionCard({ title, description, actionLabel, icon, onClick }: EnterpriseActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4 hover:border-[var(--blue-accent)]/40 hover:bg-[var(--bg-main)]/55 transition cursor-pointer"
    >
      <div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--cyan-accent)] flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-sm font-black text-[var(--text-main)] mt-3">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{description}</p>
      <span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[var(--cyan-accent)] font-black mt-3 block">
        {actionLabel}
      </span>
    </button>
  );
}

function EnterpriseAreaCard({ title, description, status, progress, icon, onClick }: EnterpriseAreaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4 hover:border-[var(--blue-accent)]/40 hover:bg-[var(--bg-main)]/55 transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--cyan-accent)] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-[var(--text-main)]">{title}</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-mono font-black px-2 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] whitespace-nowrap">
          {progress}%
        </span>
      </div>

      <div className="mt-4 h-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
        <div className="h-full bg-[var(--blue-accent)]" style={{ width: `${progress}%` }} />
      </div>

      <span className="text-[10px] uppercase font-mono font-black text-[var(--cyan-accent)] mt-3 block">
        {status}
      </span>
    </button>
  );
}

function CoreStatusRow({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-3">
      <div>
        <span className="text-xs font-bold text-[var(--text-main)]">{label}</span>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{helper}</p>
      </div>
      <strong className="text-sm font-black text-[var(--cyan-accent)]">{value}</strong>
    </div>
  );
}
