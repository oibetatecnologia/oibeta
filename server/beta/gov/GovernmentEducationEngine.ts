import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentEducationUnit,
  GovernmentEducationTeam,
  GovernmentEducationProgram,
  GovernmentEducationIndicator,
  GovernmentEducationCoverage,
  GovernmentEducationProduction,
  GovernmentEducationSummary,
  GovernmentEducationStatus
} from "../core/types";

export class GovernmentEducationEngine {
  private dbAdapter: DatabaseAdapter;
  private kgEngine: KnowledgeGraphEngine;
  private memoryOS: MemoryOS;

  constructor(
    dbAdapter: DatabaseAdapter,
    kgEngine: KnowledgeGraphEngine,
    memoryOS: MemoryOS
  ) {
    this.dbAdapter = dbAdapter;
    this.kgEngine = kgEngine;
    this.memoryOS = memoryOS;
  }

  private validateTenant(organizationId: string, workspaceId: string) {
    if (!organizationId) throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!workspaceId) throw new Error("Validation Error: workspaceId is mandatory.");
  }

  public async getEducationUnits(organizationId: string, workspaceId: string): Promise<GovernmentEducationUnit[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationUnits(organizationId, workspaceId);
  }

  public async createEducationUnit(data: any): Promise<GovernmentEducationUnit> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const unit = await this.dbAdapter.createEducationUnit(data);
    
    // Knowledge Graph integration logic
    if (data.workspaceId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: unit.id as string,
         type: "GovernmentEducationUnit",
         name: data.name || "Education Unit",
         properties: { ...unit }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.workspaceId, unit.id as string, "HAS_EDUCATION_UNIT");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: unit.id as string,
        entityType: "GovernmentEducationUnit",
        eventType: "GovernmentEducationUnitCreated",
        */

    return unit;
  }

  public async getEducationTeams(organizationId: string, workspaceId: string): Promise<GovernmentEducationTeam[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationTeams(organizationId, workspaceId);
  }

  public async createEducationTeam(data: any): Promise<GovernmentEducationTeam> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const team = await this.dbAdapter.createEducationTeam(data);
    
    // Knowledge Graph integration logic
    if (data.unitId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: team.id as string,
         type: "GovernmentEducationTeam",
         name: data.name || "Education Team",
         properties: { ...team }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.unitId, team.id as string, "HAS_TEAM");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: team.id as string,
        entityType: "GovernmentEducationTeam",
        eventType: "GovernmentEducationTeamCreated",
        */

    return team;
  }

  public async getEducationPrograms(organizationId: string, workspaceId: string): Promise<GovernmentEducationProgram[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationPrograms(organizationId, workspaceId);
  }

  public async createEducationProgram(data: any): Promise<GovernmentEducationProgram> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const program = await this.dbAdapter.createEducationProgram(data);
    
    // Knowledge Graph integration logic
    if (data.workspaceId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: program.id as string,
         type: "GovernmentEducationProgram",
         name: data.name || "Education Program",
         properties: { ...program }
       });
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: program.id as string,
        entityType: "GovernmentEducationProgram",
        eventType: "GovernmentEducationProgramCreated",
        */

    return program;
  }

  public async getEducationIndicators(organizationId: string, workspaceId: string): Promise<GovernmentEducationIndicator[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationIndicators(organizationId, workspaceId);
  }

  public async createEducationIndicator(data: any): Promise<GovernmentEducationIndicator> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const indicator = await this.dbAdapter.createEducationIndicator(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: indicator.id as string,
         type: "GovernmentEducationIndicator",
         name: data.name || "Education Indicator",
         properties: { ...indicator }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, indicator.id as string, "HAS_INDICATOR");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: indicator.id as string,
        entityType: "GovernmentEducationIndicator",
        eventType: "GovernmentEducationIndicatorCreated",
        */

    return indicator;
  }

  public async getEducationCoverages(organizationId: string, workspaceId: string): Promise<GovernmentEducationCoverage[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationCoverages(organizationId, workspaceId);
  }

  public async createEducationCoverage(data: any): Promise<GovernmentEducationCoverage> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const coverage = await this.dbAdapter.createEducationCoverage(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: coverage.id as string,
         type: "GovernmentEducationCoverage",
         name: data.name || "Education Coverage",
         properties: { ...coverage }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, coverage.id as string, "HAS_COVERAGE");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: coverage.id as string,
        entityType: "GovernmentEducationCoverage",
        eventType: "GovernmentEducationCoverageCreated",
        */

    return coverage;
  }

  public async getEducationProductions(organizationId: string, workspaceId: string): Promise<GovernmentEducationProduction[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationProductions(organizationId, workspaceId);
  }

  public async createEducationProduction(data: any): Promise<GovernmentEducationProduction> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const production = await this.dbAdapter.createEducationProduction(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: production.id as string,
         type: "GovernmentEducationProduction",
         name: data.name || "Education Production",
         properties: { ...production }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, production.id as string, "HAS_PRODUCTION");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: production.id as string,
        entityType: "GovernmentEducationProduction",
        eventType: "GovernmentEducationProductionCreated",
        */

    return production;
  }

  public async getEducationSummary(organizationId: string, workspaceId: string): Promise<GovernmentEducationSummary> {
    this.validateTenant(organizationId, workspaceId);
    
    const units = await this.getEducationUnits(organizationId, workspaceId);
    const teams = await this.getEducationTeams(organizationId, workspaceId);
    const programs = await this.getEducationPrograms(organizationId, workspaceId);
    const indicators = await this.getEducationIndicators(organizationId, workspaceId);
    const coverages = await this.getEducationCoverages(organizationId, workspaceId);
    const productions = await this.getEducationProductions(organizationId, workspaceId);

    const hasData = units.length > 0 || programs.length > 0;

    return {
      status: hasData ? "READY" : "NO_DATA",
      workspaceId,
      unitsCount: units.length,
      teamsCount: teams.length,
      programsCount: programs.length,
      indicatorsCount: indicators.length,
      coveragesCount: coverages.length,
      productionsCount: productions.length,
      updatedAt: new Date().toISOString()
    };
  }

  public async getEducationStatus(organizationId: string, workspaceId: string): Promise<GovernmentEducationStatus> {
    this.validateTenant(organizationId, workspaceId);
    
    const units = await this.getEducationUnits(organizationId, workspaceId);
    const programs = await this.getEducationPrograms(organizationId, workspaceId);
    const productions = await this.getEducationProductions(organizationId, workspaceId);
    
    let dbStatus: GovernmentEducationStatus["status"] = "NO_DATA";
    if (units.length > 0 || programs.length > 0) dbStatus = "PARTIAL_DATA";
    if (units.length > 0 && programs.length > 0 && productions.length > 0) dbStatus = "READY";
    
    const status: GovernmentEducationStatus = {
      status: dbStatus,
      educationScore: units.length > 0 ? 80 : 0,
      metrics: {
        unitsActiveRate: units.length > 0 ? (units.filter((u: any) => u.status === "ACTIVE").length / units.length) * 100 : 0,
        programsActiveRate: programs.length > 0 ? (programs.filter((p: any) => p.status === "ACTIVE").length / programs.length) * 100 : 0,
        productionsCompletedRate: productions.length > 0 ? (productions.filter((p: any) => p.status === "COMPLETED").length / productions.length) * 100 : 0,
      }
    };

    await this.memoryOS.registerEvent({ organizationId, workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: workspaceId,
        entityType: "GovernmentEducationStatus",
        eventType: "GovernmentEducationStatusComputed",
        */

    return status;
  }
}
