import {
  Contact,
  CRMInteraction,
  CalendarEvent,
  Activity,
  Task,
  Evidence,
  Attachment,
  WorkflowInstance,
  WorkflowStep,
  Notification,
  Module,
  OrganizationModule,
  ModuleFeature,
  OrganizationFeatureOverride,
  Workspace,
  OrganizationWorkspace,
  OrganizationSetting,
  SuperAdminAuditLog,
  ImportJob,
  ImportJobFile,
  ImportJobLog,
  ImportJobError,
  ElectoralCampaign,
  CampaignMember,
  CampaignGoal,
  CampaignAction,
  CampaignEvidence,
  CampaignTerritory,
  CampaignCoordinator,
  CampaignCoordinatorAssignment,
  CampaignTerritoryCoverage,
  CampaignTerritoryConflict,
  CampaignCoordinatorHealth,
  CampaignContact,
  CampaignContactRelationship,
  CampaignContactTag,
  CampaignContactSegment,
  CampaignContactEngagement,
  CampaignEvent,
  CampaignEventParticipant,
  CampaignEventTerritory,
  CampaignEventEvidence,
  CampaignEventAttendance,
  CommunicationThread,
  CommunicationParticipant,
  CommunicationMessage,
  CommunicationRequest,
  CommunicationDispatch,
  CommunicationLog,
  UserPresence,
  UserSession,
  UserActivityLog
} from "../beta/core/types";

export interface DatabaseAdapter {
  getCommercialOpportunities(organizationId: string, workspaceId?: string): Promise<any[]>;
  createCommercialOpportunity(data: any): Promise<any>;
  updateCommercialOpportunity(id: string, organizationId: string, workspaceId: string | undefined, data: any): Promise<any>;
  deleteCommercialOpportunity(id: string, organizationId: string, workspaceId?: string): Promise<any>;
  getCommercialTasks(organizationId: string, workspaceId?: string): Promise<any[]>;
  createCommercialTasks(data: any[]): Promise<any[]>;
  clearCommercialTasks(organizationId: string, workspaceId?: string): Promise<any>;
  getCommercialRadarSyncRuns(organizationId: string, workspaceId?: string): Promise<any[]>;
  createCommercialRadarSyncRun(data: any): Promise<any>;
  updateCommercialRadarSyncRun(id: string, organizationId: string, workspaceId: string | undefined, data: any): Promise<any>;

  getCrmGovClients(organizationId: string, workspaceId?: string): Promise<any[]>;
  replaceCrmGovClients(organizationId: string, workspaceId: string, data: any[]): Promise<any[]>;

  getProjects(userId: string, organizationId: string, workspaceId?: string): Promise<any[]>;
  getProjectById(projectId: string, userId: string, organizationId: string, workspaceId?: string): Promise<any>;
  createProject(data: any): Promise<any>;
  updateProject(id: string, data: any): Promise<any>;
  deleteProject(id: string): Promise<any>;

  getTasks(projectId: string, workspaceId?: string): Promise<any[]>;
  createTask(data: any): Promise<any>;
  updateTask(id: string, data: any): Promise<any>;
  deleteTask(id: string): Promise<any>;

  getDecisions(projectId: string, workspaceId?: string): Promise<any[]>;
  createDecision(data: any): Promise<any>;
  updateDecision(id: string, data: any): Promise<any>;
  deleteDecision(id: string): Promise<any>;

  getMemories(projectId: string, workspaceId?: string): Promise<any[]>;
  createMemory(data: any): Promise<any>;
  updateMemory(id: string, data: any): Promise<any>;
  deleteMemory(id: string): Promise<any>;

  getMessages(projectId?: string, workspaceId?: string): Promise<any[]>;
  createMessage(data: any): Promise<any>;

  getProjectContext(projectId: string, workspaceId?: string): Promise<any>;
  saveProjectContext(projectId: string, context: any): Promise<any>;

  getActionLogs(organizationId: string, workspaceId: string): Promise<any[]>;
  createActionLog(data: any): Promise<any>;

  getActionExecutionLogs(organizationId: string, workspaceId: string): Promise<any[]>;
  createActionExecutionLog(data: any): Promise<any>;

  getObjectives(projectId: string, workspaceId?: string): Promise<any[]>;
  createObjective(data: any): Promise<any>;
  updateObjective(id: string, data: any): Promise<any>;
  deleteObjective(id: string): Promise<any>;

  getWorkspaceState(userId: string, organizationId: string, workspaceId?: string): Promise<any>;
  saveWorkspaceState(data: any): Promise<any>;

  // Sprint 7 - Knowledge Graph & Continuity Snapshot Methods
  createKnowledgeNode(data: any): Promise<any>;
  updateKnowledgeNode(id: string, data: any): Promise<any>;
  deleteKnowledgeNode(id: string): Promise<any>;
  deleteKnowledgeRelation(id: string): Promise<any>;
  getKnowledgeNodes(organizationId: string, projectId?: string, workspaceId?: string): Promise<any[]>;
  getKnowledgeNodeBySourceAndType(organizationId: string, sourceId: string, nodeType: string, workspaceId?: string): Promise<any>;
  createKnowledgeRelation(data: any): Promise<any>;
  getKnowledgeRelations(organizationId: string, workspaceId?: string): Promise<any[]>;
  getContinuitySnapshot(projectId: string, workspaceId?: string): Promise<any>;
  saveContinuitySnapshot(data: any): Promise<any>;

  // Sprint 8 - AI Connections Methods
  getAIConnections(organizationId: string, workspaceId?: string): Promise<any[]>;
  createAIConnection(data: any): Promise<any>;
  updateAIConnection(id: string, data: any): Promise<any>;
  deleteAIConnection(id: string): Promise<any>;

