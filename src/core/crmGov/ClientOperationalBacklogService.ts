import type {
  ClientContractRecord,
  ClientFinancialRecord,
  ClientImplementationRecord,
  ClientNextAction,
  ClientProposalRecord,
  ClientSupportTicket,
} from '../../hooks/useClientState';

export type ClientOperationalBacklogArea = 'crm' | 'implementation' | 'finance' | 'support';
export type ClientOperationalBacklogPriority = 'alta' | 'média' | 'baixa';

export interface ClientOperationalFlowClient {
  id: string;
  name?: string;
  entity?: string;
  nextAction?: ClientNextAction;
  proposals: ClientProposalRecord[];
  contracts: ClientContractRecord[];
  implementations: ClientImplementationRecord[];
  financialRecords: ClientFinancialRecord[];
  supportTickets: ClientSupportTicket[];
}

export interface ClientOperationalBacklogItem {
  id: string;
  clientId: string;
  clientName: string;
  area: ClientOperationalBacklogArea;
  title: string;
  description: string;
  priority: ClientOperationalBacklogPriority;
  targetTab: string;
  taskTitle: string;
}

export interface ClientOperationalFlowSummary {
  totalBacklogItems: number;
  highPriorityItems: number;
  crmItems: number;
  implementationItems: number;
  financeItems: number;
  supportItems: number;
  clientsWithBacklog: number;
  readyForImplementationContracts: number;
  blockedImplementations: number;
  pendingFinancialRecords: number;
  openSupportTickets: number;
  operationalFlowScore: number;
}

