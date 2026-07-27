import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentTransparencyMetric,
  GovernmentTransparencyKPI,
  GovernmentTransparencyCompliance,
  GovernmentTransparencyAudit,
  GovernmentTransparencyMonitoring,
  GovernmentTransparencyAnalyticsSummary,
  GovernmentTransparencyAnalyticsHealth
} from "../core/types";

export class GovernmentTransparencyAnalyticsEngine {
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

  // --- 1. METRICS ---
  public async getTransparencyMetrics(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyMetric[]> {
    return this.dbAdapter.getTransparencyMetrics(organizationId, workspaceId);
  }

  public async createTransparencyMetric(data: GovernmentTransparencyMetric): Promise<GovernmentTransparencyMetric> {
    const item = await this.dbAdapter.createTransparencyMetric(data);

    // kg relation: GovernmentWorkspace -> HAS_TRANSPARENCY_METRIC -> GovernmentTransparencyMetric
    const workspaceNode = await this.knowledgeGraph.ensureNode(
      data.organizationId,
      null,
      "GovernmentWorkspace",
      `Workspace \${item.workspaceId}`,
      `Government Workspace Node`,
      item.workspaceId
    );

    const metricNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyMetric",
      `Metric \${item.id}`,
      `Metric \${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, workspaceNode.id, metricNode.id, "HAS_TRANSPARENCY_METRIC");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentTransparencyMetricCreated",
      entityType: "GovernmentTransparencyMetric",
      entityId: item.id!,
      description: `Transparency Metric created with status: \${item.status}`
    });

    return item;
  }

  // --- 2. KPIS ---
  public async getTransparencyKPIs(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyKPI[]> {
    return this.dbAdapter.getTransparencyKPIs(organizationId, workspaceId);
  }

  public async createTransparencyKPI(data: GovernmentTransparencyKPI): Promise<GovernmentTransparencyKPI> {
    const item = await this.dbAdapter.createTransparencyKPI(data);

    // metricNode -> HAS_KPI -> kpiNode
    const metricNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyMetric",
      `Metric Context`,
      `Metric node`,
      data.metadataJson?.metricId || "unknown_metric" // fallback if not supplied
    );

    const kpiNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyKPI",
      `KPI \${item.id}`,
      `KPI \${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, metricNode.id, kpiNode.id, "HAS_KPI");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentTransparencyKPICreated",
      entityType: "GovernmentTransparencyKPI",
      entityId: item.id!,
      description: `Transparency KPI created with status: \${item.status}`
    });

