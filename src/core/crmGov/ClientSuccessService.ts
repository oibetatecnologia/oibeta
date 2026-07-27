import type {
  ClientContractRecord,
  ClientFinancialRecord,
  ClientImplementationRecord,
  ClientStatus,
  ClientSupportTicket,
} from '../../hooks/useClientState';
import type { ClientLifecycleItem, ClientLifecycleSummary } from './ClientLifecycleService';
import type { ClientRevenueSummary } from './ClientRevenueService';

export type ClientSuccessRiskLevel = 'baixo' | 'médio' | 'alto';

export interface ClientSuccessClient {
  id: string;
  name?: string;
  entity?: string;
  status: ClientStatus;
  contracts: ClientContractRecord[];
  implementations: ClientImplementationRecord[];
  financialRecords: ClientFinancialRecord[];
  supportTickets: ClientSupportTicket[];
  healthScore: number;
}

export interface ClientSuccessRiskItem {
  id: string;
  clientId: string;
  clientName: string;
  level: ClientSuccessRiskLevel;
  title: string;
  description: string;
  targetTab: string;
  taskTitle: string;
}

export interface ClientSuccessSummary {
  successScore: number;
  clientsTracked: number;
  activeClients: number;
  clientsAtRisk: number;
  criticalSuccessRisks: number;
  clientsWithoutRecentSuccess: number;
  clientsReadyForExpansion: number;
  retentionRiskItems: ClientSuccessRiskItem[];
}

export class ClientSuccessService {
  static buildSummary(
    clients: ClientSuccessClient[],
    lifecycle: ClientLifecycleItem[],
    lifecycleSummary: ClientLifecycleSummary,
    revenueSummary: ClientRevenueSummary,
  ): ClientSuccessSummary {
    const activeClients = clients.filter((client) => client.status === 'active').length;
    const lifecycleRiskItems = this.buildLifecycleRisks(lifecycle);
    const supportRiskItems = this.buildSupportRisks(clients);
    const billingRiskItems = revenueSummary.revenueRiskItems.map((item): ClientSuccessRiskItem => ({
      id: `success-${item.id}`,
      clientId: item.clientId,
      clientName: item.clientName,
      level: item.level,
      title: `Risco de receita — ${item.clientName}`,
      description: item.description,
      targetTab: item.taskTitle.includes('[Suporte]') ? 'support' : 'finance',
      taskTitle: item.taskTitle,
    }));

    const expansionItems = this.buildExpansionItems(clients, lifecycle);
    const retentionRiskItems = [...billingRiskItems, ...supportRiskItems, ...lifecycleRiskItems, ...expansionItems]
      .sort((a, b) => this.levelWeight(b.level) - this.levelWeight(a.level));

    const clientsAtRisk = new Set(
      retentionRiskItems
        .filter((item) => item.level === 'alto' || item.level === 'médio')
        .map((item) => item.clientId),
    ).size;

    const criticalSuccessRisks = retentionRiskItems.filter((item) => item.level === 'alto').length;
    const clientsWithoutRecentSuccess = clients.filter((client) =>
      client.status === 'active' &&
      !client.supportTickets.some((ticket) => ticket.status === 'resolved' || ticket.status === 'closed') &&
      !client.implementations.some((implementation) => implementation.status === 'completed')
    ).length;

    const clientsReadyForExpansion = expansionItems.length;
    const riskPenalty = Math.min(42, criticalSuccessRisks * 8 + clientsAtRisk * 4);
    const lifecyclePenalty = Math.max(0, 75 - lifecycleSummary.averageLifecycleScore) * 0.25;
    const revenuePenalty = Math.max(0, 80 - revenueSummary.revenueHealthScore) * 0.3;
    const expansionBonus = Math.min(8, clientsReadyForExpansion * 2);
    const successScore = Math.max(0, Math.min(100, Math.round(82 - riskPenalty - lifecyclePenalty - revenuePenalty + expansionBonus)));

    return {
      successScore,
      clientsTracked: clients.length,
      activeClients,
      clientsAtRisk,
      criticalSuccessRisks,
      clientsWithoutRecentSuccess,
      clientsReadyForExpansion,
      retentionRiskItems,
    };
  }

