import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import {
  CommunicationRequest,
  CommunicationDispatch
} from "./types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ActionDispatchEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  private validateTenant(organizationId: string, workspaceId: string) {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required is mandatory for Action Dispatch.");
    }
    if (!workspaceId) {
      throw new Error("Multi-Tenant Error: workspaceId is mandatory for Action Dispatch.");
    }
  }

  public async getRequests(organizationId: string, workspaceId: string): Promise<CommunicationRequest[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.db.getCommunicationRequests(organizationId, workspaceId);
  }

  public async getPendingRequests(organizationId: string, workspaceId: string): Promise<CommunicationRequest[]> {
    this.validateTenant(organizationId, workspaceId);
    const list = await this.db.getCommunicationRequests(organizationId, workspaceId);
    return list.filter(r => r.status === "PENDING" || r.status === "ACTIVE");
  }

  public async createRequest(
    organizationId: string,
    workspaceId: string,
    data: {
      requestType: string; // meeting_request, report_request, task_request, information_request, approval_request
      requesterUserId: string;
      targetUserId: string;
      relatedEntityType?: string | null;
      relatedEntityId?: string | null;
      description: string;
      status?: string;
    }
  ): Promise<CommunicationRequest> {
    this.validateTenant(organizationId, workspaceId);
    if (!data.requestType || !data.requesterUserId || !data.targetUserId || !data.description) {
      throw new Error("Validation Error: requestType, requesterUserId, targetUserId, and description are mandatory.");
    }

    const request = await this.db.createCommunicationRequest({
      organizationId,
      workspaceId,
      requestType: data.requestType,
      requesterUserId: data.requesterUserId,
      targetUserId: data.targetUserId,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      status: data.status || "PENDING",
      description: data.description
    });

    // Knowledge Graph integration
    if (this.kgEngine) {
      try {
        const reqNode = await this.kgEngine.ensureNode(organizationId, null, "REQUEST", `Request: ${request.requestType}`, request.description, request.id);
        const userNode = await this.kgEngine.ensureNode(organizationId, null, "USER", `User: ${data.requesterUserId}`, "", data.requesterUserId);
        await this.kgEngine.createRelationship(organizationId, userNode.id, reqNode.id, "REQUESTED");
      } catch (e) {
        console.warn("ActionDispatchEngine KG relation mapping failed:", e);
      }
    }

    // Memory OS registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CommunicationRequestCreated",
            `Communication request of type '${request.requestType}' created by user ${request.requesterUserId} targeting ${request.targetUserId}.`
          );
        }
      } catch (e) {}
    }

    // Log transaction
    try {
      const log = await this.db.createCommunicationLog({
        organizationId,
        workspaceId,
        eventType: "REQUEST_CREATED",
        entityType: "REQUEST",
        entityId: request.id,
        description: `Request type '${request.requestType}' raised from user ${request.requesterUserId} to ${request.targetUserId}.`
      });
      if (this.memoryOS && typeof (this.memoryOS as any).registerEvent === "function") {
         await (this.memoryOS as any).registerEvent(organizationId, "CommunicationLogCreated", `Log entry created for ${log.eventType}`);
      }
    } catch (e) {}

    return request;
  }

  public async getDispatches(organizationId: string, workspaceId: string): Promise<CommunicationDispatch[]> {
    this.validateTenant(organizationId, workspaceId);
    return this.db.getCommunicationDispatches(organizationId, workspaceId);
  }

  public async getPendingDispatches(organizationId: string, workspaceId: string): Promise<CommunicationDispatch[]> {
    this.validateTenant(organizationId, workspaceId);
    const list = await this.db.getCommunicationDispatches(organizationId, workspaceId);
    return list.filter(d => d.status === "DISPATCHED" || d.status === "PENDING");
  }

  public async createDispatch(
    organizationId: string,
    workspaceId: string,
    data: {
      dispatchType: string; // task_dispatch, agenda_dispatch, report_dispatch, coordination_dispatch
      sourceUserId: string;
      targetUserId: string;
      relatedEntityType?: string | null;
      relatedEntityId?: string | null;
      description: string;
      status?: string;
    }
  ): Promise<CommunicationDispatch> {
    this.validateTenant(organizationId, workspaceId);
    if (!data.dispatchType || !data.sourceUserId || !data.targetUserId || !data.description) {
      throw new Error("Validation Error: dispatchType, sourceUserId, targetUserId, and description are mandatory.");
    }

    const dispatch = await this.db.createCommunicationDispatch({
      organizationId,
      workspaceId,
      dispatchType: data.dispatchType,
      sourceUserId: data.sourceUserId,
      targetUserId: data.targetUserId,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      status: data.status || "DISPATCHED",
      description: data.description
    });

    // Knowledge Graph integration
    if (this.kgEngine) {
      try {
        const dispNode = await this.kgEngine.ensureNode(organizationId, null, "DISPATCH", `Dispatch: ${dispatch.dispatchType}`, dispatch.description, dispatch.id);
        const userNode = await this.kgEngine.ensureNode(organizationId, null, "USER", `User: ${data.sourceUserId}`, "", data.sourceUserId);
        await this.kgEngine.createRelationship(organizationId, userNode.id, dispNode.id, "DISPATCHED");
      } catch (e) {
        console.warn("ActionDispatchEngine KG relation mapping failed on dispatch:", e);
      }
    }

    // Memory OS registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CommunicationDispatchCreated",
            `A dispatch action '${dispatch.dispatchType}' was sent from user ${dispatch.sourceUserId} to ${dispatch.targetUserId}.`
          );
        }
      } catch (e) {}
    }

    // Log transaction
    try {
      const log = await this.db.createCommunicationLog({
        organizationId,
        workspaceId,
        eventType: "DISPATCH_CREATED",
        entityType: "DISPATCH",
        entityId: dispatch.id,
        description: `Action dispatched of type '${dispatch.dispatchType}' by user ${dispatch.sourceUserId} assigned to ${dispatch.targetUserId}.`
      });
      if (this.memoryOS && typeof (this.memoryOS as any).registerEvent === "function") {
         await (this.memoryOS as any).registerEvent(organizationId, "CommunicationLogCreated", `Log entry created for ${log.eventType}`);
      }
    } catch (e) {}

    return dispatch;
  }

  /**
   * Workspace Intelligence calculations covering dispatches and requests.
   * Compiles pending operations, lost/unanswered dispatch requests, silent channels, and list of unassigned members.
   */
  public async getWorkspaceIntelligence(organizationId: string, workspaceId: string): Promise<any> {
    this.validateTenant(organizationId, workspaceId);

    const now = new Date();
    const requests = await this.db.getCommunicationRequests(organizationId, workspaceId);
    const dispatches = await this.db.getCommunicationDispatches(organizationId, workspaceId);
    
    // 1. Pending Requests (and overdue pending requests > 3 days)
    const pendingRequests = requests.filter(r => r.status === "PENDING" || r.status === "ACTIVE");
    const overdueRequests = pendingRequests.filter(r => {
      const createdDate = new Date(r.createdAt);
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 3;
    });

    // 2. Unanswered/Unresolved Dispatches
    const unansweredDispatches = dispatches.filter(d => d.status === "DISPATCHED" || d.status === "PENDING");

    // 3. Teams/threads without communication
    const threads = await this.db.getCommunicationThreads(organizationId, workspaceId);
    const silentThreads: any[] = [];
    for (const thread of threads) {
      const msgs = await this.db.getCommunicationMessages(organizationId, workspaceId, thread.id);
      if (msgs.length === 0) {
        silentThreads.push({ id: thread.id, title: thread.title, threadType: thread.threadType });
      }
    }

    // 4. Inactive Users (users who haven't sent any messages, initiated request or dispatches)
    // Query users in workspace (contacts or members), but to avoid simulated users let's analyze actual users seen in participants
    const activeUserSet = new Set<string>();
    for (const req of requests) {
      activeUserSet.add(req.requesterUserId);
      activeUserSet.add(req.targetUserId);
    }
    for (const disp of dispatches) {
      activeUserSet.add(disp.sourceUserId);
      activeUserSet.add(disp.targetUserId);
    }

    return {
      pendingRequestsCount: pendingRequests.length,
      unansweredDispatchesCount: unansweredDispatches.length,
      overdueRequestsCount: overdueRequests.length,
      overdueRequests: overdueRequests.map(r => ({ id: r.id, requestType: r.requestType, description: r.description, createdAt: r.createdAt })),
      unansweredDispatches: unansweredDispatches.map(d => ({ id: d.id, dispatchType: d.dispatchType, description: d.description, createdAt: d.createdAt })),
      silentTeams: silentThreads,
      inactiveIntel: {
        activeUsersDiscovered: Array.from(activeUserSet)
      }
    };
  }
}
