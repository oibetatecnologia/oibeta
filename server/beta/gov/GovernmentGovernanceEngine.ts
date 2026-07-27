import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import { GovernmentWorkspaceEngine } from "./GovernmentWorkspaceEngine";
import { GovernmentProgramManagementEngine } from "./GovernmentProgramManagementEngine";
import { GovernmentPerformanceManagementEngine } from "./GovernmentPerformanceManagementEngine";
import { GovernmentReportingEngine } from "./GovernmentReportingEngine";
import {
  GovernmentGovernanceReview,
  GovernmentExecutiveMeeting,
  GovernmentStrategicCycle,
  GovernmentDecision,
  GovernmentMonitoringReview,
  GovernmentGovernanceSummary,
  GovernmentGovernanceHealth,
  GovernmentGovernanceStatus,
  GovernmentDataStatus
} from "../core/types";

export class GovernmentGovernanceEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private govWorkspaceEngine: GovernmentWorkspaceEngine,
    private govProgramManagementEngine: GovernmentProgramManagementEngine,
    private govPerformanceManagementEngine: GovernmentPerformanceManagementEngine,
    private govReportingEngine: GovernmentReportingEngine,
    private memoryOS: MemoryOS,
    private kgEngine: KnowledgeGraphEngine,
    private wsOrchestrator: WorkspaceIntelligenceOrchestrator | undefined,
    private opCommandCenterEngine: OperationalCommandCenterEngine
  ) {}

  public async createGovernanceReview(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentGovernanceReview> {
    const reviewId = data.id || `rev-${Date.now()}`;
    const status: GovernmentGovernanceStatus = data.status || "PLANNED";

    const reviewData = {
      id: reviewId,
      organizationId,
      workspaceId,
      reviewType: data.reviewType || "GENERAL",
      status,
      metadata: data.metadata || {}
    };

    const saved = await this.dbAdapter.createGovernanceReview(reviewData);

    // Knowledge Graph Node and Relationships
    await this.kgEngine.createNode(reviewId, "GovernmentGovernanceReview", {
      organizationId,
      workspaceId,
      name: data.title || `Governance Review ${reviewId}`,
      description: reviewData.metadata?.description || "Government Governance Review"
    });

    // GovernmentWorkspace -> HAS_GOVERNANCE_REVIEW -> GovernmentGovernanceReview
    await this.kgEngine.createRelationship(organizationId, workspaceId, reviewId, "HAS_GOVERNANCE_REVIEW");

    // GovernmentGovernanceReview -> GENERATED_FROM -> GovernmentReport
    if (reviewData.metadata?.reportId) {
      await this.kgEngine.createRelationship(
        organizationId,
        reviewId,
        reviewData.metadata.reportId,
        "GENERATED_FROM"
      );
    }

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentGovernanceReviewCreated",
        `Government Governance Review de tipo '${reviewData.reviewType}' registrada com sucesso no workspace ${workspaceId}.`,
        { reviewId }
      ).catch(() => {});
    }

    return saved;
  }

  public async createExecutiveMeeting(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentExecutiveMeeting> {
    const meetingId = data.id || `meet-${Date.now()}`;
    const status: GovernmentGovernanceStatus = data.status || "PLANNED";

    const meetingData = {
      id: meetingId,
      organizationId,
      workspaceId,
      meetingType: data.meetingType || "GENERAL",
      status,
      metadata: data.metadata || {}
    };

    const saved = await this.dbAdapter.createExecutiveMeeting(meetingData);

    // Knowledge Graph Node and Relationships
    await this.kgEngine.createNode(meetingId, "GovernmentExecutiveMeeting", {
      organizationId,
      workspaceId,
      name: data.title || `Executive Meeting ${meetingId}`,
      description: meetingData.metadata?.description || "Government Executive Meeting"
    });

    // GovernmentWorkspace -> HAS_EXECUTIVE_MEETING -> GovernmentExecutiveMeeting
    await this.kgEngine.createRelationship(organizationId, workspaceId, meetingId, "HAS_EXECUTIVE_MEETING");

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentExecutiveMeetingCreated",
        `Reunião Executiva de tipo '${meetingData.meetingType}' registrada com sucesso no workspace ${workspaceId}.`,
        { meetingId }
      ).catch(() => {});
    }

    return saved;
  }

  public async createStrategicCycle(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentStrategicCycle> {
    const cycleId = data.id || `cyc-${Date.now()}`;
    const status: GovernmentGovernanceStatus = data.status || "PLANNED";

    const cycleData = {
      id: cycleId,
      organizationId,
      workspaceId,
      cycleType: data.cycleType || "GENERAL",
      status,
      metadata: data.metadata || {}
    };

    const saved = await this.dbAdapter.createStrategicCycle(cycleData);

    // Knowledge Graph Node and Relationships
    await this.kgEngine.createNode(cycleId, "GovernmentStrategicCycle", {
      organizationId,
      workspaceId,
      name: data.title || `Strategic Cycle ${cycleId}`,
      description: cycleData.metadata?.description || "Government Strategic Management Cycle"
    });

    // GovernmentWorkspace -> HAS_STRATEGIC_CYCLE -> GovernmentStrategicCycle
    await this.kgEngine.createRelationship(organizationId, workspaceId, cycleId, "HAS_STRATEGIC_CYCLE");

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentStrategicCycleCreated",
        `Ciclo de Gestão de tipo '${cycleData.cycleType}' registrado com sucesso no workspace ${workspaceId}.`,
        { cycleId }
      ).catch(() => {});
    }

    return saved;
  }

  public async createGovernmentDecision(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentDecision> {
    const decisionId = data.id || `dec-${Date.now()}`;
    const status: GovernmentGovernanceStatus = data.status || "PLANNED";

    const decisionData = {
      id: decisionId,
      organizationId,
      workspaceId,
      decisionType: data.decisionType || "RESOLUTION",
      status,
      metadata: data.metadata || {}
    };

    const saved = await this.dbAdapter.createGovernmentDecision(decisionData);

    // Knowledge Graph Node and Relationships
    await this.kgEngine.createNode(decisionId, "GovernmentDecision", {
      organizationId,
      workspaceId,
      name: data.title || `Government Decision ${decisionId}`,
      description: decisionData.metadata?.description || "Official Government Decision"
    });

    // GovernmentWorkspace -> HAS_DECISION -> GovernmentDecision
    await this.kgEngine.createRelationship(organizationId, workspaceId, decisionId, "HAS_DECISION");

    // GovernmentDecision -> GENERATED_FROM -> GovernmentExecutiveBrief
    if (decisionData.metadata?.briefId) {
      await this.kgEngine.createRelationship(
        organizationId,
        decisionId,
        decisionData.metadata.briefId,
        "GENERATED_FROM"
      );
    } else if (decisionData.metadata?.executiveBriefId) {
      await this.kgEngine.createRelationship(
        organizationId,
        decisionId,
        decisionData.metadata.executiveBriefId,
        "GENERATED_FROM"
      );
    }

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentDecisionCreated",
        `Decisão Governamental de tipo '${decisionData.decisionType}' registrada com sucesso no workspace ${workspaceId}.`,
        { decisionId }
      ).catch(() => {});
    }

    return saved;
  }

  public async createMonitoringReview(
    organizationId: string,
    workspaceId: string,
    data: any
  ): Promise<GovernmentMonitoringReview> {
    const reviewId = data.id || `mon-${Date.now()}`;
    const status: GovernmentGovernanceStatus = data.status || "PLANNED";

    const reviewData = {
      id: reviewId,
      organizationId,
      workspaceId,
      reviewType: data.reviewType || "MONITORING",
      status,
      metadata: data.metadata || {}
    };

    const saved = await this.dbAdapter.createMonitoringReview(reviewData);

    // Knowledge Graph Node and Relationships
    await this.kgEngine.createNode(reviewId, "GovernmentMonitoringReview", {
      organizationId,
      workspaceId,
      name: data.title || `Monitoring Review ${reviewId}`,
      description: reviewData.metadata?.description || "Government Monitoring Review"
    });

    // GovernmentWorkspace -> HAS_MONITORING_REVIEW -> GovernmentMonitoringReview
    await this.kgEngine.createRelationship(organizationId, workspaceId, reviewId, "HAS_MONITORING_REVIEW");

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentMonitoringReviewCreated",
        `Monitoramento Estratégico de tipo '${reviewData.reviewType}' registrado no workspace ${workspaceId}.`,
        { reviewId }
      ).catch(() => {});
    }

    return saved;
  }

  public async getGovernanceReviews(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentGovernanceReview[]> {
    return await this.dbAdapter.getGovernanceReviews(organizationId, workspaceId);
  }

  public async getGovernanceReviewsById(
    organizationId: string,
    workspaceId: string,
    id: string
  ): Promise<GovernmentGovernanceReview | null> {
    const record = await this.dbAdapter.getGovernanceReview(id);
    if (!record) return null;
    if (record.organizationId !== organizationId || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  public async getExecutiveMeetings(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentExecutiveMeeting[]> {
    return await this.dbAdapter.getExecutiveMeetings(organizationId, workspaceId);
  }

  public async getExecutiveMeetingById(
    organizationId: string,
    workspaceId: string,
    id: string
  ): Promise<GovernmentExecutiveMeeting | null> {
    const record = await this.dbAdapter.getExecutiveMeeting(id);
    if (!record) return null;
    if (record.organizationId !== organizationId || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  public async getStrategicCycles(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentStrategicCycle[]> {
    return await this.dbAdapter.getStrategicCycles(organizationId, workspaceId);
  }

  public async getStrategicCycleById(
    organizationId: string,
    workspaceId: string,
    id: string
  ): Promise<GovernmentStrategicCycle | null> {
    const record = await this.dbAdapter.getStrategicCycle(id);
    if (!record) return null;
    if (record.organizationId !== organizationId || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  public async getGovernmentDecisions(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentDecision[]> {
    return await this.dbAdapter.getGovernmentDecisions(organizationId, workspaceId);
  }

  public async getGovernmentDecisionById(
    organizationId: string,
    workspaceId: string,
    id: string
  ): Promise<GovernmentDecision | null> {
    const record = await this.dbAdapter.getGovernmentDecision(id);
    if (!record) return null;
    if (record.organizationId !== organizationId || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  public async getMonitoringReviews(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentMonitoringReview[]> {
    return await this.dbAdapter.getMonitoringReviews(organizationId, workspaceId);
  }

  public async getMonitoringReviewById(
    organizationId: string,
    workspaceId: string,
    id: string
  ): Promise<GovernmentMonitoringReview | null> {
    const record = await this.dbAdapter.getMonitoringReview(id);
    if (!record) return null;
    if (record.organizationId !== organizationId || record.workspaceId !== workspaceId) {
      return null;
    }
    return record;
  }

  public async getGovernanceSummary(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentGovernanceSummary> {
    const reviews = await this.getGovernanceReviews(organizationId, workspaceId);
    const meetings = await this.getExecutiveMeetings(organizationId, workspaceId);
    const cycles = await this.getStrategicCycles(organizationId, workspaceId);
    const decisions = await this.getGovernmentDecisions(organizationId, workspaceId);
    const monitoring = await this.getMonitoringReviews(organizationId, workspaceId);

    const reviewsCount = reviews.length;
    const meetingsCount = meetings.length;
    const cyclesCount = cycles.length;
    const decisionsCount = decisions.length;
    const monitoringReviewsCount = monitoring.length;

    const recentReviews = reviews.slice(0, 5);
    const recentMeetings = meetings.slice(0, 5);
    const recentDecisions = decisions.slice(0, 5);

    let status: GovernmentGovernanceStatus = "COMPLETED";

    const totalCount = reviewsCount + meetingsCount + cyclesCount + decisionsCount + monitoringReviewsCount;

    if (totalCount === 0) {
      status = "NO_DATA";
    } else {
      const hasInProgress = [...reviews, ...meetings, ...cycles, ...decisions, ...monitoring]
        .some((item) => item.status === "IN_PROGRESS");
      const hasPlanned = [...reviews, ...meetings, ...cycles, ...decisions, ...monitoring]
        .some((item) => item.status === "PLANNED");

      if (hasInProgress) {
        status = "IN_PROGRESS";
      } else if (hasPlanned) {
        status = "PLANNED";
      }
    }

    return {
      status,
      reviewsCount,
      meetingsCount,
      cyclesCount,
      decisionsCount,
      monitoringReviewsCount,
      recentReviews,
      recentMeetings,
      recentDecisions
    };
  }

  public async getGovernanceHealth(
    organizationId: string,
    workspaceId: string
  ): Promise<GovernmentGovernanceHealth> {
    const reviews = await this.getGovernanceReviews(organizationId, workspaceId);
    const meetings = await this.getExecutiveMeetings(organizationId, workspaceId);
    const cycles = await this.getStrategicCycles(organizationId, workspaceId);
    const decisions = await this.getGovernmentDecisions(organizationId, workspaceId);
    const monitoring = await this.getMonitoringReviews(organizationId, workspaceId);

    const allItems = [...reviews, ...meetings, ...cycles, ...decisions, ...monitoring];
    const totalCount = allItems.length;

    let status: GovernmentDataStatus = "READY";
    let completionRate = 0;
    let activeCyclesCount = cycles.filter(c => c.status === "IN_PROGRESS").length;
    let pendingDecisionsCount = decisions.filter(d => d.status === "PLANNED" || d.status === "IN_PROGRESS").length;
    let healthScore = 100;

    if (totalCount === 0) {
      status = "NO_DATA";
      healthScore = 0;
    } else {
      const completedCount = allItems.filter(i => i.status === "COMPLETED").length;
      completionRate = Math.round((completedCount / totalCount) * 100);
      healthScore = completionRate;

      if (healthScore < 50) {
        status = "PARTIAL_DATA";
      }
    }

    // Memory OS Event Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentGovernanceHealthComputed",
        `Governança da saúde computada para o workspace ${workspaceId}. Score de Saúde: ${healthScore}%. Total de registros: ${totalCount}.`,
        { healthScore, totalCount }
      ).catch(() => {});
    }

    return {
      status,
      completionRate,
      activeCyclesCount,
      pendingDecisionsCount,
      healthScore
    };
  }
}
