import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentEducationGoal,
  GovernmentEducationResult,
  GovernmentEducationMonitoring,
  GovernmentEducationEvidence,
  GovernmentEducationIssue,
  GovernmentEducationSnapshot,
  GovernmentEducationMonitoringSummary,
  GovernmentEducationMonitoringStatusResult
} from "../core/types";

export class GovernmentEducationMonitoringEngine {
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

  // Goals
  public async getGoals(organizationId: string, workspaceId: string): Promise<GovernmentEducationGoal[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationGoals(organizationId, workspaceId);
  }

  public async createGoal(data: any): Promise<GovernmentEducationGoal> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const goal = await this.dbAdapter.createEducationGoal(data);
    
    await this.memoryOS.registerEvent({
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        type: "GovernmentEducationGoalCreated",
        content: "GovernmentEducationGoalCreated: " + goal.id,
        metadata: { goalId: goal.id }
    });

    return goal;
  }

  // Results
  public async getResults(organizationId: string, workspaceId: string): Promise<GovernmentEducationResult[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationResults(organizationId, workspaceId);
  }

  public async createResult(data: any): Promise<GovernmentEducationResult> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const result = await this.dbAdapter.createEducationResult(data);
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "GovernmentEducationResultCreated",
      content: "GovernmentEducationResultCreated: " + result.id,
      metadata: { resultId: result.id }
    });

    return result;
  }

  // Monitoring
  public async getMonitorings(organizationId: string, workspaceId: string): Promise<GovernmentEducationMonitoring[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationMonitorings(organizationId, workspaceId);
  }

  public async createMonitoring(data: any): Promise<GovernmentEducationMonitoring> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const monitoring = await this.dbAdapter.createEducationMonitoring(data);
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "GovernmentEducationMonitoringCreated",
      content: "GovernmentEducationMonitoringCreated: " + monitoring.id,
      metadata: { monitoringId: monitoring.id }
    });

    return monitoring;
  }

  // Evidences
  public async getEvidences(organizationId: string, workspaceId: string): Promise<GovernmentEducationEvidence[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationEvidences(organizationId, workspaceId);
  }

  public async createEvidence(data: any): Promise<GovernmentEducationEvidence> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const evidence = await this.dbAdapter.createEducationEvidence(data);
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "GovernmentEducationEvidenceCreated",
      content: "GovernmentEducationEvidenceCreated: " + evidence.id,
      metadata: { evidenceId: evidence.id }
    });

    return evidence;
  }

  // Issues
  public async getIssues(organizationId: string, workspaceId: string): Promise<GovernmentEducationIssue[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationIssues(organizationId, workspaceId);
  }

  public async createIssue(data: any): Promise<GovernmentEducationIssue> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const issue = await this.dbAdapter.createEducationIssue(data);
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "GovernmentEducationIssueCreated",
      content: "GovernmentEducationIssueCreated: " + issue.id,
      metadata: { issueId: issue.id }
    });

    return issue;
  }

  // Snapshots
  public async getSnapshots(organizationId: string, workspaceId: string): Promise<GovernmentEducationSnapshot[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getEducationSnapshots(organizationId, workspaceId);
  }

  public async createSnapshot(data: any): Promise<GovernmentEducationSnapshot> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const snapshot = await this.dbAdapter.createEducationSnapshot(data);
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "GovernmentEducationSnapshotCreated",
      content: "GovernmentEducationSnapshotCreated: " + snapshot.id,
      metadata: { snapshotId: snapshot.id }
    });

    return snapshot;
  }

  // Summary
  public async getMonitoringSummary(organizationId: string, workspaceId: string): Promise<GovernmentEducationMonitoringSummary> {
    this.validateTenant(organizationId, workspaceId);
    
    const goals = await this.getGoals(organizationId, workspaceId);
    const results = await this.getResults(organizationId, workspaceId);
    const monitorings = await this.getMonitorings(organizationId, workspaceId);
    const evidences = await this.getEvidences(organizationId, workspaceId);
    const issues = await this.getIssues(organizationId, workspaceId);
    const snapshots = await this.getSnapshots(organizationId, workspaceId);

    const hasData = goals.length > 0 || results.length > 0;

    return {
      status: hasData ? "READY" : "NO_DATA",
      workspaceId,
      goalsCount: goals.length,
      resultsCount: results.length,
      monitoringsCount: monitorings.length,
      evidencesCount: evidences.length,
      issuesCount: issues.length,
      snapshotsCount: snapshots.length,
      updatedAt: new Date().toISOString()
    };
  }

  // Status
  public async getMonitoringStatus(organizationId: string, workspaceId: string): Promise<GovernmentEducationMonitoringStatusResult> {
    this.validateTenant(organizationId, workspaceId);
    
    const goals = await this.getGoals(organizationId, workspaceId);
    const issues = await this.getIssues(organizationId, workspaceId);
    
    let dbStatus: GovernmentEducationMonitoringStatusResult["status"] = "NO_DATA";
    if (goals.length > 0) dbStatus = "PARTIAL_DATA";
    if (goals.length > 0 && issues.length < 5) dbStatus = "READY";
    
    const status: GovernmentEducationMonitoringStatusResult = {
      status: dbStatus,
      details: {
        goalsTracked: goals.length,
        pendingIssues: issues.filter((i: any) => i.status !== "COMPLETED").length,
        lastComputed: new Date().toISOString()
      }
    };

    await this.memoryOS.registerEvent({
      organizationId: organizationId,
      workspaceId: workspaceId,
      type: "GovernmentEducationMonitoringStatusComputed",
      content: "GovernmentEducationMonitoringStatusComputed",
      metadata: { status }
    });

    return status;
  }
}
