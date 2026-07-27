import React, { useMemo } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Package, RefreshCw, Users } from 'lucide-react';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import { getTenantStatusLabel } from '../../core/tenants/TenantRegistry';

export default function DeploymentMonitorWorkspace() {
  const directory = useAdminDirectory();
  const rows = useMemo(() => directory.tenants.map((tenant) => {
    const users = directory.users.filter((user) => user.tenantId === tenant.id || user.organizationId === tenant.organizationId);
    const activeUsers = users.filter((user) => user.status === 'active').length;
    const invitedUsers = users.filter((user) => user.status === 'invited').length;
    const hasProducts = tenant.licensedProductIds.length > 0;
    const hasAdmin = users.some((user) => user.profile === 'tenant_admin' && user.status === 'active');
    const score = Math.round(([tenant.status === 'active', hasProducts, activeUsers > 0, hasAdmin].filter(Boolean).length / 4) * 100);
    return { tenant, activeUsers, invitedUsers, hasProducts, hasAdmin, score };
  }), [directory.tenants, directory.users]);

  const ready = rows.filter((row) => row.score === 100).length;
  const pending = rows.filter((row) => row.score < 100).length;

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-violet-300 font-black">Oi Beta / Clientes</span>
      <h1 className="mt-2 flex items-center gap-3 text-2xl lg:text-4xl font-black text-[var(--text-main)]"><Building2 className="w-7 h-7 text-violet-300" />Monitor de Implantação</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-3xl">Acompanhamento consolidado por tenant, calculado a partir de status, licenciamento e usuários reais do diretório administrativo.</p>
    </section>

    {directory.error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{directory.error}</div>}

    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Metric label="Organizações" value={rows.length} />
      <Metric label="Prontas" value={ready} />
      <Metric label="Com pendências" value={pending} />
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-[var(--border-color)] text-[var(--text-secondary)]"><tr><th className="p-4">Organização</th><th className="p-4">Status</th><th className="p-4">Produtos</th><th className="p-4">Usuários</th><th className="p-4">Implantação</th><th className="p-4">Pendências</th></tr></thead>
      <tbody>{rows.map(({ tenant, activeUsers, invitedUsers, hasProducts, hasAdmin, score }) => {
        const issues = [!hasProducts && 'Sem produtos', activeUsers === 0 && 'Sem usuário ativo', !hasAdmin && 'Sem admin ativo', tenant.status !== 'active' && 'Tenant não ativo'].filter(Boolean) as string[];
        return <tr key={tenant.id} className="border-b border-[var(--border-color)] last:border-0"><td className="p-4"><div className="font-black text-[var(--text-main)]">{tenant.name}</div><div className="text-[var(--text-secondary)]">{tenant.organizationId}</div></td><td className="p-4 text-[var(--text-secondary)]">{getTenantStatusLabel(tenant.status)}</td><td className="p-4"><span className="inline-flex items-center gap-1"><Package className="w-3.5 h-3.5" />{tenant.licensedProductIds.length}</span></td><td className="p-4"><span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{activeUsers} ativos / {invitedUsers} convites</span></td><td className="p-4 min-w-[180px]"><div className="flex items-center justify-between"><span className="font-black text-[var(--text-main)]">{score}%</span>{score === 100 ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertTriangle className="w-4 h-4 text-amber-300" />}</div><div className="mt-2 h-2 rounded-full bg-black/20 overflow-hidden"><div className="h-full bg-violet-300" style={{ width: `${score}%` }} /></div></td><td className="p-4 text-[var(--text-secondary)]">{issues.length ? issues.join(' • ') : 'Nenhuma'}</td></tr>;
      })}</tbody></table></div>
      {!directory.isLoading && rows.length === 0 && <div className="p-8 text-center text-sm text-[var(--text-secondary)]">Nenhuma organização cadastrada.</div>}
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-xs text-[var(--text-secondary)] flex items-center gap-2"><RefreshCw className="w-4 h-4 text-violet-300" />A atualização ocorre apenas ao abrir a área ou ao usar o recarregamento do diretório.</section>
  </div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--text-secondary)]">{label}</div><div className="mt-3 text-2xl font-black text-[var(--text-main)]">{value}</div></div>; }
