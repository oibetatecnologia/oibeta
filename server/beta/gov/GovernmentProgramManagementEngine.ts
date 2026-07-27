import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import {
  GovernmentObjective,
  GovernmentProgram,
  GovernmentProject,
  GovernmentAction,
  GovernmentProgramSummary,
  GovernmentProgramHealth,
  GovernmentProgramStatus,
  GovernmentProjectStatus,
  GovernmentActionStatus
} from "../core/types";
import { GovernmentWorkspaceEngine } from "./GovernmentWorkspaceEngine";
import { GovernmentProgramEngine } from "./GovernmentProgramEngine";
import { GovernmentIndicatorEngine } from "./GovernmentIndicatorEngine";
import { GovernmentRiskEngine } from "./GovernmentRiskEngine";

export class GovernmentProgramManagementEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private memoryOS: MemoryOS,
    private wsOrchestrator: WorkspaceIntelligenceOrchestrator | undefined,
    private govWorkspaceEngine: GovernmentWorkspaceEngine,
    private govProgramEngine: GovernmentProgramEngine,
    private govIndicatorEngine: GovernmentIndicatorEngine,
    private govRiskEngine: GovernmentRiskEngine
  ) {}

  public async createGovernmentObjective(
    organizationId: string,
    workspaceId: string,
    name: string,
    description: string,
    status: string,
    metadata?: any
  ): Promise<GovernmentObjective> {
    const objective = await this.dbAdapter.createGovernmentObjective({
      organizationId,
      workspaceId,
      name,
      description,
      status,
      metadata: metadata || {}
    });

    await this.kgEngine.createNode(objective.id, "GovernmentObjective", {
      organizationId,
      workspaceId,
      name,
      status
    });
    
    await this.kgEngine.createEdge(workspaceId, objective.id, "HAS_GOVERNMENT_OBJECTIVE");

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentObjectiveCreated",
      content: `Government Objective created: ${name}`,
      metadata: { objectiveId: objective.id, status }
    });

    return objective;
  }

  public async getGovernmentObjectives(organizationId: string, workspaceId: string): Promise<GovernmentObjective[]> {
    return this.dbAdapter.getGovernmentObjectives(organizationId, workspaceId);
  }

  public async createGovernmentProgram(
    organizationId: string,
    workspaceId: string,
    objectiveId: string,
    name: string,
    description: string,
    status: GovernmentProgramStatus,
    metadata?: any
  ): Promise<GovernmentProgram> {
    const program = await this.dbAdapter.createGovernmentProgram({
      organizationId,
      workspaceId,
      objectiveId,
      name,
      description,
      status,
      metadata: metadata || {}
    });

    await this.kgEngine.createNode(program.id, "GovernmentProgram", {
      organizationId,
      workspaceId,
      name,
      status
    });

    await this.kgEngine.createEdge(objectiveId, program.id, "HAS_PROGRAM");

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentProgramCreated",
      content: `Government Program created: ${name}`,
      metadata: { programId: program.id, objectiveId, status }
    });

    return program;
  }

  public async getGovernmentPrograms(organizationId: string, workspaceId: string): Promise<GovernmentProgram[]> {
    return this.dbAdapter.getGovernmentPrograms(organizationId, workspaceId);
  }

  public async createGovernmentProject(
    organizationId: string,
    workspaceId: string,
    programId: string,
    name: string,
    description: string,
    status: GovernmentProjectStatus,
    metadata?: any
  ): Promise<GovernmentProject> {
    const project = await this.dbAdapter.createGovernmentProject({
      organizationId,
      workspaceId,
      programId,
      name,
      description,
      status,
      metadata: metadata || {}
    });

    await this.kgEngine.createNode(project.id, "GovernmentProject", {
      organizationId,
      workspaceId,
      name,
      status
    });

    await this.kgEngine.createEdge(programId, project.id, "HAS_PROJECT");

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentProjectCreated",
      content: `Government Project created: ${name}`,
      metadata: { projectId: project.id, programId, status }
    });

    return project;
  }

  public async getGovernmentProjects(organizationId: string, workspaceId: string): Promise<GovernmentProject[]> {
    return this.dbAdapter.getGovernmentProjects(organizationId, workspaceId);
  }

  public async createGovernmentAction(
    organizationId: string,
    workspaceId: string,
    projectId: string,
    name: string,
    description: string,
    status: GovernmentActionStatus,
    metadata?: any
  ): Promise<GovernmentAction> {
    const action = await this.dbAdapter.createGovernmentAction({
      organizationId,
      workspaceId,
      projectId,
      name,
      description,
      status,
      metadata: metadata || {}
    });

    await this.kgEngine.createNode(action.id, "GovernmentAction", {
      organizationId,
      workspaceId,
      name,
      status
    });

    await this.kgEngine.createEdge(projectId, action.id, "HAS_ACTION");

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentActionCreated",
      content: `Government Action created: ${name}`,
      metadata: { actionId: action.id, projectId, status }
    });

    return action;
  }

  public async getGovernmentActions(organizationId: string, workspaceId: string): Promise<GovernmentAction[]> {
    return this.dbAdapter.getGovernmentActions(organizationId, workspaceId);
  }

  public async getGovernmentProgramSummary(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentProgramSummary> {
    const objectives = await this.getGovernmentObjectives(organizationId, workspaceId);
    const programs = await this.getGovernmentPrograms(organizationId, workspaceId);
    const projects = await this.getGovernmentProjects(organizationId, workspaceId);
    const actions = await this.getGovernmentActions(organizationId, workspaceId);

    const hasData = objectives.length > 0 || programs.length > 0 || projects.length > 0 || actions.length > 0;
    
    return {
      status: hasData ? "READY" : "NO_DATA",
      summary: {
        objectivesCount: objectives.length,
        programsCount: programs.length,
        projectsCount: projects.length,
        actionsCount: actions.length,
        objectives,
        programs,
        projects,
        actions
      }
    };
  }

  public async getGovernmentProgramHealth(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentProgramHealth> {
    const programs = await this.getGovernmentPrograms(organizationId, workspaceId);
    
    if (programs.length === 0) {
      return {
        status: "NO_DATA",
        health: {
          score: 0,
          details: "No programs available."
        }
      };
    }

    const activePrograms = programs.filter(p => p.status === "ACTIVE" || p.status === "PLANNED");
    const issues = programs.filter(p => p.status === "SUSPENDED" || p.status === "CANCELLED");

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (programs.length < 5) {
      status = "PARTIAL_DATA";
    }

    const health = {
      score: activePrograms.length > 0 ? Math.round((activePrograms.length / programs.length) * 100) : 0,
      totalPrograms: programs.length,
      activePrograms: activePrograms.length,
      criticalIssues: issues.length
    };

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "GovernmentProgramHealthComputed",
      content: `Program health computed. Score: ${health.score}`,
      metadata: { health }
    });

    return {
      status,
      health
    };
  }
}
