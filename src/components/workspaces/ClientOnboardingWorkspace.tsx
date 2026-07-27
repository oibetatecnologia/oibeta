import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import { AdminDirectoryService } from '../../core/admin/AdminDirectoryService';
import { ProductAccessService } from '../../core/licensing/ProductAccessService';
import type { PlatformUserDefinition } from '../../core/users/UserRegistry';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export default function ClientOnboardingWorkspace() {
  const workspace = useWorkspace();
  const { user } = workspace.tenant;
  const access = ProductAccessService.buildSnapshot(user);
  const tenantId = String(user?.tenantId || user?.organizationId || 'tenant');
  const canManage = String(user?.role || '').toLowerCase() === 'tenant_admin';
  const [users, setUsers] = useState<PlatformUserDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const settingsKey = `beta.client-settings.${tenantId}`;

  useEffect(() => {
    let mounted = true;
    AdminDirectoryService.listUsers()
      .then((items) => { if (mounted) setUsers(items); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const settingsConfigured = useMemo(() => {
    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return Boolean(parsed.displayName || parsed.legalName || parsed.institutionalEmail);
    } catch {
      return false;
    }
  }, [settingsKey]);

  const productCount = access.availableProducts.filter((product) => product.tabs.length > 0).length;
  const activeUsers = users.filter((item) => item.status === 'active').length;
  const invitedUsers = users.filter((item) => item.status === 'invited').length;

  const steps: OnboardingStep[] = [
    {
      id: 'tenant',
      title: 'Ambiente da organização criado',
      description: 'Tenant, organização e contexto operacional estão disponíveis.',
      completed: Boolean(user?.tenantId || user?.organizationId),
      icon: ShieldCheck,
    },
    {
      id: 'products',
      title: 'Produtos contratados liberados',
      description: 'Ao menos um produto comercial está disponível para a organização.',
      completed: productCount > 0,
      icon: Package,
    },
    {
      id: 'settings',
      title: 'Dados da organização configurados',
      description: 'Identificação institucional e preferências básicas foram registradas.',
      completed: settingsConfigured,
      icon: Settings,
    },
    {
      id: 'team',
      title: 'Equipe inicial cadastrada',
      description: 'Existe ao menos um usuário adicional ativo ou convidado.',
      completed: users.length > 1 || invitedUsers > 0,
      icon: Users,
    },
    {
      id: 'beta',
      title: 'Beta disponível no tenant',
      description: 'A assistente nativa está habilitada no contexto da organização.',
      completed: true,
      icon: Sparkles,
    },
  ];

  const completed = steps.filter((step) => step.completed).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Primeiros passos</p>
        <h1 className="mt-2 text-2xl font-black text-[var(--text-main)]">Implantação da organização</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Acompanhe o que já está pronto e o que ainda precisa ser concluído para a operação inicial.
        </p>
      </header>

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-[var(--blue-accent)]" />
            <div>
              <p className="font-black text-[var(--text-main)]">Progresso da implantação</p>
              <p className="text-xs text-[var(--text-secondary)]">{completed} de {steps.length} etapas concluídas</p>
            </div>
          </div>
          <span className="text-2xl font-black text-[var(--text-main)]">{progress}%</span>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--bg-main)]">
          <div className="h-full rounded-full bg-[var(--blue-accent)] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <div className="flex items-start gap-3">
                  {step.completed
                    ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-secondary)]" />}
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--blue-accent)]" />
                  <div>
                    <p className="font-bold text-[var(--text-main)]">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{step.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <h2 className="font-black text-[var(--text-main)]">Resumo operacional</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-[var(--text-secondary)]">Produtos disponíveis</span><strong className="text-[var(--text-main)]">{productCount}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--text-secondary)]">Usuários ativos</span><strong className="text-[var(--text-main)]">{loading ? '—' : activeUsers}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--text-secondary)]">Convites pendentes</span><strong className="text-[var(--text-main)]">{loading ? '—' : invitedUsers}</strong></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--text-secondary)]">Configurações</span><strong className="text-[var(--text-main)]">{settingsConfigured ? 'Concluídas' : 'Pendentes'}</strong></div>
            </div>
          </article>

          <article className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
            <h2 className="font-black text-[var(--text-main)]">Próxima ação recomendada</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {settingsConfigured
                ? users.length > 1
                  ? 'Revise os acessos da equipe e comece a operar os produtos contratados.'
                  : 'Convide os primeiros usuários e distribua os produtos conforme a função de cada pessoa.'
                : 'Complete os dados institucionais em Configurações antes de liberar a operação para toda a equipe.'}
            </p>
            {!canManage && (
              <p className="mt-4 text-xs text-[var(--text-secondary)]">Somente o administrador do cliente pode concluir ajustes de implantação.</p>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
