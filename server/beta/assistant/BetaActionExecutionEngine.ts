import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { BetaAssistantContextEngine } from "./BetaAssistantContextEngine";
import { AIRouterEngine } from "./AIRouterEngine";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { 
  BetaActionType, BetaActionRequest, BetaActionValidation, BetaActionPermission, 
  BetaActionDispatch, BetaActionExecutionLog, BetaActionResult 
} from "../core/types";

export class BetaActionExecutionEngine {
  private db: DatabaseAdapter;
  private kg: KnowledgeGraphEngine;
  private memoryOS: any;
  private betaAssistantContext: BetaAssistantContextEngine;
  private aiRouter: AIRouterEngine;
  private workspaceIntelligence: WorkspaceIntelligenceOrchestrator;
  
  // Simulated Module Engines
  private taskEngine?: any;
  private calendarEngine?: any;
  private contactEngine?: any;
  private communicationEngine?: any;
  private workflowEngine?: any;
  private evidenceEngine?: any;
  private moduleAccessEngine?: any;

  constructor(
    db: DatabaseAdapter,
    kg: KnowledgeGraphEngine,
    memoryOS: any,
    betaAssistantContext: BetaAssistantContextEngine,
    aiRouter: AIRouterEngine,
    workspaceIntelligence: WorkspaceIntelligenceOrchestrator,
    dependencies: {
      taskEngine?: any;
      calendarEngine?: any;
      contactEngine?: any;
      communicationEngine?: any;
      workflowEngine?: any;
      evidenceEngine?: any;
      moduleAccessEngine?: any;
    }
  ) {
    this.db = db;
    this.kg = kg;
    this.memoryOS = memoryOS;
    this.betaAssistantContext = betaAssistantContext;
    this.aiRouter = aiRouter;
    this.workspaceIntelligence = workspaceIntelligence;

    this.taskEngine = dependencies.taskEngine;
    this.calendarEngine = dependencies.calendarEngine;
    this.contactEngine = dependencies.contactEngine;
    this.communicationEngine = dependencies.communicationEngine;
    this.workflowEngine = dependencies.workflowEngine;
    this.evidenceEngine = dependencies.evidenceEngine;
    this.moduleAccessEngine = dependencies.moduleAccessEngine;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  // --- LOGGING ---

  public async createActionLog(data: {
    organizationId: string;
    workspaceId: string;
    userId: string;
    actionType: BetaActionType;
    status: string;
    details: any;
  }): Promise<BetaActionExecutionLog> {
    this.validateTenant(data.organizationId, data.workspaceId);
    return await this.db.createBetaActionLog(data);
  }

  public async getActionLogs(organizationId: string, workspaceId: string): Promise<BetaActionExecutionLog[]> {
    this.validateTenant(organizationId, workspaceId);
    return await this.db.getBetaActionLogs(organizationId, workspaceId).catch(() => []);
  }

  // --- REQUEST CREATION ---

  public async createActionRequest(data: {
    organizationId: string;
    workspaceId: string;
    userId: string;
    actionType: BetaActionType;
    entityType?: string;
    entityId?: string;
    payload: any;
  }): Promise<BetaActionRequest> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const record = {
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      actionType: data.actionType,
      entityType: data.entityType,
      entityId: data.entityId,
      payload: data.payload,
      status: "PENDING",
    };

    const request = await this.db.createActionRequest(record);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(data.organizationId, "ActionRequested", `Action ${data.actionType} requested.`);
    }

    if (this.kg) {
      try {
        const actionNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "BETA_ACTION", `Action: ${data.actionType}`, data.actionType, `action_${request.id}`);
        const wsNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "PROJECT", `Workspace ${data.workspaceId}`, "", data.workspaceId);
        await this.kg.createRelationship(data.organizationId, wsNode.id, actionNode.id, "HAS_ACTION");