  // Sprint 9 - Specializations
  getSpecializations(organizationId: string, workspaceId?: string): Promise<any[]>;
  getProjectSpecialization(projectId: string, workspaceId?: string): Promise<any>;
  setProjectSpecialization(projectId: string, specializationKey: string, organizationId: string): Promise<any>;

  // Sprint 10 - Documents & Data
  getDocuments(projectId?: string, workspaceId?: string): Promise<any[]>;
  createDocument(data: any): Promise<any>;
  getDocumentById(id: string, workspaceId?: string): Promise<any>;
  updateDocument(id: string, data: any): Promise<any>;

  getDocumentChunks(documentId: string, workspaceId?: string): Promise<any[]>;
  createDocumentChunk(data: any): Promise<any>;

  getDocumentOutputs(documentId: string): Promise<any[]>;
  createDocumentOutput(data: any): Promise<any>;

  getDocumentJobs(documentId?: string): Promise<any[]>;
  getDocumentJobById(id: string): Promise<any>;
  createDocumentJob(data: any): Promise<any>;
  updateDocumentJob(id: string, data: any): Promise<any>;

  createDocumentAuditLog(data: any): Promise<any>;
  getDocumentStats(organizationId?: string): Promise<any>;
  getDocumentHealth(): Promise<any>;
  // Sprint 11 - Workspace Snapshots
  getWorkspaceSnapshots(projectId?: string): Promise<any[]>;
  createWorkspaceSnapshot(data: any): Promise<any>;
  // Sprint 12 - Government Snapshots
  getGovernmentSnapshots(organizationId: string): Promise<any[]>;
  createGovernmentSnapshot(data: any): Promise<any>;
  // Sprint 13 - Procurement Snapshots
  getProcurementSnapshots(organizationId: string, workspaceId?: string): Promise<any[]>;
  createProcurementSnapshot(data: any): Promise<any>;

  // Sprint 14.0.1 - Electoral Persistence Methods
  getElectoralCampaigns(organizationId: string, workspaceId?: string): Promise<any[]>;
  createElectoralCampaign(data: any): Promise<any>;
  updateElectoralCampaign(id: string, data: any): Promise<any>;
  getElectoralTerritories(organizationId: string, workspaceId?: string): Promise<any[]>;
  createElectoralTerritory(data: any): Promise<any>;
  getElectoralCoordinators(organizationId: string, workspaceId?: string): Promise<any[]>;
  createElectoralCoordinator(data: any): Promise<any>;
  getElectoralCampaignInvites(organizationId: string, workspaceId?: string): Promise<any[]>;
  createElectoralCampaignInvite(data: any): Promise<any>;
  updateElectoralCampaignInvite(id: string, data: any): Promise<any>;
  getElectoralAnalyses(organizationId: string, workspaceId?: string): Promise<any[]>;
  createElectoralAnalysis(data: any): Promise<any>;

  // Sprint 14.1 - Objectives & Tasks Methods
  getElectoralCampaignObjectives(organizationId: string, campaignId?: string): Promise<any[]>;
  createElectoralCampaignObjective(data: any): Promise<any>;
  updateElectoralCampaignObjective(id: string, data: any): Promise<any>;
  getElectoralCampaignTasks(organizationId: string, campaignId?: string): Promise<any[]>;
  createElectoralCampaignTask(data: any): Promise<any>;
  updateElectoralCampaignTask(id: string, data: any): Promise<any>;

  // Sprint 14.2 - Coordinator & Invite System Methods
  updateElectoralCoordinator(id: string, data: any): Promise<any>;
  getElectoralInviteAuditLogs(organizationId: string, inviteId?: string): Promise<any[]>;
  createElectoralInviteAuditLog(data: any): Promise<any>;

  // Sprint 14.3 - Territorial Intelligence Methods
  updateElectoralTerritory(id: string, data: any): Promise<any>;

  // Sprint 14.4 - Opponent & Political Intelligence Methods
  getElectoralOpponents(organizationId: string): Promise<any[]>;
  getElectoralOpponentById(organizationId: string, id: string): Promise<any>;
  createElectoralOpponent(data: any): Promise<any>;
  updateElectoralOpponent(id: string, data: any): Promise<any>;
  deleteElectoralOpponent(id: string): Promise<void>;

  getElectoralPoliticalGroups(organizationId: string): Promise<any[]>;
  getElectoralPoliticalGroupById(organizationId: string, id: string): Promise<any>;
  createElectoralPoliticalGroup(data: any): Promise<any>;
  updateElectoralPoliticalGroup(id: string, data: any): Promise<any>;
  deleteElectoralPoliticalGroup(id: string): Promise<void>;

  getElectoralLeaderships(organizationId: string): Promise<any[]>;
  getElectoralLeadershipById(organizationId: string, id: string): Promise<any>;
  createElectoralLeadership(data: any): Promise<any>;
  updateElectoralLeadership(id: string, data: any): Promise<any>;
  deleteElectoralLeadership(id: string): Promise<void>;

  getElectoralRelationships(organizationId: string): Promise<any[]>;
  getElectoralRelationshipById(organizationId: string, id: string): Promise<any>;
  createElectoralRelationship(data: any): Promise<any>;
  updateElectoralRelationship(id: string, data: any): Promise<any>;
  deleteElectoralRelationship(id: string): Promise<void>;

  // Sprint 14.5.1 - Historical Electoral Intelligence Methods
  getElectoralHistoricalResults(filter?: any): Promise<any[]>;
  createElectoralHistoricalResult(data: any): Promise<any>;
  bulkCreateElectoralHistoricalResults(records: any[]): Promise<any[]>;
  getCandidateHistoricalResults(candidateName: string, filter?: any): Promise<any[]>;
  getPartyHistoricalResults(party: string, filter?: any): Promise<any[]>;
  getTerritoryHistoricalResults(filter?: any): Promise<any[]>;
  getElectoralCandidateRanking(organizationId: string, filter?: any): Promise<{name: string; votes: number}[]>;
  getElectoralPartyRanking(organizationId: string, filter?: any): Promise<{name: string; votes: number}[]>;

