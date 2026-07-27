import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentAdministrativeIndicator,
  GovernmentAdministrativeAudit,
  GovernmentAdministrativeCompliance,
  GovernmentAdministrativeResponsibility,
  GovernmentAdministrativeMonitoring,
  GovernmentAdministrativeOccurrence,
  GovernmentAdministrativeGovernanceSummary,
  GovernmentAdministrativeGovernanceHealth
} from "../core/types";

export class GovernmentAdministrativeGovernanceEngine {
  private dbAdapter: DatabaseAdapter;
  private memoryOS: MemoryOS;
  private knowledgeGraph: KnowledgeGraphEngine;

  constructor(
    dbAdapter: DatabaseAdapter,
    knowledgeGraph: KnowledgeGraphEngine,
    memoryOS: MemoryOS
  ) {
    this.dbAdapter = dbAdapter;
    this.knowledgeGraph = knowledgeGraph;
    this.memoryOS = memoryOS;
  }

  // --- 1. INDICATORS ---
  public async getAdministrativeIndicators(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeIndicator[]> {
    return this.dbAdapter.getAdministrativeIndicators(organizationId, workspaceId);
  }

  public async createAdministrativeIndicator(data: GovernmentAdministrativeIndicator): Promise<GovernmentAdministrativeIndicator> {
    const item = await this.dbAdapter.createAdministrativeIndicator(data);

    const workspaceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace NodeReference",
      item.workspaceId
    );

    const indicatorNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentAdministrativeIndicator",
      `Indicator ${item.id}`,
      `Indicator status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, indicatorNode.id, "HAS_ADMINISTRATIVE_INDICATOR");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentAdministrativeIndicatorCreated",
      entityType: "GovernmentAdministrativeIndicator",
      entityId: item.id!,
      description: `Administrative indicator established with status: ${item.status}`
    });

    return item;
  }

  // --- 2. AUDITS ---
  public async getAdministrativeAudits(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeAudit[]> {
    return this.dbAdapter.getAdministrativeAudits(organizationId, workspaceId);
  }

  public async createAdministrativeAudit(data: GovernmentAdministrativeAudit): Promise<GovernmentAdministrativeAudit> {
    const item = await this.dbAdapter.createAdministrativeAudit(data);

    const workspaceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace NodeReference",
      item.workspaceId
    );

    const auditNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentAdministrativeAudit",
      `Audit ${item.id}`,
      `Audit status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, auditNode.id, "HAS_ADMINISTRATIVE_AUDIT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentAdministrativeAuditCreated",
      entityType: "GovernmentAdministrativeAudit",
      entityId: item.id!,
      description: `Administrative audit logged with status: ${item.status}`
    });

    return item;
  }

  // --- 3. COMPLIANCES ---
  public async getAdministrativeCompliances(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeCompliance[]> {
    return this.dbAdapter.getAdministrativeCompliances(organizationId, workspaceId);
  }

  public async createAdministrativeCompliance(data: GovernmentAdministrativeCompliance): Promise<GovernmentAdministrativeCompliance> {
    const item = await this.dbAdapter.createAdministrativeCompliance(data);

    const workspaceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace NodeReference",
      item.workspaceId
    );

    const complianceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentAdministrativeCompliance",
      `Compliance ${item.id}`,
      `Compliance status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, complianceNode.id, "HAS_ADMINISTRATIVE_COMPLIANCE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentAdministrativeComplianceCreated",
      entityType: "GovernmentAdministrativeCompliance",
      entityId: item.id!,
      description: `Administrative compliance recorded under status: ${item.status}`
    });

    return item;
  }

  // --- 4. RESPONSIBILITIES ---
  public async getAdministrativeResponsibilities(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeResponsibility[]> {
    return this.dbAdapter.getAdministrativeResponsibilities(organizationId, workspaceId);
  }

  public async createAdministrativeResponsibility(data: GovernmentAdministrativeResponsibility): Promise<GovernmentAdministrativeResponsibility> {
    const item = await this.dbAdapter.createAdministrativeResponsibility(data);

    const workspaceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace NodeReference",
      item.workspaceId
    );

    const respNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentAdministrativeResponsibility",
      `Responsibility ${item.id}`,
      `Responsibility status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, respNode.id, "HAS_ADMINISTRATIVE_RESPONSIBILITY");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentAdministrativeResponsibilityCreated",
      entityType: "GovernmentAdministrativeResponsibility",
      entityId: item.id!,
      description: `Administrative responsibility logged. Status: ${item.status}`
    });

    return item;
  }

  // --- 5. MONITORINGS ---
  public async getAdministrativeMonitorings(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeMonitoring[]> {
    return this.dbAdapter.getAdministrativeMonitorings(organizationId, workspaceId);
  }

  public async createAdministrativeMonitoring(data: GovernmentAdministrativeMonitoring): Promise<GovernmentAdministrativeMonitoring> {
    const item = await this.dbAdapter.createAdministrativeMonitoring(data);

    const workspaceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace NodeReference",
      item.workspaceId
    );

    const monitoringNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentAdministrativeMonitoring",
      `Monitoring ${item.id}`,
      `Monitoring status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, monitoringNode.id, "HAS_ADMINISTRATIVE_MONITORING");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentAdministrativeMonitoringCreated",
      entityType: "GovernmentAdministrativeMonitoring",
      entityId: item.id!,
      description: `Administrative monitoring mapped. Status: ${item.status}`
    });

    return item;
  }

  // --- 6. OCCURRENCES ---
  public async getAdministrativeOccurrences(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeOccurrence[]> {
    return this.dbAdapter.getAdministrativeOccurrences(organizationId, workspaceId);
  }

  public async createAdministrativeOccurrence(data: GovernmentAdministrativeOccurrence): Promise<GovernmentAdministrativeOccurrence> {
    const item = await this.dbAdapter.createAdministrativeOccurrence(data);

    const workspaceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace ${item.workspaceId}`,
      "Government Workspace NodeReference",
      item.workspaceId
    );

    const occurrenceNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentAdministrativeOccurrence",
      `Occurrence ${item.id}`,
      `Occurrence status: ${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, occurrenceNode.id, "HAS_ADMINISTRATIVE_OCCURRENCE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentAdministrativeOccurrenceCreated",
      entityType: "GovernmentAdministrativeOccurrence",
      entityId: item.id!,
      description: `Administrative occurrence tracked. Status: ${item.status}`
    });

    return item;
  }

  // --- 7. SUMMARY ---
  public async getSummary(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeGovernanceSummary> {
    const [indicators, audits, compliances, responsibilities, monitorings, occurrences] = await Promise.all([
      this.getAdministrativeIndicators(organizationId, workspaceId),
      this.getAdministrativeAudits(organizationId, workspaceId),
      this.getAdministrativeCompliances(organizationId, workspaceId),
      this.getAdministrativeResponsibilities(organizationId, workspaceId),
      this.getAdministrativeMonitorings(organizationId, workspaceId),
      this.getAdministrativeOccurrences(organizationId, workspaceId)
    ]);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";
    const totalCount =
      indicators.length +
      audits.length +
      compliances.length +
      responsibilities.length +
      monitorings.length +
      occurrences.length;

    if (totalCount > 0) {
      if (
        indicators.length > 0 &&
        audits.length > 0 &&
        compliances.length > 0 &&
        responsibilities.length > 0 &&
        monitorings.length > 0 &&
        occurrences.length > 0
      ) {
        status = "READY";
      } else {
        status = "PARTIAL_DATA";
      }
    }

    return {
      organizationId,
      workspaceId,
      status,
      totalAdministrativeIndicators: indicators.length,
      totalAdministrativeAudits: audits.length,
      totalAdministrativeCompliances: compliances.length,
      totalAdministrativeResponsibilities: responsibilities.length,
      totalAdministrativeMonitorings: monitorings.length,
      totalAdministrativeOccurrences: occurrences.length,
      lastComputedAt: new Date().toISOString()
    };
  }

  // --- 8. HEALTH ---
  public async getHealth(organizationId: string, workspaceId: string): Promise<GovernmentAdministrativeGovernanceHealth> {
    try {
      const summary = await this.getSummary(organizationId, workspaceId);

      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        eventType: "GovernmentAdministrativeGovernanceHealthComputed",
        entityType: "GovernmentWorkspace",
        entityId: workspaceId,
        description: `Computed Administrative Governance health status: ${summary.status}`
      });

      return {
        status: summary.status,
        healthScore: summary.status === "READY" ? 100 : summary.status === "PARTIAL_DATA" ? 50 : 0,
        metrics: {
          message: summary.status === "READY" ? "Administrative indicators, compliance checks, responsibility maps, monitoring, audit records, and occurrence logs are fully synchronized and compliant." :
                   summary.status === "PARTIAL_DATA" ? "Partial administrative governance records registered. Build a complete compliance baseline and define monitoring pathways." :
                   "No administrative record entries found for this workspace.",
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          message: "Error computing health: " + (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
