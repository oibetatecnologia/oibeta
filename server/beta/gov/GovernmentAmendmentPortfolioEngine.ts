import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { 
  GovernmentAmendmentPortfolio,
  GovernmentAmendmentPortfolioItem,
  GovernmentAmendmentPriority,
  GovernmentAmendmentObjective,
  GovernmentAmendmentActionPlan,
  GovernmentAmendmentFollowUp,
  GovernmentAmendmentPortfolioSummary,
  GovernmentAmendmentPortfolioHealth 
} from "../core/types";

export class GovernmentAmendmentPortfolioEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private memoryOS: MemoryOS
  ) {}

  private validateTenant(organizationId: string, workspaceId: string) {
    if (!organizationId || !workspaceId) {
       throw new Error("Multi-Tenant Error: organizationId and workspaceId are required.");
    }
  }

  public async getAmendmentPortfolios(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentPortfolio[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAmendmentPortfolios(organizationId, workspaceId);
  }

  public async createAmendmentPortfolio(data: any): Promise<GovernmentAmendmentPortfolio> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const portfolio = await this.dbAdapter.createAmendmentPortfolio(data);
    
    await this.kgEngine.createNode(
      portfolio.id as string,
      "GovernmentAmendmentPortfolio",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.name || "Portfolio",
        ...portfolio
      }
    );
    
    await this.kgEngine.createRelationship(
      data.organizationId,
      data.workspaceId,
      portfolio.id as string,
      "HAS_AMENDMENT_PORTFOLIO"
    );
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: portfolio.id as string,
        entityType: "GovernmentAmendmentPortfolio",
        eventType: "GovernmentAmendmentPortfolioCreated",
        details: { portfolioId: portfolio.id }
      }
    });

    return portfolio;
  }

  public async getAmendmentPortfolioItems(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentPortfolioItem[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAmendmentPortfolioItems(organizationId, workspaceId);
  }

  public async createAmendmentPortfolioItem(data: any): Promise<GovernmentAmendmentPortfolioItem> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const item = await this.dbAdapter.createAmendmentPortfolioItem(data);
    
    await this.kgEngine.createNode(
      item.id as string,
      "GovernmentAmendmentPortfolioItem",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.title || "Portfolio Item",
        ...item
      }
    );
    
    if (data.portfolioId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.portfolioId,
        item.id as string,
        "HAS_PORTFOLIO_ITEM"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: item.id as string,
        entityType: "GovernmentAmendmentPortfolioItem",
        eventType: "GovernmentAmendmentPortfolioItemCreated",
        details: { itemId: item.id }
      }
    });

    return item;
  }

  public async getAmendmentPriorities(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentPriority[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAmendmentPriorities(organizationId, workspaceId);
  }

  public async createAmendmentPriority(data: any): Promise<GovernmentAmendmentPriority> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const priority = await this.dbAdapter.createAmendmentPriority(data);
    
    await this.kgEngine.createNode(
      priority.id as string,
      "GovernmentAmendmentPriority",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.title || "Priority",
        ...priority
      }
    );
    
    if (data.portfolioItemId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.portfolioItemId,
        priority.id as string,
        "HAS_PRIORITY"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: priority.id as string,
        entityType: "GovernmentAmendmentPriority",
        eventType: "GovernmentAmendmentPriorityCreated",
        details: { priorityId: priority.id }
      }
    });

    return priority;
  }

  public async getAmendmentObjectives(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentObjective[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAmendmentObjectives(organizationId, workspaceId);
  }

  public async createAmendmentObjective(data: any): Promise<GovernmentAmendmentObjective> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const objective = await this.dbAdapter.createAmendmentObjective(data);
    
    await this.kgEngine.createNode(
      objective.id as string,
      "GovernmentAmendmentObjective",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.title || "Objective",
        ...objective
      }
    );
    
    if (data.portfolioItemId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.portfolioItemId,
        objective.id as string,
        "HAS_OBJECTIVE"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: objective.id as string,
        entityType: "GovernmentAmendmentObjective",
        eventType: "GovernmentAmendmentObjectiveCreated",
        details: { objectiveId: objective.id }
      }
    });

    return objective;
  }

  public async getAmendmentActionPlans(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentActionPlan[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAmendmentActionPlans(organizationId, workspaceId);
  }

  public async createAmendmentActionPlan(data: any): Promise<GovernmentAmendmentActionPlan> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const plan = await this.dbAdapter.createAmendmentActionPlan(data);
    
    await this.kgEngine.createNode(
      plan.id as string,
      "GovernmentAmendmentActionPlan",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.title || "Action Plan",
        ...plan
      }
    );
    
    if (data.objectiveId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.objectiveId,
        plan.id as string,
        "HAS_ACTION_PLAN"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: plan.id as string,
        entityType: "GovernmentAmendmentActionPlan",
        eventType: "GovernmentAmendmentActionPlanCreated",
        details: { planId: plan.id }
      }
    });

    return plan;
  }

  public async getAmendmentFollowUps(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentFollowUp[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getAmendmentFollowUps(organizationId, workspaceId);
  }

  public async createAmendmentFollowUp(data: any): Promise<GovernmentAmendmentFollowUp> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const followup = await this.dbAdapter.createAmendmentFollowUp(data);
    
    await this.kgEngine.createNode(
      followup.id as string,
      "GovernmentAmendmentFollowUp",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: followup.status || "FollowUp",
        ...followup
      }
    );
    
    if (data.actionPlanId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.actionPlanId,
        followup.id as string,
        "HAS_FOLLOWUP"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: followup.id as string,
        entityType: "GovernmentAmendmentFollowUp",
        eventType: "GovernmentAmendmentFollowUpCreated",
        details: { followupId: followup.id }
      }
    });

    return followup;
  }

  public async getAmendmentPortfolioSummary(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentPortfolioSummary> {
    this.validateTenant(organizationId, workspaceId);
    const portfolios = await this.getAmendmentPortfolios(organizationId, workspaceId);
    const items = await this.getAmendmentPortfolioItems(organizationId, workspaceId);
    
    if (portfolios.length === 0) {
      return { status: "NO_DATA", summary: {} };
    }

    const summary = {
      totalPortfolios: portfolios.length,
      totalItems: items.length,
      activePortfolios: portfolios.filter((p: any) => p.status === "ACTIVE").length,
    };

    return {
      status: items.length > 0 ? "READY" : "PARTIAL_DATA",
      summary
    };
  }

  public async getAmendmentPortfolioHealth(organizationId: string, workspaceId: string): Promise<GovernmentAmendmentPortfolioHealth> {
    this.validateTenant(organizationId, workspaceId);
    const portfolios = await this.getAmendmentPortfolios(organizationId, workspaceId);
    const items = await this.getAmendmentPortfolioItems(organizationId, workspaceId);
    const priorities = await this.getAmendmentPriorities(organizationId, workspaceId);
    const objectives = await this.getAmendmentObjectives(organizationId, workspaceId);
    const plans = await this.getAmendmentActionPlans(organizationId, workspaceId);
    const followups = await this.getAmendmentFollowUps(organizationId, workspaceId);
    
    if (portfolios.length === 0) {
      return { status: "NO_DATA", healthScore: 0, metrics: {} };
    }

    const health: GovernmentAmendmentPortfolioHealth = {
      status: items.length > 0 ? "READY" : "PARTIAL_DATA",
      healthScore: portfolios.length > 0 ? 80 : 0, 
      metrics: {
        portfoliosWithItems: portfolios.filter(p => items.some(i => i.portfolioId === p.id)).length,
        itemsWithPriorities: items.filter(i => priorities.some(p => p.portfolioItemId === i.id)).length,
        itemsWithObjectives: items.filter(i => objectives.some(o => o.portfolioItemId === i.id)).length,
        objectivesWithPlans: objectives.filter(o => plans.some(p => p.objectiveId === o.id)).length,
        plansWithFollowups: plans.filter(p => followups.some(f => f.actionPlanId === p.id)).length,
      }
    };

    await this.memoryOS.registerEvent({
      organizationId,
      workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: workspaceId,
        entityType: "GovernmentAmendmentPortfolioHealth",
        eventType: "GovernmentAmendmentPortfolioHealthComputed",
        details: { health }
      }
    });

    return health;
  }
}
