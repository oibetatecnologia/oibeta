import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import { GovernmentWorkspaceEngine } from "./GovernmentWorkspaceEngine";
import { GovernmentProgramManagementEngine } from "./GovernmentProgramManagementEngine";
import { GovernmentReportingEngine } from "./GovernmentReportingEngine";
import { GovernmentGovernanceEngine } from "./GovernmentGovernanceEngine";
import { GovernmentAmendmentEngine } from "./GovernmentAmendmentEngine";

import {
  GovernmentAmendmentMilestone,
  GovernmentAmendmentMonitoring,
  GovernmentAmendmentEvidence,
  GovernmentAmendmentAccountability,
  GovernmentAmendmentIssue,
  GovernmentAmendmentMonitoringSummary,
  GovernmentAmendmentMonitoringHealth
} from "../core/types";

export class GovernmentAmendmentMonitoringEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private amendmentEngine: GovernmentAmendmentEngine,
    private workspaceEngine?: GovernmentWorkspaceEngine,
    private programManagementEngine?: GovernmentProgramManagementEngine,
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

  public async createMilestone(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentMilestone> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const milestone = await this.dbAdapter.createMilestone({
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

    const milNodeId = milestone.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentMilestone",
      `Marco de Emenda ${milestone.id}`,
      `Marco registrado com status ${milestone.status}`,
      milNodeId,
      milestone
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, milNodeId, "HAS_MILESTONE");

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentMilestoneCreated",
        `Novo marco de emenda registrado: ${milestone.id}`,
        { milestoneId: milestone.id, status: milestone.status, amendmentId: milestone.amendmentId }
      ).catch(() => {});
    }

    return milestone;
  }

  public async createMonitoring(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentMonitoring> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const monitoring = await this.dbAdapter.createMonitoring({
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

    const monNodeId = monitoring.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentMonitoring",
      `Monitoramento de Emenda ${monitoring.id}`,
      `Monitoramento registrado com status ${monitoring.status}`,
      monNodeId,
      monitoring
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, monNodeId, "HAS_MONITORING");

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentMonitoringCreated",
        `Novo monitoramento de emenda registrado: ${monitoring.id}`,
        { monitoringId: monitoring.id, status: monitoring.status, amendmentId: monitoring.amendmentId }
      ).catch(() => {});
    }

    return monitoring;
  }

  public async createEvidence(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentEvidence> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const evidence: GovernmentAmendmentEvidence = await this.dbAdapter.createGovAmendmentEvidence({
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

    const evNodeId = evidence.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentEvidence",
      `Evidência de Emenda ${evidence.id}`,
      `Evidência registrada com status ${evidence.status}`,
      evNodeId,
      evidence
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, evNodeId, "HAS_EVIDENCE");

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentEvidenceCreated",
        `Nova evidência de emenda registrada: ${evidence.id}`,
        { evidenceId: evidence.id, status: evidence.status, amendmentId: evidence.amendmentId }
      ).catch(() => {});
    }

    return evidence;
  }

  public async createAccountability(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentAccountability> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const accountability = await this.dbAdapter.createAccountability({
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

    const accNodeId = accountability.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentAccountability",
      `Prestação de Contas de Emenda ${accountability.id}`,
      `Prestação de contas registrada com status ${accountability.status}`,
      accNodeId,
      accountability
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, accNodeId, "HAS_ACCOUNTABILITY");

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentAccountabilityCreated",
        `Nova prestação de contas de emenda registrada: ${accountability.id}`,
        { accountabilityId: accountability.id, status: accountability.status, amendmentId: accountability.amendmentId }
      ).catch(() => {});
    }

    return accountability;
  }

  public async createIssue(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    amendmentId: string;
    status: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentIssue> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const issue = await this.dbAdapter.createIssue({
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

    const issueNodeId = issue.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "GovernmentAmendmentIssue",
      `Ocorrência de Emenda ${issue.id}`,
      `Ocorrência registrada com status ${issue.status}`,
      issueNodeId,
      issue
    );

    await this.kgEngine.createRelationship(data.organizationId, amNodeId, issueNodeId, "HAS_ISSUE");

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentIssueCreated",
        `Nova ocorrência de emenda registrada: ${issue.id}`,
        { issueId: issue.id, status: issue.status, amendmentId: issue.amendmentId }
      ).catch(() => {});
    }

    return issue;
  }

  public async getMilestones(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentMilestone[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getMilestones(organizationId, workspaceId);
  }

  public async getMonitorings(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentMonitoring[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getMonitorings(organizationId, workspaceId);
  }

  public async getEvidences(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentEvidence[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getGovAmendmentEvidences(organizationId, workspaceId);
    return result as GovernmentAmendmentEvidence[];
  }

  public async getAccountabilities(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentAccountability[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAccountabilities(organizationId, workspaceId);
  }

  public async getIssues(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentIssue[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getIssues(organizationId, workspaceId);
  }

  public async getMonitoringSummary(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentMonitoringSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [
      milestones,
      monitorings,
      evidences,
      accountabilities,
      issues
    ] = await Promise.all([
      this.getMilestones(organizationId, workspaceId),
      this.getMonitorings(organizationId, workspaceId),
      this.getEvidences(organizationId, workspaceId),
      this.getAccountabilities(organizationId, workspaceId),
      this.getIssues(organizationId, workspaceId)
    ]);

    const milestonesCount = milestones.length;
    const monitoringsCount = monitorings.length;
    const evidencesCount = evidences.length;
    const accountabilitiesCount = accountabilities.length;
    const issuesCount = issues.length;

    const totalCount = milestonesCount + monitoringsCount + evidencesCount + accountabilitiesCount + issuesCount;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (totalCount === 0) {
      status = "NO_DATA";
    } else if (
      milestonesCount === 0 ||
      monitoringsCount === 0 ||
      evidencesCount === 0 ||
      accountabilitiesCount === 0 ||
      issuesCount === 0
    ) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      workspaceId,
      milestonesCount,
      monitoringsCount,
      evidencesCount,
      accountabilitiesCount,
      issuesCount,
      updatedAt: new Date().toISOString()
    };
  }

  public async getMonitoringHealth(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentMonitoringHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [
      milestones,
      monitorings,
      evidences,
      accountabilities,
      issues
    ] = await Promise.all([
      this.getMilestones(organizationId, workspaceId),
      this.getMonitorings(organizationId, workspaceId),
      this.getEvidences(organizationId, workspaceId),
      this.getAccountabilities(organizationId, workspaceId),
      this.getIssues(organizationId, workspaceId)
    ]);

    const totalCount = milestones.length + monitorings.length + evidences.length + accountabilities.length + issues.length;

    if (totalCount === 0) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          completedMilestonesRate: 0,
          activeMonitoringsRate: 0,
          evidencesAvailabilityRate: 0,
          pendantAccountabilitiesRate: 0,
          issueResolutionRate: 0
        }
      };
    }

    const completedMilestones = milestones.filter(m => m.status.toUpperCase() === "COMPLETED").length;
    const completedMilestonesRate = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 100;

    const activeMonitorings = monitorings.filter(m => ["PENDING", "IN_PROGRESS", "COMPLETED"].includes(m.status.toUpperCase())).length;
    const activeMonitoringsRate = monitorings.length > 0 ? Math.round((activeMonitorings / monitorings.length) * 100) : 100;

    const completedEvidences = evidences.filter(e => ["COMPLETED", "IN_PROGRESS"].includes(e.status.toUpperCase())).length;
    const evidencesAvailabilityRate = evidences.length > 0 ? Math.round((completedEvidences / evidences.length) * 100) : 100;

    const completedAccountabilities = accountabilities.filter(a => a.status.toUpperCase() === "COMPLETED").length;
    const pendantAccountabilitiesRate = accountabilities.length > 0 ? Math.round((completedAccountabilities / accountabilities.length) * 100) : 100;

    const resolvedIssues = issues.filter(i => ["COMPLETED", "CANCELLED"].includes(i.status.toUpperCase())).length;
    const issueResolutionRate = issues.length > 0 ? Math.round((resolvedIssues / issues.length) * 100) : 100;

    const healthScore = Math.round(
      (completedMilestonesRate +
        activeMonitoringsRate +
        evidencesAvailabilityRate +
        pendantAccountabilitiesRate +
        issueResolutionRate) /
        5
    );

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (healthScore < 60) {
      status = "PARTIAL_DATA";
    }

    const health: GovernmentAmendmentMonitoringHealth = {
      status,
      healthScore,
      metrics: {
        completedMilestonesRate,
        activeMonitoringsRate,
        evidencesAvailabilityRate,
        pendantAccountabilitiesRate,
        issueResolutionRate
      }
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentAmendmentMonitoringHealthComputed",
        `Calculado indicador de saúde do monitoramento das emendas impositivas: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return health;
  }
}
