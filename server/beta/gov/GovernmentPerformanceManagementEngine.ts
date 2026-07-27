import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { GovernmentWorkspaceEngine } from "./GovernmentWorkspaceEngine";
import { GovernmentProgramManagementEngine } from "./GovernmentProgramManagementEngine";
import { GovernmentIndicatorEngine } from "./GovernmentIndicatorEngine";
import { GovernmentHealthEngine } from "./GovernmentHealthEngine";
import { GovernmentRiskEngine } from "./GovernmentRiskEngine";
import {
  GovernmentIndicator,
  GovernmentGoal,
  GovernmentResult,
  GovernmentPerformance,
  GovernmentPerformanceSummary,
  GovernmentPerformanceHealth,
  GovernmentGoalStatus,
  GovernmentDataStatus
} from "../core/types";

export class GovernmentPerformanceManagementEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private memoryOS: MemoryOS,
    private wsOrchestrator: WorkspaceIntelligenceOrchestrator | undefined,
    private govWorkspaceEngine: GovernmentWorkspaceEngine,
    private govProgramManagementEngine: GovernmentProgramManagementEngine,
    private govIndicatorEngine: GovernmentIndicatorEngine,
    private govHealthEngine: GovernmentHealthEngine,
    private govRiskEngine: GovernmentRiskEngine
  ) {}

  public async createGovernmentIndicator(
    organizationId: string,
    workspaceId: string,
    objectiveId: string | null,
    programId: string | null,
    projectId: string | null,
    indicatorName: string,
    description: string,
    unit: string,
    metadata?: any
  ): Promise<GovernmentIndicator> {
    const indicator = await this.dbAdapter.createGovernmentIndicator({
      organizationId,
      workspaceId,
      objectiveId,
      programId,
      projectId,
      indicatorName,
      description,
      unit,
      metadata: metadata || {}
    });

    await this.kgEngine.createNode(indicator.id, "GovernmentIndicator", {
      organizationId,
      workspaceId,
      indicatorName,
      unit
    });

    if (objectiveId) {
      await this.kgEngine.createEdge(objectiveId, indicator.id, "HAS_INDICATOR");
    }
    if (programId) {
      await this.kgEngine.createEdge(programId, indicator.id, "HAS_INDICATOR");
    }

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentIndicatorCreated",
      content: `Government Indicator created: ${indicatorName}`,
      metadata: { indicatorId: indicator.id, objectiveId, programId, projectId }
    });

    return indicator;
  }

  public async getGovernmentIndicators(organizationId: string, workspaceId: string): Promise<GovernmentIndicator[]> {
    return this.dbAdapter.getGovernmentIndicators(organizationId, workspaceId);
  }

  public async createGovernmentGoal(
    organizationId: string,
    workspaceId: string,
    indicatorId: string,
    goalValue: number,
    currentValue: number,
    status: GovernmentGoalStatus,
    metadata?: any
  ): Promise<GovernmentGoal> {
    const goal = await this.dbAdapter.createGovernmentGoal({
      organizationId,
      workspaceId,
      indicatorId,
      goalValue,
      currentValue,
      status,
      metadata: metadata || {}
    });

    await this.kgEngine.createNode(goal.id, "GovernmentGoal", {
      organizationId,
      workspaceId,
      goalValue,
      currentValue,
      status
    });

    await this.kgEngine.createEdge(indicatorId, goal.id, "HAS_GOAL");

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentGoalCreated",
      content: `Government Goal created for indicator ${indicatorId}`,
      metadata: { goalId: goal.id, indicatorId, status }
    });

    return goal;
  }

  public async getGovernmentGoals(organizationId: string, workspaceId: string): Promise<GovernmentGoal[]> {
    return this.dbAdapter.getGovernmentGoals(organizationId, workspaceId);
  }

  public async createGovernmentResult(
    organizationId: string,
    workspaceId: string,
    indicatorId: string,
    resultValue: number,
    referenceDate: string,
    metadata?: any
  ): Promise<GovernmentResult> {
    const result = await this.dbAdapter.createGovernmentResult({
      organizationId,
      workspaceId,
      indicatorId,
      resultValue,
      referenceDate,
      metadata: metadata || {}
    });

    await this.kgEngine.createNode(result.id, "GovernmentResult", {
      organizationId,
      workspaceId,
      resultValue,
      referenceDate
    });

    await this.kgEngine.createEdge(indicatorId, result.id, "HAS_RESULT");

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentResultCreated",
      content: `Government Result of ${resultValue} registered for indicator ${indicatorId}`,
      metadata: { resultId: result.id, indicatorId, referenceDate }
    });

    return result;
  }

  public async getGovernmentResults(organizationId: string, workspaceId: string): Promise<GovernmentResult[]> {
    return this.dbAdapter.getGovernmentResults(organizationId, workspaceId);
  }

  public async getGovernmentPerformance(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentPerformance> {
    const goals = await this.getGovernmentGoals(organizationId, workspaceId);

    if (goals.length === 0) {
      return {
        id: `perf_${Date.now()}`,
        organizationId,
        workspaceId,
        status: "NO_DATA",
        score: 0,
        details: { message: "No goals configured." },
        createdAt: new Date().toISOString()
      };
    }

    let scoreSum = 0;
    let countedGoals = 0;

    for (const goal of goals) {
      if (goal.status === "ACHIEVED") {
        scoreSum += 100;
        countedGoals++;
      } else if (goal.status === "ON_TRACK") {
        scoreSum += 85;
        countedGoals++;
      } else if (goal.status === "AT_RISK") {
        scoreSum += 40;
        countedGoals++;
      } else if (goal.status === "FAILED") {
        scoreSum += 0;
        countedGoals++;
      } else if (goal.status === "NOT_STARTED") {
        scoreSum += 0;
        countedGoals++;
      }
    }

    const score = countedGoals > 0 ? Math.round(scoreSum / countedGoals) : 0;
    const status: GovernmentDataStatus = goals.length < 5 ? "PARTIAL_DATA" : "READY";

    const performance: GovernmentPerformance = {
      id: `perf_${Date.now()}`,
      organizationId,
      workspaceId,
      status,
      score,
      details: {
        totalGoals: goals.length,
        countedGoals,
        goalsStatusBreakdown: {
          ACHIEVED: goals.filter(g => g.status === "ACHIEVED").length,
          ON_TRACK: goals.filter(g => g.status === "ON_TRACK").length,
          AT_RISK: goals.filter(g => g.status === "AT_RISK").length,
          FAILED: goals.filter(g => g.status === "FAILED").length,
          NOT_STARTED: goals.filter(g => g.status === "NOT_STARTED").length,
          NO_DATA: goals.filter(g => g.status === "NO_DATA").length
        }
      },
      createdAt: new Date().toISOString()
    };

    // Save snapshot
    await this.dbAdapter.createGovernmentPerformanceSnapshot({
      organizationId,
      workspaceId,
      snapshotType: "PERFORMANCE_CALCULATION",
      snapshot: performance
    });

    await this.kgEngine.createNode(workspaceId, "GovernmentWorkspace", {
      organizationId,
      workspaceId
    }).catch(() => {}); // prevent throwing if exists

    await this.kgEngine.createNode(performance.id, "GovernmentPerformance", {
      organizationId,
      workspaceId,
      score,
      status
    });

    await this.kgEngine.createEdge(workspaceId, performance.id, "HAS_PERFORMANCE");

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentPerformanceComputed",
      content: `Government Performance computed. Score: ${score}%`,
      metadata: { performanceId: performance.id, score, status }
    });

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentPerformanceSnapshotCreated",
      content: `Government Performance snapshot created.`,
      metadata: { score, totalGoals: goals.length }
    });

    return performance;
  }

  public async getGovernmentPerformanceSummary(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentPerformanceSummary> {
    const indicators = await this.getGovernmentIndicators(organizationId, workspaceId);
    const goals = await this.getGovernmentGoals(organizationId, workspaceId);
    const results = await this.getGovernmentResults(organizationId, workspaceId);

    const hasData = indicators.length > 0 || goals.length > 0 || results.length > 0;

    return {
      status: hasData ? "READY" : "NO_DATA",
      summary: {
        indicatorsCount: indicators.length,
        goalsCount: goals.length,
        resultsCount: results.length,
        indicators,
        goals,
        results
      }
    };
  }

  public async getGovernmentPerformanceHealth(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentPerformanceHealth> {
    const perf = await this.getGovernmentPerformance(organizationId, workspaceId);

    return {
      status: perf.status,
      health: {
        score: perf.score,
        details: perf.details
      }
    };
  }
}
