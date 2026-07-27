import { CampaignProgress } from "./CampaignProgressEngine";

export type HealthStatus = 'NO_DATA' | 'PARTIAL_DATA' | 'READY';

export interface CampaignHealth {
  healthScore: number;
  riskScore: number;
  dataStatus: HealthStatus;
  message: string;
  reasons: string[];
}

export class CampaignHealthEngine {
  public calculateHealth(
    coordinatorsCount: number,
    progress: CampaignProgress
  ): CampaignHealth {
    const { totalObjectives, completedObjectives, totalTasks, blockedTasks, totalTerritories, assignedTerritoriesCount } = progress.metrics;

    let score = 100;
    const reasons: string[] = [];

    // Check if there is NO_DATA
    if (totalObjectives === 0 && totalTasks === 0 && coordinatorsCount === 0) {
      return {
        healthScore: 0,
        riskScore: 100,
        dataStatus: 'NO_DATA',
        message: "Ainda não há dados operacionais suficientes cadastrados na campanha para consolidar um cálculo de saúde.",
        reasons: ["Falta de massa crítica de dados (sem objetivos, tarefas ou coordenadores)."]
      };
    }

    // Determine status: READY or PARTIAL_DATA
    let dataStatus: HealthStatus = 'READY';
    if (totalObjectives === 0 || totalTasks === 0 || coordinatorsCount === 0) {
      dataStatus = 'PARTIAL_DATA';
    }

    // Deductions
    if (totalObjectives === 0) {
      score -= 20;
      reasons.push("Nenhum objetivo estratégico foi cadastrado para a campanha.");
    }

    if (totalTasks === 0) {
      score -= 20;
      reasons.push("Nenhuma tarefa operacional foi criada para monitorar o andamento.");
    }

    if (coordinatorsCount === 0) {
      score -= 25;
      reasons.push("Ausência de coordenadores operacionais vinculados à campanha.");
    }

    if (blockedTasks > 0) {
      const deduction = Math.min(blockedTasks * 15, 45);
      score -= deduction;
      reasons.push(`A campanha possui ${blockedTasks} tarefa(s) em estado de bloqueio.`);
    }

    const unassignedTerritories = totalTerritories - assignedTerritoriesCount;
    if (unassignedTerritories > 0) {
      const deduction = Math.min(unassignedTerritories * 10, 30);
      score -= deduction;
      reasons.push(`Existem ${unassignedTerritories} território(s) mapeado(s) sem coordenador responsável.`);
    }

    // Adjust boundaries
    score = Math.max(0, Math.min(100, score));
    const riskScore = 100 - score;

    // Build the non-absolute greeting context messages
    let message = "";
    if (dataStatus === 'PARTIAL_DATA') {
      message = "Análise parcial baseada nos dados eleitorais atualmente carregados na campanha.";
    } else if (score < 60) {
      message = "Atenção necessária: identificados pontos de atrito ou gargalos de cobertura e tarefas bloqueadas.";
    } else if (score >= 60 && score < 95) {
      message = "Gargalos moderados identificados na distribuição de responsabilidades e metas.";
    } else {
      message = "Com os dados atualmente carregados, nenhum problema crítico de governança operacional foi identificado.";
    }

    return {
      healthScore: score,
      riskScore,
      dataStatus,
      message,
      reasons
    };
  }
}
