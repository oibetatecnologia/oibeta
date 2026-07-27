import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Layers,
  PackageCheck,
  RefreshCw,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PRODUCT_REGISTRY } from '../../products/productRegistry';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import { ProductLicensingService } from '../../core/licensing/ProductLicensingService';
import type { ProductLicenseStatus } from '../../core/licensing/ProductLicensingRegistry';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import useAdminAudit from '../../hooks/useAdminAudit';
import useTenantProductLicensing from '../../hooks/useTenantProductLicensing';
import TenantCommercialContractPanel from '../commercial/TenantCommercialContractPanel';
import {
  LicensingChecklistItem,
  LicensingMetricCard,
  ProductLicenseStatusBadge,
} from './ProductLicensingComponents';

interface ProductLicensingViewProps {
  activeModulesCount: number;
  activeFeaturesCount: number;
  isApiError: boolean;
  isModulesLoading: boolean;
}

export default function ProductLicensingView({
  activeModulesCount,
  activeFeaturesCount,
  isApiError,
  isModulesLoading,
}: ProductLicensingViewProps) {
  const platform = usePlatformContext();
  const directory = useAdminDirectory();
  const adminAudit = useAdminAudit(50);
  const [selectedTenantId, setSelectedTenantId] = useState(
    platform.currentTenant.organizationId,
  );
  const licensing = useTenantProductLicensing(selectedTenantId);
  const [draftProductIds, setDraftProductIds] = useState<string[]>([]);
  const [synchronizeUsers, setSynchronizeUsers] = useState(true);

  useEffect(() => {
    if (
      directory.tenants.length > 0 &&
      !directory.tenants.some(
        (tenant) =>
          tenant.id === selectedTenantId ||
          tenant.organizationId === selectedTenantId,
      )
    ) {
      setSelectedTenantId(directory.tenants[0].id);
    }
  }, [directory.tenants, selectedTenantId]);

  useEffect(() => {
    setDraftProductIds(licensing.snapshot.licensedProductIds);
  }, [licensing.snapshot.licensedProductIds]);

  const selectedTenant = directory.tenants.find(
    (tenant) =>
      tenant.id === selectedTenantId ||
      tenant.organizationId === selectedTenantId,
  );

  const catalog = useMemo(
    () =>
      PRODUCT_REGISTRY.map((product) => {
        const isLicensed = draftProductIds.includes(product.id);
        const status: ProductLicenseStatus =
          product.status === 'embedded'
            ? 'embedded'
            : product.status === 'static_pending_migration'
              ? 'pending_migration'
              : isLicensed
                ? 'licensed'
                : 'available';

        return {
          ...product,
          isLicensed,
          status,
        };
      }),
    [draftProductIds],
  );

  const hasChanges = useMemo(() => {
    const current = [...licensing.snapshot.licensedProductIds].sort();
    const draft = [...draftProductIds].sort();

    return JSON.stringify(current) !== JSON.stringify(draft);
  }, [draftProductIds, licensing.snapshot.licensedProductIds]);

  const toggleProduct = (productId: string) => {
    const product = PRODUCT_REGISTRY.find((item) => item.id === productId);
    if (!product || product.status === 'embedded') return;

    setDraftProductIds((current) =>
      current.includes(productId)
        ? current.filter((item) => item !== productId)
        : [...current, productId],
    );
  };

  const saveLicenses = async () => {
    await licensing.save(draftProductIds, synchronizeUsers);
    await Promise.all([
      directory.refresh(),
      adminAudit.refresh(),
    ]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--blue-accent)] font-black">
            Beta Core Admin / Licenciamento
          </span>
          <h3 className="text-xl lg:text-2xl font-black text-[var(--text-main)] font-sans mt-1 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[var(--blue-accent)]" />
            Licenciamento de Produtos
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl">
            Controle persistente dos produtos contratados por tenant, com sincronização opcional dos usuários da organização.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedTenantId}
            onChange={(event) => setSelectedTenantId(event.target.value)}
            className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)]"
          >
            {directory.tenants.length === 0 && (
              <option value={platform.currentTenant.organizationId}>
                {platform.currentTenant.organizationId}
              </option>
            )}
            {directory.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void licensing.refresh()}
            disabled={licensing.isLoading}
            className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${licensing.isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {(directory.error || licensing.error) && (
        <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">
          {licensing.error || directory.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <LicensingMetricCard
          icon={<PackageCheck className="w-4 h-4" />}
          label="Produtos registrados"
          value={licensing.summary.totalProducts}
          helper="Product Registry"
        />
        <LicensingMetricCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Licenciados"
          value={draftProductIds.length}
          helper={`${licensing.summary.availableProducts} disponíveis`}
        />
        <LicensingMetricCard
          icon={<Users className="w-4 h-4" />}
          label="Usuários sincronizados"
          value={`${licensing.snapshot.usersSynchronized}/${licensing.snapshot.userCount}`}
          helper="Escopo por tenant"
        />
        <LicensingMetricCard
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Prontidão"
          value={`${licensing.summary.readinessScore}%`}
          helper={isApiError ? 'API de módulos indisponível' : `${activeModulesCount} módulos`}
        />
      </div>

      <TenantCommercialContractPanel tenantId={selectedTenantId} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[var(--text-main)]">
                Catálogo licenciável
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                {selectedTenant?.name || selectedTenantId} · alterações são persistidas no backend.
              </p>
            </div>
            <span className="text-[9px] font-black uppercase font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full px-2 py-0.5 self-start">
              {licensing.snapshot.licensedProductIds.length} persistidos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalog.map((product) => {
              const locked = product.status === 'embedded';

              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  disabled={locked || licensing.isSaving}
                  className={`text-left p-4 border rounded-xl space-y-3 transition disabled:cursor-not-allowed ${
                    product.isLicensed || locked
                      ? 'bg-emerald-500/5 border-emerald-500/25'
                      : 'bg-[var(--bg-main)]/35 border-[var(--border-color)] hover:border-[var(--blue-accent)]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="text-sm font-black text-[var(--text-main)] truncate">
                        {product.commercialName}
                      </h5>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    </div>
                    <ProductLicenseStatusBadge
                      status={product.status}
                      label={ProductLicensingService.getStatusLabel(product.status)}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-mono border-t border-[var(--border-color)]/60 pt-2">
                    <span>{product.workspaceKey}</span>
                    <span>{product.tabs.length} abas</span>
                    <span>{product.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <Save className="w-4 h-4 text-amber-500" />
              Aplicar licenciamento
            </h4>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
              <input
                type="checkbox"
                checked={synchronizeUsers}
                onChange={(event) => setSynchronizeUsers(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="text-xs font-black text-[var(--text-main)] block">
                  Sincronizar usuários
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Atualiza os produtos permitidos de todos os usuários do tenant.
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={() => void saveLicenses()}
              disabled={!hasChanges || licensing.isSaving || licensing.isLoading}
              className="w-full px-3 py-2 rounded-xl bg-[var(--blue-accent)] text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {licensing.isSaving ? 'Salvando...' : 'Salvar licenças'}
            </button>

            <p className="text-[10px] text-[var(--text-secondary)]">
              Última atualização: {licensing.snapshot.updatedAt
                ? new Date(licensing.snapshot.updatedAt).toLocaleString('pt-BR')
                : 'não registrada'}.
            </p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Capacidade consolidada
            </h4>
            <LicensingChecklistItem label="Product Registry conectado" done />
            <LicensingChecklistItem label="Licenças persistidas por tenant" done={!licensing.error} />
            <LicensingChecklistItem label="Sincronização com usuários" done={licensing.snapshot.userCount === licensing.snapshot.usersSynchronized} />
            <LicensingChecklistItem label="Auditoria das alterações" done={!adminAudit.error} />
            <LicensingChecklistItem label="Módulos ativos disponíveis" done={!isModulesLoading && !isApiError && activeFeaturesCount >= 0} />
            <LicensingChecklistItem label="Filtrar navegação por licenças" done />
            <LicensingChecklistItem label="Bloquear workspace não licenciado" done />
            <LicensingChecklistItem label="Liberar Beta IA por produto" done />
          </div>
        </div>
      </div>
    </div>
  );
}
