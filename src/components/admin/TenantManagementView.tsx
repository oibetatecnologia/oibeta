import React, { useState } from 'react';
import { Building2, CheckCircle2, Clock, Layers, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import useAdminAudit from '../../hooks/useAdminAudit';
import { getTenantStatusLabel, getTenantTypeLabel, type TenantType } from '../../core/tenants/TenantRegistry';

interface TenantManagementViewProps {
  activeModulesCount: number;
  activeFeaturesCount: number;
}

export default function TenantManagementView({
  activeModulesCount,
  activeFeaturesCount,
}: TenantManagementViewProps) {
  const platform = usePlatformContext();
  const productionReadiness = useProductionReadiness();
  const directory = useAdminDirectory();
  const adminAudit = useAdminAudit(50);

  const [name, setName] = useState('');
  const [type, setType] = useState<TenantType>('city_hall');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    await directory.createTenant({
      name: name.trim(),
      type,
      status: 'implementation',
      licensedProductIds: platform.availableProducts.map((product) => product.id),
      primaryAdminName: adminName.trim() || undefined,
      primaryAdminEmail: adminEmail.trim() || undefined,
    });

    await adminAudit.refresh();

    setName('');
    setAdminName('');
    setAdminEmail('');
    setType('city_hall');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--blue-accent)] font-black">Beta Core Admin / Tenants</span>
          <h3 className="text-xl lg:text-2xl font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--blue-accent)]" />
            Gestão de Tenants
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl">
            Cadastro real de organizações, workspace principal, produtos licenciados e administrador inicial.
          </p>
        </div>
        <button type="button" onClick={() => void directory.refresh()} disabled={directory.isLoading} className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${directory.isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {directory.error && <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">{directory.error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TenantMetricCard icon={<Building2 className="w-4 h-4" />} label="Tenants" value={directory.tenants.length} helper={`${directory.tenants.filter((item) => item.status === 'active').length} ativos`} />
        <TenantMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Em implantação" value={directory.tenants.filter((item) => item.status === 'implementation').length} helper={`${adminAudit.summary.tenantEvents} eventos auditados`} />
        <TenantMetricCard icon={<Layers className="w-4 h-4" />} label="Módulos ativos" value={activeModulesCount} helper={`${activeFeaturesCount} recursos`} />
        <TenantMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Produção" value={`${productionReadiness.score}%`} helper={productionReadiness.status} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h4 className="text-sm font-black text-[var(--text-main)]">Diretório de tenants</h4>
            <p className="text-xs text-[var(--text-secondary)]">{directory.isLoading ? 'Carregando...' : `${directory.tenants.length} tenant(s) cadastrado(s).`}</p>
          </div>
          <div className="space-y-3">
            {directory.tenants.map((tenant) => (
              <div key={tenant.id} className="p-4 bg-[var(--bg-main)]/35 border border-[var(--border-color)] rounded-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-black text-[var(--text-main)]">{tenant.name}</h5>
                    <p className="text-[11px] text-[var(--text-secondary)]">{getTenantTypeLabel(tenant.type)} · {getTenantStatusLabel(tenant.status)}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">{tenant.licensedProductIds.length} produtos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>Org: {tenant.organizationId}</span>
                  <span>Workspace: {tenant.workspaceId}</span>
                  <span>Admin: {tenant.primaryAdminName || 'não definido'}</span>
                  <span>{tenant.primaryAdminEmail || 'sem e-mail inicial'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleCreate} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> Novo tenant</h4>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da organização" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]" />
            <select value={type} onChange={(event) => setType(event.target.value as TenantType)} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]">
              <option value="city_hall">Prefeitura</option>
              <option value="city_council">Câmara Municipal</option>
              <option value="autarchy">Autarquia</option>
              <option value="public_consortium">Consórcio Público</option>
              <option value="private_organization">Organização Privada</option>
            </select>
            <input value={adminName} onChange={(event) => setAdminName(event.target.value)} placeholder="Nome do administrador inicial" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]" />
            <input value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="E-mail do administrador" type="email" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-main)]" />
            <button type="submit" disabled={directory.isSaving || !name.trim()} className="w-full px-3 py-2 rounded-xl bg-[var(--blue-accent)] text-white text-xs font-black disabled:opacity-50">{directory.isSaving ? 'Criando...' : 'Criar tenant'}</button>
          </form>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Capacidade administrativa</h4>
            <TenantChecklistItem label="CRUD backend de tenants" done />
            <TenantChecklistItem label="Auditoria de criação" done={!adminAudit.error} />
            <TenantChecklistItem label="Workspace principal automático" done />
            <TenantChecklistItem label="Produtos licenciados" done />
            <TenantChecklistItem label="Convite do admin inicial" done={productionReadiness.score >= 80} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm"><div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">{icon}</div><div><span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span><span className="text-lg font-black text-[var(--text-main)] block mt-1 truncate">{value}</span><span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{helper}</span></div></div>;
}

function TenantChecklistItem({ label, done = false }: { label: string; done?: boolean }) {
  return <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[var(--bg-main)]/35 border border-[var(--border-color)]"><span className="text-[11px] text-[var(--text-main)] font-semibold">{label}</span><span className={`text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border ${done ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{done ? 'OK' : 'Pendente'}</span></div>;
}
