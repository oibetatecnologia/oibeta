import fs from "fs";
import path from "path";
import { DatabaseAdapter } from "./DatabaseAdapter";
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
  UserActivityLog,
} from "../beta/core/types";

const DB_FILE = path.join(process.cwd(), "db.json");

const DEMO_PROJECT_NAMES = new Set([
  "Beta Core",
  "Beta Gov",
  "Sistema Eleitoral",
  "Beta Licita",
  "Fábrica de Software",
]);

const DEMO_PROJECT_NAME_REGEX = /^(projeto test|teste 0|teste 02|test project|demo project)/i;

function isDemoProjectRecord(record: any): boolean {
  const name = String(record?.name || record?.projectName || record?.title || "").trim();
  return DEMO_PROJECT_NAMES.has(name) || DEMO_PROJECT_NAME_REGEX.test(name);
}

function sanitizeOperationalDemoData(db: any): boolean {
  if (!db || typeof db !== "object") return false;

  const projects = Array.isArray(db.projects) ? db.projects : [];
  const demoProjectIds = new Set(
    projects.filter(isDemoProjectRecord).map((project: any) => project.id).filter(Boolean),
  );

  const beforeProjects = projects.length;
  db.projects = projects.filter((project: any) => !demoProjectIds.has(project.id));

  const linkedCollections = [
    "projectStates",
    "decisions",
    "tasks",
    "memories",
    "objectives",
    "projectContinuitySnapshots",
    "workspaceSnapshots",
  ];

  for (const collectionName of linkedCollections) {
    if (!Array.isArray(db[collectionName])) continue;
    db[collectionName] = db[collectionName].filter((record: any) => {
      if (record?.projectId && demoProjectIds.has(record.projectId)) return false;
      if (isDemoProjectRecord(record)) return false;
      return true;
    });
  }

  if (Array.isArray(db.workspaceStates)) {
    db.workspaceStates = db.workspaceStates.map((state: any) => {
      if (state?.activeProjectId && demoProjectIds.has(state.activeProjectId)) {
        return { ...state, activeProjectId: "" };
      }
      return state;
    });
  }

  return beforeProjects !== db.projects.length;
}

interface DBStructure {
  projects: any[];
  projectStates: any[];
  decisions: any[];
  tasks: any[];
  memories: any[];
  chatHistory: any[];
  actionHistory?: any[];
  actionExecutionLogs?: any[];
  objectives?: any[];
  workspaceStates?: any[];
  knowledgeNodes?: any[];
  knowledgeRelations?: any[];
  projectContinuitySnapshots?: any[];
  aiConnections?: any[];
  specializations?: any[];
  projectSpecializations?: any[];
  documents?: any[];
  documentChunks?: any[];
  documentOutputs?: any[];
  documentJobs?: any[];
  documentAuditLogs?: any[];
  workspaceSnapshots?: any[];
  governmentSnapshots?: any[];
  procurementSnapshots?: any[];
  electoralCampaigns?: any[];
  electoralTerritories?: any[];
  electoralCoordinators?: any[];
  electoralCampaignInvites?: any[];
  electoralAnalyses?: any[];
  electoralCampaignObjectives?: any[];
  electoralCampaignTasks?: any[];
  electoralInviteAuditLogs?: any[];
  electoralOpponents?: any[];
  electoralPoliticalGroups?: any[];
  electoralLeaderships?: any[];
  electoralRelationships?: any[];
  electoralHistoricalResults?: any[];
  electoralImportJobs?: any[];
  electoralImportRowErrors?: any[];
  electoralImportValidationSummary?: any[];
  electoralOperationalCampaigns?: any[];
  campaignMembers?: any[];
  campaignGoals?: any[];
  campaignActions?: any[];
  campaignEvidences?: any[];
  campaignTerritories?: any[];
  campaignCoordinators?: any[];
  campaignCoordinatorAssignments?: any[];
  campaignTerritoryCoverage?: any[];
  campaignTerritoryConflicts?: any[];
  campaignCoordinatorHealth?: any[];
  campaignContacts?: CampaignContact[];
  campaignContactRelationships?: CampaignContactRelationship[];
  campaignContactTags?: CampaignContactTag[];
  campaignContactSegments?: CampaignContactSegment[];
  campaignContactEngagement?: CampaignContactEngagement[];
  campaignEvents?: CampaignEvent[];
  campaignEventParticipants?: CampaignEventParticipant[];
  campaignEventTerritories?: CampaignEventTerritory[];
  campaignEventEvidences?: CampaignEventEvidence[];
  campaignEventAttendance?: CampaignEventAttendance[];
  communicationThreads?: CommunicationThread[];
  communicationMessages?: CommunicationMessage[];
  communicationParticipants?: CommunicationParticipant[];
  communicationRequests?: CommunicationRequest[];
  communicationDispatches?: CommunicationDispatch[];
  communicationLogs?: CommunicationLog[];
  userPresence?: UserPresence[];
  userSessions?: UserSession[];
  userActivityLog?: UserActivityLog[];
  ai_provider_registry?: any[];
  ai_router_policies?: any[];
  ai_router_requests?: any[];
  ai_router_audits?: any[];
  beta_action_requests?: any[];
  beta_action_dispatches?: any[];
  beta_action_logs?: any[];
  beta_skills?: any[];
  beta_capabilities?: any[];
  beta_skill_registry?: any[];
  beta_operational_intents?: any[];
  beta_operational_dispatches?: any[];
  beta_operational_results?: any[];
  government_workspaces?: any[];
  government_workspace_snapshots?: any[];
  government_workspace_logs?: any[];
  government_objectives?: any[];
  government_programs?: any[];
  government_projects?: any[];
  government_actions?: any[];
  government_indicators?: any[];
  government_goals?: any[];
  government_results?: any[];
  government_performance_snapshots?: any[];
  government_reports?: any[];
  government_executive_briefs?: any[];
  government_monitoring_snapshots?: any[];
  government_report_logs?: any[];
  government_governance_reviews?: any[];
  government_executive_meetings?: any[];
  government_strategic_cycles?: any[];
  government_decisions?: any[];
  government_monitoring_reviews?: any[];
  procurement_workspaces?: any[];
  procurement_workspace_snapshots?: any[];
  procurement_workspace_logs?: any[];
  commercial_opportunities?: any[];
  commercial_radar_sync_runs?: any[];
  commercial_tasks?: any[];
  crm_gov_clients?: any[];
  procurement_opportunities?: any[];
  procurement_bids?: any[];
  procurement_participations?: any[];
  procurement_lots?: any[];
  procurement_proposals?: any[];
  procurement_suppliers?: any[];
  procurement_supplier_documents?: any[];
  procurement_supplier_certificates?: any[];
  procurement_supplier_qualifications?: any[];
  procurement_supplier_registries?: any[];
  procurement_contracts?: any[];
  procurement_contract_executions?: any[];
  procurement_inspections?: any[];
  procurement_deliveries?: any[];
  procurement_measurements?: any[];
  procurement_contract_issues?: any[];
  procurement_arps?: any[];
  procurement_arp_items?: any[];
  procurement_arp_consumptions?: any[];
  procurement_arp_participants?: any[];
  procurement_arp_caronas?: any[];
  procurement_audit_events?: any[];
  procurement_compliance_events?: any[];
  procurement_reports?: any[];
  procurement_executive_briefs?: any[];
  procurement_monitoring_snapshots?: any[];
  procurement_report_logs?: any[];
  government_parliamentarians?: any[];
  government_amendments?: any[];
  government_amendment_beneficiaries?: any[];
  government_amendment_destinations?: any[];
  government_amendment_executions?: any[];
  government_amendment_milestones?: any[];
  government_amendment_monitorings?: any[];
  government_amendment_evidences?: any[];
  government_amendment_accountabilities?: any[];
  government_amendment_issues?: any[];
  government_amendment_reports?: any[];
  government_amendment_executive_briefs?: any[];
  government_amendment_snapshots?: any[];
  government_amendment_reviews?: any[];
  government_amendment_cycles?: any[];
  // SPRINT 20.0 - GOVERNMENT HEALTH INTELLIGENCE FOUNDATION
  government_health_units?: any[];
  government_health_teams?: any[];
  government_health_programs?: any[];
  government_health_indicators?: any[];
  government_health_coverages?: any[];
  government_health_productions?: any[];
  // SPRINT 20.1 - HEALTH PERFORMANCE & MONITORING FOUNDATION
  government_health_goals?: any[];
  government_health_results?: any[];
  government_health_monitorings?: any[];
  government_health_evidences?: any[];
  government_health_issues?: any[];
  government_health_snapshots?: any[];
  // SPRINT 21.0 - EDUCATION INTELLIGENCE FOUNDATION
  government_education_units?: any[];
  government_education_teams?: any[];
  government_education_programs?: any[];
  government_education_indicators?: any[];
  government_education_coverages?: any[];
  government_education_productions?: any[];
  // SPRINT 21.1 - EDUCATION PERFORMANCE & MONITORING FOUNDATION
  government_education_goals?: any[];
  government_education_results?: any[];
  government_education_monitorings?: any[];
  government_education_evidences?: any[];
  government_education_issues?: any[];
  government_education_snapshots?: any[];

  // Sprint 19.3
  government_funding_opportunities?: any[];
  government_funding_programs?: any[];
  government_funding_notices?: any[];
  government_funding_requirements?: any[];
  government_funding_proposals?: any[];
  government_funding_submissions?: any[];

  // Sprint 19.4
  government_amendment_portfolios?: any[];
  government_amendment_portfolio_items?: any[];
  government_amendment_priorities?: any[];
  government_amendment_objectives?: any[];
  government_amendment_action_plans?: any[];
  government_amendment_followups?: any[];
  government_transparency_publications?: any[];
  government_transparency_categories?: any[];
  government_transparency_datasets?: any[];
  government_transparency_indicators?: any[];
  government_transparency_documents?: any[];
  government_transparency_reports?: any[];
  government_ombudsman_requests?: any[];
  government_ombudsman_categories?: any[];
  government_ombudsman_protocols?: any[];
  government_ombudsman_responses?: any[];
  government_ombudsman_attachments?: any[];
  government_transparency_metrics?: any[];
  government_transparency_kpis?: any[];
  government_transparency_compliance?: any[];
  government_transparency_audits?: any[];
  government_transparency_monitorings?: any[];
  government_public_portals?: any[];
  government_public_catalogs?: any[];
  government_public_datasets?: any[];
  government_public_publications?: any[];
  government_public_queries?: any[];
  government_public_access_logs?: any[];
  government_protocols?: any[];
  government_processes?: any[];
  government_document_records?: any[];
  government_dispatches?: any[];
  government_routings?: any[];
  government_process_steps?: any[];
  government_process_history?: any[];
  government_departments?: any[];
  government_protocol_queues?: any[];
  government_process_assignments?: any[];
  government_process_movements?: any[];
  government_process_responsibles?: any[];
  government_process_sectors?: any[];
  government_workflows?: any[];
  government_workflow_stages?: any[];
  government_workflow_transitions?: any[];
  government_workflow_queues?: any[];
  government_workflow_executions?: any[];
  government_workflow_routes?: any[];
  government_document_versions?: any[];
  government_document_classifications?: any[];
  government_document_retentions?: any[];
  government_document_archives?: any[];
  government_document_movements?: any[];
  government_document_audits?: any[];
  government_administrative_indicators?: any[];
  government_administrative_audits?: any[];
  government_administrative_compliances?: any[];
  government_administrative_responsibilities?: any[];
  government_administrative_monitorings?: any[];
  government_administrative_occurrences?: any[];
}


export class JsonDatabaseAdapter implements DatabaseAdapter {
  private readDB(): DBStructure {
    if (!fs.existsSync(DB_FILE)) {
      const initial: DBStructure = {
        projects: [],
        projectStates: [],
        decisions: [],
        tasks: [],
        memories: [],
        chatHistory: [],
        actionHistory: [],
        actionExecutionLogs: [],
        objectives: [],
        workspaceStates: [],
        knowledgeNodes: [],
        knowledgeRelations: [],
        projectContinuitySnapshots: [],
        aiConnections: [],
        specializations: [],
        projectSpecializations: [],
        documents: [],
        documentChunks: [],
        documentOutputs: [],
        documentJobs: [],
        documentAuditLogs: [],
        workspaceSnapshots: [],
        governmentSnapshots: [],
        procurementSnapshots: [],
        electoralCampaigns: [],
        electoralTerritories: [],
        electoralCoordinators: [],
        electoralCampaignInvites: [],
        electoralAnalyses: [],
        electoralCampaignObjectives: [],
        electoralCampaignTasks: [],
        electoralInviteAuditLogs: [],
        electoralOpponents: [],
        electoralPoliticalGroups: [],
        electoralLeaderships: [],
        electoralRelationships: [],
        electoralHistoricalResults: [],
        electoralOperationalCampaigns: [],
        campaignMembers: [],
        campaignGoals: [],
        campaignActions: [],
        campaignEvidences: [],
        campaignTerritories: [],
        campaignCoordinators: [],
        campaignCoordinatorAssignments: [],
        campaignTerritoryCoverage: [],
        campaignTerritoryConflicts: [],
        campaignCoordinatorHealth: [],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (!parsed.projectStates) parsed.projectStates = [];
      if (!parsed.projects) parsed.projects = [];
      if (!parsed.decisions) parsed.decisions = [];
      if (!parsed.tasks) parsed.tasks = [];
      if (!parsed.memories) parsed.memories = [];
      if (!parsed.chatHistory) parsed.chatHistory = [];
      if (!parsed.actionHistory) parsed.actionHistory = [];
      if (!parsed.actionExecutionLogs) parsed.actionExecutionLogs = [];
      if (!parsed.objectives) parsed.objectives = [];
      if (!parsed.workspaceStates) parsed.workspaceStates = [];
      if (!parsed.knowledgeNodes) parsed.knowledgeNodes = [];
      if (!parsed.knowledgeRelations) parsed.knowledgeRelations = [];
      if (!parsed.projectContinuitySnapshots)
        parsed.projectContinuitySnapshots = [];
      if (!parsed.aiConnections) parsed.aiConnections = [];
      if (!parsed.specializations) parsed.specializations = [];
      if (!parsed.projectSpecializations) parsed.projectSpecializations = [];
      if (!parsed.documents) parsed.documents = [];
      if (!parsed.documentChunks) parsed.documentChunks = [];
      if (!parsed.documentOutputs) parsed.documentOutputs = [];
      if (!parsed.documentJobs) parsed.documentJobs = [];
      if (!parsed.documentAuditLogs) parsed.documentAuditLogs = [];
      if (!parsed.workspaceSnapshots) parsed.workspaceSnapshots = [];
      if (!parsed.governmentSnapshots) parsed.governmentSnapshots = [];
      if (!parsed.procurementSnapshots) parsed.procurementSnapshots = [];
      if (!parsed.electoralCampaigns) parsed.electoralCampaigns = [];
      if (!parsed.electoralTerritories) parsed.electoralTerritories = [];
      if (!parsed.electoralCoordinators) parsed.electoralCoordinators = [];
      if (!parsed.electoralCampaignInvites)
        parsed.electoralCampaignInvites = [];
      if (!parsed.electoralAnalyses) parsed.electoralAnalyses = [];
      if (!parsed.electoralCampaignObjectives)
        parsed.electoralCampaignObjectives = [];
      if (!parsed.electoralCampaignTasks) parsed.electoralCampaignTasks = [];
      if (!parsed.electoralInviteAuditLogs)
        parsed.electoralInviteAuditLogs = [];
      if (!parsed.electoralOpponents) parsed.electoralOpponents = [];
      if (!parsed.electoralPoliticalGroups)
        parsed.electoralPoliticalGroups = [];
      if (!parsed.electoralLeaderships) parsed.electoralLeaderships = [];
      if (!parsed.electoralRelationships) parsed.electoralRelationships = [];
      if (!parsed.electoralHistoricalResults)
        parsed.electoralHistoricalResults = [];
      if (!parsed.electoralOperationalCampaigns)
        parsed.electoralOperationalCampaigns = [];
      if (!parsed.campaignMembers) parsed.campaignMembers = [];
      if (!parsed.campaignGoals) parsed.campaignGoals = [];
      if (!parsed.campaignActions) parsed.campaignActions = [];
      if (!parsed.campaignEvidences) parsed.campaignEvidences = [];
      if (!parsed.campaignTerritories) parsed.campaignTerritories = [];
      if (!parsed.campaignCoordinators) parsed.campaignCoordinators = [];
      if (!parsed.campaignCoordinatorAssignments)
        parsed.campaignCoordinatorAssignments = [];
      if (!parsed.campaignTerritoryCoverage)
        parsed.campaignTerritoryCoverage = [];
      if (!parsed.campaignTerritoryConflicts)
        parsed.campaignTerritoryConflicts = [];
      if (!parsed.campaignCoordinatorHealth)
        parsed.campaignCoordinatorHealth = [];
      if (!parsed.procurement_workspaces)
        parsed.procurement_workspaces = [];
      if (!parsed.procurement_workspace_snapshots)
        parsed.procurement_workspace_snapshots = [];
      if (!parsed.procurement_workspace_logs)
        parsed.procurement_workspace_logs = [];
      if (!parsed.commercial_opportunities)
        parsed.commercial_opportunities = [];
      if (!parsed.commercial_radar_sync_runs) parsed.commercial_radar_sync_runs = [];
      if (!parsed.commercial_tasks)
        parsed.commercial_tasks = [];
      if (!parsed.crm_gov_clients)
        parsed.crm_gov_clients = [];
      if (!parsed.procurement_opportunities)
        parsed.procurement_opportunities = [];
      if (!parsed.procurement_bids)
        parsed.procurement_bids = [];
      if (!parsed.procurement_participations)
        parsed.procurement_participations = [];
      if (!parsed.procurement_lots)
        parsed.procurement_lots = [];
      if (!parsed.procurement_proposals)
        parsed.procurement_proposals = [];
      if (!parsed.procurement_suppliers)
        parsed.procurement_suppliers = [];
      if (!parsed.procurement_supplier_documents)
        parsed.procurement_supplier_documents = [];
      if (!parsed.procurement_supplier_certificates)
        parsed.procurement_supplier_certificates = [];
      if (!parsed.procurement_supplier_qualifications)
        parsed.procurement_supplier_qualifications = [];
      if (!parsed.procurement_supplier_registries)
        parsed.procurement_supplier_registries = [];
      if (!parsed.procurement_contracts)
        parsed.procurement_contracts = [];
      if (!parsed.procurement_contract_executions)
        parsed.procurement_contract_executions = [];
      if (!parsed.procurement_inspections)
        parsed.procurement_inspections = [];
      if (!parsed.procurement_deliveries)
        parsed.procurement_deliveries = [];
      if (!parsed.procurement_measurements)
        parsed.procurement_measurements = [];
      if (!parsed.procurement_contract_issues)
        parsed.procurement_contract_issues = [];
      if (!parsed.procurement_arps)
        parsed.procurement_arps = [];
      if (!parsed.procurement_arp_items)
        parsed.procurement_arp_items = [];
      if (!parsed.procurement_arp_consumptions)
        parsed.procurement_arp_consumptions = [];
      if (!parsed.procurement_arp_participants)
        parsed.procurement_arp_participants = [];
      if (!parsed.procurement_arp_caronas)
        parsed.procurement_arp_caronas = [];
      if (!parsed.procurement_audit_events)
        parsed.procurement_audit_events = [];
      if (!parsed.procurement_compliance_events)
        parsed.procurement_compliance_events = [];
      if (!parsed.government_parliamentarians)
        parsed.government_parliamentarians = [];
      if (!parsed.government_amendments)
        parsed.government_amendments = [];
      if (!parsed.government_amendment_beneficiaries)
        parsed.government_amendment_beneficiaries = [];
      if (!parsed.government_amendment_destinations)
        parsed.government_amendment_destinations = [];
      if (!parsed.government_amendment_executions)
        parsed.government_amendment_executions = [];
      if (!parsed.government_amendment_milestones)
        parsed.government_amendment_milestones = [];
      if (!parsed.government_amendment_monitorings)
        parsed.government_amendment_monitorings = [];
      if (!parsed.government_amendment_evidences)
        parsed.government_amendment_evidences = [];
      if (!parsed.government_amendment_accountabilities)
        parsed.government_amendment_accountabilities = [];
      if (!parsed.government_amendment_issues)
        parsed.government_amendment_issues = [];
      if (!parsed.government_amendment_reports)
        parsed.government_amendment_reports = [];
      if (!parsed.government_amendment_executive_briefs)
        parsed.government_amendment_executive_briefs = [];
      if (!parsed.government_amendment_snapshots)
        parsed.government_amendment_snapshots = [];
      if (!parsed.government_amendment_reviews)
        parsed.government_amendment_reviews = [];
      if (!parsed.government_amendment_cycles)
        parsed.government_amendment_cycles = [];
      const sanitized = sanitizeOperationalDemoData(parsed);
      if (sanitized) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
      }
      return parsed;
    } catch (e) {
      console.error(
        "Error reading JSON database, returning empty architecture:",
        e,
      );
      return {
        projects: [],
        projectStates: [],
        decisions: [],
        tasks: [],
        memories: [],
        chatHistory: [],
      };
    }
  }