  // Sprint 14.5.2 - Historical Electoral Bulk Import Methods
  createElectoralImportJob(data: any): Promise<any>;
  updateElectoralImportJob(id: string, data: any): Promise<any>;
  getElectoralImportJob(id: string): Promise<any>;
  getElectoralImportJobs(organizationId: string): Promise<any[]>;
  createElectoralImportRowError(data: any): Promise<any>;

  // Sprint 14.5.3 - Aggregates & Validation Methods
  refreshElectoralAggregates(): Promise<void>;
  createElectoralImportValidationSummary(data: any): Promise<any>;
  getElectoralAvailableFilters(organizationId: string): Promise<any>;
  computeElectoralImportValidation(organizationId: string, importRunId: string): Promise<any>;
  getElectoralCandidateSummary(organizationId: string, filter?: any): Promise<any[]>;
  getElectoralMunicipalitySummary(organizationId: string, filter?: any): Promise<any[]>;
  getElectoralPartySummary(organizationId: string, filter?: any): Promise<any[]>;
  getElectoralLocationSummary(organizationId: string, filter?: any): Promise<any[]>;
  getElectoralZoneSummary(organizationId: string, filter?: any): Promise<any[]>;

  // Sprint 15.0 - Beta Platform Operational Engine
  getContacts(organizationId: string, filter?: any): Promise<Contact[]>;
  createContact(data: any): Promise<Contact>;
  
  getCRMInteractions(organizationId: string, filter?: any): Promise<CRMInteraction[]>;
  createCRMInteraction(data: any): Promise<CRMInteraction>;
  
  getCalendarEvents(organizationId: string, filter?: any): Promise<CalendarEvent[]>;
  createCalendarEvent(data: any): Promise<CalendarEvent>;
  
  getActivities(organizationId: string, filter?: any): Promise<Activity[]>;
  createActivity(data: any): Promise<Activity>;
  
  getCoreTasks(organizationId: string, filter?: any): Promise<Task[]>;
  createCoreTask(data: any): Promise<Task>;
  
  getEvidences(organizationId: string, filter?: any): Promise<Evidence[]>;
  createEvidence(data: any): Promise<Evidence>;
  
  getAttachments(organizationId: string, filter?: any): Promise<Attachment[]>;
  createAttachment(data: any): Promise<Attachment>;
  
  getWorkflowInstances(organizationId: string, filter?: any): Promise<WorkflowInstance[]>;
  createWorkflowInstance(data: any): Promise<WorkflowInstance>;
  
  getWorkflowSteps(organizationId: string, instanceId: string): Promise<WorkflowStep[]>;
  createWorkflowStep(data: any): Promise<WorkflowStep>;
  
  getNotifications(organizationId: string, filter?: any): Promise<Notification[]>;
  createNotification(data: any): Promise<Notification>;

  // Sprint 15.1 - Module Access Layer
  getModules(): Promise<Module[]>;
  getOrganizationModules(organizationId: string): Promise<OrganizationModule[]>;
  enableOrganizationModule(organizationId: string, moduleId: string, metadataJson?: any): Promise<OrganizationModule>;
  disableOrganizationModule(organizationId: string, moduleId: string): Promise<void>;
  getModuleFeatures(): Promise<ModuleFeature[]>;
  getOrganizationFeatures(organizationId: string): Promise<OrganizationFeatureOverride[]>;

  // Sprint 15.2 - Client Workspaces & Super Admin
  getWorkspaces(organizationId: string, filter?: any): Promise<Workspace[]>;
  createWorkspace(data: any): Promise<Workspace>;
  updateWorkspace(id: string, organizationId: string, data: any): Promise<Workspace>;
  getOrganizationSettings(organizationId: string): Promise<OrganizationSetting[]>;
  updateOrganizationSetting(organizationId: string, settingKey: string, settingValue: string, metadataJson?: any): Promise<OrganizationSetting>;
  getAuditLogs(): Promise<SuperAdminAuditLog[]>;
  createAuditLog(data: any): Promise<SuperAdminAuditLog>;

  // Administrative getters
  getOrganizations(): Promise<any[]>;
  getOrganizationDetails(id: string): Promise<any>;
  getOrganizationUsers(organizationId: string): Promise<any[]>;

  // Sprint 15.3 - Shared Import Center
  createImportJob(data: any): Promise<ImportJob>;
  updateImportJob(id: string, organizationId: string, data: any): Promise<ImportJob>;
  getImportJob(id: string, organizationId: string): Promise<ImportJob | null>;
  getImportJobs(organizationId: string, workspaceId: string): Promise<ImportJob[]>;
  createImportLog(data: any): Promise<ImportJobLog>;
  createImportError(data: any): Promise<ImportJobError>;
  getImportErrors(jobId: string): Promise<ImportJobError[]>;

  // Sprint 15.4 - Electoral Operational Integration
  getCampaigns(organizationId: string, workspaceId: string): Promise<ElectoralCampaign[]>;
  createCampaign(data: any): Promise<ElectoralCampaign>;
  updateCampaign(id: string, organizationId: string, data: any): Promise<ElectoralCampaign>;
  getCampaignMembers(campaignId: string): Promise<CampaignMember[]>;
  addCampaignMember(data: any): Promise<CampaignMember>;
  getCampaignGoals(campaignId: string): Promise<CampaignGoal[]>;
  createCampaignGoal(data: any): Promise<CampaignGoal>;
  updateCampaignGoal(id: string, campaignId: string, data: any): Promise<CampaignGoal>;
  getCampaignActions(campaignId: string): Promise<CampaignAction[]>;
  createCampaignAction(data: any): Promise<CampaignAction>;
  getCampaignEvidences(campaignId: string): Promise<CampaignEvidence[]>;
  linkCampaignEvidence(data: any): Promise<CampaignEvidence>;

