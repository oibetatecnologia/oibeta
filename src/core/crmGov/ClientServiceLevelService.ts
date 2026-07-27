import type {
  ClientFinancialRecord,
  ClientImplementationRecord,
  ClientSupportTicket,
  ClientSupportTicketPriority,
} from '../../hooks/useClientState';

export type ClientServiceLevelArea = 'implementation' | 'finance' | 'support';
export type ClientServiceLevelSeverity = 'alta' | 'média' | 'baixa';

export interface ClientServiceLevelClient {
  id: string;
  name?: string;
  entity?: string;
  implementations: ClientImplementationRecord[];
  financialRecords: ClientFinancialRecord[];
  supportTickets: ClientSupportTicket[];
}

export interface ClientServiceLevelItem {
  id: string;
  clientId: string;
  clientName: string;
  area: ClientServiceLevelArea;
  severity: ClientServiceLevelSeverity;
  title: string;
  description: string;
  ageDays: number;
  targetTab: string;
  taskTitle: string;
}

export interface ClientServiceLevelSummary {
  score: number;
  totalBreaches: number;
  highSeverityBreaches: number;
  implementationBreaches: number;
  financeBreaches: number;
  supportBreaches: number;
  clientsAffected: number;
  items: ClientServiceLevelItem[];
}

const SUPPORT_SLA_DAYS: Record<ClientSupportTicketPriority, number> = {
  critical: 1,
  high: 2,
  medium: 5,
  low: 10,
};

export class ClientServiceLevelService {
  static buildSummary(clients: ClientServiceLevelClient[]): ClientServiceLevelSummary {
    const items = clients
      .flatMap((client) => this.buildClientItems(client))
      .sort((a, b) => {
        const severityDiff = this.severityWeight(b.severity) - this.severityWeight(a.severity);
        return severityDiff !== 0 ? severityDiff : b.ageDays - a.ageDays;
      });

    const highSeverityBreaches = items.filter((item) => item.severity === 'alta').length;
    const clientsAffected = new Set(items.map((item) => item.clientId)).size;
    const penalty = Math.min(
      100,
      highSeverityBreaches * 12 +
        items.filter((item) => item.severity === 'média').length * 6 +
        items.filter((item) => item.severity === 'baixa').length * 2,
    );

    return {
      score: Math.max(0, 100 - penalty),
      totalBreaches: items.length,
      highSeverityBreaches,
      implementationBreaches: items.filter((item) => item.area === 'implementation').length,
      financeBreaches: items.filter((item) => item.area === 'finance').length,
      supportBreaches: items.filter((item) => item.area === 'support').length,
      clientsAffected,
      items,
    };
  }

  private static buildClientItems(client: ClientServiceLevelClient): ClientServiceLevelItem[] {
    const clientName = client.name || client.entity || 'Cliente';

    return [
      ...client.implementations.flatMap((implementation) =>
        this.buildImplementationItem(client.id, clientName, implementation),
      ),
      ...client.financialRecords.flatMap((record) =>
        this.buildFinanceItem(client.id, clientName, record),
      ),
      ...client.supportTickets.flatMap((ticket) =>
        this.buildSupportItem(client.id, clientName, ticket),
      ),
    ];
  }

