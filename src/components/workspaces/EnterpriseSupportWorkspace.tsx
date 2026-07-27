import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Headphones,
  LifeBuoy,
  MessageCircle,
  Plus,
  ShieldAlert,
  TimerReset,
  UserCheck,
} from 'lucide-react';
import useClientsWorkspace, { type ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import type { ClientSupportTicketPriority, ClientSupportTicketStatus } from '../../hooks/useClientState';
import CustomerOperationsPanel from '../customerOperations/CustomerOperationsPanel';
import useSupportIntelligence from '../../hooks/useSupportIntelligence';
import SupportCommandCenter from '../support/SupportCommandCenter';

const SUPPORT_STATUS_LABELS: Record<ClientSupportTicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_client: 'Aguardando cliente',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};

const SUPPORT_STATUS_CLASSES: Record<ClientSupportTicketStatus, string> = {
  open: 'bg-red-500/10 text-red-300 border-red-500/20',
  in_progress: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  waiting_client: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  closed: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

const SUPPORT_PRIORITY_LABELS: Record<ClientSupportTicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const SUPPORT_PRIORITY_CLASSES: Record<ClientSupportTicketPriority, string> = {
  low: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  medium: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const SUPPORT_CLIENT_STATUSES = new Set(['contracted', 'active', 'paused']);

export default function EnterpriseSupportWorkspace() {
  const { createTask, tasks } = useWorkspace().tasks;
  const [creatingSupportTaskKey, setCreatingSupportTaskKey] = useState<string | null>(null);

  const {
    clientsList,
    supportTicketsCount,
    openSupportTicketsCount,
    operationalFlowSummary,
    clientLifecycleSummary,
    clientRevenueSummary,
    clientSuccessSummary,
    clientServiceLevelSummary,
    handleAddSupportTicket,
    handleUpdateSupportTicketStatus,
  } = useClientsWorkspace();

  const supportIntelligence = useSupportIntelligence(clientsList);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [title, setTitle] = useState('Dúvida operacional do cliente');
  const [status, setStatus] = useState<ClientSupportTicketStatus>('open');
  const [priority, setPriority] = useState<ClientSupportTicketPriority>('medium');
  const [description, setDescription] = useState('');

  const eligibleClients = useMemo(
    () => clientsList.filter((client) => SUPPORT_CLIENT_STATUSES.has(client.status)),
    [clientsList]
  );

  const selectedClient = eligibleClients.find((client) => client.id === selectedClientId) || eligibleClients[0];

  const supportEntries = useMemo(
    () =>
      clientsList.flatMap((client) =>
        client.supportTickets.map((ticket) => ({
          client,
          ticket,
        }))
      ),
    [clientsList]
  );

  const openTickets = supportEntries.filter(({ ticket }) => ticket.status === 'open').length;
  const inProgressTickets = supportEntries.filter(({ ticket }) => ticket.status === 'in_progress').length;
  const waitingClientTickets = supportEntries.filter(({ ticket }) => ticket.status === 'waiting_client').length;
  const resolvedTickets = supportEntries.filter(({ ticket }) => ticket.status === 'resolved' || ticket.status === 'closed').length;
  const criticalTickets = supportEntries.filter(({ ticket }) => ticket.priority === 'critical' && ticket.status !== 'closed').length;
  const highPriorityTickets = supportEntries.filter(({ ticket }) => ticket.priority === 'high' && !['resolved', 'closed'].includes(ticket.status)).length;
  const activeSupportClients = clientsList.filter((client) =>
    client.supportTickets.some((ticket) => !['resolved', 'closed'].includes(ticket.status))
  ).length;

  const supportHealthScore = supportTicketsCount === 0
    ? 100
    : Math.max(0, Math.round(((resolvedTickets + waitingClientTickets * 0.35) / supportTicketsCount) * 100));

  const betaSupportQueue = useMemo(() => {
    const actions: { id: string; title: string; description: string; priority: 'alta' | 'média' | 'baixa' }[] = [];

    supportEntries
      .filter(({ ticket }) => ticket.priority === 'critical' && !['resolved', 'closed'].includes(ticket.status))
      .slice(0, 4)
      .forEach(({ client, ticket }) => {
        actions.push({
          id: `critical-${ticket.id}`,
          title: `Chamado crítico — ${client.name || client.entity}`,
          description: ticket.description || ticket.title,
          priority: 'alta',
        });
      });

    supportEntries
      .filter(({ ticket }) => ticket.status === 'open')
      .slice(0, 4)
      .forEach(({ client, ticket }) => {
        actions.push({
          id: `open-${ticket.id}`,
          title: `Chamado aguardando triagem — ${client.name || client.entity}`,
          description: ticket.description || ticket.title,
          priority: ticket.priority === 'high' ? 'alta' : 'média',
        });
      });

    supportEntries
      .filter(({ ticket }) => ticket.status === 'waiting_client')
      .slice(0, 3)
      .forEach(({ client, ticket }) => {
        actions.push({
          id: `waiting-${ticket.id}`,
          title: `Aguardando retorno — ${client.name || client.entity}`,
          description: ticket.description || ticket.title,
          priority: 'baixa',
        });
      });

    clientServiceLevelSummary.items
      .filter((item) => item.area === 'support')
      .slice(0, 4)
      .forEach((item) => {
        actions.unshift({
          id: `sla-support-${item.id}`,
          title: item.title,
          description: item.description,
          priority: item.severity,
        });
      });

    return actions.slice(0, 6);
  }, [clientServiceLevelSummary.items, supportEntries]);

  const handleCreateSupportTask = async (
    client: ClientsWorkspaceClient,
    ticket: ClientsWorkspaceClient['supportTickets'][number]
  ) => {
    const taskKey = `${client.id}-${ticket.id}`;
    const clientName = client.name || client.entity || 'Cliente';
    const priority = SUPPORT_PRIORITY_LABELS[ticket.priority];
    const status = SUPPORT_STATUS_LABELS[ticket.status];
    const title = `[Suporte] ${clientName}: ${ticket.title} (${priority} • ${status})`;

    setCreatingSupportTaskKey(taskKey);

    try {
      await createTask(title);
    } finally {
      setCreatingSupportTaskKey(null);
    }
  };

  const handleCreateTicket = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedClient || !title.trim()) return;

    handleAddSupportTicket(selectedClient.id, {
      title,
      status,
      priority,
      description,
    });

    setTitle('Dúvida operacional do cliente');
    setStatus('open');
    setPriority('medium');
    setDescription('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-sky-400 font-black">
              Oi Beta / Suporte Operacional
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Headphones className="w-7 h-7 text-sky-400" />
              Suporte
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área para registrar chamados, acompanhar SLA, priorizar atendimentos, manter histórico operacional dos clientes e preparar a base de conhecimento da Beta.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-sky-200 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Beta no suporte
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Aqui eu acompanho chamados críticos, identifico clientes em risco e transformo dúvidas recorrentes em conhecimento reutilizável.
            </p>
          </div>
        </div>
      </section>

      <CustomerOperationsPanel focus="support" />

      <SupportCommandCenter summary={supportIntelligence} tasks={tasks} createTask={createTask} />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <SupportMetricCard icon={<LifeBuoy className="w-4 h-4" />} label="Chamados" value={supportTicketsCount} helper="Total registrado" />
        <SupportMetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Abertos" value={openTickets} helper={`${openSupportTicketsCount} ativos`} />
        <SupportMetricCard icon={<Clock3 className="w-4 h-4" />} label="Em atendimento" value={inProgressTickets} helper="Fila da equipe" />
        <SupportMetricCard icon={<TimerReset className="w-4 h-4" />} label="Aguardando" value={waitingClientTickets} helper="Dependem do cliente" />
        <SupportMetricCard icon={<ShieldAlert className="w-4 h-4" />} label="Críticos" value={criticalTickets} helper={`${highPriorityTickets} alta prioridade`} />
        <SupportMetricCard icon={<UserCheck className="w-4 h-4" />} label="Clientes" value={activeSupportClients} helper="Com chamado ativo" />
        <SupportMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Resolvidos" value={resolvedTickets} helper="Resolvidos/encerrados" />
        <SupportMetricCard icon={<MessageCircle className="w-4 h-4" />} label="SLA suporte" value={`${clientServiceLevelSummary.score}%`} helper={`${clientServiceLevelSummary.supportBreaches} violações`} />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Central de atendimento
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Chamados dos clientes</h2>
            </div>

            <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
              Pós-venda
            </span>
          </div>

          {supportEntries.length === 0 ? (
            <EmptySupportState />
          ) : (
            <div className="space-y-3">
              {supportEntries.map(({ client, ticket }) => (
                <SupportTicketCard
                  key={`${client.id}-${ticket.id}`}
                  client={client}
                  ticket={ticket}
                  onChangeStatus={(nextStatus) => handleUpdateSupportTicketStatus(client.id, ticket.id, nextStatus)}
                  onCreateSupportTask={handleCreateSupportTask}
                  creatingTaskKey={creatingSupportTaskKey}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <form onSubmit={handleCreateTicket} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Novo chamado
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Registrar atendimento</h2>
            </div>

            {eligibleClients.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Cadastre ou contrate um cliente antes de registrar chamados de suporte.
              </p>
            ) : (
              <>
                <label className="space-y-1.5 block">
                  <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Cliente</span>
                  <select
                    value={selectedClient?.id || ''}
                    onChange={(event) => setSelectedClientId(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500"
                  >
                    {eligibleClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name || client.entity}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Título</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500"
                    placeholder="Ex.: Dúvida sobre relatório"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1.5 block">
                    <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Status</span>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as ClientSupportTicketStatus)}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500"
                    >
                      {Object.entries(SUPPORT_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 block">
                    <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Prioridade</span>
                    <select
                      value={priority}
                      onChange={(event) => setPriority(event.target.value as ClientSupportTicketPriority)}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500"
                    >
                      {Object.entries(SUPPORT_PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Descrição</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-sky-500 resize-none"
                    placeholder="Contexto do atendimento, impacto, próximos passos ou evidências."
                  />
                </label>

                <button
                  type="submit"
                  disabled={!selectedClient || !title.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Criar chamado
                </button>
              </>
            )}
          </form>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Prioridades
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Fila da Beta</h2>
            </div>

            {betaSupportQueue.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Nenhum chamado crítico ou pendência de suporte encontrada. Quando houver risco operacional, a Beta destacará aqui.
              </p>
            ) : (
              <div className="space-y-3">
                {betaSupportQueue.map((action) => (
                  <div key={action.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-[var(--text-main)]">{action.title}</h3>
                      <span className={`text-[10px] uppercase font-mono font-black ${resolvePriorityClass(action.priority)}`}>
                        {action.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{action.description}</p>
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

function SupportMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 flex items-center justify-center">
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

function SupportTicketCard({
  client,
  ticket,
  onChangeStatus,
  onCreateSupportTask,
  creatingTaskKey,
}: {
  client: ClientsWorkspaceClient;
  ticket: ClientsWorkspaceClient['supportTickets'][number];
  onChangeStatus: (status: ClientSupportTicketStatus) => void;
  onCreateSupportTask: (
    client: ClientsWorkspaceClient,
    ticket: ClientsWorkspaceClient['supportTickets'][number]
  ) => Promise<void>;
  creatingTaskKey: string | null;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-[var(--text-main)] truncate">{ticket.title}</h3>
            <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${SUPPORT_STATUS_CLASSES[ticket.status]}`}>
              {SUPPORT_STATUS_LABELS[ticket.status]}
            </span>
            <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${SUPPORT_PRIORITY_CLASSES[ticket.priority]}`}>
              {SUPPORT_PRIORITY_LABELS[ticket.priority]}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {client.name || client.entity} • Criado em {formatDate(ticket.createdAt)}
          </p>

          {ticket.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
              {ticket.description}
            </p>
          )}

          {!['resolved', 'closed'].includes(ticket.status) && (
            <button
              type="button"
              onClick={() => void onCreateSupportTask(client, ticket)}
              disabled={creatingTaskKey === `${client.id}-${ticket.id}`}
              className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-black text-sky-200 hover:bg-sky-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingTaskKey === `${client.id}-${ticket.id}` ? 'Criando tarefa...' : 'Criar tarefa de suporte'}
            </button>
          )}
        </div>

        <label className="space-y-1.5 block xl:min-w-[210px]">
          <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Atualizar status</span>
          <select
            value={ticket.status}
            onChange={(event) => onChangeStatus(event.target.value as ClientSupportTicketStatus)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-sky-500"
          >
            {Object.entries(SUPPORT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function EmptySupportState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/25 p-8 text-center">
      <Headphones className="w-10 h-10 mx-auto text-sky-300" />
      <h3 className="text-lg font-black text-[var(--text-main)] mt-4">Nenhum chamado registrado</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl mx-auto leading-relaxed">
        Quando clientes ativos começarem a solicitar suporte, os chamados aparecerão aqui com prioridade, status, histórico e fila operacional da Beta.
      </p>
    </div>
  );
}

function resolvePriorityClass(priority: 'alta' | 'média' | 'baixa') {
  if (priority === 'alta') return 'text-red-300';
  if (priority === 'média') return 'text-amber-300';
  return 'text-slate-300';
}

function formatDate(value?: string) {
  if (!value) return 'sem data';

  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  } catch {
    return value;
  }
}
