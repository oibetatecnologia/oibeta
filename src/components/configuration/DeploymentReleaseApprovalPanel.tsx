import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Rocket,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import useDeploymentValidations from '../../hooks/useDeploymentValidations';
import useDeploymentReleaseApprovals from '../../hooks/useDeploymentReleaseApprovals';

export default function DeploymentReleaseApprovalPanel() {
  const validations = useDeploymentValidations(50);
  const approvals = useDeploymentReleaseApprovals(100);
  const [target, setTarget] = useState<'staging' | 'production'>(
    'staging',
  );
  const [version, setVersion] = useState('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');

  const eligibleValidation = useMemo(() => {
    if (target === 'production') {
      return validations.runs.find(
        (run) =>
          run.status === 'approved' &&
          !run.productionBlocked,
      );
    }

    return validations.runs.find(
      (run) => run.status !== 'blocked',
    );
  }, [target, validations.runs]);

  const requestApproval = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();
    if (
      !eligibleValidation ||
      !version.trim() ||
      !responsible.trim()
    ) {
      return;
    }

    await approvals.create({
      validationRunId: eligibleValidation.id,
      target,
      version: version.trim(),
      requestedBy: responsible.trim(),
      notes: notes.trim() || undefined,
    });

    setVersion('');
    setNotes('');
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-4">
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
          Governança de release
        </span>
        <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-300" />
          Aprovação de homologação e produção
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Vincula cada solicitação de release a um gate técnico persistente.
        </p>
      </div>

      {(approvals.error || validations.error) && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {approvals.error || validations.error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Metric label="Solicitações" value={approvals.summary.total} />
        <Metric label="Pendentes" value={approvals.summary.pending} />
        <Metric label="Aprovadas" value={approvals.summary.approved} />
        <Metric label="Rejeitadas" value={approvals.summary.rejected} />
        <Metric
          label="Homologação"
          value={
            approvals.summary.stagingApproved
              ? 'Aprovada'
              : 'Pendente'
          }
        />
        <Metric
          label="Produção"
          value={
            approvals.summary.productionApproved
              ? 'Aprovada'
              : 'Pendente'
          }
        />
        <Metric
          label="Prontidão"
          value={`${approvals.summary.readinessScore}%`}
        />
      </div>

      <form
        onSubmit={requestApproval}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-3"
      >
        <select
          value={target}
          onChange={(event) =>
            setTarget(
              event.target.value as
                | 'staging'
                | 'production',
            )
          }
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        >
          <option value="staging">Homologação</option>
          <option value="production">Produção</option>
        </select>

        <input
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          placeholder="Versão, ex.: RC-1.0.0"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        />

        <input
          value={responsible}
          onChange={(event) =>
            setResponsible(event.target.value)
          }
          placeholder="Solicitante responsável"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        />

        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Observações"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        />

        <button
          type="submit"
          disabled={
            approvals.isSaving ||
            !eligibleValidation ||
            !version.trim() ||
            !responsible.trim()
          }
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-200 disabled:opacity-50"
        >
          Solicitar aprovação
        </button>
      </form>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3 text-xs text-[var(--text-secondary)]">
        {eligibleValidation ? (
          <>
            Gate selecionado: <strong>{eligibleValidation.status}</strong> · score{' '}
            <strong>{eligibleValidation.score}%</strong> · executado em{' '}
            {new Date(
              eligibleValidation.createdAt,
            ).toLocaleString('pt-BR')}
          </>
        ) : (
          <>
            Não existe gate elegível para {target === 'production'
              ? 'produção'
              : 'homologação'}.
          </>
        )}
      </div>

      <div className="space-y-2">
        {approvals.approvals.slice(0, 10).map((approval) => (
          <article
            key={approval.id}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {approval.status === 'approved' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : approval.status === 'pending' ? (
                    <Clock3 className="w-4 h-4 text-amber-300" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-300" />
                  )}
                  <h3 className="text-sm font-black text-[var(--text-main)]">
                    {approval.version} · {approval.target}
                  </h3>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                  Gate {approval.validationStatus} com {approval.validationScore}% · solicitado por {approval.requestedBy}
                </p>
                {approval.notes && (
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {approval.notes}
                  </p>
                )}
              </div>

              {approval.status === 'pending' ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={approvals.isSaving}
                    onClick={() =>
                      void approvals.decide(approval.id, {
                        status: 'approved',
                        decidedBy: responsible.trim() || 'Administrador',
                      })
                    }
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-200 disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={approvals.isSaving}
                    onClick={() =>
                      void approvals.decide(approval.id, {
                        status: 'rejected',
                        decidedBy: responsible.trim() || 'Administrador',
                      })
                    }
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-200 disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-black uppercase text-[var(--text-secondary)]">
                  {approval.status}
                </span>
              )}
            </div>
          </article>
        ))}

        {approvals.approvals.length === 0 && (
          <p className="text-xs text-[var(--text-secondary)]">
            Nenhuma solicitação de release registrada.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3 text-[10px] text-cyan-100 flex items-start gap-2">
        <Rocket className="w-4 h-4 shrink-0" />
        Aprovação de release não executa o deploy automaticamente. Ela formaliza o gate anterior ao registro da publicação no ambiente.
      </div>
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
