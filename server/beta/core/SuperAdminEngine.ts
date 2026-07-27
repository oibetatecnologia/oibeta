import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { SuperAdminAuditLog, OrganizationSetting, OrganizationModule } from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class SuperAdminEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  public async getOrganizations(): Promise<any[]> {
    return this.db.getOrganizations();
  }

  public async getOrganizationDetails(id: string): Promise<any> {
    if (!id) {
      throw new Error("Validation Error: id is required to fetch organization details.");
    }
    return this.db.getOrganizationDetails(id);
  }

  public async getOrganizationModules(organizationId: string): Promise<OrganizationModule[]> {
    if (!organizationId) {
      throw new Error("Validation Error: organizationId is required to fetch modules.");
    }
    return this.db.getOrganizationModules(organizationId);
  }

  public async getOrganizationUsers(organizationId: string): Promise<any[]> {
    if (!organizationId) {
      throw new Error("Validation Error: organizationId is required to fetch users.");
    }
    return this.db.getOrganizationUsers(organizationId);
  }

  public async getAuditLogs(): Promise<SuperAdminAuditLog[]> {
    return this.db.getAuditLogs();
  }

  public async createAuditLog(actorUserId: string, organizationId: string, actionType: string, entityType: string, entityId: string, description: string, metadataJson: any = {}): Promise<SuperAdminAuditLog> {
    const log = await this.db.createAuditLog({
      actorUserId,
      organizationId,
      actionType,
      entityType,
      entityId,
      description,
      metadataJson
    });

    return log;
  }

  public async getOrganizationSettings(organizationId: string): Promise<OrganizationSetting[]> {
    if (!organizationId) {
      throw new Error("Validation Error: organizationId is required.");
    }
    return this.db.getOrganizationSettings(organizationId);
  }

  public async updateOrganizationSetting(actorUserId: string, organizationId: string, key: string, value: string, metadataJson: any = {}): Promise<OrganizationSetting> {
    if (!organizationId) {
      throw new Error("Validation Error: organizationId is required.");
    }
    if (!key) {
      throw new Error("Validation Error: setting key is required.");
    }

    const setting = await this.db.updateOrganizationSetting(organizationId, key, value, metadataJson);

    // Write audit log
    await this.createAuditLog(
      actorUserId,
      organizationId,
      "UPDATE_SETTING",
      "SETTING",
      key,
      `Updated platform setting '${key}' to '${value}'`,
      metadataJson
    );

    // Register Memory OS event
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(organizationId, "OrganizationSettingUpdated", `Setting '${key}' modified to value: ${value}`);
        }
      } catch (e) {}
    }

    return setting;
  }

  // Handle Organization Enablement/Activation Audit logging and Memory OS triggers
  public async logOrganizationStatusChange(actorUserId: string, organizationId: string, isActive: boolean): Promise<void> {
    const eventType = isActive ? "OrganizationActivated" : "OrganizationDeactivated";
    const desc = `Organization status set to: ${isActive ? 'ACTIVE' : 'INACTIVE'}`;

    await this.createAuditLog(
      actorUserId,
      organizationId,
      isActive ? "ACTIVATE_ORG" : "DEACTIVATE_ORG",
      "ORGANIZATION",
      organizationId,
      desc
    );

    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(organizationId, eventType, desc);
        }
      } catch (e) {}
    }
  }
}
