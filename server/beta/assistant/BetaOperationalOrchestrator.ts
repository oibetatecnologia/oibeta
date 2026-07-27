import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { BetaAssistantContextEngine } from "./BetaAssistantContextEngine";
import { AIRouterEngine } from "./AIRouterEngine";
import { BetaSkillsEngine } from "./BetaSkillsEngine";
import { BetaActionExecutionEngine } from "./BetaActionExecutionEngine";
import {
  BetaOperationalIntent,
  BetaOperationalContext,
  BetaOperationalValidation,
  BetaOperationalPermission,
  BetaOperationalDispatch,
  BetaOperationalResult,
  BetaOperationalIntentType,
  BetaOperationalStatus
} from "../core/types";

export class BetaOperationalOrchestrator {
  private db: DatabaseAdapter;
  private kg: KnowledgeGraphEngine;
  private memoryOS: any;

  private betaAssistantContextEngine: BetaAssistantContextEngine;
  private aiRouterEngine: AIRouterEngine;
  private betaSkillsEngine: BetaSkillsEngine;
  private betaActionExecutionEngine: BetaActionExecutionEngine;
  
  private moduleAccessEngine: any;
  private workspaceIntelligenceOrchestrator: any;

  constructor(
    db: DatabaseAdapter,
    kg: KnowledgeGraphEngine,
    memoryOS: any,
    deps: {
      betaAssistantContextEngine: BetaAssistantContextEngine;
      aiRouterEngine: AIRouterEngine;
      betaSkillsEngine: BetaSkillsEngine;
      betaActionExecutionEngine: BetaActionExecutionEngine;
      moduleAccessEngine: any;
      workspaceIntelligenceOrchestrator: any;
    }
  ) {
    this.db = db;
    this.kg = kg;
    this.memoryOS = memoryOS;
    this.betaAssistantContextEngine = deps.betaAssistantContextEngine;
    this.aiRouterEngine = deps.aiRouterEngine;
    this.betaSkillsEngine = deps.betaSkillsEngine;
    this.betaActionExecutionEngine = deps.betaActionExecutionEngine;
    this.moduleAccessEngine = deps.moduleAccessEngine;
    this.workspaceIntelligenceOrchestrator = deps.workspaceIntelligenceOrchestrator;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  // --- INTENT CREATION ---

  public async createOperationalIntent(data: {
    organizationId: string;
    workspaceId: string;
    userId: string;
    intentType: BetaOperationalIntentType;
    skill: string;
    metadata: any;
  }): Promise<BetaOperationalIntent> {
    this.validateTenant(data.organizationId, data.workspaceId);

    const intent = await this.db.createOperationalIntent({
      ...data,
      status: "PENDING",
      createdAt: new Date().toISOString()
    });

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(data.organizationId, "OperationalIntentCreated", `Intent ${intent.intentType} created for user ${data.userId}`);
    }

    if (this.kg) {
      try {
        const intentNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "OPERATIONAL_INTENT", `Intent: ${intent.id}`, intent.intentType, `intent_${intent.id}`);
        const userNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "MEMBER", `User: ${data.userId}`, "", data.userId);
        const wsNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "PROJECT", `Workspace ${data.workspaceId}`, "", data.workspaceId);
        
        await this.kg.createRelationship(data.organizationId, userNode.id, intentNode.id, "CREATED_INTENT");
        await this.kg.createRelationship(data.organizationId, wsNode.id, intentNode.id, "HAS_INTENT");
        
