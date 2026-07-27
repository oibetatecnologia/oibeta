import type { ClientOperationalBacklogItem, ClientOperationalFlowSummary } from './ClientOperationalBacklogService';
import type { ClientLifecycleSummary } from './ClientLifecycleService';
import type { ClientRevenueSummary } from './ClientRevenueService';
import type { ClientSuccessSummary } from './ClientSuccessService';

export type ClientExecutivePriorityLevel = 'alta' | 'média' | 'baixa';
export type ClientExecutivePriorityArea =
  | 'crm'
  | 'implementation'
  | 'finance'
  | 'support'
  | 'success'
  | 'platform';

export interface ClientExecutivePriority {
  id: string;
  area: ClientExecutivePriorityArea;
  title: string;
  description: string;
  priority: ClientExecutivePriorityLevel;
  targetTab: string;
  taskTitle: string;
}

export interface ClientExecutiveSummary {
  executiveScore: number;
  readinessLevel: 'crítico' | 'atenção' | 'saudável';
  operatingPressure: number;
  commercialPressure: number;
  implementationPressure: number;
  financePressure: number;
  supportPressure: number;
  successPressure: number;
  totalCriticalSignals: number;
  nextMilestone: string;
  strategicPriorities: ClientExecutivePriority[];
}

export class ClientExecutiveService {
  static buildSummary(input: {
    operationalBacklog: ClientOperationalBacklogItem[];
    operationalFlowSummary: ClientOperationalFlowSummary;
    clientLifecycleSummary: ClientLifecycleSummary;
    clientRevenueSummary: ClientRevenueSummary;
    clientSuccessSummary: ClientSuccessSummary;
  }): ClientExecutiveSummary {
    const {
      operationalBacklog,
      operationalFlowSummary,
      clientLifecycleSummary,
      clientRevenueSummary,
      clientSuccessSummary,
    } = input;

    const commercialPressure = this.normalizePressure(operationalFlowSummary.crmItems, 8);
    const implementationPressure = this.normalizePressure(
      operationalFlowSummary.implementationItems + clientLifecycleSummary.implementationAttention,
      10,
    );
    const financePressure = this.normalizePressure(
      operationalFlowSummary.financeItems + clientRevenueSummary.clientsAtRevenueRisk,
      10,
    );
    const supportPressure = this.normalizePressure(
      operationalFlowSummary.supportItems + clientSuccessSummary.clientsAtRisk,
      12,
    );
    const successPressure = this.normalizePressure(
      clientSuccessSummary.criticalSuccessRisks + clientSuccessSummary.clientsWithoutRecentSuccess,
      10,
    );

    const operatingPressure = Math.round(
      (commercialPressure + implementationPressure + financePressure + supportPressure + successPressure) / 5,
    );

    const averageScore = Math.round(
      (
        operationalFlowSummary.operationalFlowScore +
        clientLifecycleSummary.averageLifecycleScore +
        clientRevenueSummary.revenueHealthScore +
        clientSuccessSummary.successScore
      ) / 4,
    );

    const totalCriticalSignals =
      operationalFlowSummary.highPriorityItems +
      clientLifecycleSummary.blockedClients +
      clientRevenueSummary.clientsAtRevenueRisk +
      clientSuccessSummary.criticalSuccessRisks;

    const criticalPenalty = Math.min(20, totalCriticalSignals * 2);
    const executiveScore = Math.max(0, Math.min(100, averageScore - criticalPenalty));
    const readinessLevel = executiveScore >= 78
      ? 'saudável'
      : executiveScore >= 58
        ? 'atenção'
        : 'crítico';

    return {
      executiveScore,
      readinessLevel,
      operatingPressure,
      commercialPressure,
      implementationPressure,
      financePressure,
      supportPressure,
      successPressure,
      totalCriticalSignals,
      nextMilestone: this.resolveNextMilestone({
        operationalFlowSummary,
        clientLifecycleSummary,
        clientRevenueSummary,
        clientSuccessSummary,
      }),
      strategicPriorities: this.buildStrategicPriorities({
        operationalBacklog,
        operationalFlowSummary,
        clientLifecycleSummary,
        clientRevenueSummary,
        clientSuccessSummary,
      }),
    };
  }

