import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import useDeploymentConfiguration from '../../hooks/useDeploymentConfiguration';

export default function DeploymentConfigurationPanel() {
  const diagnostics = useDeploymentConfiguration();
  const { summary } = diagnostics;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
            Diagnóstico backend
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-sky-300" />
            Supabase, Vercel e segredos
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Validação server-side sem expor os valores reais das credenciais.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void diagnostics.refresh()}
          disabled={diagnostics.isLoading}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-[10px] font-black text-[var(--text-main)] flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              diagnostics.isLoading ? 'animate-spin' : ''
            }`}
          />
          Atualizar diagnóstico
        </button>
      </div>

      {diagnostics.error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {diagnostics.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <Metric label="Score" value={`${summary.score}%`} />
            <Metric label="Provider" value={summary.provider} />
            <Metric label="Ambiente" value={summary.environment} />
            <Metric label="Banco" value={summary.databaseMode} />
            <Metric label="Configuradas" value={summary.configured} />
            <Metric label="Ausentes" value={summary.missing} />
            <Metric label="Inválidas" value={summary.invalid} />
            <Metric
              label="Produção"
              value={summary.productionBlocked ? 'Bloqueada' : 'Liberada'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {summary.checks.map((check) => (
              <article
                key={check.key}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4 flex items-start gap-3"
              >
                <div className="mt-0.5">
                  {check.status === 'configured' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : check.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-black text-[var(--text-main)]">
                      {check.label}
                    </h3>
                    <span className="text-[9px] uppercase font-mono text-[var(--text-secondary)]">
                      {check.key}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {check.description}
                  </p>
                  {check.maskedValue && (
                    <p className="text-[9px] font-mono text-sky-300 mt-2">
                      {check.maskedValue}
                    </p>
                  )}
                </div>
              </article>
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
      <span className="block text-[8px] uppercase font-black tracking-wider text-[var(--text-secondary)]">
        {label}
      </span>
      <strong className="block text-sm font-black text-[var(--text-main)] mt-1 capitalize">
        {value}
      </strong>
    </div>
  );
}
