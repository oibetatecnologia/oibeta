import React from 'react';
import { AlertCircle, Building2, Layers, ShieldCheck, Users, Activity, Sparkles } from 'lucide-react';
import { PRODUCT_REGISTRY } from '../../products/productRegistry';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import TenantManagementView from '../admin/TenantManagementView';
import UserManagementView from '../admin/UserManagementView';
import ProductLicensingView from '../admin/ProductLicensingView';
import OrganizationManagementView from '../admin/OrganizationManagementView';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import useSessionHealth from '../../hooks/useSessionHealth';
import useAdminAudit from '../../hooks/useAdminAudit';
import AdminGovernancePanel from '../admin/AdminGovernancePanel';

interface AppModule {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface AppFeature {
  id: number;
  code: string;
  name: string;
  moduleCode: string;
}

interface AdministrationWorkspaceProps {
  activeTab: string;
  allModules: AppModule[];
  activeModules: AppModule[];
  activeFeatures: AppFeature[];
  isApiError: boolean;
  isModulesLoading: boolean;
  isModuleActive: (code: string) => boolean;
}

/**
 * AdministrationWorkspace
 * Central administrativa simples: usuários, organização e módulos contratados.
 *
 * Responsabilidade:
 * - renderizar telas administrativas;
 * - exibir módulos/licenças;
 * - não buscar dados;
 * - não executar regra de negócio.
 */
export default function AdministrationWorkspace({
  activeTab,
  allModules,
  activeModules,
  activeFeatures,
  isApiError,
  isModulesLoading,
  isModuleActive,
}: AdministrationWorkspaceProps) {
  const platform = usePlatformContext();
  const productionReadiness = useProductionReadiness();
  const accessControl = useAccessControlHealth();
  const adminDirectory = useAdminDirectory();
  const sessionHealth = useSessionHealth();
  const adminAudit = useAdminAudit(50);

  if (activeTab === 'tenants') {
    return <TenantManagementView activeModulesCount={activeModules.length} activeFeaturesCount={activeFeatures.length} />;
  }
  const activeProducts = PRODUCT_REGISTRY.filter((product) => product.status === 'active');
  const embeddedProducts = PRODUCT_REGISTRY.filter((product) => product.status === 'embedded');
  const pendingProducts = PRODUCT_REGISTRY.filter((product) => product.status === 'static_pending_migration');

  if (activeTab === 'core_admin') {
    const tenantName = platform.currentTenant?.organizationId || 'org-oi-beta';
    const currentUserName = platform.currentUser?.name || 'Admin Mestre';

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--blue-accent)] font-black">
              Beta Core Admin
            </span>
            <h3 className="text-xl lg:text-2xl font-black text-[var(--text-main)] font-sans mt-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--blue-accent)]" />
              Painel Operacional da Oi Beta
            </h3>
            <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl">
              Central inicial para implantação, licenciamento, administração e suporte da Beta Platform.
            </p>
          </div>

          <div className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-mono text-[var(--text-secondary)]">
            <span className="block text-[9px] uppercase tracking-widest font-black text-[var(--text-secondary)]">Contexto ativo</span>
            <span className="text-[var(--text-main)] font-bold">{tenantName}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <AdminMetricCard
            icon={<Building2 className="w-4 h-4" />}
            label="Tenant atual"
            value={platform.currentTenant?.organizationId || 'NO_TENANT'}
            helper="Base para multi-tenant"
          />
          <AdminMetricCard
            icon={<Layers className="w-4 h-4" />}
            label="Produtos ativos"
            value={activeProducts.length}
            helper="Product Registry"
          />
          <AdminMetricCard
            icon={<ShieldCheck className="w-4 h-4" />}
            label="Módulos ativos"
            value={activeModules.length}
            helper="Licenciamento atual"
          />
          <AdminMetricCard
            icon={<Users className="w-4 h-4" />}
            label="Auditoria"
            value={adminAudit.summary.totalEntries}
            helper={`${adminAudit.summary.activeActors} ator(es)`}
          />
        </div>

