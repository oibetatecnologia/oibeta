import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { HttpRepositoryClient } from '../../core/persistence/HttpRepositoryClient';

interface TenantIsolationSummary {
  enabled: boolean;
  strictInProduction: boolean;
  protectedRequests: number;
  blockedCrossTenantAttempts: number;
  normalizedPayloads: number;
  lastBlockedAt?: string;
  rules: Record<string, boolean>;
}

const ruleLabels: Record<string, string> = {
  sessionOrganizationIsAuthoritative: 'Organização da sessão é a referência oficial',
  workspaceMismatchBlocked: 'Conflito de workspace é bloqueado',
  tenantPathMismatchBlocked: 'Tenant divergente na URL é bloqueado',
  commercialTenantMismatchBlocked: 'Tenant divergente em contratos é bloqueado',
};

export default function TenantSecurityWorkspace() {
  const [summary, setSummary] = useState<TenantIsolationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await HttpRepositoryClient.get<TenantIsolationSummary>('/api/admin/security/tenant-isolation');
      setSummary(response);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar o diagnóstico de isolamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const ruleCount = useMemo(() => summary ? Object.values(summary.rules).filter(Boolean).length : 0, [summary]);
  const status = !summary?.enabled ? 'critical' : ruleCount === 4 ? 'healthy' : 'attention';

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-sky-300 font-black">Oi Beta / Segurança</span>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl lg:text-4xl font-black text-[var(--text-main)]"><ShieldCheck className="w-7 h-7 text-sky-300" />Isolamento entre tenants</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-3xl">Diagnóstico do bloqueio de acesso cruzado aplicado no backend após a validação da sessão autenticada.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-black text-[var(--text-main)] disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>
      </div>
    </section>

    {error && <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 flex items-center gap-2"><XCircle className="w-5 h-5" />{error}</section>}

    <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <Metric label="Proteção" value={summary?.enabled ? 'Ativa' : 'Inativa'} helper={summary?.strictInProduction ? 'Modo estrito' : 'Modo local'} />
      <Metric label="Regras ativas" value={`${ruleCount}/4`} helper="Controles de escopo" />
      <Metric label="Requisições verificadas" value={summary?.protectedRequests ?? 0} helper="Desde o início do servidor" />
      <Metric label="Tentativas bloqueadas" value={summary?.blockedCrossTenantAttempts ?? 0} helper={summary?.lastBlockedAt ? new Date(summary.lastBlockedAt).toLocaleString('pt-BR') : 'Nenhuma registrada'} />
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-black text-[var(--text-main)]">Controles ativos</h2>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Object.entries(summary?.rules || ruleLabels).map(([key, value]) => {
          const active = typeof value === 'boolean' ? value : false;
          return <div key={key} className="rounded-xl border border-[var(--border-color)] bg-black/10 p-4 flex items-center gap-3">
            {active ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-amber-300" />}
            <span className="text-xs font-bold text-[var(--text-main)]">{ruleLabels[key] || key}</span>
          </div>;
        })}
      </div>
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-xs text-[var(--text-secondary)]">
      Payloads normalizados para a organização autenticada: <strong className="text-[var(--text-main)]">{summary?.normalizedPayloads ?? 0}</strong>. Nenhum polling foi adicionado; os dados são consultados somente ao abrir a tela ou pressionar Atualizar.
    </section>
  </div>;
}

function Metric({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) {
  return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--text-secondary)]">{label}</div><div className="mt-3 text-2xl font-black text-[var(--text-main)]">{value}</div><div className="mt-1 text-[11px] text-[var(--text-secondary)]">{helper}</div></div>;
}

function StatusBadge({ status }: { status: 'healthy' | 'attention' | 'critical' }) {
  const config = status === 'healthy' ? ['Protegido', 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'] : status === 'attention' ? ['Revisar', 'border-amber-500/20 bg-amber-500/10 text-amber-300'] : ['Crítico', 'border-red-500/20 bg-red-500/10 text-red-300'];
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${config[1]}`}>{config[0]}</span>;
}
