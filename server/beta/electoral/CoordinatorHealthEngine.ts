import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { CoordinatorResponsibilityEngine } from "./CoordinatorResponsibilityEngine";
import { CoordinatorHierarchyEngine } from "./CoordinatorHierarchyEngine";
import { Coordinator, ElectoralDomainEngine } from "./ElectoralDomainEngine";

export type HealthStatus = 'NO_DATA' | 'PARTIAL_DATA' | 'READY';

export interface CoordinatorHealthReport {
  coordinator: Coordinator;
  healthStatus: HealthStatus;
  score: number; // 0 to 100
  indicators: {
    pendingTasksCount: number;
    blockedTasksCount: number;
    overdueObjectivesCount: number;
    uncoveredSubTerritoriesCount: number;
  };
  details: string[];
}

export class CoordinatorHealthEngine {
  private respEngine: CoordinatorResponsibilityEngine;

  constructor(
    private dbAdapter: DatabaseAdapter,
    private hierarchyEngine: CoordinatorHierarchyEngine,
    respEngine?: CoordinatorResponsibilityEngine
  ) {
    // If responsibility engine is not supplied, we lazily construct it with domainEngine from hierarchyEngine
    const domain = respEngine ? (respEngine as any).domainEngine : (hierarchyEngine as any).domainEngine;
    this.respEngine = respEngine || new CoordinatorResponsibilityEngine(dbAdapter, domain);
  }

  /**
   * Generates a structural health, readiness, and blockage assessment for a coordinator.
   */
  public async getCoordinatorHealth(organizationId: string, coordinatorId: string): Promise<CoordinatorHealthReport> {
    const resp = await this.respEngine.getResponsibilities(organizationId, coordinatorId);
    
    // 1. Task calculations
    const tasks = resp.tasks;
    const pendingTasks = tasks.filter(t => t.status === "PENDING" || t.status === "TODO");
    const blockedTasks = tasks.filter(t => t.status === "BLOCKED");

    // 2. Goal calculations
    const objectives = resp.objectives;
    const now = new Date();
    const overdueObjectives = objectives.filter(o => {
      const isNotDone = o.status !== "COMPLETED" && o.status !== "DONE";
      const isPastDue = o.endDate && new Date(o.endDate).getTime() < now.getTime();
      return isNotDone && isPastDue;
    });

    // 3. Subordinate mapping & Vacant assignments
    const subordinates = await this.hierarchyEngine.getSubordinates(organizationId, coordinatorId);
    const vacantSubordinates = subordinates.filter(sub => !sub.territoryId && !sub.assignedTerritory);

    const pendingTasksCount = pendingTasks.length;
    const blockedTasksCount = blockedTasks.length;
    const overdueObjectivesCount = overdueObjectives.length;
    const uncoveredSubTerritoriesCount = vacantSubordinates.length;

    const totalMetrics = tasks.length + objectives.length + subordinates.length;

    let healthStatus: HealthStatus = 'READY';
    let score = 100;
    const details: string[] = [];

    if (totalMetrics === 0) {
      healthStatus = 'NO_DATA';
      score = 0;
      details.push("Sem tarefas, objetivos ou subordinados vinculados para cálculo de status.");
    } else {
      // Calculate dynamic risk cost score
      // -15 per blocked task
      // -20 per overdue objective
      // -10 per vacant coordinator subordinate
      // -5 per pending task
      score = 100 - (blockedTasksCount * 15) - (overdueObjectivesCount * 20) - (uncoveredSubTerritoriesCount * 10) - (pendingTasksCount * 5);
      if (score < 0) score = 0;

      if (blockedTasksCount > 0) {
        details.push(`Possui ${blockedTasksCount} tarefa(s) bloqueada(s).`);
      }
      if (overdueObjectivesCount > 0) {
        details.push(`Possui ${overdueObjectivesCount} objetivo(s) com prazo vencido.`);
      }
      if (uncoveredSubTerritoriesCount > 0) {
        details.push(`Possui ${uncoveredSubTerritoriesCount} coordenador(es) subordinado(s) sem território designado sob sua supervisão.`);
      }
      if (pendingTasksCount > 0) {
        details.push(`Possui ${pendingTasksCount} tarefa(s) pendente(s).`);
      }

      if (score < 100) {
        healthStatus = 'PARTIAL_DATA';
      }
      if (score === 100) {
        details.push("Operação em perfeito estado. Sem pendências registradas.");
      }
    }

    return {
      coordinator: resp.coordinator,
      healthStatus,
      score,
      indicators: {
        pendingTasksCount,
        blockedTasksCount,
        overdueObjectivesCount,
        uncoveredSubTerritoriesCount
      },
      details
    };
  }
}
