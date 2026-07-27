import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  GitBranch,
  Globe2,
  HardDrive,
  History,
  PlayCircle,
  RefreshCw,
  Rocket,
  Save,
  Server,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { usePlatformContext } from '../../contexts/platform/usePlatformContext';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import useDeploymentEnvironments from '../../hooks/useDeploymentEnvironments';
import useProductionReadiness from '../../hooks/useProductionReadiness';
import DeploymentConfigurationPanel from '../configuration/DeploymentConfigurationPanel';
import DeploymentConnectivityPanel from '../configuration/DeploymentConnectivityPanel';
import DeploymentValidationPanel from '../configuration/DeploymentValidationPanel';
import DeploymentReleaseApprovalPanel from '../configuration/DeploymentReleaseApprovalPanel';
import DeploymentReleaseExecutionPanel from '../configuration/DeploymentReleaseExecutionPanel';
import DeploymentReleaseLifecyclePanel from '../configuration/DeploymentReleaseLifecyclePanel';
import type {
  DeploymentEnvironment,
  DeploymentEnvironmentKind,
  DeploymentEnvironmentStatus,
  DeploymentRecord,
} from '../../core/deployment/DeploymentEnvironmentTypes';

const KIND_LABELS: Record<DeploymentEnvironmentKind, string> = {
  development: 'Desenvolvimento',
  staging: 'Homologação',
  production: 'Produção',
};

const STATUS_LABELS: Record<DeploymentEnvironmentStatus, string> = {
  ready: 'Operacional',
  attention: 'Atenção',
  pending: 'Pendente',
  offline: 'Indisponível',
};

