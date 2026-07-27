import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Headphones,
  Lightbulb,
  MemoryStick,
  PackageCheck,
  Radar,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import useClientsWorkspace from '../../hooks/useClientsWorkspace';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useRuntimeConfiguration from '../../hooks/useRuntimeConfiguration';
import usePersistenceHealth from '../../hooks/usePersistenceHealth';
import useObservabilitySummary from '../../hooks/useObservabilitySummary';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useSessionHealth from '../../hooks/useSessionHealth';
import { IntegrationReadinessService } from '../../core/integrations/IntegrationReadinessService';
import { BetaOperationalIntelligenceService } from '../../core/betaBrain/BetaOperationalIntelligenceService';
import { CommercialOpportunityRecommendationService } from '../../core/commercial/CommercialOpportunityRecommendationService';
import BetaCommercialRecommendationsPanel from './BetaCommercialRecommendationsPanel';

import BetaGovernancePanel from '../betaGovernance/BetaGovernancePanel';
type BetaPriorityLevel = 'alta' | 'média' | 'baixa';

interface BetaOperationalSignal {
  id: string;
  title: string;
  description: string;
  status: 'ok' | 'attention' | 'critical';
  source: string;
  action: string;
}

interface BetaPriority {
  id: string;
  title: string;
  description: string;
  priority: BetaPriorityLevel;
  targetTab: string;
  taskTitle?: string;
}

const SIGNAL_STATUS_LABELS: Record<BetaOperationalSignal['status'], string> = {
  ok: 'Estável',
  attention: 'Atenção',
  critical: 'Crítico',
};

