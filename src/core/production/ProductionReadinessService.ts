import type { RuntimeConfigurationSummary } from '../configuration/RuntimeConfigurationTypes';
import type { DeploymentConfigurationSummary } from '../configuration/DeploymentConfigurationTypes';
import type { DeploymentConnectivitySummary } from '../configuration/DeploymentConnectivityTypes';
import type { DeploymentValidationSummary } from '../configuration/DeploymentValidationTypes';
import type { DeploymentReleaseApprovalSummary } from '../configuration/DeploymentReleaseApprovalTypes';
import type { DeploymentReleaseExecutionSummary } from '../configuration/DeploymentReleaseExecutionTypes';
import type { DeploymentReleaseLifecycleSummary } from '../configuration/DeploymentReleaseLifecycleTypes';
import type { DeploymentEnvironmentSummary } from '../deployment/DeploymentEnvironmentTypes';
import type { OperationalIncidentSummary } from '../observability/OperationalIncidentTypes';
import type { IncidentEscalationSummary } from '../observability/IncidentEscalationTypes';
import type { NotificationCenterSummary } from '../notifications/NotificationCenterTypes';
import type { NotificationDeliverySummary } from '../notifications/NotificationDeliveryTypes';
import type { NotificationRetryRunSummary } from '../notifications/NotificationRetryRunTypes';
import type { NotificationMaintenanceSummary } from '../notifications/NotificationMaintenanceTypes';
import type { SessionHealthSummary } from '../auth/SessionHealthTypes';
import type { AccessControlSummary } from '../security/AccessControlHealthTypes';
import type { AdminGovernanceOverview } from '../admin/AdminAccessReviewTypes';
import type { TenantCommercialContractSummary } from '../commercial/TenantCommercialContractTypes';
import type { CustomerOperationsSummary } from '../customerOperations/CustomerOperationsTypes';
import type { BetaGovernanceSummary } from '../betaGovernance/BetaGovernanceTypes';
import type { ReleaseCandidateCertificationSummary } from './ReleaseCandidateCertificationTypes';
import type { IntegrationReadinessSummary } from '../integrations/IntegrationTypes';
import { PersistenceFallbackPolicyService } from '../persistence/PersistenceFallbackPolicyService';
import { RepositoryHealthService } from '../persistence/RepositoryHealthService';
import type { UserOperationalSnapshot } from '../users/UserService';
import type { TenantOperationalSnapshot } from '../tenants/TenantService';
import type { OrganizationOperationalSnapshot } from '../organization/OrganizationService';
import { PermissionPolicyService } from '../security/PermissionPolicyService';
import type {
  ProductionReadinessArea,
  ProductionReadinessStatus,
  ProductionReadinessSummary,
} from './ProductionReadinessTypes';

export interface ProductionReadinessInput {
  sessionHealth: SessionHealthSummary;
  accessControl: AccessControlSummary;
  adminGovernance?: AdminGovernanceOverview;
  commercialContracts: TenantCommercialContractSummary;
  customerOperations: CustomerOperationsSummary;
  betaGovernance: BetaGovernanceSummary;
  releaseCandidateCertification: ReleaseCandidateCertificationSummary;
  runtimeConfiguration: RuntimeConfigurationSummary;
  deploymentConfiguration: DeploymentConfigurationSummary;
  deploymentConnectivity: DeploymentConnectivitySummary;
  deploymentValidation: DeploymentValidationSummary;
  deploymentReleaseApproval: DeploymentReleaseApprovalSummary;
  deploymentReleaseExecution: DeploymentReleaseExecutionSummary;
  deploymentReleaseLifecycle: DeploymentReleaseLifecycleSummary;
  deploymentSummary: DeploymentEnvironmentSummary;
  incidentSummary: OperationalIncidentSummary;
  escalationSummary: IncidentEscalationSummary;
  notificationSummary: NotificationCenterSummary;
  notificationDeliverySummary: NotificationDeliverySummary;
  notificationRetryRunSummary: NotificationRetryRunSummary;
  notificationMaintenanceSummary: NotificationMaintenanceSummary;
  notificationMaintenanceSchedulerEnabled: boolean;
  notificationPreferenceConfigured: boolean;
  integrationSummary: IntegrationReadinessSummary;
  userSnapshot: UserOperationalSnapshot;
  tenantSnapshot: TenantOperationalSnapshot;
  organizationSnapshot: OrganizationOperationalSnapshot;
  productAccessCoverage: number;
  availableProductsCount: number;
  unavailableProductsCount: number;
  activeModulesCount: number;
  activeFeaturesCount: number;
  isApiError: boolean;
  productionEnvironmentReady: boolean;
  buildApproved: boolean;
  lintApproved: boolean;
}

