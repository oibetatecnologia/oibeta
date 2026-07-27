import type { SupabaseDatabaseAdapter } from '../database/SupabaseDatabaseAdapter';
import type { CurrentUser } from '../auth/currentUser';

export type SaasSecurityStatus = 'healthy' | 'attention' | 'critical';

const status = (score: number): SaasSecurityStatus => score >= 80 ? 'healthy' : score >= 60 ? 'attention' : 'critical';

export class SaasSecurityReadinessService {
  constructor(private readonly mode: string, private readonly adapter: SupabaseDatabaseAdapter) {}

  async build(input: { user?: CurrentUser; sessionSource?: string }) {
    let readiness: any = {
      tablesReady: this.mode === 'supabase' ? 0 : 7,
      tablesRequired: 7,
      rlsEnabledTables: this.mode === 'supabase' ? 0 : 7,
      membershipTablesReady: this.mode !== 'supabase',
      licenseTableReady: this.mode !== 'supabase',
      auditTableReady: this.mode !== 'supabase',
      checkedAt: new Date().toISOString(),
    };

    if (this.mode === 'supabase') {
      try {
        const { data, error } = await this.adapter.getClient().rpc('beta_security_readiness');
        if (error) throw error;
        if (data && typeof data === 'object') readiness = { ...readiness, ...data };
      } catch (error) {
        console.warn('SaasSecurityReadinessService: readiness RPC unavailable', error);
      }
    }

    const tableScore = Math.round((Number(readiness.tablesReady || 0) / Math.max(1, Number(readiness.tablesRequired || 7))) * 100);
    const rlsScore = Math.min(100, Math.round((Number(readiness.rlsEnabledTables || 0) / 7) * 100));
    const sessionScore = input.user && input.sessionSource === 'supabase' ? 100 : this.mode === 'supabase' ? 35 : 70;
    const membershipScore = readiness.membershipTablesReady ? 100 : 25;
    const licenseScore = readiness.licenseTableReady ? 100 : 30;
    const auditScore = readiness.auditTableReady ? 100 : 30;

    const gates = [
      { id: 'schema', title: 'Schema de identidade', score: tableScore, status: status(tableScore), evidence: `${readiness.tablesReady || 0} de ${readiness.tablesRequired || 7} tabelas essenciais disponíveis.`, taskTitle: '[Segurança] Aplicar migration de identidade SaaS' },
      { id: 'membership', title: 'Vínculo usuário-organização-workspace', score: membershipScore, status: status(membershipScore), evidence: readiness.membershipTablesReady ? 'Tabelas de associação disponíveis.' : 'Associações de usuário ainda não foram provisionadas.', taskTitle: '[Segurança] Provisionar vínculos de usuários e workspaces' },
      { id: 'rls', title: 'Políticas RLS', score: rlsScore, status: status(rlsScore), evidence: `${readiness.rlsEnabledTables || 0} tabelas essenciais com RLS habilitada.`, taskTitle: '[Segurança] Ativar e homologar políticas RLS' },
      { id: 'session', title: 'Identidade da sessão', score: sessionScore, status: status(sessionScore), evidence: input.user ? `Sessão resolvida por ${input.sessionSource || 'desconhecido'} para ${input.user.organizationId}.` : 'Nenhuma sessão autenticada validada.', taskTitle: '[Segurança] Homologar sessão Supabase por tenant' },
      { id: 'licenses', title: 'Produtos licenciados', score: licenseScore, status: status(licenseScore), evidence: readiness.licenseTableReady ? 'Licenciamento por organização disponível.' : 'Tabela de licenças não validada.', taskTitle: '[Segurança] Consolidar licenciamento por organização' },
      { id: 'audit', title: 'Auditoria de segurança', score: auditScore, status: status(auditScore), evidence: readiness.auditTableReady ? 'Registro de auditoria sensível disponível.' : 'Auditoria de segurança não validada.', taskTitle: '[Segurança] Ativar auditoria de operações sensíveis' },
    ];
    const score = Math.round(gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length);

    return {
      score,
      status: status(score),
      databaseMode: this.mode,
      tablesReady: Number(readiness.tablesReady || 0),
      tablesRequired: Number(readiness.tablesRequired || 7),
      rlsEnabledTables: Number(readiness.rlsEnabledTables || 0),
      membershipTablesReady: Boolean(readiness.membershipTablesReady),
      licenseTableReady: Boolean(readiness.licenseTableReady),
      auditTableReady: Boolean(readiness.auditTableReady),
      sessionSource: input.sessionSource || 'none',
      authenticated: input.sessionSource === 'supabase',
      organizationId: input.user?.organizationId,
      workspaceId: input.user?.workspaceId,
      role: input.user?.role,
      checkedAt: readiness.checkedAt || new Date().toISOString(),
      gates,
    };
  }
}
