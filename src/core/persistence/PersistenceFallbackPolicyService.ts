export type PersistenceFallbackMode = 'auto' | 'enabled' | 'disabled';

export interface PersistenceFallbackPolicy {
  mode: PersistenceFallbackMode;
  enabled: boolean;
  productionSafe: boolean;
  description: string;
}

type RuntimeEnvironment = Record<string, string | boolean | undefined>;

export class PersistenceFallbackPolicyService {
  static getPolicy(
    environment: RuntimeEnvironment = import.meta.env as RuntimeEnvironment,
  ): PersistenceFallbackPolicy {
    const rawMode = String(
      environment.VITE_PERSISTENCE_FALLBACK_MODE || 'auto',
    ).toLowerCase();
    const mode: PersistenceFallbackMode =
      rawMode === 'enabled' || rawMode === 'disabled'
        ? rawMode
        : 'auto';
    const isProduction = environment.PROD === true;

    const enabled =
      mode === 'enabled' ||
      (mode === 'auto' && !isProduction);

    return {
      mode,
      enabled,
      productionSafe: !isProduction || !enabled,
      description: enabled
        ? isProduction
          ? 'Fallback local está habilitado em produção e deve ser desativado antes do cutover.'
          : 'Fallback local está habilitado para preservar o desenvolvimento local.'
        : 'Falhas da API não são mascaradas por persistência local.',
    };
  }

  static canUseFallback(
    environment?: RuntimeEnvironment,
  ): boolean {
    return this.getPolicy(environment).enabled;
  }

  static assertFallbackAllowed(): void {
    const policy = this.getPolicy();

    if (!policy.enabled) {
      throw new Error(
        'Persistência local desabilitada pela política de cutover.',
      );
    }
  }
}
