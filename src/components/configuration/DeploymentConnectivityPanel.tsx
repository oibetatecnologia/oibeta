import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import useDeploymentConnectivity from '../../hooks/useDeploymentConnectivity';

export default function DeploymentConnectivityPanel() {
  const diagnostics = useDeploymentConnectivity();
  const { summary } = diagnostics;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
            Probes reais
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-300" />
            Conectividade de publicação
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Testa o acesso real do backend ao Supabase e confirma o runtime de deploy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void diagnostics.refresh()}
          disabled={diagnostics.isLoading}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${diagnostics.isLoading ? 'animate-spin' : ''}`} />
          Executar probes
        </button>
      </div>

      {diagnostics.error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {diagnostics.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Metric label="Score" value={`${summary.score}%`} />
            <Metric label="Saudáveis" value={summary.healthy} />
            <Metric label="Atenção" value={summary.attention} />
            <Metric label="Críticos" value={summary.critical} />
            <Metric label="Ignorados" value={summary.skipped} />
            <Metric label="Produção" value={summary.productionBlocked ? 'Bloqueada' : 'Liberada'} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {summary.checks.map((check) => (
              <article key={check.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4 flex items-start gap-3">
                {check.status === 'healthy' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5" />
                ) : check.status === 'critical' ? (
                  <WifiOff className="w-4 h-4 text-red-300 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5" />
                )}
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-[var(--text-main)]">{check.label}</h3>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">{check.description}</p>
                  <p className="text-[9px] font-mono text-[var(--text-secondary)] mt-2">
                    {check.target} · {check.durationMs} ms{check.httpStatus ? ` · HTTP ${check.httpStatus}` : ''}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
      <span className="block text-[9px] uppercase font-black text-[var(--text-secondary)]">{label}</span>
      <strong className="block mt-1 text-sm font-black text-[var(--text-main)]">{value}</strong>
    </div>
  );
}
