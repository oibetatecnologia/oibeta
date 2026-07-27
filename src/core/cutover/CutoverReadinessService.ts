import type { CutoverGate, CutoverReadinessSummary, CutoverStatus } from './CutoverReadinessTypes';

interface CutoverInput {
  persistence: {
    score: number;
    backend: { mode: string; configured: boolean; serviceRoleConfigured: boolean };
    fallbackPolicy: { enabled: boolean; productionSafe: boolean };
    readyTables: number;
    requiredTables: number;
  };
  session: { score: number; authenticated?: boolean; issues: unknown[] };
  accessControl: { score: number; issues: unknown[] };
  production: { score: number };
}

const resolveStatus = (score: number): CutoverStatus => score >= 80 ? 'healthy' : score >= 60 ? 'attention' : 'critical';

export class CutoverReadinessService {
  static buildSummary(input: CutoverInput): CutoverReadinessSummary {
    const databaseScore = input.persistence.backend.mode === 'supabase'
      ? input.persistence.backend.configured
        ? input.persistence.backend.serviceRoleConfigured ? 100 : 82
        : 35
      : 45;
    const fallbackScore = input.persistence.fallbackPolicy.productionSafe ? 100 : 35;
    const schemaScore = input.persistence.requiredTables > 0
      ? Math.round((input.persistence.readyTables / input.persistence.requiredTables) * 100)
      : input.persistence.backend.mode === 'supabase' ? 25 : 50;

    const gates: CutoverGate[] = [
      {
        id: 'database', title: 'Banco oficial', score: databaseScore, status: resolveStatus(databaseScore),
        description: 'O ambiente de produção deve operar exclusivamente com Supabase.',
        evidence: input.persistence.backend.mode === 'supabase' ? 'DATABASE_MODE=supabase detectado.' : 'O backend ainda opera em JSON local.',
        taskTitle: '[Cutover] Ativar Supabase como banco oficial',
      },
      {
        id: 'schema', title: 'Schema essencial', score: schemaScore, status: resolveStatus(schemaScore),
        description: 'As tabelas essenciais precisam estar disponíveis antes do primeiro cliente.',
        evidence: `${input.persistence.readyTables} de ${input.persistence.requiredTables} tabelas obrigatórias validadas.`,
        taskTitle: '[Cutover] Aplicar migrations e validar schema essencial',
      },
      {
        id: 'session', title: 'Autenticação e sessão', score: input.session.score, status: resolveStatus(input.session.score),
        description: 'Login, restauração, expiração e logout devem usar sessão real.',
        evidence: input.session.issues.length === 0 ? 'Nenhuma pendência de sessão detectada.' : `${input.session.issues.length} pendência(s) de sessão detectada(s).`,
        taskTitle: '[Cutover] Consolidar autenticação Supabase e renovação de sessão',
      },
      {
        id: 'tenant', title: 'Isolamento multi-tenant', score: input.accessControl.score, status: resolveStatus(input.accessControl.score),
        description: 'Toda leitura e gravação deve ser validada pelo tenant da sessão.',
        evidence: input.accessControl.issues.length === 0 ? 'Cobertura de acesso sem pendências detectadas.' : `${input.accessControl.issues.length} pendência(s) de acesso detectada(s).`,
        taskTitle: '[Cutover] Validar isolamento multi-tenant e políticas RLS',
      },
      {
        id: 'fallback', title: 'Fallback de produção', score: fallbackScore, status: resolveStatus(fallbackScore),
        description: 'Persistência local deve ficar bloqueada no domínio de produção.',
        evidence: input.persistence.fallbackPolicy.productionSafe ? 'Fallback está seguro para produção.' : 'Fallback local ainda pode mascarar falhas do backend.',
        taskTitle: '[Cutover] Desabilitar fallback local em produção',
      },
      {
        id: 'production', title: 'Ambiente online', score: input.production.score, status: resolveStatus(input.production.score),
        description: 'Deploy, variáveis, domínio, HTTPS e monitoramento precisam estar homologados.',
        evidence: `Prontidão de produção em ${input.production.score}%.`,
        taskTitle: '[Cutover] Homologar app.oibeta.com.br e observabilidade',
      },
    ];

    const score = Math.round(gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length);
    return {
      score,
      status: resolveStatus(score),
      databaseMode: input.persistence.backend.mode,
      fallbackEnabled: input.persistence.fallbackPolicy.enabled,
      fallbackProductionSafe: input.persistence.fallbackPolicy.productionSafe,
      authenticated: Boolean(input.session.authenticated),
      sessionScore: input.session.score,
      tenantScore: input.accessControl.score,
      readyTables: input.persistence.readyTables,
      requiredTables: input.persistence.requiredTables,
      productionScore: input.production.score,
      gates,
      blockers: gates.filter((gate) => gate.status !== 'healthy'),
      domainPlan: {
        institutionalUrl: 'https://www.oibeta.com.br',
        applicationUrl: 'https://app.oibeta.com.br',
        loginRedirectUrl: 'https://app.oibeta.com.br',
        institutionalStack: 'Next.js',
        applicationStack: 'Vite + React',
      },
    };
  }
}
