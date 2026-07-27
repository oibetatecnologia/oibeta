import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Module, OrganizationModule, ModuleFeature, OrganizationFeatureOverride } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ModuleAccessEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getModules(organizationId: string): Promise<Module[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to list modules.");
    }
    return this.db.getModules();
  }

  public async getFeatures(organizationId: string): Promise<ModuleFeature[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to list features.");
    }
    return this.db.getModuleFeatures();
  }

  public async getOrganizationModules(organizationId: string): Promise<OrganizationModule[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch organizational module mappings.");
    }
    return this.db.getOrganizationModules(organizationId);
  }

  public async hasModuleAccess(organizationId: string, moduleCode: string): Promise<boolean> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to verify module access.");
    }
    if (!moduleCode) {
      return false;
    }

    const [modules, orgModules] = await Promise.all([
      this.db.getModules(),
      this.db.getOrganizationModules(organizationId)
    ]);

    const targetModule = modules.find(m => m.code === moduleCode);
    if (!targetModule) return false;

    // Check if enabled for this org
    const mapping = orgModules.find(om => om.moduleId === targetModule.id);
    return mapping ? mapping.isEnabled : false;
  }

  public async hasFeatureAccess(organizationId: string, featureCode: string): Promise<boolean> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to verify feature access.");
    }
    if (!featureCode) {
      return false;
    }

    const [features, overrides] = await Promise.all([
      this.db.getModuleFeatures(),
      this.db.getOrganizationFeatures(organizationId)
    ]);

    const targetFeature = features.find(f => f.featureCode === featureCode);
    if (!targetFeature) return false;

    // First check if the parent module of this feature is active for the organization
    const parentModuleEnabled = await this.hasModuleAccessByModuleId(organizationId, targetFeature.moduleId);
    if (!parentModuleEnabled) return false;

    // Then check feature overrides
    const override = overrides.find(fo => fo.featureId === targetFeature.id);
    if (override) {
      return override.isEnabled;
    }

    // Default to true if module is active but no custom feature overrides are stored
    return true;
  }

  private async hasModuleAccessByModuleId(organizationId: string, moduleId: string): Promise<boolean> {
    const orgModules = await this.db.getOrganizationModules(organizationId);
    const mapping = orgModules.find(om => om.moduleId === moduleId);
    return mapping ? mapping.isEnabled : false;
  }

  public async getActiveModules(organizationId: string): Promise<Module[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch active modules.");
    }

    const [modules, orgModules] = await Promise.all([
      this.db.getModules(),
      this.db.getOrganizationModules(organizationId)
    ]);

    const enabledModuleIds = new Set(
      orgModules.filter(om => om.isEnabled).map(om => om.moduleId)
    );

    return modules.filter(m => enabledModuleIds.has(m.id));
  }

  public async getActiveFeatures(organizationId: string): Promise<ModuleFeature[]> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to fetch active features.");
    }

    const [activeModules, allFeatures, overrides] = await Promise.all([
      this.getActiveModules(organizationId),
      this.db.getModuleFeatures(),
      this.db.getOrganizationFeatures(organizationId)
    ]);

    const activeModuleIds = new Set(activeModules.map(m => m.id));

    // Filter features whose parent modules are active
    const candidateFeatures = allFeatures.filter(f => activeModuleIds.has(f.moduleId));

    // Map overrides for quick lookup
    const overrideMap = new Map(overrides.map(o => [o.featureId, o.isEnabled]));

    return candidateFeatures.filter(f => {
      const isOverrideEnabled = overrideMap.get(f.id);
      if (isOverrideEnabled !== undefined) {
        return isOverrideEnabled;
      }
      return true; // Default to true if parent module is active
    });
  }

  public async enableModule(organizationId: string, moduleCode: string, metadata: any = {}): Promise<OrganizationModule> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to enable a module.");
    }
    if (!moduleCode) {
      throw new Error("Validation Error: moduleCode is required.");
    }

    const modules = await this.db.getModules();
    const targetModule = modules.find(m => m.code === moduleCode);
    if (!targetModule) {
      throw new Error(`Module lookup failed for code: ${moduleCode}`);
    }

    const saved = await this.db.enableOrganizationModule(organizationId, targetModule.id, metadata);

    // Knowledge Graph Integration: Organization -> HAS_MODULE -> Module
    if (this.kgEngine) {
      try {
        const orgNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "ORGANIZATION",
          `Organization: ${organizationId}`,
          "",
          organizationId
        );
        const moduleNode = await this.kgEngine.ensureNode(
          organizationId,
          null,
          "KNOWLEDGE",
          `Module: ${targetModule.name}`,
          targetModule.description || "",
          targetModule.id,
          { code: targetModule.code }
        );
        // Link Module -> BELONGS_TO -> Organization
        await this.kgEngine.createRelationship(organizationId, moduleNode.id, orgNode.id, "BELONGS_TO");

        // Module -> PART_OF -> Feature for associated features
        const allFeatures = await this.db.getModuleFeatures();
        const moduleFeatures = allFeatures.filter(f => f.moduleId === targetModule.id);
        for (const feature of moduleFeatures) {
          const featureNode = await this.kgEngine.ensureNode(
            organizationId,
            null,
            "KNOWLEDGE",
            `Feature: ${feature.featureName}`,
            feature.description || "",
            feature.id,
            { code: feature.featureCode }
          );
          // Link Feature -> PART_OF -> Module
          await this.kgEngine.createRelationship(organizationId, featureNode.id, moduleNode.id, "PART_OF");
        }
      } catch (e) {
        console.warn("ModuleAccessEngine: KG integration failed", e);
      }
    }

    // Memory OS Integration Log
    if (this.memoryOS) {
       try {
          if (typeof (this.memoryOS as any).registerEvent === 'function') {
             await (this.memoryOS as any).registerEvent(organizationId, "ModuleEnabled", `Module activated: ${targetModule.name} (${moduleCode})`);
          }
       } catch (e) {}
    }

    return saved;
  }

  public async disableModule(organizationId: string, moduleCode: string): Promise<void> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to disable a module.");
    }
    if (!moduleCode) {
      throw new Error("Validation Error: moduleCode is required.");
    }

    const modules = await this.db.getModules();
    const targetModule = modules.find(m => m.code === moduleCode);
    if (!targetModule) {
      throw new Error(`Module lookup failed for code: ${moduleCode}`);
    }

    await this.db.disableOrganizationModule(organizationId, targetModule.id);

    // Memory OS Integration Log
    if (this.memoryOS) {
       try {
          if (typeof (this.memoryOS as any).registerEvent === 'function') {
             await (this.memoryOS as any).registerEvent(organizationId, "ModuleDisabled", `Module deactivated: ${targetModule.name} (${moduleCode})`);
          }
       } catch (e) {}
    }
  }

  // Support granular Feature override controls triggering Memory OS logging
  public async logFeatureOverridden(organizationId: string, featureCode: string, isEnabled: boolean): Promise<void> {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organization_id is required to override features.");
    }
    if (this.memoryOS) {
      try {
         if (typeof (this.memoryOS as any).registerEvent === 'function') {
            const eventType = isEnabled ? "FeatureEnabled" : "FeatureDisabled";
            await (this.memoryOS as any).registerEvent(organizationId, eventType, `Feature override set: ${featureCode} (${isEnabled ? 'Enabled' : 'Disabled'})`);
         }
      } catch (e) {}
    }
  }
}