        const userNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "MEMBER", `User ${data.userId}`, "", data.userId);
        await this.kg.createRelationship(data.organizationId, userNode.id, actionNode.id, "REQUESTED");
      } catch (e) {}
    }

    await this.createActionLog({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      actionType: data.actionType,
      status: "PENDING",
      details: { requestId: request.id }
    });

    return request;
  }

  // --- PERMISSION ---

  public async checkActionPermission(organizationId: string, workspaceId: string, userId: string, actionType: string): Promise<BetaActionPermission> {
    this.validateTenant(organizationId, workspaceId);
    
    // Simulate permission check. In future, consult ModuleAccessEngine
    const allowed = true;

    return {
      status: allowed ? "ALLOWED" : "DENIED",
      reason: allowed ? undefined : "User lacks required permission for this action type."
    };
  }

  // --- VALIDATION ---

  public async validateAction(organizationId: string, workspaceId: string, request: BetaActionRequest): Promise<BetaActionValidation> {
    this.validateTenant(organizationId, workspaceId);
    
    // 1. Tenant match validation
    if (request.organizationId !== organizationId || request.workspaceId !== workspaceId) {
      return { status: "INVALID", reason: "Tenant mismatch." };
    }

    // 2. Permission Validation
    const perm = await this.checkActionPermission(organizationId, workspaceId, request.userId, request.actionType);
    if (perm.status === "DENIED") {
      return { status: "INVALID", reason: perm.reason || "Permission Denied" };
    }

    // 3. Module/Context validation (mocking as valid)
    // Could consult WorkspaceIntelligenceOrchestrator here
    const isModuleEnabled = true;
    if (!isModuleEnabled) {
      return { status: "INVALID", reason: "Target module is not enabled in this workspace." };
    }

    return { status: "VALID" };
  }

  // --- DISPATCH ---

  public async createActionDispatch(organizationId: string, workspaceId: string, userId: string, requestId: string, targetModule: string, metadata?: any): Promise<BetaActionDispatch> {
    this.validateTenant(organizationId, workspaceId);

    const request = await this.db.getActionRequestById(organizationId, workspaceId, requestId);
    if (!request) throw new Error("Request not found");

    const validation = await this.validateAction(organizationId, workspaceId, request);
    if (validation.status === "INVALID") {
      if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
        await this.memoryOS.registerEvent(organizationId, "ActionRejected", `Action ${requestId} rejected: ${validation.reason}`);
      }
      throw new Error(`Action validation failed: ${validation.reason}`);
    }

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "ActionValidated", `Action ${requestId} validated successfully.`);
    }

    const dispatchRecord = {
      organizationId,
      workspaceId,
      requestId,
      status: "DISPATCHED",
      metadata: { targetModule, initialStatus: "PENDING_EXECUTION", ...metadata }
    };

    const dispatch = await this.db.createActionDispatch(dispatchRecord);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "ActionDispatched", `Action ${requestId} dispatched to ${targetModule}.`);
    }

    if (this.kg) {
      try {
        const actionNode = await this.kg.ensureNode(organizationId, workspaceId, "BETA_ACTION", `Action: ${request.actionType}`, request.actionType, `action_${request.id}`);
        const moduleNode = await this.kg.ensureNode(organizationId, workspaceId, "BETA_MODULE", `Module: ${targetModule}`, targetModule, `module_${targetModule}`);
        await this.kg.createRelationship(organizationId, actionNode.id, moduleNode.id, "DISPATCHED_TO");
      } catch (e) {}
    }

    await this.createActionLog({
      organizationId,
      workspaceId,
      userId,
      actionType: request.actionType,
      status: "DISPATCHED",
      details: { requestId, dispatchId: dispatch.id, targetModule }
    });

    return dispatch;
  }

  // --- RESULT ---

  public async getActionResult(organizationId: string, workspaceId: string, requestId: string): Promise<BetaActionResult> {
    this.validateTenant(organizationId, workspaceId);
    
    // Determine status from Dispatches
    const dispatches = await this.db.getActionDispatches(organizationId, workspaceId).catch(() => []);
    const dispatch = dispatches.find((d: any) => d.requestId === requestId);
    
    if (dispatch) {
      return { status: "DISPATCHED", requestId };
    }

    const req = await this.db.getActionRequestById(organizationId, workspaceId, requestId);
    if (!req) return { status: "PENDING", requestId }; // fallback status if not found or pending

    return { status: "PENDING", requestId };
  }
}
