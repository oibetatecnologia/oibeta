import type {
  ClientContractRecord,
  ClientFinancialRecord,
  ClientImplementationRecord,
  ClientSupportTicket,
} from '../../hooks/useClientState';

export interface ClientOperationSummary {
  activeContracts: number;
  monthlyRevenue: number;
  overdueAmount: number;
  openTickets: number;
  criticalTickets: number;
  averageImplementationProgress: number;
  renewalsIn60Days: number;
  operationalStatus: 'healthy' | 'attention' | 'critical';
  betaAlerts: string[];
}

/**
 * ClientOperationService
 *
 * Consolida sinais operacionais do cliente ativo.
 * Não busca API externa. É uma camada de leitura para o dossiê do CRM Gov.
 */
export class ClientOperationService {
  static buildSummary(input: {
    contracts: ClientContractRecord[];
    financialRecords: ClientFinancialRecord[];
    supportTickets: ClientSupportTicket[];
    implementations: ClientImplementationRecord[];
  }): ClientOperationSummary {
    const activeContracts = input.contracts.filter((contract) =>
      contract.status === 'active' || contract.status === 'signed',
    );

    const monthlyRevenue = activeContracts.reduce((sum, contract) => sum + (contract.monthlyValue || 0), 0);
    const overdueAmount = input.financialRecords
      .filter((record) => record.status === 'overdue')
      .reduce((sum, record) => sum + record.amount, 0);

    const openTickets = input.supportTickets.filter((ticket) =>
      ticket.status === 'open' || ticket.status === 'in_progress',
    ).length;

    const criticalTickets = input.supportTickets.filter((ticket) =>
      ticket.priority === 'critical' && ticket.status !== 'resolved' && ticket.status !== 'closed',
    ).length;

    const implementationProgressValues = input.implementations.map((implementation) => implementation.progress);
    const averageImplementationProgress = implementationProgressValues.length === 0
      ? 0
      : Math.round(implementationProgressValues.reduce((sum, value) => sum + value, 0) / implementationProgressValues.length);

    const renewalsIn60Days = activeContracts.filter((contract) => isDateWithinDays(contract.endDate, 60)).length;

    const betaAlerts = this.buildAlerts({
      overdueAmount,
      openTickets,
      criticalTickets,
      averageImplementationProgress,
      renewalsIn60Days,
      activeContracts: activeContracts.length,
    });

    return {
      activeContracts: activeContracts.length,
      monthlyRevenue,
      overdueAmount,
      openTickets,
      criticalTickets,
      averageImplementationProgress,
      renewalsIn60Days,
      operationalStatus: resolveOperationalStatus(overdueAmount, criticalTickets, renewalsIn60Days),
      betaAlerts,
    };
  }

  private static buildAlerts(input: {
    overdueAmount: number;
    openTickets: number;
    criticalTickets: number;
    averageImplementationProgress: number;
    renewalsIn60Days: number;
    activeContracts: number;
  }): string[] {
    const alerts: string[] = [];

    if (input.activeContracts === 0) {
      alerts.push('Nenhum contrato ativo registrado para este órgão.');
    }

    if (input.overdueAmount > 0) {
      alerts.push('Existe valor financeiro vencido para acompanhamento.');
    }

    if (input.criticalTickets > 0) {
      alerts.push('Há chamado crítico em aberto.');
    }

    if (input.renewalsIn60Days > 0) {
      alerts.push('Existe contrato com vencimento nos próximos 60 dias.');
    }

    if (input.averageImplementationProgress > 0 && input.averageImplementationProgress < 80) {
      alerts.push('Implantação ainda não está pronta para Go Live.');
    }

    if (alerts.length === 0) {
      alerts.push('Operação sem alertas críticos no momento.');
    }

    return alerts;
  }
}

function isDateWithinDays(value: string | undefined, days: number): boolean {
  if (!value) return false;

  const target = new Date(value).getTime();
  const now = Date.now();
  const limit = now + days * 24 * 60 * 60 * 1000;

  return target >= now && target <= limit;
}

function resolveOperationalStatus(
  overdueAmount: number,
  criticalTickets: number,
  renewalsIn60Days: number,
): ClientOperationSummary['operationalStatus'] {
  if (overdueAmount > 0 || criticalTickets > 0) return 'critical';
  if (renewalsIn60Days > 0) return 'attention';

  return 'healthy';
}
