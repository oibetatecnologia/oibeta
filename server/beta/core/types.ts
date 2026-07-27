/**
 * SPRINT 15.0-A - HARDENING OF THE SHARED OPERATIONAL FOUNDATION
 * Core type integrations for multi-tenant data entities.
 */

export interface Contact {
  id: string;
  organizationId: string;
  type: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  tags: string[]; // parsed from jsonb default '[]'
  status: string;
  notes: string | null;
  metadataJson: Record<string, any>;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateContactInput = Omit<
  Contact,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: string;
  metadataJson?: Record<string, any>;
};

export interface CRMInteraction {
  id: string;
  organizationId: string;
  contactId: string | null;
  interactionType: string | null;
  title: string;
  description: string | null;
  interactionDate: Date | string | null;
  responsibleUserId: string | null;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateCRMInteractionInput = Omit<
  CRMInteraction,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: string;
  metadataJson?: Record<string, any>;
};

export interface CalendarEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  startAt: Date | string;
  endAt: Date | string;
  location: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  responsibleUserId: string | null;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateCalendarEventInput = Omit<
  CalendarEvent,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: string;
  metadataJson?: Record<string, any>;
};

export interface Activity {
  id: string;
  organizationId: string;
  activityType: string;
  title: string;
  description: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  territoryId: string | null;
  responsibleUserId: string | null;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateActivityInput = Omit<
  Activity,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: string;
  metadataJson?: Record<string, any>;
};

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: Date | string | null;
  assignedTo: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateTaskInput = Omit<Task, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  status?: string;
  priority?: string;
  metadataJson?: Record<string, any>;
};

export interface Evidence {
  id: string;
  organizationId: string;
  evidenceType: string | null;
  title: string;
  description: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  confidenceLevel: number | null;
  metadataJson: Record<string, any>;
  createdBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateEvidenceInput = Omit<
  Evidence,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  metadataJson?: Record<string, any>;
};

export interface Attachment {
  id: string;
  organizationId: string;
  fileName: string;
  fileType: string | null;
  mimeType: string | null;
  storagePath: string;
  sizeBytes: number | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  uploadedBy: string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateAttachmentInput = Omit<
  Attachment,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  metadataJson?: Record<string, any>;
};

export interface WorkflowInstance {
  id: string;
  organizationId: string;
  workflowType: string;
  title: string;
  currentStep: string | null;
  status: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateWorkflowInstanceInput = Omit<
  WorkflowInstance,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: string;
  metadataJson?: Record<string, any>;
};

export interface WorkflowStep {
  id: string;
  organizationId: string;
  workflowInstanceId: string;
  stepOrder: number;
  title: string;
  description: string | null;
  assignedTo: string | null;
  status: string;
  completedAt: Date | string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateWorkflowStepInput = Omit<
  WorkflowStep,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: string;
  metadataJson?: Record<string, any>;
};

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  message: string | null;
  notificationType: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: Date | string | null;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CreateNotificationInput = Omit<
  Notification,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: string;
  metadataJson?: Record<string, any>;
};

