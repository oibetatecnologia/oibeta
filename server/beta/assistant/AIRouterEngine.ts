import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { BetaAssistantContextEngine } from "./BetaAssistantContextEngine";
import { WorkspaceIntelligenceOrchestrator } from "../workspace/WorkspaceIntelligenceOrchestrator";
import { OperationalCommandCenterEngine } from "../core/OperationalCommandCenterEngine";
import { AIProvider, AIRouterRequest, AIRouterContext, AIRouterPolicy, AIRouterResult, AIRouterAudit, AIProviderConfiguration } from "../core/types";

export class AIRouterEngine {
  private db: DatabaseAdapter;
  private kg: KnowledgeGraphEngine;
  private memoryOS: any;
  private betaAssistantContext: BetaAssistantContextEngine;
  private workspaceIntelligence: WorkspaceIntelligenceOrchestrator;
  private commandCenter: OperationalCommandCenterEngine;
  private moduleAccessEngine: any;
  private workspaceEngine: any;

  constructor(
    db: DatabaseAdapter,
    kg: KnowledgeGraphEngine,
    memoryOS: any,
    betaAssistantContext: BetaAssistantContextEngine,
    workspaceIntelligence: WorkspaceIntelligenceOrchestrator,
    commandCenter: OperationalCommandCenterEngine,
    dependencies: {
      moduleAccessEngine?: any;
      workspaceEngine?: any;
    }
  ) {
    this.db = db;
    this.kg = kg;
    this.memoryOS = memoryOS;
    this.betaAssistantContext = betaAssistantContext;
    this.workspaceIntelligence = workspaceIntelligence;
    this.commandCenter = commandCenter;
    this.moduleAccessEngine = dependencies.moduleAccessEngine;
    this.workspaceEngine = dependencies.workspaceEngine;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  // --- PROVIDER REGISTRY ---

  public async getAvailableProviders(organizationId: string, workspaceId: string): Promise<AIProvider[]> {
    this.validateTenant(organizationId, workspaceId);
    return await this.db.getProviders(organizationId, workspaceId).catch(() => []);
  }

  public async getProviderConfiguration(organizationId: string, workspaceId: string, providerName: string): Promise<AIProviderConfiguration | null> {
    this.validateTenant(organizationId, workspaceId);
    const providers = await this.getAvailableProviders(organizationId, workspaceId);
    const provider = providers.find(p => p.providerName === providerName && p.status === "ACTIVE");
    return provider ? provider.configuration : null;
  }

  public async registerProvider(organizationId: string, workspaceId: string, data: any): Promise<AIProvider> {
    this.validateTenant(organizationId, workspaceId);
    
    // Simulate mapping 
    const record = {
      organizationId,
      workspaceId,
      providerName: data.providerName,
      status: "ACTIVE",
      configuration: data.configuration,
    };
    
    const result = await this.db.registerProvider(record);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "ProviderRegistered", `Provider ${data.providerName} registered for workspace ${workspaceId}.`);
    }