export class ProductionReadinessService {
  static buildSummary(input: ProductionReadinessInput): ProductionReadinessSummary {
    const permissionSummary = PermissionPolicyService.buildCoverageSummary(input.userSnapshot.users);
    const repositoryScore = RepositoryHealthService.getReadinessScore();
    const fallbackPolicy = PersistenceFallbackPolicyService.getPolicy();

    const areas: ProductionReadinessArea[] = [
      this.area({
        id: 'session-identity',
        title: 'Sessão e identidade',
        description: input.sessionHealth.authenticated
          ? `Sessão confirmada por ${input.sessionHealth.source || 'origem não identificada'}.`
          : 'O backend ainda não confirmou a identidade do usuário atual.',
        score: input.sessionHealth.score,
        targetTab: 'users',
        taskTitle: '[Produção] Validar sessão e identidade backend',
      }),
      this.area({
        id: 'backend-authorization',
        title: 'Autorização backend',
        description: input.accessControl.authenticated
          ? `Perfil ${input.accessControl.profile || 'desconhecido'} confirmado com ${input.accessControl.coverage.routeRules} regra(s) de rota.`
          : 'O backend ainda não confirmou a sessão e as permissões do usuário atual.',
        score: input.accessControl.score,
        targetTab: 'users',
        taskTitle: '[Produção] Validar RBAC e sessão backend',
      }),
      this.area({
        id: 'persistence-cutover',
        title: 'Cutover de persistência',
        description: fallbackPolicy.description,
        score: fallbackPolicy.productionSafe ? 88 : 32,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Validar política de fallback para o cutover',
      }),
      this.area({
        id: 'deployment-environments',
        title: 'Ambientes e publicação',
        description: `${input.deploymentSummary.readyEnvironments} de ${input.deploymentSummary.totalEnvironments} ambiente(s) operacionais; homologação ${input.deploymentSummary.stagingReady ? 'pronta' : 'pendente'} e produção ${input.deploymentSummary.productionReady ? 'ativa' : 'pendente'}.`,
        score: input.deploymentSummary.readinessScore,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Aprovar homologação e publicação de produção',
      }),
      this.area({
        id: 'incident-response',
        title: 'Resposta a incidentes',
        description: `${input.incidentSummary.open + input.incidentSummary.investigating + input.incidentSummary.mitigated} incidente(s) ativo(s), com ${input.incidentSummary.criticalOpen} crítico(s), ${input.incidentSummary.highOpen} alto(s) e ${input.incidentSummary.automatedActive} detectado(s) automaticamente.`,
        score: input.incidentSummary.readinessScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Resolver incidentes operacionais ativos',
      }),
      this.area({
        id: 'incident-escalation',
        title: 'Escalonamento de incidentes',
        description: `${input.escalationSummary.totalAlerts} alerta(s) gerado(s), ${input.escalationSummary.unreadAlerts} não lido(s) e ${input.escalationSummary.criticalAlerts} crítico(s).`,
        score: input.escalationSummary.readinessScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Tratar alertas de incidentes pendentes',
      }),
      this.area({
        id: 'notification-center',
        title: 'Central de notificações',
        description: `${input.notificationSummary.unread} notificação(ões) não lida(s), ${input.notificationSummary.critical} crítica(s) e ${input.notificationSummary.incidentAlerts} alerta(s) de incidente.`,
        score: input.notificationSummary.readinessScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Tratar notificações operacionais pendentes',
      }),
      this.area({
        id: 'notification-delivery',
        title: 'Entrega de notificações',
        description: `${input.notificationDeliverySummary.deliveryRate}% de entrega, ${input.notificationDeliverySummary.readRate}% de leitura, ${input.notificationDeliverySummary.failed} falha(s), ${input.notificationDeliverySummary.retryableFailed} reprocessável(is) e ${input.notificationDeliverySummary.deadLetter} em dead-letter.`,
        score: input.notificationDeliverySummary.readinessScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Tratar falhas de entrega de notificações',
      }),
      this.area({
        id: 'notification-retry-history',
        title: 'Histórico de reprocessamento',
        description: `${input.notificationRetryRunSummary.totalRuns} execução(ões), ${input.notificationRetryRunSummary.failedRuns} falha(s) e taxa de sucesso de ${input.notificationRetryRunSummary.successRate}%.`,
        score: input.notificationRetryRunSummary.readinessScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Revisar falhas do scheduler de notificações',
      }),
      this.area({
        id: 'notification-maintenance-scheduler',
        title: 'Scheduler de manutenção',
        description: input.notificationMaintenanceSchedulerEnabled
          ? 'Rotina automática de retenção ativa com execução diária.'
          : 'A rotina automática de retenção não está ativa.',
        score: input.notificationMaintenanceSchedulerEnabled ? 100 : 35,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Ativar scheduler de manutenção das notificações',
      }),
      this.area({
        id: 'notification-maintenance',
        title: 'Manutenção das notificações',
        description: `${input.notificationMaintenanceSummary.pendingCleanup} registro(s) candidato(s) à retenção, ${input.notificationMaintenanceSummary.totalRuns} limpeza(s) executada(s) e ${input.notificationMaintenanceSummary.totalRemoved} registro(s) removido(s).`,
        score: input.notificationMaintenanceSummary.readinessScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Executar retenção operacional das notificações',
      }),
      this.area({
        id: 'notification-preferences',
        title: 'Preferências de notificação',
        description: input.notificationPreferenceConfigured
          ? 'Preferências persistentes carregadas para o usuário atual.'
          : 'As preferências de entrega ainda não foram confirmadas.',
        score: input.notificationPreferenceConfigured ? 100 : 45,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Validar preferências de notificações',
      }),
      this.area({
        id: 'deployment-configuration',
        title: 'Configuração backend de deploy',
        description: `${input.deploymentConfiguration.configured} configuração(ões) válidas, ${input.deploymentConfiguration.missing} ausente(s), ${input.deploymentConfiguration.invalid} inválida(s) e ambiente ${input.deploymentConfiguration.environment}.`,
        score: input.deploymentConfiguration.score,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Corrigir configuração Supabase e Vercel',
      }),
      this.area({
        id: 'deployment-connectivity',
        title: 'Conectividade de publicação',
        description: `${input.deploymentConnectivity.healthy} probe(s) saudável(is), ${input.deploymentConnectivity.attention} em atenção, ${input.deploymentConnectivity.critical} crítico(s) e score de ${input.deploymentConnectivity.score}%.`,
        score: input.deploymentConnectivity.score,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Restaurar conectividade Supabase e Vercel',
      }),
      this.area({
        id: 'deployment-validation-history',
        title: 'Gate persistente de publicação',
        description: input.deploymentValidation.latest
          ? `${input.deploymentValidation.totalRuns} validação(ões), último gate ${input.deploymentValidation.latest.status} com score de ${input.deploymentValidation.latest.score}%.`
          : 'Nenhuma validação persistente de publicação foi executada.',
        score: input.deploymentValidation.readinessScore,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Executar e aprovar gate persistente de publicação',
      }),
      this.area({
        id: 'deployment-release-approval',
        title: 'Aprovação formal de release',
        description: input.deploymentReleaseApproval.latest
          ? `${input.deploymentReleaseApproval.total} solicitação(ões), ${input.deploymentReleaseApproval.pending} pendente(s) e produção ${input.deploymentReleaseApproval.productionApproved ? 'aprovada' : 'ainda não aprovada'}.`
          : 'Nenhuma solicitação formal de release foi registrada.',
        score: input.deploymentReleaseApproval.readinessScore,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Aprovar release vinculada ao gate técnico',
      }),
      this.area({
        id: 'deployment-release-execution',
        title: 'Execução aprovada de release',
        description: input.deploymentReleaseExecution.latest
          ? `${input.deploymentReleaseExecution.total} execução(ões), ${input.deploymentReleaseExecution.failed} falha(s), ${input.deploymentReleaseExecution.rolledBack} rollback(s) e produção ${input.deploymentReleaseExecution.productionExecuted ? 'executada' : 'pendente'}.`
          : 'Nenhuma execução de deploy vinculada a uma aprovação foi registrada.',
        score: input.deploymentReleaseExecution.readinessScore,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Executar release aprovada no ambiente correto',
      }),
      this.area({
        id: 'deployment-release-lifecycle',
        title: 'Cutover, pós-deploy e rollback',
        description: input.deploymentReleaseLifecycle.latest
          ? `${input.deploymentReleaseLifecycle.total} ciclo(s), checklist em ${input.deploymentReleaseLifecycle.checklistCompletion}%, evidências em ${input.deploymentReleaseLifecycle.evidenceCompletion}% e produção ${input.deploymentReleaseLifecycle.productionCompleted ? 'encerrada' : 'pendente'}.`
          : 'Nenhum ciclo operacional completo de release foi iniciado.',
        score: input.deploymentReleaseLifecycle.readinessScore,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Concluir cutover e verificação pós-deploy',
      }),
      this.area({
        id: 'admin-access-governance',
        title: 'Governança administrativa de acessos',
        description: input.adminGovernance
          ? `${input.adminGovernance.users} usuário(s), ${input.adminGovernance.pendingDecisions} decisão(ões) pendente(s), ${input.adminGovernance.usersWithoutProducts} sem produtos e ${input.adminGovernance.usersWithoutSuperior} sem superior definido.`
          : 'O diagnóstico de governança administrativa ainda não foi carregado.',
        score: input.adminGovernance?.governanceScore || 35,
        targetTab: 'core_admin',
        taskTitle: '[Produção] Certificar acessos e hierarquia administrativa',
      }),
      this.area({
        id: 'customer-operations',
        title: 'Operação e sucesso do cliente',
        description: `${input.customerOperations.managedClients} de ${input.customerOperations.totalClients} cliente(s) gerenciado(s), ${input.customerOperations.criticalClients} crítico(s), ${input.customerOperations.openRisks} risco(s) aberto(s) e onboarding em ${input.customerOperations.onboardingProgress}%.`,
        score: input.customerOperations.readinessScore,
        targetTab: 'enterprise_clients',
        taskTitle: '[Produção] Consolidar onboarding, suporte e sucesso dos clientes',
      }),
      this.area({
        id: 'commercial-contracts',
        title: 'Contratos, licenças e receita recorrente',
        description: `${input.commercialContracts.active} contrato(s) ativo(s), MRR de ${input.commercialContracts.monthlyRecurringRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, ${input.commercialContracts.expiringIn90Days} vencendo em até 90 dias.`,
        score: input.commercialContracts.readinessScore,
        targetTab: 'finance',
        taskTitle: '[Produção] Consolidar contratos e receita recorrente',
      }),
      this.area({
        id: 'beta-governance',
        title: 'Governança da Beta IA',
        description: `${input.betaGovernance.active} ativo(s), ${input.betaGovernance.automations} automação(ões), ${input.betaGovernance.overdueReviews} revisão(ões) vencida(s) e score de ${input.betaGovernance.governanceScore}%.`,
        score: input.betaGovernance.governanceScore,
        targetTab: 'beta_brain',
        taskTitle: '[Produção] Consolidar conhecimento, memória e automações governadas',
      }),
      this.area({
        id: 'release-candidate-certification',
        title: 'Certificação executiva RC-1',
        description: input.releaseCandidateCertification.latest
          ? `${input.releaseCandidateCertification.latest.version} com ${input.releaseCandidateCertification.controlCoverage}% de cobertura, ${input.releaseCandidateCertification.latest.pendingControls} pendência(s) e ${input.releaseCandidateCertification.latest.blockedControls} bloqueio(s).`
          : 'Nenhuma certificação executiva RC-1 foi iniciada.',
        score: input.releaseCandidateCertification.readinessScore,
        targetTab: 'enterprise_dashboard',
        taskTitle: '[RC-1] Concluir certificação executiva da plataforma',
      }),
      this.area({
        id: 'runtime-configuration',
        title: 'Configuração de ambiente',
        description: `${input.runtimeConfiguration.configuredVariables} de ${input.runtimeConfiguration.totalVariables} variável(is) verificadas no frontend; ${input.runtimeConfiguration.backendRequiredVariables} exigem validação backend.`,
        score: input.runtimeConfiguration.score,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Consolidar variáveis e segredos do ambiente',
      }),
      this.area({
        id: 'quality-gates',
        title: 'Qualidade e build',
        description: input.buildApproved && input.lintApproved
          ? 'Lint e build foram aprovados no ambiente oficial.'
          : 'Os gates de qualidade ainda não foram integralmente aprovados.',
        score: input.buildApproved && input.lintApproved ? 100 : 35,
        targetTab: 'development',
        taskTitle: '[Produção] Aprovar lint e build no ambiente oficial',
      }),
      this.area({
        id: 'tenancy',
        title: 'Contexto multi-tenant',
        description: `${input.tenantSnapshot.summary.totalTenants} tenant(s) normalizados e ${input.tenantSnapshot.summary.licensedProductsCount} produto(s) licenciáveis.`,
        score: input.tenantSnapshot.summary.totalTenants > 0 ? 72 : 25,
        targetTab: 'tenants',
        taskTitle: '[Produção] Consolidar contexto multi-tenant persistente',
      }),
      this.area({
        id: 'product-access',
        title: 'Acesso por produto',
        description: `${input.availableProductsCount} produto(s) disponíveis e ${input.unavailableProductsCount} bloqueado(s) para o usuário atual.`,
        score: input.productAccessCoverage,
        targetTab: 'modules_contracted',
        taskTitle: '[Produção] Validar navegação e workspaces por licença',
      }),
      this.area({
        id: 'permissions',
        title: 'Permissões e delegação',
        description: `${permissionSummary.privilegedUsers} usuário(s) privilegiado(s) e cobertura média de ${permissionSummary.averagePermissionCoverage}%.`,
        score: Math.min(
          88,
          48 +
            permissionSummary.privilegedUsers * 12 +
            permissionSummary.usersWithDelegation * 5 -
            permissionSummary.usersWithoutProducts * 8,
        ),
        targetTab: 'users',
        taskTitle: '[Produção] Validar permissões por perfil, produto e tenant',
      }),
      this.area({
        id: 'organization',
        title: 'Hierarquia organizacional',
        description: `${input.organizationSnapshot.summary.totalUnits} unidade(s), profundidade máxima ${input.organizationSnapshot.summary.maxDepth}.`,
        score: input.organizationSnapshot.summary.totalUnits > 0
          ? Math.min(85, 55 + input.organizationSnapshot.summary.activeUnits * 5)
          : 30,
        targetTab: 'organization',
        taskTitle: '[Produção] Consolidar hierarquia e escopos organizacionais',
      }),
      this.area({
        id: 'persistence',
        title: 'Persistência',
        description: `Prontidão dos repositórios em ${repositoryScore}%.`,
        score: repositoryScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Consolidar persistência definitiva no Supabase',
      }),
      this.area({
        id: 'integrations',
        title: 'Integrações externas',
        description: `${input.integrationSummary.totalProviders} provedor(es) mapeados; prontidão em ${input.integrationSummary.readinessScore}%.`,
        score: input.integrationSummary.readinessScore,
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Configurar integrações externas obrigatórias',
      }),
      this.area({
        id: 'internal-api',
        title: 'APIs internas',
        description: input.isApiError
          ? 'A API interna apresenta erro e bloqueia a prontidão de produção.'
          : `${input.activeModulesCount} módulo(s) e ${input.activeFeaturesCount} recurso(s) ativos.`,
        score: input.isApiError
          ? 20
          : Math.min(90, 55 + input.activeModulesCount * 4 + input.activeFeaturesCount),
        targetTab: 'platform_monitoring',
        taskTitle: '[Produção] Garantir disponibilidade das APIs internas',
      }),
      this.area({
        id: 'production-environment',
        title: 'Ambiente de produção',
        description: input.productionEnvironmentReady
          ? 'Ambiente de produção marcado como operacional.'
          : 'Produção ainda precisa de publicação, segredos e observabilidade.',
        score: input.productionEnvironmentReady ? 100 : 38,
        targetTab: 'client_environments',
        taskTitle: '[Produção] Publicar e validar ambiente de produção',
      }),
    ];

    const score = Math.round(
      areas.reduce((total, area) => total + area.score, 0) /
        Math.max(areas.length, 1),
    );

    const status = this.resolveStatus(score, areas.some((area) => area.status === 'blocked'));
    const orderedAreas = [...areas].sort((a, b) => a.score - b.score);

    return {
      score,
      status,
      readyAreas: areas.filter((area) => area.status === 'ready').length,
      attentionAreas: areas.filter((area) => area.status === 'attention').length,
      blockedAreas: areas.filter((area) => area.status === 'blocked').length,
      nextMilestone: orderedAreas[0]?.description || 'Concluir validação final de produção.',
      areas: orderedAreas,
    };
  }

  private static area(input: {
    id: string;
    title: string;
    description: string;
    score: number;
    targetTab: string;
    taskTitle: string;
  }): ProductionReadinessArea {
    const score = Math.max(0, Math.min(100, Math.round(input.score)));
    const status = this.resolveStatus(score, score < 30);

    return {
      ...input,
      score,
      status,
      priority: status === 'blocked' ? 'alta' : status === 'attention' ? 'média' : 'baixa',
    };
  }

  private static resolveStatus(
    score: number,
    hasBlocker: boolean,
  ): ProductionReadinessStatus {
    if (hasBlocker || score < 45) return 'blocked';
    if (score < 80) return 'attention';
    return 'ready';
  }
}
