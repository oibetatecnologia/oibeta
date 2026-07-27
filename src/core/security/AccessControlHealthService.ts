import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { TenantPersistenceContext } from '../persistence/TenantPersistence';
import {
  PermissionPolicyService,
  type PlatformPermissionAction,
} from './PermissionPolicyService';
import type {
  AccessControlHealth,
  AccessControlSummary,
} from './AccessControlHealthTypes';
import type { PlatformUserProfile } from '../users/UserRegistry';

const ACCESS_HEALTH_ENDPOINT = '/api/security/access-health';

const EMPTY_COVERAGE = {
  profiles: 0,
  permissions: 0,
  routeRules: 0,
  protectedDomains: [],
};

export class AccessControlHealthService {
  static async loadSummary(
    context: Partial<TenantPersistenceContext>,
    expectedProfile: PlatformUserProfile,
  ): Promise<AccessControlSummary> {
    try {
      const health = await HttpRepositoryClient.get<AccessControlHealth>(
        ACCESS_HEALTH_ENDPOINT,
        context,
      );

      return this.buildSummary(health, expectedProfile);
    } catch (error) {
      return this.buildSummary(
        {
          authenticated: false,
          permissions: [],
          coverage: EMPTY_COVERAGE,
          checkedAt: new Date().toISOString(),
        },
        expectedProfile,
        error,
      );
    }
  }

  static buildSummary(
    health: AccessControlHealth,
    expectedProfile: PlatformUserProfile,
    error?: unknown,
  ): AccessControlSummary {
    const expectedPermissions =
      PermissionPolicyService.getPermissions(expectedProfile);
    const missingExpectedPermissions = expectedPermissions.filter(
      (permission) => !health.permissions.includes(permission),
    );

    const profileMatches =
      health.profile === expectedProfile ||
      (expectedProfile === 'master_admin' && health.profile === 'tenant_admin');

    const score = !health.authenticated
      ? 20
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              55 +
                (profileMatches ? 20 : 0) +
                Math.min(15, health.coverage.routeRules * 2) +
                Math.min(10, health.coverage.protectedDomains.length * 2) -
                missingExpectedPermissions.length * 8,
            ),
          ),
        );

    const issues: AccessControlSummary['issues'] = [];

    if (!health.authenticated) {
      issues.push({
        id: 'access-session-missing',
        title: 'Sessão backend não validada',
        description:
          error instanceof Error
            ? error.message
            : 'O backend não confirmou a sessão atual.',
        priority: 'alta',
        targetTab: 'users',
        taskTitle: '[Segurança] Validar sessão backend do usuário atual',
      });
    }

    if (health.authenticated && !profileMatches) {
      issues.push({
        id: 'access-profile-mismatch',
        title: 'Perfil divergente entre frontend e backend',
        description: `Frontend espera ${expectedProfile}, mas o backend retornou ${health.profile || 'desconhecido'}.`,
        priority: 'alta',
        targetTab: 'users',
        taskTitle: '[Segurança] Alinhar perfil do usuário entre frontend e backend',
      });
    }

    if (missingExpectedPermissions.length > 0) {
      issues.push({
        id: 'access-permissions-missing',
        title: 'Permissões esperadas não concedidas',
        description: `${missingExpectedPermissions.length} permissão(ões) esperada(s) não foram confirmadas pelo backend.`,
        priority: 'alta',
        targetTab: 'users',
        taskTitle: '[Segurança] Revisar matriz de permissões backend',
      });
    }

    if (health.coverage.routeRules < 4) {
      issues.push({
        id: 'access-route-coverage-low',
        title: 'Cobertura de rotas protegidas ainda baixa',
        description: `${health.coverage.routeRules} regra(s) de rota foram registradas.`,
        priority: 'média',
        targetTab: 'platform_monitoring',
        taskTitle: '[Segurança] Ampliar cobertura RBAC das rotas operacionais',
      });
    }

    return {
      ...health,
      score,
      status:
        issues.some((issue) => issue.priority === 'alta') || score < 50
          ? 'critical'
          : issues.length > 0 || score < 80
            ? 'attention'
            : 'healthy',
      missingExpectedPermissions,
      issues,
    };
  }
}