  private static buildLifecycleRisks(lifecycle: ClientLifecycleItem[]): ClientSuccessRiskItem[] {
    return lifecycle
      .filter((item) => item.bottleneck && (item.bottleneck.status === 'blocked' || item.bottleneck.status === 'attention'))
      .slice(0, 8)
      .map((item) => ({
        id: `success-lifecycle-${item.clientId}-${item.currentStage}`,
        clientId: item.clientId,
        clientName: item.clientName,
        level: item.bottleneck?.status === 'blocked' ? 'alto' : 'médio',
        title: `Gargalo de sucesso — ${item.clientName}`,
        description: item.bottleneck?.description || 'Cliente possui gargalo no ciclo operacional.',
        targetTab: this.resolveTargetTab(item.currentStage),
        taskTitle: `[Sucesso do Cliente] ${item.clientName}: ${item.bottleneck?.nextAction || 'resolver gargalo operacional'}`,
      }));
  }

  private static buildSupportRisks(clients: ClientSuccessClient[]): ClientSuccessRiskItem[] {
    return clients.flatMap((client) => {
      const clientName = client.name || client.entity || 'Cliente';
      const openCritical = client.supportTickets.filter((ticket) =>
        ticket.priority === 'critical' && !['resolved', 'closed'].includes(ticket.status)
      );
      const waitingClient = client.supportTickets.filter((ticket) => ticket.status === 'waiting_client');

      const items: ClientSuccessRiskItem[] = [];

      if (openCritical.length > 0) {
        items.push({
          id: `success-critical-support-${client.id}`,
          clientId: client.id,
          clientName,
          level: 'alto',
          title: `Chamado crítico — ${clientName}`,
          description: `${openCritical.length} chamado(s) crítico(s) aberto(s) podem afetar retenção.`,
          targetTab: 'support',
          taskTitle: `[Sucesso do Cliente] ${clientName}: resolver chamado crítico`,
        });
      }

      if (waitingClient.length > 0) {
        items.push({
          id: `success-waiting-client-${client.id}`,
          clientId: client.id,
          clientName,
          level: 'médio',
          title: `Aguardando cliente — ${clientName}`,
          description: `${waitingClient.length} chamado(s) dependem de resposta do cliente.`,
          targetTab: 'support',
          taskTitle: `[Sucesso do Cliente] ${clientName}: retomar chamado aguardando cliente`,
        });
      }

      return items;
    });
  }

  private static buildExpansionItems(
    clients: ClientSuccessClient[],
    lifecycle: ClientLifecycleItem[],
  ): ClientSuccessRiskItem[] {
    return clients
      .filter((client) => client.status === 'active')
      .filter((client) => client.healthScore >= 80)
      .filter((client) => !client.financialRecords.some((record) => record.status === 'overdue'))
      .filter((client) => {
        const lifecycleItem = lifecycle.find((item) => item.clientId === client.id);
        return !lifecycleItem?.bottleneck || lifecycleItem.score >= 80;
      })
      .slice(0, 6)
      .map((client) => {
        const clientName = client.name || client.entity || 'Cliente';

        return {
          id: `success-expansion-${client.id}`,
          clientId: client.id,
          clientName,
          level: 'baixo',
          title: `Expansão possível — ${clientName}`,
          description: 'Cliente ativo com boa saúde operacional pode receber nova oferta, módulo ou acompanhamento consultivo.',
          targetTab: 'enterprise_clients',
          taskTitle: `[Sucesso do Cliente] ${clientName}: avaliar expansão comercial`,
        };
      });
  }

  private static resolveTargetTab(stageId: string): string {
    if (stageId === 'crm' || stageId === 'contract') return 'crm';
    if (stageId === 'implementation') return 'implementations';
    if (stageId === 'finance') return 'finance';
    if (stageId === 'support') return 'support';

    return 'enterprise_clients';
  }

  private static levelWeight(level: ClientSuccessRiskLevel): number {
    if (level === 'alto') return 3;
    if (level === 'médio') return 2;
    return 1;
  }
}
