import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ElectoralDomainEngine } from "./ElectoralDomainEngine";
import { ElectoralMemoryEngine } from "./ElectoralMemoryEngine";
import { ElectoralContextEngine } from "./ElectoralContextEngine";
import { TerritoryEngine } from "./TerritoryEngine";
import { CoordinatorEngine } from "./CoordinatorEngine";
import { CampaignInviteEngine } from "./CampaignInviteEngine";
import { ElectoralAnalysisEngine } from "./ElectoralAnalysisEngine";

// Sprint 14.1 Campaign Engines
import { CampaignEngine } from "./CampaignEngine";
import { CampaignObjectiveEngine } from "./CampaignObjectiveEngine";
import { CampaignTaskEngine } from "./CampaignTaskEngine";
import { CampaignProgressEngine } from "./CampaignProgressEngine";
import { CampaignHealthEngine } from "./CampaignHealthEngine";
import { CampaignBriefGenerator } from "./CampaignBriefGenerator";

// Sprint 14.2 Coordinator & Invite System Engines
import { CoordinatorHierarchyEngine } from "./CoordinatorHierarchyEngine";
import { CoordinatorTerritoryEngine } from "./CoordinatorTerritoryEngine";
import { CoordinatorResponsibilityEngine } from "./CoordinatorResponsibilityEngine";
import { CoordinatorHealthEngine } from "./CoordinatorHealthEngine";

// Sprint 14.3 Territorial Intelligence Engine
import { TerritorialIntelligenceEngine } from "./TerritorialIntelligenceEngine";

// Sprint 14.4 Opponent & Political Intelligence Engines
import { OpponentEngine } from "./OpponentEngine";
import { PoliticalGroupEngine } from "./PoliticalGroupEngine";
import { LeadershipEngine } from "./LeadershipEngine";
import { PoliticalRelationshipEngine } from "./PoliticalRelationshipEngine";
import { OpponentTerritoryEngine } from "./OpponentTerritoryEngine";
import { OpponentHealthEngine } from "./OpponentHealthEngine";
import { OpponentBriefGenerator } from "./OpponentBriefGenerator";

// Sprint 14.5 Historical Intelligence Engines
import { HistoricalElectoralEngine } from "./HistoricalElectoralEngine";
import { CandidateHistoryEngine } from "./CandidateHistoryEngine";
import { TerritorialHistoryEngine } from "./TerritorialHistoryEngine";
import { PartyHistoryEngine } from "./PartyHistoryEngine";
import { ElectoralComparisonEngine } from "./ElectoralComparisonEngine";
import { ElectoralTrendEngine } from "./ElectoralTrendEngine";
import { ElectoralRankingEngine } from "./ElectoralRankingEngine";
import { HistoricalBriefGenerator } from "./HistoricalBriefGenerator";

// Sprint 14.5.2 Bulk Import Engine
import { ElectoralBulkImportEngine } from "./ElectoralBulkImportEngine";
import { HistoricalElectoralAggregateEngine } from "./HistoricalElectoralAggregateEngine";

// Sprint 14.6 Analytics Engines
import { HistoricalAnalysisEngine } from "./HistoricalAnalysisEngine";
import { PriorityRankingEngine } from "./PriorityRankingEngine";
import { OpponentAnalysisEngine } from "./OpponentAnalysisEngine";
import { StrategicAnalysisEngine } from "./StrategicAnalysisEngine";
import { EvidenceBasedProjectionEngine } from "./EvidenceBasedProjectionEngine";

export class ElectoralIntelligenceEngine {

  public domainEngine: ElectoralDomainEngine;
  public memoryEngine: ElectoralMemoryEngine;
  public contextEngine: ElectoralContextEngine;
  public territoryEngine: TerritoryEngine;
  public coordinatorEngine: CoordinatorEngine;
  public inviteEngine: CampaignInviteEngine;
  public analysisEngine: ElectoralAnalysisEngine;

