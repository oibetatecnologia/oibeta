import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import { GovernmentWorkspaceEngine } from "./GovernmentWorkspaceEngine";
import { GovernmentProgramManagementEngine } from "./GovernmentProgramManagementEngine";
import { GovernmentPerformanceManagementEngine } from "./GovernmentPerformanceManagementEngine";
import { GovernmentReportingEngine } from "./GovernmentReportingEngine";
import { GovernmentGovernanceEngine } from "./GovernmentGovernanceEngine";

import {
  GovernmentParliamentarian,
  GovernmentAmendment,
  GovernmentAmendmentBeneficiary,
  GovernmentAmendmentDestination,
  GovernmentAmendmentExecution,
  GovernmentAmendmentSummary,
  GovernmentAmendmentHealth
} from "../core/types";

export class GovernmentAmendmentEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private workspaceEngine?: GovernmentWorkspaceEngine,
    private programManagementEngine?: GovernmentProgramManagementEngine,
    private performanceManagementEngine?: GovernmentPerformanceManagementEngine,
    private reportingEngine?: GovernmentReportingEngine,
    private governanceEngine?: GovernmentGovernanceEngine,
    private memoryOS?: MemoryOS,
    private orchestrator?: WorkspaceIntelligenceOrchestrator,
    private occEngine?: OperationalCommandCenterEngine
  ) {}

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) {
      throw new Error("Multi-Tenant Error: organizationId is required.");
    }
    if (!wsId) {
      throw new Error("Multi-Tenant Error: workspaceId is required.");
    }
  }

  public async createParliamentarian(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentParliamentarian> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const parliamentarian = await this.dbAdapter.createParliamentarian({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG integration
    const wsNodeId = `gws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentWorkspace",
      `Workspace de Governo (${data.workspaceId})`,
      "Workspace operacional do módulo de governo.",
      wsNodeId,
      {}
    );

    const parlNodeId = parliamentarian.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentParliamentarian",
      `Parlamentar ${parliamentarian.id}`,
      `Parlamentar registrado com status ${parliamentarian.status}`,
      parlNodeId,
      parliamentarian
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, parlNodeId, "HAS_PARLIAMENTARIAN");

    // MemoryOS event logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentParliamentarianCreated",
        `Novo parlamentar registrado: ${parliamentarian.id}`,
        { parliamentarianId: parliamentarian.id, status: parliamentarian.status }
      ).catch(() => {});
    }

    return parliamentarian;
  }

  public async createAmendment(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    parliamentarianId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendment> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const amendment = await this.dbAdapter.createAmendment({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      parliamentarianId: data.parliamentarianId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const parlNodeId = data.parliamentarianId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentParliamentarian",
      `Parlamentar ${data.parliamentarianId}`,
      `Parlamentar registrado no workspace.`,
      parlNodeId,
      {}
    );

    const amNodeId = amendment.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendment",
      `Emenda Parlamentar ${amendment.id}`,
      `Emenda registrada com status ${amendment.status}`,
      amNodeId,
      amendment
    );

    await this.kgEngine.createRelationship(data.organizationId, parlNodeId, amNodeId, "HAS_AMENDMENT");

    // MemoryOS event logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentCreated",
        `Nova emenda registrada: ${amendment.id}`,
        { amendmentId: amendment.id, status: amendment.status, parliamentarianId: amendment.parliamentarianId }
      ).catch(() => {});
    }

    return amendment;
  }

  public async createBeneficiary(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentBeneficiary> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const beneficiary = await this.dbAdapter.createBeneficiary({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      amendmentId: data.amendmentId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amNodeId = data.amendmentId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendment",
      `Emenda Parlamentar ${data.amendmentId}`,
      `Emenda registrada no workspace.`,
      amNodeId,
      {}
    );

    const benNodeId = beneficiary.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentBeneficiary",
      `Beneficiário de Emenda ${beneficiary.id}`,
      `Beneficiário registrado com status ${beneficiary.status}`,
      benNodeId,
      beneficiary
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, benNodeId, "HAS_BENEFICIARY");

    // MemoryOS event logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentBeneficiaryCreated",
        `Novo beneficiário de emenda registrado: ${beneficiary.id}`,
        { beneficiaryId: beneficiary.id, status: beneficiary.status, amendmentId: beneficiary.amendmentId }
      ).catch(() => {});
    }

    return beneficiary;
  }

  public async createDestination(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentDestination> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const destination = await this.dbAdapter.createDestination({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      amendmentId: data.amendmentId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amNodeId = data.amendmentId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendment",
      `Emenda Parlamentar ${data.amendmentId}`,
      `Emenda registrada no workspace.`,
      amNodeId,
      {}
    );

    const destNodeId = destination.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentDestination",
      `Destinação de Emenda ${destination.id}`,
      `Destinação registrada com status ${destination.status}`,
      destNodeId,
      destination
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, destNodeId, "HAS_DESTINATION");

    // MemoryOS event logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentDestinationCreated",
        `Nova destinação de emenda registrada: ${destination.id}`,
        { destinationId: destination.id, status: destination.status, amendmentId: destination.amendmentId }
      ).catch(() => {});
    }

    return destination;
  }

  public async createExecution(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentExecution> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const execution = await this.dbAdapter.createExecution({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      amendmentId: data.amendmentId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amNodeId = data.amendmentId;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendment",
      `Emenda Parlamentar ${data.amendmentId}`,
      `Emenda registrada no workspace.`,
      amNodeId,
      {}
    );

    const execNodeId = execution.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentExecution",
      `Execução de Emenda ${execution.id}`,
      `Execução registrada com status ${execution.status}`,
      execNodeId,
      execution
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, execNodeId, "HAS_EXECUTION");

    // MemoryOS event logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentExecutionCreated",
        `Nova execução de emenda registrada: ${execution.id}`,
        { executionId: execution.id, status: execution.status, amendmentId: execution.amendmentId }
      ).catch(() => {});
    }

    return execution;
  }

  public async getParliamentarians(organizationId: string, workspaceId: string): Promise<GovernmentParliamentarian[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getParliamentarians(organizationId, workspaceId);
  }

  public async getAmendments(organizationId: string, workspaceId: string): Promise<GovernmentAmendment[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAmendments(organizationId, workspaceId);
  }

  public async getBeneficiaries(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentBeneficiary[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getBeneficiaries(organizationId, workspaceId);
  }

  public async getDestinations(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentDestination[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getDestinations(organizationId, workspaceId);
  }

  public async getExecutions(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentExecution[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getExecutions(organizationId, workspaceId);
  }

  public async getAmendmentSummary(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [
      parliamentarians,
      amendments,
      beneficiaries,
      destinations,
      executions
    ] = await Promise.all([
      this.getParliamentarians(organizationId, workspaceId),
      this.getAmendments(organizationId, workspaceId),
      this.getBeneficiaries(organizationId, workspaceId),
      this.getDestinations(organizationId, workspaceId),
      this.getExecutions(organizationId, workspaceId)
    ]);

    const parlCount = parliamentarians.length;
    const amCount = amendments.length;
    const benCount = beneficiaries.length;
    const destCount = destinations.length;
    const execCount = executions.length;

    const totalCount = parlCount + amCount + benCount + destCount + execCount;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (totalCount === 0) {
      status = "NO_DATA";
    } else if (
      parlCount === 0 ||
      amCount === 0 ||
      benCount === 0 ||
      destCount === 0 ||
      execCount === 0
    ) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      workspaceId,
      parliamentariansCount: parlCount,
      amendmentsCount: amCount,
      beneficiariesCount: benCount,
      destinationsCount: destCount,
      executionsCount: execCount,
      updatedAt: new Date().toISOString()
    };
  }

  public async getAmendmentHealth(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [
      amendments,
      beneficiaries,
      destinations,
      executions
    ] = await Promise.all([
      this.getAmendments(organizationId, workspaceId),
      this.getBeneficiaries(organizationId, workspaceId),
      this.getDestinations(organizationId, workspaceId),
      this.getExecutions(organizationId, workspaceId)
    ]);

    const amendmentsCount = amendments.length;

    if (amendmentsCount === 0) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          approvedRate: 0,
          executionRate: 0,
          beneficiaryReadyRate: 0,
          destinationReadyRate: 0
        }
      };
    }

    const approvedAmendments = amendments.filter(a =>
      ["APPROVED", "ACTIVE", "COMPLETED"].includes(a.status.toUpperCase())
    ).length;
    const approvedRate = Math.round((approvedAmendments / amendmentsCount) * 100);

    const amendmentsWithExecution = amendments.filter(a =>
      executions.some(e => e.amendmentId === a.id)
    ).length;
    const executionRate = Math.round((amendmentsWithExecution / amendmentsCount) * 100);

    const amendmentsWithBeneficiary = amendments.filter(a =>
      beneficiaries.some(b => b.amendmentId === a.id)
    ).length;
    const beneficiaryReadyRate = Math.round((amendmentsWithBeneficiary / amendmentsCount) * 100);

    const amendmentsWithDestination = amendments.filter(a =>
      destinations.some(d => d.amendmentId === a.id)
    ).length;
    const destinationReadyRate = Math.round((amendmentsWithDestination / amendmentsCount) * 100);

    const healthScore = Math.round((approvedRate + executionRate + beneficiaryReadyRate + destinationReadyRate) / 4);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (healthScore < 60) {
      status = "PARTIAL_DATA";
    }

    const health: GovernmentAmendmentHealth = {
      status,
      healthScore,
      metrics: {
        approvedRate,
        executionRate,
        beneficiaryReadyRate,
        destinationReadyRate
      }
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentAmendmentHealthComputed",
        `Calculado indicador de saúde das emendas impositivas: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return health;
  }
}