  // Sprint 15.5 - Coordinator & Territory Operational Layer
  getCampaignTerritories(organizationId: string, campaignId: string): Promise<CampaignTerritory[]>;
  createCampaignTerritory(data: any): Promise<CampaignTerritory>;
  updateCampaignTerritory(id: string, organizationId: string, data: any): Promise<CampaignTerritory>;

  getCampaignCoordinators(organizationId: string, campaignId: string): Promise<CampaignCoordinator[]>;
  createCampaignCoordinator(data: any): Promise<CampaignCoordinator>;
  updateCampaignCoordinator(id: string, organizationId: string, data: any): Promise<CampaignCoordinator>;

  getCoordinatorAssignments(organizationId: string, campaignId: string): Promise<CampaignCoordinatorAssignment[]>;
  assignCoordinatorToTerritory(data: any): Promise<CampaignCoordinatorAssignment>;
  removeCoordinatorAssignment(id: string, organizationId: string): Promise<void>;

  getTerritoryCoverage(organizationId: string, campaignId: string): Promise<CampaignTerritoryCoverage[]>;
  computeTerritoryCoverage(data: any): Promise<CampaignTerritoryCoverage>;

  getTerritoryConflicts(organizationId: string, campaignId: string): Promise<CampaignTerritoryConflict[]>;
  computeTerritoryConflicts(data: any): Promise<CampaignTerritoryConflict>;

  getCoordinatorHealth(organizationId: string, campaignId: string): Promise<CampaignCoordinatorHealth[]>;
  computeCoordinatorHealth(data: any): Promise<CampaignCoordinatorHealth>;

  // Sprint 15.6 - Campaign CRM Integration
  getCampaignContacts(organizationId: string, campaignId: string): Promise<CampaignContact[]>;
  addCampaignContact(data: any): Promise<CampaignContact>;
  updateCampaignContact(id: string, organizationId: string, data: any): Promise<CampaignContact>;

  getContactRelationships(organizationId: string, campaignId: string): Promise<CampaignContactRelationship[]>;
  createRelationship(data: any): Promise<CampaignContactRelationship>;

  getContactSegments(organizationId: string, campaignId: string): Promise<CampaignContactSegment[]>;
  createSegment(data: any): Promise<CampaignContactSegment>;

  getContactEngagement(organizationId: string, campaignId: string): Promise<CampaignContactEngagement[]>;
  computeContactEngagement(data: any): Promise<CampaignContactEngagement>;

  // Sprint 15.7 - Campaign Calendar & Agenda Integration
  getCampaignEvents(organizationId: string, campaignId: string): Promise<CampaignEvent[]>;
  createCampaignEvent(data: any): Promise<CampaignEvent>;
  updateCampaignEvent(id: string, organizationId: string, campaignId: string, data: any): Promise<CampaignEvent>;
  getEventParticipants(organizationId: string, campaignId: string, eventId: string): Promise<CampaignEventParticipant[]>;
  addParticipant(data: any): Promise<CampaignEventParticipant>;
  getEventAttendance(organizationId: string, campaignId: string, eventId: string): Promise<CampaignEventAttendance[]>;
  registerAttendance(data: any): Promise<CampaignEventAttendance>;
  linkEventTerritory(data: any): Promise<CampaignEventTerritory>;
  linkEventEvidence(data: any): Promise<CampaignEventEvidence>;
  getCampaignEventTerritories(organizationId: string, campaignId: string): Promise<CampaignEventTerritory[]>;
  getCampaignEventEvidences(organizationId: string, campaignId: string): Promise<CampaignEventEvidence[]>;

  // Sprint 15.8 - Communication & Action Dispatch
  getCommunicationThreads(organizationId: string, workspaceId: string): Promise<CommunicationThread[]>;
  createCommunicationThread(data: any): Promise<CommunicationThread>;
  getCommunicationMessages(organizationId: string, workspaceId: string, threadId: string): Promise<CommunicationMessage[]>;
  getTotalMessagesCount(organizationId: string, workspaceId: string): Promise<number>;
  sendCommunicationMessage(data: any): Promise<CommunicationMessage>;
  addCommunicationParticipant(data: any): Promise<CommunicationParticipant>;
  getCommunicationParticipants(organizationId: string, workspaceId: string, threadId: string): Promise<CommunicationParticipant[]>;
  getCommunicationRequests(organizationId: string, workspaceId: string): Promise<CommunicationRequest[]>;
  createCommunicationRequest(data: any): Promise<CommunicationRequest>;
  getCommunicationDispatches(organizationId: string, workspaceId: string): Promise<CommunicationDispatch[]>;
  createCommunicationDispatch(data: any): Promise<CommunicationDispatch>;
  getCommunicationLogs(organizationId: string, workspaceId: string): Promise<CommunicationLog[]>;
  createCommunicationLog(data: any): Promise<CommunicationLog>;

  // Sprint 15.9 - User Presence
  getUserPresence(organizationId: string, workspaceId: string, userId?: string): Promise<UserPresence[]>;
  updateUserPresence(data: any): Promise<UserPresence>;
  getUserSessions(organizationId: string, workspaceId: string, userId?: string): Promise<UserSession[]>;
  createUserSession(data: any): Promise<UserSession>;
  closeUserSession(organizationId: string, workspaceId: string, sessionId: string): Promise<UserSession>;
  getUserActivityLog(organizationId: string, workspaceId: string, userId?: string): Promise<UserActivityLog[]>;
  createUserActivity(data: any): Promise<UserActivityLog>;

