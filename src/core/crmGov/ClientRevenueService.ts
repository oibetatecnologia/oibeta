import type {
  ClientContractRecord,
  ClientFinancialRecord,
  ClientImplementationRecord,
  ClientStatus,
  ClientSupportTicket,
} from '../../hooks/useClientState';

export type ClientRevenueRiskLevel = 'baixo' | 'médio' | 'alto';

export interface ClientRevenueClient {
  id: string;
  name?: string;
  entity?: string;
  status: ClientStatus;
  contracts: ClientContractRecord[];
  implementations: ClientImplementationRecord[];
  financialRecords: ClientFinancialRecord[];
  supportTickets: ClientSupportTicket[];
}

export interface ClientRevenueRiskItem {
  id: string;
  clientId: string;
  clientName: string;
  level: ClientRevenueRiskLevel;
  title: string;
  description: string;
  taskTitle: string;
}

export interface ClientRevenueSummary {
  totalContractValue: number;
  monthlyRecurringRevenue: number;
  setupRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  openAmount: number;
  activeContracts: number;
  clientsWithRevenue: number;
  clientsReadyToBill: number;
  clientsAtRevenueRisk: number;
  revenueHealthScore: number;
  revenueRiskItems: ClientRevenueRiskItem[];
}

export class ClientRevenueService {
  static buildSummary(clients: ClientRevenueClient[]): ClientRevenueSummary {
    const totalContractValue = clients.reduce(
      (total, client) => total + client.contracts.reduce((sum, contract) => sum + (contract.contractValue || 0), 0),
      0,
    );

    const monthlyRecurringRevenue = clients.reduce(
      (total, client) => total + client.contracts.reduce((sum, contract) => sum + (contract.monthlyValue || 0), 0),
      0,
    );

    const setupRevenue = clients.reduce(
      (total, client) => total + client.contracts.reduce((sum, contract) => sum + (contract.setupValue || 0), 0),
      0,
    );

    const financialRecords = clients.flatMap((client) => client.financialRecords);
    const paidAmount = this.sumFinancial(financialRecords, 'paid');
    const pendingAmount = this.sumFinancial(financialRecords, 'pending');
    const overdueAmount = this.sumFinancial(financialRecords, 'overdue');
    const openAmount = pendingAmount + overdueAmount;
    const activeContracts = clients.reduce(
      (total, client) => total + client.contracts.filter((contract) => contract.status === 'active' || contract.status === 'signed').length,
      0,
    );

    const clientsWithRevenue = clients.filter((client) =>
      client.contracts.some((contract) => contract.status === 'active' || contract.status === 'signed') ||
      client.financialRecords.some((record) => record.status === 'paid')
    ).length;

    const clientsReadyToBill = clients.filter((client) =>
      client.implementations.some((implementation) => implementation.status === 'completed' || implementation.status === 'go_live') &&
      client.financialRecords.length === 0
    ).length;

    const revenueRiskItems = this.buildRiskItems(clients, { overdueAmount, pendingAmount, openAmount });
    const clientsAtRevenueRisk = new Set(revenueRiskItems.map((item) => item.clientId)).size;
    const collectionRiskPenalty = totalContractValue > 0 ? Math.min(35, Math.round((openAmount / totalContractValue) * 100)) : 0;
    const overduePenalty = overdueAmount > 0 ? 18 : 0;
    const billingPenalty = Math.min(18, clientsReadyToBill * 6);
    const supportPenalty = Math.min(14, clients.filter((client) => this.hasCriticalOpenSupport(client.supportTickets)).length * 7);
    const revenueHealthScore = Math.max(0, Math.min(100, 85 - collectionRiskPenalty - overduePenalty - billingPenalty - supportPenalty));

    return {
      totalContractValue,
      monthlyRecurringRevenue,
      setupRevenue,
      paidAmount,
      pendingAmount,
      overdueAmount,
      openAmount,
      activeContracts,
      clientsWithRevenue,
      clientsReadyToBill,
      clientsAtRevenueRisk,
      revenueHealthScore,
      revenueRiskItems,
    };
  }

