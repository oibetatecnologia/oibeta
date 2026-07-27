import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  History,
  PlayCircle,
  ShieldAlert,
} from 'lucide-react';
import useDeploymentValidations from '../../hooks/useDeploymentValidations';

export default function DeploymentValidationPanel() {
  const validation = useDeploymentValidations(50);
  const latest = validation.summary.latest;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
            Gate persistente
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <History className="w-4 h-4 text-violet-300" />
            Histórico de validação de publicação
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Registra configuração e conectividade em um snapshot auditável antes de liberar produção.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void validation.execute()}
          disabled={validation.isExecuting}
          className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[10px] font-black text-violet-200 flex items-center gap-2 disabled:opacity-50"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          Executar validação
        </button>
      </div>

      {validation.error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {validation.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Metric label="Execuções" value={validation.summary.totalRuns} />
            <Metric label="Aprovadas" value={validation.summary.approvedRuns} />
            <Metric label="Atenção" value={validation.summary.attentionRuns} />
            <Metric label="Bloqueadas" value={validation.summary.blockedRuns} />
            <Metric label="Prontidão" value={`${validation.summary.readinessScore}%`} />
            <Metric
              label="Último gate"
              value={
                latest
                  ? latest.status === 'approved'
                    ? 'Aprovado'
                    : latest.status === 'attention'
                      ? 'Atenção'
                      : 'Bloqueado'
                  : 'Não executado'
              }
            />
          </div>

          {latest && (
            <article className={`rounded-xl border p-4 ${
              latest.status === 'approved'
                ? 'border-emerald-500/25 bg-emerald-500/5'
                : latest.status === 'attention'
                  ? 'border-amber-500/25 bg-amber-500/5'
                  : 'border-red-500/25 bg-red-500/5'
            }`}>
              <div className="flex items-start gap-3">
                {latest.status === 'approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5" />
                ) : latest.status === 'attention' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-300 mt-0.5" />
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-[var(--text-main)]">
                    Última validação: {latest.score}%
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Configuração {latest.configurationScore}% · Conectividade {latest.connectivityScore}% · {latest.environment} · {latest.provider} · {latest.databaseMode}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {latest.configured} configuradas · {latest.missing} ausentes · {latest.invalid} inválidas · {latest.criticalProbes} probe(s) crítico(s)
                  </p>
                  <p className="text-[9px] font-mono text-[var(--text-secondary)] mt-2">
                    {new Date(latest.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </article>
          )}

          <div className="space-y-2">
            {validation.runs.slice(0, 8).map((run) => (
              <div
                key={run.id}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <span className={`text-[10px] font-black uppercase ${
                    run.status === 'approved'
                      ? 'text-emerald-300'
                      : run.status === 'attention'
                        ? 'text-amber-300'
                        : 'text-red-300'
                  }`}>
                    {run.status} · {run.score}%
                  </span>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Configuração {run.configurationScore}% · Conectividade {run.connectivityScore}% · {run.criticalProbes} crítico(s)
                  </p>
                </div>
                <span className="text-[9px] text-[var(--text-secondary)]">
                  {new Date(run.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3">
      <span className="block text-[9px] uppercase font-black text-[var(--text-secondary)]">
        {label}
      </span>
      <strong className="block mt-1 text-sm font-black text-[var(--text-main)]">
        {value}
      </strong>
    </div>
  );
}
