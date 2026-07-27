import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import { GovernmentWorkspaceEngine } from "./GovernmentWorkspaceEngine";
import { GovernmentProgramManagementEngine } from "./GovernmentProgramManagementEngine";
import { GovernmentPerformanceManagementEngine } from "./GovernmentPerformanceManagementEngine";
import { GovernmentIndicatorEngine } from "./GovernmentIndicatorEngine";
import { GovernmentRiskEngine } from "./GovernmentRiskEngine";
import { GovernmentHealthEngine } from "./GovernmentHealthEngine";
import {
  GovernmentReport,
  GovernmentExecutiveBrief,
  GovernmentSummary,
  GovernmentMonitoringSnapshot,
  GovernmentReportStatus,
  GovernmentDataStatus
} from "../core/types";

export class GovernmentReportingEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private govWorkspaceEngine: GovernmentWorkspaceEngine,
    private govProgramManagementEngine: GovernmentProgramManagementEngine,
    private govPerformanceManagementEngine: GovernmentPerformanceManagementEngine,
    private govIndicatorEngine: GovernmentIndicatorEngine,
    private govRiskEngine: GovernmentRiskEngine,
    private govHealthEngine: GovernmentHealthEngine,
    private memoryOS: MemoryOS,
    private kgEngine: KnowledgeGraphEngine,
    private wsOrchestrator: WorkspaceIntelligenceOrchestrator | undefined,
    private opCommandCenterEngine: OperationalCommandCenterEngine
  ) {}

  public async createGovernmentReport(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentReport> {
    const reportId = data.id || `rep-${Date.now()}`;
    const status: GovernmentReportStatus = data.status || "DRAFT";

    // Build the report structure based on specified inputs (No AI generated summaries)
    const reportData = {
      id: reportId,
      organizationId,
      workspaceId,
      reportType: data.reportType || "GENERAL",
      title: data.title || `Report ${reportId}`,
      status,
      metadata: data.metadata || {}
    };

    const saved = await this.dbAdapter.createGovernmentReport(reportData);

    // Knowledge Graph Node and Relationships
    await this.kgEngine.createNode(reportId, "GovernmentReport", {
      organizationId,
      workspaceId,
      name: reportData.title,
      description: reportData.metadata?.description || "Government Structuring Report"
    });

    // GovernmentWorkspace -> HAS_REPORT -> GovernmentReport
    await this.kgEngine.createRelationship(organizationId, workspaceId, reportId, "HAS_REPORT");

    // GovernmentReport -> GENERATED_FROM -> GovernmentPerformance snapshot if performanceId exists
    if (data.metadata?.performanceId) {
      await this.kgEngine.createRelationship(
        organizationId,
        reportId,
        data.metadata.performanceId,
        "GENERATED_FROM"
      );
    }

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentReportCreated",
        `Government Report '${reportData.title}' was successfully registered in workspace ${workspaceId}.`,
        { reportId }
      ).catch(() => {});
    }

    // DB Log
    await this.dbAdapter.createGovernmentReportLog({
      organizationId,
      workspaceId,
      eventType: "GovernmentReportCreated",
      details: { reportId, title: reportData.title, status }
    }).catch(() => {});

    return saved;
  }

  public async createExecutiveBrief(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentExecutiveBrief> {
    const briefId = data.id || `brf-${Date.now()}`;
    const status: GovernmentReportStatus = data.status || "DRAFT";

    const briefData = {
      id: briefId,
      organizationId,
      workspaceId,
      briefType: data.briefType || "EXECUTIVE",
      title: data.title || `Brief ${briefId}`,
      status,
      metadata: data.metadata || {}
    };

    const saved = await this.dbAdapter.createExecutiveBrief(briefData);

    // KG Node and Relationships
    await this.kgEngine.createNode(briefId, "GovernmentExecutiveBrief", {
      organizationId,
      workspaceId,
      name: briefData.title,
      description: briefData.metadata?.description || "Government Executive Brief"
    });

    // GovernmentWorkspace -> HAS_BRIEF -> GovernmentExecutiveBrief
    await this.kgEngine.createRelationship(organizationId, workspaceId, briefId, "HAS_BRIEF");

    // GovernmentBrief -> GENERATED_FROM -> GovernmentSummary
    // Since GovernmentSummary represents a computed state node, we ensure its Node first
    const summaryNodeId = `sum-${workspaceId}`;
    await this.kgEngine.createNode(summaryNodeId, "GovernmentSummary", {
      organizationId,
      workspaceId,
      name: "Government Summary"
    });
    await this.kgEngine.createRelationship(organizationId, briefId, summaryNodeId, "GENERATED_FROM");

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentBriefCreated",
        `Government Executive Brief '${briefData.title}' was registered in workspace ${workspaceId}.`,
        { briefId }
      ).catch(() => {});
    }

    // DB Log
    await this.dbAdapter.createGovernmentReportLog({
      organizationId,
      workspaceId,
      eventType: "GovernmentBriefCreated",
      details: { briefId, title: briefData.title, status }
    }).catch(() => {});

    return saved;
  }

  public async createMonitoringSnapshot(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentMonitoringSnapshot> {
    const snapshotId = data.id || `snap-${Date.now()}`;

    const snapshotData = {
      id: snapshotId,
      organizationId,
      workspaceId,
      snapshotType: data.snapshotType || "SYS_MONITOR",
      snapshot: data.snapshot || {}
    };

    const saved = await this.dbAdapter.createMonitoringSnapshot(snapshotData);

    // KG Node and Relationships
    await this.kgEngine.createNode(snapshotId, "GovernmentMonitoringSnapshot", {
      organizationId,
      workspaceId,
      name: `Snapshot ${snapshotId} (${snapshotData.snapshotType})`
    });

    // GovernmentWorkspace -> HAS_MONITORING -> GovernmentMonitoringSnapshot
    await this.kgEngine.createRelationship(organizationId, workspaceId, snapshotId, "HAS_MONITORING");

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentMonitoringSnapshotCreated",
        `Government Monitoring Snapshot '${snapshotId}' registered for workspace ${workspaceId}.`,
        { snapshotId }
      ).catch(() => {});
    }

    // DB Log
    await this.dbAdapter.createGovernmentReportLog({
      organizationId,
      workspaceId,
      eventType: "GovernmentMonitoringSnapshotCreated",
      details: { snapshotId, snapshotType: snapshotData.snapshotType }
    }).catch(() => {});

    return saved;
  }

  public async getGovernmentReports(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentReport[]> {
    return await this.dbAdapter.getGovernmentReports(organizationId, workspaceId);
  }

  public async getGovernmentReport(
    organizationId: string,
    workspaceId: string,
    id: string
  ): Promise<GovernmentReport | null> {
    const report = await this.dbAdapter.getGovernmentReport(id);
    if (!report) return null;
    if (report.organizationId !== organizationId || report.workspaceId !== workspaceId) {
      return null;
    }
    return report;
  }

  public async getExecutiveBriefs(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentExecutiveBrief[]> {
    return await this.dbAdapter.getExecutiveBriefs(organizationId, workspaceId);
  }

  public async getExecutiveBrief(
    organizationId: string,
    workspaceId: string,
    id: string
  ): Promise<GovernmentExecutiveBrief | null> {
    const brief = await this.dbAdapter.getExecutiveBrief(id);
    if (!brief) return null;
    if (brief.organizationId !== organizationId || brief.workspaceId !== workspaceId) {
      return null;
    }
    return brief;
  }

  public async getMonitoringSnapshots(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentMonitoringSnapshot[]> {
    return await this.dbAdapter.getMonitoringSnapshots(organizationId, workspaceId);
  }

  public async getGovernmentSummary(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentSummary> {
    const reports = await this.getGovernmentReports(organizationId, workspaceId);
    const briefs = await this.getExecutiveBriefs(organizationId, workspaceId);
    const snapshots = await this.getMonitoringSnapshots(organizationId, workspaceId);

    // Retrieve real indicators, goals, and results from databases
    const indicators = await this.dbAdapter.getGovernmentIndicators(organizationId, workspaceId).catch(() => []);
    const goals = await this.dbAdapter.getGovernmentGoals(organizationId, workspaceId).catch(() => []);
    const results = await this.dbAdapter.getGovernmentResults(organizationId, workspaceId).catch(() => []);

    const indicatorsCount = indicators.length;
    const goalsCount = goals.length;
    const resultsCount = results.length;

    const reportsCount = reports.length;
    const briefsCount = briefs.length;
    const snapshotsCount = snapshots.length;

    const recentReports = reports.slice(0, 5);
    const recentBriefs = briefs.slice(0, 5);

    // Core health evaluation
    let status: GovernmentDataStatus = "READY";
    if (indicatorsCount === 0 && goalsCount === 0 && resultsCount === 0) {
      status = "NO_DATA";
    } else if (indicatorsCount === 0 || goalsCount === 0) {
      status = "PARTIAL_DATA";
    }

    const summary: GovernmentSummary = {
      status,
      reportsCount,
      briefsCount,
      snapshotsCount,
      indicatorsCount,
      goalsCount,
      resultsCount,
      recentReports,
      recentBriefs
    };

    // Logging Summary Request
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentSummaryGenerated",
        `Government Summary successfully compiled on-demand for workspace ${workspaceId}.`,
        { reportsCount, briefsCount, indicatorsCount }
      ).catch(() => {});
    }

    return summary;
  }
}
