import type { Project, Task } from '../../types';
import type {
  ReleaseAction,
  ReleaseCandidateInsight,
  ReleaseGate,
  ReleaseGovernanceInput,
  ReleaseGovernanceSummary,
  ReleaseRisk,
} from './ReleaseGovernanceTypes';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const riskFromScore = (score: number): ReleaseRisk => score >= 75 ? 'saudavel' : score >= 55 ? 'atencao' : 'critico';
const isOverdue = (task: Task) => task.status !== 'completed' && Boolean(task.dueDate) && new Date(task.dueDate as string).getTime() < Date.now();

export class ReleaseGovernanceService {
  static buildSummary(input: ReleaseGovernanceInput): ReleaseGovernanceSummary {
    const gates: ReleaseGate[] = [
      this.gate('production', 'Prontidão de produção', input.productionScore, 'Build, operação e capacidade de publicação.'),
      this.gate('persistence', 'Persistência', input.persistenceScore, 'Confiabilidade da gravação e recuperação de dados.'),
      this.gate('observability', 'Observabilidade', input.observabilityScore, 'Monitoramento, rastreabilidade e diagnóstico.'),
      this.gate('access', 'Controle de acesso', input.accessControlScore, 'Permissões, isolamento e segurança operacional.'),
      this.gate('session', 'Sessões e autenticação', input.sessionScore, 'Continuidade, validade e proteção das sessões.'),
    ];

    const candidates = input.projects
      .map((project) => this.buildCandidate(project, input))
      .sort((a, b) => b.score - a.score);

    const openTasks = input.tasks.filter((task) => task.status !== 'completed').length;
    const overdueTasks = input.tasks.filter(isOverdue).length;
    const gateAverage = gates.reduce((sum, gate) => sum + gate.score, 0) / Math.max(gates.length, 1);
    const candidateAverage = candidates.length > 0
      ? candidates.reduce((sum, candidate) => sum + candidate.score, 0) / candidates.length
      : 60;
    const score = clamp(gateAverage * 0.65 + candidateAverage * 0.35);

    return {
      score,
      status: riskFromScore(score),
      gates,
      candidates,
      actions: this.buildActions(gates, candidates, overdueTasks),
      readyProjects: candidates.filter((candidate) => candidate.status === 'saudavel').length,
      blockedProjects: candidates.filter((candidate) => candidate.status === 'critico').length,
      openTasks,
      overdueTasks,
    };
  }

  private static gate(id: string, label: string, score: number, description: string): ReleaseGate {
    const normalized = clamp(score);
    return { id, label, score: normalized, status: riskFromScore(normalized), description };
  }

  private static buildCandidate(project: Project, input: ReleaseGovernanceInput): ReleaseCandidateInsight {
    const tasks = input.tasks.filter((task) => task.projectId === project.id);
    const decisions = input.decisions.filter((decision) => decision.projectId === project.id).length;
    const openTasks = tasks.filter((task) => task.status !== 'completed');
    const criticalTasks = openTasks.filter((task) => task.priority === 'crítica').length;
    const overdueTasks = openTasks.filter(isOverdue).length;
    const completion = tasks.length > 0 ? ((tasks.length - openTasks.length) / tasks.length) * 100 : 70;
    const governanceBonus = Math.min(decisions * 3, 12);
    const score = clamp(completion + governanceBonus - criticalTasks * 12 - overdueTasks * 8 + (project.status === 'completed' ? 15 : 0));
    const status = riskFromScore(score);

    const recommendation = status === 'saudavel'
      ? 'Candidato apto para homologação e publicação controlada.'
      : status === 'atencao'
        ? 'Resolver pendências prioritárias antes da próxima janela de release.'
        : 'Release bloqueada até eliminar tarefas críticas e atrasos.';

    return {
      id: `release-${project.id}`,
      projectId: project.id,
      projectName: project.name,
      score,
      status,
      openTasks: openTasks.length,
      criticalTasks,
      overdueTasks,
      decisions,
      recommendation,
    };
  }

  private static buildActions(gates: ReleaseGate[], candidates: ReleaseCandidateInsight[], overdueTasks: number): ReleaseAction[] {
    const actions: ReleaseAction[] = [];
    gates.filter((gate) => gate.status !== 'saudavel').slice(0, 3).forEach((gate) => {
      actions.push({
        id: `gate-${gate.id}`,
        title: `Recuperar gate: ${gate.label}`,
        description: `${gate.description} Pontuação atual: ${gate.score}%.`,
        priority: gate.status === 'critico' ? 'alta' : 'media',
        taskTitle: `[Release] Recuperar gate ${gate.label}`,
      });
    });

    candidates.filter((candidate) => candidate.status === 'critico').slice(0, 3).forEach((candidate) => {
      actions.push({
        id: `candidate-${candidate.projectId}`,
        title: `Desbloquear ${candidate.projectName}`,
        description: `${candidate.criticalTasks} tarefa(s) crítica(s) e ${candidate.overdueTasks} atraso(s) impedem a release.`,
        priority: 'alta',
        taskTitle: `[Release] Desbloquear ${candidate.projectName}`,
      });
    });

    if (overdueTasks > 0) {
      actions.push({
        id: 'release-overdue-tasks',
        title: 'Zerar atrasos da janela de release',
        description: `${overdueTasks} tarefa(s) vencida(s) exigem replanejamento ou conclusão.`,
        priority: 'alta',
        taskTitle: '[Release] Zerar tarefas vencidas da janela atual',
      });
    }

    return actions.slice(0, 6);
  }
}
