import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import {
  CampaignEvent,
  CampaignEventParticipant,
  CampaignEventTerritory,
  CampaignEventEvidence,
  CampaignEventAttendance
} from "../core/types";
import { MemoryOS } from "../workspace/MemoryOS";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { CalendarEngine } from "../core/CalendarEngine";
import { ContactEngine } from "../core/ContactEngine";
import { EvidenceEngine } from "../core/EvidenceEngine";
import { CampaignOperationalEngine } from "./CampaignOperationalEngine";
import { CoordinatorOperationalEngine } from "./CoordinatorOperationalEngine";
import { TerritoryOperationalEngine } from "./TerritoryOperationalEngine";

export class CampaignCalendarEngine {
  constructor(
    private db: DatabaseAdapter,
    private memoryOS?: MemoryOS,
    private kgEngine?: KnowledgeGraphEngine,
    private calendarEngine?: CalendarEngine,
    private contactEngine?: ContactEngine,
    private evidenceEngine?: EvidenceEngine,
    private campaignOperationalEngine?: CampaignOperationalEngine,
    private coordinatorOperationalEngine?: CoordinatorOperationalEngine,
    private territoryOperationalEngine?: TerritoryOperationalEngine
  ) {}

  /**
   * multi-tenant validation to assert that every transaction has appropriate tenant data.
   */
  private validateTenant(organizationId: string, workspaceId?: string, campaignId?: string) {
    if (!organizationId) {
      throw new Error("Multi-Tenant Error: organizationId is required Campaign Calendar.");
    }
    if (workspaceId !== undefined && !workspaceId) {
      throw new Error("Multi-Tenant Error: workspaceId is required Campaign Calendar.");
    }
    if (campaignId !== undefined && !campaignId) {
      throw new Error("Multi-Tenant Error: campaignId is required Campaign Calendar.");
    }
  }

  public async getEvents(organizationId: string, campaignId: string): Promise<CampaignEvent[]> {
    this.validateTenant(organizationId, undefined, campaignId);
    return this.db.getCampaignEvents(organizationId, campaignId);
  }

  public async getEvent(organizationId: string, campaignId: string, id: string): Promise<CampaignEvent | null> {
    this.validateTenant(organizationId, undefined, campaignId);
    const events = await this.db.getCampaignEvents(organizationId, campaignId);
    return events.find(e => e.id === id) || null;
  }

