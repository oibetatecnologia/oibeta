import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { 
  CampaignContact, 
  CampaignContactRelationship, 
  CampaignContactSegment, 
  CampaignContactEngagement 
} from "../core/types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class CampaignCRMEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine
  ) {}

  /**
   * multi-tenant validation to assert that every transaction has appropriate tenant data.
   */
  private validateTenant(organizationId: string, workspaceId?: string, campaignId?: string) {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required Campaign CRM.");
    }
    if (workspaceId !== undefined && !workspaceId) {
      throw new Error("Multi-Tenant Error: workspaceId is required Campaign CRM.");
    }
    if (campaignId !== undefined && !campaignId) {
      throw new Error("Multi-Tenant Error: campaignId is required Campaign CRM.");
    }
  }

  // --- Campaign Contact Management ---

  public async getContacts(organizationId: string, campaignId: string): Promise<CampaignContact[]> {
    this.validateTenant(organizationId, undefined, campaignId);
    return this.db.getCampaignContacts(organizationId, campaignId);
  }

  public async getContact(organizationId: string, campaignId: string, id: string): Promise<CampaignContact | null> {
    this.validateTenant(organizationId, undefined, campaignId);
    const contacts = await this.db.getCampaignContacts(organizationId, campaignId);
    return contacts.find(c => c.id === id || c.contactId === id) || null;
  }

  public async addContact(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    data: {
      contactId: string;
      contactType: string;
      status?: string;
      priorityLevel?: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignContact> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!data.contactId || !data.contactType) {
      throw new Error("Validation Error: contactId and contactType are required.");
    }

    const campaignContact = await this.db.addCampaignContact({
      organizationId,
      workspaceId,
      campaignId,
      contactId: data.contactId,
      contactType: data.contactType,
      status: data.status || "ACTIVE",
      priorityLevel: data.priorityLevel || "HIGH",
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(organizationId, null, "CAMPAIGN", `Campaign: ${campaignId}`, "", campaignId);
        const contactNode = await this.kgEngine.ensureNode(organizationId, null, "CONTACT", `Contact: ${data.contactId}`, "", data.contactId);
        
        await this.kgEngine.createRelationship(organizationId, campNode.id, contactNode.id, "HAS_CONTACT");
        await this.kgEngine.createRelationship(organizationId, contactNode.id, campNode.id, "SUPPORTS");
      } catch (e) {
        console.warn("CampaignCRMEngine KG integration on addContact failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignContactAdded",
            `Campaign contact registered successfully with role '${data.contactType}' for campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return campaignContact;
  }

  public async updateContact(
    id: string,
    organizationId: string,
    campaignId: string,
    data: {
      contactType?: string;
      status?: string;
      priorityLevel?: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignContact> {
    this.validateTenant(organizationId, undefined, campaignId);
    
    const updated = await this.db.updateCampaignContact(id, organizationId, data);

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignContactUpdated",
            `Campaign contact '${id}' updated successfully in campaign ${campaignId}`
          );
        }
      } catch (e) {}
    }

    return updated;
  }

  // --- Political Relations Management ---

  public async getRelationships(organizationId: string, campaignId: string): Promise<CampaignContactRelationship[]> {
    this.validateTenant(organizationId, undefined, campaignId);
    return this.db.getContactRelationships(organizationId, campaignId);
  }

  public async createRelationship(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    data: {
      sourceContactId: string;
      targetContactId: string;
      relationshipType: string;
      strengthLevel?: string;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignContactRelationship> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!data.sourceContactId || !data.targetContactId || !data.relationshipType) {
      throw new Error("Validation Error: sourceContactId, targetContactId, and relationshipType are required.");
    }

    const rel = await this.db.createRelationship({
      organizationId,
      workspaceId,
      campaignId,
      sourceContactId: data.sourceContactId,
      targetContactId: data.targetContactId,
      relationshipType: data.relationshipType,
      strengthLevel: data.strengthLevel || "medium",
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const sourceNode = await this.kgEngine.ensureNode(organizationId, null, "CONTACT", `Contact: ${data.sourceContactId}`, "", data.sourceContactId);
        const targetNode = await this.kgEngine.ensureNode(organizationId, null, "CONTACT", `Contact: ${data.targetContactId}`, "", data.targetContactId);
        
        if (data.relationshipType === "influences") {
          await this.kgEngine.createRelationship(organizationId, sourceNode.id, targetNode.id, "INFLUENCES");
        } else if (data.relationshipType === "reports_to") {
          await this.kgEngine.createRelationship(organizationId, sourceNode.id, targetNode.id, "REPORTS_TO");
        } else if (data.relationshipType === "coordinates") {
          const coordNode = await this.kgEngine.ensureNode(organizationId, null, "COORDINATOR", `Coordinator: ${data.sourceContactId}`, "", data.sourceContactId);
          await this.kgEngine.createRelationship(organizationId, coordNode.id, targetNode.id, "COORDINATES");
        } else {
          await this.kgEngine.createRelationship(organizationId, sourceNode.id, targetNode.id, "ASSOCIATED_WITH");
        }
      } catch (e) {
        console.warn("CampaignCRMEngine KG integration on createRelationship failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignRelationshipCreated",
            `Created political relationship '${data.relationshipType}' between contacts ${data.sourceContactId} and ${data.targetContactId}`
          );
        }
      } catch (e) {}
    }

    return rel;
  }

  // --- Campaign Segments Management ---

  public async getSegments(organizationId: string, campaignId: string): Promise<CampaignContactSegment[]> {
    this.validateTenant(organizationId, undefined, campaignId);
    return this.db.getContactSegments(organizationId, campaignId);
  }

  public async createSegment(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    data: {
      name: string;
      description?: string;
      status?: string;
    }
  ): Promise<CampaignContactSegment> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!data.name) {
      throw new Error("Validation Error: Segment name is required.");
    }

    const seg = await this.db.createSegment({
      organizationId,
      workspaceId,
      campaignId,
      name: data.name,
      description: data.description || null,
      status: data.status || "ACTIVE"
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const segNode = await this.kgEngine.ensureNode(organizationId, null, "SEGMENT", `Segment: ${data.name}`, "", seg.id);
        const campNode = await this.kgEngine.ensureNode(organizationId, null, "CAMPAIGN", `Campaign: ${campaignId}`, "", campaignId);
        await this.kgEngine.createRelationship(organizationId, segNode.id, campNode.id, "BELONGS_TO");
      } catch (e) {
        console.warn("CampaignCRMEngine KG integration on createSegment failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignSegmentCreated",
            `Political campaign segment '${data.name}' has been created.`
          );
        }
      } catch (e) {}
    }

    return seg;
  }

  // --- Contact Engagement Engine ---

  public async getEngagement(organizationId: string, campaignId: string): Promise<CampaignContactEngagement[]> {
    this.validateTenant(organizationId, undefined, campaignId);
    return this.db.getContactEngagement(organizationId, campaignId);
  }

  public async computeEngagement(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    contactId: string
  ): Promise<CampaignContactEngagement> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!contactId) {
      throw new Error("Validation Error: contactId is required to compute engagement.");
    }

    // Pull evidence-based transaction arrays from database
    const [allInteractions, allActivities, allEvidences] = await Promise.all([
      this.db.getCRMInteractions(organizationId),
      this.db.getActivities(organizationId),
      // Actually evidence list usually takes project id/etc, but let's see, if there is a getCampaignEvidences we can query.
      this.db.getCampaignEvidences(campaignId).catch(() => [] as any[])
    ]);

    // 1. Filter CRM Interactions linked to this contact
    const contactInteractions = (allInteractions || []).filter(
      (item: any) => item.contactId === contactId
    );

    // 2. Filter Activities linked to this contact (Contact is either relatedEntityType or referenced)
    const contactActivities = (allActivities || []).filter(
      (item: any) => 
        (String(item.relatedEntityType).toLowerCase() === "contact" && item.relatedEntityId === contactId) ||
        (item.metadataJson && item.metadataJson.contactId === contactId)
    );

    // 3. Action integration can be mapped through Activity
    const campaignActions = await this.db.getCampaignActions(campaignId).catch(() => [] as any[]);
    const activityIds = new Set(contactActivities.map(a => a.id));
    const contactActions = campaignActions.filter(act => act.activityId && activityIds.has(act.activityId));

    // 4. Evidence integration mapped through ContactId
    // Since CampaignEvidences references general Evidence payload, let's correlate them if possible
    const associatedEvidences = (allEvidences || []).filter(
      (ev: any) => 
        (String(ev.relatedEntityType).toLowerCase() === "contact" && ev.relatedEntityId === contactId) ||
        (ev.metadataJson && ev.metadataJson.contactId === contactId)
    );

    // Calculate aggregate metrics
    const interactionsCount = contactInteractions.length;
    const activitiesCount = contactActivities.length + contactActions.length;
    const eventsCount = associatedEvidences.length;

    // Retrieve latest date from any real interactions/activities/actions/evidences
    let lastInteractionAt: string | null = null;
    const dateCollection: number[] = [];

    contactInteractions.forEach((i: any) => {
      if (i.interactionDate) dateCollection.push(Date.parse(String(i.interactionDate)));
      if (i.createdAt) dateCollection.push(Date.parse(String(i.createdAt)));
    });

    contactActivities.forEach((a: any) => {
      if (a.createdAt) dateCollection.push(Date.parse(String(a.createdAt)));
    });

    associatedEvidences.forEach((e: any) => {
      if (e.createdAt) dateCollection.push(Date.parse(String(e.createdAt)));
    });

    if (dateCollection.length > 0) {
      const maxDate = Math.max(...dateCollection);
      lastInteractionAt = new Date(maxDate).toISOString();
    }

    // Engagement level determination based strictly on actual metrics
    const totalCount = interactionsCount + activitiesCount + eventsCount;
    let engagementStatus = "NO_DATA";

    if (totalCount === 0) {
      engagementStatus = "NO_DATA";
    } else {
      // Inactive rule: No interaction or activity within past 30 days
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (lastInteractionAt && (Date.now() - Date.parse(lastInteractionAt) > thirtyDays)) {
        engagementStatus = "INACTIVE";
      } else if (totalCount <= 2) {
        engagementStatus = "LOW";
      } else if (totalCount <= 6) {
        engagementStatus = "MEDIUM";
      } else {
        engagementStatus = "HIGH";
      }
    }

    const engagement = await this.db.computeContactEngagement({
      organizationId,
      workspaceId,
      campaignId,
      contactId,
      interactionsCount,
      activitiesCount,
      eventsCount,
      lastInteractionAt,
      engagementStatus,
      metadataJson: {
        computedAt: new Date().toISOString(),
        totalTransactions: totalCount
      }
    });

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "ContactEngagementComputed",
            `Evidence-based engagement computed for contact ${contactId}: level ${engagementStatus}`
          );
        }
      } catch (e) {}
    }

    return engagement;
  }

  // --- Network Summary and Workspace Intelligence ---

  public async getNetworkSummary(organizationId: string, campaignId: string): Promise<any> {
    this.validateTenant(organizationId, undefined, campaignId);

    const [contacts, relationships, segments, engagements, realContacts] = await Promise.all([
      this.db.getCampaignContacts(organizationId, campaignId),
      this.db.getContactRelationships(organizationId, campaignId),
      this.db.getContactSegments(organizationId, campaignId),
      this.db.getContactEngagement(organizationId, campaignId),
      this.db.getContacts(organizationId)
    ]);

    // Setup helper map of detailed names
    const nameMap = new Map<string, string>();
    realContacts.forEach((rc: any) => {
      nameMap.set(rc.id, rc.name || rc.fullName || "Contact " + rc.id.substring(0, 5));
    });

    // Metric talies - no guess values
    const tallyTypes: Record<string, number> = {
      supporter: 0,
      leader: 0,
      influencer: 0,
      advisor: 0,
      volunteer: 0,
      coordinator: 0,
      donor: 0,
      strategic_contact: 0
    };

    contacts.forEach(c => {
      const type = c.contactType || "supporter";
      if (tallyTypes[type] !== undefined) {
        tallyTypes[type]++;
      } else {
        tallyTypes[type] = (tallyTypes[type] || 0) + 1;
      }
    });

    const tallyEngagement: Record<string, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INACTIVE: 0,
      NO_DATA: 0
    };

    contacts.forEach(c => {
      const engMatch = engagements.find(e => e.contactId === c.contactId);
      const level = engMatch ? engMatch.engagementStatus : "NO_DATA";
      if (tallyEngagement[level] !== undefined) {
        tallyEngagement[level]++;
      }
    });

    // Network Visual Graph Output
    const nodes = contacts.map(c => {
      return {
        id: c.contactId,
        name: nameMap.get(c.contactId) || "Contact " + c.contactId.substring(0, 5),
        contactType: c.contactType,
        status: c.status,
        priorityLevel: c.priorityLevel,
        engagement: engagements.find(e => e.contactId === c.contactId)?.engagementStatus || "NO_DATA"
      };
    });

    const edges = relationships.map(r => {
      return {
        id: r.id,
        source: r.sourceContactId,
        sourceName: nameMap.get(r.sourceContactId) || "Contact " + r.sourceContactId.substring(0, 5),
        target: r.targetContactId,
        targetName: nameMap.get(r.targetContactId) || "Contact " + r.targetContactId.substring(0, 5),
        relationshipType: r.relationshipType,
        strengthLevel: r.strengthLevel
      };
    });

    // Workspace Intelligence: inactive supporters & strategic targets metrics
    const inactiveLeaders = contacts.filter(c => {
      if (c.contactType !== "leader") return false;
      const eng = engagements.find(e => e.contactId === c.contactId);
      return !eng || eng.engagementStatus === "INACTIVE" || eng.engagementStatus === "NO_DATA";
    }).map(c => ({
      contactId: c.contactId,
      name: nameMap.get(c.contactId) || "Contact " + c.contactId.substring(0, 5)
    }));

    const supportersNoActivity = contacts.filter(c => {
      if (c.contactType !== "supporter") return false;
      const eng = engagements.find(e => e.contactId === c.contactId);
      return !eng || eng.engagementStatus === "NO_DATA";
    }).map(c => ({
      contactId: c.contactId,
      name: nameMap.get(c.contactId) || "Contact " + c.contactId.substring(0, 5)
    }));

    return {
      metrics: {
        totalContactsCount: contacts.length,
        totalRelationshipsCount: relationships.length,
        totalSegmentsCount: segments.length,
        contactTypesDistribution: tallyTypes,
        engagementDistribution: tallyEngagement
      },
      graph: {
        nodes,
        edges
      },
      intelligence: {
        inactiveLeaders,
        supportersNoActivity,
        lowRelationshipCoverage: relationships.length < contacts.length * 0.3
      }
    };
  }
}
