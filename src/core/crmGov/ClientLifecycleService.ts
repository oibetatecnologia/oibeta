import type {
  ClientContractRecord,
  ClientFinancialRecord,
  ClientImplementationRecord,
  ClientNextAction,
  ClientProposalRecord,
  ClientSupportTicket,
  ClientStatus,
} from '../../hooks/useClientState';
import type { ClientOperationalBacklogItem } from './ClientOperationalBacklogService';

export type ClientLifecycleStageId = 'crm' | 'contract' | 'implementation' | 'finance' | 'support';
export type ClientLifecycleStageStatus = 'complete' | 'attention' | 'pending' | 'blocked';

export interface ClientLifecycleClient {
  id: string;
  name?: string;
  entity?: string;
  status: ClientStatus;
  nextAction?: ClientNextAction;
  proposals: ClientProposalRecord[];
  contracts: ClientContractRecord[];
  implementations: ClientImplementationRecord[];
  financialRecords: ClientFinancialRecord[];
  supportTickets: ClientSupportTicket[];
}

export interface ClientLifecycleStage {
  id: ClientLifecycleStageId;
  label: string;
  status: ClientLifecycleStageStatus;
  score: number;
  description: string;
  nextAction: string;
}

export interface ClientLifecycleItem {
  clientId: string;
  clientName: string;
  status: ClientStatus;
  stages: ClientLifecycleStage[];
  score: number;
  currentStage: ClientLifecycleStageId;
  bottleneck?: ClientLifecycleStage;
}

export interface ClientLifecycleSummary {
  clientsTracked: number;
  averageLifecycleScore: number;
  crmAttention: number;
  contractAttention: number;
  implementationAttention: number;
  financeAttention: number;
  supportAttention: number;
  blockedClients: number;
  readyForRevenue: number;
}

const STAGE_LABELS: Record<ClientLifecycleStageId, string> = {
  crm: 'CRM',
  contract: 'Contrato',
  implementation: 'Implantação',
  finance: 'Financeiro',
  support: 'Suporte',
};

export class ClientLifecycleService {
  static buildForClients(
    clients: ClientLifecycleClient[],
    backlog: ClientOperationalBacklogItem[],
  ): ClientLifecycleItem[] {
    return clients
      .filter((client) => client.status !== 'lost')
      .map((client) => this.buildForClient(client, backlog.filter((item) => item.clientId === client.id)))
      .sort((a, b) => a.score - b.score);
  }

  static buildSummary(items: ClientLifecycleItem[]): ClientLifecycleSummary {
    const clientsTracked = items.length;
    const averageLifecycleScore = this.average(items.map((item) => item.score));

    return {
      clientsTracked,
      averageLifecycleScore,
      crmAttention: this.countStageAttention(items, 'crm'),
      contractAttention: this.countStageAttention(items, 'contract'),
      implementationAttention: this.countStageAttention(items, 'implementation'),
      financeAttention: this.countStageAttention(items, 'finance'),
      supportAttention: this.countStageAttention(items, 'support'),
      blockedClients: items.filter((item) => item.stages.some((stage) => stage.status === 'blocked')).length,
      readyForRevenue: items.filter((item) => {
        const implementation = item.stages.find((stage) => stage.id === 'implementation');
        const finance = item.stages.find((stage) => stage.id === 'finance');

        return implementation?.status === 'complete' && finance?.status !== 'complete';
      }).length,
    };
  }

  private static buildForClient(
    client: ClientLifecycleClient,
    backlog: ClientOperationalBacklogItem[],
  ): ClientLifecycleItem {
    const clientName = client.name || client.entity || 'Cliente';
    const stages = [
      this.buildCrmStage(client, backlog),
      this.buildContractStage(client),
      this.buildImplementationStage(client, backlog),
      this.buildFinanceStage(client, backlog),
      this.buildSupportStage(client, backlog),
    ];

    const score = this.average(stages.map((stage) => stage.score));
    const bottleneck = stages.find((stage) => stage.status === 'blocked') ||
      stages.find((stage) => stage.status === 'attention') ||
      stages.find((stage) => stage.status === 'pending');

    return {
      clientId: client.id,
      clientName,
      status: client.status,
      stages,
      score,
      currentStage: bottleneck?.id || 'support',
      bottleneck,
    };
  }