  public async createEvent(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    data: {
      calendarEventId?: string | null;
      eventType: string; // meeting, visit, campaign_event, coordination_meeting, public_event, private_event, field_activity
      title: string;
      description?: string | null;
      status?: string;
      scheduledStart: string | Date;
      scheduledEnd: string | Date;
      location?: string | null;
      metadataJson?: Record<string, any>;
    }
  ): Promise<CampaignEvent> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!data.title || !data.scheduledStart || !data.scheduledEnd) {
      throw new Error("Validation Error: title, scheduledStart, and scheduledEnd are required to create a campaign event.");
    }

    // Integrate with CalendarEngine to create a standard calendar event if not provided
    let calendarEventId = data.calendarEventId || null;
    if (!calendarEventId && this.calendarEngine) {
      try {
        const standardEvent = await this.calendarEngine.createEvent(organizationId, {
          organizationId,
          title: data.title,
          description: data.description || "",
          startAt: new Date(data.scheduledStart).toISOString(),
          endAt: new Date(data.scheduledEnd).toISOString(),
          location: data.location || "",
          relatedEntityType: "CAMPAIGN",
          relatedEntityId: campaignId,
          responsibleUserId: null,
          status: "confirmed",
          metadataJson: data.metadataJson || {}
        });
        calendarEventId = standardEvent.id;
      } catch (e) {
        console.warn("CampaignCalendarEngine: CalendarEngine standard event creation failed:", e);
      }
    }

    const event = await this.db.createCampaignEvent({
      organizationId,
      workspaceId,
      campaignId,
      calendarEventId,
      eventType: data.eventType || "meeting",
      title: data.title,
      description: data.description || null,
      status: data.status || "ACTIVE",
      scheduledStart: new Date(data.scheduledStart).toISOString(),
      scheduledEnd: new Date(data.scheduledEnd).toISOString(),
      location: data.location || null,
      metadataJson: data.metadataJson || {}
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const campNode = await this.kgEngine.ensureNode(organizationId, null, "CAMPAIGN", `Campaign: ${campaignId}`, "", campaignId);
        const eventNode = await this.kgEngine.ensureNode(organizationId, null, "EVENT", event.title, event.description || "", event.id);
        await this.kgEngine.createRelationship(organizationId, campNode.id, eventNode.id, "HAS_EVENT");
      } catch (e) {
        console.warn("CampaignCalendarEngine KG integration on createEvent failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignEventCreated",
            `A campaign event '${event.title}' (${event.eventType}) has been successfully created under campaign ${campaignId}.`
          );
        }
      } catch (e) {}
    }

    return event;
  }

  public async updateEvent(
    organizationId: string,
    campaignId: string,
    id: string,
    data: Partial<CampaignEvent>
  ): Promise<CampaignEvent> {
    this.validateTenant(organizationId, undefined, campaignId);
    
    const event = await this.db.updateCampaignEvent(id, organizationId, campaignId, data);

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignEventUpdated",
            `Campaign event '${event.title}' was updated for campaign ${campaignId}.`
          );
        }
      } catch (e) {}
    }

    return event;
  }

  public async getParticipants(organizationId: string, campaignId: string, eventId: string): Promise<CampaignEventParticipant[]> {
    this.validateTenant(organizationId, undefined, campaignId);
    return this.db.getEventParticipants(organizationId, campaignId, eventId);
  }

  public async addParticipant(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    eventId: string,
    data: {
      contactId: string;
      participantType: string; // candidate, coordinator, leader, supporter, advisor, guest
      status?: string;
    }
  ): Promise<CampaignEventParticipant> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!eventId || !data.contactId) {
      throw new Error("Validation Error: eventId and contactId are required to add a participant.");
    }

    const participant = await this.db.addParticipant({
      organizationId,
      workspaceId,
      campaignId,
      eventId,
      contactId: data.contactId,
      participantType: data.participantType || "guest",
      status: data.status || "PENDING"
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const eventNode = await this.kgEngine.ensureNode(organizationId, null, "EVENT", `Event: ${eventId}`, "", eventId);
        const contactNode = await this.kgEngine.ensureNode(organizationId, null, "CONTACT", `Contact: ${data.contactId}`, "", data.contactId);
        await this.kgEngine.createRelationship(organizationId, eventNode.id, contactNode.id, "HAS_PARTICIPANT");

        if (data.participantType === "coordinator") {
          const coordNode = await this.kgEngine.ensureNode(organizationId, null, "COORDINATOR", `Coordinator Contact: ${data.contactId}`, "", data.contactId);
          await this.kgEngine.createRelationship(organizationId, coordNode.id, eventNode.id, "PARTICIPATES_IN");
        }
      } catch (e) {
        console.warn("CampaignCalendarEngine KG integration on addParticipant failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignParticipantAdded",
            `Participant (${data.participantType}) was linked to event ${eventId} in campaign ${campaignId}.`
          );
        }
      } catch (e) {}
    }

    return participant;
  }

  public async getAttendance(organizationId: string, campaignId: string, eventId: string): Promise<CampaignEventAttendance[]> {
    this.validateTenant(organizationId, undefined, campaignId);
    return this.db.getEventAttendance(organizationId, campaignId, eventId);
  }

  public async registerAttendance(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    eventId: string,
    data: {
      contactId: string;
      attendanceStatus: string; // confirmed, attended, absent, cancelled
      checkinAt?: string | null;
      checkoutAt?: string | null;
    }
  ): Promise<CampaignEventAttendance> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!eventId || !data.contactId) {
      throw new Error("Validation Error: eventId and contactId are required to register attendance.");
    }

    const attendance = await this.db.registerAttendance({
      organizationId,
      workspaceId,
      campaignId,
      eventId,
      contactId: data.contactId,
      attendanceStatus: data.attendanceStatus,
      checkinAt: data.checkinAt || null,
      checkoutAt: data.checkoutAt || null
    });

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignAttendanceRegistered",
            `Attendance registered as '${data.attendanceStatus}' for contact ${data.contactId} in event ${eventId}.`
          );
        }
      } catch (e) {}
    }

    return attendance;
  }

  public async linkTerritory(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    eventId: string,
    territoryId: string
  ): Promise<CampaignEventTerritory> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!eventId || !territoryId) {
      throw new Error("Validation Error: eventId and territoryId are required to link a territory to an event.");
    }

    const link = await this.db.linkEventTerritory({
      organizationId,
      workspaceId,
      campaignId,
      eventId,
      territoryId
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const eventNode = await this.kgEngine.ensureNode(organizationId, null, "EVENT", `Event: ${eventId}`, "", eventId);
        const terrNode = await this.kgEngine.ensureNode(organizationId, null, "TERRITORY", `Territory: ${territoryId}`, "", territoryId);
        await this.kgEngine.createRelationship(organizationId, eventNode.id, terrNode.id, "OCCURS_IN");
      } catch (e) {
        console.warn("CampaignCalendarEngine KG integration on linkTerritory failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignEventTerritoryLinked",
            `Territory ${territoryId} was successfully linked to campaign event ${eventId}.`
          );
        }
      } catch (e) {}
    }

    return link;
  }

  public async linkEvidence(
    organizationId: string,
    workspaceId: string,
    campaignId: string,
    eventId: string,
    evidenceId: string
  ): Promise<CampaignEventEvidence> {
    this.validateTenant(organizationId, workspaceId, campaignId);
    if (!eventId || !evidenceId) {
      throw new Error("Validation Error: eventId and evidenceId are required to link an evidence of an event.");
    }

    const link = await this.db.linkEventEvidence({
      organizationId,
      workspaceId,
      campaignId,
      eventId,
      evidenceId
    });

    // Knowledge Graph Integration
    if (this.kgEngine) {
      try {
        const eventNode = await this.kgEngine.ensureNode(organizationId, null, "EVENT", `Event: ${eventId}`, "", eventId);
        const evidenceNode = await this.kgEngine.ensureNode(organizationId, null, "EVIDENCE", `Evidence: ${evidenceId}`, "", evidenceId);
        await this.kgEngine.createRelationship(organizationId, eventNode.id, evidenceNode.id, "HAS_EVIDENCE");
      } catch (e) {
        console.warn("CampaignCalendarEngine KG integration on linkEvidence failed:", e);
      }
    }

    // Memory OS Event Registration
    if (this.memoryOS) {
      try {
        if (typeof (this.memoryOS as any).registerEvent === "function") {
          await (this.memoryOS as any).registerEvent(
            organizationId,
            "CampaignEventEvidenceLinked",
            `Evidence ${evidenceId} was successfully linked to campaign event ${eventId}.`
          );
        }
      } catch (e) {}
    }

    return link;
  }

  public async getAgendaSummary(organizationId: string, campaignId: string): Promise<any> {
    this.validateTenant(organizationId, undefined, campaignId);

    const now = new Date();
    const events = await this.db.getCampaignEvents(organizationId, campaignId);
    const eventTerritories = await this.db.getCampaignEventTerritories(organizationId, campaignId);
    const eventEvidences = await this.db.getCampaignEventEvidences(organizationId, campaignId);

    // Get list of predefined campaign territories and coordinators
    const campaignTerritories = await this.db.getCampaignTerritories(organizationId, campaignId).catch(() => []);
    const campaignCoordinators = await this.db.getCampaignCoordinators(organizationId, campaignId).catch(() => []);

    // Fetch participants list for all events to compile summaries
    const eventIds = events.map(e => e.id);
    const allParticipants: CampaignEventParticipant[] = [];
    for (const eId of eventIds) {
      const parts = await this.db.getEventParticipants(organizationId, campaignId, eId).catch(() => []);
      allParticipants.push(...parts);
    }

    // Agenda summaries calculations
    const futureEvents = events.filter(e => new Date(e.scheduledStart) > now);
    const completedEvents = events.filter(e => e.status === "COMPLETED");

    // Events with no participants
    const eventsWithoutParticipants = events.filter(e => {
      const parts = allParticipants.filter(p => p.eventId === e.id);
      return parts.length === 0;
    });

    // Events with no evidence
    const eventsWithoutEvidences = events.filter(e => {
      const evs = eventEvidences.filter(ev => ev.eventId === e.id);
      return evs.length === 0;
    });

    // Events grouped by territory
    const territoryGroupMap: Record<string, number> = {};
    for (const et of eventTerritories) {
      territoryGroupMap[et.territoryId] = (territoryGroupMap[et.territoryId] || 0) + 1;
    }
    const eventsByTerritory = Object.entries(territoryGroupMap).map(([territoryId, count]) => ({
      territoryId,
      count
    }));

    // Events grouped by coordinator (meaning participant type is 'coordinator')
    const coordinatorGroupMap: Record<string, number> = {};
    for (const p of allParticipants) {
      if (p.participantType === "coordinator") {
        coordinatorGroupMap[p.contactId] = (coordinatorGroupMap[p.contactId] || 0) + 1;
      }
    }
    const eventsByCoordinator = Object.entries(coordinatorGroupMap).map(([coordinatorId, count]) => ({
      coordinatorId,
      count
    }));

    // --- WORKSPACE INTELLIGENCE COMPILATION ---

    // 1. Territories without events (campaign territories with 0 event_territory links)
    const activeTerr_ids_with_events = new Set(eventTerritories.map(et => et.territoryId));
    const territoriesWithoutEvents = campaignTerritories.filter(t => !activeTerr_ids_with_events.has(t.id));

    // 2. Coordinators without scheduled activities (coordinators that are not linked as participants in any campaign event)
    const activeCoordinator_ids_with_events = new Set(
      allParticipants
        .filter(p => p.participantType === "coordinator")
        .map(p => p.contactId)
    );
    const coordinatorsWithoutActivities = campaignCoordinators.filter(c => !activeCoordinator_ids_with_events.has(c.id) && !activeCoordinator_ids_with_events.has(c.coordinatorId));

    // 3. Idle Agendas (coordinators/candidates/leaders with no scheduled active events in the next 15 days)
    const future15Days = new Set(
      events
        .filter(e => {
          const start = new Date(e.scheduledStart);
          const limit = new Date();
          limit.setDate(limit.getDate() + 15);
          return start > now && start <= limit && e.status !== "CANCELLED";
        })
        .map(e => e.id)
    );

    const idleParticipantMap: Record<string, { type: string; futureCount: number }> = {};
    // Populate with campaign coordinators
    for (const c of campaignCoordinators) {
      idleParticipantMap[c.coordinatorId || c.id] = { type: "coordinator", futureCount: 0 };
    }

    // Evaluate future engagements
    for (const p of allParticipants) {
      if (future15Days.has(p.eventId)) {
        if (idleParticipantMap[p.contactId]) {
          idleParticipantMap[p.contactId].futureCount++;
        } else {
          idleParticipantMap[p.contactId] = { type: p.participantType, futureCount: 1 };
        }
      }
    }

    const idleAgendas = Object.entries(idleParticipantMap)
      .filter(([_, info]) => info.futureCount === 0)
      .map(([contactId, info]) => ({
        contactId,
        participantType: info.type
      }));

    return {
      totalEvents: events.length,
      futureEventsCount: futureEvents.length,
      completedEventsCount: completedEvents.length,
      futureEvents: futureEvents.map(e => ({ id: e.id, title: e.title, scheduledStart: e.scheduledStart, eventType: e.eventType })),
      completedEvents: completedEvents.map(e => ({ id: e.id, title: e.title })),
      
      // Events criteria
      eventsWithoutParticipants: eventsWithoutParticipants.map(e => ({ id: e.id, title: e.title })),
      eventsWithoutEvidences: eventsWithoutEvidences.map(e => ({ id: e.id, title: e.title })),
      eventsByTerritory,
      eventsByCoordinator,

      // Workspace Intelligence
      workspaceIntelligence: {
        territoriesWithoutEvents: territoriesWithoutEvents.map(t => ({ id: t.id, name: t.name })),
        coordinatorsWithoutActivities: coordinatorsWithoutActivities.map(c => ({ id: c.id, name: c.name || `Coordinator (${c.coordinatorId})` })),
        eventsWithoutEvidence: eventsWithoutEvidences.map(e => ({ id: e.id, title: e.title })),
        eventsWithoutParticipants: eventsWithoutParticipants.map(e => ({ id: e.id, title: e.title })),
        idleAgendas
      }
    };
  }
}
