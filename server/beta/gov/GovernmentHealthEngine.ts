import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentHealthUnit,
  GovernmentHealthTeam,
  GovernmentHealthProgram,
  GovernmentHealthIndicator,
  GovernmentHealthCoverage,
  GovernmentHealthProduction,
  GovernmentHealthSummary,
  GovernmentHealthStatus
} from "../core/types";
import crypto from "crypto";

export class GovernmentHealthEngine {
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
    if (!organizationId || !workspaceId) {
      throw new Error("Missing organizationId or workspaceId for multi-tenant context.");
    }
  }

  public async createHealthUnit(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status?: string;
    metadata?: any;
  }): Promise<GovernmentHealthUnit> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const unit = await this.dbAdapter.createHealthUnit({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status || "NO_DATA",
      metadata: data.metadata || {}
    });

    const unitNodeId = `health-unit-${unit.id}`;
    if (this.kgEngine) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentHealthUnit",
        `Unidade de Saúde ${unit.id}`,
        `Unidade com status ${unit.status}`,
        unitNodeId,
        unit.status
      );

      await this.kgEngine.createRelationship(data.organizationId, data.workspaceId, unitNodeId, "HAS_HEALTH_UNIT");
    }

    if (this.memoryOS) {
      await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        entityType: "GovernmentHealthUnit",
        entityId: unit.id,
        eventType: "GovernmentHealthUnitCreated",
        eventData: unit
      });
    }

    return unit as GovernmentHealthUnit;
  }

  public async getHealthUnits(organizationId: string, workspaceId: string): Promise<GovernmentHealthUnit[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getHealthUnits(organizationId, workspaceId);
    return result as GovernmentHealthUnit[];
  }

  public async createHealthTeam(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    unitId: string;
    status?: string;
    metadata?: any;
  }): Promise<GovernmentHealthTeam> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const team = await this.dbAdapter.createHealthTeam({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      unitId: data.unitId,
      status: data.status || "NO_DATA",
      metadata: data.metadata || {}
    });

    const teamNodeId = `health-team-${team.id}`;
    const unitNodeId = `health-unit-${team.unitId}`;
    if (this.kgEngine) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentHealthTeam",
        `Equipe de Saúde ${team.id}`,
        `Equipe com status ${team.status}`,
        teamNodeId,
        team.status
      );

      await this.kgEngine.createRelationship(data.organizationId, unitNodeId, teamNodeId, "HAS_TEAM");
    }

    if (this.memoryOS) {
      await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        entityType: "GovernmentHealthTeam",
        entityId: team.id,
        eventType: "GovernmentHealthTeamCreated",
        eventData: team
      });
    }

    return team as GovernmentHealthTeam;
  }

  public async getHealthTeams(organizationId: string, workspaceId: string): Promise<GovernmentHealthTeam[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getHealthTeams(organizationId, workspaceId);
    return result as GovernmentHealthTeam[];
  }

  public async createHealthProgram(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status?: string;
    metadata?: any;
  }): Promise<GovernmentHealthProgram> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const program = await this.dbAdapter.createHealthProgram({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status || "NO_DATA",
      metadata: data.metadata || {}
    });

    const programNodeId = `health-prog-${program.id}`;
    if (this.kgEngine) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentHealthProgram",
        `Programa de Saúde ${program.id}`,
        `Programa com status ${program.status}`,
        programNodeId,
        program.status
      );
    }

    if (this.memoryOS) {
      await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        entityType: "GovernmentHealthProgram",
        entityId: program.id,
        eventType: "GovernmentHealthProgramCreated",
        eventData: program
      });
    }

    return program as GovernmentHealthProgram;
  }

  public async getHealthPrograms(organizationId: string, workspaceId: string): Promise<GovernmentHealthProgram[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getHealthPrograms(organizationId, workspaceId);
    return result as GovernmentHealthProgram[];
  }

  public async createHealthIndicator(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status?: string;
    metadata?: any;
  }): Promise<GovernmentHealthIndicator> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const indicator = await this.dbAdapter.createHealthIndicator({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status || "NO_DATA",
      metadata: data.metadata || {}
    });

    const indicatorNodeId = `health-ind-${indicator.id}`;
    if (this.kgEngine) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentHealthIndicator",
        `Indicador de Saúde ${indicator.id}`,
        `Indicador com status ${indicator.status}`,
        indicatorNodeId,
        indicator.status
      );

      // Example relation: if metadata specifies a programId, we could relation it there
      if (data.metadata?.programId) {
        await this.kgEngine.createRelationship(data.organizationId, `health-prog-${data.metadata.programId}`, indicatorNodeId, "HAS_INDICATOR");
      }
    }

    if (this.memoryOS) {
      await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        entityType: "GovernmentHealthIndicator",
        entityId: indicator.id,
        eventType: "GovernmentHealthIndicatorCreated",
        eventData: indicator
      });
    }

    return indicator as GovernmentHealthIndicator;
  }

  public async getHealthIndicators(organizationId: string, workspaceId: string): Promise<GovernmentHealthIndicator[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getHealthIndicators(organizationId, workspaceId);
    return result as GovernmentHealthIndicator[];
  }

  public async createHealthCoverage(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status?: string;
    metadata?: any;
  }): Promise<GovernmentHealthCoverage> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const coverage = await this.dbAdapter.createHealthCoverage({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status || "NO_DATA",
      metadata: data.metadata || {}
    });

    const coverageNodeId = `health-cov-${coverage.id}`;
    if (this.kgEngine) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentHealthCoverage",
        `Cobertura de Saúde ${coverage.id}`,
        `Cobertura com status ${coverage.status}`,
        coverageNodeId,
        coverage.status
      );

      if (data.metadata?.programId) {
        await this.kgEngine.createRelationship(data.organizationId, `health-prog-${data.metadata.programId}`, coverageNodeId, "HAS_COVERAGE");
      }
    }

    if (this.memoryOS) {
      await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        entityType: "GovernmentHealthCoverage",
        entityId: coverage.id,
        eventType: "GovernmentHealthCoverageCreated",
        eventData: coverage
      });
    }

    return coverage as GovernmentHealthCoverage;
  }

  public async getHealthCoverages(organizationId: string, workspaceId: string): Promise<GovernmentHealthCoverage[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getHealthCoverages(organizationId, workspaceId);
    return result as GovernmentHealthCoverage[];
  }

  public async createHealthProduction(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status?: string;
    metadata?: any;
  }): Promise<GovernmentHealthProduction> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const production = await this.dbAdapter.createHealthProduction({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status || "NO_DATA",
      metadata: data.metadata || {}
    });

    const productionNodeId = `health-prod-${production.id}`;
    if (this.kgEngine) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentHealthProduction",
        `Produção de Saúde ${production.id}`,
        `Produção com status ${production.status}`,
        productionNodeId,
        production.status
      );

      if (data.metadata?.programId) {
        await this.kgEngine.createRelationship(data.organizationId, `health-prog-${data.metadata.programId}`, productionNodeId, "HAS_PRODUCTION");
      }
    }

    if (this.memoryOS) {
      await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        entityType: "GovernmentHealthProduction",
        entityId: production.id,
        eventType: "GovernmentHealthProductionCreated",
        eventData: production
      });
    }

    return production as GovernmentHealthProduction;
  }

  public async getHealthProductions(organizationId: string, workspaceId: string): Promise<GovernmentHealthProduction[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getHealthProductions(organizationId, workspaceId);
    return result as GovernmentHealthProduction[];
  }

  public async getHealthSummary(organizationId: string, workspaceId: string): Promise<GovernmentHealthSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [units, teams, programs, indicators, coverages, productions] = await Promise.all([
      this.getHealthUnits(organizationId, workspaceId),
      this.getHealthTeams(organizationId, workspaceId),
      this.getHealthPrograms(organizationId, workspaceId),
      this.getHealthIndicators(organizationId, workspaceId),
      this.getHealthCoverages(organizationId, workspaceId),
      this.getHealthProductions(organizationId, workspaceId)
    ]);

    const hasAnyData = units.length > 0 || teams.length > 0 || programs.length > 0;
    const status = hasAnyData ? "READY" : "NO_DATA";

    return {
      status,
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

  public async getHealthStatus(organizationId: string, workspaceId: string): Promise<GovernmentHealthStatus> {
    this.validateTenant(organizationId, workspaceId);

    const [units, teams, programs, indicators, coverages, productions] = await Promise.all([
      this.getHealthUnits(organizationId, workspaceId),
      this.getHealthTeams(organizationId, workspaceId),
      this.getHealthPrograms(organizationId, workspaceId),
      this.getHealthIndicators(organizationId, workspaceId),
      this.getHealthCoverages(organizationId, workspaceId),
      this.getHealthProductions(organizationId, workspaceId)
    ]);

    const activeUnits = units.filter(u => u.status === "ACTIVE").length;
    const activeUnitsRate = units.length > 0 ? (activeUnits / units.length) * 100 : 0;

    const activeTeams = teams.filter(t => t.status === "ACTIVE").length;
    const activeTeamsRate = teams.length > 0 ? (activeTeams / teams.length) * 100 : 0;

    const activePrograms = programs.filter(p => p.status === "ACTIVE").length;
    const activeProgramsRate = programs.length > 0 ? (activePrograms / programs.length) * 100 : 0;

    let healthScore = 0;
    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";

    if (units.length > 0 || teams.length > 0 || programs.length > 0) {
      status = "PARTIAL_DATA";
      healthScore = Math.round((activeUnitsRate + activeTeamsRate + activeProgramsRate) / 3);
      if (healthScore > 50) {
        status = "READY";
      }
    }

    const healthStatus: GovernmentHealthStatus = {
      status,
      healthScore,
      metrics: {
        activeUnitsRate,
        activeTeamsRate,
        activeProgramsRate,
        indicatorsTrackedRate: indicators.length > 0 ? 100 : 0,
        coveragesActiveRate: coverages.length > 0 ? 100 : 0,
        productionsTrackedRate: productions.length > 0 ? 100 : 0
      }
    };

    if (this.memoryOS) {
      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        entityType: "GovernmentHealthStatus",
        entityId: `${organizationId}-${workspaceId}`,
        eventType: "GovernmentHealthStatusComputed",
        eventData: healthStatus
      });
    }

    return healthStatus;
  }

  public calculateHealth(
    risks: any,
    indicators: any[],
    contracts: any[],
    programs: any[],
    documents: any[],
    dataStatus: string
  ): any {
    if (dataStatus === "NO_DATA") {
      return {
        score: 0,
        partial: true,
        message: "Insufficient data to compute health score.",
        breakdown: {
          completeness: 0,
          competition: 0,
          supplierVariety: 0,
          riskMitigation: 0
        }
      };
    }

    const completeness = programs.length > 0 && indicators.length > 0 ? 100 : (programs.length > 0 || indicators.length > 0 ? 50 : 0);
    const competition = contracts.length > 0 ? 100 : 0;
    const supplierVariety = contracts.length > 0 ? 100 : 0;
    
    let activeRisks = 0;
    let totalRisks = 0;
    if (Array.isArray(risks)) {
      totalRisks = risks.length;
      activeRisks = risks.filter((r: any) => r.status === "ACTIVE" || r.status === "OPEN").length;
    }
    const riskMitigation = totalRisks > 0 ? Math.round(((totalRisks - activeRisks) / totalRisks) * 100) : (dataStatus !== "NO_DATA" ? 100 : 0);

    const score = Math.round((completeness + competition + supplierVariety + riskMitigation) / 4);

    return {
      score,
      partial: dataStatus !== "READY" || score < 100,
      message: "Health computed based on active program, indicator, contract, and risk mitigation records.",
      breakdown: {
         completeness,
         competition,
         supplierVariety,
         riskMitigation
      }
    };
  }
}