  // New campaign engines
  public campaignEngine: CampaignEngine;
  public objectiveEngine: CampaignObjectiveEngine;
  public taskEngine: CampaignTaskEngine;
  public progressEngine: CampaignProgressEngine;
  public healthEngine: CampaignHealthEngine;
  public briefGenerator: CampaignBriefGenerator;

  // Sprint 14.2 Coordinator engines
  public hierarchyEngine: CoordinatorHierarchyEngine;
  public territoryAssignmentEngine: CoordinatorTerritoryEngine;
  public responsibilityEngine: CoordinatorResponsibilityEngine;
  public coordinatorHealthEngine: CoordinatorHealthEngine;

  // Sprint 14.3 Territorial Intelligence Engine
  public territorialIntelligenceEngine: TerritorialIntelligenceEngine;

  // Sprint 14.4 Opponent & Political Intelligence Engines
  public opponentEngine: OpponentEngine;
  public politicalGroupEngine: PoliticalGroupEngine;
  public leadershipEngine: LeadershipEngine;
  public relationshipEngine: PoliticalRelationshipEngine;
  public opponentTerritoryEngine: OpponentTerritoryEngine;
  public opponentHealthEngine: OpponentHealthEngine;
  public opponentBriefGenerator: OpponentBriefGenerator;

  // Sprint 14.5 Historical Intelligence Engines
  public historicalElectoralEngine: HistoricalElectoralEngine;
  public candidateHistoryEngine: CandidateHistoryEngine;
  public territorialHistoryEngine: TerritorialHistoryEngine;
  public partyHistoryEngine: PartyHistoryEngine;
  public electoralComparisonEngine: ElectoralComparisonEngine;
  public electoralTrendEngine: ElectoralTrendEngine;
  public electoralRankingEngine: ElectoralRankingEngine;
  public historicalBriefGenerator: HistoricalBriefGenerator;

  // Sprint 14.5.2 Bulk Import Engine
  public bulkImportEngine: ElectoralBulkImportEngine;

  // Sprint 14.5.3 Aggregate Engine
  public aggregateEngine: HistoricalElectoralAggregateEngine;

  // Sprint 14.6 Analytics Engines
  public historicalAnalysisEngine: HistoricalAnalysisEngine;
  public candidatePriorityRankingEngine: PriorityRankingEngine; // Avoid clash with older ranking engine
  public trueOpponentAnalysisEngine: OpponentAnalysisEngine; // Avoid clash
  public strategicAnalysisEngine: StrategicAnalysisEngine;
  public evidenceBasedProjectionEngine: EvidenceBasedProjectionEngine;

