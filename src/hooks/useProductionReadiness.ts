import { useMemo } from 'react';
import useAccessControlHealth from './useAccessControlHealth';
import useAdminAccessReviews from './useAdminAccessReviews';
import useTenantCommercialContracts from './useTenantCommercialContracts';
import useCustomerOperations from './useCustomerOperations';
import useBetaGovernance from './useBetaGovernance';
import useReleaseCandidateCertifications from './useReleaseCandidateCertifications';
import useSessionHealth from './useSessionHealth';
import useDeploymentEnvironments from './useDeploymentEnvironments';
import useDeploymentConfiguration from './useDeploymentConfiguration';
import useDeploymentConnectivity from './useDeploymentConnectivity';
import useDeploymentValidations from './useDeploymentValidations';
import useDeploymentReleaseApprovals from './useDeploymentReleaseApprovals';
import useDeploymentReleaseExecutions from './useDeploymentReleaseExecutions';
import useDeploymentReleaseLifecycles from './useDeploymentReleaseLifecycles';
import useOperationalIncidents from './useOperationalIncidents';
import useIncidentEscalations from './useIncidentEscalations';
import { useNotificationCenterContext } from '../contexts/notifications/NotificationCenterContext';
import { usePlatformContext } from '../contexts/platform/usePlatformContext';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';
import { RuntimeConfigurationService } from '../core/configuration/RuntimeConfigurationService';
import { IntegrationReadinessService } from '../core/integrations/IntegrationReadinessService';
import { OrganizationService } from '../core/organization/OrganizationService';
import { CURRENT_PRODUCTION_BASELINE } from '../core/production/ProductionBaselineRegistry';
import { ProductionReadinessService } from '../core/production/ProductionReadinessService';
import { TenantService } from '../core/tenants/TenantService';
import { UserService } from '../core/users/UserService';

export default function useProductionReadiness() {
  const platform = usePlatformContext();
  const workspace = useWorkspace();
  const accessControl = useAccessControlHealth();
  const adminGovernance = useAdminAccessReviews(20);
  const commercialContracts = useTenantCommercialContracts();
  const customerOperations = useCustomerOperations();
  const betaGovernance = useBetaGovernance();
  const releaseCandidateCertification = useReleaseCandidateCertifications(50);
  const sessionHealth = useSessionHealth();
  const deployment = useDeploymentEnvironments(
    platform.currentTenant.organizationId,
  );
  const deploymentConfiguration = useDeploymentConfiguration();
  const deploymentConnectivity = useDeploymentConnectivity();
  const deploymentValidation = useDeploymentValidations(50);
  const deploymentReleaseApproval =
    useDeploymentReleaseApprovals(100);
  const deploymentReleaseExecution =
    useDeploymentReleaseExecutions(100);
  const deploymentReleaseLifecycle =
    useDeploymentReleaseLifecycles(100);
  const incidents = useOperationalIncidents(100);
  const escalations = useIncidentEscalations(100);
  const notifications = useNotificationCenterContext();

  const currentProject = platform.projects.find(
    (project) => project.id === platform.selectedProjectId,
  );

  return useMemo(() => {
    const runtimeConfiguration = RuntimeConfigurationService.buildSummary();
    const integrationSummary = IntegrationReadinessService.buildSummary();
    const tenantSnapshot = TenantService.buildOperationalSnapshot({
      organizationId: platform.currentTenant.organizationId,
      workspaceId: platform.currentTenant.workspaceId,
      selectedProjectName: currentProject?.name,
    });
    const userSnapshot = UserService.buildOperationalSnapshot({
      tenantId: platform.currentTenant.id,
      organizationId: platform.currentTenant.organizationId,
      currentUser: platform.currentUser,
      availableProducts: platform.availableProducts,
    });
    const organizationSnapshot = OrganizationService.buildOperationalSnapshot({
      tenantId: platform.currentTenant.id,
    });

    return ProductionReadinessService.buildSummary({
      sessionHealth,
      accessControl,
      adminGovernance: adminGovernance.overview,
      commercialContracts: commercialContracts.summary,
      customerOperations: customerOperations.summary,
      betaGovernance: betaGovernance.summary,
      releaseCandidateCertification: releaseCandidateCertification.summary,
      runtimeConfiguration,
      deploymentConfiguration: deploymentConfiguration.summary,
      deploymentConnectivity: deploymentConnectivity.summary,
      deploymentValidation: deploymentValidation.summary,
      deploymentReleaseApproval:
        deploymentReleaseApproval.summary,
      deploymentReleaseExecution:
        deploymentReleaseExecution.summary,
      deploymentReleaseLifecycle:
        deploymentReleaseLifecycle.summary,
      deploymentSummary: deployment.summary,
      incidentSummary: incidents.summary,
      escalationSummary: escalations.summary,
      notificationSummary: notifications.summary,
      notificationDeliverySummary:
        notifications.deliverySummary,
      notificationRetryRunSummary:
        notifications.retryRunSummary,
      notificationMaintenanceSummary:
        notifications.maintenanceSummary,
      notificationMaintenanceSchedulerEnabled:
        notifications.maintenanceScheduler.enabled,
      notificationPreferenceConfigured:
        Boolean(notifications.preference),
      integrationSummary,
      tenantSnapshot,
      userSnapshot,
      organizationSnapshot,
      productAccessCoverage: platform.productAccessCoverage,
      availableProductsCount: platform.availableProducts.length,
      unavailableProductsCount: platform.unavailableProducts.length,
      activeModulesCount: workspace.modules.activeModules.length,
      activeFeaturesCount: workspace.modules.activeFeatures.length,
      isApiError: workspace.modules.isApiError,
      productionEnvironmentReady: CURRENT_PRODUCTION_BASELINE.productionEnvironmentReady,
      buildApproved: CURRENT_PRODUCTION_BASELINE.buildApproved,
      lintApproved: CURRENT_PRODUCTION_BASELINE.lintApproved,
    });
  }, [
    accessControl,
    adminGovernance.overview,
    commercialContracts.summary,
    customerOperations.summary,
    betaGovernance.summary,
    releaseCandidateCertification.summary,
    sessionHealth,
    currentProject?.name,
    deployment.summary,
    deploymentConfiguration.summary,
    deploymentConnectivity.summary,
    deploymentValidation.summary,
    deploymentReleaseApproval.summary,
    deploymentReleaseExecution.summary,
    deploymentReleaseLifecycle.summary,
    incidents.summary,
    escalations.summary,
    notifications.summary,
    notifications.deliverySummary,
    notifications.retryRunSummary,
    notifications.maintenanceSummary,
    notifications.maintenanceScheduler.enabled,
    notifications.preference,
    platform.availableProducts,
    platform.productAccessCoverage,
    platform.unavailableProducts.length,
    platform.currentTenant.id,
    platform.currentTenant.organizationId,
    platform.currentTenant.workspaceId,
    platform.currentUser,
    workspace.modules.activeFeatures.length,
    workspace.modules.activeModules.length,
    workspace.modules.isApiError,
  ]);
}
