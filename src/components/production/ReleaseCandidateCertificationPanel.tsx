import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
} from 'lucide-react';
import useReleaseCandidateCertifications from '../../hooks/useReleaseCandidateCertifications';

export default function ReleaseCandidateCertificationPanel() {
  const certification = useReleaseCandidateCertifications(50);
  const [version, setVersion] = useState('RC-1');
  const [responsible, setResponsible] = useState('');
  const latest = certification.summary.latest;

  const canApprove = useMemo(
    () =>
      Boolean(
        latest &&
          latest.status !== 'approved' &&
          latest.blockedControls === 0 &&
          latest.pendingControls === 0 &&
          responsible.trim(),
      ),
    [latest, responsible],
  );

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
            Certificação final
          </span>
          <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-300" />
            Gate executivo para RC-1
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-3xl">
            Consolida qualidade, segurança, LGPD, continuidade, operação, contratos e aceite funcional antes da liberação da primeira release candidate.
          </p>
        </div>

        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!version.trim() || !responsible.trim()) return;
            void certification.create({
              version: version.trim(),
              createdBy: responsible.trim(),
            });
          }}
        >
          <input
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            placeholder="Versão"
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
          />
          <input
            value={responsible}
            onChange={(event) =>
              setResponsible(event.target.value)
            }
            placeholder="Responsável"
            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
          />
          <button
            type="submit"
            disabled={certification.isSaving}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-200 disabled:opacity-50"
          >
            Iniciar certificação
          </button>
        </form>
      </div>

      {certification.error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {certification.error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Metric label="Certificações" value={certification.summary.total} />
        <Metric label="Aprovadas" value={certification.summary.approved} />
        <Metric label="Em atenção" value={certification.summary.attention} />
        <Metric label="Bloqueadas" value={certification.summary.blocked} />
        <Metric label="Cobertura" value={`${certification.summary.controlCoverage}%`} />
        <Metric label="Prontidão RC-1" value={`${certification.summary.readinessScore}%`} />
      </div>

      {latest ? (
        <>
          <div className={`rounded-xl border p-4 ${
            latest.status === 'approved'
              ? 'border-emerald-500/25 bg-emerald-500/5'
              : latest.status === 'blocked'
                ? 'border-red-500/25 bg-red-500/5'
                : 'border-amber-500/25 bg-amber-500/5'
          }`}>
            <div className="flex items-start gap-3">
              {latest.status === 'approved' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5" />
              ) : latest.status === 'blocked' ? (
                <ShieldAlert className="w-5 h-5 text-red-300 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5" />
              )}
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)]">
                  {latest.version} · {latest.status}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  {latest.approvedControls} aprovados · {latest.pendingControls} pendentes · {latest.blockedControls} bloqueados
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {latest.controls.map((control) => (
              <article
                key={control.id}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4"
              >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div>
                    <span className="text-[9px] uppercase font-black text-[var(--text-secondary)]">
                      {control.category}
                    </span>
                    <h3 className="text-sm font-black text-[var(--text-main)] mt-1">
                      {control.title}
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      {control.description}
                    </p>
                    {control.evidence && (
                      <p className="text-[10px] text-cyan-200 mt-1">
                        Evidência: {control.evidence}
                      </p>
                    )}
                  </div>

                  {latest.status !== 'approved' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          certification.isSaving ||
                          !responsible.trim()
                        }
                        onClick={() =>
                          void certification.updateControl(
                            latest.id,
                            control.id,
                            {
                              status: 'approved',
                              owner: responsible.trim(),
                              evidence:
                                control.evidence ||
                                'Validado no ambiente oficial',
                            },
                          )
                        }
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-200 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={
                          certification.isSaving ||
                          !responsible.trim()
                        }
                        onClick={() =>
                          void certification.updateControl(
                            latest.id,
                            control.id,
                            {
                              status: 'blocked',
                              owner: responsible.trim(),
                              notes:
                                'Controle bloqueado durante a certificação.',
                            },
                          )
                        }
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-200 disabled:opacity-50"
                      >
                        Bloquear
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          {latest.status !== 'approved' && (
            <button
              type="button"
              disabled={!canApprove || certification.isSaving}
              onClick={() =>
                void certification.approve(
                  latest.id,
                  responsible.trim(),
                )
              }
              className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-200 disabled:opacity-50"
            >
              Aprovar certificação RC-1
            </button>
          )}
        </>
      ) : (
        <p className="text-xs text-[var(--text-secondary)]">
          Nenhuma certificação RC-1 foi iniciada.
        </p>
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