const STATUS_CLASSES: Record<DeploymentEnvironmentStatus, string> = {
  ready: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  attention: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  pending: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  offline: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const KIND_CLASSES: Record<DeploymentEnvironmentKind, string> = {
  development: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  staging: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  production: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

export default function EnterpriseClientEnvironmentsWorkspace() {
  const platform = usePlatformContext();
  const { createTask } = useWorkspace().tasks;
  const directory = useAdminDirectory();
  const productionReadiness = useProductionReadiness();
  const [selectedTenantId, setSelectedTenantId] = useState(
    platform.currentTenant.organizationId,
  );
  const deployment = useDeploymentEnvironments(selectedTenantId);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (
      directory.tenants.length > 0 &&
      !directory.tenants.some(
        (tenant) =>
          tenant.id === selectedTenantId ||
          tenant.organizationId === selectedTenantId,
      )
    ) {
      setSelectedTenantId(directory.tenants[0].id);
    }
  }, [directory.tenants, selectedTenantId]);

  useEffect(() => {
    if (
      deployment.environments.length > 0 &&
      !deployment.environments.some(
        (environment) => environment.id === selectedEnvironmentId,
      )
    ) {
      setSelectedEnvironmentId(
        deployment.environments.find(
          (environment) => environment.kind === 'staging',
        )?.id || deployment.environments[0].id,
      );
    }
  }, [deployment.environments, selectedEnvironmentId]);

  const selectedTenant = directory.tenants.find(
    (tenant) =>
      tenant.id === selectedTenantId ||
      tenant.organizationId === selectedTenantId,
  );
  const selectedEnvironment = deployment.environments.find(
    (environment) => environment.id === selectedEnvironmentId,
  );
  const history =
    deployment.deploymentsByEnvironment[selectedEnvironmentId] || [];

  useEffect(() => {
    if (selectedEnvironmentId) {
      void deployment.loadDeployments(selectedEnvironmentId);
    }
  }, [deployment.loadDeployments, selectedEnvironmentId]);

  const queue = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'alta' | 'média';
      taskTitle: string;
    }> = [];

    if (!deployment.summary.stagingReady) {
      items.push({
        id: 'staging',
        title: 'Homologação ainda não operacional',
        description:
          'O ambiente de staging precisa estar pronto antes dos testes multiusuário e das integrações externas.',
        priority: 'alta',
        taskTitle: '[Ambientes] Tornar homologação operacional',
      });
    }

    if (!deployment.summary.productionReady) {
      items.push({
        id: 'production',
        title: 'Produção ainda não publicada',
        description:
          'Nenhum ambiente de produção está marcado como operacional para o tenant selecionado.',
        priority: 'alta',
        taskTitle: '[Ambientes] Preparar publicação de produção',
      });
    }

    if (deployment.summary.offlineEnvironments > 0) {
      items.push({
        id: 'offline',
        title: 'Ambientes indisponíveis',
        description: `${deployment.summary.offlineEnvironments} ambiente(s) estão marcados como indisponíveis.`,
        priority: 'alta',
        taskTitle: '[Ambientes] Restaurar ambientes indisponíveis',
      });
    }

    if (deployment.summary.pendingEnvironments > 0) {
      items.push({
        id: 'pending',
        title: 'Configurações pendentes',
        description: `${deployment.summary.pendingEnvironments} ambiente(s) ainda precisam de configuração.`,
        priority: 'média',
        taskTitle: '[Ambientes] Concluir configurações pendentes',
      });
    }

    return items.slice(0, 5);
  }, [deployment.summary]);

  const createEnvironmentTask = async (item: {
    id: string;
    taskTitle: string;
  }) => {
    setCreatingTaskId(item.id);
    try {
      await createTask(item.taskTitle);
    } finally {
      setCreatingTaskId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_38%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-sky-300 font-black">
              Oi Beta / Ambientes
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Cloud className="w-7 h-7 text-sky-300" />
              Ambientes e Deploy
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Controle persistente de desenvolvimento, homologação e produção por tenant, com saúde técnica e histórico de publicação.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-sky-200 flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Gate de publicação
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Homologação e produção deixam de ser projeções estáticas e passam a compor a prontidão real da plataforma.
            </p>
          </div>
        </div>
      </section>

      {(directory.error || deployment.error) && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {deployment.error || directory.error}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <EnvironmentMetricCard icon={<Server className="w-4 h-4" />} label="Ambientes" value={deployment.summary.totalEnvironments} helper={selectedTenant?.name || selectedTenantId} />
        <EnvironmentMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Operacionais" value={deployment.summary.readyEnvironments} helper="Prontos" />
        <EnvironmentMetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Atenção" value={deployment.summary.attentionEnvironments} helper="Revisar" />
        <EnvironmentMetricCard icon={<PlayCircle className="w-4 h-4" />} label="Pendentes" value={deployment.summary.pendingEnvironments} helper="A configurar" />
        <EnvironmentMetricCard icon={<Globe2 className="w-4 h-4" />} label="Homologação" value={deployment.summary.stagingReady ? 'Pronta' : 'Pendente'} helper="Gate de testes" />
        <EnvironmentMetricCard icon={<Rocket className="w-4 h-4" />} label="Produção" value={deployment.summary.productionReady ? 'Ativa' : 'Pendente'} helper="Gate comercial" />
        <EnvironmentMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Ambientes" value={`${deployment.summary.readinessScore}%`} helper="Prontidão técnica" />
        <EnvironmentMetricCard icon={<GitBranch className="w-4 h-4" />} label="Plataforma" value={`${productionReadiness.score}%`} helper={productionReadiness.status} />
      </section>

      <DeploymentConfigurationPanel />
      <DeploymentConnectivityPanel />

      <DeploymentValidationPanel />

      <DeploymentReleaseApprovalPanel />

      <DeploymentReleaseExecutionPanel tenantId={selectedTenantId} />

      <DeploymentReleaseLifecyclePanel />

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Ambientes por tenant
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">
                Configuração operacional
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)]"
              >
                {directory.tenants.length === 0 && (
                  <option value={platform.currentTenant.organizationId}>
                    {platform.currentTenant.organizationId}
                  </option>
                )}
                {directory.tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void deployment.refresh()}
                disabled={deployment.isLoading}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-xs font-black text-[var(--text-main)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${deployment.isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>

          {deployment.isLoading ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Carregando ambientes...
            </p>
          ) : (
            <div className="space-y-4">
              {deployment.environments.map((environment) => (
                <EditableEnvironmentCard
                  key={environment.id}
                  environment={environment}
                  isSaving={deployment.isSaving}
                  onSave={deployment.updateEnvironment}
                  onSelectHistory={() =>
                    setSelectedEnvironmentId(environment.id)
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <DeploymentForm
            environment={selectedEnvironment}
            isSaving={deployment.isSaving}
            onRecord={deployment.recordDeployment}
          />

          <DeploymentHistory
            environment={selectedEnvironment}
            deployments={history}
          />

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Fila da Beta
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">
                Próximas ações
              </h2>
            </div>

            {queue.length === 0 ? (
              <p className="text-xs text-emerald-300">
                Nenhum bloqueio operacional de ambiente identificado.
              </p>
            ) : (
              <div className="space-y-3">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-black text-[var(--text-main)]">
                        {item.title}
                      </h3>
                      <span className={`text-[10px] uppercase font-mono font-black ${item.priority === 'alta' ? 'text-red-300' : 'text-amber-300'}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                      {item.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => void createEnvironmentTask(item)}
                      disabled={creatingTaskId === item.id}
                      className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-black text-sky-200 disabled:opacity-50"
                    >
                      {creatingTaskId === item.id
                        ? 'Criando tarefa...'
                        : 'Criar tarefa'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function EditableEnvironmentCard({
  environment,
  isSaving,
  onSave,
  onSelectHistory,
}: {
  environment: DeploymentEnvironment;
  isSaving: boolean;
  onSave: (
    environmentId: string,
    input: Partial<DeploymentEnvironment>,
  ) => Promise<DeploymentEnvironment>;
  onSelectHistory: () => void;
}) {
  const [draft, setDraft] = useState(environment);

  useEffect(() => {
    setDraft(environment);
  }, [environment]);

  const hasChanges =
    JSON.stringify({
      status: draft.status,
      version: draft.version,
      url: draft.url,
      databaseStatus: draft.databaseStatus,
      storageStatus: draft.storageStatus,
      apiStatus: draft.apiStatus,
      notes: draft.notes,
    }) !==
    JSON.stringify({
      status: environment.status,
      version: environment.version,
      url: environment.url,
      databaseStatus: environment.databaseStatus,
      storageStatus: environment.storageStatus,
      apiStatus: environment.apiStatus,
      notes: environment.notes,
    });

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${KIND_CLASSES[draft.kind]}`}>
              {KIND_LABELS[draft.kind]}
            </span>
            <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${STATUS_CLASSES[draft.status]}`}>
              {STATUS_LABELS[draft.status]}
            </span>
          </div>
          <h3 className="text-base font-black text-[var(--text-main)] mt-3">
            {draft.name}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Último deploy: {draft.lastDeployAt
              ? `${draft.lastDeployVersion || draft.version} em ${new Date(draft.lastDeployAt).toLocaleString('pt-BR')}`
              : 'não registrado'}
          </p>
        </div>

        <button
          type="button"
          onClick={onSelectHistory}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[11px] font-black text-[var(--text-main)] flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          Histórico
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Field label="Status">
          <StatusSelect
            value={draft.status}
            onChange={(status) => setDraft((current) => ({ ...current, status }))}
          />
        </Field>
        <Field label="Versão">
          <input
            value={draft.version}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                version: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
          />
        </Field>
        <Field label="URL">
          <input
            value={draft.url}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                url: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
          />
        </Field>
        <Field label="Banco">
          <StatusSelect
            value={draft.databaseStatus}
            onChange={(databaseStatus) =>
              setDraft((current) => ({ ...current, databaseStatus }))
            }
          />
        </Field>
        <Field label="Storage">
          <StatusSelect
            value={draft.storageStatus}
            onChange={(storageStatus) =>
              setDraft((current) => ({ ...current, storageStatus }))
            }
          />
        </Field>
        <Field label="API">
          <StatusSelect
            value={draft.apiStatus}
            onChange={(apiStatus) =>
              setDraft((current) => ({ ...current, apiStatus }))
            }
          />
        </Field>
        <label className="md:col-span-2 xl:col-span-2 space-y-1">
          <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block">Observações</span>
          <textarea
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
          />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <a
          href={draft.url.startsWith('http') ? draft.url : `https://${draft.url}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-black text-sky-300 flex items-center gap-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir ambiente
        </a>

        <button
          type="button"
          disabled={!hasChanges || isSaving}
          onClick={() =>
            void onSave(environment.id, {
              status: draft.status,
              version: draft.version,
              url: draft.url,
              databaseStatus: draft.databaseStatus,
              storageStatus: draft.storageStatus,
              apiStatus: draft.apiStatus,
              notes: draft.notes,
            })
          }
          className="rounded-lg bg-sky-500 px-3 py-2 text-[11px] font-black text-slate-950 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Salvar ambiente
        </button>
      </div>
    </article>
  );
}

function DeploymentForm({
  environment,
  isSaving,
  onRecord,
}: {
  environment?: DeploymentEnvironment;
  isSaving: boolean;
  onRecord: (
    environmentId: string,
    input: {
      version: string;
      status: DeploymentRecord['status'];
      responsible: string;
      notes?: string;
    },
  ) => Promise<unknown>;
}) {
  const [version, setVersion] = useState('');
  const [status, setStatus] =
    useState<DeploymentRecord['status']>('success');
  const [responsible, setResponsible] = useState(
    'Equipe de desenvolvimento Oi Beta',
  );
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setVersion(environment?.version || '');
  }, [environment?.id, environment?.version]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!environment || !version.trim() || !responsible.trim()) return;

    await onRecord(environment.id, {
      version: version.trim(),
      status,
      responsible: responsible.trim(),
      notes: notes.trim() || undefined,
    });
    setNotes('');
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-3"
    >
      <div>
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
          Publicação
        </span>
        <h2 className="text-lg font-black text-[var(--text-main)] mt-1">
          Registrar deploy
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {environment
            ? `${environment.name} · ${KIND_LABELS[environment.kind]}`
            : 'Selecione um ambiente.'}
        </p>
      </div>

      <Field label="Versão">
        <input
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
        />
      </Field>

      <Field label="Resultado">
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as DeploymentRecord['status'])
          }
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
        >
          <option value="success">Sucesso</option>
          <option value="failed">Falhou</option>
          <option value="rolled_back">Rollback</option>
        </select>
      </Field>

      <Field label="Responsável">
        <input
          value={responsible}
          onChange={(event) => setResponsible(event.target.value)}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
        />
      </Field>

      <Field label="Notas">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
        />
      </Field>

      <button
        type="submit"
        disabled={!environment || isSaving || !version.trim()}
        className="w-full rounded-xl bg-[var(--blue-accent)] px-3 py-2.5 text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <GitBranch className="w-4 h-4" />
        {isSaving ? 'Registrando...' : 'Registrar deploy'}
      </button>
    </form>
  );
}

function DeploymentHistory({
  environment,
  deployments,
}: {
  environment?: DeploymentEnvironment;
  deployments: DeploymentRecord[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div>
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
          Histórico
        </span>
        <h2 className="text-lg font-black text-[var(--text-main)] mt-1">
          Últimos deploys
        </h2>
      </div>

      {!environment || deployments.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)]">
          Nenhum deploy registrado para este ambiente.
        </p>
      ) : (
        <div className="space-y-2">
          {deployments.slice(0, 6).map((deployment) => (
            <div
              key={deployment.id}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-xs text-[var(--text-main)]">
                  {deployment.version}
                </strong>
                <span className={`text-[9px] uppercase font-mono font-black ${
                  deployment.status === 'success'
                    ? 'text-emerald-300'
                    : deployment.status === 'failed'
                      ? 'text-red-300'
                      : 'text-amber-300'
                }`}>
                  {deployment.status}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                {deployment.responsible} ·{' '}
                {new Date(deployment.deployedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EnvironmentMetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-secondary)] font-black block mt-4">
        {label}
      </span>
      <strong className="text-2xl font-black text-[var(--text-main)] block mt-1">
        {value}
      </strong>
      <span className="text-xs text-[var(--text-secondary)]">{helper}</span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block">{label}</span>
      {children}
    </label>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: DeploymentEnvironmentStatus;
  onChange: (status: DeploymentEnvironmentStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value as DeploymentEnvironmentStatus)
      }
      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
    >
      <option value="ready">Operacional</option>
      <option value="attention">Atenção</option>
      <option value="pending">Pendente</option>
      <option value="offline">Indisponível</option>
    </select>
  );
}
