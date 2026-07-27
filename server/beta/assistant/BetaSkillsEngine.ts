import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { 
  BetaSkill, BetaCapability, BetaSkillRegistry, BetaSkillValidation, BetaSkillResult
} from "../core/types";

export class BetaSkillsEngine {
  private db: DatabaseAdapter;
  private kg: KnowledgeGraphEngine;
  private memoryOS: any;
  
  private moduleAccessEngine?: any;
  private workspaceEngine?: any;

  constructor(
    db: DatabaseAdapter,
    kg: KnowledgeGraphEngine,
    memoryOS: any,
    dependencies: {
      moduleAccessEngine?: any;
      workspaceEngine?: any;
    }
  ) {
    this.db = db;
    this.kg = kg;
    this.memoryOS = memoryOS;
    this.moduleAccessEngine = dependencies.moduleAccessEngine;
    this.workspaceEngine = dependencies.workspaceEngine;
  }

  private validateTenant(orgId: string, wsId: string) {
    if (!orgId) throw new Error("Multi-Tenant Error: organizationId is required.");
    if (!wsId) throw new Error("Multi-Tenant Error: workspaceId is required.");
  }

  // --- SKILL REGISTRY ---

  public async registerSkill(organizationId: string, workspaceId: string, data: any): Promise<BetaSkill> {
    this.validateTenant(organizationId, workspaceId);

    const record = {
      organizationId,
      workspaceId,
      skillName: data.skillName,
      category: data.category,
      description: data.description,
      status: "ACTIVE"
    };

    const skill = await this.db.registerSkill(record);

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "SkillRegistered", `Skill ${skill.skillName} registered.`);
    }

    if (this.kg) {
      try {
        const skillNode = await this.kg.ensureNode(organizationId, workspaceId, "BETA_SKILL", `Skill: ${skill.skillName}`, skill.category, `skill_${skill.id}`);
        const wsNode = await this.kg.ensureNode(organizationId, workspaceId, "PROJECT", `Workspace ${workspaceId}`, "", workspaceId);
        await this.kg.createRelationship(organizationId, wsNode.id, skillNode.id, "HAS_SKILL");
        
        if (data.moduleCode) {
           const moduleNode = await this.kg.ensureNode(organizationId, workspaceId, "BETA_MODULE", `Module: ${data.moduleCode}`, data.moduleCode, `module_${data.moduleCode}`);
           await this.kg.createRelationship(organizationId, skillNode.id, moduleNode.id, "PROVIDED_BY");
        }
      } catch (e) {}
    }

    return skill;
  }

  public async enableSkill(organizationId: string, workspaceId: string, id: string): Promise<BetaSkillResult> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.db.enableSkill(organizationId, workspaceId, id);
    if (!result) return { success: false, error: "Skill not found" };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "SkillEnabled", `Skill ${id} enabled.`);
    }

    return { success: true, skill: result };
  }

  public async disableSkill(organizationId: string, workspaceId: string, id: string): Promise<BetaSkillResult> {
    this.validateTenant(organizationId, workspaceId);
    const result = await this.db.disableSkill(organizationId, workspaceId, id);
    if (!result) return { success: false, error: "Skill not found" };

    if (this.memoryOS && typeof this.memoryOS.registerEvent === "function") {
      await this.memoryOS.registerEvent(organizationId, "SkillDisabled", `Skill ${id} disabled.`);
    }

    return { success: true, skill: result };
  }

  public async getSkill(organizationId: string, workspaceId: string, id: string): Promise<BetaSkill | null> {
    this.validateTenant(organizationId, workspaceId);
    return await this.db.getSkill(organizationId, workspaceId, id);
  }

  public async getSkills(organizationId: string, workspaceId: string): Promise<BetaSkill[]> {
    this.validateTenant(organizationId, workspaceId);
    return await this.db.getSkills(organizationId, workspaceId).catch(() => []);
  }

  // --- VALIDATION ---

  public async validateSkill(organizationId: string, workspaceId: string, id: string): Promise<BetaSkillValidation> {
    this.validateTenant(organizationId, workspaceId);
    const skill = await this.getSkill(organizationId, workspaceId, id);
    if (!skill) return { status: "NOT_FOUND", reason: "Skill not registered" };
    if (skill.status !== "ACTIVE") return { status: "DISABLED", reason: "Skill is disabled" };

    return { status: "VALID" };
  }

  // --- CAPABILITIES ---

  public async getCapabilities(organizationId: string, workspaceId: string): Promise<BetaCapability[]> {
    this.validateTenant(organizationId, workspaceId);
    
    // Attempt to pull from DB, if none, maybe auto-populate
    let caps = await this.db.getCapabilities(organizationId, workspaceId).catch(() => []);

    return caps;
  }
}