  private static buildImplementationItem(
    clientId: string,
    clientName: string,
    implementation: ClientImplementationRecord,
  ): ClientServiceLevelItem[] {
    if (implementation.status === 'completed') return [];

    const ageDays = this.daysSince(implementation.updatedAt || implementation.createdAt);
    const expectedGoLiveOverdue = implementation.expectedGoLiveDate
      ? this.daysSince(`${implementation.expectedGoLiveDate}T23:59:59`)
      : 0;

    if (implementation.status === 'blocked') {
      return [{
        id: `sla-implementation-blocked-${implementation.id}`,
        clientId,
        clientName,
        area: 'implementation',
        severity: 'alta',
        title: `Implantação bloqueada — ${clientName}`,
        description: `${implementation.title} está bloqueada há ${ageDays} dia(s).`,
        ageDays,
        targetTab: 'implementations',
        taskTitle: `[SLA Implantação] ${clientName}: desbloquear ${implementation.title}`,
      }];
    }

    if (expectedGoLiveOverdue > 0) {
      return [{
        id: `sla-implementation-overdue-${implementation.id}`,
        clientId,
        clientName,
        area: 'implementation',
        severity: expectedGoLiveOverdue >= 7 ? 'alta' : 'média',
        title: `Go-live atrasado — ${clientName}`,
        description: `${implementation.title} ultrapassou a data prevista em ${expectedGoLiveOverdue} dia(s).`,
        ageDays: expectedGoLiveOverdue,
        targetTab: 'implementations',
        taskTitle: `[SLA Implantação] ${clientName}: recuperar atraso do go-live`,
      }];
    }

    if (implementation.status === 'waiting_client' && ageDays >= 5) {
      return [{
        id: `sla-implementation-waiting-${implementation.id}`,
        clientId,
        clientName,
        area: 'implementation',
        severity: ageDays >= 10 ? 'alta' : 'média',
        title: `Implantação aguardando cliente — ${clientName}`,
        description: `${implementation.title} aguarda retorno há ${ageDays} dia(s).`,
        ageDays,
        targetTab: 'implementations',
        taskTitle: `[SLA Implantação] ${clientName}: retomar pendência com o cliente`,
      }];
    }

    return [];
  }

  private static buildFinanceItem(
    clientId: string,
    clientName: string,
    record: ClientFinancialRecord,
  ): ClientServiceLevelItem[] {
    if (record.status === 'paid' || record.status === 'cancelled') return [];

    const dueAge = record.dueDate ? this.daysSince(`${record.dueDate}T23:59:59`) : 0;

    if (record.status === 'overdue' || dueAge > 0) {
      return [{
        id: `sla-finance-${record.id}`,
        clientId,
        clientName,
        area: 'finance',
        severity: dueAge >= 15 ? 'alta' : dueAge >= 5 ? 'média' : 'baixa',
        title: `Cobrança fora do prazo — ${clientName}`,
        description: `${record.title} está vencida há ${Math.max(dueAge, 1)} dia(s).`,
        ageDays: Math.max(dueAge, 1),
        targetTab: 'finance',
        taskTitle: `[SLA Financeiro] ${clientName}: cobrar ${record.title}`,
      }];
    }

    return [];
  }

  private static buildSupportItem(
    clientId: string,
    clientName: string,
    ticket: ClientSupportTicket,
  ): ClientServiceLevelItem[] {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return [];

    const ageDays = this.daysSince(ticket.createdAt);
    const allowedDays = SUPPORT_SLA_DAYS[ticket.priority];

    if (ageDays <= allowedDays) return [];

    const overdueDays = ageDays - allowedDays;
    const severity: ClientServiceLevelSeverity =
      ticket.priority === 'critical' || overdueDays >= 7
        ? 'alta'
        : ticket.priority === 'high' || overdueDays >= 3
          ? 'média'
          : 'baixa';

    return [{
      id: `sla-support-${ticket.id}`,
      clientId,
      clientName,
      area: 'support',
      severity,
      title: `Chamado fora do SLA — ${clientName}`,
      description: `${ticket.title} excedeu o SLA em ${overdueDays} dia(s).`,
      ageDays,
      targetTab: 'support',
      taskTitle: `[SLA Suporte] ${clientName}: resolver ${ticket.title}`,
    }];
  }

  private static daysSince(value?: string): number {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return 0;

    return Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
  }

  private static severityWeight(severity: ClientServiceLevelSeverity): number {
    if (severity === 'alta') return 3;
    if (severity === 'média') return 2;
    return 1;
  }
}
