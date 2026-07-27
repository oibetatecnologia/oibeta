import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Headphones,
  PackageCheck,
  ShieldCheck,
  Loader2,
  Link2,
  Users,
} from 'lucide-react';
import useClientsWorkspace, { type ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import CustomerOperationsPanel from '../customerOperations/CustomerOperationsPanel';
import CustomerPortfolioCommandCenter from '../customerSuccess/CustomerPortfolioCommandCenter';

const CLIENT_STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Diagnóstico',
  proposal: 'Proposta',
  contracted: 'Contratado',
  active: 'Ativo',
  paused: 'Pausado',
  lost: 'Perdido',
};

const OPERATIONAL_STATUSES = new Set(['contracted', 'active', 'paused']);

export default function EnterpriseClientsWorkspace() {
  const { createTask, tasks } = useWorkspace().tasks;
  const [creatingOperationalTaskId, setCreatingOperationalTaskId] = useState<string | null>(null);
  const [provisioningMessage, setProvisioningMessage] = useState<string>();

  const {
    clientsList,
    totalClients,
    activeClients,
    contractsCount,
    implementationsCount,
    averageImplementationProgress,
    financialRecordsCount,
    overdueAmount,
    operationalBacklog,
    operationalFlowSummary,
    clientLifecycle,
    clientLifecycleSummary,
    clientRevenueSummary,
    clientSuccessSummary,
    clientExecutiveSummary,
    supportTicketsCount,
    openSupportTicketsCount,
    contractsValue,
    averageHealthScore,
    handlePrepareContractedClient,
    preparingClientId,
    provisioningError,
  } = useClientsWorkspace();

  const operationalClients = useMemo(
    () => clientsList.filter((client) => OPERATIONAL_STATUSES.has(client.status)),
    [clientsList]
  );

  const clientsWaitingImplementation = useMemo(
    () =>
      operationalClients.filter((client) =>
        client.implementations.length === 0 || client.implementations.some((implementation) => implementation.status !== 'completed')
      ),
    [operationalClients]
  );

  const clientsWithOpenSupport = useMemo(
    () =>
      operationalClients.filter((client) =>
        client.supportTickets.some((ticket) => !['closed', 'resolved'].includes(ticket.status))
      ),
    [operationalClients]
  );

  const clientsWithOverdueFinancial = useMemo(
    () => operationalClients.filter((client) => client.financialRecords.some((record) => record.status === 'overdue')),
    [operationalClients]
  );

  const nextOperationalActions = useMemo(() => {
    const actions: {
      id: string;
      title: string;
      description: string;
      priority: 'alta' | 'média' | 'baixa';
      target: 'implementation' | 'support' | 'finance';
      taskTitle?: string;
    }[] = operationalBacklog.slice(0, 4).map((item) => ({
      id: `backlog-${item.id}`,
      title: item.title,
      description: item.description,
      priority: item.priority,
      target: item.area === 'support' ? 'support' : item.area === 'finance' ? 'finance' : 'implementation',
      taskTitle: item.taskTitle,
    }));

    clientsWaitingImplementation.slice(0, 3).forEach((client) => {
      actions.push({
        id: `implementation-${client.id}`,
        title: `Implantação pendente — ${client.name || client.entity}`,
        description: 'Cliente contratado/ativo precisa de plano de implantação ou conclusão do checklist.',
        priority: 'alta',
        target: 'implementation',
      });
    });

    clientsWithOpenSupport.slice(0, 3).forEach((client) => {
      actions.push({
        id: `support-${client.id}`,
        title: `Suporte aberto — ${client.name || client.entity}`,
        description: 'Existe chamado em aberto que precisa de acompanhamento operacional.',
        priority: 'média',
        target: 'support',
      });
    });

    clientsWithOverdueFinancial.slice(0, 3).forEach((client) => {
      actions.push({
        id: `finance-${client.id}`,
        title: `Financeiro vencido — ${client.name || client.entity}`,
        description: 'Existe registro financeiro vencido associado ao cliente.',
        priority: 'alta',
        target: 'finance',
      });
    });

    return actions.slice(0, 6);
  }, [clientsWaitingImplementation, clientsWithOpenSupport, clientsWithOverdueFinancial]);

  const handleCreateOperationalTask = async (action: {
    id: string;
    title: string;
    description: string;
    target: 'implementation' | 'support' | 'finance';
    taskTitle?: string;
  }) => {
    setCreatingOperationalTaskId(action.id);

    try {
      await createTask(action.taskTitle || `[Cliente] ${action.title}: ${action.description}`);
    } finally {
      setCreatingOperationalTaskId(null);
    }
  };

  const handlePrepareClient = async (clientId: string) => {
    setProvisioningMessage(undefined);

    try {
      const readiness = await handlePrepareContractedClient(clientId);
      setProvisioningMessage(`Ambiente preparado. Prontidão operacional: ${readiness.score}%.`);
    } catch {
      setProvisioningMessage(undefined);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-emerald-400 font-black">
              Oi Beta / Operação de Clientes
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Building2 className="w-7 h-7 text-emerald-400" />
              Clientes Ativos
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área operacional para acompanhar clientes após a venda: contratos ativos, implantação, produtos contratados, financeiro, suporte e saúde do relacionamento.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-emerald-200">Beta na operação de clientes</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Aqui eu deixo de olhar para venda e passo a acompanhar execução, implantação, suporte, pendências financeiras e risco de churn.
            </p>
          </div>
        </div>
      </section>

      <CustomerOperationsPanel focus="clients" />

      <CustomerPortfolioCommandCenter
        clients={clientsList}
        existingTaskTitles={tasks.map((task) => task.title)}
        onCreateTask={createTask}
      />

      {(provisioningMessage || provisioningError) && (
        <div className={`rounded-2xl border p-4 text-sm ${provisioningError ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
          {provisioningError || provisioningMessage}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <ClientMetricCard icon={<Users className="w-4 h-4" />} label="Base total" value={totalClients} helper="Registros no CRM" />
        <ClientMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Ativos" value={activeClients} helper="Em operação" />
        <ClientMetricCard icon={<FileText className="w-4 h-4" />} label="Contratos" value={contractsCount} helper="Gerados/ativos" />
        <ClientMetricCard icon={<PackageCheck className="w-4 h-4" />} label="Implantações" value={implementationsCount} helper={`${averageImplementationProgress}% médio`} />
        <ClientMetricCard icon={<CircleDollarSign className="w-4 h-4" />} label="Financeiro" value={financialRecordsCount} helper={formatCurrency(contractsValue)} />
        <ClientMetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Vencido" value={formatCurrency(overdueAmount)} helper="A receber" />
        <ClientMetricCard icon={<Headphones className="w-4 h-4" />} label="Chamados" value={supportTicketsCount} helper={`${openSupportTicketsCount} em aberto`} />
        <ClientMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Fluxo" value={`${operationalFlowSummary.operationalFlowScore}%`} helper={`${operationalFlowSummary.totalBacklogItems} ações`} />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Carteira operacional
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Clientes em operação</h2>
            </div>
            <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Pós-venda
            </span>
          </div>

          {operationalClients.length === 0 ? (
            <EmptyOperationalState />
          ) : (
            <div className="space-y-3">
              {operationalClients.map((client) => (
                <OperationalClientCard
                  key={client.id}
                  client={client}
                  onPrepare={handlePrepareClient}
                  isPreparing={preparingClientId === client.id}
                />
              ))}
            </div>
          )}

          {clientLifecycle.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-[0.22em] text-[var(--text-secondary)] font-black">
                  Ciclo de vida
                </span>
                <h3 className="text-sm font-black text-[var(--text-main)] mt-1">Clientes com gargalos operacionais</h3>
              </div>

              {clientLifecycle.slice(0, 4).map((item) => (
                <div key={item.clientId} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-xs font-black text-[var(--text-main)]">{item.clientName}</strong>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                        {item.bottleneck?.label || 'Ciclo completo'} • {item.bottleneck?.description || 'Sem gargalo principal'}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-mono font-black text-emerald-300">{item.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Próximas ações
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Fila operacional da Beta</h2>
            </div>

            {nextOperationalActions.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Nenhuma pendência operacional crítica encontrada na base atual. Quando contratos, implantações, financeiro ou chamados forem registrados, a Beta priorizará esta fila.
              </p>
            ) : (
              <div className="space-y-3">
                {nextOperationalActions.map((action) => (
                  <div key={action.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-[var(--text-main)]">{action.title}</h3>
                      <span className={`text-[10px] uppercase font-mono font-black ${resolvePriorityClass(action.priority)}`}>
                        {action.priority}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{action.description}</p>

                    <button
                      type="button"
                      onClick={() => void handleCreateOperationalTask(action)}
                      disabled={creatingOperationalTaskId === action.id}
                      className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingOperationalTaskId === action.id ? 'Criando tarefa...' : 'Criar tarefa'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-5 space-y-3">
            <h2 className="text-sm font-black text-indigo-300">Diferença para o CRM</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              O CRM continua responsável por relacionamento comercial, leads, diagnóstico, propostas e fechamento. Esta área de Clientes começa depois da contratação e acompanha operação, entrega, saúde, suporte e renovação.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClientMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
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

function EmptyOperationalState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/25 p-8 text-center">
      <Building2 className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
      <h3 className="text-lg font-black text-[var(--text-main)]">Nenhum cliente operacional ainda</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl mx-auto leading-relaxed">
        Quando um registro do CRM avançar para contratado ou ativo, ele aparecerá aqui como cliente da operação, com contratos, implantação, suporte, financeiro e saúde do relacionamento.
      </p>
    </div>
  );
}

function OperationalClientCard({
  client,
  onPrepare,
  isPreparing,
}: {
  client: ClientsWorkspaceClient;
  onPrepare: (clientId: string) => Promise<void>;
  isPreparing: boolean;
}) {
  const openTickets = client.supportTickets.filter((ticket) => !['closed', 'resolved'].includes(ticket.status)).length;
  const overdueFinancial = client.financialRecords.filter((record) => record.status === 'overdue').reduce((sum, record) => sum + record.amount, 0);
  const latestImplementation = client.implementations[0];
  const activeProducts = client.products.filter((product) => product.status === 'contracted' || product.status === 'implantation').length;
  const activeContracts = client.contracts.filter((contract) => contract.status === 'active' || contract.status === 'signed').length;
  const readinessChecks = [
    Boolean(client.tenantId || client.organizationId),
    Boolean(client.tenantCommercialContractId),
    activeProducts > 0,
    client.implementations.length > 0,
    client.implementations.some((item) => item.status === 'completed' || item.status === 'go_live'),
  ];
  const readinessScore = Math.round((readinessChecks.filter(Boolean).length / readinessChecks.length) * 100);

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-[var(--text-main)] truncate">{client.name || client.entity || 'Cliente sem nome'}</h3>
            <span className="text-[10px] uppercase font-mono font-black px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              {CLIENT_STATUS_LABELS[client.status] || client.status}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {[client.city, client.state, client.manager ? `Responsável: ${client.manager}` : null].filter(Boolean).join(' • ') || 'Dados operacionais pendentes'}
          </p>
        </div>

        <div className="space-y-2 min-w-fit">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniOperationalMetric label="Contratos" value={activeContracts} />
            <MiniOperationalMetric label="Produtos" value={activeProducts} />
            <MiniOperationalMetric label="Prontidão" value={`${readinessScore}%`} />
            <MiniOperationalMetric label="Saúde" value={`${client.healthScore}%`} />
          </div>
          <button
            type="button"
            onClick={() => void onPrepare(client.id)}
            disabled={isPreparing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-60"
          >
            {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {client.provisioningStatus === 'provisioned' ? 'Revalidar ambiente' : 'Preparar cliente contratado'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mt-4">
        <OperationalInfoBlock
          icon={<PackageCheck className="w-4 h-4" />}
          label="Implantação"
          value={latestImplementation ? `${latestImplementation.progress}% — ${latestImplementation.title}` : 'Sem implantação registrada'}
        />
        <OperationalInfoBlock
          icon={<CircleDollarSign className="w-4 h-4" />}
          label="Financeiro"
          value={overdueFinancial > 0 ? `${formatCurrency(overdueFinancial)} vencido` : 'Sem vencimentos críticos'}
        />
        <OperationalInfoBlock
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Provisionamento"
          value={client.tenantId ? `Tenant vinculado • ${client.provisioningStatus}` : 'Tenant ainda não vinculado'}
        />
        <OperationalInfoBlock
          icon={<CalendarClock className="w-4 h-4" />}
          label="Próxima ação"
          value={client.nextAction?.title || 'Nenhuma ação definida'}
        />
      </div>
    </article>
  );
}

function MiniOperationalMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2">
      <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span>
      <strong className="text-sm font-black text-[var(--text-main)] block mt-1">{value}</strong>
    </div>
  );
}

function OperationalInfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function resolvePriorityClass(priority: 'alta' | 'média' | 'baixa'): string {
  if (priority === 'alta') return 'text-red-300';
  if (priority === 'média') return 'text-amber-300';

  return 'text-emerald-300';
}
