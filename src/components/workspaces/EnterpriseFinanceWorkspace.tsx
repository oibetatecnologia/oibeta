import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Landmark,
  Plus,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import useClientsWorkspace, { type ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import type { ClientFinancialRecord, ClientFinancialStatus } from '../../hooks/useClientState';
import TenantCommercialContractPanel from '../commercial/TenantCommercialContractPanel';
import useFinanceIntelligence from '../../hooks/useFinanceIntelligence';
import FinanceCommandCenter from '../finance/FinanceCommandCenter';

const FINANCIAL_STATUS_LABELS: Record<ClientFinancialStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

const FINANCIAL_STATUS_CLASSES: Record<ClientFinancialStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  overdue: 'bg-red-500/10 text-red-300 border-red-500/20',
  cancelled: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
};

const FINANCIAL_CLIENT_STATUSES = new Set(['contracted', 'active', 'paused', 'proposal']);

export default function EnterpriseFinanceWorkspace() {
  const { createTask, tasks } = useWorkspace().tasks;
  const [creatingFinancialTaskKey, setCreatingFinancialTaskKey] = useState<string | null>(null);

  const {
    clientsList,
    financialRecordsCount,
    overdueAmount,
    contractsValue,
    operationalFlowSummary,
    clientLifecycleSummary,
    clientRevenueSummary,
    clientSuccessSummary,
    clientServiceLevelSummary,
    handleAddFinancialRecord,
  } = useClientsWorkspace();

  const financeIntelligence = useFinanceIntelligence(clientsList);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [title, setTitle] = useState('Mensalidade Beta Platform');
  const [status, setStatus] = useState<ClientFinancialStatus>('pending');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const eligibleClients = useMemo(
    () => clientsList.filter((client) => FINANCIAL_CLIENT_STATUSES.has(client.status)),
    [clientsList]
  );

  const selectedClient = eligibleClients.find((client) => client.id === selectedClientId) || eligibleClients[0];

  const financialEntries = useMemo(
    () =>
      clientsList.flatMap((client) =>
        client.financialRecords.map((record) => ({
          client,
          record,
        }))
      ),
    [clientsList]
  );

  const paidAmount = financialEntries
    .filter(({ record }) => record.status === 'paid')
    .reduce((sum, { record }) => sum + record.amount, 0);

  const pendingAmount = financialEntries
    .filter(({ record }) => record.status === 'pending')
    .reduce((sum, { record }) => sum + record.amount, 0);

  const cancelledAmount = financialEntries
    .filter(({ record }) => record.status === 'cancelled')
    .reduce((sum, { record }) => sum + record.amount, 0);

  const openAmount = pendingAmount + overdueAmount;
  const totalTrackedAmount = financialEntries.reduce((sum, { record }) => sum + record.amount, 0);
  const paidEntries = financialEntries.filter(({ record }) => record.status === 'paid').length;
  const overdueEntries = financialEntries.filter(({ record }) => record.status === 'overdue').length;
  const pendingEntries = financialEntries.filter(({ record }) => record.status === 'pending').length;
  const monthlyRecurringRevenue = clientsList.reduce(
    (sum, client) => sum + client.contracts.reduce((clientSum, contract) => clientSum + (contract.monthlyValue || 0), 0),
    0
  );

  const nextFinancialActions = useMemo(() => {
    const actions: { id: string; title: string; description: string; priority: 'alta' | 'média' | 'baixa' }[] = [];

    financialEntries
      .filter(({ record }) => record.status === 'overdue')
      .slice(0, 4)
      .forEach(({ client, record }) => {
        actions.push({
          id: `overdue-${record.id}`,
          title: `Cobrança vencida — ${client.name || client.entity}`,
          description: `${record.title} no valor de ${formatCurrency(record.amount)}${record.dueDate ? ` venceu em ${formatDate(record.dueDate)}` : ''}.`,
          priority: 'alta',
        });
      });

    eligibleClients
      .filter((client) => client.contracts.length > 0 && client.financialRecords.length === 0)
      .slice(0, 4)
      .forEach((client) => {
        actions.push({
          id: `missing-finance-${client.id}`,
          title: `Contrato sem financeiro — ${client.name || client.entity}`,
          description: 'Cliente possui contrato, mas ainda não tem lançamento financeiro registrado.',
          priority: 'média',
        });
      });

    clientServiceLevelSummary.items
      .filter((item) => item.area === 'finance')
      .slice(0, 4)
      .forEach((item) => {
        actions.unshift({
          id: `sla-finance-${item.id}`,
          title: item.title,
          description: item.description,
          priority: item.severity,
        });
      });

    return actions.slice(0, 6);
  }, [clientServiceLevelSummary.items, eligibleClients, financialEntries]);

  const handleCreateFinancialRecord = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedClient || !title.trim()) return;

    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount <= 0) return;

    handleAddFinancialRecord(selectedClient.id, {
      title: title.trim(),
      status,
      amount: parsedAmount,
      dueDate: dueDate || undefined,
      paidAt: status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined,
      notes: notes.trim() || undefined,
    });

    setTitle('Mensalidade Beta Platform');
    setStatus('pending');
    setAmount('');
    setDueDate('');
    setNotes('');
  };

  const handleCreateFinancialTask = async (
    client: ClientsWorkspaceClient,
    record: ClientFinancialRecord
  ) => {
    const taskKey = `${client.id}-${record.id}`;
    const clientName = client.name || client.entity || 'Cliente';
    const amount = formatCurrency(record.amount);
    const dueDate = record.dueDate ? ` com vencimento em ${formatDate(record.dueDate)}` : '';
    const status = FINANCIAL_STATUS_LABELS[record.status];
    const title = `[Financeiro] ${clientName}: ${record.title} (${status} — ${amount}${dueDate})`;

    setCreatingFinancialTaskKey(taskKey);

    try {
      await createTask(title);
    } finally {
      setCreatingFinancialTaskKey(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.15),transparent_42%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-emerald-300 font-black">
              Oi Beta / Financeiro
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <CircleDollarSign className="w-7 h-7 text-emerald-300" />
              Financeiro
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área operacional para acompanhar contratos, setup, MRR, cobranças, valores em aberto, inadimplência e recebimentos da Oi Beta.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-emerald-200">Beta no financeiro</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Aqui eu acompanho valores a receber, contratos sem lançamento, cobranças vencidas e riscos financeiros que afetam a operação.
            </p>
          </div>
        </div>
      </section>

      <FinanceCommandCenter
        summary={financeIntelligence}
        taskTitles={tasks.map((task) => task.title)}
        onCreateTask={createTask}
      />

      <TenantCommercialContractPanel />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <FinanceMetricCard icon={<ReceiptText className="w-4 h-4" />} label="Lançamentos" value={financialRecordsCount} helper="Registros financeiros" />
        <FinanceMetricCard icon={<TrendingUp className="w-4 h-4" />} label="MRR" value={formatCurrency(clientRevenueSummary.monthlyRecurringRevenue || monthlyRecurringRevenue)} helper="Contratos mensais" />
        <FinanceMetricCard icon={<FileText className="w-4 h-4" />} label="Contratos" value={formatCurrency(contractsValue)} helper="Valor contratado" />
        <FinanceMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Recebido" value={formatCurrency(paidAmount)} helper={`${paidEntries} pagos`} />
        <FinanceMetricCard icon={<Clock3 className="w-4 h-4" />} label="Pendente" value={formatCurrency(pendingAmount)} helper={`${pendingEntries} em aberto`} />
        <FinanceMetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Vencido" value={formatCurrency(overdueAmount)} helper={`${overdueEntries} cobranças`} />
        <FinanceMetricCard icon={<Banknote className="w-4 h-4" />} label="Em aberto" value={formatCurrency(clientRevenueSummary.openAmount || openAmount)} helper={`${clientRevenueSummary.clientsAtRevenueRisk} clientes em risco`} />
        <FinanceMetricCard icon={<Landmark className="w-4 h-4" />} label="SLA financeiro" value={`${clientServiceLevelSummary.score}%`} helper={`${clientServiceLevelSummary.financeBreaches} violações`} />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Movimento financeiro
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Lançamentos por cliente</h2>
            </div>
            <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 self-start">
              Operação financeira
            </span>
          </div>

          {financialEntries.length === 0 ? (
            <EmptyFinanceState />
          ) : (
            <div className="space-y-3">
              {financialEntries.map(({ client, record }) => (
                <FinancialRecordCard
                  key={record.id}
                  client={client}
                  record={record}
                  onCreateFinancialTask={handleCreateFinancialTask}
                  creatingTaskKey={creatingFinancialTaskKey}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <form onSubmit={handleCreateFinancialRecord} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Novo lançamento
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Registrar financeiro</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                Vincule cobranças, setup ou mensalidades a clientes em negociação, contratados ou ativos.
              </p>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Cliente</span>
              <select
                value={selectedClientId || selectedClient?.id || ''}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-400"
              >
                {eligibleClients.length === 0 ? (
                  <option value="">Nenhum cliente elegível</option>
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
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Título</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-emerald-400"
                placeholder="Mensalidade, setup, implantação..."
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Valor</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-emerald-400"
                  placeholder="0,00"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Vencimento</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-400"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ClientFinancialStatus)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-400"
              >
                {Object.entries(FINANCIAL_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">Observações</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-emerald-400 resize-none"
                placeholder="Observações sobre cobrança, contrato, negociação ou pagamento."
              />
            </label>

            <button
              type="submit"
              disabled={!selectedClient || !title.trim() || parseCurrencyInput(amount) <= 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition border-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar lançamento
            </button>
          </form>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Próximas ações
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Fila financeira da Beta</h2>
            </div>

            {nextFinancialActions.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Nenhuma pendência financeira crítica encontrada. Quando houver cobranças vencidas ou contratos sem lançamento, a Beta priorizará esta fila.
              </p>
            ) : (
              <div className="space-y-3">
                {nextFinancialActions.map((action) => (
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

function FinanceMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-secondary)] font-black block mt-4">
        {label}
      </span>
      <strong className="text-xl font-black text-[var(--text-main)] block mt-1">{value}</strong>
      <span className="text-xs text-[var(--text-secondary)]">{helper}</span>
    </div>
  );
}

function EmptyFinanceState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/25 p-8 text-center">
      <CircleDollarSign className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
      <h3 className="text-lg font-black text-[var(--text-main)]">Nenhum lançamento financeiro ainda</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl mx-auto leading-relaxed">
        Quando houver clientes em proposta, contratados ou ativos, registre setup, mensalidades, cobranças pendentes e recebimentos para formar a visão financeira da operação.
      </p>
    </div>
  );
}

function FinancialRecordCard({
  client,
  record,
  onCreateFinancialTask,
  creatingTaskKey,
}: {
  client: ClientsWorkspaceClient;
  record: ClientFinancialRecord;
  onCreateFinancialTask: (client: ClientsWorkspaceClient, record: ClientFinancialRecord) => Promise<void>;
  creatingTaskKey: string | null;
}) {
  const taskKey = `${client.id}-${record.id}`;
  const canCreateTask = record.status === 'pending' || record.status === 'overdue';

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 hover:border-emerald-500/30 transition">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${FINANCIAL_STATUS_CLASSES[record.status]}`}>
              {FINANCIAL_STATUS_LABELS[record.status]}
            </span>
            {record.dueDate && (
              <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {formatDate(record.dueDate)}
              </span>
            )}
          </div>

          <h3 className="text-base font-black text-[var(--text-main)] mt-2">{record.title}</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {client.name || client.entity || 'Cliente sem nome'} • {client.city || 'Cidade não informada'}{client.state ? `/${client.state}` : ''}
          </p>
          {record.notes && <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{record.notes}</p>}

          {canCreateTask && (
            <button
              type="button"
              onClick={() => void onCreateFinancialTask(client, record)}
              disabled={creatingTaskKey === taskKey}
              className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingTaskKey === taskKey ? 'Criando tarefa...' : 'Criar tarefa financeira'}
            </button>
          )}
        </div>

        <strong className="text-xl font-black text-emerald-200 whitespace-nowrap">
          {formatCurrency(record.amount)}
        </strong>
      </div>
    </article>
  );
}

function resolvePriorityClass(priority: 'alta' | 'média' | 'baixa'): string {
  if (priority === 'alta') return 'text-red-300';
  if (priority === 'média') return 'text-amber-300';

  return 'text-emerald-300';
}

function parseCurrencyInput(value: string): number {
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('pt-BR');
}
