import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Clock, KeyRound, Layers, RefreshCw, Rocket, ShieldCheck, Users } from 'lucide-react';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import useAdminAudit from '../../hooks/useAdminAudit';
import { getTenantStatusLabel, getTenantTypeLabel, type TenantType } from '../../core/tenants/TenantRegistry';
import { ClientOnboardingService, type ClientOnboardingResult } from '../../core/onboarding/ClientOnboardingService';
import { ClientActivationReadinessService } from '../../core/onboarding/ClientActivationReadinessService';
import { TenantCommercialContractService } from '../../core/commercial/TenantCommercialContractService';
import type { TenantCommercialContract } from '../../core/commercial/TenantCommercialContractTypes';

interface TenantManagementViewProps {
  activeModulesCount: number;
  activeFeaturesCount: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function TenantManagementView({
  activeModulesCount,
  activeFeaturesCount,
}: TenantManagementViewProps) {
  const platform = usePlatformContext();
  const productionReadiness = useProductionReadiness();
  const directory = useAdminDirectory();
  const adminAudit = useAdminAudit(50);

  const commercialProducts = useMemo(
    () => platform.availableProducts.filter((product) => product.commerciallyAvailable !== false && product.status === 'active'),
    [platform.availableProducts],
  );

  const [name, setName] = useState('');
  const [type, setType] = useState<TenantType>('city_hall');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [planName, setPlanName] = useState('Plano Comercial Oi Beta');
  const [monthlyValue, setMonthlyValue] = useState('0');
  const [setupValue, setSetupValue] = useState('0');
  const [billingDay, setBillingDay] = useState('10');
  const [startDate, setStartDate] = useState(today());
  const [responsible, setResponsible] = useState('Oi Beta');
  const [notes, setNotes] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string>();
  const [lastOnboarding, setLastOnboarding] = useState<ClientOnboardingResult>();
  const [contracts, setContracts] = useState<TenantCommercialContract[]>([]);
  const [activatingTenantId, setActivatingTenantId] = useState<string>();
  const [activationMessage, setActivationMessage] = useState<string>();



  useEffect(() => {
    let active = true;
    void TenantCommercialContractService.list()
      .then((items) => {
        if (active) setContracts(items);
      })
      .catch(() => {
        if (active) setContracts([]);
      });
    return () => { active = false; };
  }, [lastOnboarding]);

  const activationReadiness = useMemo(
    () => directory.tenants.map((tenant) => ({
      tenant,
      readiness: ClientActivationReadinessService.evaluate(tenant, contracts),
    })),
    [contracts, directory.tenants],
  );

  const handleActivateTenant = async (tenantId: string) => {
    setActivatingTenantId(tenantId);
    setActivationMessage(undefined);
    try {
      const result = await ClientOnboardingService.activate(tenantId);
      await Promise.all([directory.refresh(), adminAudit.refresh()]);
      setActivationMessage(`${result.tenant.name} foi liberado para operação do cliente.`);
    } catch (error) {
      setActivationMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setActivatingTenantId(undefined);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) => current.includes(productId)
      ? current.filter((item) => item !== productId)
      : [...current, productId]);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsOnboarding(true);
    setOnboardingError(undefined);
    setLastOnboarding(undefined);

    try {
      const result = await ClientOnboardingService.create({
        organizationName: name,
        tenantType: type,
        administratorName: adminName,
        administratorEmail: adminEmail,
        productIds: selectedProductIds,
        planName,
        monthlyValue: Number(monthlyValue),
        setupValue: Number(setupValue),
        billingDay: Number(billingDay),
        startDate,
        responsible,
        notes,
      });

      setLastOnboarding(result);
      await Promise.all([directory.refresh(), adminAudit.refresh()]);
      setName('');
      setAdminName('');
      setAdminEmail('');
      setSelectedProductIds([]);
      setPlanName('Plano Comercial Oi Beta');
      setMonthlyValue('0');
      setSetupValue('0');
      setBillingDay('10');
      setStartDate(today());
      setNotes('');
      setType('city_hall');
    } catch (error) {
      setOnboardingError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsOnboarding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border-color)] pb-4 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--blue-accent)] font-black">Beta Core Admin / Tenants</span>
          <h3 className="text-xl lg:text-2xl font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[var(--blue-accent)]" />
            Gestão e onboarding de clientes
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl">
            Fluxo operacional do Admin Master: organização, workspace, administrador, produtos licenciados e contrato ativo em uma única operação.
          </p>
        </div>
        <button type="button" onClick={() => void directory.refresh()} disabled={directory.isLoading} className="px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${directory.isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {activationMessage && <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs text-blue-300">{activationMessage}</div>}

      {(directory.error || onboardingError) && <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">{onboardingError || directory.error}</div>}

      {lastOnboarding && (
        <div className="p-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-300 font-black text-sm"><CheckCircle2 className="w-4 h-4" /> Cliente preparado para implantação</div>
          <p className="text-xs text-[var(--text-secondary)]">
            {lastOnboarding.tenant.name} recebeu tenant, workspace principal, convite do administrador, {lastOnboarding.contract.productIds.length} produto(s) e contrato ativo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-mono text-[var(--text-secondary)]">
            <span>Tenant: {lastOnboarding.tenant.id}</span>
            <span>Workspace: {lastOnboarding.tenant.workspaceId}</span>
            <span>Contrato: {lastOnboarding.contract.id}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <TenantMetricCard icon={<Building2 className="w-4 h-4" />} label="Tenants" value={directory.tenants.length} helper={`${directory.tenants.filter((item) => item.status === 'active').length} ativos`} />
        <TenantMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Em implantação" value={directory.tenants.filter((item) => item.status === 'implementation').length} helper={`${adminAudit.summary.tenantEvents} eventos auditados`} />
        <TenantMetricCard icon={<Layers className="w-4 h-4" />} label="Módulos ativos" value={activeModulesCount} helper={`${activeFeaturesCount} recursos`} />
        <TenantMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Produção" value={`${productionReadiness.score}%`} helper={productionReadiness.status} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h4 className="text-sm font-black text-[var(--text-main)]">Diretório de clientes</h4>
            <p className="text-xs text-[var(--text-secondary)]">{directory.isLoading ? 'Carregando...' : `${directory.tenants.length} tenant(s) cadastrado(s).`}</p>
          </div>
          <div className="space-y-3">
            {directory.tenants.length === 0 && <p className="text-xs text-[var(--text-secondary)] p-4 text-center">Nenhum tenant cadastrado.</p>}
            {activationReadiness.map(({ tenant, readiness }) => (
              <div key={tenant.id} className="p-4 bg-[var(--bg-main)]/35 border border-[var(--border-color)] rounded-xl space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-black text-[var(--text-main)]">{tenant.name}</h5>
                    <p className="text-[11px] text-[var(--text-secondary)]">{getTenantTypeLabel(tenant.type)} · {getTenantStatusLabel(tenant.status)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black font-mono px-2 py-1 rounded-full border ${readiness.readyForActivation ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'}`}>{readiness.score}% pronto</span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">{tenant.licensedProductIds.length} produto(s)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>Org: {tenant.organizationId}</span>
                  <span>Workspace: {tenant.workspaceId}</span>
                  <span>Admin: {tenant.primaryAdminName || 'não definido'}</span>
                  <span>{tenant.primaryAdminEmail || 'sem e-mail inicial'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {readiness.checks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between gap-2 text-[10px] p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/45">
                      <span className="text-[var(--text-secondary)] truncate">{check.label}</span>
                      <span className={check.ready ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>{check.ready ? 'OK' : 'PENDENTE'}</span>
                    </div>
                  ))}
                </div>
                {tenant.status !== 'active' && (
                  <button type="button" onClick={() => void handleActivateTenant(tenant.id)} disabled={!readiness.readyForActivation || activatingTenantId === tenant.id} className="w-full px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center gap-2 disabled:opacity-40">
                    <Rocket className="w-3.5 h-3.5" />
                    {activatingTenantId === tenant.id ? 'Liberando...' : 'Liberar operação do cliente'}
                  </button>
                )}
                {tenant.status === 'active' && <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-black"><KeyRound className="w-3.5 h-3.5" /> Ambiente liberado para primeiro acesso</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleCreate} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <div>
              <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> Novo cliente operacional</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Conclui os cinco passos mínimos para liberar a implantação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <OnboardingField label="Organização"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do cliente" className="onboarding-input" /></OnboardingField>
              <OnboardingField label="Tipo"><select value={type} onChange={(event) => setType(event.target.value as TenantType)} className="onboarding-input"><option value="city_hall">Prefeitura</option><option value="city_council">Câmara Municipal</option><option value="autarchy">Autarquia</option><option value="public_consortium">Consórcio Público</option><option value="private_organization">Organização Privada</option></select></OnboardingField>
              <OnboardingField label="Administrador"><input required value={adminName} onChange={(event) => setAdminName(event.target.value)} placeholder="Nome completo" className="onboarding-input" /></OnboardingField>
              <OnboardingField label="E-mail de acesso"><input required value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@cliente.gov.br" type="email" className="onboarding-input" /></OnboardingField>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-black text-[var(--text-secondary)]">Produtos contratados</span>
              <div className="grid grid-cols-1 gap-2">
                {commercialProducts.map((product) => (
                  <label key={product.id} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 cursor-pointer">
                    <input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={() => toggleProduct(product.id)} className="mt-0.5" />
                    <span><strong className="block text-xs text-[var(--text-main)]">{product.commercialName}</strong><span className="text-[10px] text-[var(--text-secondary)] line-clamp-2">{product.description}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <OnboardingField label="Plano / contrato"><input required value={planName} onChange={(event) => setPlanName(event.target.value)} className="onboarding-input" /></OnboardingField>
              <OnboardingField label="Responsável Oi Beta"><input required value={responsible} onChange={(event) => setResponsible(event.target.value)} className="onboarding-input" /></OnboardingField>
              <OnboardingField label="Mensalidade"><input min="0" step="0.01" type="number" value={monthlyValue} onChange={(event) => setMonthlyValue(event.target.value)} className="onboarding-input" /></OnboardingField>
              <OnboardingField label="Implantação"><input min="0" step="0.01" type="number" value={setupValue} onChange={(event) => setSetupValue(event.target.value)} className="onboarding-input" /></OnboardingField>
              <OnboardingField label="Início"><input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="onboarding-input" /></OnboardingField>
              <OnboardingField label="Dia de cobrança"><input min="1" max="28" type="number" value={billingDay} onChange={(event) => setBillingDay(event.target.value)} className="onboarding-input" /></OnboardingField>
            </div>
            <OnboardingField label="Observações"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="onboarding-input resize-none" placeholder="Escopo inicial, referência do contrato ou observações de implantação." /></OnboardingField>

            <button type="submit" disabled={isOnboarding || selectedProductIds.length === 0} className="w-full px-3 py-3 rounded-xl bg-[var(--blue-accent)] text-white text-xs font-black disabled:opacity-50">
              {isOnboarding ? 'Preparando ambiente...' : 'Criar cliente e preparar implantação'}
            </button>
          </form>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Entrega do fluxo</h4>
            <TenantChecklistItem label="Organização e tenant persistidos" done />
            <TenantChecklistItem label="Workspace principal automático" done />
            <TenantChecklistItem label="Convite do administrador inicial" done />
            <TenantChecklistItem label="Produtos contratados licenciados" done />
            <TenantChecklistItem label="Contrato comercial ativo" done />
            <TenantChecklistItem label="Auditoria administrativa" done={!adminAudit.error} />
          </div>
        </div>
      </div>

      <style>{`.onboarding-input{width:100%;padding:.65rem .75rem;border-radius:.75rem;background:var(--bg-main);border:1px solid var(--border-color);font-size:.75rem;color:var(--text-main);outline:none}.onboarding-input:focus{border-color:var(--blue-accent)}.onboarding-input option{background:var(--bg-card);color:var(--text-main)}`}</style>
    </div>
  );
}

function OnboardingField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="text-[10px] uppercase tracking-wider font-black text-[var(--text-secondary)]">{label}</span>{children}</label>;
}

function TenantMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm"><div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">{icon}</div><div><span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span><span className="text-lg font-black text-[var(--text-main)] block mt-1 truncate">{value}</span><span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{helper}</span></div></div>;
}

function TenantChecklistItem({ label, done = false }: { label: string; done?: boolean }) {
  return <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[var(--bg-main)]/35 border border-[var(--border-color)]"><span className="text-[11px] text-[var(--text-main)] font-semibold">{label}</span><span className={`text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border ${done ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{done ? 'OK' : 'Pendente'}</span></div>;
}