  private static buildCrmStage(
    client: ClientLifecycleClient,
    backlog: ClientOperationalBacklogItem[],
  ): ClientLifecycleStage {
    const hasProposal = client.proposals.length > 0;
    const hasActiveProposal = client.proposals.some((proposal) => proposal.status === 'sent' || proposal.status === 'negotiation');
    const hasNextAction = Boolean(client.nextAction?.title);
    const crmBacklog = backlog.some((item) => item.area === 'crm');

    if (client.status === 'active' || client.status === 'contracted') {
      return this.stage('crm', 'complete', 100, 'Cliente já avançou para contrato/operação.', 'Manter relacionamento ativo.');
    }

    if (hasActiveProposal || crmBacklog) {
      return this.stage('crm', 'attention', 65, 'Existe proposta ou ação comercial em andamento.', 'Acompanhar próxima ação comercial.');
    }

    if (hasProposal || hasNextAction) {
      return this.stage('crm', 'attention', 72, 'Existe histórico comercial, mas ainda falta conversão.', 'Avançar negociação.');
    }

    return this.stage('crm', 'pending', 35, 'Cliente ainda precisa de qualificação comercial.', 'Definir próxima ação no CRM.');
  }

  private static buildContractStage(client: ClientLifecycleClient): ClientLifecycleStage {
    const activeContract = client.contracts.find((contract) => contract.status === 'active' || contract.status === 'signed');
    const draftContract = client.contracts.find((contract) => contract.status === 'draft' || contract.status === 'ready');
    const acceptedProposal = client.proposals.find((proposal) => proposal.status === 'accepted');

    if (activeContract) {
      return this.stage('contract', 'complete', 100, `Contrato ${activeContract.title} assinado/ativo.`, 'Iniciar ou acompanhar implantação.');
    }

    if (draftContract) {
      return this.stage('contract', 'attention', 70, `Contrato ${draftContract.title} em preparação.`, 'Finalizar assinatura do contrato.');
    }

    if (acceptedProposal || client.status === 'proposal') {
      return this.stage('contract', 'attention', 58, 'Existe proposta avançada sem contrato ativo.', 'Gerar contrato a partir da proposta.');
    }

    return this.stage('contract', 'pending', 25, 'Ainda não há contrato para este cliente.', 'Converter proposta em contrato.');
  }

  private static buildImplementationStage(
    client: ClientLifecycleClient,
    backlog: ClientOperationalBacklogItem[],
  ): ClientLifecycleStage {
    const implementation = client.implementations[0];
    const hasImplementationBacklog = backlog.some((item) => item.area === 'implementation');

    if (!implementation) {
      const activeContractWithoutImplementation = client.contracts.some((contract) =>
        (contract.status === 'active' || contract.status === 'signed') &&
        !client.implementations.some((item) => item.contractId === contract.id)
      );

      return this.stage(
        'implementation',
        activeContractWithoutImplementation ? 'attention' : 'pending',
        activeContractWithoutImplementation ? 50 : 20,
        activeContractWithoutImplementation
          ? 'Contrato ativo sem implantação vinculada.'
          : 'Implantação ainda não iniciada.',
        activeContractWithoutImplementation
          ? 'Criar implantação do contrato.'
          : 'Aguardar contrato para iniciar implantação.',
      );
    }

    if (implementation.status === 'completed') {
      return this.stage('implementation', 'complete', 100, 'Implantação concluída.', 'Transferir para operação assistida.');
    }

    if (implementation.status === 'blocked') {
      return this.stage('implementation', 'blocked', Math.max(20, implementation.progress), 'Implantação bloqueada.', 'Desbloquear pendências da implantação.');
    }

    if (implementation.status === 'waiting_client' || hasImplementationBacklog) {
      return this.stage('implementation', 'attention', Math.max(45, implementation.progress), 'Implantação depende de ação ou validação.', 'Criar tarefa para pendência de implantação.');
    }

    return this.stage('implementation', 'attention', Math.max(55, implementation.progress), 'Implantação em andamento.', 'Acompanhar checklist até o go-live.');
  }

