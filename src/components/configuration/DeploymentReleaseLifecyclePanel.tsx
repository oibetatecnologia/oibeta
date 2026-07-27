import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileCheck2, HeartPulse, RotateCcw } from 'lucide-react';
import useDeploymentReleaseExecutions from '../../hooks/useDeploymentReleaseExecutions';
import useDeploymentReleaseLifecycles from '../../hooks/useDeploymentReleaseLifecycles';
import type { DeploymentEvidenceType } from '../../core/configuration/DeploymentReleaseLifecycleTypes';

export default function DeploymentReleaseLifecyclePanel() {
  const executions = useDeploymentReleaseExecutions(100);
  const lifecycle = useDeploymentReleaseLifecycles(100);
  const [executionId, setExecutionId] = useState('');
  const [responsible, setResponsible] = useState('');
  const [evidenceType, setEvidenceType] = useState<DeploymentEvidenceType>('lint');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');

  const selected = useMemo(
    () => lifecycle.lifecycles.find((item) => item.executionId === executionId),
    [executionId, lifecycle.lifecycles],
  );

  const initialize = async () => {
    if (!executionId || !responsible.trim()) return;
    await lifecycle.initialize(executionId, responsible.trim());
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-4">
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
          Super Lote A
        </span>
        <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-violet-300" />
          Cutover, evidências, pós-deploy e rollback
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Consolida o encerramento técnico da release e impede a conclusão sem evidências e saúde pós-deploy.
        </p>
      </div>

      {(lifecycle.error || executions.error) && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {lifecycle.error || executions.error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Metric label="Ciclos" value={lifecycle.summary.total} />
        <Metric label="Preparando" value={lifecycle.summary.preparing} />
        <Metric label="Verificados" value={lifecycle.summary.verified} />
        <Metric label="Concluídos" value={lifecycle.summary.completed} />
        <Metric label="Rollback exigido" value={lifecycle.summary.rollbackRequired} />
        <Metric label="Checklist" value={`${lifecycle.summary.checklistCompletion}%`} />
        <Metric label="Evidências" value={`${lifecycle.summary.evidenceCompletion}%`} />
        <Metric label="Prontidão" value={`${lifecycle.summary.readinessScore}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={executionId}
          onChange={(event) => setExecutionId(event.target.value)}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        >
          <option value="">Selecione uma execução</option>
          {executions.executions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.version} · {item.target} · {item.status}
            </option>
          ))}
        </select>
        <input
          value={responsible}
          onChange={(event) => setResponsible(event.target.value)}
          placeholder="Responsável"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]"
        />
        <button
          type="button"
          onClick={() => void initialize()}
          disabled={!executionId || !responsible.trim() || lifecycle.isSaving}
          className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-200 disabled:opacity-50"
        >
          Iniciar ciclo operacional
        </button>
      </div>

      {selected && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4">
            <h3 className="text-sm font-black text-[var(--text-main)]">
              {selected.version} · {selected.target} · {selected.status}
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Responsável: {selected.responsible} · atualizado em {new Date(selected.updatedAt).toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-3">
              <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Checklist de cutover
              </h3>
              {selected.checklist.map((item) => (
                <label key={item.id} className="flex items-start gap-3 text-xs text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={!responsible.trim() || lifecycle.isSaving}
                    onChange={(event) => void lifecycle.updateChecklist(
                      selected.id,
                      item.id,
                      event.target.checked,
                      responsible.trim(),
                    )}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-3">
              <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" /> Evidências
              </h3>
              <select
                value={evidenceType}
                onChange={(event) => setEvidenceType(event.target.value as DeploymentEvidenceType)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)]"
              >
                {['lint','build','migration','gate','approval','deploy','health_check','other'].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input
                value={evidenceLabel}
                onChange={(event) => setEvidenceLabel(event.target.value)}
                placeholder="Descrição da evidência"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)]"
              />
              <input
                value={evidenceReference}
                onChange={(event) => setEvidenceReference(event.target.value)}
                placeholder="Referência, URL, hash ou observação"
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)]"
              />
              <button
                type="button"
                disabled={!responsible.trim() || !evidenceLabel.trim() || !evidenceReference.trim() || lifecycle.isSaving}
                onClick={() => void lifecycle.addEvidence(selected.id, {
                  type: evidenceType,
                  label: evidenceLabel,
                  reference: evidenceReference,
                  recordedBy: responsible,
                }).then(() => {
                  setEvidenceLabel('');
                  setEvidenceReference('');
                })}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[10px] font-black text-cyan-200 disabled:opacity-50"
              >
                Registrar evidência
              </button>
              <div className="text-[10px] text-[var(--text-secondary)]">
                {selected.evidences.map((item) => (
                  <div key={item.id}>{item.type}: {item.label}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void lifecycle.verify(selected.id)}
              disabled={lifecycle.isSaving}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-200 disabled:opacity-50 flex items-center gap-2"
            >
              <HeartPulse className="w-3.5 h-3.5" /> Verificar pós-deploy
            </button>
            <button
              type="button"
              onClick={() => void lifecycle.complete(selected.id)}
              disabled={lifecycle.isSaving}
              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[10px] font-black text-blue-200 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Encerrar release
            </button>
          </div>

          {selected.postDeployChecks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {selected.postDeployChecks.map((check) => (
                <div key={check.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-3">
                  <strong className="text-xs text-[var(--text-main)]">{check.label}</strong>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">{check.status}: {check.detail}</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
            <h3 className="text-sm font-black text-red-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Rollback controlado
            </h3>
            <input
              value={rollbackReason}
              onChange={(event) => setRollbackReason(event.target.value)}
              placeholder="Motivo obrigatório"
              className="w-full rounded-lg border border-red-500/20 bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)]"
            />
            <button
              type="button"
              disabled={!rollbackReason.trim() || !responsible.trim() || lifecycle.isSaving}
              onClick={() => void lifecycle.rollback(selected.id, rollbackReason, responsible)}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-200 disabled:opacity-50"
            >
              Executar rollback
            </button>
          </div>
        </div>
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
