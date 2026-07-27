import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  GitBranch,
  HardDrive,
  Layers3,
  RefreshCw,
  Router,
  ServerCog,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import useClientsWorkspace from '../../hooks/useClientsWorkspace';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useRuntimeConfiguration from '../../hooks/useRuntimeConfiguration';
import useOperationalIncidents from '../../hooks/useOperationalIncidents';
import useIncidentEscalations from '../../hooks/useIncidentEscalations';
import usePersistenceHealth from '../../hooks/usePersistenceHealth';
import useObservabilitySummary from '../../hooks/useObservabilitySummary';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useSessionHealth from '../../hooks/useSessionHealth';
import { RepositoryHealthService } from '../../core/persistence/RepositoryHealthService';
import { IntegrationReadinessService } from '../../core/integrations/IntegrationReadinessService';
import NotificationCenterPanel from '../notifications/NotificationCenterPanel';

type MonitoringStatus = 'healthy' | 'attention' | 'offline';

interface MonitoringSignal {
  id: string;
  title: string;
  description: string;
  status: MonitoringStatus;
  source: string;
}

const STATUS_LABELS: Record<MonitoringStatus, string> = {
  healthy: 'Operacional',
  attention: 'Atenção',
  offline: 'Indisponível',
};

const STATUS_CLASSES: Record<MonitoringStatus, string> = {
  healthy: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  attention: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  offline: 'bg-red-500/10 text-red-300 border-red-500/20',
};