  private static buildFinanceStage(
    client: ClientLifecycleClient,
    backlog: ClientOperationalBacklogItem[],
  ): ClientLifecycleStage {
    const overdue = client.financialRecords.filter((record) => record.status === 'overdue');
    const pending = client.financialRecords.filter((record) => record.status === 'pending');
    const paid = client.financialRecords.filter((record) => record.status === 'paid');
    const financeBacklog = backlog.some((item) => item.area === 'finance');

    if (overdue.length > 0) {
      return this.stage('finance', 'blocked', 25, `${overdue.length} cobrança(s) vencida(s).`, 'Criar tarefa de cobrança e acompanhar recebimento.');
    }

    if (pending.length > 0 || financeBacklog) {
      return this.stage('finance', 'attention', 60, `${pending.length} lançamento(s) pendente(s).`, 'Acompanhar vencimentos financeiros.');
    }

    if (paid.length > 0) {
      return this.stage('finance', 'complete', 100, 'Recebimentos registrados.', 'Manter faturamento recorrente.');
    }

    if (client.implementations.some((implementation) => implementation.status === 'completed' || implementation.status === 'go_live')) {
      return this.stage('finance', 'attention', 50, 'Cliente implantado sem lançamento financeiro.', 'Criar faturamento do cliente.');
    }

    return this.stage('finance', 'pending', 20, 'Ainda não há financeiro associado.', 'Aguardar contrato/implantação para faturar.');
  }

  private static buildSupportStage(
    client: ClientLifecycleClient,
    backlog: ClientOperationalBacklogItem[],
  ): ClientLifecycleStage {
    const critical = client.supportTickets.filter((ticket) =>
      ticket.priority === 'critical' && !['resolved', 'closed'].includes(ticket.status)
    );
    const open = client.supportTickets.filter((ticket) =>
      ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'waiting_client'
    );
    const supportBacklog = backlog.some((item) => item.area === 'support');

    if (critical.length > 0) {
      return this.stage('support', 'blocked', 30, `${critical.length} chamado(s) crítico(s) aberto(s).`, 'Resolver chamado crítico.');
    }

    if (open.length > 0 || supportBacklog) {
      return this.stage('support', 'attention', 65, `${open.length} chamado(s) aberto(s).`, 'Acompanhar chamados ativos.');
    }

    if (client.status === 'active') {
      return this.stage('support', 'complete', 100, 'Cliente ativo sem chamados abertos.', 'Manter rotina de sucesso do cliente.');
    }

    return this.stage('support', 'pending', 45, 'Suporte ainda não iniciado.', 'Ativar suporte após implantação.');
  }

  private static stage(
    id: ClientLifecycleStageId,
    status: ClientLifecycleStageStatus,
    score: number,
    description: string,
    nextAction: string,
  ): ClientLifecycleStage {
    return {
      id,
      label: STAGE_LABELS[id],
      status,
      score,
      description,
      nextAction,
    };
  }

  private static countStageAttention(items: ClientLifecycleItem[], stageId: ClientLifecycleStageId): number {
    return items.filter((item) => {
      const stage = item.stages.find((candidate) => candidate.id === stageId);

      return stage?.status === 'attention' || stage?.status === 'blocked';
    }).length;
  }

  private static average(values: number[]): number {
    if (values.length === 0) return 0;

    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  }
}