  constructor(

    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {
    this.domainEngine = new ElectoralDomainEngine(dbAdapter, kgEngine);
    this.contextEngine = new ElectoralContextEngine(dbAdapter, kgEngine, this.domainEngine);
    this.memoryEngine = new ElectoralMemoryEngine(dbAdapter, kgEngine, this.domainEngine, this.contextEngine);
    this.territoryEngine = new TerritoryEngine(dbAdapter, kgEngine, this.domainEngine);
    this.coordinatorEngine = new CoordinatorEngine(dbAdapter, kgEngine, this.domainEngine);
    this.inviteEngine = new CampaignInviteEngine(dbAdapter, kgEngine, this.domainEngine);
    this.analysisEngine = new ElectoralAnalysisEngine(dbAdapter, kgEngine, this.domainEngine);

    // Instantiate campaign engines
    this.campaignEngine = new CampaignEngine(dbAdapter, kgEngine);
    this.objectiveEngine = new CampaignObjectiveEngine(dbAdapter, kgEngine);
    this.taskEngine = new CampaignTaskEngine(dbAdapter, kgEngine);
    this.progressEngine = new CampaignProgressEngine();
    this.healthEngine = new CampaignHealthEngine();
    this.briefGenerator = new CampaignBriefGenerator();

    // Instantiate Sprint 14.2 engines
    this.hierarchyEngine = new CoordinatorHierarchyEngine(dbAdapter, this.domainEngine);
    this.territoryAssignmentEngine = new CoordinatorTerritoryEngine(dbAdapter, this.domainEngine, kgEngine);
    this.responsibilityEngine = new CoordinatorResponsibilityEngine(dbAdapter, this.domainEngine);
    this.coordinatorHealthEngine = new CoordinatorHealthEngine(dbAdapter, this.hierarchyEngine, this.responsibilityEngine);

    // Instantiate Sprint 14.3 engines
    this.territorialIntelligenceEngine = new TerritorialIntelligenceEngine(dbAdapter, this.domainEngine);

    // Instantiate Sprint 14.4 engines
    this.opponentEngine = new OpponentEngine(dbAdapter, kgEngine);
    this.politicalGroupEngine = new PoliticalGroupEngine(dbAdapter, kgEngine);
    this.leadershipEngine = new LeadershipEngine(dbAdapter, kgEngine);
    this.relationshipEngine = new PoliticalRelationshipEngine(dbAdapter, kgEngine);
    this.opponentTerritoryEngine = new OpponentTerritoryEngine(dbAdapter, this.relationshipEngine);
    this.opponentHealthEngine = new OpponentHealthEngine(dbAdapter);
    this.opponentBriefGenerator = new OpponentBriefGenerator(dbAdapter);

    // Instantiate Sprint 14.5 engines
    this.historicalElectoralEngine = new HistoricalElectoralEngine(dbAdapter, kgEngine);
    this.candidateHistoryEngine = new CandidateHistoryEngine(dbAdapter);
    this.territorialHistoryEngine = new TerritorialHistoryEngine(dbAdapter);
    this.partyHistoryEngine = new PartyHistoryEngine(dbAdapter);
    this.electoralComparisonEngine = new ElectoralComparisonEngine(this.candidateHistoryEngine, this.partyHistoryEngine, this.territorialHistoryEngine);
    this.electoralTrendEngine = new ElectoralTrendEngine(this.candidateHistoryEngine);
    this.electoralRankingEngine = new ElectoralRankingEngine(dbAdapter);
    this.historicalBriefGenerator = new HistoricalBriefGenerator(this.candidateHistoryEngine, this.electoralTrendEngine, this.territorialHistoryEngine);
    
    // Instantiate Sprint 14.5.2 engine
    this.bulkImportEngine = new ElectoralBulkImportEngine(dbAdapter);

    // Instantiate Sprint 14.5.3 engine
    this.aggregateEngine = new HistoricalElectoralAggregateEngine(dbAdapter);

    // Instantiate Sprint 14.6 engines
    this.historicalAnalysisEngine = new HistoricalAnalysisEngine(this.aggregateEngine);
    this.candidatePriorityRankingEngine = new PriorityRankingEngine(this.aggregateEngine);
    this.trueOpponentAnalysisEngine = new OpponentAnalysisEngine(this.aggregateEngine);
    this.strategicAnalysisEngine = new StrategicAnalysisEngine(this.aggregateEngine);
    this.evidenceBasedProjectionEngine = new EvidenceBasedProjectionEngine(this.aggregateEngine);
  }


  public async getElectoralSnapshot(organizationId: string): Promise<any> {
    return this.memoryEngine.getElectoralMemorySnapshot(organizationId);
  }

  /**
   * Evaluates campaign risk, bottlenecks, critical path, and health.
   * Integrates campaigns directly with Workspace Intelligence requirements.
   */
  public async getCampaignIntelligence(organizationId: string, campaignId: string): Promise<any> {
    const campaign = await this.campaignEngine.getCampaignById(organizationId, campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const objectives = await this.objectiveEngine.getObjectives(organizationId, campaignId);
    const tasks = await this.taskEngine.getTasks(organizationId, campaignId);
    const coordinators = await this.coordinatorEngine.getCoordinatorsByCampaign(organizationId, campaignId);
    const territories = await this.domainEngine.getTerritories(organizationId);

    // Progress metrics
    const progress = this.progressEngine.calculateProgress(objectives, tasks, territories, coordinators);
    const health = this.healthEngine.calculateHealth(coordinators.length, progress);
    const summary = this.briefGenerator.generateBrief(campaign, objectives, tasks, territories, coordinators);

    // Identify critical path and bottlenecks (e.g. overdue critical/high priority tasks or blocked items)
    const blockedTasksList = tasks.filter(t => t.status === 'BLOCKED');
    const delayedTasksList = tasks.filter(t => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate).getTime() < Date.now();
    });

    const priorityDistribution = {
      CRITICAL: tasks.filter(t => t.priority === 'CRITICAL').length,
      HIGH: tasks.filter(t => t.priority === 'HIGH').length,
      MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
      LOW: tasks.filter(t => t.priority === 'LOW').length,
    };

    // Calculate Campaign Risk
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (health.healthScore < 40 || blockedTasksList.length > 5) {
      riskLevel = 'CRITICAL';
    } else if (health.healthScore < 65 || delayedTasksList.length > 3) {
      riskLevel = 'HIGH';
    } else if (health.healthScore < 85) {
      riskLevel = 'MEDIUM';
    }

    return {
      campaignId,
      campaignName: campaign.name,
      progress,
      health,
      summary,
      intelligence: {
        riskLevel,
        bottlenecks: {
          blockedCount: blockedTasksList.length,
          blockedTasks: blockedTasksList.map(t => ({ id: t.id, title: t.title, priority: t.priority })),
          delayedCount: delayedTasksList.length,
          delayedTasks: delayedTasksList.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority }))
        },
        priorityDistribution,
        criticalPath: {
          criticalTasks: tasks.filter(t => t.priority === 'CRITICAL').map(t => ({ id: t.id, title: t.title, status: t.status })),
          pendingHighPriorityObjectives: objectives.filter(o => o.priority === 'CRITICAL' && o.status !== 'COMPLETED').map(o => ({ id: o.id, title: o.title }))
        }
      }
    };
  }

  /**
   * Generates opponent context brief and analytical intelligence mapping
   */
  public async getOpponentIntelligence(organizationId: string, opponentId: string): Promise<any> {
    const opponent = await this.opponentEngine.getOpponentById(organizationId, opponentId);
    if (!opponent) {
      throw new Error("Opponent not found");
    }

    const health = await this.opponentHealthEngine.evaluateOpponentHealth(organizationId, opponentId);
    const allRelationships = await this.relationshipEngine.getRelationships(organizationId);

    // Filter relevant relationships
    const opponentRelationships = allRelationships.filter(r => 
      r.sourceId === opponentId || r.targetId === opponentId
    );

    // Extract groups, leaders, and territories
    const associatedGroupIds = opponentRelationships
      .filter(r => r.type === "BELONGS_TO_GROUP" || r.type === "LEADS_GROUP")
      .map(r => r.sourceId === opponentId ? r.targetId : r.sourceId);

    const associatedLeaderIds = opponentRelationships
      .filter(r => r.sourceType === "LEADERSHIP" || r.targetType === "LEADERSHIP")
      .map(r => r.sourceId === opponentId ? r.targetId : r.sourceId);

    const influencedTerritoryIds = opponentRelationships
      .filter(r => r.targetType === "TERRITORY" && (r.type === "INFLUENCES" || r.type === "ACTIVE_IN_TERRITORY"))
      .map(r => r.targetId);

    const allGroups = await this.politicalGroupEngine.getPoliticalGroups(organizationId);
    const associatedGroups = allGroups.filter(g => associatedGroupIds.includes(g.id));

    const allLeaders = await this.leadershipEngine.getLeaderships(organizationId);
    const associatedLeaders = allLeaders.filter(l => associatedLeaderIds.includes(l.id));

    const allTerritories = await this.domainEngine.getTerritories(organizationId);
    const influencedTerritories = allTerritories.filter(t => influencedTerritoryIds.includes(t.id));

    return {
      opponent,
      health,
      relationships: opponentRelationships,
      associatedGroups,
      associatedLeaders,
      influencedTerritories,
      summary: `Adversário ${opponent.name} (${opponent.party || "Sem Partido"}), atualmente ${opponent.status.toLowerCase()}. Conta com cadastro avaliado em nível ${health.score}/100.`
    };
  }
}