    if (this.kg) {
      try {
        const providerNode = await this.kg.ensureNode(organizationId, workspaceId, "AI_PROVIDER", `Provider: ${data.providerName}`, data.providerName, `provider_${result.id}`);
        const wsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Workspace ${workspaceId}`, "", workspaceId);
        await this.kg.createRelationship(organizationId, wsNode.id, providerNode.id, "HAS_PROVIDER");
      } catch (e) {}
    }

    return result;
  }

  public async disableProvider(organizationId: string, workspaceId: string, id: string): Promise<AIProvider> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.db.disableProvider(organizationId, workspaceId, id);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "ProviderDisabled", `Provider ${id} disabled for workspace ${workspaceId}.`);
    }

    return result;
  }

  public async enableProvider(organizationId: string, workspaceId: string, id: string): Promise<AIProvider> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.db.enableProvider(organizationId, workspaceId, id);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "ProviderEnabled", `Provider ${id} enabled for workspace ${workspaceId}.`);
    }

    return result;
  }

  // --- ROUTER REQUEST ---

  public async createRouterRequest(data: {
    organizationId: string,
    workspaceId: string,
    userId: string,
    provider: string,
    module: string,
    requestType: string,
    metadata?: any
  }): Promise<AIRouterRequest> {
    this.validateTenant(data.organizationId, data.workspaceId);
    
    const requestData = {
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      providerName: data.provider,
      moduleName: data.module,
      requestType: data.requestType,
      status: "PENDING",
      metadata: data.metadata || {},
      requestedAt: new Date().toISOString()
    };
    
    const result = await this.db.createRouterRequest(requestData);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(data.organizationId, "RouterRequestCreated", `Router request ${result.id} created for workspace ${data.workspaceId}.`);
    }

    if (this.kg) {
      try {
        const reqNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "AI_ROUTER_REQUEST", `Request: ${data.requestType}`, data.requestType, `request_${result.id}`);
        const wsNode = await this.kg.ensureNode(data.organizationId, data.workspaceId, "PROJECT", `Workspace ${data.workspaceId}`, "", data.workspaceId);
        await this.kg.createRelationship(data.organizationId, wsNode.id, reqNode.id, "HAS_ROUTER_REQUEST");
      } catch (e) {}
    }

    return result;
  }

  // --- ROUTER CONTEXT ---

  public async buildRouterContext(organizationId: string, workspaceId: string): Promise<AIRouterContext> {
    this.validateTenant(organizationId, workspaceId);

    const assistantContext = await this.betaAssistantContext.createAssistantContext(organizationId, workspaceId).catch(() => "NO_DATA" as any);
    const workspaceContext = await this.workspaceIntelligence.buildWorkspaceContext(organizationId, workspaceId).catch(() => "NO_DATA" as any);
    const operationalSummary = await this.commandCenter.getOperationalSummary(organizationId, workspaceId).catch(() => "NO_DATA" as any);

    return {
      assistantContext,
      workspaceContext,
      operationalSummary,
      knowledgeContext: "NO_DATA" as any, // Extracted/simplified for router processing
      memoryContext: "NO_DATA" as any, // Extracted/simplified for router processing
      generatedAt: new Date().toISOString()
    };
  }

  // --- ROUTER POLICY ---

  public async getRouterPolicy(organizationId: string, workspaceId: string): Promise<AIRouterPolicy | null> {
    this.validateTenant(organizationId, workspaceId);
    const policies = await this.db.getPolicies(organizationId, workspaceId).catch(() => []);
    const activePolicy = policies.find((p: any) => p.status === "ACTIVE");
    
    if (activePolicy) return activePolicy;
    
    // Default mock policy
    return {
      id: "default-policy",
      organizationId,
      workspaceId,
      policyName: "Default Beta Policy",
      status: "ACTIVE",
      allowedProviders: ["openai", "gemini", "claude", "custom"],
      allowedModules: ["*"],
      allowedRequestTypes: ["*"],
      maxContextSize: 128000,
      configuration: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  public async createPolicy(organizationId: string, workspaceId: string, data: any): Promise<AIRouterPolicy> {
    this.validateTenant(organizationId, workspaceId);
    const record = {
      organizationId,
      workspaceId,
      ...data
    };
    
    const result = await this.db.createPolicy(record);

    if (this.kg) {
      try {
        const policyNode = await this.kg.ensureNode(organizationId, workspaceId, "AI_ROUTER_POLICY", `Policy: ${data.policyName}`, data.policyName, `policy_${result.id}`);
        const wsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Workspace ${workspaceId}`, "", workspaceId);
        await this.kg.createRelationship(organizationId, wsNode.id, policyNode.id, "HAS_POLICY");
      } catch (e) {}
    }

    return result;
  }

  // --- ROUTER AUDIT ---

  public async createRouterAudit(data: {
    organizationId: string,
    workspaceId: string,
    userId: string,
    provider: string,
    requestType: string,
    status: string
  }): Promise<AIRouterAudit> {
    this.validateTenant(data.organizationId, data.workspaceId);
    
    const auditData = {
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      providerName: data.provider,
      requestType: data.requestType,
      status: data.status
    };
    
    const result = await this.db.createRouterAudit(auditData);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(data.organizationId, "RouterAuditCreated", `Router audit ${result.id} created for workspace ${data.workspaceId}.`);
    }

    return result;
  }

  public async getRouterAudits(organizationId: string, workspaceId: string): Promise<AIRouterAudit[]> {
    this.validateTenant(organizationId, workspaceId);
    return await this.db.getRouterAudits(organizationId, workspaceId).catch(() => []);
  }

  // --- ROUTER STATUS & HEALTH ---

  public async getRouterStatus(organizationId: string, workspaceId: string): Promise<string> {
    this.validateTenant(organizationId, workspaceId);
    const providers = await this.getAvailableProviders(organizationId, workspaceId);
    const policies = await this.db.getPolicies(organizationId, workspaceId).catch(() => []);

    if (providers.length > 0 && policies.length > 0) return "READY";
    if (providers.length > 0 || policies.length > 0) return "PARTIAL_DATA";
    return "NO_DATA";
  }

  public async getRouterHealth(organizationId: string, workspaceId: string): Promise<{status: string, details: string}> {
    this.validateTenant(organizationId, workspaceId);
    const providers = await this.getAvailableProviders(organizationId, workspaceId);
    const status = await this.getRouterStatus(organizationId, workspaceId);
    
    const activeProviders = providers.filter(p => p.status === "ACTIVE").length;

    return {
      status,
      details: `${activeProviders} active providers. Context ready.`
    };
  }
}
