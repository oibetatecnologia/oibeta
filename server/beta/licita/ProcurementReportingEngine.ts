import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import {
  ProcurementReport,
  ProcurementExecutiveBrief,
  ProcurementMonitoringSnapshot,
  ProcurementSummary,
  ProcurementReportingHealth
} from "../core/types";

export class ProcurementReportingEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
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

  public async createReport(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    reportType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementReport> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const report = await this.dbAdapter.createReport({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      reportType: data.reportType,
      status: data.status,
      metadata: data.metadata || {}
    });

    const wsNodeId = `pws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementWorkspace",
      `Beta Licita Workspace (${data.workspaceId})`,
      "Workspace operacional do módulo Beta Licita de compras públicas.",
      wsNodeId,
      {}
    );

    const reportNodeId = report.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementReport",
      `Relatório de Compras ${report.id}`,
      `Relatório de compras públicas do tipo ${report.reportType} em estado ${report.status}`,
      reportNodeId,
      report
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, reportNodeId, "HAS_REPORT");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementReportCreated",
        `Novo relatório de compras gerado: ${report.id}`,
        { reportId: report.id, reportType: report.reportType, status: report.status }
      ).catch(() => {});
    }

    return report;
  }

  public async createExecutiveBrief(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    briefType: string;
    status: string;
    metadata?: any;
  }): Promise<ProcurementExecutiveBrief> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const brief = await this.dbAdapter.createProcurementExecutiveBrief({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      briefType: data.briefType,
      status: data.status,
      metadata: data.metadata || {}
    });

    const wsNodeId = `pws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementWorkspace",
      `Beta Licita Workspace (${data.workspaceId})`,
      "Workspace operacional do módulo Beta Licita de compras públicas.",
      wsNodeId,
      {}
    );

    const briefNodeId = brief.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementExecutiveBrief",
      `Briefing Executivo ${brief.id}`,
      `Briefing executivo do tipo ${brief.briefType} em estado ${brief.status}`,
      briefNodeId,
      brief
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, briefNodeId, "HAS_BRIEF");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementExecutiveBriefCreated",
        `Novo briefing executivo criado: ${brief.id}`,
        { briefId: brief.id, briefType: brief.briefType, status: brief.status }
      ).catch(() => {});
    }

    return brief;
  }

  public async createMonitoringSnapshot(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    snapshotType: string;
    snapshotJson: any;
  }): Promise<ProcurementMonitoringSnapshot> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const snapshot = await this.dbAdapter.createProcurementMonitoringSnapshot({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      snapshotType: data.snapshotType,
      snapshotJson: data.snapshotJson
    });

    const wsNodeId = `pws-${data.workspaceId}`;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementWorkspace",
      `Beta Licita Workspace (${data.workspaceId})`,
      "Workspace operacional do módulo Beta Licita de compras públicas.",
      wsNodeId,
      {}
    );

    const snapNodeId = snapshot.id;
    await this.kgEngine.ensureNode(
      data.organizationId,
      data.workspaceId,
      "ProcurementMonitoringSnapshot",
      `Snapshot de Monitoramento ${snapshot.id}`,
      `Instantâneo operacional de monitoramento do tipo ${snapshot.snapshotType}`,
      snapNodeId,
      snapshot
    );

    await this.kgEngine.createRelationship(data.organizationId, wsNodeId, snapNodeId, "HAS_MONITORING");

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "ProcurementMonitoringSnapshotCreated",
        `Novo instantâneo (snapshot) de monitoramento registrado: ${snapshot.id}`,
        { snapshotId: snapshot.id, snapshotType: snapshot.snapshotType }
      ).catch(() => {});
    }

    return snapshot;
  }

  public async getReports(organizationId: string, workspaceId: string): Promise<ProcurementReport[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getReports(organizationId, workspaceId);
  }

  public async getReport(id: string): Promise<ProcurementReport | null> {
    if (!id) throw new Error("Report ID is required");
    return this.dbAdapter.getReport(id);
  }

  public async getExecutiveBriefs(organizationId: string, workspaceId: string): Promise<ProcurementExecutiveBrief[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getProcurementExecutiveBriefs(organizationId, workspaceId);
  }

  public async getExecutiveBrief(id: string): Promise<ProcurementExecutiveBrief | null> {
    if (!id) throw new Error("Executive Brief ID is required");
    return this.dbAdapter.getProcurementExecutiveBrief(id);
  }

  public async getMonitoringSnapshots(organizationId: string, workspaceId: string): Promise<ProcurementMonitoringSnapshot[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getProcurementMonitoringSnapshots(organizationId, workspaceId);
  }

  public async generateSummary(organizationId: string, workspaceId: string): Promise<ProcurementSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [
      opps,
      bids,
      suppliers,
      contracts,
      arps,
      auditEvents,
      complianceEvents,
      reports,
      briefs,
      snapshots
    ] = await Promise.all([
      this.dbAdapter.getOpportunities ? this.dbAdapter.getOpportunities(organizationId, workspaceId) : Promise.resolve([]),
      this.dbAdapter.getBids ? this.dbAdapter.getBids(organizationId, workspaceId) : Promise.resolve([]),
      this.dbAdapter.getSuppliers ? this.dbAdapter.getSuppliers(organizationId, workspaceId) : Promise.resolve([]),
      this.dbAdapter.getContracts ? this.dbAdapter.getContracts(organizationId, workspaceId) : Promise.resolve([]),
      this.dbAdapter.getARPs ? this.dbAdapter.getARPs(organizationId, workspaceId) : Promise.resolve([]),
      this.dbAdapter.getAuditEvents ? this.dbAdapter.getAuditEvents(organizationId, workspaceId) : Promise.resolve([]),
      this.dbAdapter.getComplianceEvents ? this.dbAdapter.getComplianceEvents(organizationId, workspaceId) : Promise.resolve([]),
      this.getReports(organizationId, workspaceId),
      this.getExecutiveBriefs(organizationId, workspaceId),
      this.getMonitoringSnapshots(organizationId, workspaceId)
    ]);

    const oppsCount = opps.length;
    const bidsCount = bids.length;
    const suppliersCount = suppliers.length;
    const contractsCount = contracts.length;
    const arpsCount = arps.length;
    const auditCount = auditEvents.length;
    const complianceCount = complianceEvents.length;
    const reportsCount = reports.length;
    const briefsCount = briefs.length;
    const snapshotsCount = snapshots.length;

    const totalCount =
      oppsCount +
      bidsCount +
      suppliersCount +
      contractsCount +
      arpsCount +
      auditCount +
      complianceCount +
      reportsCount +
      briefsCount +
      snapshotsCount;

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (totalCount === 0) {
      status = "NO_DATA";
    } else if (
      oppsCount === 0 ||
      bidsCount === 0 ||
      suppliersCount === 0 ||
      contractsCount === 0 ||
      arpsCount === 0 ||
      auditCount === 0 ||
      complianceCount === 0 ||
      reportsCount === 0 ||
      briefsCount === 0 ||
      snapshotsCount === 0
    ) {
      status = "PARTIAL_DATA";
    }

    return {
      status,
      workspaceId,
      opportunitiesCount: oppsCount,
      bidsCount: bidsCount,
      suppliersCount: suppliersCount,
      contractsCount: contractsCount,
      arpsCount: arpsCount,
      auditEventsCount: auditCount,
      complianceEventsCount: complianceCount,
      reportsCount: reportsCount,
      briefsCount: briefsCount,
      snapshotsCount: snapshotsCount,
      updatedAt: new Date().toISOString()
    };
  }

  public async generateHealthCheck(organizationId: string, workspaceId: string): Promise<ProcurementReportingHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [reports, briefs, snapshots] = await Promise.all([
      this.getReports(organizationId, workspaceId),
      this.getExecutiveBriefs(organizationId, workspaceId),
      this.getMonitoringSnapshots(organizationId, workspaceId)
    ]);

    if (reports.length === 0 && briefs.length === 0 && snapshots.length === 0) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          reportsReadyRate: 0,
          briefsReadyRate: 0,
          snapshotsCoverageRate: 0,
          activityLogRate: 0
        }
      };
    }

    // Reports ready: status is COMPLETED, READY, SUCCESS, ACTIVE, etc.
    const readyReports = reports.filter(r =>
      ["READY", "COMPLETED", "SUCCESS", "ACTIVE"].includes(r.status.toUpperCase())
    ).length;
    const reportsReadyRate = reports.length > 0 ? Math.round((readyReports / reports.length) * 100) : 0;

    // Briefs ready
    const readyBriefs = briefs.filter(b =>
      ["READY", "COMPLETED", "SUCCESS", "ACTIVE"].includes(b.status.toUpperCase())
    ).length;
    const briefsReadyRate = briefs.length > 0 ? Math.round((readyBriefs / briefs.length) * 100) : 0;

    // Snapshots coverage: if we have snapshots at all, coverage is high
    const snapshotsCoverageRate = snapshots.length > 0 ? Math.min(100, snapshots.length * 25) : 0;

    // Activity log rate: based on historic data logs, assume 100 if any generated
    const activityLogRate = (reports.length > 0 || briefs.length > 0 || snapshots.length > 0) ? 100 : 0;

    const healthScore = Math.round(
      (reportsReadyRate + briefsReadyRate + snapshotsCoverageRate + activityLogRate) / 4
    );

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (healthScore === 0) {
      status = "NO_DATA";
    } else if (healthScore < 60) {
      status = "PARTIAL_DATA";
    }

    const healthResult: ProcurementReportingHealth = {
      status,
      healthScore,
      metrics: {
        reportsReadyRate,
        briefsReadyRate,
        snapshotsCoverageRate,
        activityLogRate
      }
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "ProcurementReportingHealthComputed",
        `Calculado indicador de saúde métrica de relatórios executivos: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return healthResult;
  }
}