    return item;
  }

  // --- 3. COMPLIANCE ---
  public async getTransparencyCompliances(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyCompliance[]> {
    return this.dbAdapter.getTransparencyCompliances(organizationId, workspaceId);
  }

  public async createTransparencyCompliance(data: GovernmentTransparencyCompliance): Promise<GovernmentTransparencyCompliance> {
    const item = await this.dbAdapter.createTransparencyCompliance(data);

    // kpiNode -> HAS_COMPLIANCE -> complianceNode
    const kpiNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyKPI",
      `KPI Context`,
      `KPI node`,
      data.metadataJson?.kpiId || "unknown_kpi"
    );

    const compNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyCompliance",
      `Compliance \${item.id}`,
      `Compliance \${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, kpiNode.id, compNode.id, "HAS_COMPLIANCE");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentTransparencyComplianceCreated",
      entityType: "GovernmentTransparencyCompliance",
      entityId: item.id!,
      description: `Transparency Compliance created with status: \${item.status}`
    });

    return item;
  }

  // --- 4. AUDITS ---
  public async getTransparencyAudits(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyAudit[]> {
    return this.dbAdapter.getTransparencyAudits(organizationId, workspaceId);
  }

  public async createTransparencyAudit(data: GovernmentTransparencyAudit): Promise<GovernmentTransparencyAudit> {
    const item = await this.dbAdapter.createTransparencyAudit(data);

    // compNode -> HAS_AUDIT -> auditNode
    const compNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyCompliance",
      `Compliance Context`,
      `Compliance node`,
      data.metadataJson?.complianceId || "unknown_compliance"
    );

    const auditNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyAudit",
      `Audit \${item.id}`,
      `Audit \${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, compNode.id, auditNode.id, "HAS_AUDIT");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentTransparencyAuditCreated",
      entityType: "GovernmentTransparencyAudit",
      entityId: item.id!,
      description: `Transparency Audit created with status: \${item.status}`
    });

    return item;
  }

  // --- 5. MONITORINGS ---
  public async getTransparencyMonitorings(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyMonitoring[]> {
    return this.dbAdapter.getTransparencyMonitorings(organizationId, workspaceId);
  }

  public async createTransparencyMonitoring(data: GovernmentTransparencyMonitoring): Promise<GovernmentTransparencyMonitoring> {
    const item = await this.dbAdapter.createTransparencyMonitoring(data);

    // auditNode -> HAS_MONITORING -> monitoringNode
    const auditNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyAudit",
      `Audit Context`,
      `Audit node`,
      data.metadataJson?.auditId || "unknown_audit"
    );

    const monNode = await this.knowledgeGraph.ensureNode(
      item.organizationId,
      null,
      "GovernmentTransparencyMonitoring",
      `Monitoring \${item.id}`,
      `Monitoring \${item.status}`,
      item.id!
    );
    await this.knowledgeGraph.createRelationship(item.organizationId, auditNode.id, monNode.id, "HAS_MONITORING");

    await this.memoryOS.registerEvent({
      organizationId: item.organizationId,
      workspaceId: item.workspaceId,
      eventType: "GovernmentTransparencyMonitoringCreated",
      entityType: "GovernmentTransparencyMonitoring",
      entityId: item.id!,
      description: `Transparency Monitoring created with status: \${item.status}`
    });

    return item;
  }

  // --- 6. SUMMARY ---
  public async getAnalyticsSummary(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyAnalyticsSummary> {
    const metrics = await this.getTransparencyMetrics(organizationId, workspaceId);
    const kpis = await this.getTransparencyKPIs(organizationId, workspaceId);
    const compliances = await this.getTransparencyCompliances(organizationId, workspaceId);
    const audits = await this.getTransparencyAudits(organizationId, workspaceId);
    const monitorings = await this.getTransparencyMonitorings(organizationId, workspaceId);

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "NO_DATA";
    if (metrics.length > 0) {
      if (kpis.length > 0 && audits.length > 0) {
        status = "READY";
      } else {
        status = "PARTIAL_DATA";
      }
    }

    return {
      organizationId,
      workspaceId,
      status,
      totalMetrics: metrics.length,
      totalKPIs: kpis.length,
      totalCompliances: compliances.length,
      totalAudits: audits.length,
      totalMonitorings: monitorings.length,
      lastComputedAt: new Date().toISOString()
    };
  }

  // --- 7. HEALTH ---
  public async getAnalyticsHealth(organizationId: string, workspaceId: string): Promise<GovernmentTransparencyAnalyticsHealth> {
    try {
      const summary = await this.getAnalyticsSummary(organizationId, workspaceId);
      
      await this.memoryOS.registerEvent({
        organizationId,
        workspaceId,
        eventType: "GovernmentTransparencyAnalyticsHealthComputed",
        entityType: "GovernmentMetrics",
        entityId: workspaceId,
        description: `Computed health: \${summary.status}`
      });

      return {
        status: summary.status,
        healthScore: summary.status === "READY" ? 100 : summary.status === "PARTIAL_DATA" ? 50 : 0,
        metrics: {
          message: summary.status === "READY" ? "Analytics module fully operational." :
                   summary.status === "PARTIAL_DATA" ? "Partial data available. Missing some KPIs or Audits." :
                   "No analytics data found.",
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