  private static buildStrategicPriorities(input: {
    operationalBacklog: ClientOperationalBacklogItem[];
    operationalFlowSummary: ClientOperationalFlowSummary;
    clientLifecycleSummary: ClientLifecycleSummary;
    clientRevenueSummary: ClientRevenueSummary;
    clientSuccessSummary: ClientSuccessSummary;
  }): ClientExecutivePriority[] {
    const priorities: ClientExecutivePriority[] = [];

    if (input.clientRevenueSummary.clientsReadyToBill > 0) {
      priorities.push({
        id: 'executive-ready-to-bill',
        area: 'finance',
        title: 'Faturar clientes prontos',
        description: `${input.clientRevenueSummary.clientsReadyToBill} cliente(s) estão prontos para faturamento pós-implantação.`,
        priority: 'alta',
        targetTab: 'finance',
        taskTitle: '[Executivo] Faturar clientes prontos pós-implantação',
      });
    }

    if (input.clientSuccessSummary.criticalSuccessRisks > 0) {
      priorities.push({
        id: 'executive-critical-success',
        area: 'success',
        title: 'Reduzir riscos críticos de retenção',
        description: `${input.clientSuccessSummary.criticalSuccessRisks} risco(s) críticos impactam sucesso do cliente.`,
        priority: 'alta',
        targetTab: 'support',
        taskTitle: '[Executivo] Reduzir riscos críticos de retenção',
      });
    }

    if (input.clientLifecycleSummary.blockedClients > 0) {
      priorities.push({
        id: 'executive-blocked-lifecycle',
        area: 'implementation',
        title: 'Desbloquear ciclo de clientes',
        description: `${input.clientLifecycleSummary.blockedClients} cliente(s) têm gargalos bloqueantes no ciclo operacional.`,
        priority: 'alta',
        targetTab: 'enterprise_clients',
        taskTitle: '[Executivo] Desbloquear gargalos do ciclo de clientes',
      });
    }

    if (input.operationalFlowSummary.readyForImplementationContracts > 0) {
      priorities.push({
        id: 'executive-implementation-start',
        area: 'implementation',
        title: 'Iniciar implantações pendentes',
        description: `${input.operationalFlowSummary.readyForImplementationContracts} contrato(s) ativos ainda precisam de implantação.`,
        priority: 'média',
        targetTab: 'implementations',
        taskTitle: '[Executivo] Iniciar implantações de contratos ativos',
      });
    }

    input.operationalBacklog.slice(0, 4).forEach((item) => {
      priorities.push({
        id: `executive-backlog-${item.id}`,
        area: item.area === 'implementation' ? 'implementation' : item.area,
        title: item.title,
        description: item.description,
        priority: item.priority,
        targetTab: item.targetTab,
        taskTitle: item.taskTitle,
      });
    });

    if (priorities.length === 0) {
      priorities.push({
        id: 'executive-supabase',
        area: 'platform',
        title: 'Preparar persistência definitiva',
        description: 'A operação está estável. Próximo passo: consolidar backend/Supabase por domínio.',
        priority: 'média',
        targetTab: 'platform_monitoring',
        taskTitle: '[Executivo] Preparar consolidação de persistência Supabase',
      });
    }

    return priorities.slice(0, 8);
  }

  private static resolveNextMilestone(input: {
    operationalFlowSummary: ClientOperationalFlowSummary;
    clientLifecycleSummary: ClientLifecycleSummary;
    clientRevenueSummary: ClientRevenueSummary;
    clientSuccessSummary: ClientSuccessSummary;
  }): string {
    if (input.clientRevenueSummary.clientsReadyToBill > 0) {
      return 'Converter implantações concluídas em faturamento.';
    }

    if (input.clientSuccessSummary.criticalSuccessRisks > 0) {
      return 'Resolver riscos críticos de retenção.';
    }

    if (input.clientLifecycleSummary.blockedClients > 0) {
      return 'Desbloquear gargalos do ciclo de clientes.';
    }

    if (input.operationalFlowSummary.readyForImplementationContracts > 0) {
      return 'Iniciar implantações para contratos ativos.';
    }

    return 'Avançar persistência Supabase e integrações externas.';
  }

  private static normalizePressure(value: number, reference: number): number {
    if (reference <= 0) return 0;

    return Math.max(0, Math.min(100, Math.round((value / reference) * 100)));
  }
}