  private writeDB(data: DBStructure): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing JSON database:", e);
    }
  }

  async getCrmGovClients(organizationId: string, workspaceId?: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.crm_gov_clients) db.crm_gov_clients = [];

    return db.crm_gov_clients
      .filter((client: any) => {
        const sameOrganization = client.organizationId === organizationId || client.organization_id === organizationId;
        const sameWorkspace = !workspaceId || client.workspaceId === workspaceId || client.workspace_id === workspaceId;
        return sameOrganization && sameWorkspace;
      })
      .sort((a: any, b: any) => String(b.updatedAt || b.updated_at || '').localeCompare(String(a.updatedAt || a.updated_at || '')));
  }

  async replaceCrmGovClients(organizationId: string, workspaceId: string, data: any[]): Promise<any[]> {
    const db = this.readDB();
    if (!db.crm_gov_clients) db.crm_gov_clients = [];

    const now = new Date().toISOString();
    const nextClients = data.map((client: any) => ({
      ...client,
      id: client.id || crypto.randomUUID(),
      organizationId,
      workspaceId,
      createdAt: client.createdAt || client.created_at || now,
      updatedAt: client.updatedAt || client.updated_at || now,
    }));

    db.crm_gov_clients = db.crm_gov_clients.filter((client: any) => {
      const sameOrganization = client.organizationId === organizationId || client.organization_id === organizationId;
      const sameWorkspace = client.workspaceId === workspaceId || client.workspace_id === workspaceId;
      return !(sameOrganization && sameWorkspace);
    });

    db.crm_gov_clients.unshift(...nextClients);
    this.writeDB(db);
    return nextClients;
  }

  async getProjects(userId: string, organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    // Filter projects by organization and workspace
    return db.projects.filter((p) => {
      const matchOrg = p.organizationId === organizationId;
      if (!matchOrg) return false;
      return p.workspaceId === workspaceId || p.workspace_id === workspaceId;
    });
  }

  async getProjectById(
    projectId: string,
    userId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<any> {
    const db = this.readDB();
    return (
      db.projects.find(
        (p) => {
          const match = p.id === projectId && p.organizationId === organizationId;
          if (!match) return false;
          return p.workspaceId === workspaceId || p.workspace_id === workspaceId;
        },
      ) || null
    );
  }

  async createProject(data: any): Promise<any> {
    const db = this.readDB();
    const project = {
      id: data.id || "proj_" + Math.random().toString(36).substr(2, 9),
      name: data.name,
      description: data.description || "",
      status: data.status || "active",
      lastStopPoint: data.lastStopPoint || "",
      userId: data.userId || "dev-user-douglas",
      organizationId: data.organizationId || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id || "default-workspace",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.projects.push(project);
    this.writeDB(db);
    return project;
  }

  async updateProject(id: string, data: any): Promise<any> {
    const db = this.readDB();
    const idx = db.projects.findIndex((p) => p.id === id);
    if (idx > -1) {
      db.projects[idx] = {
        ...db.projects[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.projects[idx];
    }
    return null;
  }

  async deleteProject(id: string): Promise<any> {
    const db = this.readDB();
    db.projects = db.projects.filter((p) => p.id !== id);
    db.decisions = db.decisions.filter((d) => d.projectId !== id);
    db.tasks = db.tasks.filter((t) => t.projectId !== id);
    db.memories = db.memories.filter((m) => m.projectId !== id);
    db.projectStates = db.projectStates.filter((s) => s.projectId !== id);
    db.chatHistory = db.chatHistory.filter((msg) => msg.projectId !== id);
    this.writeDB(db);
    return { success: true };
  }

  async getTasks(projectId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    return db.tasks.filter((t) => {
      const matchProj = t.projectId === projectId;
      if (!matchProj) return false;
      return t.workspaceId === workspaceId || t.workspace_id === workspaceId;
    });
  }

  async createTask(data: any): Promise<any> {
    const db = this.readDB();
    const task = {
      id: data.id || "task_" + Math.random().toString(36).substr(2, 9),
      projectId: data.projectId,
      title: data.title,
      description: data.description || "",
      status: data.status || "pending",
      priority: data.priority || "média",
      dueDate: data.dueDate || null,
      userId: data.userId || "dev-user-douglas",
      organizationId: data.organizationId || "org-oi-beta",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.tasks.push(task);
    this.writeDB(db);
    return task;
  }

  async updateTask(id: string, data: any): Promise<any> {
    const db = this.readDB();
    const idx = db.tasks.findIndex((t) => t.id === id);
    if (idx > -1) {
      db.tasks[idx] = {
        ...db.tasks[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.tasks[idx];
    }
    return null;
  }

  async deleteTask(id: string): Promise<any> {
    const db = this.readDB();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    this.writeDB(db);
    return { success: true };
  }

  async getDecisions(projectId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    return db.decisions.filter((d) => {
      const matchProj = d.projectId === projectId;
      if (!matchProj) return false;
      return d.workspaceId === workspaceId || d.workspace_id === workspaceId;
    });
  }

  async createDecision(data: any): Promise<any> {
    const db = this.readDB();
    const dec = {
      id: data.id || "dec_" + Math.random().toString(36).substr(2, 9),
      projectId: data.projectId,
      title: data.title,
      description: data.description || "",
      content: data.content || "",
      reason: data.reason || "",
      impact: data.impact || "médio",
      importance: data.importance || "média",
      userId: data.userId || "dev-user-douglas",
      organizationId: data.organizationId || "org-oi-beta",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.decisions.push(dec);
    this.writeDB(db);
    return dec;
  }

  async updateDecision(id: string, data: any): Promise<any> {
    const db = this.readDB();
    const idx = db.decisions.findIndex((d) => d.id === id);
    if (idx > -1) {
      db.decisions[idx] = {
        ...db.decisions[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.decisions[idx];
    }
    return null;
  }

  async deleteDecision(id: string): Promise<any> {
    const db = this.readDB();
    db.decisions = db.decisions.filter((d) => d.id !== id);
    this.writeDB(db);
    return { success: true };
  }

  async getMemories(projectId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    return db.memories.filter(
      (m) => {
        const matchProj = m.projectId === projectId || (!projectId && !m.projectId);
        if (!matchProj) return false;
        return m.workspaceId === workspaceId || m.workspace_id === workspaceId;
      },
    );
  }

  async createMemory(data: any): Promise<any> {
    const db = this.readDB();
    const memory = {
      id: data.id || "mem_" + Math.random().toString(36).substr(2, 9),
      projectId: data.projectId || null,
      content: data.content,
      type: data.type || "contexto",
      importance: data.importance || "média",
      tags: data.tags || [],
      source: data.source || "",
      userId: data.userId || "dev-user-douglas",
      organizationId: data.organizationId || "org-oi-beta",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.memories.push(memory);
    this.writeDB(db);
    return memory;
  }

  async updateMemory(id: string, data: any): Promise<any> {
    const db = this.readDB();
    const idx = db.memories.findIndex((m) => m.id === id);
    if (idx > -1) {
      db.memories[idx] = {
        ...db.memories[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.memories[idx];
    }
    return null;
  }

  async deleteMemory(id: string): Promise<any> {
    const db = this.readDB();
    db.memories = db.memories.filter((m) => m.id !== id);
    this.writeDB(db);
    return { success: true };
  }

  async getMessages(projectId: string | undefined, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const history = db.chatHistory || [];
    return history.filter((msg) => {
      if (projectId && msg.projectId !== projectId) return false;
      return msg.workspaceId === workspaceId || msg.workspace_id === workspaceId;
    });
  }

  async createMessage(data: any): Promise<any> {
    const db = this.readDB();
    const msg = {
      id: data.id || "msg_" + Math.random().toString(36).substr(2, 9),
      projectId: data.projectId || null,
      userId: data.userId || "dev-user-douglas",
      organizationId: data.organizationId || "org-oi-beta",
      sender: data.sender || "user",
      content: data.content,
      suggestions: data.suggestions || undefined,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    db.chatHistory.push(msg);
    this.writeDB(db);
    return msg;
  }

  async getProjectContext(projectId: string, workspaceId: string): Promise<any> {
    const db = this.readDB();
    return db.projectStates.find((s) => s.projectId === projectId) || null;
  }

  async saveProjectContext(projectId: string, context: any): Promise<any> {
    const db = this.readDB();
    const newState = {
      projectId: context.projectId,
      projectName: context.projectName,
      currentObjective: context.currentObjective || "",
      currentStage: context.currentStage || "",
      lastStopPoint: context.lastStopPoint || "",
      recentDecisions: context.recentDecisions || [],
      pendingTasks: context.pendingTasks || [],
      executiveSummary: context.executiveSummary || "",
      nextRecommendedAction: context.nextRecommendedAction || "",
      importantMemories: context.importantMemories || [],
      risks: context.risks || [],
      confidenceScore: context.confidenceScore ?? 85,
      lastUpdatedDate: context.lastUpdatedDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const idx = db.projectStates.findIndex((s) => s.projectId === projectId);
    if (idx > -1) {
      db.projectStates[idx] = { ...db.projectStates[idx], ...newState };
    } else {
      db.projectStates.push(newState);
    }
    this.writeDB(db);
    return newState;
  }

  async getActionLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const history = db.actionHistory || [];
    let query = history.filter((h: any) => h.organizationId === organizationId);
    if (workspaceId) {
      query = query.filter((h: any) => h.workspaceId === workspaceId);
    }
    return query;
  }

  async createActionLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.actionHistory) db.actionHistory = [];
    const log = {
      id: data.id || "act_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId || "org-oi-beta",
      workspaceId: data.workspaceId || null,
      entityType: data.entityType || "UNKNOWN",
      entityId: data.entityId || "UNKNOWN",
      actionType: data.actionType,
      actorId: data.actorId || data.userId || "system",
      metadataJson: data.metadataJson || data.actionDescription ? { description: data.actionDescription } : {},
      createdAt: data.createdAt || new Date().toISOString(),
    };
    db.actionHistory.push(log);
    this.writeDB(db);
    return log;
  }

  async getActionExecutionLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const logs = db.actionExecutionLogs || [];
    let query = logs.filter((l: any) => l.organizationId === organizationId);
    if (workspaceId) {
      query = query.filter((l: any) => l.workspaceId === workspaceId);
    }
    return query;
  }

  async createActionExecutionLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.actionExecutionLogs) db.actionExecutionLogs = [];
    const log = {
      id: data.id || "ael_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId || "org-oi-beta",
      workspaceId: data.workspaceId || null,
      executionType: data.executionType || data.intentType || "UNKNOWN",
      executionStatus: data.executionStatus || (data.errorReturned ? "ERROR" : "SUCCESS"),
      executionResult: data.executionResult || data.errorReturned || (data.executed ? "EXECUTED" : "PENDING"),
      metadataJson: data.metadataJson || { confidence: data.confidence, executionTime: data.executionTime },
      createdAt: data.createdAt || new Date().toISOString(),
    };
    db.actionExecutionLogs.push(log);
    this.writeDB(db);
    return log;
  }

  async getObjectives(projectId: string): Promise<any[]> {
    const db = this.readDB();
    return (db.objectives || []).filter((o) => o.projectId === projectId);
  }

  async createObjective(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.objectives) db.objectives = [];
    const obj = {
      id: data.id || "obj_" + Math.random().toString(36).substr(2, 9),
      projectId: data.projectId,
      title: data.title,
      description: data.description || "",
      status: data.status || "pending",
      taskId: data.taskId || null,
      userId: data.userId || "dev-user-douglas",
      organizationId: data.organizationId || "org-oi-beta",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.objectives.push(obj);
    this.writeDB(db);
    return obj;
  }

  async updateObjective(id: string, data: any): Promise<any> {
    const db = this.readDB();
    const idx = (db.objectives || []).findIndex((o) => o.id === id);
    if (idx > -1) {
      db.objectives![idx] = {
        ...db.objectives![idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.objectives![idx];
    }
    return null;
  }

  async deleteObjective(id: string): Promise<any> {
    const db = this.readDB();
    db.objectives = (db.objectives || []).filter((o) => o.id !== id);
    this.writeDB(db);
    return { success: true };
  }

  async getWorkspaceState(
    userId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<any> {
    const db = this.readDB();
    const state = (db.workspaceStates || []).find(
      (s) =>
        s.userId === userId &&
        s.organizationId === organizationId &&
        s.workspaceId === workspaceId,
    );
    return state || null;
  }

  async saveWorkspaceState(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.workspaceStates) db.workspaceStates = [];
    const idx = db.workspaceStates.findIndex(
      (s) =>
        s.userId === data.userId &&
        s.organizationId === data.organizationId &&
        s.workspaceId === data.workspaceId,
    );

    const record = {
      id: data.id || "ws_" + Math.random().toString(36).substr(2, 9),
      userId: data.userId,
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      activeProjectId: data.activeProjectId || null,
      activeSpecialization: data.activeSpecialization || null,
      lastContext: data.lastContext || null,
      updatedAt: new Date().toISOString(),
    };

    if (idx > -1) {
      db.workspaceStates[idx] = {
        ...db.workspaceStates[idx],
        ...record,
      };
      this.writeDB(db);
      return db.workspaceStates[idx];
    } else {
      db.workspaceStates.push(record);
      this.writeDB(db);
      return record;
    }
  }

  // --- Sprint 7 Implementation ---
  async createKnowledgeNode(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.knowledgeNodes) db.knowledgeNodes = [];

    const node = {
      id: data.id || "node_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId || "org-oi-beta",
      projectId: data.projectId || null,
      workspaceId: data.workspaceId || data.workspace_id || data.projectId || "default-workspace",
      nodeType: data.nodeType,
      title: data.title,
      description: data.description || "",
      metadata: data.metadata || {},
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.knowledgeNodes.push(node);
    this.writeDB(db);
    return node;
  }

  async updateKnowledgeNode(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.knowledgeNodes) db.knowledgeNodes = [];
    const idx = db.knowledgeNodes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      db.knowledgeNodes[idx] = {
        ...db.knowledgeNodes[idx],
        title:
          data.title !== undefined ? data.title : db.knowledgeNodes[idx].title,
        description:
          data.description !== undefined
            ? data.description
            : db.knowledgeNodes[idx].description,
        metadata:
          data.metadata !== undefined
            ? { ...db.knowledgeNodes[idx].metadata, ...data.metadata }
            : db.knowledgeNodes[idx].metadata,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.knowledgeNodes[idx];
    }
    return null;
  }

  async deleteKnowledgeNode(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.knowledgeNodes) db.knowledgeNodes = [];
    db.knowledgeNodes = db.knowledgeNodes.filter((n) => n.id !== id);
    if (db.knowledgeRelations) {
      db.knowledgeRelations = db.knowledgeRelations.filter(
        (r) => r.sourceNodeId !== id && r.targetNodeId !== id,
      );
    }
    this.writeDB(db);
    return { success: true };
  }

  async deleteKnowledgeRelation(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.knowledgeRelations) db.knowledgeRelations = [];
    db.knowledgeRelations = db.knowledgeRelations.filter((r) => r.id !== id);
    this.writeDB(db);
    return { success: true };
  }

  async getKnowledgeNodes(
    organizationId: string,
    projectId: string | undefined,
    workspaceId: string,
  ): Promise<any[]> {
    const db = this.readDB();
    if (!db.knowledgeNodes) db.knowledgeNodes = [];
    return db.knowledgeNodes.filter((n) => {
      const orgMatch = n.organizationId === organizationId;
      const projMatch = projectId ? n.projectId === projectId : true;
      const wsMatch = n.workspaceId === workspaceId || n.workspace_id === workspaceId;
      return orgMatch && projMatch && wsMatch;
    });
  }

  async getKnowledgeNodeBySourceAndType(
    organizationId: string,
    sourceId: string,
    nodeType: string,
    workspaceId: string,
  ): Promise<any> {
    const db = this.readDB();
    if (!db.knowledgeNodes) db.knowledgeNodes = [];
    return (
      db.knowledgeNodes.find(
        (n) =>
          n.organizationId === organizationId &&
          n.nodeType === nodeType &&
          (n.workspaceId === workspaceId || n.workspace_id === workspaceId) &&
          ((n.metadata && n.metadata.sourceId === sourceId) ||
            n.id === sourceId),
      ) || null
    );
  }

  async createKnowledgeRelation(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.knowledgeRelations) db.knowledgeRelations = [];

    const relation = {
      id: data.id || "rel_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id || "default-workspace",
      sourceNodeId: data.sourceNodeId,
      targetNodeId: data.targetNodeId,
      relationType: data.relationType,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    // Evitar duplicidades exatas de relação no DB JSON
    const exists = db.knowledgeRelations.some(
      (r) =>
        r.sourceNodeId === data.sourceNodeId &&
        r.targetNodeId === data.targetNodeId &&
        r.relationType === data.relationType,
    );
    if (!exists) {
      db.knowledgeRelations.push(relation);
      this.writeDB(db);
    }
    return relation;
  }

  async getKnowledgeRelations(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.knowledgeRelations) db.knowledgeRelations = [];
    return db.knowledgeRelations.filter(
      (r) =>
        r.organizationId === organizationId &&
        (r.workspaceId === workspaceId || r.workspace_id === workspaceId),
    );
  }

  async getContinuitySnapshot(projectId: string, workspaceId: string): Promise<any> {
    const db = this.readDB();
    if (!db.projectContinuitySnapshots) db.projectContinuitySnapshots = [];
    return (
      db.projectContinuitySnapshots.find((s) => s.projectId === projectId) ||
      null
    );
  }

  async saveContinuitySnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.projectContinuitySnapshots) db.projectContinuitySnapshots = [];
    const idx = db.projectContinuitySnapshots.findIndex(
      (s) => s.projectId === data.projectId,
    );

    const record = {
      id: data.id || "snp_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      projectId: data.projectId,
      summary: data.summary || "",
      currentObjective: data.currentObjective || "",
      currentStage: data.currentStage || "",
      lastStopPoint: data.lastStopPoint || "",
      pendingItems: data.pendingItems || [],
      risks: data.risks || [],
      recommendedNextAction: data.recommendedNextAction || "",
      confidenceScore: data.confidenceScore || 1.0,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    if (idx > -1) {
      db.projectContinuitySnapshots[idx] = {
        ...db.projectContinuitySnapshots[idx],
        ...record,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.projectContinuitySnapshots[idx];
    } else {
      db.projectContinuitySnapshots.push(record);
      this.writeDB(db);
      return record;
    }
  }

  async getAIConnections(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.aiConnections) db.aiConnections = [];
    return db.aiConnections.filter(
      (c: any) =>
        c.organizationId === organizationId &&
        (c.workspaceId === workspaceId || c.workspace_id === workspaceId),
    );
  }

  async createAIConnection(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.aiConnections) db.aiConnections = [];

    if (data.isDefault) {
      db.aiConnections.forEach((c: any) => {
        if (c.organizationId === data.organizationId) {
          c.isDefault = false;
        }
      });
    }

    const record = {
      id: data.id || "con_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      userId: data.userId || null,
      provider: data.provider,
      connectionName: data.connectionName,
      apiKeyEncrypted: data.apiKeyEncrypted,
      baseUrl: data.baseUrl || null,
      model: data.model || null,
      status: data.status || "active",
      isDefault: !!data.isDefault,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.aiConnections.push(record);
    this.writeDB(db);
    return record;
  }

  async updateAIConnection(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.aiConnections) db.aiConnections = [];
    const idx = db.aiConnections.findIndex((c: any) => c.id === id);
    if (idx === -1) return null;

    const currentConnection = db.aiConnections[idx];

    if (!currentConnection) {
      return null;
    }

    if (data.isDefault) {
      db.aiConnections.forEach((c: any) => {
        if (c.organizationId === currentConnection.organizationId) {
          c.isDefault = false;
        }
      });
    }

    db.aiConnections[idx] = {
      ...currentConnection,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.writeDB(db);
    return db.aiConnections[idx];
  }

  async deleteAIConnection(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.aiConnections) db.aiConnections = [];
    db.aiConnections = db.aiConnections.filter((c: any) => c.id !== id);
    this.writeDB(db);
    return { success: true };
  }

  // --- Sprint 9 Specializations ---
  async getSpecializations(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.specializations) db.specializations = [];
    return db.specializations.filter(
      (s: any) =>
        s.organizationId === organizationId &&
        (s.workspaceId === workspaceId || s.workspace_id === workspaceId),
    );
  }

  async getProjectSpecialization(projectId: string, workspaceId: string): Promise<any> {
    const db = this.readDB();
    if (!db.projectSpecializations) db.projectSpecializations = [];
    return (
      db.projectSpecializations.find(
        (ps: any) =>
          ps.projectId === projectId &&
          (ps.workspaceId === workspaceId || ps.workspace_id === workspaceId),
      ) || null
    );
  }

  async setProjectSpecialization(
    projectId: string,
    specializationKey: string,
    organizationId: string,
  ): Promise<any> {
    const db = this.readDB();
    if (!db.projectSpecializations) db.projectSpecializations = [];
    const idx = db.projectSpecializations.findIndex(
      (ps: any) => ps.projectId === projectId,
    );

    const record = {
      id:
        idx > -1
          ? db.projectSpecializations[idx].id
          : "ps_" + Math.random().toString(36).substr(2, 9),
      organizationId,
      projectId,
      specializationKey,
      createdAt:
        idx > -1
          ? db.projectSpecializations[idx].createdAt
          : new Date().toISOString(),
    };

    if (idx > -1) {
      db.projectSpecializations[idx] = record;
    } else {
      db.projectSpecializations.push(record);
    }
    this.writeDB(db);
    return record;
  }

  // --- Sprint 10 Documents ---
  async getDocuments(projectId: string | undefined, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.documents) db.documents = [];
    return db.documents.filter((d: any) => {
      if (projectId && d.projectId !== projectId) return false;
      return d.workspaceId === workspaceId || d.workspace_id === workspaceId;
    });
  }

  async createDocument(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.documents) db.documents = [];
    const newDoc = {
      ...data,
      id: "doc_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.documents.push(newDoc);
    this.writeDB(db);
    return newDoc;
  }

  async getDocumentById(id: string, workspaceId: string): Promise<any> {
    const db = this.readDB();
    if (!db.documents) db.documents = [];
    return db.documents.find((d: any) => {
      const match = d.id === id;
      if (!match) return false;
      return d.workspaceId === workspaceId || d.workspace_id === workspaceId;
    }) || null;
  }

  async updateDocument(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.documents) db.documents = [];
    const idx = db.documents.findIndex((d: any) => d.id === id);
    if (idx > -1) {
      db.documents[idx] = {
        ...db.documents[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.documents[idx];
    }
    return null;
  }

  async getDocumentChunks(documentId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.documentChunks) db.documentChunks = [];
    return db.documentChunks.filter(
      (c: any) =>
        c.documentId === documentId &&
        (c.workspaceId === workspaceId || c.workspace_id === workspaceId),
    );
  }

  async createDocumentChunk(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.documentChunks) db.documentChunks = [];
    const newChunk = {
      ...data,
      id: "chk_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    db.documentChunks.push(newChunk);
    this.writeDB(db);
    return newChunk;
  }

  async getDocumentOutputs(documentId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.documentOutputs) db.documentOutputs = [];
    return db.documentOutputs.filter(
      (o: any) => o.sourceDocumentId === documentId,
    );
  }

  async createDocumentOutput(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.documentOutputs) db.documentOutputs = [];
    const newOutput = {
      ...data,
      id: "out_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    db.documentOutputs.push(newOutput);
    this.writeDB(db);
    return newOutput;
  }

  // --- Sprint 10.2 Document Jobs ---
  async getDocumentJobs(documentId?: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.documentJobs) db.documentJobs = [];
    if (documentId)
      return db.documentJobs.filter((j: any) => j.documentId === documentId);
    return db.documentJobs;
  }

  async getDocumentJobById(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.documentJobs) db.documentJobs = [];
    return db.documentJobs.find((j: any) => j.id === id) || null;
  }

  async createDocumentJob(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.documentJobs) db.documentJobs = [];
    const newJob = {
      ...data,
      id: "job_" + Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: data.status || "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.documentJobs.push(newJob);
    this.writeDB(db);
    return newJob;
  }

  async updateDocumentJob(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.documentJobs) db.documentJobs = [];
    const idx = db.documentJobs.findIndex((j: any) => j.id === id);
    if (idx > -1) {
      db.documentJobs[idx] = {
        ...db.documentJobs[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.documentJobs[idx];
    }
    return null;
  }

  async createDocumentAuditLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.documentAuditLogs) db.documentAuditLogs = [];
    const newLog = {
      ...data,
      id: "aud_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    db.documentAuditLogs.push(newLog);
    this.writeDB(db);
    return newLog;
  }

  async getDocumentStats(organizationId?: string): Promise<any> {
    const db = this.readDB();
    const docs = db.documents || [];
    const chunks = db.documentChunks || [];
    const outputs = db.documentOutputs || [];
    const jobs = db.documentJobs || [];

    const filterOrg = (list: any[]) =>
      organizationId
        ? list.filter((x) => x.organizationId === organizationId)
        : list;

    return {
      total_documents: filterOrg(docs).length,
      total_chunks: filterOrg(chunks).length,
      total_outputs: filterOrg(outputs).length,
      total_jobs: filterOrg(jobs).length,
      total_processed_bytes: filterOrg(docs).reduce(
        (acc: number, d: any) => acc + (d.fileSize || 0),
        0,
      ),
    };
  }

  async getDocumentHealth(): Promise<any> {
    const db = this.readDB();
    const jobs = db.documentJobs || [];

    return {
      workers: 1, // python worker conceptually
      pending: jobs.filter((j: any) => j.status === "PENDING").length,
      running: jobs.filter((j: any) => j.status === "RUNNING").length,
      canceled: jobs.filter((j: any) => j.status === "CANCELED").length,
      completed: jobs.filter((j: any) => j.status === "COMPLETED").length,
      failed: jobs.filter((j: any) => j.status === "FAILED").length,
    };
  }

  async getWorkspaceSnapshots(projectId?: string): Promise<any[]> {
    const db = this.readDB();
    let snaps = db.workspaceSnapshots || [];
    if (projectId) {
      snaps = snaps.filter((s: any) => s.projectId === projectId);
    }
    return snaps;
  }

  async createWorkspaceSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.workspaceSnapshots) db.workspaceSnapshots = [];
    const newSnap = {
      ...data,
      id: "ws_" + Math.random().toString(36).substr(2, 9),
      generatedAt: new Date().toISOString(),
    };
    db.workspaceSnapshots.push(newSnap);
    this.writeDB(db);
    return newSnap;
  }

  async getGovernmentSnapshots(organizationId: string): Promise<any[]> {
    const db = this.readDB();
    const snaps = db.governmentSnapshots || [];
    return snaps.filter((s: any) => s.organizationId === organizationId);
  }

  async createGovernmentSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.governmentSnapshots) db.governmentSnapshots = [];
    const newSnap = {
      ...data,
      id: "gov_" + Math.random().toString(36).substr(2, 9),
      generatedAt: new Date().toISOString(),
    };
    db.governmentSnapshots.push(newSnap);
    this.writeDB(db);
    return newSnap;
  }

  async getProcurementSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_workspace_snapshots) db.procurement_workspace_snapshots = [];
    return db.procurement_workspace_snapshots
      .filter((s: any) => s.organizationId === organizationId && s.workspaceId === workspaceId)
      .map((s: any) => ({ ...s, snapshot: s.snapshot_json || s.snapshot }));
  }

  async createProcurementSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (data.workspaceId) {
      if (!db.procurement_workspace_snapshots) db.procurement_workspace_snapshots = [];
      const newSnap = {
        ...data,
        id: data.id || "proc_ws_" + Math.random().toString(36).substr(2, 9),
        createdAt: data.createdAt || new Date().toISOString(),
      };
      if (newSnap.snapshot) {
        newSnap.snapshot_json = newSnap.snapshot;
      }
      db.procurement_workspace_snapshots.push(newSnap);
      this.writeDB(db);
      return { ...newSnap, snapshot: newSnap.snapshot_json || newSnap.snapshot };
    }

    if (!db.procurementSnapshots) db.procurementSnapshots = [];
    const newSnap = {
      ...data,
      id: "proc_" + Math.random().toString(36).substr(2, 9),
      generatedAt: new Date().toISOString(),
    };
    db.procurementSnapshots.push(newSnap);
    this.writeDB(db);
    return newSnap;
  }

  async getElectoralCampaigns(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const campaigns = db.electoralCampaigns || [];
    return campaigns.filter((c: any) => {
      const matchOrg = c.organizationId === organizationId;
      if (!matchOrg) return false;
      return c.workspaceId === workspaceId || c.workspace_id === workspaceId;
    });
  }

  async createElectoralCampaign(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaigns) db.electoralCampaigns = [];
    const newCampaign = {
      ...data,
      id: data.id || "camp_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralCampaigns.push(newCampaign);
    this.writeDB(db);
    return newCampaign;
  }

  async updateElectoralCampaign(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaigns) db.electoralCampaigns = [];
    const index = db.electoralCampaigns.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      db.electoralCampaigns[index] = {
        ...db.electoralCampaigns[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralCampaigns[index];
    }
    throw new Error("Campaign not found");
  }

  async getElectoralTerritories(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const territories = db.electoralTerritories || [];
    return territories.filter((t: any) => {
      const matchOrg = t.organizationId === organizationId;
      if (!matchOrg) return false;
      return t.workspaceId === workspaceId || t.workspace_id === workspaceId;
    });
  }

  async createElectoralTerritory(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralTerritories) db.electoralTerritories = [];
    const newTerritory = {
      ...data,
      id: data.id || "terr_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralTerritories.push(newTerritory);
    this.writeDB(db);
    return newTerritory;
  }

  async getElectoralCoordinators(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const coordinators = db.electoralCoordinators || [];
    return coordinators.filter((c: any) => {
      const matchOrg = c.organizationId === organizationId;
      if (!matchOrg) return false;
      return c.workspaceId === workspaceId || c.workspace_id === workspaceId;
    });
  }

  async createElectoralCoordinator(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCoordinators) db.electoralCoordinators = [];
    const newCoordinator = {
      ...data,
      id: data.id || "coord_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralCoordinators.push(newCoordinator);
    this.writeDB(db);
    return newCoordinator;
  }

  async getElectoralCampaignInvites(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const invites = db.electoralCampaignInvites || [];
    return invites.filter((i: any) => {
      const matchOrg = i.organizationId === organizationId;
      if (!matchOrg) return false;
      return i.workspaceId === workspaceId || i.workspace_id === workspaceId;
    });
  }

  async createElectoralCampaignInvite(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaignInvites) db.electoralCampaignInvites = [];
    const newInvite = {
      ...data,
      id: data.id || "inv_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralCampaignInvites.push(newInvite);
    this.writeDB(db);
    return newInvite;
  }

  async updateElectoralCampaignInvite(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaignInvites) db.electoralCampaignInvites = [];
    const index = db.electoralCampaignInvites.findIndex(
      (i: any) => i.id === id,
    );
    if (index !== -1) {
      db.electoralCampaignInvites[index] = {
        ...db.electoralCampaignInvites[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralCampaignInvites[index];
    }
    throw new Error("Invite not found");
  }

  async getElectoralAnalyses(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    const analyses = db.electoralAnalyses || [];
    return analyses.filter((a: any) => {
      const matchOrg = a.organizationId === organizationId;
      if (!matchOrg) return false;
      return a.workspaceId === workspaceId || a.workspace_id === workspaceId;
    });
  }

  async createElectoralAnalysis(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralAnalyses) db.electoralAnalyses = [];
    const newAnalysis = {
      ...data,
      id: data.id || "anal_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralAnalyses.push(newAnalysis);
    this.writeDB(db);
    return newAnalysis;
  }

  // Objectives
  async getElectoralCampaignObjectives(
    organizationId: string,
    campaignId?: string,
  ): Promise<any[]> {
    const db = this.readDB();
    const objectives = db.electoralCampaignObjectives || [];
    return objectives.filter((o: any) => {
      const matchOrg = o.organizationId === organizationId;
      if (!matchOrg) return false;
      if (campaignId) return o.campaignId === campaignId;
      return true;
    });
  }

  async createElectoralCampaignObjective(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaignObjectives) db.electoralCampaignObjectives = [];
    const newObjective = {
      ...data,
      id: data.id || "obj_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralCampaignObjectives.push(newObjective);
    this.writeDB(db);
    return newObjective;
  }

  async updateElectoralCampaignObjective(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaignObjectives) db.electoralCampaignObjectives = [];
    const index = db.electoralCampaignObjectives.findIndex(
      (o: any) => o.id === id,
    );
    if (index !== -1) {
      db.electoralCampaignObjectives[index] = {
        ...db.electoralCampaignObjectives[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralCampaignObjectives[index];
    }
    throw new Error("Objective not found");
  }

  // Tasks
  async getElectoralCampaignTasks(
    organizationId: string,
    campaignId?: string,
  ): Promise<any[]> {
    const db = this.readDB();
    const tasks = db.electoralCampaignTasks || [];
    return tasks.filter((t: any) => {
      const matchOrg = t.organizationId === organizationId;
      if (!matchOrg) return false;
      if (campaignId) return t.campaignId === campaignId;
      return true;
    });
  }

  async createElectoralCampaignTask(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaignTasks) db.electoralCampaignTasks = [];
    const newTask = {
      ...data,
      id: data.id || "task_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralCampaignTasks.push(newTask);
    this.writeDB(db);
    return newTask;
  }

  async updateElectoralCampaignTask(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCampaignTasks) db.electoralCampaignTasks = [];
    const index = db.electoralCampaignTasks.findIndex((t: any) => t.id === id);
    if (index !== -1) {
      db.electoralCampaignTasks[index] = {
        ...db.electoralCampaignTasks[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralCampaignTasks[index];
    }
    throw new Error("Task not found");
  }

  async updateElectoralCoordinator(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralCoordinators) db.electoralCoordinators = [];
    const index = db.electoralCoordinators.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      db.electoralCoordinators[index] = {
        ...db.electoralCoordinators[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralCoordinators[index];
    }
    throw new Error("Coordinator not found");
  }

  async getElectoralInviteAuditLogs(
    organizationId: string,
    inviteId?: string,
  ): Promise<any[]> {
    const db = this.readDB();
    let logs = db.electoralInviteAuditLogs || [];
    logs = logs.filter((l: any) => l.organizationId === organizationId);
    if (inviteId) {
      logs = logs.filter((l: any) => l.inviteId === inviteId);
    }
    return logs;
  }

  async createElectoralInviteAuditLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralInviteAuditLogs) db.electoralInviteAuditLogs = [];
    const newLog = {
      ...data,
      id: data.id || "log_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
    };
    db.electoralInviteAuditLogs.push(newLog);
    this.writeDB(db);
    return newLog;
  }

  async updateElectoralTerritory(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralTerritories) db.electoralTerritories = [];
    const index = db.electoralTerritories.findIndex((t: any) => t.id === id);
    if (index !== -1) {
      db.electoralTerritories[index] = {
        ...db.electoralTerritories[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralTerritories[index];
    }
    throw new Error("Territory not found");
  }

  // Sprint 14.4 - Opponent & Political Intelligence Methods
  async getElectoralOpponents(organizationId: string): Promise<any[]> {
    const db = this.readDB();
    const list = db.electoralOpponents || [];
    return list.filter((x: any) => x.organizationId === organizationId);
  }

  async getElectoralOpponentById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const db = this.readDB();
    const list = db.electoralOpponents || [];
    return (
      list.find(
        (x: any) => x.organizationId === organizationId && x.id === id,
      ) || null
    );
  }

  async createElectoralOpponent(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralOpponents) db.electoralOpponents = [];
    const newRecord = {
      ...data,
      id: data.id || "opp_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralOpponents.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async updateElectoralOpponent(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralOpponents) db.electoralOpponents = [];
    const index = db.electoralOpponents.findIndex((x: any) => x.id === id);
    if (index !== -1) {
      db.electoralOpponents[index] = {
        ...db.electoralOpponents[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralOpponents[index];
    }
    throw new Error("Opponent not found");
  }

  async deleteElectoralOpponent(id: string): Promise<void> {
    const db = this.readDB();
    if (!db.electoralOpponents) db.electoralOpponents = [];
    db.electoralOpponents = db.electoralOpponents.filter(
      (x: any) => x.id !== id,
    );
    this.writeDB(db);
  }

  async getElectoralPoliticalGroups(organizationId: string): Promise<any[]> {
    const db = this.readDB();
    const list = db.electoralPoliticalGroups || [];
    return list.filter((x: any) => x.organizationId === organizationId);
  }

  async getElectoralPoliticalGroupById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const db = this.readDB();
    const list = db.electoralPoliticalGroups || [];
    return (
      list.find(
        (x: any) => x.organizationId === organizationId && x.id === id,
      ) || null
    );
  }

  async createElectoralPoliticalGroup(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralPoliticalGroups) db.electoralPoliticalGroups = [];
    const newRecord = {
      ...data,
      id: data.id || "grp_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralPoliticalGroups.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async updateElectoralPoliticalGroup(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralPoliticalGroups) db.electoralPoliticalGroups = [];
    const index = db.electoralPoliticalGroups.findIndex(
      (x: any) => x.id === id,
    );
    if (index !== -1) {
      db.electoralPoliticalGroups[index] = {
        ...db.electoralPoliticalGroups[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralPoliticalGroups[index];
    }
    throw new Error("Political group not found");
  }

  async deleteElectoralPoliticalGroup(id: string): Promise<void> {
    const db = this.readDB();
    if (!db.electoralPoliticalGroups) db.electoralPoliticalGroups = [];
    db.electoralPoliticalGroups = db.electoralPoliticalGroups.filter(
      (x: any) => x.id !== id,
    );
    this.writeDB(db);
  }

  async getElectoralLeaderships(organizationId: string): Promise<any[]> {
    const db = this.readDB();
    const list = db.electoralLeaderships || [];
    return list.filter((x: any) => x.organizationId === organizationId);
  }

  async getElectoralLeadershipById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const db = this.readDB();
    const list = db.electoralLeaderships || [];
    return (
      list.find(
        (x: any) => x.organizationId === organizationId && x.id === id,
      ) || null
    );
  }

  async createElectoralLeadership(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralLeaderships) db.electoralLeaderships = [];
    const newRecord = {
      ...data,
      id: data.id || "ldr_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralLeaderships.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async updateElectoralLeadership(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralLeaderships) db.electoralLeaderships = [];
    const index = db.electoralLeaderships.findIndex((x: any) => x.id === id);
    if (index !== -1) {
      db.electoralLeaderships[index] = {
        ...db.electoralLeaderships[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralLeaderships[index];
    }
    throw new Error("Leadership not found");
  }

  async deleteElectoralLeadership(id: string): Promise<void> {
    const db = this.readDB();
    if (!db.electoralLeaderships) db.electoralLeaderships = [];
    db.electoralLeaderships = db.electoralLeaderships.filter(
      (x: any) => x.id !== id,
    );
    this.writeDB(db);
  }

  async getElectoralRelationships(organizationId: string): Promise<any[]> {
    const db = this.readDB();
    const list = db.electoralRelationships || [];
    return list.filter((x: any) => x.organizationId === organizationId);
  }

  async getElectoralRelationshipById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const db = this.readDB();
    const list = db.electoralRelationships || [];
    return (
      list.find(
        (x: any) => x.organizationId === organizationId && x.id === id,
      ) || null
    );
  }

  async createElectoralRelationship(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralRelationships) db.electoralRelationships = [];
    const newRecord = {
      ...data,
      id: data.id || "rel_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
    db.electoralRelationships.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async updateElectoralRelationship(id: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralRelationships) db.electoralRelationships = [];
    const index = db.electoralRelationships.findIndex((x: any) => x.id === id);
    if (index !== -1) {
      db.electoralRelationships[index] = {
        ...db.electoralRelationships[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return db.electoralRelationships[index];
    }
    throw new Error("Relationship not found");
  }

  async deleteElectoralRelationship(id: string): Promise<void> {
    const db = this.readDB();
    if (!db.electoralRelationships) db.electoralRelationships = [];
    db.electoralRelationships = db.electoralRelationships.filter(
      (x: any) => x.id !== id,
    );
    this.writeDB(db);
  }

  async getElectoralHistoricalResults(filter?: any): Promise<any[]> {
    const db = this.readDB();
    let list = db.electoralHistoricalResults || [];

    if (filter) {
      if (filter.organizationId) {
        list = list.filter(
          (x: any) =>
            x.organizationId === filter.organizationId || !x.organizationId,
        );
      }
      if (filter.anoEleitoral !== undefined && filter.anoEleitoral !== null) {
        list = list.filter(
          (x: any) => Number(x.anoEleitoral) === Number(filter.anoEleitoral),
        );
      }
      if (filter.uf) {
        list = list.filter(
          (x: any) =>
            String(x.uf).toLowerCase() === String(filter.uf).toLowerCase(),
        );
      }
      if (filter.municipio) {
        list = list.filter(
          (x: any) =>
            String(x.municipio).toLowerCase() ===
            String(filter.municipio).toLowerCase(),
        );
      }
      if (filter.zona !== undefined && filter.zona !== null) {
        list = list.filter((x: any) => String(x.zona) === String(filter.zona));
      }
      if (filter.cargo) {
        list = list.filter(
          (x: any) =>
            String(x.cargo).toLowerCase() ===
            String(filter.cargo).toLowerCase(),
        );
      }
      if (filter.nome) {
        list = list.filter((x: any) =>
          String(x.nome)
            .toLowerCase()
            .includes(String(filter.nome).toLowerCase()),
        );
      }
      if (filter.partido) {
        list = list.filter(
          (x: any) =>
            String(x.partido).toLowerCase() ===
            String(filter.partido).toLowerCase(),
        );
      }
      if (filter.numeroVotavel) {
        list = list.filter(
          (x: any) => String(x.numeroVotavel) === String(filter.numeroVotavel),
        );
      }
      if (filter.localVotacao) {
        list = list.filter(
          (x: any) => String(x.localVotacao) === String(filter.localVotacao),
        );
      }
      if (filter.turno !== undefined && filter.turno !== null) {
        list = list.filter(
          (x: any) => Number(x.turno) === Number(filter.turno),
        );
      }
      if (filter.suplementar !== undefined) {
        list = list.filter(
          (x: any) => Boolean(x.suplementar) === Boolean(filter.suplementar),
        );
      }
      if (filter.importRunId) {
        list = list.filter(
          (x: any) => String(x.importRunId) === String(filter.importRunId),
        );
      }

      const offset = filter.offset ? Number(filter.offset) : 0;
      if (filter.limit) {
        list = list.slice(offset, offset + Number(filter.limit));
      }
    }
    return list;
  }

  async createElectoralHistoricalResult(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralHistoricalResults) db.electoralHistoricalResults = [];
    const newRecord = {
      ...data,
      id: data.id || "eh_res_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
    };
    db.electoralHistoricalResults.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async bulkCreateElectoralHistoricalResults(records: any[]): Promise<any[]> {
    const db = this.readDB();
    if (!db.electoralHistoricalResults) db.electoralHistoricalResults = [];
    const newRecords = records.map((data) => ({
      ...data,
      id: data.id || "eh_res_" + Math.random().toString(36).substr(2, 9),
      createdAt: data.createdAt || new Date().toISOString(),
    }));
    db.electoralHistoricalResults.push(...newRecords);
    this.writeDB(db);
    return newRecords;
  }

  async getCandidateHistoricalResults(
    candidateName: string,
    filter?: any,
  ): Promise<any[]> {
    return this.getElectoralHistoricalResults({
      ...filter,
      nome: candidateName,
    });
  }

  async getPartyHistoricalResults(party: string, filter?: any): Promise<any[]> {
    return this.getElectoralHistoricalResults({ ...filter, partido: party });
  }

  async getTerritoryHistoricalResults(filter?: any): Promise<any[]> {
    // Must supply at least municipio in filter based on requirements.
    return this.getElectoralHistoricalResults(filter);
  }

  async getElectoralCandidateRanking(
    organizationId: string,
    filter?: any,
  ): Promise<{ name: string; votes: number }[]> {
    const records = await this.getElectoralHistoricalResults({
      ...filter,
      organizationId,
      limit: undefined,
      offset: undefined,
    });
    const aggregated: { [name: string]: number } = {};
    for (const r of records) {
      if (r.nome) {
        aggregated[r.nome] = (aggregated[r.nome] || 0) + Number(r.qtVotos || 0);
      }
    }
    return Object.entries(aggregated)
      .map(([name, votes]) => ({ name, votes }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, Number(filter?.limit) || 10);
  }

  async getElectoralPartyRanking(
    organizationId: string,
    filter?: any,
  ): Promise<{ name: string; votes: number }[]> {
    const records = await this.getElectoralHistoricalResults({
      ...filter,
      organizationId,
      limit: undefined,
      offset: undefined,
    });
    const aggregated: { [name: string]: number } = {};
    for (const r of records) {
      if (r.partido) {
        aggregated[r.partido] =
          (aggregated[r.partido] || 0) + Number(r.qtVotos || 0);
      }
    }
    return Object.entries(aggregated)
      .map(([name, votes]) => ({ name, votes }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, Number(filter?.limit) || 10);
  }

  // Sprint 14.5.2
  async createElectoralImportJob(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralImportJobs) db.electoralImportJobs = [];
    const entity = {
      ...data,
      id: data.id || "job_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    db.electoralImportJobs.push(entity);
    this.writeDB(db);
    return entity;
  }

  async updateElectoralImportJob(id: string, data: any): Promise<any> {
    const db = this.readDB();
    const list = db.electoralImportJobs || [];
    const index = list.findIndex((x: any) => String(x.id) === String(id));
    if (index >= 0) {
      list[index] = {
        ...list[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      this.writeDB(db);
      return list[index];
    }
    return null;
  }

  async getElectoralImportJob(id: string): Promise<any> {
    const db = this.readDB();
    return (
      db.electoralImportJobs?.find((x: any) => String(x.id) === String(id)) ||
      null
    );
  }

  async getElectoralImportJobs(organizationId: string): Promise<any[]> {
    const db = this.readDB();
    return (db.electoralImportJobs || []).filter(
      (x: any) =>
        !organizationId || String(x.organizationId) === String(organizationId),
    );
  }

  async createElectoralImportRowError(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralImportRowErrors) db.electoralImportRowErrors = [];
    const entity = {
      ...data,
      id: "err_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    db.electoralImportRowErrors.push(entity);
    this.writeDB(db);
    return entity;
  }

  // Sprint 14.5.3 - Aggregates mapped back to base methods in JSON adapter (mock)
  async refreshElectoralAggregates(): Promise<void> {
    // In JSON adapter, views are conceptually recalculated on the fly anyway.
    return Promise.resolve();
  }

  async createElectoralImportValidationSummary(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.electoralImportValidationSummary)
      db.electoralImportValidationSummary = [];
    const entity = {
      ...data,
      id: "val_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    db.electoralImportValidationSummary.push(entity);
    this.writeDB(db);
    return entity;
  }

  async getElectoralAvailableFilters(organizationId: string): Promise<any> {
    // Mock available filters based on results
    return {
      years: [2020, 2022, 2024],
      ufs: ["PR"],
      cargos: ["Prefeito", "Vereador"],
      turnos: [1, 2],
    };
  }

  async computeElectoralImportValidation(
    organizationId: string,
    importRunId: string,
  ): Promise<any> {
    const db = this.readDB();
    const rows =
      db.electoralHistoricalResults?.filter(
        (r) => r.importRunId === importRunId,
      ) || [];
    const availableYears = [...new Set(rows.map((r) => r.anoEleitoral))];
    const availableUfs = [...new Set(rows.map((r) => r.uf))];
    const availableMunicipalities = [...new Set(rows.map((r) => r.municipio))];
    const availableCargos = [...new Set(rows.map((r) => r.cargo))];
    const availableTurnos = [...new Set(rows.map((r) => r.turno))];
    const totalVotes = rows.reduce((acc, r) => acc + (r.qtVotos || 0), 0);

    const jobs = db.electoralImportJobs || [];
    const runJob = jobs.find((j) => j.importRunId === importRunId);
    const jobId = runJob?.id;

    const invalidRows =
      db.electoralImportRowErrors?.filter((e) => e.importJobId === jobId)
        .length || 0;

    // Duplicates based on basic JS grouping
    let duplicateCount = 0;
    if (rows.length > 0) {
      const hashes = new Set<string>();
      for (const r of rows) {
        if (hashes.has(r.recordHash)) {
          duplicateCount++;
        }
        hashes.add(r.recordHash);
      }
    }

    const status =
      rows.length > 0
        ? invalidRows > 0 || duplicateCount > 0
          ? "PARTIAL_DATA"
          : "READY"
        : "NO_DATA";
    const limitedMunicipalities = availableMunicipalities.slice(0, 500);

    return {
      organizationId,
      importRunId,
      totalRows: rows.length,
      totalVotes,
      availableYears,
      availableUfs,
      availableMunicipalities: limitedMunicipalities,
      availableCargos,
      availableTurnos,
      invalidRows: invalidRows,
      duplicateRows: duplicateCount,
      status: status,
      detailsJson: {
        municipalities_truncated: availableMunicipalities.length > 500,
        municipalities_total_count: availableMunicipalities.length,
      },
      validatedAt: new Date().toISOString(),
    };
  }

  async getElectoralCandidateSummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    const limit = filter?.limit ? Number(filter.limit) : 50;
    const ranking = await this.getElectoralCandidateRanking(organizationId, {
      ...filter,
      limit,
    });
    if (!ranking || ranking.length === 0) return ["NO_DATA" as any];
    return ranking.map((r) => ({ candidato: r.name, total_votos: r.votes }));
  }

  async getElectoralMunicipalitySummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    return ["NO_DATA" as any]; // Mock NO_DATA
  }

  async getElectoralPartySummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    return ["NO_DATA" as any]; // Mock NO_DATA
  }

  async getElectoralLocationSummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    return ["NO_DATA" as any]; // Mock NO_DATA
  }

  async getElectoralZoneSummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    return ["NO_DATA" as any]; // Mock NO_DATA
  }

  // Sprint 15.0 - Beta Platform Operational Engine (Mock implementation for JSON)
  async getContacts(organizationId: string, filter?: any): Promise<Contact[]> {
    return [];
  }
  async createContact(data: any): Promise<Contact> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getCRMInteractions(
    organizationId: string,
    filter?: any,
  ): Promise<CRMInteraction[]> {
    return [];
  }
  async createCRMInteraction(data: any): Promise<CRMInteraction> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getCalendarEvents(
    organizationId: string,
    filter?: any,
  ): Promise<CalendarEvent[]> {
    return [];
  }
  async createCalendarEvent(data: any): Promise<CalendarEvent> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getActivities(
    organizationId: string,
    filter?: any,
  ): Promise<Activity[]> {
    return [];
  }
  async createActivity(data: any): Promise<Activity> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getCoreTasks(organizationId: string, filter?: any): Promise<Task[]> {
    return [];
  }
  async createCoreTask(data: any): Promise<Task> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getEvidences(
    organizationId: string,
    filter?: any,
  ): Promise<Evidence[]> {
    return [];
  }
  async createEvidence(data: any): Promise<Evidence> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getAttachments(
    organizationId: string,
    filter?: any,
  ): Promise<Attachment[]> {
    return [];
  }
  async createAttachment(data: any): Promise<Attachment> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getWorkflowInstances(
    organizationId: string,
    filter?: any,
  ): Promise<WorkflowInstance[]> {
    return [];
  }
  async createWorkflowInstance(data: any): Promise<WorkflowInstance> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getWorkflowSteps(
    organizationId: string,
    instanceId: string,
  ): Promise<WorkflowStep[]> {
    return [];
  }
  async createWorkflowStep(data: any): Promise<WorkflowStep> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  async getNotifications(
    organizationId: string,
    filter?: any,
  ): Promise<Notification[]> {
    return [];
  }
  async createNotification(data: any): Promise<Notification> {
    return { id: crypto.randomUUID(), ...data } as any;
  }

  // SPRINT 15.1 - Private properties to mock organization modules and overriding configurations
  private mockOrgModules: OrganizationModule[] = [
    // Pre-enable Core and Electoral module by default for tenant organization to make initial setup functional
    {
      id: "om-default-core",
      organizationId: "org-1",
      moduleId: "mod-core-1111-2222-333333333333",
      isEnabled: true,
      activatedAt: new Date().toISOString(),
      expiresAt: null,
      metadataJson: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "om-default-elec",
      organizationId: "org-1",
      moduleId: "mod-elec-1111-2222-333333333333",
      isEnabled: true,
      activatedAt: new Date().toISOString(),
      expiresAt: null,
      metadataJson: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  private mockFeatureOverrides: OrganizationFeatureOverride[] = [];

  async getModules(): Promise<Module[]> {
    return [
      {
        id: "mod-core-1111-2222-333333333333",
        code: "beta_core",
        name: "Beta Core",
        description: "Core system foundations and multi-tenant profiles",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-elec-1111-2222-333333333333",
        code: "beta_electoral",
        name: "Beta Electoral",
        description:
          "Electoral campaign optimization and coordinators team sync",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-gov-1111-2222-333333333333",
        code: "beta_gov",
        name: "Beta Gov",
        description: "Government performance tracking and state integration",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-lic-1111-2222-333333333333",
        code: "beta_licita",
        name: "Beta Licita",
        description: "Public bidding monitor and automation layer",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-ana-1111-2222-333333333333",
        code: "beta_analytics",
        name: "Beta Analytics",
        description: "Advanced predictive engines and performance analytics",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-crm-1111-2222-333333333333",
        code: "beta_crm",
        name: "Beta CRM",
        description: "Constituent relationship management and interaction sync",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-pla-1111-2222-333333333333",
        code: "beta_planejamento",
        name: "Beta Planejamento",
        description: "Institutional planning and milestone tracking",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-ctrl-1111-2222-333333333333",
        code: "beta_controle_interno",
        name: "Beta Controle Interno",
        description: "Internal compliance and process audits",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mod-obs-1111-2222-333333333333",
        code: "beta_observatorio",
        name: "Beta Observatorio",
        description: "Constituency observation and feedback loops",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  async getOrganizationModules(
    organizationId: string,
  ): Promise<OrganizationModule[]> {
    return this.mockOrgModules.filter(
      (om) => om.organizationId === organizationId,
    );
  }

  async enableOrganizationModule(
    organizationId: string,
    moduleId: string,
    metadataJson: any = {},
  ): Promise<OrganizationModule> {
    const existing = this.mockOrgModules.find(
      (om) => om.organizationId === organizationId && om.moduleId === moduleId,
    );
    if (existing) {
      existing.isEnabled = true;
      existing.activatedAt = new Date().toISOString();
      existing.metadataJson = metadataJson || {};
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const newOm: OrganizationModule = {
      id: crypto.randomUUID(),
      organizationId,
      moduleId,
      isEnabled: true,
      activatedAt: new Date().toISOString(),
      expiresAt: null,
      metadataJson: metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.mockOrgModules.push(newOm);
    return newOm;
  }

  async disableOrganizationModule(
    organizationId: string,
    moduleId: string,
  ): Promise<void> {
    const existing = this.mockOrgModules.find(
      (om) => om.organizationId === organizationId && om.moduleId === moduleId,
    );
    if (existing) {
      existing.isEnabled = false;
      existing.updatedAt = new Date().toISOString();
    } else {
      const newOm: OrganizationModule = {
        id: crypto.randomUUID(),
        organizationId,
        moduleId,
        isEnabled: false,
        activatedAt: null,
        expiresAt: null,
        metadataJson: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.mockOrgModules.push(newOm);
    }
  }

  async getModuleFeatures(): Promise<ModuleFeature[]> {
    return [
      {
        id: "feat-core-contact",
        moduleId: "mod-core-1111-2222-333333333333",
        featureCode: "core_contact_management",
        featureName: "Contact Management",
        description: "Manage organizational contacts",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "feat-elec-camp",
        moduleId: "mod-elec-1111-2222-333333333333",
        featureCode: "electoral_campaign_management",
        featureName: "Campaign Management",
        description: "Manage political campaigns and voter outreach",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "feat-elec-coord",
        moduleId: "mod-elec-1111-2222-333333333333",
        featureCode: "electoral_coordinator_management",
        featureName: "Coordinator management",
        description: "Sync electoral coordinators across zones",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "feat-crm-tracking",
        moduleId: "mod-crm-1111-2222-333333333333",
        featureCode: "crm_interaction_tracking",
        featureName: "CRM Interaction Tracking",
        description: "Log and audit touchpoints with constituents",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  async getOrganizationFeatures(
    organizationId: string,
  ): Promise<OrganizationFeatureOverride[]> {
    return this.mockFeatureOverrides.filter(
      (fo) => fo.organizationId === organizationId,
    );
  }

  // =========================================================================
  // SPRINT 15.2 - WORKSPACES, SETTINGS, AUDITING, ADMIN DB SUPPORT (JSON)
  // =========================================================================
  private mockWorkspaces: Workspace[] = [
    // Provide a default workspace for local dev to prevent completely empty states on boot
    {
      id: "ws-dev-1111-2222-333333333333",
      organizationId: "org-oi-beta",
      name: "Default Workspace",
      description: "Development core operational workspace for Beta Platform",
      status: "ACTIVE",
      metadataJson: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private mockSettings: OrganizationSetting[] = [
    {
      id: "set-default-1",
      organizationId: "org-oi-beta",
      settingKey: "platform_theme",
      settingValue: "emerald-slate",
      metadataJson: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private mockAuditLogs: SuperAdminAuditLog[] = [];

  // 1. Workspaces
  async getWorkspaces(
    organizationId: string,
    filter?: any,
  ): Promise<Workspace[]> {
    if (!organizationId) return [];
    return this.mockWorkspaces.filter(
      (w) => w.organizationId === organizationId,
    );
  }

  async createWorkspace(data: any): Promise<Workspace> {
    const ws: Workspace = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      name: data.name || "New Workspace",
      description: data.description || null,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.mockWorkspaces.push(ws);
    return ws;
  }

  async updateWorkspace(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<Workspace> {
    const idx = this.mockWorkspaces.findIndex(
      (w) => w.id === id && w.organizationId === organizationId,
    );
    if (idx === -1) {
      throw new Error(
        `Workspace not found: ${id} under organization ${organizationId}`,
      );
    }
    const existing = this.mockWorkspaces[idx];
    const updated: Workspace = {
      ...existing,
      name: data.name !== undefined ? data.name : existing.name,
      description:
        data.description !== undefined
          ? data.description
          : existing.description,
      status: data.status !== undefined ? data.status : existing.status,
      metadataJson:
        data.metadataJson !== undefined
          ? { ...existing.metadataJson, ...data.metadataJson }
          : existing.metadataJson,
      updatedAt: new Date().toISOString(),
    };
    this.mockWorkspaces[idx] = updated;
    return updated;
  }

  // 2. Settings
  async getOrganizationSettings(
    organizationId: string,
  ): Promise<OrganizationSetting[]> {
    if (!organizationId) return [];
    return this.mockSettings.filter((s) => s.organizationId === organizationId);
  }

  async updateOrganizationSetting(
    organizationId: string,
    settingKey: string,
    settingValue: string,
    metadataJson: any = {},
  ): Promise<OrganizationSetting> {
    const idx = this.mockSettings.findIndex(
      (s) => s.organizationId === organizationId && s.settingKey === settingKey,
    );
    if (idx !== -1) {
      const existing = this.mockSettings[idx];
      const updated: OrganizationSetting = {
        ...existing,
        settingValue,
        metadataJson:
          metadataJson !== undefined
            ? { ...existing.metadataJson, ...metadataJson }
            : existing.metadataJson,
        updatedAt: new Date().toISOString(),
      };
      this.mockSettings[idx] = updated;
      return updated;
    }
    const newSetting: OrganizationSetting = {
      id: crypto.randomUUID(),
      organizationId,
      settingKey,
      settingValue,
      metadataJson: metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.mockSettings.push(newSetting);
    return newSetting;
  }

  // 3. Super Admin Audit Logging
  async getAuditLogs(): Promise<SuperAdminAuditLog[]> {
    return this.mockAuditLogs;
  }

  async createAuditLog(data: any): Promise<SuperAdminAuditLog> {
    const log: SuperAdminAuditLog = {
      id: data.id || crypto.randomUUID(),
      actorUserId: data.actorUserId || "dev_admin",
      organizationId: data.organizationId || "global",
      actionType: data.actionType || "UNKNOWN",
      entityType: data.entityType || "SYSTEM",
      entityId: data.entityId || "none",
      description: data.description || "No description provided",
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
    };
    this.mockAuditLogs.push(log);
    return log;
  }

  // 4. Admin Helpers mapping mock system organizations & users
  async getOrganizations(): Promise<any[]> {
    // Keep it truthful but allow default organization identification
    return [
      {
        id: "org-oi-beta",
        name: "Beta Organization",
        status: "ACTIVE",
        description: "Default institutional tenant",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async getOrganizationDetails(id: string): Promise<any> {
    const orgs = await this.getOrganizations();
    return orgs.find((o) => o.id === id) || null;
  }

  async getOrganizationUsers(organizationId: string): Promise<any[]> {
    // Return users associated with the targeted organization (always includes fallbacks)
    if (organizationId === "org-oi-beta") {
      return [
        {
          id: "dev-user-douglas",
          name: "Douglas",
          email: "douglas.uis@gmail.com",
          organizationId: "org-oi-beta",
          role: "superuser",
          status: "ACTIVE",
        },
      ];
    }
    return [];
  }

  // =========================================================================
  // SPRINT 15.3 - SHARED IMPORT CENTER MOCK LOGIC
  // =========================================================================
  private mockImportJobs: ImportJob[] = [];
  private mockImportJobLogs: ImportJobLog[] = [];
  private mockImportJobErrors: ImportJobError[] = [];

  async createImportJob(data: any): Promise<ImportJob> {
    const job: ImportJob = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      moduleCode: data.moduleCode,
      jobType: data.jobType,
      status: data.status || "PENDING",
      startedAt: data.startedAt || null,
      completedAt: data.completedAt || null,
      totalRows: data.totalRows || 0,
      processedRows: data.processedRows || 0,
      successRows: data.successRows || 0,
      errorRows: data.errorRows || 0,
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.mockImportJobs.push(job);
    return job;
  }

  async updateImportJob(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<ImportJob> {
    const idx = this.mockImportJobs.findIndex(
      (j) => j.id === id && j.organizationId === organizationId,
    );
    if (idx === -1) {
      throw new Error(
        `ImportJob not found: ${id} under organization ${organizationId}`,
      );
    }
    const existing = this.mockImportJobs[idx];
    const updated: ImportJob = {
      ...existing,
      status: data.status !== undefined ? data.status : existing.status,
      startedAt:
        data.startedAt !== undefined ? data.startedAt : existing.startedAt,
      completedAt:
        data.completedAt !== undefined
          ? data.completedAt
          : existing.completedAt,
      totalRows:
        data.totalRows !== undefined ? data.totalRows : existing.totalRows,
      processedRows:
        data.processedRows !== undefined
          ? data.processedRows
          : existing.processedRows,
      successRows:
        data.successRows !== undefined
          ? data.successRows
          : existing.successRows,
      errorRows:
        data.errorRows !== undefined ? data.errorRows : existing.errorRows,
      metadataJson:
        data.metadataJson !== undefined
          ? { ...existing.metadataJson, ...data.metadataJson }
          : existing.metadataJson,
      updatedAt: new Date().toISOString(),
    };
    this.mockImportJobs[idx] = updated;
    return updated;
  }

  async getImportJob(
    id: string,
    organizationId: string,
  ): Promise<ImportJob | null> {
    return (
      this.mockImportJobs.find(
        (j) => j.id === id && j.organizationId === organizationId,
      ) || null
    );
  }

  async getImportJobs(
    organizationId: string,
    workspaceId: string,
  ): Promise<ImportJob[]> {
    return this.mockImportJobs.filter(
      (j) =>
        j.organizationId === organizationId && j.workspaceId === workspaceId,
    );
  }

  async createImportLog(data: any): Promise<ImportJobLog> {
    const log: ImportJobLog = {
      id: data.id || crypto.randomUUID(),
      jobId: data.jobId,
      level: data.level || "INFO",
      message: data.message,
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
    };
    this.mockImportJobLogs.push(log);
    return log;
  }

  async createImportError(data: any): Promise<ImportJobError> {
    const err: ImportJobError = {
      id: data.id || crypto.randomUUID(),
      jobId: data.jobId,
      rowNumber: data.rowNumber || 0,
      errorCode: data.errorCode || "GENERIC_ERROR",
      errorMessage: data.errorMessage || "",
      rawDataJson: data.rawDataJson || {},
      createdAt: new Date().toISOString(),
    };
    this.mockImportJobErrors.push(err);
    return err;
  }

  async getImportErrors(jobId: string): Promise<ImportJobError[]> {
    return this.mockImportJobErrors.filter((e) => e.jobId === jobId);
  }

  // =========================================================================
  // SPRINT 15.4 - ELECTORAL OPERATIONAL INTEGRATION
  // =========================================================================

  async getCampaigns(
    organizationId: string,
    workspaceId: string,
  ): Promise<ElectoralCampaign[]> {
    const db = this.readDB();
    const list = db.electoralOperationalCampaigns || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.workspaceId === workspaceId,
    );
  }

  async createCampaign(data: any): Promise<ElectoralCampaign> {
    const db = this.readDB();
    if (!db.electoralOperationalCampaigns)
      db.electoralOperationalCampaigns = [];
    const campaign: ElectoralCampaign = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description || null,
      campaignType: data.campaignType,
      status: data.status || "PENDING",
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.electoralOperationalCampaigns.push(campaign);
    this.writeDB(db);
    return campaign;
  }

  async updateCampaign(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<ElectoralCampaign> {
    const db = this.readDB();
    if (!db.electoralOperationalCampaigns)
      db.electoralOperationalCampaigns = [];
    const idx = db.electoralOperationalCampaigns.findIndex(
      (c: any) => c.id === id && c.organizationId === organizationId,
    );
    if (idx === -1) {
      throw new Error(`ElectoralCampaign not found with ID ${id}`);
    }
    const current = db.electoralOperationalCampaigns[idx];
    const updated: ElectoralCampaign = {
      ...current,
      name: data.name !== undefined ? data.name : current.name,
      description:
        data.description !== undefined ? data.description : current.description,
      campaignType:
        data.campaignType !== undefined
          ? data.campaignType
          : current.campaignType,
      status: data.status !== undefined ? data.status : current.status,
      startDate:
        data.startDate !== undefined ? data.startDate : current.startDate,
      endDate: data.endDate !== undefined ? data.endDate : current.endDate,
      metadataJson:
        data.metadataJson !== undefined
          ? { ...current.metadataJson, ...data.metadataJson }
          : current.metadataJson,
      updatedAt: new Date().toISOString(),
    };
    db.electoralOperationalCampaigns[idx] = updated;
    this.writeDB(db);
    return updated;
  }

  async getCampaignMembers(campaignId: string): Promise<CampaignMember[]> {
    const db = this.readDB();
    const list = db.campaignMembers || [];
    return list.filter((m: any) => m.campaignId === campaignId);
  }

  async addCampaignMember(data: any): Promise<CampaignMember> {
    const db = this.readDB();
    if (!db.campaignMembers) db.campaignMembers = [];
    const member: CampaignMember = {
      id: data.id || crypto.randomUUID(),
      campaignId: data.campaignId,
      contactId: data.contactId,
      role: data.role,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.campaignMembers.push(member);
    this.writeDB(db);
    return member;
  }

  async getCampaignGoals(campaignId: string): Promise<CampaignGoal[]> {
    const db = this.readDB();
    const list = db.campaignGoals || [];
    return list.filter((g: any) => g.campaignId === campaignId);
  }

  async createCampaignGoal(data: any): Promise<CampaignGoal> {
    const db = this.readDB();
    if (!db.campaignGoals) db.campaignGoals = [];
    const goal: CampaignGoal = {
      id: data.id || crypto.randomUUID(),
      campaignId: data.campaignId,
      title: data.title,
      description: data.description || null,
      goalType: data.goalType,
      targetValue: data.targetValue || 0,
      currentValue: data.currentValue || 0,
      status: data.status || "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.campaignGoals.push(goal);
    this.writeDB(db);
    return goal;
  }

  async updateCampaignGoal(
    id: string,
    campaignId: string,
    data: any,
  ): Promise<CampaignGoal> {
    const db = this.readDB();
    if (!db.campaignGoals) db.campaignGoals = [];
    const idx = db.campaignGoals.findIndex(
      (g: any) => g.id === id && g.campaignId === campaignId,
    );
    if (idx === -1) {
      throw new Error(`CampaignGoal not found with ID ${id}`);
    }
    const current = db.campaignGoals[idx];
    const updated: CampaignGoal = {
      ...current,
      title: data.title !== undefined ? data.title : current.title,
      description:
        data.description !== undefined ? data.description : current.description,
      goalType: data.goalType !== undefined ? data.goalType : current.goalType,
      targetValue:
        data.targetValue !== undefined ? data.targetValue : current.targetValue,
      currentValue:
        data.currentValue !== undefined
          ? data.currentValue
          : current.currentValue,
      status: data.status !== undefined ? data.status : current.status,
      updatedAt: new Date().toISOString(),
    };
    db.campaignGoals[idx] = updated;
    this.writeDB(db);
    return updated;
  }

  async getCampaignActions(campaignId: string): Promise<CampaignAction[]> {
    const db = this.readDB();
    const list = db.campaignActions || [];
    return list.filter((a: any) => a.campaignId === campaignId);
  }

  async createCampaignAction(data: any): Promise<CampaignAction> {
    const db = this.readDB();
    if (!db.campaignActions) db.campaignActions = [];
    const action: CampaignAction = {
      id: data.id || crypto.randomUUID(),
      campaignId: data.campaignId,
      activityId: data.activityId || null,
      taskId: data.taskId || null,
      title: data.title,
      description: data.description || null,
      status: data.status || "PENDING",
      scheduledFor: data.scheduledFor || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.campaignActions.push(action);
    this.writeDB(db);
    return action;
  }

  async getCampaignEvidences(campaignId: string): Promise<CampaignEvidence[]> {
    const db = this.readDB();
    const list = db.campaignEvidences || [];
    return list.filter((e: any) => e.campaignId === campaignId);
  }

  async linkCampaignEvidence(data: any): Promise<CampaignEvidence> {
    const db = this.readDB();
    if (!db.campaignEvidences) db.campaignEvidences = [];
    const evidence: CampaignEvidence = {
      id: data.id || crypto.randomUUID(),
      campaignId: data.campaignId,
      evidenceId: data.evidenceId,
      description: data.description || null,
      createdAt: new Date().toISOString(),
    };
    db.campaignEvidences.push(evidence);
    this.writeDB(db);
    return evidence;
  }

  // =========================================================================
  // SPRINT 15.5 - COORDINATOR & TERRITORY OPERATIONAL LAYER
  // =========================================================================

  async getCampaignTerritories(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignTerritory[]> {
    const db = this.readDB();
    const list = db.campaignTerritories || [];
    return list.filter(
      (t: any) =>
        t.organizationId === organizationId && t.campaignId === campaignId,
    );
  }

  async createCampaignTerritory(data: any): Promise<CampaignTerritory> {
    const db = this.readDB();
    if (!db.campaignTerritories) db.campaignTerritories = [];
    const territory: CampaignTerritory = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      parentTerritoryId: data.parentTerritoryId || null,
      territoryType: data.territoryType,
      name: data.name,
      description: data.description || null,
      geoCode: data.geoCode || null,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.campaignTerritories.push(territory);
    this.writeDB(db);
    return territory;
  }

  async updateCampaignTerritory(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<CampaignTerritory> {
    const db = this.readDB();
    if (!db.campaignTerritories) db.campaignTerritories = [];
    const idx = db.campaignTerritories.findIndex(
      (t: any) => t.id === id && t.organizationId === organizationId,
    );
    if (idx === -1) {
      throw new Error(`CampaignTerritory not found with ID ${id}`);
    }
    const current = db.campaignTerritories[idx];
    const updated: CampaignTerritory = {
      ...current,
      parentTerritoryId:
        data.parentTerritoryId !== undefined
          ? data.parentTerritoryId
          : current.parentTerritoryId,
      territoryType:
        data.territoryType !== undefined
          ? data.territoryType
          : current.territoryType,
      name: data.name !== undefined ? data.name : current.name,
      description:
        data.description !== undefined ? data.description : current.description,
      geoCode: data.geoCode !== undefined ? data.geoCode : current.geoCode,
      status: data.status !== undefined ? data.status : current.status,
      metadataJson:
        data.metadataJson !== undefined
          ? { ...current.metadataJson, ...data.metadataJson }
          : current.metadataJson,
      updatedAt: new Date().toISOString(),
    };
    db.campaignTerritories[idx] = updated;
    this.writeDB(db);
    return updated;
  }

  async getCampaignCoordinators(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignCoordinator[]> {
    const db = this.readDB();
    const list = db.campaignCoordinators || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async createCampaignCoordinator(data: any): Promise<CampaignCoordinator> {
    const db = this.readDB();
    if (!db.campaignCoordinators) db.campaignCoordinators = [];
    const coordinator: CampaignCoordinator = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      contactId: data.contactId,
      coordinatorLevel: data.coordinatorLevel,
      role: data.role,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.campaignCoordinators.push(coordinator);
    this.writeDB(db);
    return coordinator;
  }

  async updateCampaignCoordinator(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<CampaignCoordinator> {
    const db = this.readDB();
    if (!db.campaignCoordinators) db.campaignCoordinators = [];
    const idx = db.campaignCoordinators.findIndex(
      (c: any) => c.id === id && c.organizationId === organizationId,
    );
    if (idx === -1) {
      throw new Error(`CampaignCoordinator not found with ID ${id}`);
    }
    const current = db.campaignCoordinators[idx];
    const updated: CampaignCoordinator = {
      ...current,
      coordinatorLevel:
        data.coordinatorLevel !== undefined
          ? data.coordinatorLevel
          : current.coordinatorLevel,
      role: data.role !== undefined ? data.role : current.role,
      status: data.status !== undefined ? data.status : current.status,
      metadataJson:
        data.metadataJson !== undefined
          ? { ...current.metadataJson, ...data.metadataJson }
          : current.metadataJson,
      updatedAt: new Date().toISOString(),
    };
    db.campaignCoordinators[idx] = updated;
    this.writeDB(db);
    return updated;
  }

  async getCoordinatorAssignments(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignCoordinatorAssignment[]> {
    const db = this.readDB();
    const list = db.campaignCoordinatorAssignments || [];
    return list.filter(
      (a: any) =>
        a.organizationId === organizationId && a.campaignId === campaignId,
    );
  }

  async assignCoordinatorToTerritory(
    data: any,
  ): Promise<CampaignCoordinatorAssignment> {
    const db = this.readDB();
    if (!db.campaignCoordinatorAssignments)
      db.campaignCoordinatorAssignments = [];
    const assignment: CampaignCoordinatorAssignment = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      coordinatorId: data.coordinatorId,
      territoryId: data.territoryId,
      assignmentType: data.assignmentType,
      status: data.status || "ACTIVE",
      startedAt: data.startedAt || new Date().toISOString(),
      endedAt: data.endedAt || null,
      metadataJson: data.metadataJson || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.campaignCoordinatorAssignments.push(assignment);
    this.writeDB(db);
    return assignment;
  }

  async removeCoordinatorAssignment(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const db = this.readDB();
    if (!db.campaignCoordinatorAssignments)
      db.campaignCoordinatorAssignments = [];
    const initialLen = db.campaignCoordinatorAssignments.length;
    db.campaignCoordinatorAssignments =
      db.campaignCoordinatorAssignments.filter(
        (a: any) => !(a.id === id && a.organizationId === organizationId),
      );
    if (db.campaignCoordinatorAssignments.length !== initialLen) {
      this.writeDB(db);
    }
  }

  async getTerritoryCoverage(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignTerritoryCoverage[]> {
    const db = this.readDB();
    const list = db.campaignTerritoryCoverage || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async computeTerritoryCoverage(
    data: any,
  ): Promise<CampaignTerritoryCoverage> {
    const db = this.readDB();
    if (!db.campaignTerritoryCoverage) db.campaignTerritoryCoverage = [];
    const idx = db.campaignTerritoryCoverage.findIndex(
      (c: any) =>
        c.territoryId === data.territoryId && c.campaignId === data.campaignId,
    );

    const record: CampaignTerritoryCoverage = {
      id:
        idx !== -1
          ? db.campaignTerritoryCoverage[idx].id
          : data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      territoryId: data.territoryId,
      coordinatorsCount: data.coordinatorsCount || 0,
      membersCount: data.membersCount || 0,
      actionsCount: data.actionsCount || 0,
      evidencesCount: data.evidencesCount || 0,
      lastActivityAt: data.lastActivityAt || null,
      coverageStatus: data.coverageStatus || "NO_DATA",
      metadataJson: data.metadataJson || {},
      createdAt:
        idx !== -1
          ? db.campaignTerritoryCoverage[idx].createdAt
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      db.campaignTerritoryCoverage[idx] = record;
    } else {
      db.campaignTerritoryCoverage.push(record);
    }
    this.writeDB(db);
    return record;
  }

  async getTerritoryConflicts(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignTerritoryConflict[]> {
    const db = this.readDB();
    const list = db.campaignTerritoryConflicts || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async computeTerritoryConflicts(
    data: any,
  ): Promise<CampaignTerritoryConflict> {
    const db = this.readDB();
    if (!db.campaignTerritoryConflicts) db.campaignTerritoryConflicts = [];

    const idx = db.campaignTerritoryConflicts.findIndex(
      (c: any) =>
        c.territoryId === data.territoryId &&
        c.campaignId === data.campaignId &&
        c.conflictType === data.conflictType,
    );

    const record: CampaignTerritoryConflict = {
      id:
        idx !== -1
          ? db.campaignTerritoryConflicts[idx].id
          : data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      territoryId: data.territoryId,
      conflictType: data.conflictType,
      description: data.description,
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {},
      createdAt:
        idx !== -1
          ? db.campaignTerritoryConflicts[idx].createdAt
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      db.campaignTerritoryConflicts[idx] = record;
    } else {
      db.campaignTerritoryConflicts.push(record);
    }
    this.writeDB(db);
    return record;
  }

  async getCoordinatorHealth(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignCoordinatorHealth[]> {
    const db = this.readDB();
    const list = db.campaignCoordinatorHealth || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async computeCoordinatorHealth(
    data: any,
  ): Promise<CampaignCoordinatorHealth> {
    const db = this.readDB();
    if (!db.campaignCoordinatorHealth) db.campaignCoordinatorHealth = [];
    const idx = db.campaignCoordinatorHealth.findIndex(
      (c: any) =>
        c.coordinatorId === data.coordinatorId &&
        c.campaignId === data.campaignId,
    );

    const record: CampaignCoordinatorHealth = {
      id:
        idx !== -1
          ? db.campaignCoordinatorHealth[idx].id
          : data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      coordinatorId: data.coordinatorId,
      assignedTerritoriesCount: data.assignedTerritoriesCount || 0,
      activeActionsCount: data.activeActionsCount || 0,
      completedActionsCount: data.completedActionsCount || 0,
      pendingActionsCount: data.pendingActionsCount || 0,
      lastActivityAt: data.lastActivityAt || null,
      healthStatus: data.healthStatus || "NO_DATA",
      metadataJson: data.metadataJson || {},
      createdAt:
        idx !== -1
          ? db.campaignCoordinatorHealth[idx].createdAt
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      db.campaignCoordinatorHealth[idx] = record;
    } else {
      db.campaignCoordinatorHealth.push(record);
    }
    this.writeDB(db);
    return record;
  }

  // --- SPRINT 15.6 - CAMPAIGN CRM METHODS ---

  async getCampaignContacts(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContact[]> {
    const db = this.readDB();
    const list = db.campaignContacts || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async addCampaignContact(data: any): Promise<CampaignContact> {
    const db = this.readDB();
    if (!db.campaignContacts) db.campaignContacts = [];

    const record: CampaignContact = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      contactId: data.contactId,
      contactType: data.contactType,
      status: data.status || "ACTIVE",
      priorityLevel: data.priorityLevel || "MEDIUM",
      metadataJson: data.metadataJson || {},
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.campaignContacts.push(record);
    this.writeDB(db);
    return record;
  }

  async updateCampaignContact(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<CampaignContact> {
    const db = this.readDB();
    if (!db.campaignContacts) db.campaignContacts = [];
    const idx = db.campaignContacts.findIndex(
      (c: any) => c.id === id && c.organizationId === organizationId,
    );
    if (idx === -1) {
      throw new Error(`Campaign contact metadata not found for ID: ${id}`);
    }

    const existing = db.campaignContacts[idx];
    const record: CampaignContact = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    db.campaignContacts[idx] = record;
    this.writeDB(db);
    return record;
  }

  async getContactRelationships(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContactRelationship[]> {
    const db = this.readDB();
    const list = db.campaignContactRelationships || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async createRelationship(data: any): Promise<CampaignContactRelationship> {
    const db = this.readDB();
    if (!db.campaignContactRelationships) db.campaignContactRelationships = [];

    const record: CampaignContactRelationship = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      sourceContactId: data.sourceContactId,
      targetContactId: data.targetContactId,
      relationshipType: data.relationshipType,
      strengthLevel: data.strengthLevel || "medium",
      metadataJson: data.metadataJson || {},
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.campaignContactRelationships.push(record);
    this.writeDB(db);
    return record;
  }

  async getContactSegments(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContactSegment[]> {
    const db = this.readDB();
    const list = db.campaignContactSegments || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async createSegment(data: any): Promise<CampaignContactSegment> {
    const db = this.readDB();
    if (!db.campaignContactSegments) db.campaignContactSegments = [];

    const record: CampaignContactSegment = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      name: data.name,
      description: data.description || null,
      status: data.status || "ACTIVE",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.campaignContactSegments.push(record);
    this.writeDB(db);
    return record;
  }

  async getContactEngagement(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContactEngagement[]> {
    const db = this.readDB();
    const list = db.campaignContactEngagement || [];
    return list.filter(
      (c: any) =>
        c.organizationId === organizationId && c.campaignId === campaignId,
    );
  }

  async computeContactEngagement(
    data: any,
  ): Promise<CampaignContactEngagement> {
    const db = this.readDB();
    if (!db.campaignContactEngagement) db.campaignContactEngagement = [];
    const idx = db.campaignContactEngagement.findIndex(
      (c: any) =>
        c.contactId === data.contactId && c.campaignId === data.campaignId,
    );

    const record: CampaignContactEngagement = {
      id:
        idx !== -1
          ? db.campaignContactEngagement[idx].id
          : data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      contactId: data.contactId,
      interactionsCount: data.interactionsCount || 0,
      activitiesCount: data.activitiesCount || 0,
      eventsCount: data.eventsCount || 0,
      lastInteractionAt: data.lastInteractionAt || null,
      engagementStatus: data.engagementStatus || "NO_DATA",
      metadataJson: data.metadataJson || {},
      createdAt:
        idx !== -1
          ? db.campaignContactEngagement[idx].createdAt
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      db.campaignContactEngagement[idx] = record;
    } else {
      db.campaignContactEngagement.push(record);
    }
    this.writeDB(db);
    return record;
  }

  // --- SPRINT 15.7 - CAMPAIGN CALENDAR METHODS ---

  async getCampaignEvents(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignEvent[]> {
    const db = this.readDB();
    const list = db.campaignEvents || [];
    return list.filter(
      (e: any) =>
        e.organizationId === organizationId && e.campaignId === campaignId,
    );
  }

  async createCampaignEvent(data: any): Promise<CampaignEvent> {
    const db = this.readDB();
    if (!db.campaignEvents) db.campaignEvents = [];

    const record: CampaignEvent = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      calendarEventId: data.calendarEventId || null,
      eventType: data.eventType || "meeting",
      title: data.title,
      description: data.description || null,
      status: data.status || "ACTIVE",
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      location: data.location || null,
      metadataJson: data.metadataJson || {},
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.campaignEvents.push(record);
    this.writeDB(db);
    return record;
  }

  async updateCampaignEvent(
    id: string,
    organizationId: string,
    campaignId: string,
    data: any,
  ): Promise<CampaignEvent> {
    const db = this.readDB();
    if (!db.campaignEvents) db.campaignEvents = [];
    const idx = db.campaignEvents.findIndex(
      (e: any) =>
        e.id === id &&
        e.organizationId === organizationId &&
        e.campaignId === campaignId,
    );
    if (idx === -1) {
      throw new Error(`Campaign event metadata not found for ID: ${id}`);
    }

    const existing = db.campaignEvents[idx];
    const record: CampaignEvent = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    db.campaignEvents[idx] = record;
    this.writeDB(db);
    return record;
  }

  async getEventParticipants(
    organizationId: string,
    campaignId: string,
    eventId: string,
  ): Promise<CampaignEventParticipant[]> {
    const db = this.readDB();
    const list = db.campaignEventParticipants || [];
    return list.filter(
      (p: any) =>
        p.organizationId === organizationId &&
        p.campaignId === campaignId &&
        p.eventId === eventId,
    );
  }

  async addParticipant(data: any): Promise<CampaignEventParticipant> {
    const db = this.readDB();
    if (!db.campaignEventParticipants) db.campaignEventParticipants = [];

    const record: CampaignEventParticipant = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      eventId: data.eventId,
      contactId: data.contactId,
      participantType: data.participantType || "guest",
      status: data.status || "PENDING",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.campaignEventParticipants.push(record);
    this.writeDB(db);
    return record;
  }

  async getEventAttendance(
    organizationId: string,
    campaignId: string,
    eventId: string,
  ): Promise<CampaignEventAttendance[]> {
    const db = this.readDB();
    const list = db.campaignEventAttendance || [];
    return list.filter(
      (a: any) =>
        a.organizationId === organizationId &&
        a.campaignId === campaignId &&
        a.eventId === eventId,
    );
  }

  async registerAttendance(data: any): Promise<CampaignEventAttendance> {
    const db = this.readDB();
    if (!db.campaignEventAttendance) db.campaignEventAttendance = [];

    const idx = db.campaignEventAttendance.findIndex(
      (a: any) => a.eventId === data.eventId && a.contactId === data.contactId,
    );

    const record: CampaignEventAttendance = {
      id:
        idx !== -1
          ? db.campaignEventAttendance[idx].id
          : data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      eventId: data.eventId,
      contactId: data.contactId,
      attendanceStatus: data.attendanceStatus || "confirmed",
      checkinAt: data.checkinAt || null,
      checkoutAt: data.checkoutAt || null,
      createdAt:
        idx !== -1
          ? db.campaignEventAttendance[idx].createdAt
          : new Date().toISOString(),
    };

    if (idx !== -1) {
      db.campaignEventAttendance[idx] = record;
    } else {
      db.campaignEventAttendance.push(record);
    }
    this.writeDB(db);
    return record;
  }

  async linkEventTerritory(data: any): Promise<CampaignEventTerritory> {
    const db = this.readDB();
    if (!db.campaignEventTerritories) db.campaignEventTerritories = [];

    const record: CampaignEventTerritory = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      eventId: data.eventId,
      territoryId: data.territoryId,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    db.campaignEventTerritories.push(record);
    this.writeDB(db);
    return record;
  }

  async linkEventEvidence(data: any): Promise<CampaignEventEvidence> {
    const db = this.readDB();
    if (!db.campaignEventEvidences) db.campaignEventEvidences = [];

    const record: CampaignEventEvidence = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      campaignId: data.campaignId,
      eventId: data.eventId,
      evidenceId: data.evidenceId,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    db.campaignEventEvidences.push(record);
    this.writeDB(db);
    return record;
  }

  async getCampaignEventTerritories(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignEventTerritory[]> {
    const db = this.readDB();
    const list = db.campaignEventTerritories || [];
    return list.filter(
      (t: any) =>
        t.organizationId === organizationId && t.campaignId === campaignId,
    );
  }

  async getCampaignEventEvidences(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignEventEvidence[]> {
    const db = this.readDB();
    const list = db.campaignEventEvidences || [];
    return list.filter(
      (e: any) =>
        e.organizationId === organizationId && e.campaignId === campaignId,
    );
  }

  // Sprint 15.8 - Communication & Action Dispatch
  async getCommunicationThreads(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationThread[]> {
    const db = this.readDB();
    if (!db.communicationThreads) db.communicationThreads = [];
    return db.communicationThreads.filter(
      (t: any) =>
        t.organizationId === organizationId && t.workspaceId === workspaceId,
    );
  }

  async createCommunicationThread(data: any): Promise<CommunicationThread> {
    const db = this.readDB();
    if (!db.communicationThreads) db.communicationThreads = [];

    const record: CommunicationThread = {
      id: data.id || "th_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      threadType: data.threadType || "group",
      title: data.title || "",
      status: data.status || "ACTIVE",
      metadataJson: data.metadataJson || {},
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.communicationThreads.push(record);
    this.writeDB(db);
    return record;
  }

  async getCommunicationMessages(
    organizationId: string,
    workspaceId: string,
    threadId: string,
  ): Promise<CommunicationMessage[]> {
    const db = this.readDB();
    if (!db.communicationMessages) db.communicationMessages = [];
    return db.communicationMessages.filter(
      (m: any) =>
        m.organizationId === organizationId &&
        m.workspaceId === workspaceId &&
        m.threadId === threadId,
    );
  }

  async getTotalMessagesCount(
    organizationId: string,
    workspaceId: string,
  ): Promise<number> {
    const db = this.readDB();
    if (!db.communicationMessages) return 0;
    return db.communicationMessages.filter(
      (m: any) =>
        m.organizationId === organizationId && m.workspaceId === workspaceId,
    ).length;
  }

  async sendCommunicationMessage(data: any): Promise<CommunicationMessage> {
    const db = this.readDB();
    if (!db.communicationMessages) db.communicationMessages = [];

    const record: CommunicationMessage = {
      id: data.id || "msg_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      threadId: data.threadId,
      senderUserId: data.senderUserId,
      messageType: data.messageType || "message",
      content: data.content || "",
      metadataJson: data.metadataJson || {},
      createdAt: data.createdAt || new Date().toISOString(),
    };

    db.communicationMessages.push(record);
    this.writeDB(db);
    return record;
  }

  async addCommunicationParticipant(
    data: any,
  ): Promise<CommunicationParticipant> {
    const db = this.readDB();
    if (!db.communicationParticipants) db.communicationParticipants = [];

    const record: CommunicationParticipant = {
      id: data.id || "part_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      threadId: data.threadId,
      userId: data.userId,
      participantRole: data.participantRole || "member",
      status: data.status || "ACTIVE",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.communicationParticipants.push(record);
    this.writeDB(db);
    return record;
  }

  async getCommunicationParticipants(
    organizationId: string,
    workspaceId: string,
    threadId: string,
  ): Promise<CommunicationParticipant[]> {
    const db = this.readDB();
    if (!db.communicationParticipants) db.communicationParticipants = [];
    return db.communicationParticipants.filter(
      (p: any) =>
        p.organizationId === organizationId &&
        p.workspaceId === workspaceId &&
        p.threadId === threadId,
    );
  }

  async getCommunicationRequests(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationRequest[]> {
    const db = this.readDB();
    if (!db.communicationRequests) db.communicationRequests = [];
    return db.communicationRequests.filter(
      (r: any) =>
        r.organizationId === organizationId && r.workspaceId === workspaceId,
    );
  }

  async createCommunicationRequest(data: any): Promise<CommunicationRequest> {
    const db = this.readDB();
    if (!db.communicationRequests) db.communicationRequests = [];

    const record: CommunicationRequest = {
      id: data.id || "req_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      requestType: data.requestType || "information_request",
      requesterUserId: data.requesterUserId,
      targetUserId: data.targetUserId,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      status: data.status || "PENDING",
      description: data.description || "",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.communicationRequests.push(record);
    this.writeDB(db);
    return record;
  }

  async getCommunicationDispatches(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationDispatch[]> {
    const db = this.readDB();
    if (!db.communicationDispatches) db.communicationDispatches = [];
    return db.communicationDispatches.filter(
      (d: any) =>
        d.organizationId === organizationId && d.workspaceId === workspaceId,
    );
  }

  async createCommunicationDispatch(data: any): Promise<CommunicationDispatch> {
    const db = this.readDB();
    if (!db.communicationDispatches) db.communicationDispatches = [];

    const record: CommunicationDispatch = {
      id: data.id || "disp_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      dispatchType: data.dispatchType || "task_dispatch",
      sourceUserId: data.sourceUserId,
      targetUserId: data.targetUserId,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      status: data.status || "DISPATCHED",
      description: data.description || "",
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    db.communicationDispatches.push(record);
    this.writeDB(db);
    return record;
  }

  async getCommunicationLogs(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationLog[]> {
    const db = this.readDB();
    if (!db.communicationLogs) db.communicationLogs = [];
    return db.communicationLogs.filter(
      (l: any) =>
        l.organizationId === organizationId && l.workspaceId === workspaceId,
    );
  }

  async createCommunicationLog(data: any): Promise<CommunicationLog> {
    const db = this.readDB();
    if (!db.communicationLogs) db.communicationLogs = [];

    const record: CommunicationLog = {
      id: data.id || "log_" + Math.random().toString(36).substr(2, 9),
      organizationId: data.organizationId,
      workspaceId: data.workspaceId,
      eventType: data.eventType,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description || "",
      createdAt: data.createdAt || new Date().toISOString(),
    };

    db.communicationLogs.push(record);
    this.writeDB(db);
    return record;
  }

  // Sprint 15.9 - User Presence
  async getUserPresence(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserPresence[]> {
    const db = this.readDB();
    if (!db.userPresence) db.userPresence = [];
    return db.userPresence.filter(
      (p: any) =>
        p.organizationId === organizationId &&
        p.workspaceId === workspaceId &&
        (userId ? p.userId === userId : true),
    );
  }

  async updateUserPresence(data: any): Promise<UserPresence> {
    const db = this.readDB();
    if (!db.userPresence) db.userPresence = [];

    const existingIndex = db.userPresence.findIndex(
      (p: any) =>
        p.organizationId === data.organizationId &&
        p.workspaceId === data.workspaceId &&
        p.userId === data.userId,
    );

    let record: UserPresence;
    if (existingIndex !== -1) {
      record = {
        ...db.userPresence[existingIndex],
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
      db.userPresence[existingIndex] = record;
    } else {
      record = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
      db.userPresence.push(record);
    }

    this.writeDB(db);
    return record;
  }

  async getUserSessions(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserSession[]> {
    const db = this.readDB();
    if (!db.userSessions) db.userSessions = [];
    return db.userSessions.filter(
      (s: any) =>
        s.organizationId === organizationId &&
        s.workspaceId === workspaceId &&
        (userId ? s.userId === userId : true),
    );
  }

  async createUserSession(data: any): Promise<UserSession> {
    const db = this.readDB();
    if (!db.userSessions) db.userSessions = [];
    const record: UserSession = {
      ...data,
      id: crypto.randomUUID(),
      startedAt: data.startedAt || new Date().toISOString(),
    };
    db.userSessions.push(record);
    this.writeDB(db);
    return record;
  }

  async closeUserSession(
    organizationId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<UserSession> {
    const db = this.readDB();
    if (!db.userSessions) db.userSessions = [];
    const existingIndex = db.userSessions.findIndex(
      (s: any) =>
        s.id === sessionId &&
        s.organizationId === organizationId &&
        s.workspaceId === workspaceId,
    );

    if (existingIndex === -1) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    const record = {
      ...db.userSessions[existingIndex],
      status: "terminated",
      endedAt: new Date().toISOString(),
    };
    db.userSessions[existingIndex] = record;
    this.writeDB(db);
    return record;
  }

  async getUserActivityLog(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserActivityLog[]> {
    const db = this.readDB();
    if (!db.userActivityLog) db.userActivityLog = [];
    return db.userActivityLog.filter(
      (a: any) =>
        a.organizationId === organizationId &&
        a.workspaceId === workspaceId &&
        (userId ? a.userId === userId : true),
    );
  }

  async createUserActivity(data: any): Promise<UserActivityLog> {
    const db = this.readDB();
    if (!db.userActivityLog) db.userActivityLog = [];
    const record: UserActivityLog = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
    };
    db.userActivityLog.push(record);
    this.writeDB(db);
    return record;
  }

  // --- SPRINT 16.3: AI ROUTER FOUNDATION ---

  async getProviders(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.ai_provider_registry) db.ai_provider_registry = [];
    return db.ai_provider_registry.filter(
      (p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId
    );
  }

  async registerProvider(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.ai_provider_registry) db.ai_provider_registry = [];
    const newRecord = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.ai_provider_registry.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async enableProvider(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const db = this.readDB();
    if (!db.ai_provider_registry) db.ai_provider_registry = [];
    const index = db.ai_provider_registry.findIndex(
      (p: any) => p.id === id && p.organizationId === organizationId && p.workspaceId === workspaceId
    );
    if (index !== -1) {
      db.ai_provider_registry[index].status = "ACTIVE";
      db.ai_provider_registry[index].updatedAt = new Date().toISOString();
      this.writeDB(db);
      return db.ai_provider_registry[index];
    }
    throw new Error("Provider not found");
  }

  async disableProvider(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const db = this.readDB();
    if (!db.ai_provider_registry) db.ai_provider_registry = [];
    const index = db.ai_provider_registry.findIndex(
      (p: any) => p.id === id && p.organizationId === organizationId && p.workspaceId === workspaceId
    );
    if (index !== -1) {
      db.ai_provider_registry[index].status = "INACTIVE";
      db.ai_provider_registry[index].updatedAt = new Date().toISOString();
      this.writeDB(db);
      return db.ai_provider_registry[index];
    }
    throw new Error("Provider not found");
  }

  async getPolicies(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.ai_router_policies) db.ai_router_policies = [];
    return db.ai_router_policies.filter(
      (p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId
    );
  }

  async createPolicy(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.ai_router_policies) db.ai_router_policies = [];
    const newRecord = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.ai_router_policies.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async getRouterRequests(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.ai_router_requests) db.ai_router_requests = [];
    return db.ai_router_requests.filter(
      (p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId
    );
  }

  async createRouterRequest(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.ai_router_requests) db.ai_router_requests = [];
    const newRecord = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    db.ai_router_requests.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async getRouterAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.ai_router_audits) db.ai_router_audits = [];
    return db.ai_router_audits.filter(
      (p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId
    );
  }

  async createRouterAudit(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.ai_router_audits) db.ai_router_audits = [];
    const newRecord = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    db.ai_router_audits.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  // --- SPRINT 16.4: BETA ACTION EXECUTION FOUNDATION ---

  async createActionRequest(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.beta_action_requests) db.beta_action_requests = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.payload) {
      newRecord.payload_json = newRecord.payload;
      delete newRecord.payload;
    }
    db.beta_action_requests.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, payload: newRecord.payload_json, payload_json: undefined };
  }

  async getActionRequests(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_action_requests) db.beta_action_requests = [];
    return db.beta_action_requests
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, payload: p.payload_json, payload_json: undefined }));
  }

  async getActionRequestById(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const db = this.readDB();
    if (!db.beta_action_requests) db.beta_action_requests = [];
    const item = db.beta_action_requests.find(
      (p: any) => p.id === id && p.organizationId === organizationId && p.workspaceId === workspaceId
    );
    if (!item) return null;
    return { ...item, payload: item.payload_json, payload_json: undefined };
  }

  async createActionDispatch(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.beta_action_dispatches) db.beta_action_dispatches = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.beta_action_dispatches.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getActionDispatches(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_action_dispatches) db.beta_action_dispatches = [];
    return db.beta_action_dispatches
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createBetaActionLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.beta_action_logs) db.beta_action_logs = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.details) {
      newRecord.details_json = newRecord.details;
      delete newRecord.details;
    }
    db.beta_action_logs.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, details: newRecord.details_json, details_json: undefined };
  }

  async getBetaActionLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_action_logs) db.beta_action_logs = [];
    return db.beta_action_logs
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, details: p.details_json, details_json: undefined }));
  }

  // --- SPRINT 16.5: BETA SKILLS FOUNDATION ---

  async registerSkill(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.beta_skills) db.beta_skills = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.beta_skills.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async enableSkill(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const db = this.readDB();
    if (!db.beta_skills) db.beta_skills = [];
    const index = db.beta_skills.findIndex((s: any) => s.id === id && s.organizationId === organizationId && s.workspaceId === workspaceId);
    if (index >= 0) {
      db.beta_skills[index].status = "ACTIVE";
      db.beta_skills[index].updatedAt = new Date().toISOString();
      this.writeDB(db);
      return db.beta_skills[index];
    }
    return null;
  }

  async disableSkill(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const db = this.readDB();
    if (!db.beta_skills) db.beta_skills = [];
    const index = db.beta_skills.findIndex((s: any) => s.id === id && s.organizationId === organizationId && s.workspaceId === workspaceId);
    if (index >= 0) {
      db.beta_skills[index].status = "INACTIVE";
      db.beta_skills[index].updatedAt = new Date().toISOString();
      this.writeDB(db);
      return db.beta_skills[index];
    }
    return null;
  }

  async getSkill(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const db = this.readDB();
    if (!db.beta_skills) db.beta_skills = [];
    return db.beta_skills.find((s: any) => s.id === id && s.organizationId === organizationId && s.workspaceId === workspaceId) || null;
  }

  async getSkills(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_skills) db.beta_skills = [];
    return db.beta_skills.filter((s: any) => s.organizationId === organizationId && s.workspaceId === workspaceId);
  }

  async getCapabilities(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_capabilities) db.beta_capabilities = [];
    return db.beta_capabilities.filter((c: any) => c.organizationId === organizationId && c.workspaceId === workspaceId);
  }

  async getSkillRegistry(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_skill_registry) db.beta_skill_registry = [];
    return db.beta_skill_registry.filter((r: any) => r.organizationId === organizationId && r.workspaceId === workspaceId);
  }

  // --- SPRINT 16.6: BETA OPERATIONAL ORCHESTRATOR ---

  async createOperationalIntent(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.beta_operational_intents) db.beta_operational_intents = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.beta_operational_intents.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getOperationalIntents(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_operational_intents) db.beta_operational_intents = [];
    return db.beta_operational_intents
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createOperationalDispatch(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.beta_operational_dispatches) db.beta_operational_dispatches = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.beta_operational_dispatches.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getOperationalDispatches(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_operational_dispatches) db.beta_operational_dispatches = [];
    return db.beta_operational_dispatches
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createOperationalResult(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.beta_operational_results) db.beta_operational_results = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.details) {
      newRecord.details_json = newRecord.details;
      delete newRecord.details;
    }
    db.beta_operational_results.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, details: newRecord.details_json, details_json: undefined };
  }

  async getOperationalResults(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.beta_operational_results) db.beta_operational_results = [];
    return db.beta_operational_results
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, details: p.details_json, details_json: undefined }));
  }

  // --- SPRINT 17.0: BETA GOV WORKSPACE FOUNDATION ---

  async getGovernmentWorkspace(organizationId: string, workspaceId: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_workspaces) db.government_workspaces = [];
    const item = db.government_workspaces.find((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId);
    if (!item) return null;
    return { ...item, metadata: item.metadata_json, metadata_json: undefined };
  }

  async createGovernmentWorkspace(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workspaces) db.government_workspaces = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_workspaces.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async createGovernmentWorkspaceSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workspace_snapshots) db.government_workspace_snapshots = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.snapshot) {
      newRecord.snapshot_json = newRecord.snapshot;
      delete newRecord.snapshot;
    }
    db.government_workspace_snapshots.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, snapshot: newRecord.snapshot_json, snapshot_json: undefined };
  }

  async getGovernmentWorkspaceSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workspace_snapshots) db.government_workspace_snapshots = [];
    return db.government_workspace_snapshots
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, snapshot: p.snapshot_json, snapshot_json: undefined }));
  }

  async createGovernmentLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workspace_logs) db.government_workspace_logs = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.details) {
      newRecord.details_json = newRecord.details;
      delete newRecord.details;
    }
    db.government_workspace_logs.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, details: newRecord.details_json, details_json: undefined };
  }

  async getGovernmentLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workspace_logs) db.government_workspace_logs = [];
    return db.government_workspace_logs
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, details: p.details_json, details_json: undefined }));
  }

  // --- SPRINT 17.1: GOVERNMENT OBJECTIVES & PROGRAM MANAGEMENT ---

  async createGovernmentObjective(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_objectives) db.government_objectives = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_objectives.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentObjectives(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_objectives) db.government_objectives = [];
    return db.government_objectives
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createGovernmentProgram(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_programs) db.government_programs = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_programs.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_programs) db.government_programs = [];
    return db.government_programs
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createGovernmentProject(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_projects) db.government_projects = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_projects.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentProjects(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_projects) db.government_projects = [];
    return db.government_projects
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createGovernmentAction(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_actions) db.government_actions = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_actions.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentActions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_actions) db.government_actions = [];
    return db.government_actions
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  // --- SPRINT 17.2: GOVERNMENT INDICATORS & PERFORMANCE MANAGEMENT ---

  async createGovernmentIndicator(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_indicators) db.government_indicators = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_indicators.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_indicators) db.government_indicators = [];
    return db.government_indicators
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createGovernmentGoal(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_goals) db.government_goals = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_goals.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentGoals(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_goals) db.government_goals = [];
    return db.government_goals
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createGovernmentResult(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_results) db.government_results = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_results.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentResults(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_results) db.government_results = [];
    return db.government_results
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async createGovernmentPerformanceSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_performance_snapshots) db.government_performance_snapshots = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.snapshot) {
      newRecord.snapshot_json = newRecord.snapshot;
      delete newRecord.snapshot;
    }
    db.government_performance_snapshots.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, snapshot: newRecord.snapshot_json, snapshot_json: undefined };
  }

  async getGovernmentPerformanceSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_performance_snapshots) db.government_performance_snapshots = [];
    return db.government_performance_snapshots
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, snapshot: p.snapshot_json, snapshot_json: undefined }));
  }

  // --- SPRINT 17.3: GOVERNMENT REPORTING & EXECUTIVE BRIEF FOUNDATION ---

  async createGovernmentReport(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_reports) db.government_reports = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_reports.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentReports(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_reports) db.government_reports = [];
    return db.government_reports
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async getGovernmentReport(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_reports) db.government_reports = [];
    const record = db.government_reports.find((p: any) => p.id === id);
    if (!record) return null;
    return { ...record, metadata: record.metadata_json, metadata_json: undefined };
  }

  async createExecutiveBrief(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_executive_briefs) db.government_executive_briefs = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_executive_briefs.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_executive_briefs) db.government_executive_briefs = [];
    return db.government_executive_briefs
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async getExecutiveBrief(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_executive_briefs) db.government_executive_briefs = [];
    const record = db.government_executive_briefs.find((p: any) => p.id === id);
    if (!record) return null;
    return { ...record, metadata: record.metadata_json, metadata_json: undefined };
  }

  async createMonitoringSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_monitoring_snapshots) db.government_monitoring_snapshots = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.snapshot) {
      newRecord.snapshot_json = newRecord.snapshot;
      delete newRecord.snapshot;
    }
    db.government_monitoring_snapshots.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, snapshot: newRecord.snapshot_json, snapshot_json: undefined };
  }

  async getMonitoringSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_monitoring_snapshots) db.government_monitoring_snapshots = [];
    return db.government_monitoring_snapshots
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, snapshot: p.snapshot_json, snapshot_json: undefined }));
  }

  async createGovernmentReportLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_report_logs) db.government_report_logs = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.details) {
      newRecord.details_json = newRecord.details;
      delete newRecord.details;
    }
    db.government_report_logs.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, details: newRecord.details_json, details_json: undefined };
  }

  async getGovernmentReportLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_report_logs) db.government_report_logs = [];
    return db.government_report_logs
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, details: p.details_json, details_json: undefined }));
  }

  // --- SPRINT 17.4: GOV GOVERNANCE & EXECUTIVE REVIEW FOUNDATION ---

  async createGovernanceReview(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_governance_reviews) db.government_governance_reviews = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_governance_reviews.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernanceReviews(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_governance_reviews) db.government_governance_reviews = [];
    return db.government_governance_reviews
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async getGovernanceReview(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_governance_reviews) db.government_governance_reviews = [];
    const record = db.government_governance_reviews.find((p: any) => p.id === id);
    if (!record) return null;
    return { ...record, metadata: record.metadata_json, metadata_json: undefined };
  }

  async createExecutiveMeeting(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_executive_meetings) db.government_executive_meetings = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_executive_meetings.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getExecutiveMeetings(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_executive_meetings) db.government_executive_meetings = [];
    return db.government_executive_meetings
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async getExecutiveMeeting(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_executive_meetings) db.government_executive_meetings = [];
    const record = db.government_executive_meetings.find((p: any) => p.id === id);
    if (!record) return null;
    return { ...record, metadata: record.metadata_json, metadata_json: undefined };
  }

  async createStrategicCycle(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_strategic_cycles) db.government_strategic_cycles = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_strategic_cycles.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getStrategicCycles(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_strategic_cycles) db.government_strategic_cycles = [];
    return db.government_strategic_cycles
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async getStrategicCycle(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_strategic_cycles) db.government_strategic_cycles = [];
    const record = db.government_strategic_cycles.find((p: any) => p.id === id);
    if (!record) return null;
    return { ...record, metadata: record.metadata_json, metadata_json: undefined };
  }

  async createGovernmentDecision(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_decisions) db.government_decisions = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_decisions.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getGovernmentDecisions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_decisions) db.government_decisions = [];
    return db.government_decisions
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async getGovernmentDecision(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_decisions) db.government_decisions = [];
    const record = db.government_decisions.find((p: any) => p.id === id);
    if (!record) return null;
    return { ...record, metadata: record.metadata_json, metadata_json: undefined };
  }

  async createMonitoringReview(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_monitoring_reviews) db.government_monitoring_reviews = [];
    const newRecord: any = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
      delete newRecord.metadata;
    }
    db.government_monitoring_reviews.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json, metadata_json: undefined };
  }

  async getMonitoringReviews(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_monitoring_reviews) db.government_monitoring_reviews = [];
    return db.government_monitoring_reviews
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, metadata: p.metadata_json, metadata_json: undefined }));
  }

  async getMonitoringReview(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.government_monitoring_reviews) db.government_monitoring_reviews = [];
    const record = db.government_monitoring_reviews.find((p: any) => p.id === id);
    if (!record) return null;
    return { ...record, metadata: record.metadata_json, metadata_json: undefined };
  }

  // --- SPRINT 18.0: BETA LICITA WORKSPACE FOUNDATION ---

  async getProcurementWorkspace(organizationId: string, workspaceId: string): Promise<any | null> {
    const db = this.readDB();
    if (!db.procurement_workspaces) db.procurement_workspaces = [];
    const record = db.procurement_workspaces.find(
      (p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId
    );
    if (!record) return null;
    return { ...record, metadata: record.metadata_json || record.metadata };
  }

  async createProcurementWorkspace(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_workspaces) db.procurement_workspaces = [];
    const newRecord = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    if (newRecord.metadata) {
      newRecord.metadata_json = newRecord.metadata;
    }
    db.procurement_workspaces.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, metadata: newRecord.metadata_json || newRecord.metadata };
  }

  async createProcurementLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_workspace_logs) db.procurement_workspace_logs = [];
    const newRecord = {
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (newRecord.details) {
      newRecord.details_json = newRecord.details;
    }
    db.procurement_workspace_logs.push(newRecord);
    this.writeDB(db);
    return { ...newRecord, details: newRecord.details_json || newRecord.details };
  }

  async getProcurementLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_workspace_logs) db.procurement_workspace_logs = [];
    return db.procurement_workspace_logs
      .filter((p: any) => p.organizationId === organizationId && p.workspaceId === workspaceId)
      .map((p: any) => ({ ...p, details: p.details_json || p.details }));
  }

  // --- SPRINT 18.1: PROCUREMENT BID & OPPORTUNITY MANAGEMENT FOUNDATION ---

  async createOpportunity(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_opportunities) db.procurement_opportunities = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      title: data.title,
      description: data.description || null,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_opportunities.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createBid(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_bids) db.procurement_bids = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      opportunityId: data.opportunityId || data.opportunity_id || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_bids.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createParticipation(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_participations) db.procurement_participations = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      bidId: data.bidId || data.bid_id,
      supplierId: data.supplierId || data.supplier_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_participations.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createLot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_lots) db.procurement_lots = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      bidId: data.bidId || data.bid_id,
      title: data.title,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_lots.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createProposal(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_proposals) db.procurement_proposals = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      bidId: data.bidId || data.bid_id,
      lotId: data.lotId || data.lot_id || null,
      supplierId: data.supplierId || data.supplier_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_proposals.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async getOpportunities(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_opportunities) db.procurement_opportunities = [];
    return db.procurement_opportunities.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getBids(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_bids) db.procurement_bids = [];
    return db.procurement_bids.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getParticipations(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_participations) db.procurement_participations = [];
    return db.procurement_participations.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getLots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_lots) db.procurement_lots = [];
    return db.procurement_lots.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getProposals(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_proposals) db.procurement_proposals = [];
    return db.procurement_proposals.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 18.2: SUPPLIER & PROCUREMENT DOCUMENT MANAGEMENT FOUNDATION ---

  async createSupplier(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_suppliers) db.procurement_suppliers = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      name: data.name,
      documentNumber: data.documentNumber || data.document_number || null,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_suppliers.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createSupplierDocument(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_supplier_documents) db.procurement_supplier_documents = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      supplierId: data.supplierId || data.supplier_id,
      documentType: data.documentType || data.document_type,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_supplier_documents.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createSupplierCertificate(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_supplier_certificates) db.procurement_supplier_certificates = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      supplierId: data.supplierId || data.supplier_id,
      certificateType: data.certificateType || data.certificate_type,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_supplier_certificates.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createSupplierQualification(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_supplier_qualifications) db.procurement_supplier_qualifications = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      supplierId: data.supplierId || data.supplier_id,
      qualificationType: data.qualificationType || data.qualification_type,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_supplier_qualifications.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createSupplierRegistry(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_supplier_registries) db.procurement_supplier_registries = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      supplierId: data.supplierId || data.supplier_id,
      registryType: data.registryType || data.registry_type,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_supplier_registries.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async getSuppliers(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_suppliers) db.procurement_suppliers = [];
    return db.procurement_suppliers.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getSupplierDocuments(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_supplier_documents) db.procurement_supplier_documents = [];
    return db.procurement_supplier_documents.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getSupplierCertificates(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_supplier_certificates) db.procurement_supplier_certificates = [];
    return db.procurement_supplier_certificates.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getSupplierQualifications(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_supplier_qualifications) db.procurement_supplier_qualifications = [];
    return db.procurement_supplier_qualifications.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getSupplierRegistries(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_supplier_registries) db.procurement_supplier_registries = [];
    return db.procurement_supplier_registries.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 18.3: PROCUREMENT CONTRACT & CONTRACT EXECUTION FOUNDATION ---

  async createContract(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_contracts) db.procurement_contracts = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      supplierId: data.supplierId || data.supplier_id,
      bidId: data.bidId || data.bid_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      title: data.title || null,
      number: data.number || null,
      value: data.value !== undefined ? data.value : null,
      supplierName: data.supplierName || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_contracts.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createContractExecution(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_contract_executions) db.procurement_contract_executions = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      contractId: data.contractId || data.contract_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_contract_executions.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createInspection(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_inspections) db.procurement_inspections = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      contractId: data.contractId || data.contract_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_inspections.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createDelivery(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_deliveries) db.procurement_deliveries = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      contractId: data.contractId || data.contract_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_deliveries.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createMeasurement(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_measurements) db.procurement_measurements = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      contractId: data.contractId || data.contract_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_measurements.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createContractIssue(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_contract_issues) db.procurement_contract_issues = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      contractId: data.contractId || data.contract_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_contract_issues.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async getContracts(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_contracts) db.procurement_contracts = [];
    return db.procurement_contracts.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getContractExecutions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_contract_executions) db.procurement_contract_executions = [];
    return db.procurement_contract_executions.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getInspections(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_inspections) db.procurement_inspections = [];
    return db.procurement_inspections.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getDeliveries(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_deliveries) db.procurement_deliveries = [];
    return db.procurement_deliveries.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getMeasurements(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_measurements) db.procurement_measurements = [];
    return db.procurement_measurements.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getContractIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_contract_issues) db.procurement_contract_issues = [];
    return db.procurement_contract_issues.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 18.4: PROCUREMENT AUDIT, COMPLIANCE & ARP MANAGEMENT FOUNDATION ---

  async createARP(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_arps) db.procurement_arps = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_arps.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createARPItem(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_arp_items) db.procurement_arp_items = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      arpId: data.arpId || data.arp_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_arp_items.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createARPConsumption(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_arp_consumptions) db.procurement_arp_consumptions = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      arpItemId: data.arpItemId || data.arp_item_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_arp_consumptions.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createARPParticipant(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_arp_participants) db.procurement_arp_participants = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      arpId: data.arpId || data.arp_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_arp_participants.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createARPCarona(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_arp_caronas) db.procurement_arp_caronas = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      arpId: data.arpId || data.arp_id,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_arp_caronas.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createAuditEvent(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_audit_events) db.procurement_audit_events = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      eventType: data.eventType || data.event_type,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_audit_events.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async createComplianceEvent(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_compliance_events) db.procurement_compliance_events = [];
    const newRecord = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id || "org-oi-beta",
      workspaceId: data.workspaceId || data.workspace_id,
      eventType: data.eventType || data.event_type,
      status: data.status,
      metadata: data.metadata || data.metadata_json || null,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.procurement_compliance_events.push(newRecord);
    this.writeDB(db);
    return newRecord;
  }

  async getARPs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_arps) db.procurement_arps = [];
    return db.procurement_arps.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getARPItems(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_arp_items) db.procurement_arp_items = [];
    return db.procurement_arp_items.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getARPConsumptions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_arp_consumptions) db.procurement_arp_consumptions = [];
    return db.procurement_arp_consumptions.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getARPParticipants(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_arp_participants) db.procurement_arp_participants = [];
    return db.procurement_arp_participants.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getARPCaronas(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_arp_caronas) db.procurement_arp_caronas = [];
    return db.procurement_arp_caronas.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getAuditEvents(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_audit_events) db.procurement_audit_events = [];
    return db.procurement_audit_events.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getComplianceEvents(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_compliance_events) db.procurement_compliance_events = [];
    return db.procurement_compliance_events.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // Sprint 18.5 - Procurement Reporting & Executive Brief Foundation
  async createReport(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_reports) db.procurement_reports = [];
    const item = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.procurement_reports.push(item);
    this.writeDB(db);
    return item;
  }

  async createProcurementExecutiveBrief(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_executive_briefs) db.procurement_executive_briefs = [];
    const item = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.procurement_executive_briefs.push(item);
    this.writeDB(db);
    return item;
  }

  async createProcurementMonitoringSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_monitoring_snapshots) db.procurement_monitoring_snapshots = [];
    const item = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.procurement_monitoring_snapshots.push(item);
    this.writeDB(db);
    return item;
  }

  async createReportLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_report_logs) db.procurement_report_logs = [];
    const item = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.procurement_report_logs.push(item);
    this.writeDB(db);
    return item;
  }

  async getReports(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_reports) db.procurement_reports = [];
    return db.procurement_reports.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getReport(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_reports) db.procurement_reports = [];
    return db.procurement_reports.find((p: any) => p.id === id) || null;
  }

  async getProcurementExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_executive_briefs) db.procurement_executive_briefs = [];
    return db.procurement_executive_briefs.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getProcurementExecutiveBrief(id: string): Promise<any> {
    const db = this.readDB();
    if (!db.procurement_executive_briefs) db.procurement_executive_briefs = [];
    return db.procurement_executive_briefs.find((p: any) => p.id === id) || null;
  }

  async getProcurementMonitoringSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.procurement_monitoring_snapshots) db.procurement_monitoring_snapshots = [];
    return db.procurement_monitoring_snapshots.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 19.0: GOVERNMENT AMENDMENTS FOUNDATION ---
  async createParliamentarian(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_parliamentarians) db.government_parliamentarians = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_parliamentarians.push(item);
    this.writeDB(db);
    return item;
  }

  async createAmendment(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendments) db.government_amendments = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendments.push(item);
    this.writeDB(db);
    return item;
  }

  async createBeneficiary(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_beneficiaries) db.government_amendment_beneficiaries = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_beneficiaries.push(item);
    this.writeDB(db);
    return item;
  }

  async createDestination(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_destinations) db.government_amendment_destinations = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_destinations.push(item);
    this.writeDB(db);
    return item;
  }

  async createExecution(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_executions) db.government_amendment_executions = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_executions.push(item);
    this.writeDB(db);
    return item;
  }

  async getParliamentarians(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_parliamentarians) db.government_parliamentarians = [];
    return db.government_parliamentarians.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getAmendments(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendments) db.government_amendments = [];
    return db.government_amendments.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getBeneficiaries(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_beneficiaries) db.government_amendment_beneficiaries = [];
    return db.government_amendment_beneficiaries.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getDestinations(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_destinations) db.government_amendment_destinations = [];
    return db.government_amendment_destinations.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getExecutions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_executions) db.government_amendment_executions = [];
    return db.government_amendment_executions.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 19.1: GOVERNMENT AMENDMENT EXECUTION, MONITORING & ACCOUNTABILITY ---
  async createMilestone(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_milestones) db.government_amendment_milestones = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_milestones.push(item);
    this.writeDB(db);
    return item;
  }

  async createMonitoring(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_monitorings) db.government_amendment_monitorings = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_monitorings.push(item);
    this.writeDB(db);
    return item;
  }

  async createGovAmendmentEvidence(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_evidences) db.government_amendment_evidences = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_evidences.push(item);
    this.writeDB(db);
    return item;
  }

  async createAccountability(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_accountabilities) db.government_amendment_accountabilities = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_accountabilities.push(item);
    this.writeDB(db);
    return item;
  }

  async createIssue(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_issues) db.government_amendment_issues = [];
    const item = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    db.government_amendment_issues.push(item);
    this.writeDB(db);
    return item;
  }

  async getMilestones(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_milestones) db.government_amendment_milestones = [];
    return db.government_amendment_milestones.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_monitorings) db.government_amendment_monitorings = [];
    return db.government_amendment_monitorings.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getGovAmendmentEvidences(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_evidences) db.government_amendment_evidences = [];
    return db.government_amendment_evidences.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getAccountabilities(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_accountabilities) db.government_amendment_accountabilities = [];
    return db.government_amendment_accountabilities.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_issues) db.government_amendment_issues = [];
    return db.government_amendment_issues.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // Sprint 19.2 - Government Amendment Reporting, Executive Review & Accountability Database Operations
  async createGovernmentAmendmentReport(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_reports) db.government_amendment_reports = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "DRAFT",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_amendment_reports.push(item);
    this.writeDB(db);
    return item;
  }

  async createGovernmentAmendmentExecutiveBrief(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_executive_briefs) db.government_amendment_executive_briefs = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "DRAFT",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_amendment_executive_briefs.push(item);
    this.writeDB(db);
    return item;
  }

  async createGovernmentAmendmentSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_snapshots) db.government_amendment_snapshots = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "DRAFT",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_amendment_snapshots.push(item);
    this.writeDB(db);
    return item;
  }

  async createGovernmentAmendmentReview(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_reviews) db.government_amendment_reviews = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "DRAFT",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_amendment_reviews.push(item);
    this.writeDB(db);
    return item;
  }

  async createGovernmentAmendmentCycle(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_cycles) db.government_amendment_cycles = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "DRAFT",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_amendment_cycles.push(item);
    this.writeDB(db);
    return item;
  }

  async getGovernmentAmendmentReports(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_reports) db.government_amendment_reports = [];
    return db.government_amendment_reports.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getGovernmentAmendmentExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_executive_briefs) db.government_amendment_executive_briefs = [];
    return db.government_amendment_executive_briefs.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getGovernmentAmendmentSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_snapshots) db.government_amendment_snapshots = [];
    return db.government_amendment_snapshots.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getGovernmentAmendmentReviews(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_reviews) db.government_amendment_reviews = [];
    return db.government_amendment_reviews.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async getGovernmentAmendmentCycles(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_cycles) db.government_amendment_cycles = [];
    return db.government_amendment_cycles.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 20.0 - GOVERNMENT HEALTH INTELLIGENCE FOUNDATION ---
  async createHealthUnit(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_units) db.government_health_units = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_units.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthUnits(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_units) db.government_health_units = [];
    return db.government_health_units.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthTeam(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_teams) db.government_health_teams = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      unitId: data.unitId || data.unit_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_teams.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthTeams(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_teams) db.government_health_teams = [];
    return db.government_health_teams.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthProgram(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_programs) db.government_health_programs = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_programs.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_programs) db.government_health_programs = [];
    return db.government_health_programs.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthIndicator(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_indicators) db.government_health_indicators = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_indicators.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_indicators) db.government_health_indicators = [];
    return db.government_health_indicators.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthCoverage(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_coverages) db.government_health_coverages = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_coverages.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthCoverages(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_coverages) db.government_health_coverages = [];
    return db.government_health_coverages.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthProduction(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_productions) db.government_health_productions = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_productions.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthProductions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_productions) db.government_health_productions = [];
    return db.government_health_productions.filter(
      (p: any) =>
        (p.organizationId === organizationId || p.organization_id === organizationId) &&
        (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // SPRINT 20.1 - HEALTH PERFORMANCE & MONITORING FOUNDATION

  async createHealthGoal(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_goals) db.government_health_goals = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_goals.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthGoals(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_goals) db.government_health_goals = [];
    return db.government_health_goals.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthResult(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_results) db.government_health_results = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_results.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthResults(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_results) db.government_health_results = [];
    return db.government_health_results.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthMonitoring(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_monitorings) db.government_health_monitorings = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_monitorings.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_monitorings) db.government_health_monitorings = [];
    return db.government_health_monitorings.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthEvidence(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_evidences) db.government_health_evidences = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_evidences.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthEvidences(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_evidences) db.government_health_evidences = [];
    return db.government_health_evidences.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthIssue(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_issues) db.government_health_issues = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_issues.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_issues) db.government_health_issues = [];
    return db.government_health_issues.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createHealthSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_health_snapshots) db.government_health_snapshots = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_health_snapshots.push(item);
    this.writeDB(db);
    return item;
  }

  async getHealthSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_health_snapshots) db.government_health_snapshots = [];
    return db.government_health_snapshots.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // SPRINT 21.0 - EDUCATION INTELLIGENCE FOUNDATION

  async createEducationUnit(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_units) db.government_education_units = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_education_units.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationUnits(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_units) db.government_education_units = [];
    return db.government_education_units.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationTeam(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_teams) db.government_education_teams = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      unitId: data.unitId || data.unit_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_education_teams.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationTeams(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_teams) db.government_education_teams = [];
    return db.government_education_teams.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationProgram(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_programs) db.government_education_programs = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_education_programs.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_programs) db.government_education_programs = [];
    return db.government_education_programs.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationIndicator(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_indicators) db.government_education_indicators = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_education_indicators.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_indicators) db.government_education_indicators = [];
    return db.government_education_indicators.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationCoverage(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_coverages) db.government_education_coverages = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_education_coverages.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationCoverages(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_coverages) db.government_education_coverages = [];
    return db.government_education_coverages.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationProduction(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_productions) db.government_education_productions = [];
    const item = {
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      status: data.status || "NO_DATA",
      metadata: data.metadata || data.metadataJson || {},
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString()
    };
    db.government_education_productions.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationProductions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_productions) db.government_education_productions = [];
    return db.government_education_productions.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 21.1 - EDUCATION PERFORMANCE & MONITORING FOUNDATION ---

  async createEducationGoal(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_goals) db.government_education_goals = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_education_goals.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationGoals(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_goals) db.government_education_goals = [];
    return db.government_education_goals.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationResult(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_results) db.government_education_results = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_education_results.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationResults(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_results) db.government_education_results = [];
    return db.government_education_results.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationMonitoring(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_monitorings) db.government_education_monitorings = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_education_monitorings.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_monitorings) db.government_education_monitorings = [];
    return db.government_education_monitorings.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationEvidence(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_evidences) db.government_education_evidences = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_education_evidences.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationEvidences(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_evidences) db.government_education_evidences = [];
    return db.government_education_evidences.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationIssue(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_issues) db.government_education_issues = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_education_issues.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_issues) db.government_education_issues = [];
    return db.government_education_issues.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createEducationSnapshot(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_education_snapshots) db.government_education_snapshots = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_education_snapshots.push(item);
    this.writeDB(db);
    return item;
  }

  async getEducationSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_education_snapshots) db.government_education_snapshots = [];
    return db.government_education_snapshots.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  // --- SPRINT 19.3 - GOVERNMENT FUNDING OPPORTUNITY ---
  
  async getFundingOpportunities(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_funding_opportunities) db.government_funding_opportunities = [];
    return db.government_funding_opportunities.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createFundingOpportunity(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_opportunities) db.government_funding_opportunities = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_funding_opportunities.push(item);
    this.writeDB(db);
    return item;
  }
  
  async updateFundingOpportunity(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_opportunities) db.government_funding_opportunities = [];
    const index = db.government_funding_opportunities.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("Opportunity not found");
    db.government_funding_opportunities[index] = { ...db.government_funding_opportunities[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_funding_opportunities[index];
  }

  async getFundingPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_funding_programs) db.government_funding_programs = [];
    return db.government_funding_programs.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createFundingProgram(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_programs) db.government_funding_programs = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_funding_programs.push(item);
    this.writeDB(db);
    return item;
  }

  async getFundingNotices(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_funding_notices) db.government_funding_notices = [];
    return db.government_funding_notices.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createFundingNotice(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_notices) db.government_funding_notices = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_funding_notices.push(item);
    this.writeDB(db);
    return item;
  }

  async getFundingRequirements(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_funding_requirements) db.government_funding_requirements = [];
    return db.government_funding_requirements.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createFundingRequirement(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_requirements) db.government_funding_requirements = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_funding_requirements.push(item);
    this.writeDB(db);
    return item;
  }

  async getFundingProposals(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_funding_proposals) db.government_funding_proposals = [];
    return db.government_funding_proposals.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createFundingProposal(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_proposals) db.government_funding_proposals = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_funding_proposals.push(item);
    this.writeDB(db);
    return item;
  }

  async updateFundingProposal(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_proposals) db.government_funding_proposals = [];
    const index = db.government_funding_proposals.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("Proposal not found");
    db.government_funding_proposals[index] = { ...db.government_funding_proposals[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_funding_proposals[index];
  }

  async getFundingSubmissions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_funding_submissions) db.government_funding_submissions = [];
    return db.government_funding_submissions.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createFundingSubmission(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_funding_submissions) db.government_funding_submissions = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_funding_submissions.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 19.4: GOVERNMENT AMENDMENT STRATEGIC PLANNING & PORTFOLIO FOUNDATION ---
  
  async getAmendmentPortfolios(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_portfolios) db.government_amendment_portfolios = [];
    return db.government_amendment_portfolios.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createAmendmentPortfolio(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_portfolios) db.government_amendment_portfolios = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_amendment_portfolios.push(item);
    this.writeDB(db);
    return item;
  }
  
  async updateAmendmentPortfolio(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_portfolios) db.government_amendment_portfolios = [];
    const index = db.government_amendment_portfolios.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("Portfolio not found");
    db.government_amendment_portfolios[index] = { ...db.government_amendment_portfolios[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_amendment_portfolios[index];
  }

  async getAmendmentPortfolioItems(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_portfolio_items) db.government_amendment_portfolio_items = [];
    return db.government_amendment_portfolio_items.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createAmendmentPortfolioItem(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_portfolio_items) db.government_amendment_portfolio_items = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_amendment_portfolio_items.push(item);
    this.writeDB(db);
    return item;
  }
  
  async updateAmendmentPortfolioItem(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_portfolio_items) db.government_amendment_portfolio_items = [];
    const index = db.government_amendment_portfolio_items.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("Portfolio item not found");
    db.government_amendment_portfolio_items[index] = { ...db.government_amendment_portfolio_items[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_amendment_portfolio_items[index];
  }

  async getAmendmentPriorities(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_priorities) db.government_amendment_priorities = [];
    return db.government_amendment_priorities.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createAmendmentPriority(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_priorities) db.government_amendment_priorities = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_amendment_priorities.push(item);
    this.writeDB(db);
    return item;
  }
  
  async updateAmendmentPriority(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_priorities) db.government_amendment_priorities = [];
    const index = db.government_amendment_priorities.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("Priority not found");
    db.government_amendment_priorities[index] = { ...db.government_amendment_priorities[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_amendment_priorities[index];
  }

  async getAmendmentObjectives(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_objectives) db.government_amendment_objectives = [];
    return db.government_amendment_objectives.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createAmendmentObjective(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_objectives) db.government_amendment_objectives = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_amendment_objectives.push(item);
    this.writeDB(db);
    return item;
  }
  
  async updateAmendmentObjective(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_objectives) db.government_amendment_objectives = [];
    const index = db.government_amendment_objectives.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("Objective not found");
    db.government_amendment_objectives[index] = { ...db.government_amendment_objectives[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_amendment_objectives[index];
  }

  async getAmendmentActionPlans(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_action_plans) db.government_amendment_action_plans = [];
    return db.government_amendment_action_plans.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createAmendmentActionPlan(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_action_plans) db.government_amendment_action_plans = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_amendment_action_plans.push(item);
    this.writeDB(db);
    return item;
  }
  
  async updateAmendmentActionPlan(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_action_plans) db.government_amendment_action_plans = [];
    const index = db.government_amendment_action_plans.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("Action Plan not found");
    db.government_amendment_action_plans[index] = { ...db.government_amendment_action_plans[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_amendment_action_plans[index];
  }

  async getAmendmentFollowUps(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_amendment_followups) db.government_amendment_followups = [];
    return db.government_amendment_followups.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createAmendmentFollowUp(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_followups) db.government_amendment_followups = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_amendment_followups.push(item);
    this.writeDB(db);
    return item;
  }

  async updateAmendmentFollowUp(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_amendment_followups) db.government_amendment_followups = [];
    const index = db.government_amendment_followups.findIndex((i: any) => i.id === id);
    if (index === -1) throw new Error("FollowUp not found");
    db.government_amendment_followups[index] = { ...db.government_amendment_followups[index], ...data, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.government_amendment_followups[index];
  }


  // --- SPRINT 22.0: PORTAL DA TRANSPARENCIA INTELIGENTE FOUNDATION ---
  
  async getTransparencyPublications(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_publications) db.government_transparency_publications = [];
    return db.government_transparency_publications.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyPublication(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_publications) db.government_transparency_publications = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_publications.push(item);
    this.writeDB(db);
    return item;
  }
  
  async getTransparencyCategories(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_categories) db.government_transparency_categories = [];
    return db.government_transparency_categories.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyCategory(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_categories) db.government_transparency_categories = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_categories.push(item);
    this.writeDB(db);
    return item;
  }

  async getTransparencyDatasets(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_datasets) db.government_transparency_datasets = [];
    return db.government_transparency_datasets.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyDataset(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_datasets) db.government_transparency_datasets = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_datasets.push(item);
    this.writeDB(db);
    return item;
  }

  async getTransparencyIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_indicators) db.government_transparency_indicators = [];
    return db.government_transparency_indicators.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyIndicator(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_indicators) db.government_transparency_indicators = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_indicators.push(item);
    this.writeDB(db);
    return item;
  }

  async getTransparencyDocuments(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_documents) db.government_transparency_documents = [];
    return db.government_transparency_documents.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyDocument(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_documents) db.government_transparency_documents = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_documents.push(item);
    this.writeDB(db);
    return item;
  }

  async getTransparencyReports(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_reports) db.government_transparency_reports = [];
    return db.government_transparency_reports.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyReport(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_reports) db.government_transparency_reports = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_reports.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 22.1: GOVERNMENT OMBUDSMAN FOUNDATION ---
  
  async getOmbudsmanRequests(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_ombudsman_requests) db.government_ombudsman_requests = [];
    return db.government_ombudsman_requests.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createOmbudsmanRequest(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_ombudsman_requests) db.government_ombudsman_requests = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_ombudsman_requests.push(item);
    this.writeDB(db);
    return item;
  }
  
  async getOmbudsmanCategories(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_ombudsman_categories) db.government_ombudsman_categories = [];
    return db.government_ombudsman_categories.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createOmbudsmanCategory(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_ombudsman_categories) db.government_ombudsman_categories = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_ombudsman_categories.push(item);
    this.writeDB(db);
    return item;
  }

  async getOmbudsmanProtocols(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_ombudsman_protocols) db.government_ombudsman_protocols = [];
    return db.government_ombudsman_protocols.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createOmbudsmanProtocol(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_ombudsman_protocols) db.government_ombudsman_protocols = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_ombudsman_protocols.push(item);
    this.writeDB(db);
    return item;
  }

  async getOmbudsmanResponses(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_ombudsman_responses) db.government_ombudsman_responses = [];
    return db.government_ombudsman_responses.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createOmbudsmanResponse(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_ombudsman_responses) db.government_ombudsman_responses = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_ombudsman_responses.push(item);
    this.writeDB(db);
    return item;
  }

  async getOmbudsmanAttachments(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_ombudsman_attachments) db.government_ombudsman_attachments = [];
    return db.government_ombudsman_attachments.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createOmbudsmanAttachment(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_ombudsman_attachments) db.government_ombudsman_attachments = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_ombudsman_attachments.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 22.2: TRANSPARENCY ANALYTICS ---
  async getTransparencyMetrics(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_metrics) db.government_transparency_metrics = [];
    return db.government_transparency_metrics.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyMetric(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_metrics) db.government_transparency_metrics = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_metrics.push(item);
    this.writeDB(db);
    return item;
  }
  
  async getTransparencyKPIs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_kpis) db.government_transparency_kpis = [];
    return db.government_transparency_kpis.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyKPI(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_kpis) db.government_transparency_kpis = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_kpis.push(item);
    this.writeDB(db);
    return item;
  }

  async getTransparencyCompliances(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_compliance) db.government_transparency_compliance = [];
    return db.government_transparency_compliance.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyCompliance(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_compliance) db.government_transparency_compliance = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_compliance.push(item);
    this.writeDB(db);
    return item;
  }

  async getTransparencyAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_audits) db.government_transparency_audits = [];
    return db.government_transparency_audits.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyAudit(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_audits) db.government_transparency_audits = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_audits.push(item);
    this.writeDB(db);
    return item;
  }

  async getTransparencyMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_transparency_monitorings) db.government_transparency_monitorings = [];
    return db.government_transparency_monitorings.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }
  
  async createTransparencyMonitoring(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_transparency_monitorings) db.government_transparency_monitorings = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_transparency_monitorings.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 22.3: PUBLIC TRANSPARENCY PORTAL CONSOLIDATION ---
  async getPublicPortals(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_public_portals) db.government_public_portals = [];
    return db.government_public_portals.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createPublicPortal(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_public_portals) db.government_public_portals = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_public_portals.push(item);
    this.writeDB(db);
    return item;
  }

  async getPublicCatalogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_public_catalogs) db.government_public_catalogs = [];
    return db.government_public_catalogs.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createPublicCatalog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_public_catalogs) db.government_public_catalogs = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_public_catalogs.push(item);
    this.writeDB(db);
    return item;
  }

  async getPublicDatasets(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_public_datasets) db.government_public_datasets = [];
    return db.government_public_datasets.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createPublicDataset(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_public_datasets) db.government_public_datasets = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_public_datasets.push(item);
    this.writeDB(db);
    return item;
  }

  async getPublicPublications(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_public_publications) db.government_public_publications = [];
    return db.government_public_publications.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createPublicPublication(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_public_publications) db.government_public_publications = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_public_publications.push(item);
    this.writeDB(db);
    return item;
  }

  async getPublicQueries(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_public_queries) db.government_public_queries = [];
    return db.government_public_queries.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createPublicQuery(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_public_queries) db.government_public_queries = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_public_queries.push(item);
    this.writeDB(db);
    return item;
  }

  async getPublicAccessLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_public_access_logs) db.government_public_access_logs = [];
    return db.government_public_access_logs.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createPublicAccessLog(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_public_access_logs) db.government_public_access_logs = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_public_access_logs.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 23.0: PREFEITURA ZERO PAPEL ---

  async getProtocols(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_protocols) db.government_protocols = [];
    return db.government_protocols.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProtocol(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_protocols) db.government_protocols = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_protocols.push(item);
    this.writeDB(db);
    return item;
  }

  async getProcesses(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_processes) db.government_processes = [];
    return db.government_processes.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProcess(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_processes) db.government_processes = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_processes.push(item);
    this.writeDB(db);
    return item;
  }

  async getDocumentRecords(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_document_records) db.government_document_records = [];
    return db.government_document_records.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDocumentRecord(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_document_records) db.government_document_records = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_document_records.push(item);
    this.writeDB(db);
    return item;
  }

  async getDispatches(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_dispatches) db.government_dispatches = [];
    return db.government_dispatches.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDispatch(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_dispatches) db.government_dispatches = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_dispatches.push(item);
    this.writeDB(db);
    return item;
  }

  async getRoutings(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_routings) db.government_routings = [];
    return db.government_routings.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createRouting(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_routings) db.government_routings = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_routings.push(item);
    this.writeDB(db);
    return item;
  }

  async getProcessSteps(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_process_steps) db.government_process_steps = [];
    return db.government_process_steps.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProcessStep(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_process_steps) db.government_process_steps = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_process_steps.push(item);
    this.writeDB(db);
    return item;
  }

  async getProcessHistories(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_process_history) db.government_process_history = [];
    return db.government_process_history.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProcessHistory(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_process_history) db.government_process_history = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_process_history.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 23.1: PROTOCOL & PROCESS MANAGEMENT FOUNDATION ---

  async getDepartments(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_departments) db.government_departments = [];
    return db.government_departments.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDepartment(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_departments) db.government_departments = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_departments.push(item);
    this.writeDB(db);
    return item;
  }

  async getProtocolQueues(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_protocol_queues) db.government_protocol_queues = [];
    return db.government_protocol_queues.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProtocolQueue(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_protocol_queues) db.government_protocol_queues = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_protocol_queues.push(item);
    this.writeDB(db);
    return item;
  }

  async getProcessAssignments(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_process_assignments) db.government_process_assignments = [];
    return db.government_process_assignments.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProcessAssignment(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_process_assignments) db.government_process_assignments = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_process_assignments.push(item);
    this.writeDB(db);
    return item;
  }

  async getProcessMovements(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_process_movements) db.government_process_movements = [];
    return db.government_process_movements.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProcessMovement(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_process_movements) db.government_process_movements = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_process_movements.push(item);
    this.writeDB(db);
    return item;
  }

  async getProcessResponsibles(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_process_responsibles) db.government_process_responsibles = [];
    return db.government_process_responsibles.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProcessResponsible(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_process_responsibles) db.government_process_responsibles = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_process_responsibles.push(item);
    this.writeDB(db);
    return item;
  }

  async getProcessSectors(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_process_sectors) db.government_process_sectors = [];
    return db.government_process_sectors.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createProcessSector(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_process_sectors) db.government_process_sectors = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_process_sectors.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 23.2: WORKFLOW & ROUTING FOUNDATION ---

  async getWorkflows(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workflows) db.government_workflows = [];
    return db.government_workflows.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createWorkflow(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workflows) db.government_workflows = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_workflows.push(item);
    this.writeDB(db);
    return item;
  }

  async getWorkflowStages(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workflow_stages) db.government_workflow_stages = [];
    return db.government_workflow_stages.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createWorkflowStage(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workflow_stages) db.government_workflow_stages = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_workflow_stages.push(item);
    this.writeDB(db);
    return item;
  }

  async getWorkflowTransitions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workflow_transitions) db.government_workflow_transitions = [];
    return db.government_workflow_transitions.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createWorkflowTransition(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workflow_transitions) db.government_workflow_transitions = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_workflow_transitions.push(item);
    this.writeDB(db);
    return item;
  }

  async getWorkflowQueues(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workflow_queues) db.government_workflow_queues = [];
    return db.government_workflow_queues.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createWorkflowQueue(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workflow_queues) db.government_workflow_queues = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_workflow_queues.push(item);
    this.writeDB(db);
    return item;
  }

  async getWorkflowExecutions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workflow_executions) db.government_workflow_executions = [];
    return db.government_workflow_executions.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createWorkflowExecution(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workflow_executions) db.government_workflow_executions = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_workflow_executions.push(item);
    this.writeDB(db);
    return item;
  }

  async getWorkflowRoutes(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_workflow_routes) db.government_workflow_routes = [];
    return db.government_workflow_routes.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createWorkflowRoute(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_workflow_routes) db.government_workflow_routes = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_workflow_routes.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 23.3: DOCUMENT LIFECYCLE FOUNDATION ---

  async getDocumentVersions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_document_versions) db.government_document_versions = [];
    return db.government_document_versions.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDocumentVersion(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_document_versions) db.government_document_versions = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_document_versions.push(item);
    this.writeDB(db);
    return item;
  }

  async getDocumentClassifications(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_document_classifications) db.government_document_classifications = [];
    return db.government_document_classifications.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDocumentClassification(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_document_classifications) db.government_document_classifications = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_document_classifications.push(item);
    this.writeDB(db);
    return item;
  }

  async getDocumentRetentions(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_document_retentions) db.government_document_retentions = [];
    return db.government_document_retentions.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDocumentRetention(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_document_retentions) db.government_document_retentions = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_document_retentions.push(item);
    this.writeDB(db);
    return item;
  }

  async getDocumentArchives(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_document_archives) db.government_document_archives = [];
    return db.government_document_archives.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDocumentArchive(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_document_archives) db.government_document_archives = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_document_archives.push(item);
    this.writeDB(db);
    return item;
  }

  async getDocumentMovements(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_document_movements) db.government_document_movements = [];
    return db.government_document_movements.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDocumentMovement(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_document_movements) db.government_document_movements = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_document_movements.push(item);
    this.writeDB(db);
    return item;
  }

  async getDocumentAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_document_audits) db.government_document_audits = [];
    return db.government_document_audits.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createDocumentAudit(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_document_audits) db.government_document_audits = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_document_audits.push(item);
    this.writeDB(db);
    return item;
  }

  // --- SPRINT 23.4: ADMINISTRATIVE GOVERNANCE FOUNDATION ---

  async getAdministrativeIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_administrative_indicators) db.government_administrative_indicators = [];
    return db.government_administrative_indicators.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createAdministrativeIndicator(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_administrative_indicators) db.government_administrative_indicators = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_administrative_indicators.push(item);
    this.writeDB(db);
    return item;
  }

  async getAdministrativeAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_administrative_audits) db.government_administrative_audits = [];
    return db.government_administrative_audits.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createAdministrativeAudit(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_administrative_audits) db.government_administrative_audits = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_administrative_audits.push(item);
    this.writeDB(db);
    return item;
  }

  async getAdministrativeCompliances(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_administrative_compliances) db.government_administrative_compliances = [];
    return db.government_administrative_compliances.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createAdministrativeCompliance(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_administrative_compliances) db.government_administrative_compliances = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_administrative_compliances.push(item);
    this.writeDB(db);
    return item;
  }

  async getAdministrativeResponsibilities(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_administrative_responsibilities) db.government_administrative_responsibilities = [];
    return db.government_administrative_responsibilities.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createAdministrativeResponsibility(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_administrative_responsibilities) db.government_administrative_responsibilities = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_administrative_responsibilities.push(item);
    this.writeDB(db);
    return item;
  }

  async getAdministrativeMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_administrative_monitorings) db.government_administrative_monitorings = [];
    return db.government_administrative_monitorings.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createAdministrativeMonitoring(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_administrative_monitorings) db.government_administrative_monitorings = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_administrative_monitorings.push(item);
    this.writeDB(db);
    return item;
  }

  async getAdministrativeOccurrences(organizationId: string, workspaceId: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.government_administrative_occurrences) db.government_administrative_occurrences = [];
    return db.government_administrative_occurrences.filter(
      (p: any) => (p.organizationId === organizationId || p.organization_id === organizationId) && (p.workspaceId === workspaceId || p.workspace_id === workspaceId)
    );
  }

  async createAdministrativeOccurrence(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.government_administrative_occurrences) db.government_administrative_occurrences = [];
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || new Date().toISOString(),
      updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
    };
    db.government_administrative_occurrences.push(item);
    this.writeDB(db);
    return item;
  }

  async getCommercialOpportunities(organizationId: string, workspaceId?: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.commercial_opportunities) db.commercial_opportunities = [];

    return db.commercial_opportunities
      .filter((opportunity: any) => {
        const sameOrganization = opportunity.organizationId === organizationId || opportunity.organization_id === organizationId;
        const sameWorkspace = !workspaceId || opportunity.workspaceId === workspaceId || opportunity.workspace_id === workspaceId;
        return sameOrganization && sameWorkspace;
      })
      .sort((a: any, b: any) => String(b.createdAt || b.created_at || '').localeCompare(String(a.createdAt || a.created_at || '')));
  }

  async createCommercialOpportunity(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.commercial_opportunities) db.commercial_opportunities = [];

    const now = new Date().toISOString();
    const item = {
      ...data,
      id: data.id || crypto.randomUUID(),
      status: data.status || 'new',
      priority: data.priority || 'medium',
      organizationId: data.organizationId || data.organization_id,
      workspaceId: data.workspaceId || data.workspace_id,
      createdAt: data.createdAt || data.created_at || now,
      updatedAt: data.updatedAt || data.updated_at || now,
    };

    db.commercial_opportunities.unshift(item);
    this.writeDB(db);
    return item;
  }

  async updateCommercialOpportunity(id: string, organizationId: string, workspaceId: string | undefined, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.commercial_opportunities) db.commercial_opportunities = [];
    const index = db.commercial_opportunities.findIndex((opportunity: any) => {
      const sameOrganization = opportunity.organizationId === organizationId || opportunity.organization_id === organizationId;
      const sameWorkspace = !workspaceId || opportunity.workspaceId === workspaceId || opportunity.workspace_id === workspaceId;
      return opportunity.id === id && sameOrganization && sameWorkspace;
    });
    if (index < 0) throw new Error('Commercial opportunity not found');
    db.commercial_opportunities[index] = { ...db.commercial_opportunities[index], ...data, id, organizationId, workspaceId, updatedAt: new Date().toISOString() };
    this.writeDB(db);
    return db.commercial_opportunities[index];
  }

  async deleteCommercialOpportunity(id: string, organizationId: string, workspaceId?: string): Promise<any> {
    const db = this.readDB();
    if (!db.commercial_opportunities) db.commercial_opportunities = [];

    const before = db.commercial_opportunities.length;
    db.commercial_opportunities = db.commercial_opportunities.filter((opportunity: any) => {
      const sameId = opportunity.id === id;
      const sameOrganization = opportunity.organizationId === organizationId || opportunity.organization_id === organizationId;
      const sameWorkspace = !workspaceId || opportunity.workspaceId === workspaceId || opportunity.workspace_id === workspaceId;
      return !(sameId && sameOrganization && sameWorkspace);
    });

    this.writeDB(db);
    return { success: db.commercial_opportunities.length < before };
  }

  async getCommercialRadarSyncRuns(organizationId: string, workspaceId?: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.commercial_radar_sync_runs) db.commercial_radar_sync_runs = [];
    return db.commercial_radar_sync_runs.filter((run: any) => {
      const sameOrganization = run.organizationId === organizationId || run.organization_id === organizationId;
      const sameWorkspace = !workspaceId || run.workspaceId === workspaceId || run.workspace_id === workspaceId;
      return sameOrganization && sameWorkspace;
    }).sort((a: any, b: any) => String(b.startedAt || b.started_at || '').localeCompare(String(a.startedAt || a.started_at || '')));
  }

  async createCommercialRadarSyncRun(data: any): Promise<any> {
    const db = this.readDB();
    if (!db.commercial_radar_sync_runs) db.commercial_radar_sync_runs = [];
    db.commercial_radar_sync_runs.unshift(data);
    this.writeDB(db);
    return data;
  }

  async updateCommercialRadarSyncRun(id: string, organizationId: string, workspaceId: string | undefined, data: any): Promise<any> {
    const db = this.readDB();
    if (!db.commercial_radar_sync_runs) db.commercial_radar_sync_runs = [];
    const index = db.commercial_radar_sync_runs.findIndex((run: any) => run.id === id && (run.organizationId === organizationId || run.organization_id === organizationId) && (!workspaceId || run.workspaceId === workspaceId || run.workspace_id === workspaceId));
    if (index < 0) throw new Error('Radar sync run not found');
    db.commercial_radar_sync_runs[index] = { ...db.commercial_radar_sync_runs[index], ...data, id, organizationId, workspaceId };
    this.writeDB(db);
    return db.commercial_radar_sync_runs[index];
  }

  async getCommercialTasks(organizationId: string, workspaceId?: string): Promise<any[]> {
    const db = this.readDB();
    if (!db.commercial_tasks) db.commercial_tasks = [];

    return db.commercial_tasks
      .filter((task: any) => {
        const sameOrganization = task.organizationId === organizationId || task.organization_id === organizationId;
        const sameWorkspace = !workspaceId || task.workspaceId === workspaceId || task.workspace_id === workspaceId;
        return sameOrganization && sameWorkspace;
      })
      .sort((a: any, b: any) => String(b.createdAt || b.created_at || '').localeCompare(String(a.createdAt || a.created_at || '')));
  }

  async createCommercialTasks(data: any[]): Promise<any[]> {
    const db = this.readDB();
    if (!db.commercial_tasks) db.commercial_tasks = [];

    const now = new Date().toISOString();
    const created = data
      .filter((task: any) => !db.commercial_tasks.some((existing: any) => existing.id === task.id))
      .map((task: any) => ({
        ...task,
        id: task.id || crypto.randomUUID(),
        status: task.status || 'pending',
        organizationId: task.organizationId || task.organization_id,
        workspaceId: task.workspaceId || task.workspace_id,
        relatedProductId: task.relatedProductId || task.related_product_id,
        sourceOpportunityId: task.sourceOpportunityId || task.source_opportunity_id,
        createdAt: task.createdAt || task.created_at || now,
        updatedAt: task.updatedAt || task.updated_at || now,
      }));

    db.commercial_tasks.unshift(...created);
    this.writeDB(db);
    return created;
  }

  async clearCommercialTasks(organizationId: string, workspaceId?: string): Promise<any> {
    const db = this.readDB();
    if (!db.commercial_tasks) db.commercial_tasks = [];

    const before = db.commercial_tasks.length;
    db.commercial_tasks = db.commercial_tasks.filter((task: any) => {
      const sameOrganization = task.organizationId === organizationId || task.organization_id === organizationId;
      const sameWorkspace = !workspaceId || task.workspaceId === workspaceId || task.workspace_id === workspaceId;
      return !(sameOrganization && sameWorkspace);
    });

    this.writeDB(db);
    return { success: true, deletedCount: before - db.commercial_tasks.length };
  }

}