export default function EnterpriseMonitoringWorkspace() {
  const workspace = useWorkspace();
  const { clientExecutiveSummary, clientServiceLevelSummary } = useClientsWorkspace();
  const productionReadiness = useProductionReadiness();
  const runtimeConfiguration = useRuntimeConfiguration();
  const operationalIncidents = useOperationalIncidents(100);
  const incidentEscalations = useIncidentEscalations(100);
  const persistenceHealth = usePersistenceHealth();
  const observabilitySummary = useObservabilitySummary();
  const accessControl = useAccessControlHealth();
  const sessionHealth = useSessionHealth();
  const [creatingMonitoringTaskId, setCreatingMonitoringTaskId] = useState<string | null>(null);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<
    'critical' | 'high' | 'medium' | 'low'
  >('medium');

  const {
    projects,
    activeProjectsCount,
  } = workspace.projects;

  const {
    tasks,
    pendingTasksCount,
    createTask,
  } = workspace.tasks;

  const {
    totalDecisions,
  } = workspace.decisions;

  const {
    totalMemories,
  } = workspace.memories;

  const {
    allModules,
    activeModules,
    activeFeatures,
    isApiError,
    isModulesLoading,
    fetchModulesAndFeatures,
  } = workspace.modules;

  const integrationReadinessSummary = IntegrationReadinessService.buildSummary();

  const operationalSignals = useMemo<MonitoringSignal[]>(() => {
    const signals: MonitoringSignal[] = [
      {
        id: 'modules-api',
        title: 'API de módulos',
        description: isApiError
          ? 'A consulta de módulos retornou erro. Verificar backend antes de novas integrações.'
          : 'A API de módulos está respondendo para o painel empresarial.',
        status: isApiError ? 'offline' : isModulesLoading ? 'attention' : 'healthy',
        source: 'workspace.modules',
      },
      {
        id: 'active-modules',
        title: 'Módulos ativos',
        description: `${activeModules.length} módulos ativos de ${allModules.length || activeModules.length} cadastrados.`,
        status: activeModules.length > 0 ? 'healthy' : 'attention',
        source: 'Navigation Registry',
      },
      {
        id: 'features',
        title: 'Features habilitadas',
        description: `${activeFeatures.length} recursos ativos disponíveis para a organização.`,
        status: activeFeatures.length > 0 ? 'healthy' : 'attention',
        source: 'Feature Registry',
      },
      {
        id: 'session-health',
        title: 'Sessão e identidade',
        description: `Score de sessão em ${sessionHealth.score}% com origem ${sessionHealth.source || 'não validada'}.`,
        status: sessionHealth.status === 'critical'
          ? 'offline'
          : sessionHealth.status === 'attention'
            ? 'attention'
            : 'healthy',
        source: 'Session Health',
      },
      {
        id: 'access-control-health',
        title: 'Autorização backend',
        description: `Score RBAC em ${accessControl.score}% com ${accessControl.coverage.routeRules} regra(s) de rota protegida(s).`,
        status: accessControl.status === 'critical'
          ? 'offline'
          : accessControl.status === 'attention'
            ? 'attention'
            : 'healthy',
        source: 'Authorization Policy',
      },
      {
        id: 'persistence-runtime-health',
        title: 'Persistência em execução',
        description: `Score de persistência em ${persistenceHealth.score}%, schema em ${persistenceHealth.schemaReadinessScore}% e fallback ${persistenceHealth.fallbackPolicy.enabled ? 'habilitado' : 'desabilitado'}.`,
        status: persistenceHealth.status === 'critical'
          ? 'offline'
          : persistenceHealth.status === 'attention'
            ? 'attention'
            : 'healthy',
        source: 'Persistence Health',
      },
      {
        id: 'runtime-configuration-health',
        title: 'Configuração de ambiente',
        description: `Score de configuração em ${runtimeConfiguration.score}% com ${runtimeConfiguration.missingVariables} variável(is) pública(s) ausente(s).`,
        status: runtimeConfiguration.productionBlocked
          ? 'offline'
          : runtimeConfiguration.score >= 75
            ? 'healthy'
            : 'attention',
        source: 'Runtime Configuration',
      },
      {
        id: 'service-level-health',
        title: 'SLA operacional',
        description: `Score de SLA em ${clientServiceLevelSummary.score}% com ${clientServiceLevelSummary.highSeverityBreaches} violação(ões) críticas.`,
        status: clientServiceLevelSummary.highSeverityBreaches > 0
          ? 'offline'
          : clientServiceLevelSummary.totalBreaches > 0
            ? 'attention'
            : 'healthy',
        source: 'Client Service Level',
      },
      {
        id: 'observability-health',
        title: 'Observabilidade e auditoria',
        description: `Score de observabilidade em ${observabilitySummary.score}% com ${observabilitySummary.criticalIssues} problema(s) crítico(s).`,
        status: observabilitySummary.status === 'critical'
          ? 'offline'
          : observabilitySummary.status === 'attention'
            ? 'attention'
            : 'healthy',
        source: 'Observability Service',
      },
      {
        id: 'production-readiness',
        title: 'Prontidão de produção',
        description: `Score de produção em ${productionReadiness.score}% com ${productionReadiness.blockedAreas} bloqueio(s).`,
        status: productionReadiness.status === 'blocked'
          ? 'offline'
          : productionReadiness.status === 'attention'
            ? 'attention'
            : 'healthy',
        source: 'Production Readiness',
      },
      {
        id: 'integrations-readiness',
        title: 'Integrações externas',
        description: `${integrationReadinessSummary.totalProviders} provedores mapeados; score de prontidão em ${integrationReadinessSummary.readinessScore}%.`,
        status: integrationReadinessSummary.offlineProviders > 0
          ? 'offline'
          : integrationReadinessSummary.readinessScore >= 70
            ? 'healthy'
            : 'attention',
        source: 'Integration Registry',
      },
      {
        id: 'repository-health',
        title: 'Persistência dos repositórios',
        description: `Score de persistência em ${RepositoryHealthService.getReadinessScore()}%.`,
        status: RepositoryHealthService.getReadinessScore() >= 70 ? 'healthy' : 'attention',
        source: 'Repository Health',
      },
      {
        id: 'projects',
        title: 'Projetos operacionais',
        description: `${activeProjectsCount} projetos ativos em ${projects.length} projetos cadastrados.`,
        status: projects.length > 0 ? 'healthy' : 'attention',
        source: 'Workspace Context',
      },
      {
        id: 'tasks',
        title: 'Fila de tarefas',
        description: `${pendingTasksCount} tarefas pendentes em ${tasks.length} tarefas registradas.`,
        status: pendingTasksCount > 10 ? 'attention' : 'healthy',
        source: 'Task Engine',
      },
      {
        id: 'knowledge',
        title: 'Base de conhecimento',
        description: `${totalMemories} memórias e ${totalDecisions} decisões disponíveis para contexto operacional.`,
        status: totalMemories + totalDecisions > 0 ? 'healthy' : 'attention',
        source: 'Memory OS inicial',
      },
    ];

    return signals;
  }, [
    sessionHealth.score,
    sessionHealth.source,
    sessionHealth.status,
    accessControl.coverage.routeRules,
    accessControl.score,
    accessControl.status,
    activeFeatures.length,
    activeModules.length,
    activeProjectsCount,
    allModules.length,
    isApiError,
    isModulesLoading,
    pendingTasksCount,
    projects.length,
    tasks.length,
    clientExecutiveSummary.executiveScore,
    clientExecutiveSummary.operatingPressure,
    productionReadiness.blockedAreas,
    productionReadiness.score,
    productionReadiness.status,
    clientExecutiveSummary.readinessLevel,
    totalDecisions,
    totalMemories,
  ]);

  const healthySignals = operationalSignals.filter((signal) => signal.status === 'healthy').length;
  const attentionSignals = operationalSignals.filter((signal) => signal.status === 'attention').length;
  const offlineSignals = operationalSignals.filter((signal) => signal.status === 'offline').length;

  const platformHealthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (healthySignals / Math.max(operationalSignals.length, 1)) * 100 -
          offlineSignals * 12 -
          attentionSignals * 4
      )
    )
  );

  const betaMonitoringQueue = useMemo(() => {
    const queue = operationalSignals
      .filter((signal) => signal.status !== 'healthy')
      .map((signal) => ({
        id: signal.id,
        title: signal.status === 'offline' ? `Corrigir ${signal.title}` : `Revisar ${signal.title}`,
        description: signal.description,
        priority: signal.status === 'offline' ? 'alta' : 'média',
        taskTitle: `[Monitoramento] ${signal.status === 'offline' ? 'Corrigir' : 'Revisar'} ${signal.title}: ${signal.description}`,
      }));

    sessionHealth.issues
      .slice(0, 4)
      .forEach((issue) => {
        queue.push({
          id: `session-health-queue-${issue.id}`,
          title: issue.title,
          description: issue.description,
          priority: issue.priority === 'alta' ? 'alta' : 'média',
          taskTitle: issue.taskTitle,
        });
      });

    accessControl.issues
      .slice(0, 4)
      .forEach((issue) => {
        queue.push({
          id: `access-control-queue-${issue.id}`,
          title: issue.title,
          description: issue.description,
          priority: issue.priority === 'alta' ? 'alta' : 'média',
          taskTitle: issue.taskTitle,
        });
      });

    persistenceHealth.issues
      .slice(0, 4)
      .forEach((issue) => {
        queue.push({
          id: `persistence-health-queue-${issue.id}`,
          title: issue.title,
          description: issue.description,
          priority: issue.priority === 'alta' ? 'alta' : 'média',
          taskTitle: issue.taskTitle,
        });
      });

    runtimeConfiguration.issues
      .slice(0, 4)
      .forEach((issue) => {
        queue.push({
          id: `runtime-config-queue-${issue.id}`,
          title: issue.title,
          description: issue.description,
          priority: issue.priority === 'alta' ? 'alta' : 'média',
          taskTitle: issue.taskTitle,
        });
      });

    clientServiceLevelSummary.items
      .slice(0, 4)
      .forEach((item) => {
        queue.push({
          id: `service-level-queue-${item.id}`,
          title: item.title,
          description: item.description,
          priority: item.severity === 'alta' ? 'alta' : 'média',
          taskTitle: item.taskTitle,
        });
      });

    operationalIncidents.incidents
      .filter((incident) => incident.status !== 'resolved')
      .slice(0, 4)
      .forEach((incident) => {
        queue.push({
          id: `incident-queue-${incident.id}`,
          title: incident.title,
          description: `${incident.description} · ${incident.status}`,
          priority:
            incident.severity === 'critical' ||
            incident.severity === 'high'
              ? 'alta'
              : 'média',
          taskTitle: `[Incidente] ${incident.title}`,
        });
      });

    observabilitySummary.issues
      .slice(0, 4)
      .forEach((issue) => {
        queue.push({
          id: `observability-queue-${issue.id}`,
          title: issue.title,
          description: issue.description,
          priority: issue.priority === 'alta' ? 'alta' : 'média',
          taskTitle: issue.taskTitle,
        });
      });

    productionReadiness.areas
      .filter((area) => area.status !== 'ready')
      .slice(0, 4)
      .forEach((area) => {
        queue.push({
          id: `production-queue-${area.id}`,
          title: area.title,
          description: area.description,
          priority: area.priority === 'alta' ? 'alta' : 'média',
          taskTitle: area.taskTitle,
        });
      });

    integrationReadinessSummary.healthSignals
      .filter((signal) => signal.status !== 'ready')
      .slice(0, 4)
      .forEach((signal) => {
        queue.push({
          id: `integration-queue-${signal.id}`,
          title: signal.title,
          description: signal.description,
          priority: signal.priority === 'alta' ? 'alta' : 'média',
          taskTitle: signal.taskTitle,
        });
      });

    if (queue.length === 0) {
      queue.push({
        id: 'baseline',
        title: 'Preparar observabilidade avançada',
        description: 'A plataforma está operacional. Próximo passo: logs estruturados, métricas de API, auditoria e monitoramento de integrações externas.',
        priority: 'média',
        taskTitle: '[Monitoramento] Preparar observabilidade avançada da plataforma',
      });
    }

    return queue;
  }, [clientExecutiveSummary.nextMilestone, clientExecutiveSummary.readinessLevel, integrationReadinessSummary.healthSignals, sessionHealth.issues, accessControl.issues, clientServiceLevelSummary.items, observabilitySummary.issues, operationalIncidents.incidents, operationalSignals, persistenceHealth.issues, productionReadiness.areas, runtimeConfiguration.issues]);

  const registerIncident = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!incidentTitle.trim() || !incidentDescription.trim()) return;

    await operationalIncidents.createIncident({
      title: incidentTitle.trim(),
      description: incidentDescription.trim(),
      source: 'monitoring-workspace',
      severity: incidentSeverity,
      owner: 'Equipe Oi Beta',
    });

    setIncidentTitle('');
    setIncidentDescription('');
    setIncidentSeverity('medium');
  };

  const handleCreateMonitoringTask = async (item: { id: string; taskTitle: string }) => {
    setCreatingMonitoringTaskId(item.id);

    try {
      await createTask(item.taskTitle);
    } finally {
      setCreatingMonitoringTaskId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.15),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-emerald-300 font-black">
              Oi Beta / Monitoramento
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Activity className="w-7 h-7 text-emerald-300" />
              Monitoramento
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área para acompanhar saúde operacional da plataforma, disponibilidade de módulos, sinais de atenção, filas internas e preparação para observabilidade real.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-emerald-200 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Beta no monitoramento
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Eu observo sinais operacionais, destaco riscos e ajudo a priorizar correções antes que afetem vendas, implantação ou suporte.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <MonitoringMetricCard icon={<Gauge className="w-4 h-4" />} label="Saúde" value={`${platformHealthScore}%`} helper="Sinais internos" />
        <MonitoringMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Incidentes" value={operationalIncidents.summary.open + operationalIncidents.summary.investigating + operationalIncidents.summary.mitigated} helper={`${operationalIncidents.summary.criticalOpen} críticos`} />
        <MonitoringMetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Resposta" value={`${operationalIncidents.summary.readinessScore}%`} helper={`${operationalIncidents.summary.automatedActive} automáticos`} />
        <MonitoringMetricCard icon={<AlertCircle className="w-4 h-4" />} label="Falhas" value={offlineSignals} helper="Indisponíveis" />
        <MonitoringMetricCard icon={<Layers3 className="w-4 h-4" />} label="API / 5 min" value={observabilitySummary.runtimeRequestCount} helper="Requisições" />
        <MonitoringMetricCard icon={<GitBranch className="w-4 h-4" />} label="Erro API" value={`${observabilitySummary.runtimeErrorRate}%`} helper="Respostas 5xx" />
        <MonitoringMetricCard icon={<Clock3 className="w-4 h-4" />} label="Latência P95" value={`${Math.round(observabilitySummary.runtimeP95DurationMs)} ms`} helper={`${observabilitySummary.runtimeSlowRequestCount} lentas`} />
        <MonitoringMetricCard icon={<Database className="w-4 h-4" />} label="Memória" value={`${observabilitySummary.runtimeMemoryUsageMb} MB`} helper="RSS do backend" />
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
              Resposta operacional
            </span>
            <h2 className="text-lg font-black text-[var(--text-main)] mt-1">
              Incidentes operacionais
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Registro persistente, triagem, escalonamento e alertas para os responsáveis da organização.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void operationalIncidents.synchronizeDetected()}
              disabled={operationalIncidents.isSaving}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-black text-red-200 disabled:opacity-50"
            >
              Sincronizar telemetria
            </button>
            <button
              type="button"
              onClick={() => void operationalIncidents.refresh()}
              disabled={operationalIncidents.isLoading}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[11px] font-black text-[var(--text-main)] disabled:opacity-50"
            >
              Atualizar incidentes
            </button>
          </div>
        </div>

        <form
          onSubmit={registerIncident}
          className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_180px_auto] gap-3"
        >
          <input
            value={incidentTitle}
            onChange={(event) => setIncidentTitle(event.target.value)}
            placeholder="Título do incidente"
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
          />
          <input
            value={incidentDescription}
            onChange={(event) => setIncidentDescription(event.target.value)}
            placeholder="Descrição objetiva"
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
          />
          <select
            value={incidentSeverity}
            onChange={(event) =>
              setIncidentSeverity(
                event.target.value as
                  | 'critical'
                  | 'high'
                  | 'medium'
                  | 'low',
              )
            }
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
          >
            <option value="critical">Crítico</option>
            <option value="high">Alto</option>
            <option value="medium">Médio</option>
            <option value="low">Baixo</option>
          </select>
          <button
            type="submit"
            disabled={
              operationalIncidents.isSaving ||
              !incidentTitle.trim() ||
              !incidentDescription.trim()
            }
            className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            Registrar
          </button>
        </form>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MonitoringMetricCard
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Alertas"
            value={incidentEscalations.summary.totalAlerts}
            helper="Gerados"
          />
          <MonitoringMetricCard
            icon={<AlertCircle className="w-4 h-4" />}
            label="Não lidos"
            value={incidentEscalations.summary.unreadAlerts}
            helper="Pendentes"
          />
          <MonitoringMetricCard
            icon={<ShieldCheck className="w-4 h-4" />}
            label="Críticos"
            value={incidentEscalations.summary.criticalAlerts}
            helper="Escalação crítica"
          />
          <MonitoringMetricCard
            icon={<GitBranch className="w-4 h-4" />}
            label="Incidentes"
            value={incidentEscalations.summary.affectedIncidents}
            helper="Com alertas"
          />
          <MonitoringMetricCard
            icon={<Gauge className="w-4 h-4" />}
            label="Escalonamento"
            value={`${incidentEscalations.summary.readinessScore}%`}
            helper="Prontidão"
          />
        </div>

        {operationalIncidents.error || incidentEscalations.error ? (
          <p className="text-xs text-red-300">
            {operationalIncidents.error || incidentEscalations.error}
          </p>
        ) : operationalIncidents.incidents.length === 0 ? (
          <p className="text-xs text-emerald-300">
            Nenhum incidente operacional registrado.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {operationalIncidents.incidents.slice(0, 8).map((incident) => (
              <article
                key={incident.id}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-[var(--text-main)]">
                      {incident.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      {incident.description}
                    </p>
                  </div>
                  <span className={`text-[9px] uppercase font-mono font-black ${
                    incident.severity === 'critical'
                      ? 'text-red-300'
                      : incident.severity === 'high'
                        ? 'text-orange-300'
                        : incident.severity === 'medium'
                          ? 'text-amber-300'
                          : 'text-sky-300'
                  }`}>
                    {incident.severity}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">
                  <span>{incident.source}</span>
                  <span>{incident.automated ? 'Detecção automática' : 'Registro manual'}</span>
                  <span>{incident.occurrenceCount} ocorrência(s)</span>
                  <span>{incident.owner || 'Sem responsável'}</span>
                  <span>{new Date(incident.openedAt).toLocaleString('pt-BR')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <select
                    value={incident.status}
                    disabled={operationalIncidents.isSaving}
                    onChange={(event) =>
                      void operationalIncidents.updateIncident(
                        incident.id,
                        {
                          status: event.target.value as
                            | 'open'
                            | 'investigating'
                            | 'mitigated'
                            | 'resolved',
                        },
                      )
                    }
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[11px] text-[var(--text-main)]"
                  >
                    <option value="open">Aberto</option>
                    <option value="investigating">Em investigação</option>
                    <option value="mitigated">Mitigado</option>
                    <option value="resolved">Resolvido</option>
                  </select>

                  <button
                    type="button"
                    disabled={
                      incident.status === 'resolved' ||
                      incidentEscalations.isSaving
                    }
                    onClick={() =>
                      void incidentEscalations
                        .escalate(incident.id)
                        .then(() => operationalIncidents.refresh())
                    }
                    className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] font-black text-orange-200 disabled:opacity-50"
                  >
                    Escalar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <NotificationCenterPanel />

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Sinais operacionais
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Estado atual da plataforma</h2>
            </div>

            <button
              type="button"
              onClick={() => void fetchModulesAndFeatures()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs font-black text-[var(--text-main)] hover:border-emerald-500/50 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar módulos
            </button>
          </div>

          <div className="space-y-3">
            {operationalSignals.map((signal) => (
              <MonitoringSignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Fila da Beta
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Ações recomendadas</h2>
            </div>

            <div className="space-y-3">
              {betaMonitoringQueue.map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-[var(--text-main)]">{item.title}</h3>
                    <span className={`text-[10px] uppercase font-mono font-black ${item.priority === 'alta' ? 'text-red-300' : 'text-amber-300'}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{item.description}</p>

                  <button
                    type="button"
                    onClick={() => void handleCreateMonitoringTask(item)}
                    disabled={creatingMonitoringTaskId === item.id}
                    className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingMonitoringTaskId === item.id ? 'Criando tarefa...' : 'Criar tarefa'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Próxima camada
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Observabilidade real</h2>
            </div>

            <div className="space-y-2">
              {[
                ['Logs estruturados', ServerCog],
                ['Auditoria de ações', ShieldCheck],
                ['Métricas de API', Router],
                ['Disponibilidade externa', Wifi],
                ['Uso de armazenamento', HardDrive],
              ].map(([label, Icon]) => {
                const TypedIcon = Icon as typeof ServerCog;

                return (
                  <div key={label as string} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 px-3 py-2.5">
                    <TypedIcon className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="text-xs font-bold text-[var(--text-main)]">{label as string}</span>
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

function MonitoringMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
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

function MonitoringSignalCard({ signal }: { signal: MonitoringSignal }) {
  const Icon = signal.status === 'healthy'
    ? CheckCircle2
    : signal.status === 'offline'
      ? AlertCircle
      : AlertTriangle;

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black text-[var(--text-main)]">{signal.title}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{signal.description}</p>
            <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] mt-3 block">
              Fonte: {signal.source}
            </span>
          </div>
        </div>

        <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border whitespace-nowrap ${STATUS_CLASSES[signal.status]}`}>
          {STATUS_LABELS[signal.status]}
        </span>
      </div>
    </article>
  );
}
