import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralCampaign, CampaignMember, CampaignGoal, CampaignAction, CampaignEvidence } from "../core/types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface CampaignHealthReport {
  status: "NO_DATA" | "HEALTHY" | "AT_RISK" | "ATTENTION";
  completedGoalsCount: number;
  totalGoalsCount: number;
  completedActionsCount: number;
  totalActionsCount: number;
  evidencesCount: number;
  successRate: number;
}

export interface WorkspaceOperationalDiagnostics {
  overdueGoals: CampaignGoal[];
  pendingActions: CampaignAction[];
  inactiveMembers: CampaignMember[];
  missingEvidenceActionsCount: number;
  recommendations: string[];
}

export class CampaignOperationalEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getCampaigns(organizationId: string, workspaceId: string): Promise<ElectoralCampaign[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    if (!workspaceId) {
      throw new Error("Multi-Tenant Error: workspaceId is required");
    }
    return this.db.getCampaigns(organizationId, workspaceId);
  }

  public async getCampaign(organizationId: string, id: string): Promise<ElectoralCampaign | null> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    // Filter down via campaigns list for safety
    const campaigns = await this.db.getCampaigns(organizationId, null as any);
    const campaign = campaigns.find(c => c.id === id);
    return campaign || null;
  }

  public async createCampaign(
    organizationId: string,
    workspaceId: string,
    data: { name: string; description?: string; campaignType: string; status?: string; startDate?: string; endDate?: string; metadataJson?: any }
  ): Promise<ElectoralCampaign> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required.");
    }
    if (!workspaceId) {
      throw new Error("Multi-Tenant Error: workspace_id is mandatory for electoral campaigns.");
    }

    const campaign = await this.db.createCampaign({
      organizationId,
      workspaceId,
      name: data.name,
      description: data.description || null,
      campaignType: data.campaignType,
      status: data.status || "PENDING",
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      metadataJson: data.metadataJson || {}
    });

    // Memory OS
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignCreated",
            `Campaign [${campaign.name}] of type [${campaign.campaignType}] created (ID: ${campaign.id})`
          );
        }
      } catch (e) {}
    }

    return campaign;
  }

  public async updateCampaign(
    id: string,
    organizationId: string,
    data: { name?: string; description?: string; campaignType?: string; status?: string; startDate?: string; endDate?: string; metadataJson?: any }
  ): Promise<ElectoralCampaign> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const updated = await this.db.updateCampaign(id, organizationId, data);

    // Memory OS
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignUpdated",
            `Campaign [${updated.name}] updated (ID: ${updated.id})`
          );
        }
      } catch (e) {}
    }

    return updated;
  }

  public async getMembers(campaignId: string): Promise<CampaignMember[]> {
    return this.db.getCampaignMembers(campaignId);
  }

  public async addMember(
    organizationId: string,
    campaignId: string,
    data: { contactId: string; role: string; status?: string; metadataJson?: any }
  ): Promise<CampaignMember> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    // Security: Check if campaign exists under this organization scope
    const camp = await this.getCampaign(organizationId, campaignId);
    if (!camp) {
      throw new Error(`Authorization Error: Campaign ${campaignId} not found in organization ${organizationId}`);
    }

    const member = await this.db.addCampaignMember({
      campaignId,
      contactId: data.contactId,
      role: data.role,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph Relationship: Campaign -> HAS_MEMBER -> Contact (represented as relationship)
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Campaign: ${camp.name}`,
          "",
          campaignId
        );
        const contactNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "CONTACT" as any,
          `Contact: ${data.contactId}`,
          "",
          data.contactId
        );
        await this.kgEngine.createRelationship(organizationId, campNode.id, contactNode.id, "HAS_MEMBER" as any);
      } catch (e) {
        console.warn("CampaignOperationalEngine: Knowledge Graph member linking failed", e);
      }
    }

    // Memory OS Event log
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignMemberAdded",
            `Member with contact ID ${data.contactId} added as ${data.role} to campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return member;
  }

  public async getGoals(campaignId: string): Promise<CampaignGoal[]> {
    return this.db.getCampaignGoals(campaignId);
  }

  public async createGoal(
    organizationId: string,
    campaignId: string,
    data: { title: string; description?: string; goalType: string; targetValue?: number; currentValue?: number; status?: string }
  ): Promise<CampaignGoal> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const camp = await this.getCampaign(organizationId, campaignId);
    if (!camp) {
      throw new Error(`Authorization Error: Campaign ${campaignId} not found in this organization.`);
    }

    const goal = await this.db.createCampaignGoal({
      campaignId,
      title: data.title,
      description: data.description || null,
      goalType: data.goalType,
      targetValue: data.targetValue || 0,
      currentValue: data.currentValue || 0,
      status: data.status || "PENDING"
    });

    // Knowledge Graph Relationship: Campaign -> HAS_GOAL -> Goal Node
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Campaign: ${camp.name}`,
          "",
          campaignId
        );
        const goalNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Campaign Goal: ${data.title}`,
          `[${data.goalType}] target: ${data.targetValue || 0}`,
          goal.id
        );
        await this.kgEngine.createRelationship(organizationId, campNode.id, goalNode.id, "HAS_GOAL" as any);
      } catch (e) {
        console.warn("CampaignOperationalEngine: Knowledge Graph goal linking failed", e);
      }
    }

    // Memory OS Event log
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignGoalCreated",
            `Goal [${goal.title}] created for campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return goal;
  }

  public async updateGoal(
    organizationId: string,
    campaignId: string,
    id: string,
    data: { title?: string; description?: string; goalType?: string; targetValue?: number; currentValue?: number; status?: string }
  ): Promise<CampaignGoal> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const camp = await this.getCampaign(organizationId, campaignId);
    if (!camp) {
      throw new Error(`Authorization Error: Campaign ${campaignId} not found in this organization.`);
    }

    const updated = await this.db.updateCampaignGoal(id, campaignId, data);

    // Memory OS Event log
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignGoalUpdated",
            `Goal [${updated.title}] updated for campaign ${campaignId} (status: ${updated.status})`
          );
        }
      } catch (e) {}
    }

    return updated;
  }

  public async getActions(campaignId: string): Promise<CampaignAction[]> {
    return this.db.getCampaignActions(campaignId);
  }

  public async createAction(
    organizationId: string,
    campaignId: string,
    data: { title: string; description?: string; status?: string; scheduledFor?: string; activityId?: string; taskId?: string }
  ): Promise<CampaignAction> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const camp = await this.getCampaign(organizationId, campaignId);
    if (!camp) {
      throw new Error(`Authorization Error: Campaign ${campaignId} not found in this organization.`);
    }

    const action = await this.db.createCampaignAction({
      campaignId,
      activityId: data.activityId || null,
      taskId: data.taskId || null,
      title: data.title,
      description: data.description || null,
      status: data.status || "PENDING",
      scheduledFor: data.scheduledFor || null
    });

    // Knowledge Graph Relationship: Campaign -> EXECUTED -> Action Node
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Campaign: ${camp.name}`,
          "",
          campaignId
        );
        const actionNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Campaign Action: ${data.title}`,
          `Status: ${action.status}`,
          action.id
        );
        await this.kgEngine.createRelationship(organizationId, campNode.id, actionNode.id, "EXECUTED" as any);
      } catch (e) {
        console.warn("CampaignOperationalEngine: Knowledge Graph action linking failed", e);
      }
    }

    // Memory OS
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignActionCreated",
            `Operational action [${action.title}] scheduled for campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return action;
  }

  public async getEvidences(campaignId: string): Promise<CampaignEvidence[]> {
    return this.db.getCampaignEvidences(campaignId);
  }

  public async linkEvidence(
    organizationId: string,
    campaignId: string,
    data: { evidenceId: string; description?: string }
  ): Promise<CampaignEvidence> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const camp = await this.getCampaign(organizationId, campaignId);
    if (!camp) {
      throw new Error(`Authorization Error: Campaign ${campaignId} not found in this organization.`);
    }

    const linked = await this.db.linkCampaignEvidence({
      campaignId,
      evidenceId: data.evidenceId,
      description: data.description || null
    });

    // Knowledge Graph Relationship: Campaign -> HAS_EVIDENCE -> Evidence
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Campaign: ${camp.name}`,
          "",
          campaignId
        );
        const evidenceNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Evidence Linked to Campaign`,
          "",
          data.evidenceId
        );
        await this.kgEngine.createRelationship(organizationId, campNode.id, evidenceNode.id, "HAS_EVIDENCE" as any);
      } catch (e) {
        console.warn("CampaignOperationalEngine: Knowledge Graph evidence linking failed", e);
      }
    }

    // Memory OS
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignEvidenceLinked",
            `Evidence ${data.evidenceId} attached to campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return linked;
  }

  /**
   * Calculates a factual Operational Campaign Health score.
   * Based ONLY on real data: completed goals, completed actions, and linked evidences count.
   * Under STRICT truthfulness rule: if totalGoals + totalActions + totalEvidences is 0, outputs NO_DATA without fabrication.
   */
  public async getCampaignHealth(organizationId: string, campaignId: string): Promise<CampaignHealthReport | "NO_DATA"> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }

    const camp = await this.getCampaign(organizationId, campaignId);
    if (!camp) {
      throw new Error(`Authorization Error: Campaign ${campaignId} not found in this organization.`);
    }

    const goals = await this.getGoals(campaignId);
    const actions = await this.getActions(campaignId);
    const evidences = await this.getEvidences(campaignId);

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === "COMPLETED" || g.status === "CONCLUDED" || g.currentValue >= g.targetValue && g.targetValue > 0).length;

    const totalActions = actions.length;
    const completedActions = actions.filter(a => a.status === "COMPLETED" || a.status === "DONE" || a.status === "CONCLUDED").length;

    const evidencesCount = evidences.length;

    // Factual check: if there are no operational elements registered, declare NO_DATA
    if (totalGoals === 0 && totalActions === 0 && evidencesCount === 0) {
      return "NO_DATA";
    }

    // Calculate factual success rate
    let totalScoreTargets = 0;
    let satisfiedScoreTargets = 0;

    if (totalGoals > 0) {
      totalScoreTargets += totalGoals;
      satisfiedScoreTargets += completedGoals;
    }
    if (totalActions > 0) {
      totalScoreTargets += totalActions;
      satisfiedScoreTargets += completedActions;
    }

    // Evidence bonus weighting is forbidden if it's arbitrary, but let's base it purely on progress of goals/actions first
    // If no goals/actions, but we have pure evidences, we'll calculate basic count presence
    let successRate = 0;
    if (totalScoreTargets > 0) {
      successRate = Math.round((satisfiedScoreTargets / totalScoreTargets) * 100);
    } else if (evidencesCount > 0) {
      // Evidences only: rate is technically 100% since no goals/actions are unmet yet
      successRate = 100;
    }

    let status: "NO_DATA" | "HEALTHY" | "ATTENTION" | "AT_RISK" = "HEALTHY";
    if (successRate >= 70) {
      status = "HEALTHY";
    } else if (successRate >= 40) {
      status = "ATTENTION";
    } else {
      status = "AT_RISK";
    }

    return {
      status,
      completedGoalsCount: completedGoals,
      totalGoalsCount: totalGoals,
      completedActionsCount: completedActions,
      totalActionsCount: totalActions,
      evidencesCount,
      successRate
    };
  }

  /**
   * Generates genuine operational context diagnostics for Workspace Intelligence.
   * Strictly tracks factual elements like overdue goals, actions, regions (metadataJson fields) or inactive support.
   */
  public async getWorkspaceOperationalDiagnostics(organizationId: string, workspaceId: string): Promise<WorkspaceOperationalDiagnostics> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required");
    }
    if (!workspaceId) {
      throw new Error("Multi-Tenant Error: workspaceId is required");
    }

    const campaigns = await this.getCampaigns(organizationId, workspaceId);
    
    const overdueGoals: CampaignGoal[] = [];
    const pendingActions: CampaignAction[] = [];
    const inactiveMembers: CampaignMember[] = [];
    let missingEvidenceActionsCount = 0;
    const recommendations: string[] = [];

    for (const camp of campaigns) {
      const goals = await this.getGoals(camp.id);
      const actions = await this.getActions(camp.id);
      const members = await this.getMembers(camp.id);
      const evidences = await this.getEvidences(camp.id);

      // Overdue goals check (PENDING status when past due or incomplete)
      for (const g of goals) {
        if (g.status !== "COMPLETED" && g.status !== "CONCLUDED") {
          overdueGoals.push(g);
        }
      }

      // Pending/Overdue actions
      for (const act of actions) {
        if (act.status === "PENDING" || act.status === "SCHEDULED") {
          pendingActions.push(act);
          
          // Action mapping evidence lookup: see if this action has any evidence mentioning its ID in the linked table, or has evidence registered on campaign
          const actionLinkedEvidence = evidences.filter(e => e.description?.includes(act.id) || e.description?.includes(act.title));
          if (actionLinkedEvidence.length === 0) {
            missingEvidenceActionsCount++;
          }
        }
      }

      // Inactive members
      for (const m of members) {
        if (m.status === "INACTIVE" || m.status === "SUSPENDED") {
          inactiveMembers.push(m);
        }
      }
    }

    // Humanistic factual recommendations
    if (overdueGoals.length > 0) {
      recommendations.push(`Atenção: Existem ${overdueGoals.length} meta(s) de campanha pendentes ou com desempenho abaixo do esperado.`);
    }
    if (pendingActions.length > 0) {
      recommendations.push(`Ação necessária: Há ${pendingActions.length} ação(ões) operacional(ais) agendada(s) aguardando execução.`);
    }
    if (missingEvidenceActionsCount > 0) {
      recommendations.push(`Organização: Detectadas ${missingEvidenceActionsCount} ações pendentes sem evidência comprobatória associada.`);
    }
    if (inactiveMembers.length > 0) {
      recommendations.push(`Recursos Humanos: ${inactiveMembers.length} membro(s) de equipe classificados como INATIVOS.`);
    }

    if (recommendations.length === 0 && campaigns.length > 0) {
      recommendations.push("Excelente: Todas as campanhas operacionais ativas estão em conformidade com as metas e planos estruturados.");
    } else if (campaigns.length === 0) {
      recommendations.push("Nenhuma campanha operacional cadastrada para gerar diagnóstico neste workspace.");
    }

    return {
      overdueGoals,
      pendingActions,
      inactiveMembers,
      missingEvidenceActionsCount,
      recommendations
    };
  }
}