const SIGNAL_STATUS_CLASSES: Record<BetaOperationalSignal['status'], string> = {
  ok: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  attention: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const PRIORITY_CLASSES: Record<BetaPriorityLevel, string> = {
  alta: 'text-red-300',
  média: 'text-amber-300',
  baixa: 'text-slate-300',
};

export default function EnterpriseBetaBrainWorkspace() {
  const workspace = useWorkspace();
  const platform = usePlatformContext();
  const clientsWorkspace = useClientsWorkspace();
  const productionReadiness = useProductionReadiness();
  const runtimeConfiguration = useRuntimeConfiguration();
  const persistenceHealth = usePersistenceHealth();
  const observabilitySummary = useObservabilitySummary();
  const accessControl = useAccessControlHealth();
  const sessionHealth = useSessionHealth();

  const { setActiveTab } = workspace.navigation;
  const { projects, activeProjectsCount } = workspace.projects;
  const {
    tasks,
    pendingTasksCount,
    createTask,
  } = workspace.tasks;
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
  const [creatingRecommendationTaskId, setCreatingRecommendationTaskId] = useState<string | null>(null);
  const [creatingRecommendationPlanId, setCreatingRecommendationPlanId] = useState<string | null>(null);
  const { totalDecisions } = workspace.decisions;
  const { totalMemories } = workspace.memories;
  const { activeModules, activeFeatures, isApiError } = workspace.modules;

  const integrationReadinessSummary = IntegrationReadinessService.buildSummary();

  const {
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
    clientLifecycle,
    clientLifecycleSummary,
    clientRevenueSummary,
    clientSuccessSummary,
    clientServiceLevelSummary,
    clientExecutiveSummary,
    productCommercializationSummary,
  } = clientsWorkspace;

  const commercialRecommendationSummary = useMemo(
    () => CommercialOpportunityRecommendationService.buildSummary(radarOpportunities, 5),
    [radarOpportunities],
  );

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

  const operationalSignals = useMemo<BetaOperationalSignal[]>(() => {
    const signals: BetaOperationalSignal[] = [
      {
        id: 'radar',
        title: 'Radar Comercial',
        description: radarOpportunities.length > 0
          ? `${radarOpportunities.length} oportunidades disponíveis para análise comercial.`
          : 'Nenhuma oportunidade real registrada no Radar Comercial.',
        status: radarOpportunities.length > 0 ? 'ok' : 'attention',
        source: 'Radar Comercial',
        action: 'Alimentar oportunidades reais ou importar fontes externas.',
      },
      {
        id: 'crm',
        title: 'CRM e pipeline',
        description: `${leads} leads e ${proposals} propostas em acompanhamento.`,
        status: leads + proposals > 0 ? 'attention' : activeClients > 0 ? 'ok' : 'attention',
        source: 'CRM',
        action: 'Converter oportunidades qualificadas em propostas, contratos e clientes ativos.',
      },
      {
        id: 'clients',
        title: 'Clientes ativos',
        description: `${activeClients} clientes ativos em ${totalClients} registros de clientes.`,
        status: activeClients > 0 ? 'ok' : totalClients > 0 ? 'attention' : 'critical',
        source: 'Clientes',
        action: 'Consolidar base de clientes e separar leads de clientes ativos.',
      },
      {
        id: 'implementations',
        title: 'Implantações',
        description: implementationsCount > 0
          ? `${implementationsCount} implantações com progresso médio de ${averageImplementationProgress}%.`
          : 'Nenhuma implantação operacional registrada.',
        status: implementationsCount > 0 ? (averageImplementationProgress >= 70 ? 'ok' : 'attention') : contractsCount > 0 ? 'critical' : 'attention',
        source: 'Implantações',
        action: 'Criar checklists e acompanhar go-live dos clientes contratados.',
      },
      {
        id: 'finance',
        title: 'Financeiro',
        description: financialRecordsCount > 0
          ? `${financialRecordsCount} lançamentos financeiros registrados.`
          : 'Financeiro ainda sem base operacional consistente.',
        status: overdueAmount > 0 ? 'critical' : financialRecordsCount > 0 ? 'ok' : 'attention',
        source: 'Financeiro',
        action: overdueAmount > 0 ? 'Revisar cobranças vencidas.' : 'Consolidar MRR, contratos, vencimentos e recebimentos.',
      },
      {
        id: 'support',
        title: 'Suporte',
        description: `${openSupportTicketsCount} chamados abertos em ${supportTicketsCount} chamados registrados.`,
        status: openSupportTicketsCount > 0 ? 'attention' : supportTicketsCount > 0 ? 'ok' : 'attention',
        source: 'Suporte',
        action: 'Priorizar chamados abertos e transformar dúvidas recorrentes em conhecimento.',
      },
      {
        id: 'operational-backlog',
        title: 'Backlog operacional',
        description: `${operationalFlowSummary.totalBacklogItems} ações derivadas do fluxo; ${operationalFlowSummary.highPriorityItems} de alta prioridade.`,
        status: operationalFlowSummary.highPriorityItems > 0 ? 'critical' : operationalFlowSummary.totalBacklogItems > 0 ? 'attention' : 'ok',
        source: 'Fluxo Operacional',
        action: 'Converter pendências prioritárias em tarefas acompanháveis.',
      },
      {
        id: 'knowledge',
        title: 'Conhecimento e memória',
        description: `${totalMemories} memórias e ${totalDecisions} decisões disponíveis para contexto.`,
        status: totalMemories + totalDecisions > 0 ? 'ok' : 'attention',
        source: 'Knowledge / Memory',
        action: 'Registrar decisões, aprendizados e fontes para a Beta reutilizar.',
      },
      {
        id: 'client-lifecycle',
        title: 'Ciclo de vida dos clientes',
        description: `${clientLifecycleSummary.clientsTracked} clientes monitorados; score médio de ${clientLifecycleSummary.averageLifecycleScore}%.`,
        status: clientLifecycleSummary.blockedClients > 0 ? 'critical' : clientLifecycleSummary.averageLifecycleScore >= 70 ? 'ok' : 'attention',
        source: 'Client Lifecycle',
        action: 'Atuar nos gargalos do ciclo CRM → Contrato → Implantação → Financeiro → Suporte.',
      },
      {
        id: 'revenue-health',
        title: 'Saúde da receita',
        description: `Score de receita em ${clientRevenueSummary.revenueHealthScore}% com ${clientRevenueSummary.clientsAtRevenueRisk} cliente(s) em risco.`,
        status: clientRevenueSummary.clientsAtRevenueRisk > 0 || clientRevenueSummary.revenueHealthScore < 65 ? 'attention' : 'ok',
        source: 'Receita / Financeiro',
        action: 'Converter riscos de receita em tarefas de cobrança, faturamento ou retenção.',
      },
      {
        id: 'client-success',
        title: 'Sucesso do cliente',
        description: `Score de sucesso em ${clientSuccessSummary.successScore}% com ${clientSuccessSummary.clientsAtRisk} cliente(s) em risco.`,
        status: clientSuccessSummary.criticalSuccessRisks > 0 ? 'critical' : clientSuccessSummary.clientsAtRisk > 0 ? 'attention' : 'ok',
        source: 'Sucesso / Retenção',
        action: 'Transformar riscos de retenção em tarefas de atendimento, faturamento ou expansão.',
      },
      {
        id: 'executive-priority',
        title: 'Prioridade executiva',
        description: `Score executivo em ${clientExecutiveSummary.executiveScore}% com ${clientExecutiveSummary.totalCriticalSignals} sinal(is) críticos.`,
        status: clientExecutiveSummary.readinessLevel === 'crítico' ? 'critical' : clientExecutiveSummary.readinessLevel === 'atenção' ? 'attention' : 'ok',
        source: 'Executive OS',
        action: clientExecutiveSummary.nextMilestone,
      },
      {
        id: 'beta-operational-intelligence',
        title: 'Inteligência operacional da Beta',
        description: `Score de inteligência em ${betaIntelligenceSummary.betaReadinessScore}% e automação em ${betaIntelligenceSummary.automationScore}%.`,
        status: betaIntelligenceSummary.highPriorityCount > 0 ? 'attention' : betaIntelligenceSummary.betaReadinessScore >= 75 ? 'ok' : 'attention',
        source: 'Beta Intelligence',
        action: betaIntelligenceSummary.nextAction,
      },
      {
        id: 'session-health',
        title: 'Sessão e identidade',
        description: `Score de sessão em ${sessionHealth.score}% com origem ${sessionHealth.source || 'não validada'}.`,
        status: sessionHealth.status === 'critical'
          ? 'critical'
          : sessionHealth.status === 'attention'
            ? 'attention'
            : 'ok',
        source: 'Session Health',
        action: sessionHealth.issues[0]?.description || 'Manter a sessão autenticada e renovável.',
      },
      {
        id: 'access-control-health',
        title: 'Autorização backend',
        description: `Score RBAC em ${accessControl.score}% para o perfil ${accessControl.profile || 'não validado'}.`,
        status: accessControl.status === 'critical'
          ? 'critical'
          : accessControl.status === 'attention'
            ? 'attention'
            : 'ok',
        source: 'Authorization Policy',
        action: accessControl.issues[0]?.description || 'Manter as permissões backend alinhadas.',
      },
      {
        id: 'persistence-runtime-health',
        title: 'Persistência em execução',
        description: `Score de persistência em ${persistenceHealth.score}%, schema em ${persistenceHealth.schemaReadinessScore}% e fallback ${persistenceHealth.fallbackPolicy.enabled ? 'habilitado' : 'desabilitado'}.`,
        status: persistenceHealth.status === 'critical'
          ? 'critical'
          : persistenceHealth.status === 'attention'
            ? 'attention'
            : 'ok',
        source: 'Persistence Health',
        action: persistenceHealth.issues[0]?.description || 'Manter APIs e repositórios persistentes.',
      },
      {
        id: 'runtime-configuration-health',
        title: 'Configuração de ambiente',
        description: `Score de configuração em ${runtimeConfiguration.score}% com ${runtimeConfiguration.missingVariables} variável(is) pública(s) ausente(s).`,
        status: runtimeConfiguration.productionBlocked
          ? 'critical'
          : runtimeConfiguration.score >= 75
            ? 'ok'
            : 'attention',
        source: 'Runtime Configuration',
        action: runtimeConfiguration.issues[0]?.description || 'Manter configuração do ambiente validada.',
      },
      {
        id: 'service-level-health',
        title: 'SLA operacional',
        description: `Score de SLA em ${clientServiceLevelSummary.score}% com ${clientServiceLevelSummary.totalBreaches} violação(ões).`,
        status: clientServiceLevelSummary.highSeverityBreaches > 0
          ? 'critical'
          : clientServiceLevelSummary.totalBreaches > 0
            ? 'attention'
            : 'ok',
        source: 'Client Service Level',
        action: clientServiceLevelSummary.items[0]?.description || 'Manter os prazos operacionais.',
      },
      {
        id: 'observability-health',
        title: 'Observabilidade e auditoria',
        description: `Score de observabilidade em ${observabilitySummary.score}% com ${observabilitySummary.errorLogsCount} erro(s) e ${observabilitySummary.warningLogsCount} alerta(s).`,
        status: observabilitySummary.status === 'critical'
          ? 'critical'
          : observabilitySummary.status === 'attention'
            ? 'attention'
            : 'ok',
        source: 'Observability Service',
        action: observabilitySummary.issues[0]?.description || 'Manter auditoria e logs operacionais.',
      },
      {
        id: 'production-readiness',
        title: 'Prontidão de produção',
        description: `Score de produção em ${productionReadiness.score}% com ${productionReadiness.blockedAreas} área(s) bloqueada(s).`,
        status: productionReadiness.status === 'blocked'
          ? 'critical'
          : productionReadiness.status === 'attention'
            ? 'attention'
            : 'ok',
        source: 'Production Readiness',
        action: productionReadiness.nextMilestone,
      },
      {
        id: 'product-commercialization',
        title: 'Produtos vendáveis',
        description: `Maturidade comercial média de ${productCommercializationSummary.averageReadiness}% com ${productCommercializationSummary.sellableProducts} produto(s) vendável(is).`,
        status: productCommercializationSummary.sellableProducts > 0
          ? 'ok'
          : productCommercializationSummary.averageReadiness >= 65
            ? 'attention'
            : 'critical',
        source: 'Product Commercialization',
        action: productCommercializationSummary.firstProductToSell?.nextAction || 'Consolidar primeiro produto vendável.',
      },
      {
        id: 'platform',
        title: 'Plataforma',
        description: `${activeModules.length} módulos e ${activeFeatures.length} recursos ativos.`,
        status: isApiError ? 'critical' : activeModules.length > 0 ? 'ok' : 'attention',
        source: 'Beta Core',
        action: isApiError ? 'Verificar API interna de módulos.' : 'Consolidar persistência e integrações reais.',
      },
    ];

    return signals;
  }, [
    activeClients,
    activeFeatures.length,
    activeModules.length,
    averageImplementationProgress,
    contractsCount,
    financialRecordsCount,
    implementationsCount,
    isApiError,
    leads,
    openSupportTicketsCount,
    clientLifecycleSummary.averageLifecycleScore,
    clientLifecycleSummary.blockedClients,
    clientRevenueSummary.clientsAtRevenueRisk,
    clientRevenueSummary.revenueHealthScore,
    clientSuccessSummary.clientsAtRisk,
    clientSuccessSummary.criticalSuccessRisks,
    clientSuccessSummary.successScore,
    clientExecutiveSummary.executiveScore,
    clientExecutiveSummary.readinessLevel,
    clientExecutiveSummary.totalCriticalSignals,
    betaIntelligenceSummary.automationScore,
    betaIntelligenceSummary.betaReadinessScore,
    betaIntelligenceSummary.highPriorityCount,
    betaIntelligenceSummary.nextAction,
    productionReadiness.blockedAreas,
    productionReadiness.nextMilestone,
    productionReadiness.score,
    productionReadiness.status,
    observabilitySummary.errorLogsCount,
    observabilitySummary.issues,
    observabilitySummary.score,
    observabilitySummary.status,
    observabilitySummary.warningLogsCount,
    clientServiceLevelSummary.highSeverityBreaches,
    clientServiceLevelSummary.items,
    clientServiceLevelSummary.score,
    clientServiceLevelSummary.totalBreaches,
    productCommercializationSummary.averageReadiness,
    productCommercializationSummary.firstProductToSell,
    productCommercializationSummary.sellableProducts,
    operationalBacklog.length,
    operationalFlowSummary.highPriorityItems,
    operationalFlowSummary.totalBacklogItems,
    overdueAmount,
    proposals,
    radarOpportunities.length,
    supportTicketsCount,
    totalClients,
    totalDecisions,
    totalMemories,
  ]);

  const criticalSignals = operationalSignals.filter((signal) => signal.status === 'critical').length;
  const attentionSignals = operationalSignals.filter((signal) => signal.status === 'attention').length;
  const okSignals = operationalSignals.filter((signal) => signal.status === 'ok').length;

  const betaOperationalScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (okSignals / Math.max(operationalSignals.length, 1)) * 100 -
          criticalSignals * 10 -
          attentionSignals * 3
      )
    )
  );

  const betaPriorities = useMemo<BetaPriority[]>(() => {
    const sessionHealthPriorities: BetaPriority[] = sessionHealth.issues
      .slice(0, 4)
      .map((issue) => ({
        id: `session-health-${issue.id}`,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        targetTab: issue.targetTab,
        taskTitle: issue.taskTitle,
      }));

    const accessControlPriorities: BetaPriority[] = accessControl.issues
      .slice(0, 4)
      .map((issue) => ({
        id: `access-control-${issue.id}`,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        targetTab: issue.targetTab,
        taskTitle: issue.taskTitle,
      }));

    const persistenceHealthPriorities: BetaPriority[] = persistenceHealth.issues
      .slice(0, 4)
      .map((issue) => ({
        id: `persistence-health-${issue.id}`,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        targetTab: issue.targetTab,
        taskTitle: issue.taskTitle,
      }));

    const runtimeConfigurationPriorities: BetaPriority[] = runtimeConfiguration.issues
      .slice(0, 4)
      .map((issue) => ({
        id: `runtime-configuration-${issue.id}`,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        targetTab: issue.targetTab,
        taskTitle: issue.taskTitle,
      }));

    const serviceLevelPriorities: BetaPriority[] = clientServiceLevelSummary.items
      .slice(0, 4)
      .map((item) => ({
        id: `service-level-${item.id}`,
        title: item.title,
        description: item.description,
        priority: item.severity,
        targetTab: item.targetTab,
        taskTitle: item.taskTitle,
      }));

    const observabilityPriorities: BetaPriority[] = observabilitySummary.issues
      .slice(0, 4)
      .map((issue) => ({
        id: `observability-${issue.id}`,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        targetTab: issue.targetTab,
        taskTitle: issue.taskTitle,
      }));

    const productionPriorities: BetaPriority[] = productionReadiness.areas
      .filter((area) => area.status !== 'ready')
      .slice(0, 4)
      .map((area) => ({
        id: `production-${area.id}`,
        title: area.title,
        description: area.description,
        priority: area.priority,
        targetTab: area.targetTab,
        taskTitle: area.taskTitle,
      }));

    const productPriorities: BetaPriority[] = productCommercializationSummary.items
      .filter((item) => item.commercialStatus !== 'vendavel')
      .slice(0, 3)
      .map((item) => ({
        id: `product-${item.service.id}`,
        title: `Preparar ${item.service.shortName}`,
        description: item.nextAction,
        priority: item.readinessScore < 55 ? 'alta' : 'média',
        targetTab: 'products',
        taskTitle: item.taskTitle,
      }));

    const intelligencePriorities: BetaPriority[] = betaIntelligenceSummary.priorities
      .slice(0, 4)
      .map((item) => ({
        id: `intelligence-${item.id}`,
        title: item.title,
        description: item.description,
        priority: item.priority,
        targetTab: item.targetTab,
        taskTitle: item.taskTitle,
      }));

    const executivePriorities: BetaPriority[] = clientExecutiveSummary.strategicPriorities
      .slice(0, 4)
      .map((item) => ({
        id: `executive-${item.id}`,
        title: item.title,
        description: item.description,
        priority: item.priority,
        targetTab: item.targetTab,
        taskTitle: item.taskTitle,
      }));

    const successPriorities: BetaPriority[] = clientSuccessSummary.retentionRiskItems
      .slice(0, 3)
      .map((item) => ({
        id: `success-${item.id}`,
        title: item.title,
        description: item.description,
        priority: item.level === 'alto' ? 'alta' : item.level === 'médio' ? 'média' : 'baixa',
        targetTab: item.targetTab,
        taskTitle: item.taskTitle,
      }));

    const revenuePriorities: BetaPriority[] = clientRevenueSummary.revenueRiskItems
      .slice(0, 3)
      .map((item) => ({
        id: `revenue-${item.id}`,
        title: item.title,
        description: item.description,
        priority: item.level === 'alto' ? 'alta' : 'média',
        targetTab: item.title.includes('Suporte') || item.taskTitle.includes('Suporte') ? 'support' : 'finance',
        taskTitle: item.taskTitle,
      }));

    const lifecyclePriorities: BetaPriority[] = clientLifecycle
      .filter((item) => item.bottleneck)
      .slice(0, 3)
      .map((item) => ({
        id: `lifecycle-${item.clientId}-${item.currentStage}`,
        title: `Gargalo no ciclo — ${item.clientName}`,
        description: item.bottleneck?.nextAction || 'Revisar ciclo operacional do cliente.',
        priority: item.bottleneck?.status === 'blocked' ? 'alta' : 'média',
        targetTab: item.bottleneck?.id === 'contract' || item.bottleneck?.id === 'crm'
          ? 'crm'
          : item.bottleneck?.id === 'implementation'
            ? 'implementations'
            : item.bottleneck?.id === 'finance'
              ? 'finance'
              : 'support',
        taskTitle: `[Ciclo do Cliente] ${item.clientName}: ${item.bottleneck?.nextAction || 'revisar gargalo operacional'}`,
      }));

    const priorities: BetaPriority[] = [
      ...sessionHealthPriorities,
      ...accessControlPriorities,
      ...persistenceHealthPriorities,
      ...runtimeConfigurationPriorities,
      ...serviceLevelPriorities,
      ...observabilityPriorities,
      ...productionPriorities,
      ...productPriorities,
      ...intelligencePriorities,
      ...executivePriorities,
      ...successPriorities,
      ...revenuePriorities,
      ...lifecyclePriorities,
      ...operationalBacklog.slice(0, 4).map((item) => ({
      id: `backlog-${item.id}`,
      title: item.title,
      description: item.description,
      priority: item.priority,
      targetTab: item.targetTab,
      taskTitle: item.taskTitle,
    })),
    ];

    operationalSignals
      .filter((signal) => signal.status === 'critical')
      .forEach((signal) => {
        priorities.push({
          id: `critical-${signal.id}`,
          title: signal.title,
          description: signal.action,
          priority: 'alta',
          targetTab: resolveTargetTab(signal.id),
        });
      });

    operationalSignals
      .filter((signal) => signal.status === 'attention')
      .slice(0, 5)
      .forEach((signal) => {
        priorities.push({
          id: `attention-${signal.id}`,
          title: signal.title,
          description: signal.action,
          priority: signal.id === 'radar' || signal.id === 'implementations' ? 'alta' : 'média',
          targetTab: resolveTargetTab(signal.id),
        });
      });

    if (priorities.length === 0) {
      priorities.push({
        id: 'supabase',
        title: 'Persistência Supabase',
        description: 'A operação está estável. Próximo foco: reduzir armazenamento local e consolidar backend/Supabase.',
        priority: 'alta',
        targetTab: 'platform_monitoring',
      });
      priorities.push({
        id: 'integrations',
        title: 'Integrações externas',
        description: 'Preparar camada isolada para PNCP, Compras.gov e provedores de IA.',
        priority: 'média',
        targetTab: 'commercial_radar',
      });
    }

    return priorities.slice(0, 6);
  }, [sessionHealth.issues, accessControl.issues, betaIntelligenceSummary.priorities, persistenceHealth.issues, runtimeConfiguration.issues, clientServiceLevelSummary.items, observabilitySummary.issues, productionReadiness.areas, productCommercializationSummary.items, clientExecutiveSummary.strategicPriorities, clientLifecycle, clientRevenueSummary.revenueRiskItems, clientSuccessSummary.retentionRiskItems, operationalBacklog, operationalSignals]);

  const intelligenceCapabilities = [
    {
      title: 'Ler contexto operacional',
      description: 'A Beta já enxerga projetos, tarefas, memórias, decisões, clientes e sinais da operação.',
      status: 'Em evolução',
      icon: BrainCircuit,
    },
    {
      title: 'Priorizar ações',
      description: 'A Beta transforma sinais críticos e pendentes em uma fila de prioridades por área.',
      status: 'Ativo',
      icon: Target,
    },
    {
      title: 'Preservar conhecimento',
      description: 'Memórias e decisões passam a alimentar a leitura operacional da empresa.',
      status: 'Parcial',
      icon: MemoryStick,
    },
    {
      title: 'Executar tarefas',
      description: 'A Beta já pode transformar prioridades operacionais em tarefas com confirmação humana.',
      status: 'Ativo inicial',
      icon: Zap,
    },
  ];

  const handleCreateRecommendationTask = async (recommendationId: string, taskTitle: string) => {
    setCreatingRecommendationTaskId(recommendationId);
    try {
      await createTask(taskTitle);
    } finally {
      setCreatingRecommendationTaskId(null);
    }
  };

  const handleCreateRecommendationPlan = async (recommendationId: string, taskTitles: string[]) => {
    if (taskTitles.length === 0) return;

    setCreatingRecommendationPlanId(recommendationId);
    try {
      for (const taskTitle of taskTitles) {
        await createTask(taskTitle);
      }
    } finally {
      setCreatingRecommendationPlanId(null);
    }
  };

  const handleCreatePriorityTask = async (priority: BetaPriority) => {
    const title = priority.taskTitle || `[Beta] ${priority.title}: ${priority.description}`;

    setCreatingTaskId(priority.id);

    try {
      await createTask(title);
    } finally {
      setCreatingTaskId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.20),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-6">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-indigo-300 font-black">
                Beta / IA Operacional
              </span>
              <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
                <Bot className="w-8 h-8 text-indigo-300" />
                Beta
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
                Área da assistente operacional da Oi Beta. Aqui a Beta interpreta os sinais da empresa, identifica riscos, prioriza próximos passos e prepara a execução assistida.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <BetaMetricCard icon={<Sparkles className="w-4 h-4" />} label="Score operacional" value={`${betaOperationalScore}%`} helper="Leitura da empresa" />
              <BetaMetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Atenções" value={attentionSignals} helper={`${criticalSignals} críticas`} />
              <BetaMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Sinais OK" value={okSignals} helper="Áreas estáveis" />
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-indigo-200">Cérebro operacional</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  A Beta não é apenas um chat. Ela deve observar a operação, compreender contexto, preservar memória e sugerir execução.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <BetaContextLine label="Projetos" value={`${projects.length} (${activeProjectsCount} ativos)`} />
              <BetaContextLine label="Tarefas pendentes" value={pendingTasksCount} />
              <BetaContextLine label="Clientes ativos" value={activeClients} />
              <BetaContextLine label="Health score médio" value={`${averageHealthScore}%`} />
              <BetaContextLine label="Fluxo operacional" value={`${operationalFlowSummary.operationalFlowScore}%`} />
              <BetaContextLine label="Ciclo dos clientes" value={`${clientLifecycleSummary.averageLifecycleScore}%`} />
              <BetaContextLine label="Saúde da receita" value={`${clientRevenueSummary.revenueHealthScore}%`} />
              <BetaContextLine label="Sucesso do cliente" value={`${clientSuccessSummary.successScore}%`} />
              <BetaContextLine label="Score executivo" value={`${clientExecutiveSummary.executiveScore}%`} />
              <BetaContextLine label="Automação da Beta" value={`${betaIntelligenceSummary.automationScore}%`} />
              <BetaContextLine label="Produtos vendáveis" value={`${productCommercializationSummary.averageReadiness}%`} />
              <BetaContextLine label="Prontidão de produção" value={`${productionReadiness.score}%`} />
              <BetaContextLine label="Observabilidade" value={`${observabilitySummary.score}%`} />
              <BetaContextLine label="SLA operacional" value={`${clientServiceLevelSummary.score}%`} />
              <BetaContextLine label="Configuração" value={`${runtimeConfiguration.score}%`} />
              <BetaContextLine label="Persistência" value={`${persistenceHealth.score}%`} />
              <BetaContextLine label="Schema Supabase" value={`${persistenceHealth.schemaReadinessScore}%`} />
              <BetaContextLine label="RBAC backend" value={`${accessControl.score}%`} />
              <BetaContextLine label="Acesso por produtos" value={`${platform.productAccessCoverage}%`} />
              <BetaContextLine label="Sessão backend" value={`${sessionHealth.score}%`} />
              <BetaContextLine label="Fallback local" value={persistenceHealth.fallbackPolicy.enabled ? 'Habilitado' : 'Desabilitado'} />
            </div>
          </div>
        </div>
      </section>

      <BetaCommercialRecommendationsPanel
        summary={commercialRecommendationSummary}
        creatingTaskId={creatingRecommendationTaskId}
        creatingPlanId={creatingRecommendationPlanId}
        onOpenRadar={() => setActiveTab('commercial_radar')}
        onCreateTask={handleCreateRecommendationTask}
        onCreatePlan={handleCreateRecommendationPlan}
        existingTasks={tasks}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <BetaMetricCard icon={<Radar className="w-4 h-4" />} label="Radar" value={radarOpportunities.length} helper="Oportunidades" />
        <BetaMetricCard icon={<Users className="w-4 h-4" />} label="CRM" value={leads + proposals} helper="Pipeline" />
        <BetaMetricCard icon={<Building2 className="w-4 h-4" />} label="Clientes" value={totalClients} helper={`${activeClients} ativos`} />
        <BetaMetricCard icon={<Rocket className="w-4 h-4" />} label="Implantações" value={implementationsCount} helper={`${averageImplementationProgress}% média`} />
        <BetaMetricCard icon={<BarChart3 className="w-4 h-4" />} label="Financeiro" value={financialRecordsCount} helper={overdueAmount > 0 ? 'Há vencidos' : 'Sem alerta'} />
        <BetaMetricCard icon={<Headphones className="w-4 h-4" />} label="Suporte" value={openSupportTicketsCount} helper="Chamados abertos" />
        <BetaMetricCard icon={<PackageCheck className="w-4 h-4" />} label="Backlog" value={operationalFlowSummary.totalBacklogItems} helper={`${operationalFlowSummary.highPriorityItems} altas`} />
        <BetaMetricCard icon={<MemoryStick className="w-4 h-4" />} label="Memórias" value={totalMemories} helper="Base de contexto" />
        <BetaMetricCard icon={<FileText className="w-4 h-4" />} label="Decisões" value={totalDecisions} helper="Base decisória" />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Sinais interpretados
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Leitura operacional da Beta</h2>
            </div>

            <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Contexto real
            </span>
          </div>

          <div className="space-y-3">
            {operationalSignals.map((signal) => (
              <BetaSignalCard
                key={signal.id}
                signal={signal}
                onOpenArea={() => setActiveTab(resolveTargetTab(signal.id))}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Prioridades
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Fila operacional da Beta</h2>
            </div>

            <div className="space-y-3">
              {betaPriorities.map((priority) => (
                <div
                  key={priority.id}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-[var(--text-main)]">{priority.title}</h3>
                    <span className={`text-[10px] uppercase font-mono font-black ${PRIORITY_CLASSES[priority.priority]}`}>
                      {priority.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{priority.description}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab(priority.targetTab)}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] font-black text-[var(--text-main)] hover:border-indigo-500/50 transition cursor-pointer"
                    >
                      Abrir área
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCreatePriorityTask(priority)}
                      disabled={creatingTaskId === priority.id}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-black text-indigo-200 hover:bg-indigo-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingTaskId === priority.id ? 'Criando...' : 'Criar tarefa'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Capacidades
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">O que a Beta já faz</h2>
            </div>

            <div className="space-y-3">
              {intelligenceCapabilities.map((capability) => {
                const Icon = capability.icon;

                return (
                  <div key={capability.title} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-[var(--text-main)]">{capability.title}</h3>
                          <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                            {capability.status}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{capability.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BetaMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
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

function BetaContextLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 px-3 py-2">
      <span className="text-xs font-bold text-[var(--text-secondary)]">{label}</span>
      <strong className="text-xs font-black text-[var(--text-main)]">{value}</strong>
    </div>
  );
}

function BetaSignalCard({ signal, onOpenArea }: { signal: BetaOperationalSignal; onOpenArea: () => void }) {
  const Icon = signal.status === 'ok'
    ? CheckCircle2
    : signal.status === 'critical'
      ? AlertTriangle
      : Lightbulb;

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-[var(--text-main)]">{signal.title}</h3>
              <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${SIGNAL_STATUS_CLASSES[signal.status]}`}>
                {SIGNAL_STATUS_LABELS[signal.status]}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{signal.description}</p>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/45 p-3 mt-3">
              <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block">
                Ação sugerida
              </span>
              <p className="text-xs text-[var(--text-main)] font-bold mt-1">{signal.action}</p>
            </div>

            <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] mt-3 block">
              Fonte: {signal.source}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenArea}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs font-black text-[var(--text-main)] hover:border-indigo-500/50 transition cursor-pointer"
        >
          Abrir área
        </button>
      
      <BetaGovernancePanel />
</div>
    </article>
  );
}

function resolveTargetTab(signalId: string) {
  const map: Record<string, string> = {
    radar: 'commercial_radar',
    crm: 'crm',
    clients: 'enterprise_clients',
    implementations: 'implementations',
    finance: 'finance',
    support: 'support',
    knowledge: 'knowledge',
    platform: 'platform_monitoring',
  };

  return map[signalId] || 'dashboard';
}