        if (data.skill) {
           const skillNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "BETA_SKILL", `Skill: ${data.skill}`, "", `skill_${data.skill}`);
           await this.kg.createRelationship(data.organizationId, intentNode.id, skillNode.id, "USES_SKILL");
        }
      } catch (e) {}
    }

    return intent;
  }

  // --- CONTEXT BUILDING ---

  public async buildOperationalContext(organizationId: string, workspaceId: string, userId: string, intentId: string): Promise<BetaOperationalContext> {
    this.validateTenant(organizationId, workspaceId);

    const assistantContext = await this.betaAssistantContextEngine.createAssistantContext(organizationId, workspaceId).catch(() => null);
    let workspaceContext = null;
    if (this.workspaceIntelligenceOrchestrator) {
       workspaceContext = await this.workspaceIntelligenceOrchestrator.gatherOrchestrationContext(organizationId, workspaceId).catch(() => null);
    }
    
    // Abstracting AI Router and Skill Context
    const aiRouterContext = { availableProviders: ["MOCK_PROVIDER"] };
    const skillContext = await this.betaSkillsEngine.getCapabilities(organizationId, workspaceId).catch(() => []);

    return {
      operationalContext: { intentId, status: "READY" },
      workspaceContext,
      assistantContext,
      skillContext,
      generatedAt: new Date().toISOString()
    };
  }

  // --- VALIDATION LAYER ---

  public async validateOperationalIntent(organizationId: string, workspaceId: string, intentId: string): Promise<BetaOperationalValidation> {
    this.validateTenant(organizationId, workspaceId);

    const intents = await this.db.getOperationalIntents(organizationId, workspaceId);
    const intent = intents.find((i: any) => i.id === intentId);
    if (!intent) return { status: "INVALID", reason: "Intent not found" };

    if (!intent.skill) {
        if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
            await this.memoryOS.registerEvent(organizationId, "OperationalIntentRejected", `Intent ${intentId} rejected: no skill`);
        }
        return { status: "INVALID", reason: "Skill not specified" };
    }

    const skillValidation = await this.betaSkillsEngine.validateSkill(organizationId, workspaceId, intent.skill);
    if (skillValidation.status !== "VALID") {
        if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
            await this.memoryOS.registerEvent(organizationId, "OperationalIntentRejected", `Intent ${intentId} rejected: ${skillValidation.reason}`);
        }
        return { status: "INVALID", reason: skillValidation.reason || "Invalid skill" };
    }

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
        await this.memoryOS.registerEvent(organizationId, "OperationalIntentValidated", `Intent ${intentId} validated`);
    }

    return { status: "VALID" };
  }

  // --- PERMISSION CHECK ---

  public async checkOperationalPermission(organizationId: string, workspaceId: string, userId: string, intentId: string): Promise<BetaOperationalPermission> {
    this.validateTenant(organizationId, workspaceId);
    
    // MOCKED: Delegate to ModuleAccessEngine if implemented
    if (this.moduleAccessEngine && typeof this.moduleAccessEngine.checkPermission === "function") {
        // Example check: const allowed = await this.moduleAccessEngine.checkPermission(...)
    }

    return { status: "ALLOWED" };
  }

  // --- DISPATCH PREPARATION ---

  public async prepareOperationalDispatch(organizationId: string, workspaceId: string, intentId: string, payload: any): Promise<BetaOperationalDispatch> {
    this.validateTenant(organizationId, workspaceId);

    const dispatch = await this.db.createOperationalDispatch({
      organizationId,
      workspaceId,
      intentId,
      status: "PREPARED",
      metadata: payload
    });

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "OperationalDispatchPrepared", `Dispatch ${dispatch.id} prepared for intent ${intentId}`);
    }

    if (this.kg) {
      try {
        const intentNode = await this.kg.ensureNode(organizationId, workspaceId, "OPERATIONAL_INTENT", `Intent: ${intentId}`, "", `intent_${intentId}`);
        const dispatchNode = await this.kg.ensureNode(organizationId, workspaceId, "OPERATIONAL_DISPATCH", `Dispatch: ${dispatch.id}`, "PREPARED", `dispatch_${dispatch.id}`);
        await this.kg.createRelationship(organizationId, intentNode.id, dispatchNode.id, "PREPARED_DISPATCH");
      } catch (e) {}
    }

    return dispatch;
  }

  // --- RESULT GENERATION ---

  public async getOperationalResult(organizationId: string, workspaceId: string, intentId: string): Promise<BetaOperationalResult> {
    this.validateTenant(organizationId, workspaceId);
    
    // Create or retrieve a result
    const results = await this.db.getOperationalResults(organizationId, workspaceId);
    let result = results.find((r: any) => r.intentId === intentId);

    if (!result) {
       result = await this.db.createOperationalResult({
         organizationId,
         workspaceId,
         intentId,
         status: "VALIDATED", // Not 'EXECUTED'
         details: { message: "Operational result placeholder" }
       });

       if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
          await this.memoryOS.registerEvent(organizationId, "OperationalResultGenerated", `Result generated for intent ${intentId}`);
       }
    }

    return result;
  }
}