  private static buildRiskItems(
    clients: ClientRevenueClient[],
    totals: { overdueAmount: number; pendingAmount: number; openAmount: number },
  ): ClientRevenueRiskItem[] {
    const items: ClientRevenueRiskItem[] = [];

    clients.forEach((client) => {
      const clientName = client.name || client.entity || 'Cliente';
      const overdueRecords = client.financialRecords.filter((record) => record.status === 'overdue');
      const pendingRecords = client.financialRecords.filter((record) => record.status === 'pending');
      const readyToBill =
        client.implementations.some((implementation) => implementation.status === 'completed' || implementation.status === 'go_live') &&
        client.financialRecords.length === 0;
      const criticalSupport = this.hasCriticalOpenSupport(client.supportTickets);

      if (overdueRecords.length > 0) {
        const amount = overdueRecords.reduce((total, record) => total + record.amount, 0);

        items.push({
          id: `revenue-overdue-${client.id}`,
          clientId: client.id,
          clientName,
          level: 'alto',
          title: `Receita vencida — ${clientName}`,
          description: `${overdueRecords.length} cobrança(s) vencida(s), totalizando ${this.formatCurrency(amount)}.`,
          taskTitle: `[Receita] ${clientName}: cobrar vencidos (${this.formatCurrency(amount)})`,
        });
      }

      if (readyToBill) {
        items.push({
          id: `revenue-ready-to-bill-${client.id}`,
          clientId: client.id,
          clientName,
          level: 'alto',
          title: `Cliente pronto para faturar — ${clientName}`,
          description: 'Cliente implantado ou em go-live sem lançamento financeiro registrado.',
          taskTitle: `[Receita] ${clientName}: criar lançamento financeiro pós-implantação`,
        });
      }

      if (pendingRecords.length > 0 && overdueRecords.length === 0) {
        const amount = pendingRecords.reduce((total, record) => total + record.amount, 0);

        items.push({
          id: `revenue-pending-${client.id}`,
          clientId: client.id,
          clientName,
          level: 'médio',
          title: `Receita pendente — ${clientName}`,
          description: `${pendingRecords.length} cobrança(s) pendente(s), totalizando ${this.formatCurrency(amount)}.`,
          taskTitle: `[Receita] ${clientName}: acompanhar pendências financeiras (${this.formatCurrency(amount)})`,
        });
      }

      if (criticalSupport) {
        items.push({
          id: `revenue-support-risk-${client.id}`,
          clientId: client.id,
          clientName,
          level: 'médio',
          title: `Risco de retenção — ${clientName}`,
          description: 'Existe chamado crítico aberto que pode afetar sucesso, renovação ou recebimento.',
          taskTitle: `[Receita] ${clientName}: resolver risco de retenção por suporte crítico`,
        });
      }
    });

    if (totals.openAmount > 0 && items.length === 0) {
      items.push({
        id: 'revenue-open-balance',
        clientId: 'portfolio',
        clientName: 'Carteira',
        level: totals.overdueAmount > 0 ? 'alto' : 'médio',
        title: 'Carteira com valores em aberto',
        description: `Existem ${this.formatCurrency(totals.openAmount)} em aberto na carteira.`,
        taskTitle: `[Receita] Revisar carteira com ${this.formatCurrency(totals.openAmount)} em aberto`,
      });
    }

    return items.sort((a, b) => this.levelWeight(b.level) - this.levelWeight(a.level));
  }

  private static sumFinancial(records: ClientFinancialRecord[], status: ClientFinancialRecord['status']): number {
    return records
      .filter((record) => record.status === status)
      .reduce((total, record) => total + record.amount, 0);
  }

  private static hasCriticalOpenSupport(tickets: ClientSupportTicket[]): boolean {
    return tickets.some((ticket) =>
      ticket.priority === 'critical' && !['resolved', 'closed'].includes(ticket.status)
    );
  }

  private static levelWeight(level: ClientRevenueRiskLevel): number {
    if (level === 'alto') return 3;
    if (level === 'médio') return 2;
    return 1;
  }

  private static formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  }
}
