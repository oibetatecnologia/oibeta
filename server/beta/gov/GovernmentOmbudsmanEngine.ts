import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { MemoryOS } from "../workspace/MemoryOS";
import { 
  GovernmentOmbudsmanRequest,
  GovernmentOmbudsmanCategory,
  GovernmentOmbudsmanProtocol,
  GovernmentOmbudsmanResponse,
  GovernmentOmbudsmanAttachment,
  GovernmentOmbudsmanSummary,
  GovernmentOmbudsmanHealth 
} from "../core/types";

export class GovernmentOmbudsmanEngine {
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

  public async getOmbudsmanRequests(organizationId: string, workspaceId: string): Promise<GovernmentOmbudsmanRequest[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getOmbudsmanRequests(organizationId, workspaceId);
  }

  public async createOmbudsmanRequest(data: any): Promise<GovernmentOmbudsmanRequest> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const request = await this.dbAdapter.createOmbudsmanRequest(data);
    
    await this.kgEngine.createNode(
      request.id as string,
      "GovernmentOmbudsmanRequest",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.subject || "Ombudsman Request",
        ...request
      }
    );
    
    await this.kgEngine.createRelationship(
      data.organizationId,
      data.workspaceId,
      request.id as string,
      "HAS_OMBUDSMAN_REQUEST"
    );
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: request.id as string,
        entityType: "GovernmentOmbudsmanRequest",
        eventType: "GovernmentOmbudsmanRequestCreated",
        details: { requestId: request.id }
      }
    });

    return request;
  }

  public async getOmbudsmanCategories(organizationId: string, workspaceId: string): Promise<GovernmentOmbudsmanCategory[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getOmbudsmanCategories(organizationId, workspaceId);
  }

  public async createOmbudsmanCategory(data: any): Promise<GovernmentOmbudsmanCategory> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const category = await this.dbAdapter.createOmbudsmanCategory(data);
    
    await this.kgEngine.createNode(
      category.id as string,
      "GovernmentOmbudsmanCategory",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.name || "Category",
        ...category
      }
    );
    
    if (data.requestId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.requestId,
        category.id as string,
        "HAS_CATEGORY"
      );
    } else {
        await this.kgEngine.createRelationship(
            data.organizationId,
            data.workspaceId,
            category.id as string,
            "HAS_CATEGORY"
        );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: category.id as string,
        entityType: "GovernmentOmbudsmanCategory",
        eventType: "GovernmentOmbudsmanCategoryCreated",
        details: { categoryId: category.id }
      }
    });

    return category;
  }

  public async getOmbudsmanProtocols(organizationId: string, workspaceId: string): Promise<GovernmentOmbudsmanProtocol[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getOmbudsmanProtocols(organizationId, workspaceId);
  }

  public async createOmbudsmanProtocol(data: any): Promise<GovernmentOmbudsmanProtocol> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const protocol = await this.dbAdapter.createOmbudsmanProtocol(data);
    
    await this.kgEngine.createNode(
      protocol.id as string,
      "GovernmentOmbudsmanProtocol",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.protocolNumber || "Protocol",
        ...protocol
      }
    );
    
    if (data.requestId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.requestId,
        protocol.id as string,
        "HAS_PROTOCOL"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: protocol.id as string,
        entityType: "GovernmentOmbudsmanProtocol",
        eventType: "GovernmentOmbudsmanProtocolCreated",
        details: { protocolId: protocol.id }
      }
    });

    return protocol;
  }

  public async getOmbudsmanResponses(organizationId: string, workspaceId: string): Promise<GovernmentOmbudsmanResponse[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getOmbudsmanResponses(organizationId, workspaceId);
  }

  public async createOmbudsmanResponse(data: any): Promise<GovernmentOmbudsmanResponse> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const response = await this.dbAdapter.createOmbudsmanResponse(data);
    
    await this.kgEngine.createNode(
      response.id as string,
      "GovernmentOmbudsmanResponse",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: "Response",
        ...response
      }
    );
    
    if (data.requestId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.requestId,
        response.id as string,
        "HAS_RESPONSE"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: response.id as string,
        entityType: "GovernmentOmbudsmanResponse",
        eventType: "GovernmentOmbudsmanResponseCreated",
        details: { responseId: response.id }
      }
    });

    return response;
  }

  public async getOmbudsmanAttachments(organizationId: string, workspaceId: string): Promise<GovernmentOmbudsmanAttachment[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.dbAdapter.getOmbudsmanAttachments(organizationId, workspaceId);
  }

  public async createOmbudsmanAttachment(data: any): Promise<GovernmentOmbudsmanAttachment> {
    this.validateTenant(data.organizationId, data.workspaceId);
    const attachment = await this.dbAdapter.createOmbudsmanAttachment(data);
    
    await this.kgEngine.createNode(
      attachment.id as string,
      "GovernmentOmbudsmanAttachment",
      {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        name: data.fileName || "Attachment",
        ...attachment
      }
    );
    
    if (data.requestId) {
      await this.kgEngine.createRelationship(
        data.organizationId,
        data.requestId,
        attachment.id as string,
        "HAS_ATTACHMENT"
      );
    }
    
    await this.memoryOS.registerEvent({
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      type: "Generic",
      content: "Event",
      metadata: {
        entityId: attachment.id as string,
        entityType: "GovernmentOmbudsmanAttachment",
        eventType: "GovernmentOmbudsmanAttachmentCreated",
        details: { attachmentId: attachment.id }
      }
    });

    return attachment;
  }

  public async getOmbudsmanSummary(organizationId: string, workspaceId: string): Promise<GovernmentOmbudsmanSummary> {
    this.validateTenant(organizationId, workspaceId);
    const requests = await this.getOmbudsmanRequests(organizationId, workspaceId);
    const categories = await this.getOmbudsmanCategories(organizationId, workspaceId);
    const protocols = await this.getOmbudsmanProtocols(organizationId, workspaceId);
    const responsesDoc = await this.getOmbudsmanResponses(organizationId, workspaceId);
    const attachments = await this.getOmbudsmanAttachments(organizationId, workspaceId);

    let status = 'NO_DATA';
    if (requests.length > 0) {
      if (protocols.length > 0 && responsesDoc.length > 0) status = 'READY';
      else status = 'PARTIAL_DATA';
    }

    return {
      status,
      summary: {
        totalRequests: requests.length,
        totalCategories: categories.length,
        totalProtocols: protocols.length,
        totalResponses: responsesDoc.length,
        totalAttachments: attachments.length,
        lastComputedAt: new Date().toISOString()
      }
    };
  }

  public async getOmbudsmanHealth(organizationId: string, workspaceId: string): Promise<GovernmentOmbudsmanHealth> {
    try {
        const summary = await this.getOmbudsmanSummary(organizationId, workspaceId);
        let status: 'NO_DATA' | 'PARTIAL_DATA' | 'READY' = summary.status as any;
        
        await this.memoryOS.registerEvent({
            organizationId,
            workspaceId,
            type: "Generic",
            content: "Event",
            metadata: {
                eventType: "GovernmentOmbudsmanHealthComputed",
                status: status
            }
        });

        return {
            status,
            healthScore: status === 'READY' ? 100 : (status === 'PARTIAL_DATA' ? 50 : 0),
            metrics: {
                message: status === 'READY' ? 'Ombudsman module is fully operational.' : 
                     status === 'PARTIAL_DATA' ? 'Ombudsman has requests but missing protocols or responses.' : 
                     'Ombudsman has no requests initialized.',
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            status: 'NO_DATA',
            healthScore: 0,
            metrics: {
                message: 'Error computing health: ' + (error as Error).message,
                timestamp: new Date().toISOString()
            }
        };
    }
  }

}
