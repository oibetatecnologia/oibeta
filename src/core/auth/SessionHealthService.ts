import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { TenantPersistenceContext } from '../persistence/TenantPersistence';
import { ClientSessionStorage } from './ClientSessionStorage';
import type { SessionHealthResponse, SessionHealthSummary } from './SessionHealthTypes';

const SESSION_HEALTH_ENDPOINT = '/api/auth/session-health';

export class SessionHealthService {
  static async loadSummary(context: Partial<TenantPersistenceContext>): Promise<SessionHealthSummary> {
    try {
      return this.buildSummary(
        await HttpRepositoryClient.get<SessionHealthResponse>(SESSION_HEALTH_ENDPOINT, context),
      );
    } catch (error) {
      return this.buildSummary({
        authenticated: false,
        source: 'none',
        tokenRequired: false,
        tokenPresent: Boolean(ClientSessionStorage.getAccessToken()),
        checkedAt: new Date().toISOString(),
      }, error);
    }
  }

  static buildSummary(response: SessionHealthResponse, error?: unknown): SessionHealthSummary {
    const issues: SessionHealthSummary['issues'] = [];

    if (!response.authenticated) {
      issues.push({
        id: 'session-not-authenticated',
        title: 'Sessão backend não autenticada',
        description: error instanceof Error ? error.message : 'O backend não confirmou a identidade do usuário atual.',
        priority: 'alta',
        targetTab: 'users',
        taskTitle: '[Sessão] Restaurar autenticação do usuário atual',
      });
    }

    if (response.tokenRequired && !response.tokenPresent) {
      issues.push({
        id: 'session-token-missing',
        title: 'Token de acesso ausente',
        description: 'O ambiente exige Bearer token, mas o navegador não possui token persistido.',
        priority: 'alta',
        targetTab: 'users',
        taskTitle: '[Sessão] Renovar token de acesso do usuário',
      });
    }

    if (response.authenticated && response.source === 'development_headers') {
      issues.push({
        id: 'session-development-headers',
        title: 'Sessão usando headers de desenvolvimento',
        description: 'A identidade foi resolvida por headers locais, adequada apenas ao ambiente de desenvolvimento.',
        priority: 'média',
        targetTab: 'client_environments',
        taskTitle: '[Sessão] Validar autenticação Supabase no ambiente publicado',
      });
    }

    const score = !response.authenticated ? 20 : response.source === 'supabase' ? 100 : response.source === 'development_headers' ? 72 : 60;

    return {
      ...response,
      score,
      status: issues.some((issue) => issue.priority === 'alta') || score < 50
        ? 'critical'
        : issues.length > 0 || score < 80
          ? 'attention'
          : 'healthy',
      issues,
    };
  }
}
