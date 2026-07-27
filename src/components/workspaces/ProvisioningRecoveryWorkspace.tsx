import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  Mail,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import { AdminDirectoryService } from '../../core/admin/AdminDirectoryService';
import type { TenantDefinition } from '../../core/tenants/TenantRegistry';

interface RecoveryRow {
  tenant: TenantDefinition;
  activeUsers: number;
  invitedAdmins: string[];
  hasActiveAdmin: boolean;
  hasProducts: boolean;
  blockers: string[];
  score: number;
  canActivate: boolean;
}

export default function ProvisioningRecoveryWorkspace() {
  const directory = useAdminDirectory();
  const [runningId, setRunningId] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  const rows = useMemo<RecoveryRow[]>(() => directory.tenants.map((tenant) => {
    const users = directory.users.filter((user) =>
      user.tenantId === tenant.id || user.organizationId === tenant.organizationId,
    );
    const activeUsers = users.filter((user) => user.status === 'active').length;
    const invitedAdmins = users
      .filter((user) => user.profile === 'tenant_admin' && user.status === 'invited')
      .map((user) => user.id);
    const hasActiveAdmin = users.some((user) => user.profile === 'tenant_admin' && user.status === 'active');
    const hasProducts = tenant.licensedProductIds.length > 0;
    const checks = [hasProducts, activeUsers > 0, hasActiveAdmin, tenant.status === 'active'];
    const blockers = [
      !hasProducts && 'Nenhum produto licenciado',
      activeUsers === 0 && 'Nenhum usuário ativo',
      !hasActiveAdmin && 'Administrador ainda não ativo',
      tenant.status !== 'active' && 'Tenant ainda não está ativo',
    ].filter(Boolean) as string[];

    return {
      tenant,
      activeUsers,
      invitedAdmins,
      hasActiveAdmin,
      hasProducts,
      blockers,
      score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
      canActivate: hasProducts && hasActiveAdmin && tenant.status !== 'active',
    };
  }), [directory.tenants, directory.users]);

  const ready = rows.filter((row) => row.blockers.length === 0).length;
  const recoverable = rows.filter((row) => row.canActivate || row.invitedAdmins.length > 0).length;
  const blocked = rows.length - ready - recoverable;

  const run = async (id: string, task: () => Promise<unknown>, success: string) => {
    setRunningId(id);
    setFeedback(undefined);
    try {
      await task();
      await directory.refresh();
      setFeedback(success);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : String(error));
    } finally {
      setRunningId(undefined);
    }
  };

  const resendAdminInvitation = async (row: RecoveryRow) => {
    const userId = row.invitedAdmins[0];
    if (!userId) return;
    await run(
      `${row.tenant.id}:invite`,
      () => AdminDirectoryService.resendInvitation(userId),
      `Convite do administrador de ${row.tenant.name} reenviado.`,
    );
  };

  const activateTenant = async (row: RecoveryRow) => {
    if (!row.canActivate) return;
    await run(
      `${row.tenant.id}:activate`,
      () => directory.updateTenant(row.tenant.id, { status: 'active' }),
      `Tenant ${row.tenant.name} ativado com segurança.`,
    );
  };

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-amber-300 font-black">Oi Beta / Operação</span>
      <h1 className="mt-2 flex items-center gap-3 text-2xl lg:text-4xl font-black text-[var(--text-main)]">
        <LifeBuoy className="w-7 h-7 text-amber-300" />Recuperação de Provisionamento
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
        Diagnóstico de implantações incompletas com ações seguras e idempotentes. Nenhuma organização é recriada e nenhum contrato é duplicado.
      </p>
    </section>

    {(directory.error || feedback) && <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">{directory.error || feedback}</div>}

    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Metric label="Operacionais" value={ready} />
      <Metric label="Recuperáveis" value={recoverable} />
      <Metric label="Bloqueios manuais" value={blocked} />
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
            <tr><th className="p-4">Organização</th><th className="p-4">Diagnóstico</th><th className="p-4">Prontidão</th><th className="p-4">Recuperação segura</th></tr>
          </thead>
          <tbody>{rows.map((row) => <tr key={row.tenant.id} className="border-b border-[var(--border-color)] last:border-0 align-top">
            <td className="p-4"><div className="font-black text-[var(--text-main)]">{row.tenant.name}</div><div className="mt-1 text-[var(--text-secondary)]">{row.tenant.organizationId}</div></td>
            <td className="p-4 text-[var(--text-secondary)]">
              {row.blockers.length ? row.blockers.map((blocker) => <div key={blocker} className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-300" />{blocker}</div>) : <div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 className="w-4 h-4" />Sem pendências</div>}
            </td>
            <td className="p-4 min-w-[160px]"><div className="flex items-center justify-between"><strong className="text-[var(--text-main)]">{row.score}%</strong><ShieldCheck className={`w-4 h-4 ${row.score === 100 ? 'text-emerald-300' : 'text-amber-300'}`} /></div><div className="mt-2 h-2 rounded-full bg-black/20 overflow-hidden"><div className="h-full bg-amber-300" style={{ width: `${row.score}%` }} /></div></td>
            <td className="p-4 min-w-[230px]"><div className="flex flex-col gap-2">
              {row.invitedAdmins.length > 0 && <button type="button" disabled={Boolean(runningId)} onClick={() => void resendAdminInvitation(row)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 font-black text-cyan-200 disabled:opacity-50"><Mail className="w-4 h-4" />Reenviar convite do admin</button>}
              {row.canActivate && <button type="button" disabled={Boolean(runningId)} onClick={() => void activateTenant(row)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 font-black text-emerald-200 disabled:opacity-50"><Wrench className="w-4 h-4" />Ativar tenant</button>}
              {!row.canActivate && row.invitedAdmins.length === 0 && row.blockers.length > 0 && <span className="text-[var(--text-secondary)]">Ajuste manual necessário antes de recuperar.</span>}
              {row.blockers.length === 0 && <span className="text-emerald-300">Nenhuma ação necessária.</span>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!directory.isLoading && rows.length === 0 && <div className="p-8 text-center text-sm text-[var(--text-secondary)]">Nenhuma organização cadastrada.</div>}
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-xs text-[var(--text-secondary)] flex items-center gap-2">
      <RefreshCw className="w-4 h-4 text-amber-300" />As ações recarregam o diretório somente após conclusão. Não existe polling nesta área.
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--text-secondary)]">{label}</div><div className="mt-3 text-2xl font-black text-[var(--text-main)]">{value}</div></div>;
}
