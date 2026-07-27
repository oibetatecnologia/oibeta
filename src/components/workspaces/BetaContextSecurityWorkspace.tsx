import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { HttpRepositoryClient } from '../../core/persistence/HttpRepositoryClient';

interface BetaContextIsolationSummary {
  enabled: boolean;
  strictWorkspaceBinding: boolean;
  resolvedRequests: number;
  blockedWorkspaceConflicts: number;
  blockedMissingWorkspace: number;
  developmentFallbacks: number;
  lastBlockedAt?: string;
  rules: Record<string, boolean>;
}

const ruleLabels: Record<string, string> = {
  organizationFromSessionOnly: 'A organização é obtida exclusivamente da sessão autenticada',
  tenantWorkspaceConflictBlocked: 'Conflitos de workspace são bloqueados para usuários do cliente',
  productionRequiresSessionWorkspace: 'Produção exige workspace vinculado à sessão',
  assistantRoutesUseCentralResolver: 'Rotas de contexto da Beta usam um resolvedor centralizado',
};

export default function BetaContextSecurityWorkspace() {
  const [summary, setSummary] = useState<BetaContextIsolationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await HttpRepositoryClient.get<BetaContextIsolationSummary>('/api/admin/security/beta-context');
      setSummary(response);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar o diagnóstico do contexto da Beta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const activeRules = useMemo(
    () => summary ? Object.values(summary.rules).filter(Boolean).length : 0,
    [summary],
  );
  const blocked = (summary?.blockedWorkspaceConflicts || 0) + (summary?.blockedMissingWorkspace || 0);
  const status = !summary?.enabled ? 'critical' : activeRules === 4 ? 'healthy' : 'attention';

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-violet-300 font-black">Oi Beta / Inteligência segura</span>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl lg:text-4xl font-black text-[var(--text-main)]"><BrainCircuit className="w-7 h-7 text-violet-300" />Contexto isolado da Beta</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-3xl">Diagnóstico das regras que impedem a Beta de consultar contexto de outro workspace ou organização por parâmetros enviados pelo navegador.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-black text-[var(--text-main)] disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>
      </div>
    </section>

    {error && <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 flex items-center gap-2"><XCircle className="w-5 h-5" />{error}</section>}

    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <Metric label="Proteção" value={summary?.enabled ? 'Ativa' : 'Inativa'} helper={summary?.strictWorkspaceBinding ? 'Vínculo estrito' : 'Modo de desenvolvimento'} />
      <Metric label="Regras ativas" value={`${activeRules}/4`} helper="Controles do contexto" />
      <Metric label="Contextos resolvidos" value={summary?.resolvedRequests ?? 0} helper="Desde o início do servidor" />
      <Metric label="Bloqueios" value={blocked} helper={summary?.lastBlockedAt ? new Date(summary.lastBlockedAt).toLocaleString('pt-BR') : 'Nenhum registrado'} />
      <Metric label="Fallbacks locais" value={summary?.developmentFallbacks ?? 0} helper="Somente fora de produção" />
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-black text-[var(--text-main)]">Regras de isolamento do assistente</h2>
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

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-xs text-[var(--text-secondary)] flex gap-3">
      <ShieldCheck className="w-5 h-5 text-violet-300 shrink-0" />
      <p>As rotas de contexto, status, snapshot e linha do tempo da Beta agora usam a organização da sessão como referência oficial. Em produção, usuários de clientes também precisam ter um workspace válido vinculado à sessão.</p>
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
