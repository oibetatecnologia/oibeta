import React, { useMemo } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Database, KeyRound, RefreshCw, ServerCog, ShieldCheck, Workflow } from 'lucide-react';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useObservabilitySummary from '../../hooks/useObservabilitySummary';
import usePersistenceHealth from '../../hooks/usePersistenceHealth';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useRuntimeConfiguration from '../../hooks/useRuntimeConfiguration';
import useSessionHealth from '../../hooks/useSessionHealth';

type Status = 'healthy' | 'attention' | 'critical';

const labels: Record<Status, string> = { healthy: 'Operacional', attention: 'Atenção', critical: 'Crítico' };
const classes: Record<Status, string> = {
  healthy: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  attention: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  critical: 'border-red-500/20 bg-red-500/10 text-red-300',
};

export default function PlatformHealthWorkspace() {
  const readiness = useProductionReadiness();
  const runtime = useRuntimeConfiguration();
  const persistence = usePersistenceHealth();
  const access = useAccessControlHealth();
  const session = useSessionHealth();
  const observability = useObservabilitySummary();

  const signals = useMemo(() => [
    { id: 'runtime', title: 'Configuração do ambiente', detail: `${runtime.missingVariables} variável(is) pública(s) ausente(s).`, score: runtime.score, status: runtime.productionBlocked ? 'critical' : runtime.score >= 75 ? 'healthy' : 'attention', icon: ServerCog },
    { id: 'database', title: 'Banco e persistência', detail: `Schema em ${persistence.schemaReadinessScore}% e fallback ${persistence.fallbackPolicy.enabled ? 'habilitado' : 'desabilitado'}.`, score: persistence.score, status: persistence.status, icon: Database },
    { id: 'access', title: 'Segurança e isolamento', detail: `${access.coverage.routeRules} regra(s) de rota protegida(s).`, score: access.score, status: access.status, icon: ShieldCheck },
    { id: 'session', title: 'Sessão e identidade', detail: `Origem da sessão: ${session.source || 'não validada'}.`, score: session.score, status: session.status, icon: KeyRound },
    { id: 'audit', title: 'Auditoria e observabilidade', detail: `${observability.criticalIssues} ocorrência(s) crítica(s) detectada(s).`, score: observability.score, status: observability.status, icon: Workflow },
  ] as const, [access, observability, persistence, runtime, session]);

  const critical = signals.filter((item) => item.status === 'critical').length;
  const attention = signals.filter((item) => item.status === 'attention').length;

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-sky-300 font-black">Oi Beta / Operação</span>
      <h1 className="mt-2 flex items-center gap-3 text-2xl lg:text-4xl font-black text-[var(--text-main)]"><Activity className="w-7 h-7 text-sky-300" />Centro de Saúde</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-3xl">Visão consolidada dos diagnósticos reais da plataforma, sem polling e sem indicadores preenchidos manualmente.</p>
    </section>

    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Metric label="Prontidão geral" value={`${readiness.score}%`} helper={readiness.status} />
      <Metric label="Alertas" value={attention} helper="Requerem revisão" />
      <Metric label="Bloqueios" value={critical} helper="Impedem homologação" />
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {signals.map(({ id, title, detail, score, status, icon: Icon }) => <article key={id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="flex items-center gap-2 text-sm font-black text-[var(--text-main)]"><Icon className="w-4 h-4 text-sky-300" />{title}</h2><p className="mt-2 text-xs text-[var(--text-secondary)]">{detail}</p></div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${classes[status]}`}>{labels[status]}</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-black/20 overflow-hidden"><div className="h-full rounded-full bg-sky-300" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div>
        <div className="mt-2 text-right text-xs font-black text-[var(--text-main)]">{Math.round(score)}%</div>
      </article>)}
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-xs text-[var(--text-secondary)] flex items-center gap-2"><RefreshCw className="w-4 h-4 text-sky-300" />Os diagnósticos são recalculados somente ao abrir esta área ou recarregar manualmente a aplicação.</section>
  </div>;
}

function Metric({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) {
  return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--text-secondary)]">{label}</div><div className="mt-3 text-2xl font-black text-[var(--text-main)]">{value}</div><div className="mt-1 text-[11px] text-[var(--text-secondary)]">{helper}</div></div>;
}