export class ClientOperationalBacklogService {
  static buildForClients(clients: ClientOperationalFlowClient[]): ClientOperationalBacklogItem[] {
    return clients
      .flatMap((client) => this.buildForClient(client))
      .sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority));
  }

  static buildForClient(client: ClientOperationalFlowClient): ClientOperationalBacklogItem[] {
    const clientName = client.name || client.entity || 'Cliente';
    const items: ClientOperationalBacklogItem[] = [];

    if (client.nextAction?.title) {
      const dueDate = client.nextAction.dueDate ? ` até ${this.formatDate(client.nextAction.dueDate)}` : '';

      items.push({
        id: `crm-next-action-${client.id}`,
        clientId: client.id,
        clientName,
        area: 'crm',
        title: `Próxima ação comercial — ${clientName}`,
        description: `${client.nextAction.title}${dueDate}`,
        priority: client.nextAction.dueDate && this.isPastDate(client.nextAction.dueDate) ? 'alta' : 'média',
        targetTab: 'crm',
        taskTitle: `[CRM] ${clientName}: ${client.nextAction.title}${dueDate}`,
      });
    }

    client.proposals
      .filter((proposal) => proposal.status === 'sent' || proposal.status === 'negotiation')
      .forEach((proposal) => {
        items.push({
          id: `crm-proposal-${client.id}-${proposal.id}`,
          clientId: client.id,
          clientName,
          area: 'crm',
          title: `Acompanhar proposta — ${clientName}`,
          description: `${proposal.title} está ${proposal.status === 'negotiation' ? 'em negociação' : 'enviada'}.`,
          priority: proposal.status === 'negotiation' ? 'alta' : 'média',
          targetTab: 'crm',
          taskTitle: `[CRM] ${clientName}: acompanhar proposta ${proposal.title}`,
        });
      });

    client.contracts
      .filter((contract) => contract.status === 'signed' || contract.status === 'active')
      .filter((contract) => !client.implementations.some((implementation) => implementation.contractId === contract.id))
      .forEach((contract) => {
        items.push({
          id: `implementation-contract-${client.id}-${contract.id}`,
          clientId: client.id,
          clientName,
          area: 'implementation',
          title: `Iniciar implantação — ${clientName}`,
          description: `Contrato ${contract.title} está assinado/ativo e ainda não possui implantação vinculada.`,
          priority: 'alta',
          targetTab: 'implementations',
          taskTitle: `[Implantação] ${clientName}: iniciar implantação do contrato ${contract.title}`,
        });
      });

    client.implementations
      .filter((implementation) => implementation.status === 'blocked' || implementation.status === 'waiting_client')
      .forEach((implementation) => {
        items.push({
          id: `implementation-blocked-${client.id}-${implementation.id}`,
          clientId: client.id,
          clientName,
          area: 'implementation',
          title: `Desbloquear implantação — ${clientName}`,
          description: `${implementation.title} está ${implementation.status === 'blocked' ? 'bloqueada' : 'aguardando cliente'}.`,
          priority: implementation.status === 'blocked' ? 'alta' : 'média',
          targetTab: 'implementations',
          taskTitle: `[Implantação] ${clientName}: desbloquear ${implementation.title}`,
        });
      });

    client.financialRecords
      .filter((record) => record.status === 'overdue' || record.status === 'pending')
      .forEach((record) => {
        const dueDate = record.dueDate ? ` vencimento ${this.formatDate(record.dueDate)}` : 'sem vencimento definido';

        items.push({
          id: `finance-${client.id}-${record.id}`,
          clientId: client.id,
          clientName,
          area: 'finance',
          title: `${record.status === 'overdue' ? 'Cobrança vencida' : 'Pendência financeira'} — ${clientName}`,
          description: `${record.title} (${this.formatCurrency(record.amount)} • ${dueDate}).`,
          priority: record.status === 'overdue' ? 'alta' : 'média',
          targetTab: 'finance',
          taskTitle: `[Financeiro] ${clientName}: ${record.title} (${this.formatCurrency(record.amount)} • ${dueDate})`,
        });
      });

    client.supportTickets
      .filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'waiting_client')
      .forEach((ticket) => {
        items.push({
          id: `support-${client.id}-${ticket.id}`,
          clientId: client.id,
          clientName,
          area: 'support',
          title: `Chamado de suporte — ${clientName}`,
          description: `${ticket.title} (${ticket.priority}).`,
          priority: ticket.priority === 'critical' || ticket.priority === 'high' ? 'alta' : 'média',
          targetTab: 'support',
          taskTitle: `[Suporte] ${clientName}: ${ticket.title}`,
        });
      });

    return items;
  }

  static buildSummary(
    clients: ClientOperationalFlowClient[],
    backlog: ClientOperationalBacklogItem[],
  ): ClientOperationalFlowSummary {
    const highPriorityItems = backlog.filter((item) => item.priority === 'alta').length;
    const clientsWithBacklog = new Set(backlog.map((item) => item.clientId)).size;
    const readyForImplementationContracts = clients.reduce(
      (total, client) =>
        total +
        client.contracts.filter((contract) =>
          (contract.status === 'signed' || contract.status === 'active') &&
          !client.implementations.some((implementation) => implementation.contractId === contract.id)
        ).length,
      0,
    );

    const blockedImplementations = clients.reduce(
      (total, client) =>
        total + client.implementations.filter((implementation) => implementation.status === 'blocked').length,
      0,
    );

    const pendingFinancialRecords = clients.reduce(
      (total, client) =>
        total + client.financialRecords.filter((record) => record.status === 'pending' || record.status === 'overdue').length,
      0,
    );

    const openSupportTickets = clients.reduce(
      (total, client) =>
        total + client.supportTickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length,
      0,
    );

    const pressurePenalty = Math.min(45, highPriorityItems * 7 + backlog.length * 2);
    const coverageBonus = Math.min(25, clientsWithBacklog * 3);
    const operationalFlowScore = Math.max(0, Math.min(100, Math.round(70 + coverageBonus - pressurePenalty)));

    return {
      totalBacklogItems: backlog.length,
      highPriorityItems,
      crmItems: backlog.filter((item) => item.area === 'crm').length,
      implementationItems: backlog.filter((item) => item.area === 'implementation').length,
      financeItems: backlog.filter((item) => item.area === 'finance').length,
      supportItems: backlog.filter((item) => item.area === 'support').length,
      clientsWithBacklog,
      readyForImplementationContracts,
      blockedImplementations,
      pendingFinancialRecords,
      openSupportTickets,
      operationalFlowScore,
    };
  }

  static priorityWeight(priority: ClientOperationalBacklogPriority): number {
    if (priority === 'alta') return 3;
    if (priority === 'média') return 2;
    return 1;
  }

  private static isPastDate(value: string): boolean {
    const timestamp = new Date(`${value}T23:59:59`).getTime();

    return Number.isFinite(timestamp) && timestamp < Date.now();
  }

  private static formatDate(value: string): string {
    const timestamp = new Date(`${value}T00:00:00`).getTime();

    if (!Number.isFinite(timestamp)) return value;

    return new Date(timestamp).toLocaleDateString('pt-BR');
  }

  private static formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  }
}
