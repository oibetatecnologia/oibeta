import type { ClientExecutiveSummary } from '../crmGov/ClientExecutiveService';
import type { IntegrationReadinessSummary } from '../integrations/IntegrationTypes';
import { RepositoryHealthService } from '../persistence/RepositoryHealthService';

export type BetaOperationalPriorityLevel = 'alta' | 'média' | 'baixa';
export type BetaOperationalPrioritySource =
  | 'executive'
  | 'integrations'
  | 'persistence'
  | 'automation'
  | 'platform';

export interface BetaOperationalPriority {
  id: string;
  title: string;
  description: string;
  priority: BetaOperationalPriorityLevel;
  source: BetaOperationalPrioritySource;
  targetTab: string;
  taskTitle: string;
}

export interface BetaOperationalIntelligenceSummary {
  betaReadinessScore: number;
  automationScore: number;
  intelligencePressure: number;
  highPriorityCount: number;
  nextAction: string;
  priorities: BetaOperationalPriority[];
}

export class BetaOperationalIntelligenceService {
  static buildSummary(input: {
    clientExecutiveSummary: ClientExecutiveSummary;
    integrationReadinessSummary: IntegrationReadinessSummary;
    activeModulesCount: number;
    activeFeaturesCount: number;
    pendingTasksCount: number;
    totalMemories: number;
    totalDecisions: number;
    isApiError: boolean;
  }): BetaOperationalIntelligenceSummary {
    const repositoryScore = RepositoryHealthService.getReadinessScore();
    const knowledgeScore = Math.min(100, input.totalMemories * 8 + input.totalDecisions * 10);
    const moduleScore = Math.min(100, input.activeModulesCount * 8 + input.activeFeaturesCount * 3);
    const taskPressure = Math.min(35, input.pendingTasksCount * 2);
    const apiPenalty = input.isApiError ? 18 : 0;

    const automationScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (
            input.clientExecutiveSummary.executiveScore +
            input.integrationReadinessSummary.readinessScore +
            repositoryScore +
            knowledgeScore +
            moduleScore
          ) / 5 - taskPressure - apiPenalty,
        ),
      ),
    );

    const priorities = this.buildPriorities(input, repositoryScore, knowledgeScore, moduleScore);
    const highPriorityCount = priorities.filter((priority) => priority.priority === 'alta').length;
    const intelligencePressure = Math.min(100, highPriorityCount * 18 + taskPressure + apiPenalty);
    const betaReadinessScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (
            input.clientExecutiveSummary.executiveScore +
            input.integrationReadinessSummary.readinessScore +
            repositoryScore +
            automationScore
          ) / 4,
        ),
      ),
    );

    return {
      betaReadinessScore,
      automationScore,
      intelligencePressure,
      highPriorityCount,
      nextAction: priorities[0]?.description || 'Consolidar automação operacional da Beta.',
      priorities,
    };
  }

  private static buildPriorities(
    input: {
      clientExecutiveSummary: ClientExecutiveSummary;
      integrationReadinessSummary: IntegrationReadinessSummary;
      pendingTasksCount: number;
      isApiError: boolean;
    },
    repositoryScore: number,
    knowledgeScore: number,
    moduleScore: number,
  ): BetaOperationalPriority[] {
    const priorities: BetaOperationalPriority[] = [];

    input.clientExecutiveSummary.strategicPriorities.slice(0, 4).forEach((priority) => {
      priorities.push({
        id: `executive-${priority.id}`,
        title: priority.title,
        description: priority.description,
        priority: priority.priority,
        source: 'executive',
        targetTab: priority.targetTab,
        taskTitle: priority.taskTitle,
      });
    });

    input.integrationReadinessSummary.healthSignals
      .filter((signal) => signal.status !== 'ready')
      .slice(0, 3)
      .forEach((signal) => {
        priorities.push({
          id: `integration-${signal.id}`,
          title: signal.title,
          description: signal.description,
          priority: signal.priority === 'alta' ? 'alta' : 'média',
          source: 'integrations',
          targetTab: signal.targetTab,
          taskTitle: signal.taskTitle,
        });
      });

    if (repositoryScore < 70) {
      priorities.push({
        id: 'persistence-readiness',
        title: 'Consolidar persistência dos repositórios',
        description: `A prontidão de persistência está em ${repositoryScore}%. Avançar API/Supabase antes de escalar dados reais.`,
        priority: repositoryScore < 55 ? 'alta' : 'média',
        source: 'persistence',
        targetTab: 'platform_monitoring',
        taskTitle: '[Beta IA] Consolidar persistência API/Supabase dos repositórios',
      });
    }

    if (input.pendingTasksCount > 12) {
      priorities.push({
        id: 'task-pressure',
        title: 'Reduzir pressão da fila de tarefas',
        description: `${input.pendingTasksCount} tarefas pendentes podem reduzir a capacidade operacional da Beta.`,
        priority: 'média',
        source: 'automation',
        targetTab: 'development',
        taskTitle: '[Beta IA] Triar fila de tarefas pendentes',
      });
    }

    if (input.isApiError) {
      priorities.unshift({
        id: 'modules-api-error',
        title: 'Restaurar API interna de módulos',
        description: 'A API interna de módulos está em erro e afeta a leitura operacional da plataforma.',
        priority: 'alta',
        source: 'platform',
        targetTab: 'platform_monitoring',
        taskTitle: '[Beta IA] Restaurar API interna de módulos',
      });
    }

    if (knowledgeScore < 45) {
      priorities.push({
        id: 'knowledge-context',
        title: 'Aumentar contexto operacional',
        description: 'A base de memórias e decisões ainda é baixa para automações mais confiáveis.',
        priority: 'média',
        source: 'automation',
        targetTab: 'knowledge',
        taskTitle: '[Beta IA] Registrar decisões e memórias operacionais críticas',
      });
    }

    if (moduleScore < 55) {
      priorities.push({
        id: 'modules-context',
        title: 'Consolidar módulos ativos',
        description: 'A Beta precisa de mais módulos e features ativos para ampliar automações transversais.',
        priority: 'média',
        source: 'platform',
        targetTab: 'platform_monitoring',
        taskTitle: '[Beta IA] Consolidar módulos e features ativos',
      });
    }

    if (priorities.length === 0) {
      priorities.push({
        id: 'automation-next-step',
        title: 'Preparar automação avançada',
        description: 'A operação está estável. Próximo passo: automações persistentes e integrações reais.',
        priority: 'média',
        source: 'automation',
        targetTab: 'beta_brain',
        taskTitle: '[Beta IA] Preparar automações persistentes',
      });
    }

    return priorities.slice(0, 10);
  }
}
