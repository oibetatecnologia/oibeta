export type RepositoryStatus = 'api' | 'fallback' | 'error' | 'unknown';

export interface RepositoryHealthSignal {
  id: string;
  label: string;
  status: RepositoryStatus;
  description: string;
  lastCheckedAt?: string;
  lastError?: string;
}

interface RepositoryRuntimeState {
  status: RepositoryStatus;
  lastCheckedAt: string;
  lastError?: string;
}

const statusByRepository = new Map<string, RepositoryRuntimeState>();

const REPOSITORIES: Array<[string, string]> = [
  ['crm-gov-clients', 'CRM Gov / Clientes'],
  ['commercial-opportunities', 'Radar Comercial'],
  ['commercial-generated-tasks', 'Tarefas comerciais'],
];

export class RepositoryHealthService {
  static markApi(repositoryId: string): void {
    statusByRepository.set(repositoryId, {
      status: 'api',
      lastCheckedAt: new Date().toISOString(),
    });
  }

  static markFallback(repositoryId: string, error?: unknown): void {
    statusByRepository.set(repositoryId, {
      status: 'fallback',
      lastCheckedAt: new Date().toISOString(),
      lastError: this.resolveErrorMessage(error),
    });
  }

  static markError(repositoryId: string, error?: unknown): void {
    statusByRepository.set(repositoryId, {
      status: 'error',
      lastCheckedAt: new Date().toISOString(),
      lastError: this.resolveErrorMessage(error),
    });
  }

  static getStatus(repositoryId: string): RepositoryStatus {
    return statusByRepository.get(repositoryId)?.status || 'unknown';
  }

  static listSignals(): RepositoryHealthSignal[] {
    return REPOSITORIES.map(([id, label]) => {
      const state = statusByRepository.get(id);
      const status = state?.status || 'unknown';

      return {
        id,
        label,
        status,
        lastCheckedAt: state?.lastCheckedAt,
        lastError: state?.lastError,
        description:
          status === 'api'
            ? 'Usando API/backend como fonte preferencial.'
            : status === 'fallback'
              ? 'Usando fallback local temporário.'
              : status === 'error'
                ? 'A API falhou e o fallback local está desabilitado.'
                : 'Ainda não houve leitura nesta sessão.',
      };
    });
  }

  static getApiRepositoriesCount(): number {
    return this.listSignals().filter((signal) => signal.status === 'api').length;
  }

  static getFallbackRepositoriesCount(): number {
    return this.listSignals().filter((signal) => signal.status === 'fallback').length;
  }

  static getErrorRepositoriesCount(): number {
    return this.listSignals().filter((signal) => signal.status === 'error').length;
  }

  static getReadinessScore(): number {
    const signals = this.listSignals();

    if (signals.length === 0) return 0;

    const score = signals.reduce((total, signal) => {
      if (signal.status === 'api') return total + 100;
      if (signal.status === 'fallback') return total + 40;
      if (signal.status === 'error') return total;
      return total + 20;
    }, 0);

    return Math.round(score / signals.length);
  }

  private static resolveErrorMessage(error?: unknown): string | undefined {
    if (!error) return undefined;
    if (error instanceof Error) return error.message;

    return String(error);
  }
}
