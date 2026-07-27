import type { ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import type { ClientImplementationRecord, ClientImplementationStatus } from '../../hooks/useClientState';
import type {
  ImplementationActionItem,
  ImplementationActionPriority,
  ImplementationIntelligenceSummary,
  ImplementationRiskLevel,
  ImplementationSnapshot,
  ImplementationStageSummary,
} from './ImplementationIntelligenceTypes';

interface TaskLike {
  title?: string;
  status?: string;
}

const STATUS_LABELS: Record<ClientImplementationStatus, string> = {
  preparation: 'Preparação',
  in_progress: 'Em andamento',
  waiting_client: 'Aguardando cliente',
  training: 'Treinamento',
  go_live: 'Go-live',
  completed: 'Concluída',
  blocked: 'Bloqueada',
};

const ACTIVE_STATUSES = new Set<ClientImplementationStatus>([
  'preparation',
  'in_progress',
  'waiting_client',
  'training',
  'go_live',
  'blocked',
]);

export class ImplementationIntelligenceService {
  static buildSummary(clients: ClientsWorkspaceClient[], tasks: TaskLike[] = []): ImplementationIntelligenceSummary {
    const taskTitles = new Set(
      tasks
        .filter((task) => task.status !== 'completed' && task.status !== 'done')
        .map((task) => (task.title || '').trim().toLocaleLowerCase('pt-BR'))
        .filter(Boolean),
    );

    const snapshots = clients
      .flatMap((client) => client.implementations.map((implementation) => this.buildSnapshot(client, implementation)))
      .sort((a, b) => this.riskWeight(b.riskLevel) - this.riskWeight(a.riskLevel) || a.readinessScore - b.readinessScore);

    const total = snapshots.length;
    const active = snapshots.filter((item) => ACTIVE_STATUSES.has(item.status) && item.status !== 'completed').length;
    const completed = snapshots.filter((item) => item.status === 'completed').length;
    const blocked = snapshots.filter((item) => item.status === 'blocked').length;
    const waitingClient = snapshots.filter((item) => item.status === 'waiting_client').length;
    const overdue = snapshots.filter((item) => typeof item.daysToGoLive === 'number' && item.daysToGoLive < 0 && item.status !== 'completed').length;
    const stale = snapshots.filter((item) => item.daysWithoutUpdate >= 7 && item.status !== 'completed').length;
    const averageProgress = total ? Math.round(snapshots.reduce((sum, item) => sum + item.progress, 0) / total) : 0;
    const averageReadiness = total ? Math.round(snapshots.reduce((sum, item) => sum + item.readinessScore, 0) / total) : 0;
    const projectedGoLives30Days = snapshots.filter(
      (item) => item.status !== 'completed' && typeof item.daysToGoLive === 'number' && item.daysToGoLive >= 0 && item.daysToGoLive <= 30,
    ).length;

    const healthScore = this.clamp(
      Math.round(
        (total ? averageReadiness * 0.55 + averageProgress * 0.25 : 55) +
          (completed > 0 ? Math.min(10, completed * 2) : 0) -
          blocked * 10 -
          overdue * 8 -
          stale * 4,
      ),
    );
    const riskLevel = this.toRiskLevel(healthScore);
    const actions = snapshots.flatMap((snapshot) => this.buildActions(snapshot, taskTitles)).slice(0, 12);

    return {
      healthScore,
      riskLevel,
      total,
      active,
      completed,
      blocked,
      waitingClient,
      overdue,
      stale,
      averageProgress,
      averageReadiness,
      projectedGoLives30Days,
      snapshots,
      stages: this.buildStages(snapshots),
      actions,
      executiveMessage: this.buildExecutiveMessage({ total, blocked, overdue, stale, averageProgress, projectedGoLives30Days }),
    };
  }

  private static buildSnapshot(client: ClientsWorkspaceClient, implementation: ClientImplementationRecord): ImplementationSnapshot {
    const clientName = client.name || client.entity || 'Cliente';
    const checklistTotal = implementation.checklist.length;
    const checklistCompleted = implementation.checklist.filter((item) => item.done).length;
    const checklistProgress = checklistTotal ? Math.round((checklistCompleted / checklistTotal) * 100) : implementation.progress;
    const progress = Math.max(implementation.progress, checklistProgress);
    const daysWithoutUpdate = this.daysSince(implementation.updatedAt || implementation.createdAt);
    const daysToGoLive = implementation.expectedGoLiveDate
      ? this.daysUntil(`${implementation.expectedGoLiveDate}T23:59:59`)
      : undefined;
    const blockers: string[] = [];

    if (implementation.status === 'blocked') blockers.push('Implantação marcada como bloqueada.');
    if (implementation.status === 'waiting_client' && daysWithoutUpdate >= 5) blockers.push('Dependência do cliente sem retorno há pelo menos 5 dias.');
    if (typeof daysToGoLive === 'number' && daysToGoLive < 0 && implementation.status !== 'completed') blockers.push(`Go-live atrasado em ${Math.abs(daysToGoLive)} dia(s).`);
    if (daysWithoutUpdate >= 7 && implementation.status !== 'completed') blockers.push(`Sem atualização há ${daysWithoutUpdate} dia(s).`);
    if (progress < 40 && typeof daysToGoLive === 'number' && daysToGoLive <= 15) blockers.push('Progresso incompatível com a proximidade do go-live.');
    if (!implementation.responsible.trim()) blockers.push('Responsável operacional não definido.');

    let readinessScore = progress * 0.55 + checklistProgress * 0.2;
    readinessScore += implementation.expectedGoLiveDate ? 10 : 0;
    readinessScore += implementation.responsible.trim() ? 10 : 0;
    readinessScore += implementation.status === 'completed' ? 20 : 5;
    readinessScore -= blockers.length * 12;
    readinessScore = this.clamp(Math.round(readinessScore));

    return {
      id: implementation.id,
      clientId: client.id,
      clientName,
      title: implementation.title,
      status: implementation.status,
      responsible: implementation.responsible,
      progress,
      checklistCompleted,
      checklistTotal,
      expectedGoLiveDate: implementation.expectedGoLiveDate,
      daysToGoLive,
      daysWithoutUpdate,
      riskLevel: this.toRiskLevel(readinessScore),
      readinessScore,
      blockers,
      nextMilestone: this.nextMilestone(implementation, progress),
    };
  }

  private static buildActions(snapshot: ImplementationSnapshot, taskTitles: Set<string>): ImplementationActionItem[] {
    if (snapshot.status === 'completed') return [];
    const actions: ImplementationActionItem[] = [];

    if (snapshot.status === 'blocked') {
      actions.push(this.action(snapshot, 'Desbloquear implantação', 'Mapear a causa raiz, definir responsável e registrar um plano de recuperação.', 'crítica'));
    }
    if (typeof snapshot.daysToGoLive === 'number' && snapshot.daysToGoLive < 0) {
      actions.push(this.action(snapshot, 'Recuperar go-live atrasado', `Replanejar a entrega atrasada em ${Math.abs(snapshot.daysToGoLive)} dia(s) e comunicar o cliente.`, 'crítica'));
    }
    if (snapshot.status === 'waiting_client' && snapshot.daysWithoutUpdate >= 5) {
      actions.push(this.action(snapshot, 'Cobrar pendência do cliente', 'Retomar contato, registrar a dependência e estabelecer uma nova data de retorno.', 'alta'));
    }
    if (snapshot.daysWithoutUpdate >= 7) {
      actions.push(this.action(snapshot, 'Atualizar implantação parada', `A implantação está sem movimentação há ${snapshot.daysWithoutUpdate} dia(s).`, 'alta'));
    }
    if (snapshot.progress < 50 && typeof snapshot.daysToGoLive === 'number' && snapshot.daysToGoLive >= 0 && snapshot.daysToGoLive <= 20) {
      actions.push(this.action(snapshot, 'Acelerar checklist de implantação', 'Priorizar itens críticos para manter a data prevista de entrada em produção.', 'alta'));
    }
    if (!snapshot.expectedGoLiveDate) {
      actions.push(this.action(snapshot, 'Definir data de go-live', 'Estabelecer uma data-alvo e alinhar o cronograma com todos os responsáveis.', 'média'));
    }

    return actions.map((item) => ({
      ...item,
      alreadyCreated: taskTitles.has(item.taskTitle.toLocaleLowerCase('pt-BR')),
    }));
  }

  private static action(
    snapshot: ImplementationSnapshot,
    title: string,
    description: string,
    priority: ImplementationActionPriority,
  ): ImplementationActionItem {
    const taskTitle = `[Implantação] ${snapshot.clientName}: ${title} — ${snapshot.title}`;
    return {
      id: `${snapshot.id}-${title.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}`,
      implementationId: snapshot.id,
      clientId: snapshot.clientId,
      clientName: snapshot.clientName,
      title,
      description,
      priority,
      targetTab: 'implementations',
      taskTitle,
      alreadyCreated: false,
    };
  }

  private static buildStages(snapshots: ImplementationSnapshot[]): ImplementationStageSummary[] {
    const total = snapshots.length;
    return (Object.keys(STATUS_LABELS) as ClientImplementationStatus[]).map((status) => {
      const count = snapshots.filter((item) => item.status === status).length;
      return {
        status,
        label: STATUS_LABELS[status],
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
      };
    });
  }

  private static nextMilestone(implementation: ClientImplementationRecord, progress: number): string {
    if (implementation.status === 'blocked') return 'Remover bloqueio e revalidar cronograma';
    if (implementation.status === 'waiting_client') return 'Obter retorno e validação do cliente';
    if (implementation.status === 'training') return 'Concluir treinamento e validar usuários-chave';
    if (implementation.status === 'go_live') return 'Aprovar operação assistida e aceite final';
    if (implementation.status === 'completed') return 'Transferir para Customer Success e suporte';
    if (progress < 35) return 'Concluir configuração inicial e acessos';
    if (progress < 70) return 'Finalizar dados, integrações e validações';
    return 'Preparar treinamento e go-live';
  }

  private static buildExecutiveMessage(input: {
    total: number;
    blocked: number;
    overdue: number;
    stale: number;
    averageProgress: number;
    projectedGoLives30Days: number;
  }): string {
    if (!input.total) return 'Ainda não há implantações registradas. O próximo passo é iniciar o onboarding dos clientes contratados.';
    if (input.blocked || input.overdue) return `${input.blocked} implantação(ões) bloqueada(s) e ${input.overdue} atrasada(s) exigem recuperação antes de novos compromissos de go-live.`;
    if (input.stale) return `${input.stale} implantação(ões) estão sem atualização recente. A prioridade é recuperar ritmo e manter o cliente informado.`;
    return `A carteira está com ${input.averageProgress}% de progresso médio e ${input.projectedGoLives30Days} go-live(s) previstos para os próximos 30 dias.`;
  }

  private static riskWeight(level: ImplementationRiskLevel): number {
    return level === 'crítico' ? 3 : level === 'atenção' ? 2 : 1;
  }

  private static toRiskLevel(score: number): ImplementationRiskLevel {
    if (score >= 75) return 'saudável';
    if (score >= 50) return 'atenção';
    return 'crítico';
  }

  private static daysSince(value: string): number {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 0;
    return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  }

  private static daysUntil(value: string): number {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 0;
    return Math.ceil((timestamp - Date.now()) / 86_400_000);
  }

  private static clamp(value: number): number {
    return Math.min(100, Math.max(0, value));
  }
}
