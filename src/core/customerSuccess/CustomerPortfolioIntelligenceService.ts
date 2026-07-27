import type { ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import type {
  CustomerPortfolioAction,
  CustomerPortfolioClientSnapshot,
  CustomerPortfolioRiskLevel,
  CustomerPortfolioSummary,
} from './CustomerPortfolioTypes';

const OPEN_TICKET_STATUSES = new Set(['open', 'in_progress', 'waiting_client']);

export class CustomerPortfolioIntelligenceService {
  static buildSummary(clients: ClientsWorkspaceClient[]): CustomerPortfolioSummary {
    const operationalClients = clients.filter((client) => ['contracted', 'active', 'paused'].includes(client.status));
    const snapshots = operationalClients
      .map((client) => this.buildSnapshot(client))
      .sort((a, b) => b.riskScore - a.riskScore || b.recurringRevenue - a.recurringRevenue);

    const trackedClients = snapshots.length;
    const healthyClients = snapshots.filter((item) => item.riskLevel === 'saudável').length;
    const attentionClients = snapshots.filter((item) => item.riskLevel === 'atenção').length;
    const criticalClients = snapshots.filter((item) => item.riskLevel === 'crítico').length;
    const expansionReadyClients = snapshots.filter((item) => item.expansionPotential >= 70).length;
    const monthlyRecurringRevenue = snapshots.reduce((sum, item) => sum + item.recurringRevenue, 0);
    const revenueAtRisk = snapshots
      .filter((item) => item.riskLevel !== 'saudável')
      .reduce((sum, item) => sum + item.recurringRevenue, 0);
    const averageImplementationProgress = trackedClients === 0
      ? 0
      : Math.round(snapshots.reduce((sum, item) => sum + item.implementationProgress, 0) / trackedClients);
    const portfolioHealth = trackedClients === 0
      ? 0
      : Math.round(snapshots.reduce((sum, item) => sum + item.healthScore, 0) / trackedClients);

    return {
      portfolioHealth,
      riskLevel: this.resolvePortfolioRisk(portfolioHealth, criticalClients),
      trackedClients,
      healthyClients,
      attentionClients,
      criticalClients,
      expansionReadyClients,
      monthlyRecurringRevenue,
      revenueAtRisk,
      averageImplementationProgress,
      snapshots,
      priorityActions: this.buildPriorityActions(snapshots),
    };
  }

  private static buildSnapshot(client: ClientsWorkspaceClient): CustomerPortfolioClientSnapshot {
    const clientName = client.name || client.entity || 'Cliente';
    const activeProducts = client.products.filter((product) => ['active', 'contracted', 'implementation'].includes(product.status)).length;
    const latestImplementation = [...client.implementations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const implementationProgress = latestImplementation?.progress ?? (client.status === 'active' ? 100 : 0);
    const overdueAmount = client.financialRecords
      .filter((record) => record.status === 'overdue')
      .reduce((sum, record) => sum + (record.amount || 0), 0);
    const openTickets = client.supportTickets.filter((ticket) => OPEN_TICKET_STATUSES.has(ticket.status)).length;
    const criticalTickets = client.supportTickets.filter((ticket) => ticket.priority === 'critical' && OPEN_TICKET_STATUSES.has(ticket.status)).length;
    const daysWithoutInteraction = this.daysSince(client.timeline[0]?.date || client.updatedAt);
    const recurringRevenue = client.contracts
      .filter((contract) => ['active', 'signed'].includes(contract.status))
      .reduce((sum, contract) => sum + (contract.monthlyValue || 0), 0);

    const reasons: string[] = [];
    let riskScore = Math.max(0, 100 - client.healthScore);

    if (criticalTickets > 0) {
      riskScore += 30;
      reasons.push(`${criticalTickets} chamado(s) crítico(s) aberto(s)`);
    } else if (openTickets > 0) {
      riskScore += Math.min(18, openTickets * 6);
      reasons.push(`${openTickets} chamado(s) em acompanhamento`);
    }

    if (overdueAmount > 0) {
      riskScore += 25;
      reasons.push('possui valores financeiros vencidos');
    }

    if (client.status === 'contracted' && implementationProgress < 50) {
      riskScore += 18;
      reasons.push('implantação ainda abaixo de 50%');
    }

    if (daysWithoutInteraction >= 15) {
      riskScore += 18;
      reasons.push(`${daysWithoutInteraction} dias sem interação registrada`);
    }

    if (activeProducts === 0) {
      riskScore += 12;
      reasons.push('nenhum produto ativo vinculado');
    }

    const boundedRisk = Math.min(100, Math.round(riskScore));
    const riskLevel: CustomerPortfolioRiskLevel = boundedRisk >= 60 ? 'crítico' : boundedRisk >= 30 ? 'atenção' : 'saudável';
    const expansionPotential = this.calculateExpansionPotential({
      healthScore: client.healthScore,
      activeProducts,
      implementationProgress,
      overdueAmount,
      openTickets,
      daysWithoutInteraction,
    });

    if (reasons.length === 0) reasons.push('operação estável, sem sinais críticos');

    return {
      clientId: client.id,
      clientName,
      city: client.city,
      state: client.state,
      healthScore: client.healthScore,
      riskLevel,
      riskScore: boundedRisk,
      activeProducts,
      implementationProgress,
      overdueAmount,
      openTickets,
      criticalTickets,
      daysWithoutInteraction,
      expansionPotential,
      recurringRevenue,
      reasons,
    };
  }

  private static buildPriorityActions(snapshots: CustomerPortfolioClientSnapshot[]): CustomerPortfolioAction[] {
    const actions: CustomerPortfolioAction[] = [];

    snapshots.forEach((snapshot) => {
      if (snapshot.criticalTickets > 0) {
        actions.push(this.action(snapshot, 'suporte', 'Resolver chamado crítico', `${snapshot.criticalTickets} chamado(s) crítico(s) ameaçam a continuidade do cliente.`, 'alta'));
      }
      if (snapshot.overdueAmount > 0) {
        actions.push(this.action(snapshot, 'financeiro', 'Regularizar pendência financeira', `Há ${this.formatCurrency(snapshot.overdueAmount)} em valores vencidos.`, 'alta'));
      }
      if (snapshot.implementationProgress < 60) {
        actions.push(this.action(snapshot, 'implantação', 'Acelerar implantação', `A implantação está em ${snapshot.implementationProgress}% e precisa de plano de avanço.`, snapshot.riskLevel === 'crítico' ? 'alta' : 'média'));
      }
      if (snapshot.daysWithoutInteraction >= 15) {
        actions.push(this.action(snapshot, 'relacionamento', 'Retomar relacionamento', `Cliente está há ${snapshot.daysWithoutInteraction} dias sem interação registrada.`, 'média'));
      }
      if (snapshot.expansionPotential >= 70) {
        actions.push(this.action(snapshot, 'expansão', 'Preparar expansão comercial', `Cliente tem potencial de expansão de ${snapshot.expansionPotential}%.`, 'baixa'));
      }
    });

    return actions
      .sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority))
      .slice(0, 12);
  }

  private static action(
    snapshot: CustomerPortfolioClientSnapshot,
    area: CustomerPortfolioAction['area'],
    title: string,
    description: string,
    priority: CustomerPortfolioAction['priority'],
  ): CustomerPortfolioAction {
    return {
      id: `${area}-${snapshot.clientId}`,
      clientId: snapshot.clientId,
      clientName: snapshot.clientName,
      area,
      title: `${title} — ${snapshot.clientName}`,
      description,
      priority,
      taskTitle: `[Sucesso do Cliente] ${snapshot.clientName}: ${title.toLowerCase()}`,
    };
  }

  private static calculateExpansionPotential(input: {
    healthScore: number;
    activeProducts: number;
    implementationProgress: number;
    overdueAmount: number;
    openTickets: number;
    daysWithoutInteraction: number;
  }): number {
    let score = input.healthScore * 0.55 + input.implementationProgress * 0.25;
    score += input.activeProducts > 0 ? 12 : 0;
    score -= input.overdueAmount > 0 ? 30 : 0;
    score -= Math.min(20, input.openTickets * 5);
    score -= input.daysWithoutInteraction >= 30 ? 15 : 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private static resolvePortfolioRisk(score: number, criticalClients: number): CustomerPortfolioRiskLevel {
    if (criticalClients > 0 || score < 55) return 'crítico';
    if (score < 78) return 'atenção';
    return 'saudável';
  }

  private static daysSince(value?: string): number {
    if (!value) return 999;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return 999;
    return Math.max(0, Math.floor((Date.now() - time) / 86400000));
  }

  private static priorityWeight(priority: CustomerPortfolioAction['priority']): number {
    if (priority === 'alta') return 3;
    if (priority === 'média') return 2;
    return 1;
  }

  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  }
}
