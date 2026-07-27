import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Database,
  Gauge,
  KeyRound,
  RefreshCw,
  Rocket,
  ServerCog,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import useAccessControlHealth from '../../hooks/useAccessControlHealth';
import useObservabilitySummary from '../../hooks/useObservabilitySummary';
import usePersistenceHealth from '../../hooks/usePersistenceHealth';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import useRuntimeConfiguration from '../../hooks/useRuntimeConfiguration';
import useSessionHealth from '../../hooks/useSessionHealth';
import useAdminDirectory from '../../hooks/useAdminDirectory';

type GateStatus = 'ready' | 'attention' | 'blocked';

interface ReleaseGate {
  id: string;
  title: string;
  description: string;
  score: number;
  status: GateStatus;
  source: string;
}

const statusLabel: Record<GateStatus, string> = {
  ready: 'Aprovado',
  attention: 'Revisar',
  blocked: 'Bloqueado',
};

const statusClasses: Record<GateStatus, string> = {
  ready: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  attention: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  blocked: 'border-red-500/20 bg-red-500/10 text-red-300',
};

const normalizeScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

export default function ReleaseCandidateWorkspace() {
  const productionReadiness = useProductionReadiness();
  const runtimeConfiguration = useRuntimeConfiguration();
  const persistenceHealth = usePersistenceHealth();
  const accessControl = useAccessControlHealth();
  const sessionHealth = useSessionHealth();
  const observability = useObservabilitySummary();
  const directory = useAdminDirectory();

  const gates = useMemo<ReleaseGate[]>(() => [
    {
      id: 'deployment',
      title: 'Implantação dos clientes',
      description: `${directory.tenants.filter((tenant) => tenant.status === 'active').length} de ${directory.tenants.length} tenant(s) ativos para operação.`,
      score: directory.tenants.length === 0
        ? 0
        : normalizeScore((directory.tenants.filter((tenant) => tenant.status === 'active' && tenant.licensedProductIds.length > 0).length / directory.tenants.length) * 100),
      status: directory.error
        ? 'blocked'
        : directory.tenants.length === 0
          ? 'attention'
          : directory.tenants.every((tenant) => tenant.status === 'active' && tenant.licensedProductIds.length > 0)
            ? 'ready'
            : 'attention',
      source: 'Deployment Monitor',
    },
    {
      id: 'runtime',
      title: 'Configuração do ambiente',
      description: `${runtimeConfiguration.missingVariables} variável(is) pública(s) ausente(s).`,
      score: normalizeScore(runtimeConfiguration.score),
      status: runtimeConfiguration.productionBlocked
        ? 'blocked'
        : runtimeConfiguration.score >= 75
          ? 'ready'
          : 'attention',
      source: 'Runtime Configuration',
    },
    {
      id: 'persistence',
      title: 'Persistência e banco',
      description: `Schema em ${persistenceHealth.schemaReadinessScore}% e fallback ${persistenceHealth.fallbackPolicy.enabled ? 'habilitado' : 'desabilitado'}.`,
      score: normalizeScore(persistenceHealth.score),
      status: persistenceHealth.status === 'critical'
        ? 'blocked'
        : persistenceHealth.status === 'attention'
          ? 'attention'
          : 'ready',
      source: 'Persistence Health',
    },
    {
      id: 'access',
      title: 'Autorização e isolamento',
      description: `${accessControl.coverage.routeRules} regra(s) de rota protegida(s) detectada(s).`,
      score: normalizeScore(accessControl.score),
      status: accessControl.status === 'critical'
        ? 'blocked'
        : accessControl.status === 'attention'
          ? 'attention'
          : 'ready',
      source: 'Access Control Health',
    },
    {
      id: 'session',
      title: 'Sessão e identidade',
      description: `Origem da sessão: ${sessionHealth.source || 'não validada'}.`,
      score: normalizeScore(sessionHealth.score),
      status: sessionHealth.status === 'critical'
        ? 'blocked'
        : sessionHealth.status === 'attention'
          ? 'attention'
          : 'ready',
      source: 'Session Health',
    },
    {
      id: 'observability',
      title: 'Auditoria e observabilidade',
      description: `${observability.criticalIssues} problema(s) crítico(s) identificado(s).`,
      score: normalizeScore(observability.score),
      status: observability.status === 'critical'
        ? 'blocked'
        : observability.status === 'attention'
          ? 'attention'
          : 'ready',
      source: 'Observability Summary',
    },
  ], [
    directory.error,
    directory.tenants,
    accessControl.coverage.routeRules,
    accessControl.score,
    accessControl.status,
    observability.criticalIssues,
    observability.score,
    observability.status,
    persistenceHealth.fallbackPolicy.enabled,
    persistenceHealth.schemaReadinessScore,
    persistenceHealth.score,
    persistenceHealth.status,
    runtimeConfiguration.missingVariables,
    runtimeConfiguration.productionBlocked,
    runtimeConfiguration.score,
    sessionHealth.score,
    sessionHealth.source,
    sessionHealth.status,
  ]);

  const blocked = gates.filter((gate) => gate.status === 'blocked').length;
  const attention = gates.filter((gate) => gate.status === 'attention').length;
  const approved = gates.filter((gate) => gate.status === 'ready').length;
  const releaseAllowed = blocked === 0 && productionReadiness.status !== 'blocked';

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_38%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-emerald-300 font-black">
              Oi Beta / Release Candidate
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Rocket className="w-7 h-7 text-emerald-300" />
              Checklist RC-1
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Gate consolidado de homologação baseado nos diagnósticos reais já existentes na plataforma. Nenhum indicador desta tela é preenchido manualmente.
            </p>
          </div>

          <div className={`rounded-2xl border p-4 min-w-[240px] ${releaseAllowed ? statusClasses.ready : statusClasses.blocked}`}>
            <div className="flex items-center gap-2 text-sm font-black">
              {releaseAllowed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {releaseAllowed ? 'Liberada para homologação' : 'Homologação bloqueada'}
            </div>
            <p className="text-xs mt-2 opacity-90">
              Prontidão geral: {productionReadiness.score}%
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric icon={<Gauge className="w-4 h-4" />} label="Prontidão" value={`${productionReadiness.score}%`} helper={productionReadiness.status} />
        <Metric icon={<CheckCircle2 className="w-4 h-4" />} label="Aprovados" value={approved} helper={`${gates.length} gates avaliados`} />
        <Metric icon={<CircleDashed className="w-4 h-4" />} label="Em revisão" value={attention} helper="Não bloqueiam isoladamente" />
        <Metric icon={<AlertTriangle className="w-4 h-4" />} label="Bloqueios" value={blocked} helper="Impedem homologação" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {gates.map((gate) => (
          <article key={gate.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <GateIcon id={gate.id} />
                  <h2 className="text-sm font-black text-[var(--text-main)]">{gate.title}</h2>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{gate.description}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClasses[gate.status]}`}>
                {statusLabel[gate.status]}
              </span>
            </div>

            <div className="mt-4 h-2 rounded-full bg-black/20 overflow-hidden">
              <div className="h-full rounded-full bg-current" style={{ width: `${gate.score}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
              <span>{gate.source}</span>
              <strong className="text-[var(--text-main)]">{gate.score}%</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-sky-300" />
          <h2 className="text-sm font-black text-[var(--text-main)]">Política de atualização</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
          Os diagnósticos são calculados quando esta área é aberta. Este workspace não adiciona polling, temporizador ou atualização periódica à aplicação.
        </p>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-black text-[var(--text-secondary)]">
        {icon}{label}
      </div>
      <div className="text-2xl font-black text-[var(--text-main)] mt-3">{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)] mt-1">{helper}</div>
    </div>
  );
}

function GateIcon({ id }: { id: string }) {
  const classes = 'w-4 h-4 text-emerald-300';
  if (id === 'runtime') return <ServerCog className={classes} />;
  if (id === 'persistence') return <Database className={classes} />;
  if (id === 'access') return <ShieldCheck className={classes} />;
  if (id === 'session') return <KeyRound className={classes} />;
  if (id === 'deployment') return <Rocket className={classes} />;
  return <Workflow className={classes} />;
}
