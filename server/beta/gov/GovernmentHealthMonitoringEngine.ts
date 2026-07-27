import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import {
  GovernmentHealthGoal,
  GovernmentHealthResult,
  GovernmentHealthMonitoring,
  GovernmentHealthEvidence,
  GovernmentHealthIssue,
  GovernmentHealthSnapshot,
  GovernmentHealthMonitoringSummary,
  GovernmentHealthMonitoringStatus
} from "../core/types";

export class GovernmentHealthMonitoringEngine {
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

  public async getGoals(organizationId: string, workspaceId: string): Promise<GovernmentHealthGoal[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getHealthGoals(organizationId, workspaceId);
  }

  public async createGoal(data: any): Promise<GovernmentHealthGoal> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const goal = await this.dbAdapter.createHealthGoal(data);
    
    // Knowledge Graph integration logic
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: goal.id as string,
         type: "GovernmentHealthGoal",
         name: data.name || "Health Goal",
         properties: { ...goal }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, goal.id as string, "HAS_GOAL");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: goal.id as string,
        entityType: "GovernmentHealthGoal",
        eventType: "GovernmentHealthGoalCreated",
        */

    return goal;
  }

  public async getResults(organizationId: string, workspaceId: string): Promise<GovernmentHealthResult[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getHealthResults(organizationId, workspaceId);
  }

  public async createResult(data: any): Promise<GovernmentHealthResult> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const result = await this.dbAdapter.createHealthResult(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: result.id as string,
         type: "GovernmentHealthResult",
         name: data.name || "Health Result",
         properties: { ...result }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, result.id as string, "HAS_RESULT");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: result.id as string,
        entityType: "GovernmentHealthResult",
        eventType: "GovernmentHealthResultCreated",
        */

    return result;
  }

  public async getMonitorings(organizationId: string, workspaceId: string): Promise<GovernmentHealthMonitoring[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getHealthMonitorings(organizationId, workspaceId);
  }

  public async createMonitoring(data: any): Promise<GovernmentHealthMonitoring> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const monitoring = await this.dbAdapter.createHealthMonitoring(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: monitoring.id as string,
         type: "GovernmentHealthMonitoring",
         name: data.name || "Health Monitoring",
         properties: { ...monitoring }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, monitoring.id as string, "HAS_MONITORING");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: monitoring.id as string,
        entityType: "GovernmentHealthMonitoring",
        eventType: "GovernmentHealthMonitoringCreated",
        */

    return monitoring;
  }

  public async getEvidences(organizationId: string, workspaceId: string): Promise<GovernmentHealthEvidence[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getHealthEvidences(organizationId, workspaceId);
  }

  public async createEvidence(data: any): Promise<GovernmentHealthEvidence> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const evidence = await this.dbAdapter.createHealthEvidence(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: evidence.id as string,
         type: "GovernmentHealthEvidence",
         name: data.name || "Health Evidence",
         properties: { ...evidence }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, evidence.id as string, "HAS_EVIDENCE");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: evidence.id as string,
        entityType: "GovernmentHealthEvidence",
        eventType: "GovernmentHealthEvidenceCreated",
        */

    return evidence;
  }

  public async getIssues(organizationId: string, workspaceId: string): Promise<GovernmentHealthIssue[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getHealthIssues(organizationId, workspaceId);
  }

  public async createIssue(data: any): Promise<GovernmentHealthIssue> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const issue = await this.dbAdapter.createHealthIssue(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: issue.id as string,
         type: "GovernmentHealthIssue",
         name: data.name || "Health Issue",
         properties: { ...issue }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, issue.id as string, "HAS_ISSUE");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: issue.id as string,
        entityType: "GovernmentHealthIssue",
        eventType: "GovernmentHealthIssueCreated",
        */

    return issue;
  }

  public async getSnapshots(organizationId: string, workspaceId: string): Promise<GovernmentHealthSnapshot[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getHealthSnapshots(organizationId, workspaceId);
  }

  public async createSnapshot(data: any): Promise<GovernmentHealthSnapshot> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const snapshot = await this.dbAdapter.createHealthSnapshot(data);
    
    if (data.programId) {
       await this.kgEngine.createNode(data.organizationId, data.workspaceId, {
         id: snapshot.id as string,
         type: "GovernmentHealthSnapshot",
         name: data.name || "Health Snapshot",
         properties: { ...snapshot }
       });
       await this.kgEngine.createRelationship(data.organizationId, data.programId, snapshot.id as string, "HAS_SNAPSHOT");
    }

    await this.memoryOS.registerEvent({ organizationId: data.organizationId, workspaceId: data.workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: snapshot.id as string,
        entityType: "GovernmentHealthSnapshot",
        eventType: "GovernmentHealthSnapshotCreated",
        */

    return snapshot;
  }

  public async getMonitoringSummary(organizationId: string, workspaceId: string): Promise<GovernmentHealthMonitoringSummary> {
    this.validateTenant(organizationId, workspaceId);
    
    const goals = await this.getGoals(organizationId, workspaceId);
    const results = await this.getResults(organizationId, workspaceId);
    const monitorings = await this.getMonitorings(organizationId, workspaceId);
    const evidences = await this.getEvidences(organizationId, workspaceId);
    const issues = await this.getIssues(organizationId, workspaceId);
    const snapshots = await this.getSnapshots(organizationId, workspaceId);

    const hasData = goals.length > 0 || monitorings.length > 0;

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

  public async getMonitoringStatus(organizationId: string, workspaceId: string): Promise<GovernmentHealthMonitoringStatus> {
    this.validateTenant(organizationId, workspaceId);
    
    const goals = await this.getGoals(organizationId, workspaceId);
    const results = await this.getResults(organizationId, workspaceId);
    const monitorings = await this.getMonitorings(organizationId, workspaceId);
    const issues = await this.getIssues(organizationId, workspaceId);
    
    let dbStatus: GovernmentHealthMonitoringStatus["status"] = "NO_DATA";
    if (goals.length > 0 || monitorings.length > 0 || results.length > 0 || issues.length > 0) {
      dbStatus = "PARTIAL_DATA";
    }
    if (goals.length > 0 && monitorings.length > 0 && results.length > 0) {
      dbStatus = "READY";
    }

    const goalsTrackedRate = goals.length > 0 ? 100 : 0;
    const resultsAchievedRate = results.length > 0 ? (results.filter(r => r.status === "COMPLETED" || r.status === "ACHIEVED").length / results.length) * 100 : 0;
    const issuesResolvedRate = issues.length > 0 ? (issues.filter(i => i.status === "COMPLETED" || i.status === "RESOLVED").length / issues.length) * 100 : (dbStatus !== "NO_DATA" ? 100 : 0);
    
    let healthScore = 0;
    if (dbStatus !== "NO_DATA") {
      healthScore = Math.round((goalsTrackedRate + resultsAchievedRate + issuesResolvedRate) / 3);
    }
    
    const status: GovernmentHealthMonitoringStatus = {
      status: dbStatus,
      healthScore,
      metrics: {
        goalsTrackedRate,
        resultsAchievedRate,
        issuesResolvedRate,
      }
    };

    await this.memoryOS.registerEvent({ organizationId, workspaceId, type: "Generic", content: "Event", metadata: {} }); /*
        entityId: workspaceId,
        entityType: "GovernmentHealthMonitoringStatus",
        eventType: "GovernmentHealthMonitoringStatusComputed",
        */

    return status;
  }
}