        <AdminGovernancePanel />

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
            <div>
              <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--green-accent)]" />
                Atividade administrativa recente
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Rastreabilidade de tenants, convites e alterações de usuários.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void adminAudit.refresh()}
              disabled={adminAudit.isLoading}
              className="text-[10px] font-black uppercase font-mono text-[var(--blue-accent)] disabled:opacity-50"
            >
              Atualizar
            </button>
          </div>

          {adminAudit.error ? (
            <p className="text-xs text-rose-400">{adminAudit.error}</p>
          ) : adminAudit.summary.recentEntries.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">
              Nenhuma ação administrativa registrada nesta organização.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {adminAudit.summary.recentEntries.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-black text-[var(--text-main)]">
                      {entry.description}
                    </span>
                    <span className="text-[9px] uppercase font-mono font-black text-[var(--blue-accent)]">
                      {entry.entityType}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-mono">
                    {entry.actorName || entry.actorUserId} · {new Date(entry.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div>
                <h4 className="text-sm font-black text-[var(--text-main)]">Portfólio operacional</h4>
                <p className="text-xs text-[var(--text-secondary)]">Produtos registrados na plataforma e preparados para licenciamento.</p>
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--blue-accent)] bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 rounded-full px-2 py-1">
                {PRODUCT_REGISTRY.length} REGISTROS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRODUCT_REGISTRY.map((product) => (
                <div key={product.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 hover:bg-[var(--bg-main)]/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="text-xs font-black text-[var(--text-main)] truncate">{product.commercialName}</h5>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">{product.description}</p>
                    </div>
                    <span className={`shrink-0 text-[8.5px] uppercase font-black font-mono rounded-full px-2 py-0.5 border ${
                      product.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : product.status === 'embedded'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9.5px] text-[var(--text-secondary)] font-mono">
                    <span>{product.workspaceKey}</span>
                    <span>{product.tabs.length} abas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--green-accent)]" />
                Implantação RC-1
              </h4>
              <div className="space-y-2 text-xs">
                <AdminChecklistItem label="Product Registry conectado" done />
                <AdminChecklistItem label="Navigation Registry conectado" done />
                <AdminChecklistItem label="Platform Context disponível" done />
                <AdminChecklistItem label="Tenant Registry" done />
                <AdminChecklistItem label="User Registry" done />
                <AdminChecklistItem label="CRUD administrativo backend" done={!adminDirectory.error} />
                <AdminChecklistItem label="Auditoria administrativa" done={!adminAudit.error} />
                <AdminChecklistItem label="Política de permissões" done />
                <AdminChecklistItem
                  label="Autorização backend real"
                  done={accessControl.authenticated && accessControl.score >= 80}
                />
                <AdminChecklistItem
                  label="Rotas administrativas protegidas"
                  done={accessControl.coverage.routeRules > 0}
                />
                <AdminChecklistItem
                  label="Sessão autenticada no backend"
                  done={sessionHealth.authenticated}
                />
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-5 space-y-2">
              <h4 className="text-sm font-black text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Beta IA
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                A Beta agora também acompanha a prontidão de produção, permissões, tenants, integrações e persistência. Próximo marco: {productionReadiness.nextMilestone}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'users') {
    return <UserManagementView />;
  }

  if (activeTab === 'organization') {
    return <OrganizationManagementView />;
  }

  if (activeTab === 'modules_contracted') {
    return (
      <ProductLicensingView
        activeModulesCount={activeModules.length}
        activeFeaturesCount={activeFeatures.length}
        isApiError={isApiError}
        isModulesLoading={isModulesLoading}
      />
    );
  }

  return null;
}


interface AdminMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  helper: string;
}

function AdminMetricCard({ icon, label, value, helper }: AdminMetricCardProps) {
  return (
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">
        {icon}
      </div>
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">
          {label}
        </span>
        <span className="text-lg font-black text-[var(--text-main)] block mt-1 truncate">
          {value}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
          {helper}
        </span>
      </div>
    </div>
  );
}

interface AdminChecklistItemProps {
  label: string;
  done?: boolean;
}

function AdminChecklistItem({ label, done = false }: AdminChecklistItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
      <span className="text-[11px] text-[var(--text-main)] font-semibold">{label}</span>
      <span className={`text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border ${
        done
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      }`}>
        {done ? 'OK' : 'Pendente'}
      </span>
    </div>
  );
}
