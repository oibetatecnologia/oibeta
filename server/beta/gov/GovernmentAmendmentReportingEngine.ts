import crypto from "crypto";
import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import { GovernmentWorkspaceEngine } from "./GovernmentWorkspaceEngine";
import { GovernmentReportingEngine } from "./GovernmentReportingEngine";
import { GovernmentGovernanceEngine } from "./GovernmentGovernanceEngine";
import { GovernmentAmendmentEngine } from "./GovernmentAmendmentEngine";
import { GovernmentAmendmentMonitoringEngine } from "./GovernmentAmendmentMonitoringEngine";

import {
  GovernmentAmendmentReport,
  GovernmentAmendmentExecutiveBrief,
  GovernmentAmendmentSnapshot,
  GovernmentAmendmentReview,
  GovernmentAmendmentCycle,
  GovernmentAmendmentReportingSummary,
  GovernmentAmendmentReportingHealth
} from "../core/types";

export class GovernmentAmendmentReportingEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private amendmentEngine: GovernmentAmendmentEngine,
    private monitoringEngine: GovernmentAmendmentMonitoringEngine,
    private workspaceEngine?: GovernmentWorkspaceEngine,
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

  // --- REPORT ---
  public async createReport(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
    amendmentId?: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentReport> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const report = await this.dbAdapter.createGovernmentAmendmentReport({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amId = data.amendmentId || data.metadata?.amendmentId;
    if (amId) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentAmendment",
        `Emenda Parlamentar ${amId}`,
        `Emenda registrada no workspace.`,
        amId,
        {}
      );

      const reportNodeId = report.id;
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentReport",
        `Relatório de Emenda ${report.id}`,
        `Relatório com status ${report.status}`,
        reportNodeId,
        report
      );

      await this.kgEngine.createRelationship(data.organizationId, amId, reportNodeId, "HAS_REPORT");
    }

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentReportCreated",
        `Novo relatório de emenda registrado: ${report.id}`,
        { reportId: report.id, status: report.status, amendmentId: amId }
      ).catch(() => {});
    }

    return report;
  }

  public async getReports(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentReport[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getGovernmentAmendmentReports(organizationId, workspaceId);
    return result as GovernmentAmendmentReport[];
  }

  // --- EXECUTIVE BRIEF ---
  public async createExecutiveBrief(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
    amendmentId?: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentExecutiveBrief> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const brief = await this.dbAdapter.createGovernmentAmendmentExecutiveBrief({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amId = data.amendmentId || data.metadata?.amendmentId;
    if (amId) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentAmendment",
        `Emenda Parlamentar ${amId}`,
        `Emenda registrada no workspace.`,
        amId,
        {}
      );

      const briefNodeId = brief.id;
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentExecutiveBrief",
        `Briefing Executivo de Emenda ${brief.id}`,
        `Briefing executivo com status ${brief.status}`,
        briefNodeId,
        brief
      );

      await this.kgEngine.createRelationship(data.organizationId, amId, briefNodeId, "HAS_BRIEF");
    }

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentExecutiveBriefCreated",
        `Novo briefing executivo de emenda registrado: ${brief.id}`,
        { briefId: brief.id, status: brief.status, amendmentId: amId }
      ).catch(() => {});
    }

    return brief;
  }

  public async getExecutiveBriefs(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentExecutiveBrief[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getGovernmentAmendmentExecutiveBriefs(organizationId, workspaceId);
    return result as GovernmentAmendmentExecutiveBrief[];
  }

  // --- SNAPSHOT ---
  public async createSnapshot(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
    amendmentId?: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentSnapshot> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const snapshot = await this.dbAdapter.createGovernmentAmendmentSnapshot({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amId = data.amendmentId || data.metadata?.amendmentId;
    if (amId) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentAmendment",
        `Emenda Parlamentar ${amId}`,
        `Emenda registrada no workspace.`,
        amId,
        {}
      );

      const snapshotNodeId = snapshot.id;
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentMonitoringSnapshot",
        `Snapshot de Monitoramento de Emenda ${snapshot.id}`,
        `Snapshot registrado com status ${snapshot.status}`,
        snapshotNodeId,
        snapshot
      );

      await this.kgEngine.createRelationship(data.organizationId, amId, snapshotNodeId, "HAS_SNAPSHOT");
    }

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentSnapshotCreated",
        `Novo snapshot de monitoramento de emenda registrado: ${snapshot.id}`,
        { snapshotId: snapshot.id, status: snapshot.status, amendmentId: amId }
      ).catch(() => {});
    }

    return snapshot;
  }

  public async getSnapshots(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentSnapshot[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getGovernmentAmendmentSnapshots(organizationId, workspaceId);
    return result as GovernmentAmendmentSnapshot[];
  }

  // --- REVIEW ---
  public async createReview(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
    amendmentId?: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentReview> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const review = await this.dbAdapter.createGovernmentAmendmentReview({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amId = data.amendmentId || data.metadata?.amendmentId;
    if (amId) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentAmendment",
        `Emenda Parlamentar ${amId}`,
        `Emenda registrada no workspace.`,
        amId,
        {}
      );

      const reviewNodeId = review.id;
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentMonitoringReview",
        `Revisão Executiva de Emenda ${review.id}`,
        `Revisão registrada com status ${review.status}`,
        reviewNodeId,
        review
      );

      await this.kgEngine.createRelationship(data.organizationId, amId, reviewNodeId, "HAS_MONITORING_REVIEW");
    }

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentReviewCreated",
        `Nova revisão executiva de emenda registrada: ${review.id}`,
        { reviewId: review.id, status: review.status, amendmentId: amId }
      ).catch(() => {});
    }

    return review;
  }

  public async getReviews(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentReview[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getGovernmentAmendmentReviews(organizationId, workspaceId);
    return result as GovernmentAmendmentReview[];
  }

  // --- CYCLE ---
  public async createCycle(data: {
    id?: string;
    organizationId: string;
    workspaceId: string;
    status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
    amendmentId?: string;
    metadata?: any;
  }): Promise<GovernmentAmendmentCycle> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const cycle = await this.dbAdapter.createGovernmentAmendmentCycle({
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      status: data.status,
      metadata: data.metadata || {}
    });

    // KG Integration
    const amId = data.amendmentId || data.metadata?.amendmentId;
    if (amId) {
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentAmendment",
        `Emenda Parlamentar ${amId}`,
        `Emenda registrada no workspace.`,
        amId,
        {}
      );

      const cycleNodeId = cycle.id;
      await this.kgEngine.ensureNode(
        data.organizationId,
        data.workspaceId,
        "GovernmentStrategicCycle",
        `Ciclo de Acompanhamento de Emenda ${cycle.id}`,
        `Ciclo de acompanhamento registrado com status ${cycle.status}`,
        cycleNodeId,
        cycle
      );

      await this.kgEngine.createRelationship(data.organizationId, amId, cycleNodeId, "HAS_STRATEGIC_CYCLE");
    }

    // MemoryOS Logging
    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        data.organizationId,
        "GovernmentAmendmentCycleCreated",
        `Novo ciclo de acompanhamento de emenda registrado: ${cycle.id}`,
        { cycleId: cycle.id, status: cycle.status, amendmentId: amId }
      ).catch(() => {});
    }

    return cycle;
  }

  public async getCycles(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentCycle[]> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.dbAdapter.getGovernmentAmendmentCycles(organizationId, workspaceId);
    return result as GovernmentAmendmentCycle[];
  }

  // --- REPORTING SUMMARY ---
  public async getReportingSummary(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentReportingSummary> {
    this.validateTenant(organizationId, workspaceId);

    const [reports, executiveBriefs, snapshots, reviews, cycles] = await Promise.all([
      this.getReports(organizationId, workspaceId),
      this.getExecutiveBriefs(organizationId, workspaceId),
      this.getSnapshots(organizationId, workspaceId),
      this.getReviews(organizationId, workspaceId),
      this.getCycles(organizationId, workspaceId)
    ]);

    const totalCount = reports.length + executiveBriefs.length + snapshots.length + reviews.length + cycles.length;
    const status = totalCount === 0 ? "NO_DATA" : "READY";

    return {
      status,
      workspaceId,
      reportsCount: reports.length,
      executiveBriefsCount: executiveBriefs.length,
      snapshotsCount: snapshots.length,
      reviewsCount: reviews.length,
      cyclesCount: cycles.length,
      updatedAt: new Date().toISOString()
    };
  }

  // --- REPORTING HEALTH ---
  public async getReportingHealth(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentReportingHealth> {
    this.validateTenant(organizationId, workspaceId);

    const [reports, executiveBriefs, snapshots, reviews, cycles] = await Promise.all([
      this.getReports(organizationId, workspaceId),
      this.getExecutiveBriefs(organizationId, workspaceId),
      this.getSnapshots(organizationId, workspaceId),
      this.getReviews(organizationId, workspaceId),
      this.getCycles(organizationId, workspaceId)
    ]);

    const totalCount = reports.length + executiveBriefs.length + snapshots.length + reviews.length + cycles.length;

    if (totalCount === 0) {
      return {
        status: "NO_DATA",
        healthScore: 0,
        metrics: {
          activeReportsRate: 0,
          readyBriefsRate: 0,
          snapshotsAvailabilityRate: 0,
          reviewsCompletionRate: 0,
          activeCyclesRate: 0
        }
      };
    }

    const activeReports = reports.filter(r => ["ACTIVE", "READY", "COMPLETED"].includes(r.status.toUpperCase())).length;
    const activeReportsRate = reports.length > 0 ? Math.round((activeReports / reports.length) * 100) : 100;

    const readyBriefs = executiveBriefs.filter(b => ["READY", "COMPLETED", "ACTIVE"].includes(b.status.toUpperCase())).length;
    const readyBriefsRate = executiveBriefs.length > 0 ? Math.round((readyBriefs / executiveBriefs.length) * 100) : 100;

    const readySnapshots = snapshots.filter(s => ["READY", "COMPLETED", "ACTIVE"].includes(s.status.toUpperCase())).length;
    const snapshotsAvailabilityRate = snapshots.length > 0 ? Math.round((readySnapshots / snapshots.length) * 100) : 100;

    const completedReviews = reviews.filter(r => ["COMPLETED", "READY", "ACTIVE"].includes(r.status.toUpperCase())).length;
    const reviewsCompletionRate = reviews.length > 0 ? Math.round((completedReviews / reviews.length) * 100) : 100;

    const activeCycles = cycles.filter(c => ["ACTIVE", "READY", "COMPLETED"].includes(c.status.toUpperCase())).length;
    const activeCyclesRate = cycles.length > 0 ? Math.round((activeCycles / cycles.length) * 100) : 100;

    const healthScore = Math.round(
      (activeReportsRate + readyBriefsRate + snapshotsAvailabilityRate + reviewsCompletionRate + activeCyclesRate) / 5
    );

    let status: "READY" | "PARTIAL_DATA" | "NO_DATA" = "READY";
    if (healthScore < 60) {
      status = "PARTIAL_DATA";
    }

    const health: GovernmentAmendmentReportingHealth = {
      status,
      healthScore,
      metrics: {
        activeReportsRate,
        readyBriefsRate,
        snapshotsAvailabilityRate,
        reviewsCompletionRate,
        activeCyclesRate
      }
    };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(
        organizationId,
        "GovernmentAmendmentReportingHealthComputed",
        `Calculado indicador de saúde dos relatórios das emendas: ${healthScore}/100.`,
        { workspaceId, healthScore }
      ).catch(() => {});
    }

    return health;
  }
}