  // Sprint 16.3 - AI Router Foundation
  getProviders(organizationId: string, workspaceId: string): Promise<any[]>;
  registerProvider(data: any): Promise<any>;
  enableProvider(organizationId: string, workspaceId: string, id: string): Promise<any>;
  disableProvider(organizationId: string, workspaceId: string, id: string): Promise<any>;
  getPolicies(organizationId: string, workspaceId: string): Promise<any[]>;
  createPolicy(data: any): Promise<any>;
  getRouterRequests(organizationId: string, workspaceId: string): Promise<any[]>;
  createRouterRequest(data: any): Promise<any>;
  getRouterAudits(organizationId: string, workspaceId: string): Promise<any[]>;
  createRouterAudit(data: any): Promise<any>;

  // Sprint 16.4 - Beta Action Execution
  createActionRequest(data: any): Promise<any>;
  getActionRequests(organizationId: string, workspaceId: string): Promise<any[]>;
  getActionRequestById(organizationId: string, workspaceId: string, id: string): Promise<any>;
  createActionDispatch(data: any): Promise<any>;
  getActionDispatches(organizationId: string, workspaceId: string): Promise<any[]>;
  createBetaActionLog(data: any): Promise<any>;
  getBetaActionLogs(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 16.5 - Beta Skills Engine
  registerSkill(data: any): Promise<any>;
  enableSkill(organizationId: string, workspaceId: string, id: string): Promise<any>;
  disableSkill(organizationId: string, workspaceId: string, id: string): Promise<any>;
  getSkill(organizationId: string, workspaceId: string, id: string): Promise<any>;
  getSkills(organizationId: string, workspaceId: string): Promise<any[]>;
  getCapabilities(organizationId: string, workspaceId: string): Promise<any[]>;
  getSkillRegistry(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 16.6 - Beta Operational Orchestrator
  createOperationalIntent(data: any): Promise<any>;
  getOperationalIntents(organizationId: string, workspaceId: string): Promise<any[]>;
  createOperationalDispatch(data: any): Promise<any>;
  getOperationalDispatches(organizationId: string, workspaceId: string): Promise<any[]>;
  createOperationalResult(data: any): Promise<any>;
  getOperationalResults(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 17.0 - Beta Gov Workspace Foundation
  getGovernmentWorkspace(organizationId: string, workspaceId: string): Promise<any>;
  createGovernmentWorkspace(data: any): Promise<any>;
  createGovernmentWorkspaceSnapshot(data: any): Promise<any>;
  getGovernmentWorkspaceSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;
  createGovernmentLog(data: any): Promise<any>;
  getGovernmentLogs(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 17.1 - Beta Gov Program Management
  createGovernmentObjective(data: any): Promise<any>;
  createGovernmentProgram(data: any): Promise<any>;
  createGovernmentProject(data: any): Promise<any>;
  createGovernmentAction(data: any): Promise<any>;
  getGovernmentObjectives(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentPrograms(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentProjects(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentActions(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 17.2 - Beta Gov Indicators & Performance Management
  createGovernmentIndicator(data: any): Promise<any>;
  createGovernmentGoal(data: any): Promise<any>;
  createGovernmentResult(data: any): Promise<any>;
  getGovernmentIndicators(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentGoals(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentResults(organizationId: string, workspaceId: string): Promise<any[]>;
  createGovernmentPerformanceSnapshot(data: any): Promise<any>;
  getGovernmentPerformanceSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 17.3 - Government Reporting & Executive Brief Foundation
  createGovernmentReport(data: any): Promise<any>;
  getGovernmentReports(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentReport(id: string): Promise<any>;
  createExecutiveBrief(data: any): Promise<any>;
  getExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]>;
  getExecutiveBrief(id: string): Promise<any>;
  createMonitoringSnapshot(data: any): Promise<any>;
  getMonitoringSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;
  createGovernmentReportLog(data: any): Promise<any>;
  getGovernmentReportLogs(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 17.4 - Government Governance & Executive Review Foundation
  createGovernanceReview(data: any): Promise<any>;
  getGovernanceReviews(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernanceReview(id: string): Promise<any>;
  createExecutiveMeeting(data: any): Promise<any>;
  getExecutiveMeetings(organizationId: string, workspaceId: string): Promise<any[]>;
  getExecutiveMeeting(id: string): Promise<any>;
  createStrategicCycle(data: any): Promise<any>;
  getStrategicCycles(organizationId: string, workspaceId: string): Promise<any[]>;
  getStrategicCycle(id: string): Promise<any>;
  createGovernmentDecision(data: any): Promise<any>;
  getGovernmentDecisions(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentDecision(id: string): Promise<any>;
  createMonitoringReview(data: any): Promise<any>;
  getMonitoringReviews(organizationId: string, workspaceId: string): Promise<any[]>;
  getMonitoringReview(id: string): Promise<any>;

  // Sprint 18.0 - Beta Licita Workspace Foundation
  getProcurementWorkspace(organizationId: string, workspaceId: string): Promise<any | null>;
  createProcurementWorkspace(data: any): Promise<any>;
  createProcurementLog(data: any): Promise<any>;
  getProcurementLogs(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcurementSnapshot(data: any): Promise<any>;
  getProcurementSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 18.1 - Procurement Bid & Opportunity Management Foundation
  createOpportunity(data: any): Promise<any>;
  createBid(data: any): Promise<any>;
  createParticipation(data: any): Promise<any>;
  createLot(data: any): Promise<any>;
  createProposal(data: any): Promise<any>;
  getOpportunities(organizationId: string, workspaceId: string): Promise<any[]>;
  getBids(organizationId: string, workspaceId: string): Promise<any[]>;
  getParticipations(organizationId: string, workspaceId: string): Promise<any[]>;
  getLots(organizationId: string, workspaceId: string): Promise<any[]>;
  getProposals(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 18.2 - Supplier & Procurement Document Management Foundation
  createSupplier(data: any): Promise<any>;
  createSupplierDocument(data: any): Promise<any>;
  createSupplierCertificate(data: any): Promise<any>;
  createSupplierQualification(data: any): Promise<any>;
  createSupplierRegistry(data: any): Promise<any>;
  getSuppliers(organizationId: string, workspaceId: string): Promise<any[]>;
  getSupplierDocuments(organizationId: string, workspaceId: string): Promise<any[]>;
  getSupplierCertificates(organizationId: string, workspaceId: string): Promise<any[]>;
  getSupplierQualifications(organizationId: string, workspaceId: string): Promise<any[]>;
  getSupplierRegistries(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 18.3 - Procurement Contract & Contract Execution Foundation
  createContract(data: any): Promise<any>;
  createContractExecution(data: any): Promise<any>;
  createInspection(data: any): Promise<any>;
  createDelivery(data: any): Promise<any>;
  createMeasurement(data: any): Promise<any>;
  createContractIssue(data: any): Promise<any>;
  getContracts(organizationId: string, workspaceId: string): Promise<any[]>;
  getContractExecutions(organizationId: string, workspaceId: string): Promise<any[]>;
  getInspections(organizationId: string, workspaceId: string): Promise<any[]>;
  getDeliveries(organizationId: string, workspaceId: string): Promise<any[]>;
  getMeasurements(organizationId: string, workspaceId: string): Promise<any[]>;
  getContractIssues(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 18.4 - Procurement Audit, Compliance & ARP Management Foundation
  createARP(data: any): Promise<any>;
  createARPItem(data: any): Promise<any>;
  createARPConsumption(data: any): Promise<any>;
  createARPParticipant(data: any): Promise<any>;
  createARPCarona(data: any): Promise<any>;
  createAuditEvent(data: any): Promise<any>;
  createComplianceEvent(data: any): Promise<any>;
  getARPs(organizationId: string, workspaceId: string): Promise<any[]>;
  getARPItems(organizationId: string, workspaceId: string): Promise<any[]>;
  getARPConsumptions(organizationId: string, workspaceId: string): Promise<any[]>;
  getARPParticipants(organizationId: string, workspaceId: string): Promise<any[]>;
  getARPCaronas(organizationId: string, workspaceId: string): Promise<any[]>;
  getAuditEvents(organizationId: string, workspaceId: string): Promise<any[]>;
  getComplianceEvents(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 18.5 - Procurement Reporting & Executive Brief Foundation
  createReport(data: any): Promise<any>;
  createProcurementExecutiveBrief(data: any): Promise<any>;
  createProcurementMonitoringSnapshot(data: any): Promise<any>;
  createReportLog(data: any): Promise<any>;
  getReports(organizationId: string, workspaceId: string): Promise<any[]>;
  getReport(id: string): Promise<any>;
  getProcurementExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]>;
  getProcurementExecutiveBrief(id: string): Promise<any>;
  getProcurementMonitoringSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 19.0 - Government Amendments Foundation
  createParliamentarian(data: any): Promise<any>;
  createAmendment(data: any): Promise<any>;
  createBeneficiary(data: any): Promise<any>;
  createDestination(data: any): Promise<any>;
  createExecution(data: any): Promise<any>;
  getParliamentarians(organizationId: string, workspaceId: string): Promise<any[]>;
  getAmendments(organizationId: string, workspaceId: string): Promise<any[]>;
  getBeneficiaries(organizationId: string, workspaceId: string): Promise<any[]>;
  getDestinations(organizationId: string, workspaceId: string): Promise<any[]>;
  getExecutions(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 19.1 - Government Amendments Execution, Monitoring & Accountability Foundation
  createMilestone(data: any): Promise<any>;
  createMonitoring(data: any): Promise<any>;
  createGovAmendmentEvidence(data: any): Promise<any>;
  createAccountability(data: any): Promise<any>;
  createIssue(data: any): Promise<any>;
  getMilestones(organizationId: string, workspaceId: string): Promise<any[]>;
  getMonitorings(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovAmendmentEvidences(organizationId: string, workspaceId: string): Promise<any[]>;
  getAccountabilities(organizationId: string, workspaceId: string): Promise<any[]>;
  getIssues(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 19.2 - Government Amendment Reporting, Executive Review & Accountability Foundation
  createGovernmentAmendmentReport(data: any): Promise<any>;
  createGovernmentAmendmentExecutiveBrief(data: any): Promise<any>;
  createGovernmentAmendmentSnapshot(data: any): Promise<any>;
  createGovernmentAmendmentReview(data: any): Promise<any>;
  createGovernmentAmendmentCycle(data: any): Promise<any>;
  getGovernmentAmendmentReports(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentAmendmentExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentAmendmentSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentAmendmentReviews(organizationId: string, workspaceId: string): Promise<any[]>;
  getGovernmentAmendmentCycles(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 20.0 - Government Health Intelligence Foundation
  createHealthUnit(data: any): Promise<any>;
  getHealthUnits(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthTeam(data: any): Promise<any>;
  getHealthTeams(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthProgram(data: any): Promise<any>;
  getHealthPrograms(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthIndicator(data: any): Promise<any>;
  getHealthIndicators(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthCoverage(data: any): Promise<any>;
  getHealthCoverages(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthProduction(data: any): Promise<any>;
  getHealthProductions(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 20.1 - Government Health Monitoring Foundation
  createHealthGoal(data: any): Promise<any>;
  getHealthGoals(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthResult(data: any): Promise<any>;
  getHealthResults(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthMonitoring(data: any): Promise<any>;
  getHealthMonitorings(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthEvidence(data: any): Promise<any>;
  getHealthEvidences(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthIssue(data: any): Promise<any>;
  getHealthIssues(organizationId: string, workspaceId: string): Promise<any[]>;
  createHealthSnapshot(data: any): Promise<any>;
  getHealthSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 21.0 - Government Education Intelligence Foundation
  createEducationUnit(data: any): Promise<any>;
  getEducationUnits(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationTeam(data: any): Promise<any>;
  getEducationTeams(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationProgram(data: any): Promise<any>;
  getEducationPrograms(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationIndicator(data: any): Promise<any>;
  getEducationIndicators(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationCoverage(data: any): Promise<any>;
  getEducationCoverages(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationProduction(data: any): Promise<any>;
  getEducationProductions(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 21.1 - Government Education Monitoring Foundation
  createEducationGoal(data: any): Promise<any>;
  getEducationGoals(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationResult(data: any): Promise<any>;
  getEducationResults(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationMonitoring(data: any): Promise<any>;
  getEducationMonitorings(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationEvidence(data: any): Promise<any>;
  getEducationEvidences(organizationId: string, workspaceId: string): Promise<any[]>;
  createEducationIssue(data: any): Promise<any>;
  getEducationIssues(organizationId: string, workspaceId: string): Promise<any[]>;
  // ... existing education monitoring methods ...
  createEducationSnapshot(data: any): Promise<any>;
  getEducationSnapshots(organizationId: string, workspaceId: string): Promise<any[]>;

  // Sprint 19.3 - Government Funding Opportunity Methods
  getFundingOpportunities(organizationId: string, workspaceId: string): Promise<any[]>;
  createFundingOpportunity(data: any): Promise<any>;
  updateFundingOpportunity(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  getFundingPrograms(organizationId: string, workspaceId: string): Promise<any[]>;
  createFundingProgram(data: any): Promise<any>;

  getFundingNotices(organizationId: string, workspaceId: string): Promise<any[]>;
  createFundingNotice(data: any): Promise<any>;

  getFundingRequirements(organizationId: string, workspaceId: string): Promise<any[]>;
  createFundingRequirement(data: any): Promise<any>;

  getFundingProposals(organizationId: string, workspaceId: string): Promise<any[]>;
  createFundingProposal(data: any): Promise<any>;
  updateFundingProposal(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  getFundingSubmissions(organizationId: string, workspaceId: string): Promise<any[]>;
  createFundingSubmission(data: any): Promise<any>;

  // --- SPRINT 19.4: GOVERNMENT AMENDMENT STRATEGIC PLANNING & PORTFOLIO FOUNDATION ---
  getAmendmentPortfolios(organizationId: string, workspaceId: string): Promise<any[]>;
  createAmendmentPortfolio(data: any): Promise<any>;
  updateAmendmentPortfolio(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  getAmendmentPortfolioItems(organizationId: string, workspaceId: string): Promise<any[]>;
  createAmendmentPortfolioItem(data: any): Promise<any>;
  updateAmendmentPortfolioItem(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  getAmendmentPriorities(organizationId: string, workspaceId: string): Promise<any[]>;
  createAmendmentPriority(data: any): Promise<any>;
  updateAmendmentPriority(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  getAmendmentObjectives(organizationId: string, workspaceId: string): Promise<any[]>;
  createAmendmentObjective(data: any): Promise<any>;
  updateAmendmentObjective(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  getAmendmentActionPlans(organizationId: string, workspaceId: string): Promise<any[]>;
  createAmendmentActionPlan(data: any): Promise<any>;
  updateAmendmentActionPlan(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  getAmendmentFollowUps(organizationId: string, workspaceId: string): Promise<any[]>;
  createAmendmentFollowUp(data: any): Promise<any>;
  updateAmendmentFollowUp(id: string, organizationId: string, workspaceId: string, data: any): Promise<any>;

  // --- SPRINT 22.0: PORTAL DA TRANSPARENCIA INTELIGENTE FOUNDATION ---
  getTransparencyPublications(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyPublication(data: any): Promise<any>;

  getTransparencyCategories(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyCategory(data: any): Promise<any>;

  getTransparencyDatasets(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyDataset(data: any): Promise<any>;

  getTransparencyIndicators(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyIndicator(data: any): Promise<any>;

  getTransparencyDocuments(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyDocument(data: any): Promise<any>;

  getTransparencyReports(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyReport(data: any): Promise<any>;

  // --- SPRINT 22.1: GOVERNMENT OMBUDSMAN FOUNDATION ---
  getOmbudsmanRequests(organizationId: string, workspaceId: string): Promise<any[]>;
  createOmbudsmanRequest(data: any): Promise<any>;

  getOmbudsmanCategories(organizationId: string, workspaceId: string): Promise<any[]>;
  createOmbudsmanCategory(data: any): Promise<any>;

  getOmbudsmanProtocols(organizationId: string, workspaceId: string): Promise<any[]>;
  createOmbudsmanProtocol(data: any): Promise<any>;

  getOmbudsmanResponses(organizationId: string, workspaceId: string): Promise<any[]>;
  createOmbudsmanResponse(data: any): Promise<any>;

  getOmbudsmanAttachments(organizationId: string, workspaceId: string): Promise<any[]>;
  createOmbudsmanAttachment(data: any): Promise<any>;

  // --- SPRINT 22.2: TRANSPARENCY ANALYTICS ---
  getTransparencyMetrics(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyMetric(data: any): Promise<any>;

  getTransparencyKPIs(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyKPI(data: any): Promise<any>;

  getTransparencyCompliances(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyCompliance(data: any): Promise<any>;

  getTransparencyAudits(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyAudit(data: any): Promise<any>;

  getTransparencyMonitorings(organizationId: string, workspaceId: string): Promise<any[]>;
  createTransparencyMonitoring(data: any): Promise<any>;

  // --- SPRINT 22.3: PUBLIC TRANSPARENCY PORTAL CONSOLIDATION ---
  getPublicPortals(organizationId: string, workspaceId: string): Promise<any[]>;
  createPublicPortal(data: any): Promise<any>;

  getPublicCatalogs(organizationId: string, workspaceId: string): Promise<any[]>;
  createPublicCatalog(data: any): Promise<any>;

  getPublicDatasets(organizationId: string, workspaceId: string): Promise<any[]>;
  createPublicDataset(data: any): Promise<any>;

  getPublicPublications(organizationId: string, workspaceId: string): Promise<any[]>;
  createPublicPublication(data: any): Promise<any>;

  getPublicQueries(organizationId: string, workspaceId: string): Promise<any[]>;
  createPublicQuery(data: any): Promise<any>;

  getPublicAccessLogs(organizationId: string, workspaceId: string): Promise<any[]>;
  createPublicAccessLog(data: any): Promise<any>;

  // --- SPRINT 23.0: PREFEITURA ZERO PAPEL ---
  getProtocols(organizationId: string, workspaceId: string): Promise<any[]>;
  createProtocol(data: any): Promise<any>;

  getProcesses(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcess(data: any): Promise<any>;

  getDocumentRecords(organizationId: string, workspaceId: string): Promise<any[]>;
  createDocumentRecord(data: any): Promise<any>;

  getDispatches(organizationId: string, workspaceId: string): Promise<any[]>;
  createDispatch(data: any): Promise<any>;

  getRoutings(organizationId: string, workspaceId: string): Promise<any[]>;
  createRouting(data: any): Promise<any>;

  getProcessSteps(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcessStep(data: any): Promise<any>;

  getProcessHistories(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcessHistory(data: any): Promise<any>;

  // --- SPRINT 23.1: PROTOCOL & PROCESS MANAGEMENT FOUNDATION ---
  getDepartments(organizationId: string, workspaceId: string): Promise<any[]>;
  createDepartment(data: any): Promise<any>;

  getProtocolQueues(organizationId: string, workspaceId: string): Promise<any[]>;
  createProtocolQueue(data: any): Promise<any>;

  getProcessAssignments(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcessAssignment(data: any): Promise<any>;

  getProcessMovements(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcessMovement(data: any): Promise<any>;

  getProcessResponsibles(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcessResponsible(data: any): Promise<any>;

  getProcessSectors(organizationId: string, workspaceId: string): Promise<any[]>;
  createProcessSector(data: any): Promise<any>;

  // --- SPRINT 23.2: WORKFLOW & ROUTING FOUNDATION ---
  getWorkflows(organizationId: string, workspaceId: string): Promise<any[]>;
  createWorkflow(data: any): Promise<any>;

  getWorkflowStages(organizationId: string, workspaceId: string): Promise<any[]>;
  createWorkflowStage(data: any): Promise<any>;

  getWorkflowTransitions(organizationId: string, workspaceId: string): Promise<any[]>;
  createWorkflowTransition(data: any): Promise<any>;

  getWorkflowQueues(organizationId: string, workspaceId: string): Promise<any[]>;
  createWorkflowQueue(data: any): Promise<any>;

  getWorkflowExecutions(organizationId: string, workspaceId: string): Promise<any[]>;
  createWorkflowExecution(data: any): Promise<any>;

  getWorkflowRoutes(organizationId: string, workspaceId: string): Promise<any[]>;
  createWorkflowRoute(data: any): Promise<any>;

  // --- SPRINT 23.3: DOCUMENT LIFECYCLE FOUNDATION ---
  getDocumentVersions(organizationId: string, workspaceId: string): Promise<any[]>;
  createDocumentVersion(data: any): Promise<any>;

  getDocumentClassifications(organizationId: string, workspaceId: string): Promise<any[]>;
  createDocumentClassification(data: any): Promise<any>;

  getDocumentRetentions(organizationId: string, workspaceId: string): Promise<any[]>;
  createDocumentRetention(data: any): Promise<any>;

  getDocumentArchives(organizationId: string, workspaceId: string): Promise<any[]>;
  createDocumentArchive(data: any): Promise<any>;

  getDocumentMovements(organizationId: string, workspaceId: string): Promise<any[]>;
  createDocumentMovement(data: any): Promise<any>;

  getDocumentAudits(organizationId: string, workspaceId: string): Promise<any[]>;
  createDocumentAudit(data: any): Promise<any>;

  // --- SPRINT 23.4: ADMINISTRATIVE GOVERNANCE FOUNDATION ---
  getAdministrativeIndicators(organizationId: string, workspaceId: string): Promise<any[]>;
  createAdministrativeIndicator(data: any): Promise<any>;

  getAdministrativeAudits(organizationId: string, workspaceId: string): Promise<any[]>;
  createAdministrativeAudit(data: any): Promise<any>;

  getAdministrativeCompliances(organizationId: string, workspaceId: string): Promise<any[]>;
  createAdministrativeCompliance(data: any): Promise<any>;

  getAdministrativeResponsibilities(organizationId: string, workspaceId: string): Promise<any[]>;
  createAdministrativeResponsibility(data: any): Promise<any>;

  getAdministrativeMonitorings(organizationId: string, workspaceId: string): Promise<any[]>;
  createAdministrativeMonitoring(data: any): Promise<any>;

  getAdministrativeOccurrences(organizationId: string, workspaceId: string): Promise<any[]>;
  createAdministrativeOccurrence(data: any): Promise<any>;
}
