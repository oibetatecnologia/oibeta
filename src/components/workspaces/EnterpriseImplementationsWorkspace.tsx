import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  Rocket,
  UserCheck,
} from 'lucide-react';
import useClientsWorkspace, { type ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import type { ClientImplementationRecord, ClientImplementationStatus } from '../../hooks/useClientState';
import CustomerOperationsPanel from '../customerOperations/CustomerOperationsPanel';
import useImplementationIntelligence from '../../hooks/useImplementationIntelligence';
import ImplementationCommandCenter from '../implementations/ImplementationCommandCenter';
import type { ImplementationActionItem } from '../../core/implementations/ImplementationIntelligenceTypes';

const IMPLEMENTATION_STATUS_LABELS: Record<ClientImplementationStatus, string> = {
  preparation: 'Preparação',
  in_progress: 'Em andamento',
  waiting_client: 'Aguardando cliente',
  training: 'Treinamento',
  go_live: 'Go-live',
  completed: 'Concluída',
  blocked: 'Bloqueada',
};

const IMPLEMENTATION_STATUS_CLASSES: Record<ClientImplementationStatus, string> = {
  preparation: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  in_progress: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  waiting_client: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  training: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  go_live: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  blocked: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const STANDARD_CHECKLIST = [
  {
    id: 'kickoff',
    label: 'Kickoff realizado',
    description: 'Alinhar objetivo, escopo, responsáveis e cronograma com o cliente.',
    done: false,
  },
  {
    id: 'tenant-setup',
    label: 'Ambiente configurado',
    description: 'Criar organização, workspace, módulos contratados e configurações iniciais.',
    done: false,
  },
  {
    id: 'users-permissions',
    label: 'Usuários e permissões',
    description: 'Cadastrar usuários principais e validar papéis operacionais.',
    done: false,
  },
  {
    id: 'initial-data',
    label: 'Dados iniciais carregados',
    description: 'Importar ou cadastrar dados mínimos para iniciar a operação.',
    done: false,
  },
  {
    id: 'training',
    label: 'Treinamento concluído',
    description: 'Treinar usuários-chave e registrar dúvidas operacionais.',
    done: false,
  },
  {
    id: 'go-live',
    label: 'Go-live aprovado',
    description: 'Validar uso real da plataforma e transferir cliente para operação assistida.',
    done: false,
  },
];

const IMPLEMENTATION_CLIENT_STATUSES = new Set(['contracted', 'active', 'paused']);

export default function EnterpriseImplementationsWorkspace() {
  const { createTask, tasks } = useWorkspace().tasks;
  const [creatingChecklistTaskKey, setCreatingChecklistTaskKey] = useState<string | null>(null);
  const [creatingIntelligenceActionId, setCreatingIntelligenceActionId] = useState<string | null>(null);

  const {
    clientsList,
    implementationsCount,
    averageImplementationProgress,
    operationalFlowSummary,
    clientLifecycleSummary,
    clientServiceLevelSummary,
    handleAddImplementation,
    handleToggleImplementationItem,
  } = useClientsWorkspace();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [responsible, setResponsible] = useState('Equipe de implantação Oi Beta');
  const [expectedGoLiveDate, setExpectedGoLiveDate] = useState('');

  const eligibleClients = useMemo(
    () => clientsList.filter((client) => IMPLEMENTATION_CLIENT_STATUSES.has(client.status)),
    [clientsList]
  );

  const implementations = useMemo(
    () =>
      eligibleClients.flatMap((client) =>
        client.implementations.map((implementation) => ({
          client,
          implementation,
        }))
      ),
    [eligibleClients]
  );

  const clientsWithoutImplementation = useMemo(
    () => eligibleClients.filter((client) => client.implementations.length === 0),
    [eligibleClients]
  );

  const blockedImplementations = implementations.filter(({ implementation }) => implementation.status === 'blocked').length;
  const completedImplementations = implementations.filter(({ implementation }) => implementation.status === 'completed').length;
  const activeImplementations = implementations.filter(({ implementation }) => !['completed', 'blocked'].includes(implementation.status)).length;
  const waitingClientImplementations = implementations.filter(({ implementation }) => implementation.status === 'waiting_client').length;

  const selectedClient = eligibleClients.find((client) => client.id === selectedClientId) || clientsWithoutImplementation[0] || eligibleClients[0];

  const implementationIntelligence = useImplementationIntelligence(clientsList, tasks);

  const handleCreateIntelligenceTask = async (action: ImplementationActionItem) => {
    if (action.alreadyCreated) return;
    setCreatingIntelligenceActionId(action.id);
    try {
      await createTask(action.taskTitle);
    } finally {
      setCreatingIntelligenceActionId(null);
    }
  };

  const handleCreateStandardImplementation = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedClient) return;

    handleAddImplementation(selectedClient.id, {
      title: `Implantação ${selectedClient.name || selectedClient.entity || 'Cliente'}`,
      status: 'preparation',
      progress: 0,
      responsible: responsible.trim() || 'Equipe de implantação Oi Beta',
      expectedGoLiveDate: expectedGoLiveDate || undefined,
      checklist: STANDARD_CHECKLIST,
      notes: 'Implantação padrão criada pela área operacional da Oi Beta.',
    });

    setSelectedClientId('');
    setExpectedGoLiveDate('');
  };

  const handleCreateChecklistTask = async (
    client: ClientsWorkspaceClient,
    implementation: ClientImplementationRecord,
    item: ClientImplementationRecord['checklist'][number]
  ) => {
    const taskKey = `${implementation.id}-${item.id}`;
    const clientName = client.name || client.entity || 'Cliente';
    const title = `[Implantação] ${clientName}: ${item.label} — ${implementation.title}`;

    setCreatingChecklistTaskKey(taskKey);

    try {
      await createTask(title);
    } finally {
      setCreatingChecklistTaskKey(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_40%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-[var(--blue-accent)] font-black">
              Oi Beta / Entrega
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Rocket className="w-7 h-7 text-[var(--blue-accent)]" />
              Implantações
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área operacional para conduzir onboarding, configuração inicial, treinamento, pendências e go-live dos clientes contratados pela Oi Beta.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--blue-accent)]/20 bg-[var(--blue-accent)]/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-[var(--cyan-accent)]">Beta na implantação</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Aqui eu acompanho clientes contratados, identifico gargalos, mostro pendências e ajudo a conduzir cada entrega até o go-live.
            </p>
          </div>
        </div>
      </section>

      <CustomerOperationsPanel focus="implementation" />

      <ImplementationCommandCenter
        summary={implementationIntelligence}
        creatingId={creatingIntelligenceActionId}
        onCreateTask={(action) => void handleCreateIntelligenceTask(action)}
      />


      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <ImplementationMetricCard icon={<PackageCheck className="w-4 h-4" />} label="Implantações" value={implementationsCount} helper="Total registrado" />
        <ImplementationMetricCard icon={<Clock3 className="w-4 h-4" />} label="Em andamento" value={activeImplementations} helper="Ainda não concluídas" />
        <ImplementationMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Concluídas" value={completedImplementations} helper="Go-live aprovado" />
        <ImplementationMetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Bloqueadas" value={blockedImplementations} helper={`${waitingClientImplementations} aguardando cliente`} />
        <ImplementationMetricCard icon={<ClipboardCheck className="w-4 h-4" />} label="Progresso médio" value={`${averageImplementationProgress}%`} helper="Checklist da base" />
        <ImplementationMetricCard icon={<Rocket className="w-4 h-4" />} label="SLA implantação" value={`${clientServiceLevelSummary.score}%`} helper={`${clientServiceLevelSummary.implementationBreaches} violações`} />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Esteira de implantação
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Clientes em implantação</h2>
            </div>
            <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 self-start">
              Pós-contrato
            </span>
          </div>

          {implementations.length === 0 ? (
            <EmptyImplementationState />
          ) : (
            <div className="space-y-4">
              {implementations.map(({ client, implementation }) => (
                <ImplementationCard
                  key={implementation.id}
                  client={client}
                  implementation={implementation}
                  onToggleItem={handleToggleImplementationItem}
                  onCreateChecklistTask={handleCreateChecklistTask}
                  creatingTaskKey={creatingChecklistTaskKey}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <form onSubmit={handleCreateStandardImplementation} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Nova implantação
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Criar checklist padrão</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Selecione um cliente contratado/ativo e gere a implantação padrão da Oi Beta.
              </p>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Cliente</span>
              <select
                value={selectedClientId || selectedClient?.id || ''}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
              >
                {eligibleClients.length === 0 ? (
                  <option value="">Nenhum cliente contratado/ativo</option>
                ) : (
                  eligibleClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name || client.entity || 'Cliente sem nome'}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Responsável</span>
              <input
                type="text"
                value={responsible}
                onChange={(event) => setResponsible(event.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--blue-accent)]"
                placeholder="Equipe de implantação Oi Beta"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Go-live previsto</span>
              <input
                type="date"
                value={expectedGoLiveDate}
                onChange={(event) => setExpectedGoLiveDate(event.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
              />
            </label>

            <button
              type="submit"
              disabled={!selectedClient || eligibleClients.length === 0}
              className="w-full rounded-xl bg-[var(--blue-accent)] text-white font-black text-sm px-4 py-3 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              Criar implantação padrão
            </button>
          </form>

          <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-5 space-y-3">
            <h2 className="text-sm font-black text-indigo-300">Regra operacional</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              O CRM fecha a venda. Clientes contratados aparecem aqui para implantação. Ao concluir o checklist, o cliente passa a estar pronto para operação assistida e suporte contínuo.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ImplementationMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-secondary)] font-black block mt-4">
        {label}
      </span>
      <strong className="text-2xl font-black text-[var(--text-main)] block mt-1">{value}</strong>
      <span className="text-xs text-[var(--text-secondary)]">{helper}</span>
    </div>
  );
}

function EmptyImplementationState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/25 p-8 text-center">
      <Rocket className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
      <h3 className="text-lg font-black text-[var(--text-main)]">Nenhuma implantação criada ainda</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl mx-auto leading-relaxed">
        Quando um cliente estiver contratado ou ativo, crie a implantação padrão para acompanhar ambiente, usuários, dados iniciais, treinamento e go-live.
      </p>
    </div>
  );
}

function ImplementationCard({
  client,
  implementation,
  onToggleItem,
  onCreateChecklistTask,
  creatingTaskKey,
}: {
  client: ClientsWorkspaceClient;
  implementation: ClientImplementationRecord;
  onToggleItem: (clientId: string, implementationId: string, itemId: string) => void;
  onCreateChecklistTask: (
    client: ClientsWorkspaceClient,
    implementation: ClientImplementationRecord,
    item: ClientImplementationRecord['checklist'][number]
  ) => Promise<void>;
  creatingTaskKey: string | null;
}) {
  const doneItems = implementation.checklist.filter((item) => item.done).length;
  const totalItems = implementation.checklist.length;

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-[var(--text-main)] truncate">{implementation.title}</h3>
            <span className={`text-[10px] uppercase font-mono font-black px-2 py-1 rounded-full border ${IMPLEMENTATION_STATUS_CLASSES[implementation.status]}`}>
              {IMPLEMENTATION_STATUS_LABELS[implementation.status]}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {[client.name || client.entity, implementation.responsible ? `Responsável: ${implementation.responsible}` : null, implementation.expectedGoLiveDate ? `Go-live: ${formatDate(implementation.expectedGoLiveDate)}` : null].filter(Boolean).join(' • ')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 min-w-fit">
          <MiniImplementationMetric label="Progresso" value={`${implementation.progress}%`} />
          <MiniImplementationMetric label="Checklist" value={`${doneItems}/${totalItems}`} />
          <MiniImplementationMetric label="Health" value={`${client.healthScore}%`} />
        </div>
      </div>

      <div className="h-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
        <div
          className="h-full bg-[var(--blue-accent)] transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, implementation.progress))}%` }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {implementation.checklist.map((item) => {
          const taskKey = `${implementation.id}-${item.id}`;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 transition ${
                item.done
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onToggleItem(client.id, implementation.id, item.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                    item.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-[var(--border-color)] text-transparent hover:border-[var(--blue-accent)]'
                  }`}
                  title={item.done ? 'Marcar como pendente' : 'Marcar como concluído'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                <div className="min-w-0 flex-1">
                  <strong className="text-xs font-black text-[var(--text-main)] block">{item.label}</strong>
                  <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed block mt-1">{item.description}</span>

                  {!item.done && (
                    <button
                      type="button"
                      onClick={() => void onCreateChecklistTask(client, implementation, item)}
                      disabled={creatingTaskKey === taskKey}
                      className="mt-3 rounded-lg border border-[var(--blue-accent)]/30 bg-[var(--blue-accent)]/10 px-3 py-1.5 text-[11px] font-black text-[var(--cyan-accent)] hover:bg-[var(--blue-accent)]/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingTaskKey === taskKey ? 'Criando tarefa...' : 'Criar tarefa'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ImplementationInfoBlock icon={<UserCheck className="w-4 h-4" />} label="Responsável" value={implementation.responsible || 'Não definido'} />
        <ImplementationInfoBlock icon={<CalendarClock className="w-4 h-4" />} label="Go-live" value={implementation.expectedGoLiveDate ? formatDate(implementation.expectedGoLiveDate) : 'Sem previsão'} />
        <ImplementationInfoBlock icon={<ClipboardCheck className="w-4 h-4" />} label="Observações" value={implementation.notes || 'Sem observações registradas'} />
      </div>
    </article>
  );
}

function MiniImplementationMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2">
      <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span>
      <strong className="text-sm font-black text-[var(--text-main)] block mt-1">{value}</strong>
    </div>
  );
}

function ImplementationInfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
      <div className="flex items-center gap-2 text-[var(--blue-accent)]">
        {icon}
        <span className="text-[10px] uppercase font-mono tracking-widest font-black">{label}</span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{value}</p>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}