export interface StandardFilter {
  organizationId: string; // MANDATORY and strictly validated
  status?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Standard utility to enforce multi-tenant separation rules and standard limits.
 * Default max limit of 500 records.
 */
export function validateAndBuildFilter(
  organizationId: string | undefined,
  query: any,
): StandardFilter {
  if (!organizationId) {
    throw new Error(
      "Multi-Tenant Error: organization_id is required and cannot be empty.",
    );
  }

  // Extract and coerce pagination params
  const limitVal = query.limit !== undefined ? Number(query.limit) : 50;
  if (isNaN(limitVal) || limitVal < 1) {
    throw new Error("Pagination Error: limit must be a positive integer.");
  }
  if (limitVal > 500) {
    throw new Error(
      "Pagination Error: limit exceeds maximum allowable size (500).",
    );
  }

  const offsetVal = query.offset !== undefined ? Number(query.offset) : 0;
  if (isNaN(offsetVal) || offsetVal < 0) {
    throw new Error("Pagination Error: offset must be a non-negative integer.");
  }

  return {
    organizationId,
    status: query.status ? String(query.status) : undefined,
    relatedEntityType:
      query.relatedEntityType || query.related_entity_type
        ? String(query.relatedEntityType || query.related_entity_type)
        : undefined,
    relatedEntityId:
      query.relatedEntityId || query.related_entity_id
        ? String(query.relatedEntityId || query.related_entity_id)
        : undefined,
    limit: limitVal,
    offset: offsetVal,
  };
}

// ==========================================
// SPRINT 15.1 — MODULE ACCESS LAYER TYPES
// ==========================================

export interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrganizationModule {
  id: string;
  organizationId: string;
  moduleId: string;
  isEnabled: boolean;
  activatedAt: Date | string | null;
  expiresAt: Date | string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ModuleFeature {
  id: string;
  moduleId: string;
  featureCode: string;
  featureName: string;
  description: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrganizationFeatureOverride {
  id: string;
  organizationId: string;
  featureId: string;
  isEnabled: boolean;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// SPRINT 15.2 — CLIENT WORKSPACE & SUPER ADMIN TYPES
// ==========================================

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrganizationWorkspace {
  id: string;
  organizationId: string;
  workspaceId: string;
  isEnabled: boolean;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrganizationSetting {
  id: string;
  organizationId: string;
  settingKey: string;
  settingValue: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SuperAdminAuditLog {
  id: string;
  actorUserId: string;
  organizationId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  description: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
}

// ==========================================
// SPRINT 15.3 — SHARED IMPORT CENTER TYPES
// ==========================================

export interface ImportJob {
  id: string;
  organizationId: string;
  workspaceId: string;
  moduleCode: string;
  jobType: string;
  status: string;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ImportJobFile {
  id: string;
  jobId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
}

export interface ImportJobLog {
  id: string;
  jobId: string;
  level: string;
  message: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
}

export interface ImportJobError {
  id: string;
  jobId: string;
  rowNumber: number;
  errorCode: string;
  errorMessage: string;
  rawDataJson: Record<string, any>;
  createdAt: Date | string;
}

// ==========================================
// SPRINT 15.4 — BETA ELECTORAL INTEGRATION TYPES
// ==========================================

export interface ElectoralCampaign {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  campaignType: string;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  contactId: string;
  role: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignGoal {
  id: string;
  campaignId: string;
  title: string;
  description: string | null;
  goalType: string;
  targetValue: number;
  currentValue: number;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignAction {
  id: string;
  campaignId: string;
  activityId: string | null;
  taskId: string | null;
  title: string;
  description: string | null;
  status: string;
  scheduledFor: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignEvidence {
  id: string;
  campaignId: string;
  evidenceId: string;
  description: string | null;
  createdAt: Date | string;
}

// ==========================================
// SPRINT 15.5 — COORDINATOR & TERRITORY OPERATIONAL TYPES
// ==========================================

export interface CampaignTerritory {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  parentTerritoryId: string | null;
  territoryType: string;
  name: string;
  description: string | null;
  geoCode: string | null;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignCoordinator {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  contactId: string;
  coordinatorLevel: string;
  role: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignCoordinatorAssignment {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  coordinatorId: string;
  territoryId: string;
  assignmentType: string;
  status: string;
  startedAt: Date | string | null;
  endedAt: Date | string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignTerritoryCoverage {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  territoryId: string;
  coordinatorsCount: number;
  membersCount: number;
  actionsCount: number;
  evidencesCount: number;
  lastActivityAt: Date | string | null;
  coverageStatus: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignTerritoryConflict {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  territoryId: string;
  conflictType: string;
  description: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignCoordinatorHealth {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  coordinatorId: string;
  assignedTerritoriesCount: number;
  activeActionsCount: number;
  completedActionsCount: number;
  pendingActionsCount: number;
  lastActivityAt: Date | string | null;
  healthStatus: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// SPRINT 15.6 — CAMPAIGN CRM INTEGRATION TYPES
// ==========================================

export interface CampaignContact {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  contactId: string;
  contactType: string;
  status: string;
  priorityLevel: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignContactRelationship {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  sourceContactId: string;
  targetContactId: string;
  relationshipType: string;
  strengthLevel: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignContactTag {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
}

export interface CampaignContactSegment {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignContactEngagement {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  contactId: string;
  interactionsCount: number;
  activitiesCount: number;
  eventsCount: number;
  lastInteractionAt: Date | string | null;
  engagementStatus: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// SPRINT 15.7 — CAMPAIGN CALENDAR & AGENDA TYPES
// ==========================================

export interface CampaignEvent {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  calendarEventId: string | null;
  eventType: string;
  title: string;
  description: string | null;
  status: string;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  location: string | null;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignEventParticipant {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  eventId: string;
  contactId: string;
  participantType: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignEventTerritory {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  eventId: string;
  territoryId: string;
  createdAt: Date | string;
}

export interface CampaignEventEvidence {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  eventId: string;
  evidenceId: string;
  createdAt: Date | string;
}

export interface CampaignEventAttendance {
  id: string;
  organizationId: string;
  workspaceId: string;
  campaignId: string;
  eventId: string;
  contactId: string;
  attendanceStatus: string;
  checkinAt: Date | string | null;
  checkoutAt: Date | string | null;
  createdAt: Date | string;
}

// ==========================================
// SPRINT 15.8 — COMMUNICATION & ACTION DISPATCH TYPES
// ==========================================

export interface CommunicationThread {
  id: string;
  organizationId: string;
  workspaceId: string;
  threadType: string; // direct, group, campaign, coordination, administrative
  title: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CommunicationParticipant {
  id: string;
  organizationId: string;
  workspaceId: string;
  threadId: string;
  userId: string;
  participantRole: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CommunicationMessage {
  id: string;
  organizationId: string;
  workspaceId: string;
  threadId: string;
  senderUserId: string;
  messageType: string; // message, request, notification, system
  content: string;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
}

export interface CommunicationRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestType: string; // meeting_request, report_request, task_request, information_request, approval_request
  requesterUserId: string;
  targetUserId: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: string;
  description: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CommunicationDispatch {
  id: string;
  organizationId: string;
  workspaceId: string;
  dispatchType: string; // task_dispatch, agenda_dispatch, report_dispatch, coordination_dispatch
  sourceUserId: string;
  targetUserId: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: string;
  description: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CommunicationLog {
  id: string;
  organizationId: string;
  workspaceId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: Date | string;
}

export interface UserPresence {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  presenceStatus: string;
  lastSeenAt?: Date | string | null;
  lastActivityAt?: Date | string | null;
  metadataJson?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserSession {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  sessionToken?: string;
  startedAt: Date | string;
  lastSeenAt?: Date | string | null;
  endedAt?: Date | string | null;
  status: string;
  metadataJson?: any;
}

export interface UserActivityLog {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  activityType: string;
  entityType?: string;
  entityId?: string;
  description: string;
  createdAt: Date | string;
}

// --- SPRINT 16.0: UNIFIED OPERATIONAL COMMAND CENTER ---

export interface CampaignSummary {
  total: number;
  active: number;
  inactive: number;
  campaignsWithoutActivities: number | "NO_DATA";
  campaignsWithoutCoordinators: number | "NO_DATA";
  campaignsWithoutEvents: number | "NO_DATA";
}

export interface TerritorySummary {
  total: number;
  covered: number;
  uncovered: number;
  territoriesWithoutEvents: number | "NO_DATA";
  territoriesWithoutCoordinators: number | "NO_DATA";
}

export interface CoordinatorSummary {
  total: number;
  active: number;
  inactive: number;
  coordinatorsWithoutActivities: number | "NO_DATA";
  coordinatorsWithoutTerritories: number | "NO_DATA";
}

export interface CommunicationSummary {
  threads: number;
  messages: number | "NO_DATA";
  pendingRequests: number;
  pendingDispatches: number;
  usersWithoutRecentCommunication: number | "NO_DATA";
}

export interface PresenceSummary {
  totalUsersWithPresence: number;
  online: number;
  offline: number;
  away: number;
  busy: number;
  activeLast24h: number;
  inactive: number;
}

export interface ActivitySummary {
  totalActions: number;
  logins: number;
  tasksCreated: number;
  eventsCreated: number;
  messagesSent: number;
}

export interface PendingItemsSummary {
  tasks: any[];
  requests: any[];
  dispatches: any[];
  workflows: any[];
}

export interface OperationalAlert {
  type: string;
  entityId?: string;
  message: string;
}

export interface OperationalSummary {
  campaigns: number;
  activeCampaigns: number;
  territories: number;
  coveredTerritories: number;
  uncoveredTerritories: number;
  coordinators: number;
  activeCoordinators: number;
  crmContacts: number;
  events: number;
  futureEvents: number;
  tasks: number;
  pendingTasks: number;
  workflows: number;
  activeWorkflows: number;
  evidences: number;
  communications: number | "NO_DATA";
  pendingRequests: number;
  pendingDispatches: number;
  onlineUsers: number;
  offlineUsers: number;
  activeUsersLast24h: number;
  alerts: OperationalAlert[];
}

// --- SPRINT 16.1: WORKSPACE INTELLIGENCE ORCHESTRATION LAYER ---

export interface KnowledgeGraphContext {
  totalNodes: number;
  totalRelationships: number;
  entityTypes: string[];
  relationshipTypes: string[];
  recentChanges: any[];
}

export interface MemoryContext {
  recentEvents: any[];
  recentDecisions: any[];
  recentActions: any[];
  recentChanges: any[];
}

export interface WorkspaceOperationalState {
  campaigns: CampaignSummary | "NO_DATA";
  territories: TerritorySummary | "NO_DATA";
  coordinators: CoordinatorSummary | "NO_DATA";
  crm: number | "NO_DATA";
  events: number | "NO_DATA";
  communications: CommunicationSummary | "NO_DATA";
  presence: PresenceSummary | "NO_DATA";
  tasks: PendingItemsSummary | "NO_DATA";
  workflows: PendingItemsSummary | "NO_DATA";
  alerts: OperationalAlert[];
}

export interface WorkspaceContextMetadata {
  schemaVersion: string;
  generatedAt: string;
  organizationId: string;
  workspaceId: string;
}

export interface WorkspaceContext {
  organization: string;
  workspace: string;
  operationalSummary: OperationalSummary | "NO_DATA";
  campaignSummary: CampaignSummary | "NO_DATA";
  territorySummary: TerritorySummary | "NO_DATA";
  coordinatorSummary: CoordinatorSummary | "NO_DATA";
  communicationSummary: CommunicationSummary | "NO_DATA";
  presenceSummary: PresenceSummary | "NO_DATA";
  activitySummary: ActivitySummary | "NO_DATA";
  pendingItems: PendingItemsSummary | "NO_DATA";
  operationalAlerts: OperationalAlert[];
  knowledgeGraphContext: KnowledgeGraphContext | "NO_DATA";
  memoryContext: MemoryContext | "NO_DATA";
  generatedAt: string;
}

// --- SPRINT 16.2: BETA ASSISTANT CONTEXT FOUNDATION ---

export interface AssistantPresenceContext {
  onlineUsers: number;
  offlineUsers: number;
  awayUsers: number;
  busyUsers: number;
  activeLast24h: number;
}

export interface AssistantCommunicationContext {
  threads: number;
  messages: number;
  pendingRequests: number;
  pendingDispatches: number;
  recentCommunications: any[];
}

export interface AssistantMemoryContext {
  recentEvents: any[];
  recentActions: any[];
  recentChanges: any[];
  recentDecisions: any[];
}

export interface AssistantKnowledgeContext {
  entityTypes: string[];
  relationshipTypes: string[];
  recentChanges: any[];
  graphStatus: string;
}

export interface AssistantMetadata {
  generatedAt: string;
}

export interface AssistantOperationalState {
  campaigns?: CampaignSummary | "NO_DATA";
  territories?: TerritorySummary | "NO_DATA";
  coordinators?: CoordinatorSummary | "NO_DATA";
  crm?: number | "NO_DATA";
  events?: number | "NO_DATA";
  communications?: CommunicationSummary | "NO_DATA";
  presence?: PresenceSummary | "NO_DATA";
  tasks?: PendingItemsSummary | "NO_DATA";
  workflows?: PendingItemsSummary | "NO_DATA";
  alerts?: OperationalAlert[];
}

export interface BetaAssistantContext {
  organization: string;
  workspace: string;
  workspaceStatus: string;
  workspaceHealth: { status: string; reason: string } | "NO_DATA";
  workspaceContext: WorkspaceContext | "NO_DATA";
  operationalSummary: OperationalSummary | "NO_DATA";
  pendingItems: PendingItemsSummary | "NO_DATA";
  operationalAlerts: OperationalAlert[];
  recentTimeline: any[];
  knowledgeGraphContext: AssistantKnowledgeContext | "NO_DATA";
  memoryContext: AssistantMemoryContext | "NO_DATA";
  presenceContext: AssistantPresenceContext | "NO_DATA";
  communicationContext: AssistantCommunicationContext | "NO_DATA";
  enabledModules: string[];
  generatedAt: string;
}

// --- SPRINT 16.3: AI ROUTER FOUNDATION ---

export type BetaActionType = 
  | "create_task" | "update_task" | "create_event" | "update_event" 
  | "create_contact" | "update_contact" | "send_message" | "create_workflow" 
  | "update_workflow" | "create_evidence" | "generate_report" | "custom";

export interface BetaAction {
  id: string;
  type: BetaActionType;
  metadata?: any;
}

export interface BetaActionRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  actionType: BetaActionType;
  entityType?: string;
  entityId?: string;
  payload: any;
  status: "PENDING" | "VALIDATED" | "REJECTED" | "DISPATCHED";
  createdAt: string;
}

export interface BetaActionValidation {
  status: "VALID" | "INVALID";
  reason?: string;
}

export interface BetaActionPermission {
  status: "ALLOWED" | "DENIED";
  reason?: string;
}

export interface BetaActionDispatch {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  status: string;
  metadata: any;
  createdAt: string;
}

export interface BetaActionExecutionLog {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  actionType: BetaActionType;
  status: string;
  details: any;
  createdAt: string;
}

export interface BetaActionResult {
  status: "PENDING" | "VALIDATED" | "REJECTED" | "DISPATCHED";
  requestId: string;
}

export type BetaSkillCategory = "core" | "calendar" | "crm" | "communication" | "workflow" | "tasks" | "evidence" | "electoral" | "government" | "procurement" | "reports" | "assistant" | "custom";

export interface BetaSkill {
  id: string;
  organizationId: string;
  workspaceId: string;
  skillName: string;
  category: BetaSkillCategory;
  status: "ACTIVE" | "INACTIVE";
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BetaCapability {
  id: string;
  organizationId: string;
  workspaceId: string;
  capabilityName: string;
  status: "ACTIVE" | "INACTIVE";
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BetaSkillRegistry {
  id: string;
  organizationId: string;
  workspaceId: string;
  skillId: string;
  moduleCode: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface BetaSkillValidation {
  status: "VALID" | "INVALID" | "DISABLED" | "NOT_FOUND";
  reason?: string;
}

export interface BetaSkillResult {
  success: boolean;
  skill?: BetaSkill;
  error?: string;
}

// --- SPRINT 16.6: BETA OPERATIONAL ORCHESTRATOR ---

export type BetaOperationalIntentType = 
  | "create_task" | "update_task" | "create_event" | "update_event" 
  | "create_contact" | "update_contact" | "send_message" | "create_workflow" 
  | "update_workflow" | "create_evidence" | "generate_report" | "custom";

export type BetaOperationalStatus = "PENDING" | "VALIDATED" | "REJECTED" | "DISPATCHED";

export interface BetaOperationalIntent {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  intentType: BetaOperationalIntentType;
  skill: string;
  metadata: any;
  status: BetaOperationalStatus;
  createdAt: string;
}

export interface BetaOperationalContext {
  operationalContext: any;
  workspaceContext: any;
  assistantContext: any;
  skillContext: any;
  generatedAt: string;
}

export interface BetaOperationalValidation {
  status: "VALID" | "INVALID";
  reason?: string;
}

export interface BetaOperationalPermission {
  status: "ALLOWED" | "DENIED";
  reason?: string;
}

export interface BetaOperationalDispatch {
  id: string;
  organizationId: string;
  workspaceId: string;
  intentId: string;
  status: string;
  metadata: any;
  createdAt: string;
}

export interface BetaOperationalResult {
  id: string;
  organizationId: string;
  workspaceId: string;
  intentId: string;
  status: BetaOperationalStatus;
  details: any;
  createdAt: string;
}

// --- SPRINT 17.1: GOVERNMENT OBJECTIVES & PROGRAM MANAGEMENT ---

export type GovernmentProgramStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "SUSPENDED" | "CANCELLED";
export type GovernmentProjectStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
export type GovernmentActionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface GovernmentObjective {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  status: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentProgram {
  id: string;
  organizationId: string;
  workspaceId: string;
  objectiveId: string;
  name: string;
  description: string;
  status: GovernmentProgramStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentProject {
  id: string;
  organizationId: string;
  workspaceId: string;
  programId: string;
  name: string;
  description: string;
  status: GovernmentProjectStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentAction {
  id: string;
  organizationId: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string;
  status: GovernmentActionStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentProgramSummary {
  status: GovernmentDataStatus;
  summary: any;
}

export interface GovernmentProgramHealth {
  status: GovernmentDataStatus;
  health: any;
}

// --- SPRINT 17.2: GOVERNMENT INDICATORS & PERFORMANCE MANAGEMENT ---

export type GovernmentGoalStatus = "NOT_STARTED" | "ON_TRACK" | "AT_RISK" | "ACHIEVED" | "FAILED" | "NO_DATA";

export interface GovernmentIndicator {
  id: string;
  organizationId: string;
  workspaceId: string;
  objectiveId: string | null;
  programId: string | null;
  projectId: string | null;
  indicatorName: string;
  description: string;
  unit: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentGoal {
  id: string;
  organizationId: string;
  workspaceId: string;
  indicatorId: string;
  goalValue: number;
  currentValue: number;
  status: GovernmentGoalStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentResult {
  id: string;
  organizationId: string;
  workspaceId: string;
  indicatorId: string;
  resultValue: number;
  referenceDate: string;
  metadata: any;
  createdAt: string;
}

export interface GovernmentIndicatorValue {
  indicatorId: string;
  value: number;
  date: string;
}

export interface GovernmentPerformance {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: GovernmentDataStatus;
  score: number;
  details: any;
  createdAt: string;
}

export interface GovernmentPerformanceSummary {
  status: GovernmentDataStatus;
  summary: any;
}

export interface GovernmentPerformanceHealth {
  status: GovernmentDataStatus;
  health: any;
}

// --- SPRINT 17.3: GOVERNMENT REPORTING & EXECUTIVE BRIEF FOUNDATION ---

export type GovernmentReportStatus = "DRAFT" | "READY" | "ARCHIVED" | "NO_DATA";

export interface GovernmentReportMetadata {
  description?: string;
  authorId?: string;
  sourceIds?: string[];
  [key: string]: any;
}

export interface GovernmentBriefMetadata {
  summaryPoints?: string[];
  reviewedBy?: string;
  [key: string]: any;
}

export interface GovernmentReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  reportType: string;
  title: string;
  status: GovernmentReportStatus;
  metadata: GovernmentReportMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentExecutiveBrief {
  id: string;
  organizationId: string;
  workspaceId: string;
  briefType: string;
  title: string;
  status: GovernmentReportStatus;
  metadata: GovernmentBriefMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentSummary {
  status: GovernmentDataStatus;
  reportsCount: number;
  briefsCount: number;
  snapshotsCount: number;
  indicatorsCount: number;
  goalsCount: number;
  resultsCount: number;
  recentReports: GovernmentReport[];
  recentBriefs: GovernmentExecutiveBrief[];
}

export interface GovernmentMonitoringSnapshot {
  id: string;
  organizationId: string;
  workspaceId: string;
  snapshotType: string;
  snapshot: any;
  createdAt: string;
}

// --- SPRINT 17.4: GOVERNMENT GOVERNANCE & EXECUTIVE REVIEW FOUNDATION ---

export type GovernmentGovernanceStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED" | "NO_DATA";

export interface GovernmentGovernanceReview {
  id: string;
  organizationId: string;
  workspaceId: string;
  reviewType: string;
  status: GovernmentGovernanceStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentExecutiveMeeting {
  id: string;
  organizationId: string;
  workspaceId: string;
  meetingType: string;
  status: GovernmentGovernanceStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentStrategicCycle {
  id: string;
  organizationId: string;
  workspaceId: string;
  cycleType: string;
  status: GovernmentGovernanceStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentDecision {
  id: string;
  organizationId: string;
  workspaceId: string;
  decisionType: string;
  status: GovernmentGovernanceStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentMonitoringReview {
  id: string;
  organizationId: string;
  workspaceId: string;
  reviewType: string;
  status: GovernmentGovernanceStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentGovernanceSummary {
  status: GovernmentGovernanceStatus;
  reviewsCount: number;
  meetingsCount: number;
  cyclesCount: number;
  decisionsCount: number;
  monitoringReviewsCount: number;
  recentReviews: GovernmentGovernanceReview[];
  recentMeetings: GovernmentExecutiveMeeting[];
  recentDecisions: GovernmentDecision[];
}

export interface GovernmentGovernanceHealth {
  status: GovernmentDataStatus;
  completionRate: number;
  activeCyclesCount: number;
  pendingDecisionsCount: number;
  healthScore: number;
}



export type GovernmentDataStatus = "READY" | "PARTIAL_DATA" | "NO_DATA";

export interface GovernmentWorkspaceSummary {
  status: GovernmentDataStatus;
  summary: any;
}

export interface GovernmentWorkspaceHealth {
  status: GovernmentDataStatus;
  health: any;
}

export interface GovernmentWorkspaceTimeline {
  status: GovernmentDataStatus;
  timeline: any[];
}

export interface GovernmentWorkspaceIndicators {
  status: GovernmentDataStatus;
  indicators: any[];
}

export interface GovernmentWorkspacePrograms {
  status: GovernmentDataStatus;
  programs: any[];
}

export interface GovernmentWorkspaceContracts {
  status: GovernmentDataStatus;
  contracts: any[];
}

export interface GovernmentWorkspaceBids {
  status: GovernmentDataStatus;
  bids: any[];
}

export interface GovernmentWorkspaceRisk {
  status: GovernmentDataStatus;
  risks: any[];
}

export interface GovernmentWorkspaceContext {
  status: GovernmentDataStatus;
  context: any;
}

export interface GovernmentWorkspace {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: GovernmentDataStatus;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface AIProviderConfiguration {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  version?: string;
  models?: string[];
  customParams?: any;
}


// --- SPRINT 19.3: GOVERNMENT AMENDMENT OPPORTUNITY & RESOURCE CAPTURE FOUNDATION ---

export type GovernmentFundingStatus = 'DRAFT' | 'ACTIVE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';

export interface GovernmentFundingOpportunity {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: GovernmentFundingStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentFundingProgram {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: GovernmentFundingStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentFundingNotice {
  id: string;
  organizationId: string;
  workspaceId: string;
  programId: string;
  title: string;
  description: string | null;
  status: GovernmentFundingStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentFundingRequirement {
  id: string;
  organizationId: string;
  workspaceId: string;
  noticeId: string;
  requirement: string;
  description: string | null;
  status: string; // E.g., 'PENDING', 'COMPLETED', 'NOT_APPLICABLE'
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentFundingProposal {
  id: string;
  organizationId: string;
  workspaceId: string;
  opportunityId: string;
  title: string;
  description: string | null;
  status: GovernmentFundingStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentFundingSubmission {
  id: string;
  organizationId: string;
  workspaceId: string;
  proposalId: string;
  submissionDate: Date | string | null;
  status: GovernmentFundingStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentFundingSummary {
  status: string; // e.g., 'READY', 'PARTIAL_DATA', 'NO_DATA'
  summary: Record<string, any>;
}

export interface GovernmentFundingHealth {
  status: string; // e.g., 'READY', 'PARTIAL_DATA', 'NO_DATA'
  healthScore: number;
  metrics: Record<string, any>;
}

// --- SPRINT 19.4: GOVERNMENT AMENDMENT STRATEGIC PLANNING & PORTFOLIO FOUNDATION ---

export type GovernmentAmendmentPortfolioStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'NO_DATA';

export interface GovernmentAmendmentPortfolio {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: GovernmentAmendmentPortfolioStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentAmendmentPortfolioItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  portfolioId: string;
  title: string;
  description: string | null;
  status: GovernmentAmendmentPortfolioStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentAmendmentPriority {
  id: string;
  organizationId: string;
  workspaceId: string;
  portfolioItemId: string;
  title: string;
  description: string | null;
  status: GovernmentAmendmentPortfolioStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentAmendmentObjective {
  id: string;
  organizationId: string;
  workspaceId: string;
  portfolioItemId: string;
  title: string;
  description: string | null;
  status: GovernmentAmendmentPortfolioStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentAmendmentActionPlan {
  id: string;
  organizationId: string;
  workspaceId: string;
  objectiveId: string;
  title: string;
  description: string | null;
  status: GovernmentAmendmentPortfolioStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentAmendmentFollowUp {
  id: string;
  organizationId: string;
  workspaceId: string;
  actionPlanId: string;
  notes: string | null;
  status: GovernmentAmendmentPortfolioStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentAmendmentPortfolioSummary {
  status: string; // 'READY', 'PARTIAL_DATA', 'NO_DATA'
  summary: Record<string, any>;
}

export interface GovernmentAmendmentPortfolioHealth {
  status: string; // 'READY', 'PARTIAL_DATA', 'NO_DATA'
  healthScore: number;
  metrics: Record<string, any>;
}

// --- SPRINT 22.0: PORTAL DA TRANSPARENCIA INTELIGENTE FOUNDATION ---

export type GovernmentTransparencyStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'NO_DATA';

export interface GovernmentTransparencyPublication {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: GovernmentTransparencyStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentTransparencyCategory {
  id: string;
  organizationId: string;
  workspaceId: string;
  publicationId: string;
  name: string;
  description: string | null;
  status: GovernmentTransparencyStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentTransparencyDataset {
  id: string;
  organizationId: string;
  workspaceId: string;
  categoryId: string;
  name: string;
  status: GovernmentTransparencyStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentTransparencyIndicator {
  id: string;
  organizationId: string;
  workspaceId: string;
  datasetId: string;
  name: string;
  value: number | string | null;
  status: GovernmentTransparencyStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentTransparencyDocument {
  id: string;
  organizationId: string;
  workspaceId: string;
  publicationId: string;
  title: string;
  url: string | null;
  status: GovernmentTransparencyStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentTransparencyReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  publicationId: string;
  title: string;
  content: string | null;
  status: GovernmentTransparencyStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentTransparencySummary {
  status: string; // 'READY', 'PARTIAL_DATA', 'NO_DATA'
  summary: Record<string, any>;
}

export interface GovernmentTransparencyHealth {
  status: string; // 'READY', 'PARTIAL_DATA', 'NO_DATA'
  healthScore: number;
  metrics: Record<string, any>;
}

// --- SPRINT 22.1: GOVERNMENT OMBUDSMAN FOUNDATION ---

export type GovernmentOmbudsmanStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'NO_DATA';

export interface GovernmentOmbudsmanRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  subject: string;
  content: string | null;
  status: GovernmentOmbudsmanStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentOmbudsmanCategory {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  name: string;
  description: string | null;
  status: GovernmentOmbudsmanStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentOmbudsmanProtocol {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  protocolNumber: string;
  status: GovernmentOmbudsmanStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentOmbudsmanResponse {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  content: string;
  status: GovernmentOmbudsmanStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentOmbudsmanAttachment {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  fileName: string;
  url: string | null;
  status: GovernmentOmbudsmanStatus;
  metadataJson: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GovernmentOmbudsmanSummary {
  status: string; // 'READY', 'PARTIAL_DATA', 'NO_DATA'
  summary: Record<string, any>;
}

export interface GovernmentOmbudsmanHealth {
  status: string; // 'READY', 'PARTIAL_DATA', 'NO_DATA'
  healthScore: number;
  metrics: Record<string, any>;
}

export interface AIProvider {
  id: string;
  organizationId: string;
  workspaceId: string;
  providerName: "openai" | "gemini" | "claude" | "deepseek" | "grok" | "mistral" | "ollama" | "custom";
  status: "ACTIVE" | "INACTIVE";
  configuration: AIProviderConfiguration;
  createdAt: string;
  updatedAt: string;
}

export interface AIRouterContext {
  assistantContext: BetaAssistantContext | "NO_DATA";
  workspaceContext: any | "NO_DATA";
  operationalSummary: any | "NO_DATA";
  knowledgeContext: any | "NO_DATA";
  memoryContext: any | "NO_DATA";
  generatedAt: string;
}

export interface AIRouterPolicy {
  id: string;
  organizationId: string;
  workspaceId: string;
  policyName: string;
  status: "ACTIVE" | "INACTIVE";
  allowedProviders: string[];
  allowedModules: string[];
  allowedRequestTypes: string[];
  maxContextSize: number;
  configuration: any;
  createdAt: string;
  updatedAt: string;
}

export interface AIRouterRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  provider: string;
  module: string;
  requestType: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  metadata: any;
  requestedAt: string;
  createdAt: string;
}

export interface AIRouterResult {
  requestId: string;
  status: "SUCCESS" | "ERROR";
  providerUsed: string;
  responseData: any;
  errorDetails?: string;
  usage?: any;
  completedAt: string;
}

export interface AIRouterAudit {
  id: string;
  organizationId: string;
  workspaceId: string;
  userId: string;
  providerName: string;
  requestType: string;
  status: string;
  createdAt: string;
}

// --- SPRINT 18.0: BETA LICITA WORKSPACE FOUNDATION TYPES ---

export interface ProcurementWorkspace {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementWorkspaceSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  bidsCount: number;
  suppliersCount: number;
  lotsCount: number;
  proposalsCount: number;
  contractsCount: number;
  recentBids: ProcurementBid[];
  recentContracts: ProcurementContract[];
}

export interface ProcurementWorkspaceHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    completeness: number;
    competition?: number;
    supplierVariety?: number;
    riskMitigation?: number;
  };
}

export interface ProcurementWorkspaceTimeline {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  timeline: any[];
}

export interface ProcurementWorkspaceContext {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  context: any;
}

export interface ProcurementBid {
  id: string;
  organizationId?: string;
  workspaceId?: string;
  opportunityId?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;

  // Previous compatibility fields
  number?: string | null;
  modality?: string | null;
  object?: string | null;
  responsibleAgency?: string | null;
  openingDate?: string | null;
  estimatedValue?: number | null;
  judgmentCriteria?: string | null;
  processNumber?: string | null;
}

export interface ProcurementSupplier {
  id: string;
  organizationId?: string;
  workspaceId?: string;
  name: string | null;
  documentNumber?: string | null;
  status?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;

  // Previous compatibility fields
  cnpj?: string | null;
  address?: string | null;
  representative?: string | null;
  contacts?: string | null;
}

export interface ProcurementLot {
  id: string;
  organizationId?: string;
  workspaceId?: string;
  bidId: string | null;
  title?: string | null;
  status?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;

  // Previous compatibility fields
  lotNumber?: string | null;
  value?: number | null;
  winnerSupplierId?: string | null;
}

export interface ProcurementProposal {
  id: string;
  organizationId?: string;
  workspaceId?: string;
  bidId: string | null;
  lotId?: string | null;
  supplierId: string | null;
  status?: string | null;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;

  // Previous compatibility fields
  value?: number | null;
  classification?: string | null;
}

export interface ProcurementOpportunity {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementParticipation {
  id: string;
  organizationId: string;
  workspaceId: string;
  bidId: string;
  supplierId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementBidSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  opportunitiesCount: number;
  bidsCount: number;
  participationsCount: number;
  lotsCount: number;
  proposalsCount: number;
  recentOpportunities: ProcurementOpportunity[];
  recentBids: ProcurementBid[];
}

export interface ProcurementBidHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    completeness: number;
    participationRate: number;
    successRate: number;
    riskFactor: number;
  };
}

export interface ProcurementContract {
  id: string;
  organizationId?: string;
  workspaceId?: string;
  supplierId?: string;
  bidId?: string;
  status?: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  // previous compatibility fields
  title?: string | null;
  number?: string | null;
  value?: number | null;
  supplierName?: string | null;
}

export interface ProcurementContractExecution {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementInspection {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementDelivery {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementMeasurement {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementContractIssue {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementContractSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  contractsCount: number;
  executionsCount: number;
  inspectionsCount: number;
  deliveriesCount: number;
  measurementsCount: number;
  issuesCount: number;
  recentContracts: ProcurementContract[];
}

export interface ProcurementContractHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    activeContractsRate: number;
    deliveryRate: number;
    issueRate: number;
    measurementRate: number;
  };
}

export interface ProcurementSupplierDocument {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  documentType: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementSupplierCertificate {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  certificateType: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementSupplierQualification {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  qualificationType: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementSupplierRegistry {
  id: string;
  organizationId: string;
  workspaceId: string;
  supplierId: string;
  registryType: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementSupplierSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  suppliersCount: number;
  documentsCount: number;
  certificatesCount: number;
  qualificationsCount: number;
  registriesCount: number;
  recentSuppliers: ProcurementSupplier[];
}

export interface ProcurementSupplierHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    activeSuppliersRate: number;
    documentRegularityRate: number;
    certificateExpirationRate: number;
    complianceRate: number;
  };
}

// --- SPRINT 18.4: PROCUREMENT AUDIT, COMPLIANCE & ARP MANAGEMENT FOUNDATION ---

export interface ProcurementARP {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementARPItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  arpId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementARPConsumption {
  id: string;
  organizationId: string;
  workspaceId: string;
  arpItemId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementARPParticipant {
  id: string;
  organizationId: string;
  workspaceId: string;
  arpId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementARPCarona {
  id: string;
  organizationId: string;
  workspaceId: string;
  arpId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementAuditEvent {
  id: string;
  organizationId: string;
  workspaceId: string;
  eventType: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementComplianceEvent {
  id: string;
  organizationId: string;
  workspaceId: string;
  eventType: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementComplianceSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  arpsCount: number;
  arpItemsCount: number;
  arpConsumptionsCount: number;
  arpParticipantsCount: number;
  arpCaronasCount: number;
  auditEventsCount: number;
  complianceEventsCount: number;
}

export interface ProcurementComplianceHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    arpActiveRate: number;
    consumptionComplianceRate: number;
    auditRegularityRate: number;
    noNonCompliantRate: number;
  };
}

// --- SPRINT 18.5: PROCUREMENT REPORTING & EXECUTIVE BRIEF FOUNDATION ---

export interface ProcurementReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  reportType?: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementExecutiveBrief {
  id: string;
  organizationId: string;
  workspaceId: string;
  briefType?: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementMonitoringSnapshot {
  id: string;
  organizationId: string;
  workspaceId: string;
  snapshotType: string;
  snapshotJson: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProcurementSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  workspaceId: string;
  opportunitiesCount: number;
  bidsCount: number;
  suppliersCount: number;
  contractsCount: number;
  arpsCount: number;
  auditEventsCount: number;
  complianceEventsCount: number;
  reportsCount: number;
  briefsCount: number;
  snapshotsCount: number;
  updatedAt: string;
}

export interface ProcurementReportingHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    reportsReadyRate: number;
    briefsReadyRate: number;
    snapshotsCoverageRate: number;
    activityLogRate: number;
  };
}

// --- SPRINT 19.0 - GOVERNMENT AMENDMENTS FOUNDATION ---
export interface GovernmentParliamentarian {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // DRAFT, PENDING, APPROVED, ACTIVE, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendment {
  id: string;
  organizationId: string;
  workspaceId: string;
  parliamentarianId: string;
  status: string; // DRAFT, PENDING, APPROVED, ACTIVE, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentBeneficiary {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, APPROVED, ACTIVE, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentDestination {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, APPROVED, ACTIVE, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentExecution {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, APPROVED, ACTIVE, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  workspaceId: string;
  parliamentariansCount: number;
  amendmentsCount: number;
  beneficiariesCount: number;
  destinationsCount: number;
  executionsCount: number;
  updatedAt: string;
}

export interface GovernmentAmendmentHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    approvedRate: number;
    executionRate: number;
    beneficiaryReadyRate: number;
    destinationReadyRate: number;
  };
}

// --- SPRINT 19.1 - GOVERNMENT AMENDMENT EXECUTION, MONITORING & ACCOUNTABILITY ---
export interface GovernmentAmendmentMilestone {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentMonitoring {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentEvidence {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentAccountability {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentIssue {
  id: string;
  organizationId: string;
  workspaceId: string;
  amendmentId: string;
  status: string; // DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentMonitoringSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  workspaceId: string;
  milestonesCount: number;
  monitoringsCount: number;
  evidencesCount: number;
  accountabilitiesCount: number;
  issuesCount: number;
  updatedAt: string;
}

export interface GovernmentAmendmentMonitoringHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    completedMilestonesRate: number;
    activeMonitoringsRate: number;
    evidencesAvailabilityRate: number;
    pendantAccountabilitiesRate: number;
    issueResolutionRate: number;
  };
}

// --- SPRINT 19.2 - GOVERNMENT AMENDMENT REPORTING, EXECUTIVE REVIEW & ACCOUNTABILITY ---
export interface GovernmentAmendmentReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentExecutiveBrief {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentSnapshot {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentReview {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentCycle {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // DRAFT, READY, ARCHIVED, ACTIVE, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAmendmentReportingSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  workspaceId: string;
  reportsCount: number;
  executiveBriefsCount: number;
  snapshotsCount: number;
  reviewsCount: number;
  cyclesCount: number;
  updatedAt: string;
}

export interface GovernmentAmendmentReportingHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    activeReportsRate: number;
    readyBriefsRate: number;
    snapshotsAvailabilityRate: number;
    reviewsCompletionRate: number;
    activeCyclesRate: number;
  };
}

// --- SPRINT 20.0 - GOVERNMENT HEALTH INTELLIGENCE FOUNDATION ---
export interface GovernmentHealthUnit {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthTeam {
  id: string;
  organizationId: string;
  workspaceId: string;
  unitId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthProgram {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthIndicator {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthCoverage {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthProduction {
  id: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  workspaceId: string;
  unitsCount: number;
  teamsCount: number;
  programsCount: number;
  indicatorsCount: number;
  coveragesCount: number;
  productionsCount: number;
  updatedAt: string;
}

export interface GovernmentHealthStatus {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    activeUnitsRate: number;
    activeTeamsRate: number;
    activeProgramsRate: number;
    indicatorsTrackedRate: number;
    coveragesActiveRate: number;
    productionsTrackedRate: number;
  };
}

// SPRINT 21.0 - EDUCATION INTELLIGENCE FOUNDATION

export interface GovernmentEducationUnit {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationTeam {
  id?: string;
  organizationId: string;
  workspaceId: string;
  unitId?: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationProgram {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationIndicator {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationCoverage {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationProduction {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  workspaceId: string;
  unitsCount: number;
  teamsCount: number;
  programsCount: number;
  indicatorsCount: number;
  coveragesCount: number;
  productionsCount: number;
  updatedAt: string;
}

export interface GovernmentEducationStatus {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  educationScore: number;
  metrics: {
    unitsActiveRate: number;
    programsActiveRate: number;
    productionsCompletedRate: number;
  };
}

// --- SPRINT 21.1: EDUCATION PERFORMANCE & MONITORING FOUNDATION ---

export type GovernmentEducationMonitoringStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "COMPLETED" | "NO_DATA";
export type GovernmentEducationOperationalStatus = "READY" | "PARTIAL_DATA" | "NO_DATA";

export interface GovernmentEducationGoal {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadataJson: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationResult {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationMonitoring {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationEvidence {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationIssue {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationSnapshot {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentEducationMonitoringSummary {
  status: GovernmentEducationOperationalStatus;
  workspaceId: string;
  goalsCount: number;
  resultsCount: number;
  monitoringsCount: number;
  evidencesCount: number;
  issuesCount: number;
  snapshotsCount: number;
  updatedAt: string;
}

export interface GovernmentEducationMonitoringStatusResult {
  status: GovernmentEducationOperationalStatus;
  details: Record<string, any>;
}

export interface GovernmentHealthGoal {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthResult {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthMonitoring {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthEvidence {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthIssue {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthSnapshot {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentHealthMonitoringSummary {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  workspaceId: string;
  goalsCount: number;
  resultsCount: number;
  monitoringsCount: number;
  evidencesCount: number;
  issuesCount: number;
  snapshotsCount: number;
  updatedAt: string;
}

export interface GovernmentHealthMonitoringStatus {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    goalsTrackedRate: number;
    resultsAchievedRate: number;
    issuesResolvedRate: number;
  };
}

// --- SPRINT 22.2: TRANSPARENCY ANALYTICS FOUNDATION ---

export interface GovernmentTransparencyMetric {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string; // ACTIVE, INACTIVE, PENDING, COMPLETED, NO_DATA
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentTransparencyKPI {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentTransparencyCompliance {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentTransparencyAudit {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentTransparencyMonitoring {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentTransparencyAnalyticsSummary {
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  totalMetrics: number;
  totalKPIs: number;
  totalCompliances: number;
  totalAudits: number;
  totalMonitorings: number;
  lastComputedAt: string;
}

export interface GovernmentTransparencyAnalyticsHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    message: string;
    timestamp: string;
  };
}

// --- SPRINT 22.3: PUBLIC TRANSPARENCY PORTAL CONSOLIDATION FOUNDATION ---

export interface GovernmentPublicPortal {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string; // READY, PARTIAL_DATA, NO_DATA, etc.
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentPublicCatalog {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentPublicDataset {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentPublicPublication {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentPublicQuery {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentPublicAccessLog {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentPublicPortalSummary {
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  totalPortals: number;
  totalCatalogs: number;
  totalDatasets: number;
  totalPublications: number;
  totalQueries: number;
  totalAccessLogs: number;
  lastComputedAt: string;
}

export interface GovernmentPublicPortalHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    message: string;
    timestamp: string;
  };
}

// --- SPRINT 23.0: PREFEITURA ZERO PAPEL FOUNDATION TYPES ---

export interface GovernmentProtocol {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcess {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDocumentRecord {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDispatch {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentRouting {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcessStep {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcessHistory {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentZeroPaperSummary {
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  totalProtocols: number;
  totalProcesses: number;
  totalDocumentRecords: number;
  totalDispatches: number;
  totalRoutings: number;
  totalProcessSteps: number;
  totalProcessHistories: number;
  lastComputedAt: string;
}

export interface GovernmentZeroPaperHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    message: string;
    timestamp: string;
  };
}

// --- SPRINT 23.1: PROTOCOL & PROCESS MANAGEMENT FOUNDATION TYPES ---

export interface GovernmentDepartment {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProtocolQueue {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcessAssignment {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcessMovement {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcessResponsible {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcessSector {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentProcessManagementSummary {
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  totalDepartments: number;
  totalProtocolQueues: number;
  totalProcessAssignments: number;
  totalProcessMovements: number;
  totalProcessResponsibles: number;
  totalProcessSectors: number;
  lastComputedAt: string;
}

export interface GovernmentProcessManagementHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    message: string;
    timestamp: string;
  };
}

// --- SPRINT 23.2: WORKFLOW & ROUTING FOUNDATION TYPES ---

export interface GovernmentWorkflow {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentWorkflowStage {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentWorkflowTransition {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentWorkflowQueue {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentWorkflowExecution {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentWorkflowRoute {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentWorkflowSummary {
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  totalWorkflows: number;
  totalWorkflowStages: number;
  totalWorkflowTransitions: number;
  totalWorkflowQueues: number;
  totalWorkflowExecutions: number;
  totalWorkflowRoutes: number;
  lastComputedAt: string;
}

export interface GovernmentWorkflowHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    message: string;
    timestamp: string;
  };
}

// --- SPRINT 23.3: DOCUMENT LIFECYCLE FOUNDATION TYPES ---

export interface GovernmentDocumentVersion {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDocumentClassification {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDocumentRetention {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDocumentArchive {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDocumentMovement {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDocumentAudit {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentDocumentLifecycleSummary {
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  totalDocumentVersions: number;
  totalDocumentClassifications: number;
  totalDocumentRetentions: number;
  totalDocumentArchives: number;
  totalDocumentMovements: number;
  totalDocumentAudits: number;
  lastComputedAt: string;
}

export interface GovernmentDocumentLifecycleHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    message: string;
    timestamp: string;
  };
}


// --- SPRINT 23.4: ADMINISTRATIVE GOVERNANCE FOUNDATION TYPES ---

export interface GovernmentAdministrativeIndicator {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAdministrativeAudit {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAdministrativeCompliance {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAdministrativeResponsibility {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAdministrativeMonitoring {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAdministrativeOccurrence {
  id?: string;
  organizationId: string;
  workspaceId: string;
  status: string;
  metadataJson?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernmentAdministrativeGovernanceSummary {
  organizationId: string;
  workspaceId: string;
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  totalAdministrativeIndicators: number;
  totalAdministrativeAudits: number;
  totalAdministrativeCompliances: number;
  totalAdministrativeResponsibilities: number;
  totalAdministrativeMonitorings: number;
  totalAdministrativeOccurrences: number;
  lastComputedAt: string;
}

export interface GovernmentAdministrativeGovernanceHealth {
  status: "READY" | "PARTIAL_DATA" | "NO_DATA";
  healthScore: number;
  metrics: {
    message: string;
    timestamp: string;
  };
}







