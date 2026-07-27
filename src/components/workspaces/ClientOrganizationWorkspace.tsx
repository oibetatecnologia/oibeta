import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import { AdminDirectoryService } from '../../core/admin/AdminDirectoryService';
import { ProductAccessService } from '../../core/licensing/ProductAccessService';
import type { PlatformUserDefinition } from '../../core/users/UserRegistry';
import useAdminAudit from '../../hooks/useAdminAudit';

export default function ClientOrganizationWorkspace() {
  const workspace = useWorkspace();
  const { user } = workspace.tenant;
  const { setActiveTab } = workspace.navigation;
  const access = ProductAccessService.buildSnapshot(user);
  const organizationName = String(user?.organizationName || user?.tenantName || 'Minha organização');
  const tenantId = String(user?.tenantId || user?.organizationId || 'tenant');
  const role = String(user?.role || 'operator');
  const canManage = role.toLowerCase() === 'tenant_admin';
  const [users, setUsers] = useState<PlatformUserDefinition[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string>();
  const { entries, isLoading: auditLoading, error: auditError } = useAdminAudit(8);

  useEffect(() => {
    let mounted = true;
    AdminDirectoryService.listUsers()
      .then((items) => { if (mounted) setUsers(items); })
      .catch((error) => { if (mounted) setUsersError(error instanceof Error ? error.message : String(error)); })
      .finally(() => { if (mounted) setUsersLoading(false); });
    return () => { mounted = false; };
  }, []);

  const products = useMemo(
    () => access.availableProducts.filter((product) => product.tabs.length > 0),
    [access.availableProducts],
  );

  const settingsConfigured = useMemo(() => {
    try {
      const raw = localStorage.getItem(`beta.client-settings.${tenantId}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return Boolean(parsed.displayName || parsed.legalName || parsed.institutionalEmail);
    } catch {
      return false;
    }
  }, [tenantId]);

  const activeUsers = users.filter((item) => item.status === 'active').length;
  const pendingInvites = users.filter((item) => item.status === 'invited').length;
  const implementationChecks = [
    Boolean(user?.tenantId || user?.organizationId),
    products.length > 0,
    settingsConfigured,
    users.length > 1 || pendingInvites > 0,
    true,
  ];
  const implementationProgress = Math.round(
    (implementationChecks.filter(Boolean).length / implementationChecks.length) * 100,
  );

  const alerts = [
    !settingsConfigured ? { title: 'Dados institucionais pendentes', action: 'client_settings' } : undefined,
    pendingInvites > 0 ? { title: `${pendingInvites} convite(s) aguardando aceite`, action: 'client_users' } : undefined,
    products.length === 0 ? { title: 'Nenhum produto comercial liberado', action: 'client_products' } : undefined,
  ].filter((item): item is { title: string; action: string } => Boolean(item));

  const cards = [
    { label: 'Produtos licenciados', value: products.length, icon: Package },
    { label: 'Usuários ativos', value: usersLoading ? '—' : activeUsers, icon: Users },
    { label: 'Convites pendentes', value: usersLoading ? '—' : pendingInvites, icon: UserPlus },
    { label: 'Implantação', value: `${implementationProgress}%`, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Dashboard executivo</p>
            <h1 className="mt-2 text-2xl font-black text-[var(--text-main)]">{organizationName}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
              Visão consolidada da operação, implantação, equipe e produtos licenciados da organização.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" /> Contexto do tenant ativo
          </div>
        </div>
      </section>

      {(usersError || auditError) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Alguns indicadores não puderam ser carregados: {usersError || auditError}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <Icon className="h-5 w-5 text-[var(--blue-accent)]" />
            <p className="mt-4 text-xs uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
            <p className="mt-1 text-2xl font-black text-[var(--text-main)]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Atividade recente</h2></div>
            {canManage && <button type="button" onClick={() => setActiveTab('client_audit')} className="text-xs font-bold text-[var(--blue-accent)]">Ver auditoria</button>}
          </div>
          <div className="mt-5 space-y-3">
            {auditLoading && <p className="text-sm text-[var(--text-secondary)]">Carregando eventos...</p>}
            {!auditLoading && entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-bold text-[var(--text-main)]">{entry.description}</p>
                  <time className="text-xs text-[var(--text-secondary)]">{new Date(entry.createdAt).toLocaleString('pt-BR')}</time>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.actorName || entry.actorUserId}</p>
              </div>
            ))}
            {!auditLoading && entries.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Nenhuma atividade recente registrada.</p>}
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center justify-between"><h2 className="font-black text-[var(--text-main)]">Implantação</h2><strong className="text-xl text-[var(--text-main)]">{implementationProgress}%</strong></div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--bg-main)]"><div className="h-full rounded-full bg-[var(--blue-accent)]" style={{ width: `${implementationProgress}%` }} /></div>
            <button type="button" onClick={() => setActiveTab('client_onboarding')} className="mt-4 flex items-center gap-2 text-xs font-bold text-[var(--blue-accent)]">Ver etapas <ArrowRight className="h-4 w-4" /></button>
          </article>

          <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5 text-amber-300" /><h2 className="font-black text-[var(--text-main)]">Alertas operacionais</h2></div>
            <div className="mt-4 space-y-3">
              {alerts.map((alert) => <button type="button" key={alert.title} onClick={() => setActiveTab(alert.action)} className="flex w-full items-center justify-between rounded-xl border border-[var(--border-color)] p-3 text-left text-sm text-[var(--text-main)]"><span>{alert.title}</span><ArrowRight className="h-4 w-4" /></button>)}
              {alerts.length === 0 && <p className="text-sm text-emerald-300">Nenhuma pendência operacional identificada.</p>}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2"><Package className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Produtos contratados</h2></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {products.map((product) => <div key={product.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/40 p-4"><p className="font-bold text-[var(--text-main)]">{product.commercialName}</p><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{product.description}</p></div>)}
            {products.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Nenhum produto comercial foi liberado para este usuário.</p>}
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--blue-accent)]" /><h2 className="font-black text-[var(--text-main)]">Ações rápidas</h2></div>
          <div className="mt-4 space-y-3">
            <button type="button" onClick={() => setActiveTab('beta_brain')} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] p-3 text-sm font-bold text-[var(--text-main)]"><Sparkles className="h-4 w-4" />Conversar com a Beta</button>
            {canManage && <button type="button" onClick={() => setActiveTab('client_users')} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] p-3 text-sm font-bold text-[var(--text-main)]"><UserPlus className="h-4 w-4" />Gerenciar equipe</button>}
            {canManage && <button type="button" onClick={() => setActiveTab('client_settings')} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-color)] p-3 text-sm font-bold text-[var(--text-main)]"><Settings className="h-4 w-4" />Configurar organização</button>}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Building2 className="h-4 w-4" /> Perfil atual: {role.replaceAll('_', ' ')}</div>
        </article>
      </section>
    </div>
  );
}
