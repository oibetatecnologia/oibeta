import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Rocket,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import useDeploymentEnvironments from '../../hooks/useDeploymentEnvironments';
import useDeploymentReleaseApprovals from '../../hooks/useDeploymentReleaseApprovals';
import useDeploymentReleaseExecutions from '../../hooks/useDeploymentReleaseExecutions';

interface DeploymentReleaseExecutionPanelProps {
  tenantId: string;
}

export default function DeploymentReleaseExecutionPanel({
  tenantId,
}: DeploymentReleaseExecutionPanelProps) {
  const environments = useDeploymentEnvironments(tenantId);
  const approvals = useDeploymentReleaseApprovals(100);
  const executions = useDeploymentReleaseExecutions(100);
  const [approvalId, setApprovalId] = useState('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<
    'success' | 'failed' | 'rolled_back'
  >('success');

  const approvedReleases = useMemo(
    () =>
      approvals.approvals.filter(
        (approval) => approval.status === 'approved',
      ),
    [approvals.approvals],
  );

  const selectedApproval = approvedReleases.find(
    (approval) => approval.id === approvalId,
  );

  const eligibleEnvironment = environments.environments.find(
    (environment) =>
      selectedApproval &&
      environment.kind === selectedApproval.target,
  );

  const alreadyExecuted = selectedApproval
    ? executions.executions.some(
        (execution) =>
          execution.approvalId === selectedApproval.id &&
          execution.status === 'success',
      )
    : false;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !selectedApproval ||
      !eligibleEnvironment ||
      !responsible.trim()
    ) {
      return;
    }

    await executions.create({
      approvalId: selectedApproval.id,
      environmentId: eligibleEnvironment.id,
      status,
      responsible: responsible.trim(),
      notes: notes.trim() || undefined,
    });

    await environments.refresh();
    setNotes('');
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-4">
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
          Execução controlada
        </span>
        <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-emerald-300" />
          Registro de deploy vinculado à aprovação
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Impede que homologação ou produção sejam registradas sem uma aprovação formal anterior.
        </p>
      </div>

      {(approvals.error ||
        executions.error ||
        environments.error) && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {approvals.error ||
            executions.error ||
            environments.error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Metric label="Execuções" value={executions.summary.total} />
        <Metric label="Sucesso" value={executions.summary.successful} />
        <Metric label="Falhas" value={executions.summary.failed} />
        <Metric label="Rollbacks" value={executions.summary.rolledBack} />
        <Metric
          label="Homologação"
          value={
            executions.summary.stagingExecuted
              ? 'Executada'
              : 'Pendente'
          }
        />
        <Metric
          label="Produção"
          value={
            executions.summary.productionExecuted
              ? 'Executada'
              : 'Pendente'
          }
        />
        <Metric
          label="Prontidão"
          value={`${executions.summary.readinessScore}%`}
        />
      </div>

      <form
        onSubmit={submit}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-3"
      >
        <select
          value={approvalId}
          onChange={(event) =>
            setApprovalId(event.target.value)
          }
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        >
          <option value="">Selecione uma release aprovada</option>
          {approvedReleases.map((approval) => (
            <option key={approval.id} value={approval.id}>
              {approval.version} · {approval.target}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as
                | 'success'
                | 'failed'
                | 'rolled_back',
            )
          }
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        >
          <option value="success">Sucesso</option>
          <option value="failed">Falha</option>
          <option value="rolled_back">Rollback</option>
        </select>

        <input
          value={responsible}
          onChange={(event) =>
            setResponsible(event.target.value)
          }
          placeholder="Responsável pela execução"
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
            executions.isSaving ||
            !selectedApproval ||
            !eligibleEnvironment ||
            !responsible.trim() ||
            alreadyExecuted
          }
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-200 disabled:opacity-50"
        >
          Registrar execução
        </button>
      </form>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3 text-xs text-[var(--text-secondary)]">
        {selectedApproval && eligibleEnvironment ? (
          <>
            Release <strong>{selectedApproval.version}</strong> aprovada para{' '}
            <strong>{selectedApproval.target}</strong>. Destino:{' '}
            <strong>{eligibleEnvironment.name}</strong>.
            {alreadyExecuted && (
              <span className="text-amber-300">
                {' '}Esta aprovação já possui execução concluída.
              </span>
            )}
          </>
        ) : (
          'Selecione uma aprovação para identificar o ambiente elegível.'
        )}
      </div>

      <div className="space-y-2">
        {executions.executions.slice(0, 10).map((execution) => (
          <article
            key={execution.id}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-start gap-3">
                {execution.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5" />
                ) : execution.status === 'failed' ? (
                  <XCircle className="w-4 h-4 text-red-300 mt-0.5" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-amber-300 mt-0.5" />
                )}
                <div>
                  <h3 className="text-sm font-black text-[var(--text-main)]">
                    {execution.version} · {execution.target}
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {execution.status} · responsável {execution.responsible}
                  </p>
                  {execution.notes && (
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      {execution.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[9px] text-[var(--text-secondary)] lg:text-right">
                <div className="flex items-center gap-1 lg:justify-end">
                  <History className="w-3 h-3" />
                  {new Date(
                    execution.executedAt,
                  ).toLocaleString('pt-BR')}
                </div>
                <div className="mt-1">
                  Deploy {execution.deploymentRecordId}
                </div>
              </div>
            </div>
          </article>
        ))}

        {executions.executions.length === 0 && (
          <p className="text-xs text-[var(--text-secondary)]">
            Nenhuma execução vinculada a uma aprovação.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-[10px] text-amber-100 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Este registro não dispara automaticamente a infraestrutura externa. Ele comprova a execução e atualiza o histórico operacional do ambiente.
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
