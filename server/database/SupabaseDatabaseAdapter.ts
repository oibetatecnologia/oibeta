import { createClient, SupabaseClient } from "@supabase/supabase-js";
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

function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapToSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(mapToSnakeCase);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnakeCase(key);
    result[snakeKey] = mapToSnakeCase(obj[key]);
  }
  return result;
}

function mapToCamelCase(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(mapToCamelCase);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamelCase(key);
    result[camelKey] = mapToCamelCase(obj[key]);
  }
  return result;
}

export class SupabaseDatabaseAdapter implements DatabaseAdapter {
  private client: SupabaseClient | null = null;

  public getAuthClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Supabase authentication configuration missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are defined.",
      );
    }

    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  public getClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.SUPABASE_URL;
      const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error(
          "Supabase configuration missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY are defined in environment variables.",
        );
      }
      this.client = createClient(url, key);
    }
    return this.client;
  }

  async getCrmGovClients(organizationId: string, workspaceId?: string): Promise<any[]> {
    let query = this.getClient()
      .from("crm_gov_clients")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async replaceCrmGovClients(organizationId: string, workspaceId: string, data: any[]): Promise<any[]> {
    const client = this.getClient();

    const { error: deleteError } = await client
      .from("crm_gov_clients")
      .delete()
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);

    if (deleteError) throw deleteError;

    if (data.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const payload = data.map((record) => mapToSnakeCase({
      ...record,
      id: record.id || crypto.randomUUID(),
      organizationId,
      workspaceId,
      createdAt: record.createdAt || now,
      updatedAt: record.updatedAt || now,
    }));

    const { data: inserted, error } = await client
      .from("crm_gov_clients")
      .insert(payload)
      .select();

    if (error) throw error;
    return mapToCamelCase(inserted || []);
  }

  async getProjects(userId: string, organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching projects from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data || []);
  }

  async getProjectById(
    projectId: string,
    userId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<any> {
    const supabase = this.getClient();
    let query = supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return null; // No rows returned
      console.error("Error fetching project by ID from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data);
  }

  async createProject(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "proj_" + Math.random().toString(36).substr(2, 9),
      name: data.name,
      description: data.description || "",
      status: data.status || "active",
      last_stop_point: data.lastStopPoint || "",
      user_id: data.userId || "dev-user-douglas",
      organization_id: data.organizationId || "org-oi-beta",
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("projects")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Error creating project in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateProject(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const updatePayload = mapToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    const { data: updated, error } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating project in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async deleteProject(id: string): Promise<any> {
    const supabase = this.getClient();

    // Perform deletions (Cascade rules in SQL will clean related tables automatically,
    // but we can query them iteratively to match behavior exactly)
    await Promise.all([
      supabase.from("project_contexts").delete().eq("project_id", id),
      supabase.from("tasks").delete().eq("project_id", id),
      supabase.from("decisions").delete().eq("project_id", id),
      supabase.from("memories").delete().eq("project_id", id),
      supabase.from("messages").delete().eq("project_id", id),
    ]);

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.error("Error deleting project in Supabase:", error);
      throw error;
    }
    return { success: true };
  }

  async getTasks(projectId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .eq("workspace_id", workspaceId);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tasks from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data || []);
  }

  async createTask(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "task_" + Math.random().toString(36).substr(2, 9),
      project_id: data.projectId,
      title: data.title,
      description: data.description || "",
      status: data.status || "pending",
      priority: data.priority || "média",
      due_date: data.dueDate || null,
      user_id: data.userId || "dev-user-douglas",
      organization_id: data.organizationId || "org-oi-beta",
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Error creating task in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateTask(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const updatePayload = mapToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    const { data: updated, error } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating task in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async deleteTask(id: string): Promise<any> {
    const supabase = this.getClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting task in Supabase:", error);
      throw error;
    }
    return { success: true };
  }

  async getDecisions(projectId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("decisions")
      .select("*")
      .eq("project_id", projectId)
      .eq("workspace_id", workspaceId);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching decisions from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data || []);
  }

  async createDecision(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "dec_" + Math.random().toString(36).substr(2, 9),
      project_id: data.projectId,
      title: data.title,
      description: data.description || "",
      content: data.content || "",
      reason: data.reason || "",
      impact: data.impact || "médio",
      importance: data.importance || "média",
      user_id: data.userId || "dev-user-douglas",
      organization_id: data.organizationId || "org-oi-beta",
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("decisions")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Error creating decision in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateDecision(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const updatePayload = mapToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    const { data: updated, error } = await supabase
      .from("decisions")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating decision in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async deleteDecision(id: string): Promise<any> {
    const supabase = this.getClient();
    const { error } = await supabase.from("decisions").delete().eq("id", id);

    if (error) {
      console.error("Error deleting decision in Supabase:", error);
      throw error;
    }
    return { success: true };
  }

  async getMemories(projectId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("memories").select("*").eq("workspace_id", workspaceId);
    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching memories from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data || []);
  }

  async createMemory(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "mem_" + Math.random().toString(36).substr(2, 9),
      project_id: data.projectId || null,
      content: data.content,
      type: data.type || "contexto",
      importance: data.importance || "média",
      tags: data.tags || [],
      source: data.source || "",
      user_id: data.userId || "dev-user-douglas",
      organization_id: data.organizationId || "org-oi-beta",
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("memories")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Error creating memory in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateMemory(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const updatePayload = mapToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    const { data: updated, error } = await supabase
      .from("memories")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating memory in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async deleteMemory(id: string): Promise<any> {
    const supabase = this.getClient();
    const { error } = await supabase.from("memories").delete().eq("id", id);

    if (error) {
      console.error("Error deleting memory in Supabase:", error);
      throw error;
    }
    return { success: true };
  }

  async getMessages(projectId: string | undefined, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("messages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching messages from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data || []);
  }

  async createMessage(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "msg_" + Math.random().toString(36).substr(2, 9),
      project_id: data.projectId || null,
      user_id: data.userId || "dev-user-douglas",
      organization_id: data.organizationId || "org-oi-beta",
      sender: data.sender || "user",
      content: data.content,
      suggestions: data.suggestions || null,
      created_at: data.createdAt || new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("Error creating message in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getProjectContext(projectId: string, workspaceId: string): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("project_contexts")
      .select("*")
      .eq("project_id", projectId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("Error fetching project context from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data);
  }

  async saveProjectContext(projectId: string, context: any): Promise<any> {
    const supabase = this.getClient();

    // Check if context has active record to determine insert vs update
    const existing = await this.getProjectContext(projectId, "default-workspace");

    const record = {
      project_id: projectId,
      project_name: context.projectName || "",
      current_objective: context.currentObjective || "",
      current_stage: context.currentStage || "",
      last_stop_point: context.lastStopPoint || "",
      recent_decisions: context.recentDecisions || [],
      pending_tasks: context.pendingTasks || [],
      executive_summary: context.executiveSummary || "",
      next_recommended_action: context.nextRecommendedAction || "",
      important_memories: context.importantMemories || [],
      risks: context.risks || [],
      confidence_score: context.confidenceScore ?? 85,
      last_updated_date: context.lastUpdatedDate || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await supabase
        .from("project_contexts")
        .update(record)
        .eq("project_id", projectId)
        .select()
        .single();
      if (error) {
        console.error("Error updating project context in Supabase:", error);
        throw error;
      }
      return mapToCamelCase(data);
    } else {
      const { data, error } = await supabase
        .from("project_contexts")
        .insert(record)
        .select()
        .single();
      if (error) {
        console.error("Error inserting project context in Supabase:", error);
        throw error;
      }
      return mapToCamelCase(data);
    }
  }

  async getActionLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("action_history").select("*").eq("organization_id", organizationId);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[DatabaseAdapter] Error fetching action_history from Supabase:", error);
      throw error;
    }
    if (!data || data.length === 0) return [];
    return mapToCamelCase(data);
  }

  async createActionLog(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "act_" + Math.random().toString(36).substr(2, 9),
      organization_id: data.organizationId || "org-oi-beta",
      workspace_id: data.workspaceId || null,
      entity_type: data.entityType || "UNKNOWN",
      entity_id: data.entityId || "UNKNOWN",
      actor_id: data.actorId || data.userId || "system",
      action_type: data.actionType,
      metadata_json: data.metadataJson || data.actionDescription ? { description: data.actionDescription } : {},
      created_at: data.createdAt || new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase
      .from("action_history")
      .insert(record)
      .select()
      .single();
    if (error) {
      console.error("[DatabaseAdapter] Error creating action_history in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getActionExecutionLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("action_execution_logs").select("*").eq("organization_id", organizationId);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[DatabaseAdapter] Error fetching action_execution_logs from Supabase:", error);
      throw error;
    }
    if (!data || data.length === 0) return [];
    return mapToCamelCase(data);
  }

  async createActionExecutionLog(data: any): Promise<any> {
    const supabase = this.getClient();
    const record: any = {
      id: data.id || "ael_" + Math.random().toString(36).substr(2, 9),
      organization_id: data.organizationId || "org-oi-beta",
      workspace_id: data.workspaceId || null,
      execution_type: data.executionType || data.intentType || "UNKNOWN",
      execution_status: data.executionStatus || (data.errorReturned ? "ERROR" : "SUCCESS"),
      execution_result: data.executionResult || data.errorReturned || (data.executed ? "EXECUTED" : "PENDING"),
      metadata_json: data.metadataJson || { confidence: data.confidence, executionTime: data.executionTime },
      created_at: data.createdAt || new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase
      .from("action_execution_logs")
      .insert(record)
      .select()
      .single();
    if (error) {
      console.error("[DatabaseAdapter] Error creating action_execution_logs in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  private fallbackObjectives: any[] = [];
  private fallbackWorkspaceStates: any[] = [];
  private fallbackAIConnections: any[] = [];

  async getObjectives(projectId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    try {
      const { data, error } = await supabase
        .from("objectives")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return mapToCamelCase(data || []);
    } catch (e) {
      console.warn("Table objectives not found or errored. Using fallback.", e);
      return this.fallbackObjectives.filter((o) => o.projectId === projectId);
    }
  }

  async createObjective(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "obj_" + Math.random().toString(36).substr(2, 9),
      project_id: data.projectId,
      title: data.title,
      description: data.description || "",
      status: data.status || "pending",
      task_id: data.taskId || null,
      user_id: data.userId || "dev-user-douglas",
      organization_id: data.organizationId || "org-oi-beta",
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: data.updatedAt || new Date().toISOString(),
    };
    try {
      const { data: inserted, error } = await supabase
        .from("objectives")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(inserted);
    } catch (e) {
      console.warn(
        "Failed to create objective in Supabase. Using fallback.",
        e,
      );
      const camelCaseRecord = mapToCamelCase(record);
      this.fallbackObjectives.push(camelCaseRecord);
      return camelCaseRecord;
    }
  }

  async updateObjective(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const updatePayload = mapToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    try {
      const { data: updated, error } = await supabase
        .from("objectives")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(updated);
    } catch (e) {
      console.warn(
        "Failed to update objective in Supabase. Using fallback.",
        e,
      );
      const idx = this.fallbackObjectives.findIndex((o) => o.id === id);
      if (idx > -1) {
        this.fallbackObjectives[idx] = {
          ...this.fallbackObjectives[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        return this.fallbackObjectives[idx];
      }
      return null;
    }
  }

  async deleteObjective(id: string): Promise<any> {
    const supabase = this.getClient();
    try {
      const { error } = await supabase.from("objectives").delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.warn(
        "Failed to delete objective in Supabase. Using fallback.",
        e,
      );
      this.fallbackObjectives = this.fallbackObjectives.filter(
        (o) => o.id !== id,
      );
      return { success: true };
    }
  }

  async getWorkspaceState(
    userId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<any> {
    const supabase = this.getClient();
    try {
      const { data, error } = await supabase
        .from("workspace_states")
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapToCamelCase(data) : null;
    } catch (e) {
      console.warn("workspace_states table not accessible. Using fallback.", e);
      const state = this.fallbackWorkspaceStates.find(
        (s) =>
          s.userId === userId &&
          s.organizationId === organizationId &&
          s.workspaceId === workspaceId,
      );
      return state || null;
    }
  }

  async saveWorkspaceState(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "ws_" + Math.random().toString(36).substr(2, 9),
      user_id: data.userId,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      active_project_id: data.activeProjectId || null,
      active_specialization: data.activeSpecialization || null,
      last_context: data.lastContext || null,
      updated_at: new Date().toISOString(),
    };
    try {
      const { data: upserted, error } = await supabase
        .from("workspace_states")
        .upsert(record, { onConflict: "user_id,organization_id,workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(upserted);
    } catch (e) {
      console.warn(
        "Upserting workspace state in Supabase failed. Updating fallback.",
        e,
      );
      const idx = this.fallbackWorkspaceStates.findIndex(
        (s) =>
          s.userId === data.userId &&
          s.organizationId === data.organizationId &&
          s.workspaceId === data.workspaceId,
      );
      const camelCaseRecord = mapToCamelCase(record);
      if (idx > -1) {
        this.fallbackWorkspaceStates[idx] = {
          ...this.fallbackWorkspaceStates[idx],
          ...camelCaseRecord,
        };
        return this.fallbackWorkspaceStates[idx];
      } else {
        this.fallbackWorkspaceStates.push(camelCaseRecord);
        return camelCaseRecord;
      }
    }
  }

  // --- Sprint 7 SQL wrappers ---
  async createKnowledgeNode(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "node_" + Math.random().toString(36).substr(2, 9),
      organization_id: data.organizationId || "org-oi-beta",
      project_id: data.projectId || null,
      workspace_id: data.workspaceId || data.workspace_id || data.projectId || "default-workspace",
      node_type: data.nodeType,
      title: data.title,
      description: data.description || "",
      metadata: data.metadata || {},
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase
      .from("knowledge_nodes")
      .insert(record)
      .select()
      .single();
    if (error) {
      console.error("Error creating knowledge node in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getKnowledgeNodes(
    organizationId: string,
    projectId: string | undefined,
    workspaceId: string,
  ): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("knowledge_nodes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching knowledge nodes from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data || []);
  }

  async getKnowledgeNodeBySourceAndType(
    organizationId: string,
    sourceId: string,
    nodeType: string,
    workspaceId: string,
  ): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("knowledge_nodes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("node_type", nodeType)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error(
        "Error fetching knowledge node by source and type from Supabase:",
        error,
      );
      throw error;
    }

    const match = (data || []).find(
      (n) =>
        n.id === sourceId ||
        (n.metadata &&
          (n.metadata.sourceId === sourceId ||
            n.metadata.source_id === sourceId)),
    );
    return match ? mapToCamelCase(match) : null;
  }

  async createKnowledgeRelation(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "rel_" + Math.random().toString(36).substr(2, 9),
      organization_id: data.organizationId || "org-oi-beta",
      workspace_id: data.workspaceId || data.workspace_id || "default-workspace",
      source_node_id: data.sourceNodeId,
      target_node_id: data.targetNodeId,
      relation_type: data.relationType,
      created_at: data.createdAt || new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("knowledge_relations")
      .upsert(record, {
        onConflict: "source_node_id,target_node_id,relation_type",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating knowledge relation in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getKnowledgeRelations(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("knowledge_relations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) {
      console.error("Error fetching knowledge relations from Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data || []);
  }

  async updateKnowledgeNode(id: string, updates: any): Promise<any> {
    const supabase = this.getClient();
    const record = mapToSnakeCase(updates);
    const { data, error } = await supabase
      .from("knowledge_nodes")
      .update(record)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Error updating knowledge node in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(data);
  }

  async deleteKnowledgeNode(id: string): Promise<boolean> {
    const supabase = this.getClient();
    // Delete relations first as constraints
    await supabase
      .from("knowledge_relations")
      .delete()
      .or(`source_node_id.eq.${id},target_node_id.eq.${id}`);
    const { error } = await supabase
      .from("knowledge_nodes")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error deleting knowledge node in Supabase:", error);
      throw error;
    }
    return true;
  }

  async deleteKnowledgeRelation(id: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from("knowledge_relations")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error deleting knowledge relation in Supabase:", error);
      throw error;
    }
    return true;
  }

  async getContinuitySnapshot(projectId: string, workspaceId: string): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("project_continuity_snapshots")
      .select("*")
      .eq("project_id", projectId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      console.error(
        "Error fetching project continuity snapshot from Supabase:",
        error,
      );
      throw error;
    }
    return mapToCamelCase(data);
  }

  async saveContinuitySnapshot(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "snp_" + Math.random().toString(36).substr(2, 9),
      organization_id: data.organizationId,
      project_id: data.projectId,
      summary: data.summary || "",
      current_objective: data.currentObjective || "",
      current_stage: data.currentStage || "",
      last_stop_point: data.lastStopPoint || "",
      pending_items: data.pendingItems || [],
      risks: data.risks || [],
      recommended_next_action: data.recommendedNextAction || "",
      confidence_score: data.confidenceScore || 1.0,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from("project_continuity_snapshots")
      .upsert(record, { onConflict: "project_id" })
      .select()
      .single();
    if (error) {
      console.error(
        "Error upserting project continuity snapshot in Supabase:",
        error,
      );
      throw error;
    }
    return mapToCamelCase(upserted);
  }

  async getAIConnections(organizationId: string, workspaceId?: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("ai_connections").select("*").eq("organization_id", organizationId);
    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }
    const { data, error } = await query;
    if (error) {
      console.error("[DatabaseAdapter] Error fetching ai_connections from Supabase:", error);
      throw error;
    }
    if (!data || data.length === 0) return [];
    return mapToCamelCase(data);
  }

  async createAIConnection(data: any): Promise<any> {
    const supabase = this.getClient();
    const record = {
      id: data.id || "con_" + Math.random().toString(36).substr(2, 9),
      organization_id: data.organizationId,
      workspace_id: data.workspaceId || null,
      user_id: data.userId || null,
      provider: data.provider,
      connection_name: data.connectionName,
      api_key_encrypted: data.apiKeyEncrypted,
      base_url: data.baseUrl || null,
      model: data.model || null,
      status: data.status || "active",
      is_default: !!data.isDefault,
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (record.is_default) {
      await supabase
        .from("ai_connections")
        .update({ is_default: false })
        .eq("organization_id", record.organization_id);
    }

    const { data: inserted, error } = await supabase
      .from("ai_connections")
      .insert(record)
      .select()
      .single();
      
    if (error) {
      console.error("[DatabaseAdapter] Error creating ai_connections in Supabase:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateAIConnection(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const updatePayload = mapToSnakeCase({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    try {
      if (updatePayload.is_default) {
        const { data: existing } = await supabase
          .from("ai_connections")
          .select("organization_id")
          .eq("id", id)
          .single();
        if (existing) {
          await supabase
            .from("ai_connections")
            .update({ is_default: false })
            .eq("organization_id", existing.organization_id);
        }
      }

      const { data: updated, error } = await supabase
        .from("ai_connections")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(updated);
    } catch (e) {
      console.warn(
        "Failed to update AI connection in Supabase. Using fallback.",
        e,
      );
      const idx = this.fallbackAIConnections.findIndex((c: any) => c.id === id);
      if (idx > -1) {
        if (data.isDefault) {
          this.fallbackAIConnections.forEach((c: any) => {
            if (
              c.organizationId ===
              this.fallbackAIConnections[idx].organizationId
            ) {
              c.isDefault = false;
            }
          });
        }
        this.fallbackAIConnections[idx] = {
          ...this.fallbackAIConnections[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        return this.fallbackAIConnections[idx];
      }
      return null;
    }
  }

  async deleteAIConnection(id: string): Promise<any> {
    const supabase = this.getClient();
    try {
      const { error } = await supabase
        .from("ai_connections")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.warn(
        "Failed to delete AI connection in Supabase. Using fallback.",
        e,
      );
      this.fallbackAIConnections = this.fallbackAIConnections.filter(
        (c: any) => c.id !== id,
      );
      return { success: true };
    }
  }

  // --- Sprint 9 Specializations ---
  private fallbackSpecializations: any[] = [];
  private fallbackProjectSpecializations: any[] = [];

  async getSpecializations(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    try {
      const { data, error } = await supabase
        .from("specializations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return mapToCamelCase(data || []);
    } catch (e) {
      console.warn("specializations table not available. Using fallback.", e);
      return this.fallbackSpecializations.filter(
        (s: any) => s.organizationId === organizationId,
      );
    }
  }

  async getProjectSpecialization(projectId: string, workspaceId: string): Promise<any> {
    const supabase = this.getClient();
    try {
      const { data, error } = await supabase
        .from("project_specializations")
        .select("*")
        .eq("project_id", projectId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapToCamelCase(data) : null;
    } catch (e) {
      console.warn(
        "project_specializations table not available. Using fallback.",
        e,
      );
      return (
        this.fallbackProjectSpecializations.find(
          (ps: any) => ps.projectId === projectId,
        ) || null
      );
    }
  }

  async setProjectSpecialization(
    projectId: string,
    specializationKey: string,
    organizationId: string,
  ): Promise<any> {
    const supabase = this.getClient();
    const record = {
      organization_id: organizationId,
      project_id: projectId,
      specialization_key: specializationKey,
      updated_at: new Date().toISOString(), // Assuming there's a trigger or we just upsert it. Oh wait, project_specializations doesn't have updated_at in the requirement but I will upsert it.
    };
    try {
      const { data: upserted, error } = await supabase
        .from("project_specializations")
        .upsert(record, { onConflict: "project_id,specialization_key" }) // Or project_id if unique constraint
        .select()
        .single();

      // Let's just do upsert on project_id since it should be 1:1 if a project only has ONE active specialization
      // Wait, is it ONE active specialization per project? Yes ("ativa por projeto"). We can delete existing ones.

      // Better: delete all for this project and insert the new one
      await supabase
        .from("project_specializations")
        .delete()
        .eq("project_id", projectId);

      const { data: inserted, error: insertError } = await supabase
        .from("project_specializations")
        .insert({
          id: "ps_" + Math.random().toString(36).substr(2, 9),
          organization_id: organizationId,
          project_id: projectId,
          specialization_key: specializationKey,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return mapToCamelCase(inserted);
    } catch (e) {
      console.warn(
        "project_specializations table not available. Using fallback.",
        e,
      );
      const camelCaseRecord = {
        id: "ps_" + Math.random().toString(36).substr(2, 9),
        organizationId,
        projectId,
        specializationKey,
        createdAt: new Date().toISOString(),
      };
      const existingIdx = this.fallbackProjectSpecializations.findIndex(
        (ps: any) => ps.projectId === projectId,
      );
      if (existingIdx > -1) {
        this.fallbackProjectSpecializations[existingIdx] = camelCaseRecord;
      } else {
        this.fallbackProjectSpecializations.push(camelCaseRecord);
      }
      return camelCaseRecord;
    }
  }

  // --- Sprint 10 Documents ---
  async getDocuments(projectId: string | undefined, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("documents").select("*")
      .eq("workspace_id", workspaceId);
    if (projectId) query = query.eq("project_id", projectId);
    query = query.order("created_at", { ascending: false });

    // ignore error and return empty if table missing for now
    const { data } = await query;
    return mapToCamelCase(data || []);
  }

  async createDocument(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("documents")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getDocumentById(id: string, workspaceId: string): Promise<any> {
    const supabase = this.getClient();
    let query = supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? mapToCamelCase(data) : null;
  }

  async updateDocument(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    snakeData.updated_at = new Date().toISOString();
    Object.keys(snakeData).forEach(
      (k) => snakeData[k] === undefined && delete snakeData[k],
    );
    const { data: updated, error } = await supabase
      .from("documents")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(updated);
  }

  async getDocumentChunks(documentId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("document_id", documentId)
      .eq("workspace_id", workspaceId)
      .order("chunk_index", { ascending: true });
    return mapToCamelCase(data || []);
  }

  async createDocumentChunk(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("document_chunks")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getDocumentOutputs(documentId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data } = await supabase
      .from("document_outputs")
      .select("*")
      .eq("source_document_id", documentId)
      .order("created_at", { ascending: false });
    return mapToCamelCase(data || []);
  }

  async createDocumentOutput(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("document_outputs")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  // --- Sprint 10.2 Document Jobs ---
  async getDocumentJobs(documentId?: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("document_jobs").select("*");
    if (documentId) query = query.eq("document_id", documentId);
    query = query.order("created_at", { ascending: false });

    const { data } = await query;
    return mapToCamelCase(data || []);
  }

  async getDocumentJobById(id: string): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("document_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapToCamelCase(data) : null;
  }

  async createDocumentJob(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("document_jobs")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async updateDocumentJob(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    snakeData.updated_at = new Date().toISOString();
    Object.keys(snakeData).forEach(
      (k) => snakeData[k] === undefined && delete snakeData[k],
    );
    const { data: updated, error } = await supabase
      .from("document_jobs")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(updated);
  }

  async createDocumentAuditLog(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("document_audit_logs")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getDocumentStats(organizationId?: string): Promise<any> {
    const supabase = this.getClient();

    // Quick estimation counts
    let queryDocs = supabase
      .from("documents")
      .select("id, file_size", { count: "exact", head: false });
    let queryChunks = supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true });
    let queryOutputs = supabase
      .from("document_outputs")
      .select("id", { count: "exact", head: true });
    let queryJobs = supabase
      .from("document_jobs")
      .select("id", { count: "exact", head: true });

    if (organizationId) {
      queryDocs = queryDocs.eq("organization_id", organizationId);
      queryChunks = queryChunks.eq("organization_id", organizationId);
      queryOutputs = queryOutputs.eq("organization_id", organizationId);
      queryJobs = queryJobs.eq("organization_id", organizationId);
    }

    const [docsRes, chunksRes, outputsRes, jobsRes] = await Promise.all([
      queryDocs,
      queryChunks,
      queryOutputs,
      queryJobs,
    ]);

    const totalBytes = (docsRes.data || []).reduce(
      (acc: number, d: any) => acc + (d.file_size || 0),
      0,
    );

    return {
      total_documents: docsRes.count || 0,
      total_chunks: chunksRes.count || 0,
      total_outputs: outputsRes.count || 0,
      total_jobs: jobsRes.count || 0,
      total_processed_bytes: totalBytes,
    };
  }

  async getDocumentHealth(): Promise<any> {
    const supabase = this.getClient();
    const { data } = await supabase.from("document_jobs").select("status");

    const statuses = data || [];
    return {
      workers: 1, // python worker conceptually
      pending: statuses.filter((s) => s.status === "PENDING").length,
      running: statuses.filter((s) => s.status === "RUNNING").length,
      canceled: statuses.filter((s) => s.status === "CANCELED").length,
      completed: statuses.filter((s) => s.status === "COMPLETED").length,
      failed: statuses.filter((s) => s.status === "FAILED").length,
    };
  }

  async getWorkspaceSnapshots(projectId?: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("workspace_snapshots").select("*");
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    const { data, error } = await query.order("generated_at", {
      ascending: false,
    });
    if (error) {
      console.warn("Could not get workspace_snapshots:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createWorkspaceSnapshot(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("workspace_snapshots")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getGovernmentSnapshots(organizationId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("government_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .order("generated_at", { ascending: false });
    if (error) {
      console.warn("Could not get government_snapshots:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createGovernmentSnapshot(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("government_snapshots")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getProcurementSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("procurement_workspace_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("Could not get procurement_workspace_snapshots:", error);
      return [];
    }
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.snapshotJson) {
        mapped.snapshot = mapped.snapshotJson;
        delete mapped.snapshotJson;
      }
      return mapped;
    });
  }

  async createProcurementSnapshot(data: any): Promise<any> {
    const supabase = this.getClient();
    const workspaceId = data.workspaceId || data.workspace_id;
    if (workspaceId) {
      const dbData = { ...data };
      if (dbData.snapshot) {
        dbData.snapshotJson = dbData.snapshot;
        delete dbData.snapshot;
      }
      const row = mapToSnakeCase({
        ...dbData,
        createdAt: dbData.createdAt || new Date().toISOString()
      });
      const { data: inserted, error } = await supabase
        .from("procurement_workspace_snapshots")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const result = mapToCamelCase(inserted);
      if (result.snapshotJson) {
        result.snapshot = result.snapshotJson;
        delete result.snapshotJson;
      }
      return result;
    }

    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("procurement_snapshots")
      .insert([snakeData])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getElectoralCampaigns(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("electoral_campaigns")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get electoral_campaigns:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralCampaign(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_campaigns")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_campaigns:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async getElectoralTerritories(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("electoral_territories")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get electoral_territories:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralTerritory(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_territories")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_territories:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async getElectoralCoordinators(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("electoral_coordinators")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get electoral_coordinators:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralCoordinator(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_coordinators")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_coordinators:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async getElectoralCampaignInvites(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("electoral_campaign_invites")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get electoral_campaign_invites:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralCampaignInvite(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_campaign_invites")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_campaign_invites:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralCampaignInvite(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_campaign_invites")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_campaign_invites:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  async getElectoralAnalyses(organizationId: string, workspaceId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("electoral_analyses")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get electoral_analyses:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralAnalysis(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_analyses")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_analyses:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralCampaign(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_campaigns")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_campaigns:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  // Objectives
  async getElectoralCampaignObjectives(
    organizationId: string,
    campaignId?: string,
  ): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("campaign_objectives")
      .select("*")
      .eq("organization_id", organizationId);
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get campaign_objectives:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralCampaignObjective(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("campaign_objectives")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert campaign_objectives:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralCampaignObjective(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("campaign_objectives")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update campaign_objectives:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  // Tasks
  async getElectoralCampaignTasks(
    organizationId: string,
    campaignId?: string,
  ): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("campaign_tasks")
      .select("*")
      .eq("organization_id", organizationId);
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get campaign_tasks:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralCampaignTask(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("campaign_tasks")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert campaign_tasks:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralCampaignTask(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("campaign_tasks")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update campaign_tasks:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  // Coordinator Updates
  async updateElectoralCoordinator(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_coordinators")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_coordinators:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  // Invite Audit Logs
  async getElectoralInviteAuditLogs(
    organizationId: string,
    inviteId?: string,
  ): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase
      .from("invite_audit_log")
      .select("*")
      .eq("organization_id", organizationId);
    if (inviteId) {
      query = query.eq("invite_id", inviteId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get invite_audit_log:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralInviteAuditLog(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("invite_audit_log")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert invite_audit_log:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralTerritory(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_territories")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_territories:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  // Sprint 14.4 - Opponent & Political Intelligence Methods
  async getElectoralOpponents(organizationId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_opponents")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      console.warn("Could not get electoral_opponents:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getElectoralOpponentById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_opponents")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) {
      console.warn("Could not get electoral_opponent by id:", error);
      return null;
    }
    return data ? mapToCamelCase(data) : null;
  }

  async createElectoralOpponent(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_opponents")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_opponents:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralOpponent(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_opponents")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_opponents:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  async deleteElectoralOpponent(id: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from("electoral_opponents")
      .delete()
      .eq("id", id);
    if (error) {
      console.warn("Could not delete electoral_opponents:", error);
    }
  }

  async getElectoralPoliticalGroups(organizationId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_political_groups")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      console.warn("Could not get electoral_political_groups:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getElectoralPoliticalGroupById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_political_groups")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) {
      console.warn("Could not get electoral_political_group by id:", error);
      return null;
    }
    return data ? mapToCamelCase(data) : null;
  }

  async createElectoralPoliticalGroup(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_political_groups")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_political_groups:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralPoliticalGroup(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_political_groups")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_political_groups:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  async deleteElectoralPoliticalGroup(id: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from("electoral_political_groups")
      .delete()
      .eq("id", id);
    if (error) {
      console.warn("Could not delete electoral_political_groups:", error);
    }
  }

  async getElectoralLeaderships(organizationId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_leaderships")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      console.warn("Could not get electoral_leaderships:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getElectoralLeadershipById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_leaderships")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) {
      console.warn("Could not get electoral_leadership by id:", error);
      return null;
    }
    return data ? mapToCamelCase(data) : null;
  }

  async createElectoralLeadership(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_leaderships")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_leaderships:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralLeadership(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_leaderships")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_leaderships:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  async deleteElectoralLeadership(id: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from("electoral_leaderships")
      .delete()
      .eq("id", id);
    if (error) {
      console.warn("Could not delete electoral_leaderships:", error);
    }
  }

  async getElectoralRelationships(organizationId: string): Promise<any[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_relationships")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      console.warn("Could not get electoral_relationships:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getElectoralRelationshipById(
    organizationId: string,
    id: string,
  ): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_relationships")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) {
      console.warn("Could not get electoral_relationship by id:", error);
      return null;
    }
    return data ? mapToCamelCase(data) : null;
  }

  async createElectoralRelationship(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_relationships")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_relationships:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralRelationship(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_relationships")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update electoral_relationships:", error);
      return data;
    }
    return mapToCamelCase(updated);
  }

  async deleteElectoralRelationship(id: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from("electoral_relationships")
      .delete()
      .eq("id", id);
    if (error) {
      console.warn("Could not delete electoral_relationships:", error);
    }
  }

  async getElectoralHistoricalResults(filter?: any): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("electoral_historical_results").select("*");

    if (filter) {
      if (filter.organizationId) {
        query = query.or(
          `organization_id.eq.${filter.organizationId},organization_id.is.null`,
        );
      }
      if (filter.anoEleitoral !== undefined && filter.anoEleitoral !== null) {
        query = query.eq("ano_eleitoral", Number(filter.anoEleitoral));
      }
      if (filter.uf) {
        query = query.eq("uf", String(filter.uf));
      }
      if (filter.municipio) {
        query = query.ilike("municipio", filter.municipio);
      }
      if (filter.zona !== undefined && filter.zona !== null) {
        query = query.eq("zona", String(filter.zona));
      }
      if (filter.cargo) {
        query = query.ilike("cargo", filter.cargo);
      }
      if (filter.nome) {
        query = query.ilike("nome", `%${filter.nome}%`);
      }
      if (filter.partido) {
        query = query.ilike("partido", filter.partido);
      }
      if (filter.numeroVotavel) {
        query = query.eq("numero_votavel", filter.numeroVotavel);
      }
      if (filter.localVotacao) {
        query = query.eq("local_votacao", filter.localVotacao);
      }
      if (filter.turno !== undefined && filter.turno !== null) {
        query = query.eq("turno", Number(filter.turno));
      }
      if (filter.suplementar !== undefined) {
        query = query.eq("suplementar", Boolean(filter.suplementar));
      }
      if (filter.importRunId) {
        query = query.eq("import_run_id", filter.importRunId);
      }

      const limitVal =
        filter.limit !== undefined && filter.limit !== null
          ? Number(filter.limit)
          : null;
      if (limitVal) {
        const offsetVal = Number(filter.offset || 0);
        query = query.range(offsetVal, offsetVal + limitVal - 1);
      }
    }
    const { data, error } = await query;
    if (error) {
      console.warn("Could not get electoral_historical_results:", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createElectoralHistoricalResult(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_historical_results")
      .insert([snakeData])
      .select()
      .single();
    if (error) {
      console.warn("Could not insert electoral_historical_results:", error);
      return data;
    }
    return mapToCamelCase(inserted);
  }

  async bulkCreateElectoralHistoricalResults(records: any[]): Promise<any[]> {
    const supabase = this.getClient();
    const snakeData = records.map(mapToSnakeCase);
    const { data: inserted, error } = await supabase
      .from("electoral_historical_results")
      .insert(snakeData)
      .select();
    if (error) {
      console.warn(
        "Could not bulk insert electoral_historical_results:",
        error,
      );
      return records;
    }
    return inserted.map(mapToCamelCase);
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
    return this.getElectoralHistoricalResults(filter);
  }

  async getElectoralCandidateRanking(
    organizationId: string,
    filter?: any,
  ): Promise<{ name: string; votes: number }[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase.rpc("get_candidate_ranking", {
      p_org_id: organizationId,
      p_ano: filter?.anoEleitoral ? Number(filter.anoEleitoral) : null,
      p_uf: filter?.uf || null,
      p_municipio: filter?.municipio || null,
      p_zona: filter?.zona || null,
      p_cargo: filter?.cargo || null,
      p_partido: filter?.partido || null,
      p_limit: filter?.limit ? Number(filter.limit) : 10,
    });

    if (error) {
      console.warn("Could not get candidate ranking from RPC:", error);
      // Fallback: JS aggregation on partial data if RPC fails
      const records = await this.getElectoralHistoricalResults({
        ...filter,
        organizationId,
        limit: undefined,
        offset: undefined,
      });
      const aggregated: { [name: string]: number } = {};
      for (const r of records) {
        if (r.nome) {
          aggregated[r.nome] =
            (aggregated[r.nome] || 0) + Number(r.qtVotos || 0);
        }
      }
      return Object.entries(aggregated)
        .map(([name, votes]) => ({ name, votes }))
        .sort((a, b) => b.votes - a.votes)
        .slice(0, Number(filter?.limit) || 10);
    }

    return data.map((row: any) => ({
      name: row.name,
      votes: Number(row.votes),
    }));
  }

  async getElectoralPartyRanking(
    organizationId: string,
    filter?: any,
  ): Promise<{ name: string; votes: number }[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase.rpc("get_party_ranking", {
      p_org_id: organizationId,
      p_ano: filter?.anoEleitoral ? Number(filter.anoEleitoral) : null,
      p_uf: filter?.uf || null,
      p_municipio: filter?.municipio || null,
      p_zona: filter?.zona || null,
      p_cargo: filter?.cargo || null,
      p_nome: filter?.nome || null,
      p_limit: filter?.limit ? Number(filter.limit) : 10,
    });

    if (error) {
      console.warn("Could not get party ranking from RPC:", error);
      // Fallback: JS aggregation on partial data if RPC fails
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

    return data.map((row: any) => ({
      name: row.name,
      votes: Number(row.votes),
    }));
  }

  // Sprint 14.5.2
  async createElectoralImportJob(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_import_jobs")
      .insert(snakeData)
      .select()
      .single();
    if (error) {
      console.warn("Could not create import job:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateElectoralImportJob(id: string, data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: updated, error } = await supabase
      .from("electoral_import_jobs")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.warn("Could not update import job:", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getElectoralImportJob(id: string): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("electoral_import_jobs")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return mapToCamelCase(data);
  }

  async getElectoralImportJobs(organizationId: string): Promise<any[]> {
    const supabase = this.getClient();
    let query = supabase.from("electoral_import_jobs").select("*");
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) return [];
    return data.map(mapToCamelCase);
  }

  async createElectoralImportRowError(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_import_row_errors")
      .insert(snakeData)
      .select()
      .single();
    if (error) {
      console.warn("Could not create import error:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async computeElectoralImportValidation(
    organizationId: string,
    importRunId: string,
  ): Promise<any> {
    const supabase = this.getClient();

    // Call the RPC to do the heavy aggregates strictly in PostgreSQL
    const { data, error } = await supabase.rpc(
      "compute_electoral_import_validation",
      {
        p_import_run_id: importRunId,
      },
    );

    if (error || !data) {
      console.error("Error computing import validation:", error);
      return {
        organizationId,
        importRunId,
        totalRows: 0,
        totalVotes: 0,
        availableYears: [],
        availableUfs: [],
        availableMunicipalities: [],
        availableCargos: [],
        availableTurnos: [],
        invalidRows: 0,
        duplicateRows: 0,
        status: "NO_DATA",
        validatedAt: new Date().toISOString(),
      };
    }

    return {
      organizationId: data.organizationId || organizationId,
      importRunId: data.importRunId,
      totalRows: data.totalRows,
      totalVotes: data.totalVotes,
      availableYears: data.availableYears || [],
      availableUfs: data.availableUfs || [],
      availableMunicipalities: data.availableMunicipalities || [],
      availableCargos: data.availableCargos || [],
      availableTurnos: data.availableTurnos || [],
      invalidRows: data.invalidRows || 0,
      duplicateRows: data.duplicateRows || 0,
      status: data.status,
      detailsJson: data.detailsJson || {},
      validatedAt: new Date().toISOString(),
    };
  }

  // Sprint 14.5.3 - Aggregates & Validation

  async refreshElectoralAggregates(): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase.rpc("refresh_electoral_aggregates");
    if (error) {
      console.warn("Could not refresh electoral aggregates:", error);
    }
  }

  async createElectoralImportValidationSummary(data: any): Promise<any> {
    const supabase = this.getClient();
    const snakeData = mapToSnakeCase(data);
    const { data: inserted, error } = await supabase
      .from("electoral_import_validation_summary")
      .insert(snakeData)
      .select()
      .single();
    if (error) {
      console.warn("Could not create import validation summary:", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getElectoralAvailableFilters(organizationId: string): Promise<any> {
    const supabase = this.getClient();
    const { data, error } = await supabase.rpc(
      "get_electoral_available_filters",
      { p_org_id: organizationId },
    );
    if (error) {
      console.warn("Could not get available filters:", error);
      return { years: [], ufs: [], cargos: [], turnos: [] };
    }
    return data;
  }

  private buildSummaryQuery(
    tableName: string,
    organizationId: string,
    filter?: any,
  ) {
    const supabase = this.getClient();
    let query = supabase.from(tableName).select("*");

    if (organizationId) {
      query = query.or(
        `organization_id.eq.${organizationId},organization_id.is.null`,
      );
    } else {
      query = query.is("organization_id", null);
    }

    if (filter?.anoEleitoral)
      query = query.eq("ano_eleitoral", Number(filter.anoEleitoral));
    if (filter?.uf) query = query.eq("uf", filter.uf);
    if (filter?.municipio) query = query.eq("municipio", filter.municipio);
    if (filter?.cargo) query = query.eq("cargo", filter.cargo);
    if (filter?.partido) query = query.eq("partido", filter.partido);
    if (filter?.turno) query = query.eq("turno", Number(filter.turno));

    const limitVal = filter?.limit ? Number(filter.limit) : 50;
    const offsetVal = filter?.offset ? Number(filter.offset) : 0;
    query = query
      .range(offsetVal, offsetVal + limitVal - 1)
      .order("total_votos", { ascending: false });

    return query;
  }

  async getElectoralCandidateSummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    let query = this.buildSummaryQuery(
      "electoral_candidate_summary",
      organizationId,
      filter,
    );
    if (filter?.nome) query = query.ilike("candidato", `%${filter.nome}%`);
    const { data, error } = await query;
    if (error) {
      console.error("[ElectoralSummary] Error on getElectoralCandidateSummary:", error);
      throw error;
    }
    if (!data || data.length === 0) return ["NO_DATA" as any];
    return data.map(mapToCamelCase);
  }

  async getElectoralMunicipalitySummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    const { data, error } = await this.buildSummaryQuery(
      "electoral_municipality_summary",
      organizationId,
      filter,
    );
    if (error) {
      console.error("[ElectoralSummary] Error on getElectoralMunicipalitySummary:", error);
      throw error;
    }
    if (!data || data.length === 0) return ["NO_DATA" as any];
    return data.map(mapToCamelCase);
  }

  async getElectoralPartySummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    const { data, error } = await this.buildSummaryQuery(
      "electoral_party_summary",
      organizationId,
      filter,
    );
    if (error) {
      console.error("[ElectoralSummary] Error on getElectoralPartySummary:", error);
      throw error;
    }
    if (!data || data.length === 0) return ["NO_DATA" as any];
    return data.map(mapToCamelCase);
  }

  async getElectoralLocationSummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    let query = this.buildSummaryQuery(
      "electoral_location_summary",
      organizationId,
      filter,
    );
    if (filter?.localVotacao)
      query = query.eq("local_votacao", filter.localVotacao);
    const { data, error } = await query;
    if (error) {
      console.error("[ElectoralSummary] Error on getElectoralLocationSummary:", error);
      throw error;
    }
    if (!data || data.length === 0) return ["NO_DATA" as any];
    return data.map(mapToCamelCase);
  }

  async getElectoralZoneSummary(
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    let query = this.buildSummaryQuery(
      "electoral_zone_summary",
      organizationId,
      filter,
    );
    if (filter?.zona) query = query.eq("zona", filter.zona);
    const { data, error } = await query;
    if (error) {
      console.error("[ElectoralSummary] Error on getElectoralZoneSummary:", error);
      throw error;
    }
    if (!data || data.length === 0) return ["NO_DATA" as any];
    return data.map(mapToCamelCase);
  }

  // ==========================================
  // SPRINT 15.0 - BETA PLATFORM OPERATIONAL ENGINE
  // ==========================================

  private async genericGet(
    table: string,
    organizationId: string,
    filter?: any,
  ): Promise<any[]> {
    let query = this.getClient()
      .from(table)
      .select("*")
      .eq("organization_id", organizationId);
    if (filter?.id) query = query.eq("id", filter.id);
    if (filter?.status) query = query.eq("status", filter.status);

    // Support both snake_case and camelCase filter properties
    const relType = filter?.related_entity_type || filter?.relatedEntityType;
    if (relType) query = query.eq("related_entity_type", relType);

    const relId = filter?.related_entity_id || filter?.relatedEntityId;
    if (relId) query = query.eq("related_entity_id", relId);

    // Default sort by created_at desc
    query = query.order("created_at", { ascending: false });

    // Pagination
    if (filter?.limit) {
      const limit = Number(filter.limit);
      const offset = filter?.offset ? Number(filter.offset) : 0;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error in get ${table}:`, error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  private async genericInsert(table: string, data: any): Promise<any> {
    const { data: inserted, error } = await this.getClient()
      .from(table)
      .insert([mapToSnakeCase(data)])
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getContacts(organizationId: string, filter?: any): Promise<Contact[]> {
    return this.genericGet("contacts", organizationId, filter);
  }
  async createContact(data: any): Promise<Contact> {
    return this.genericInsert("contacts", data);
  }

  async getCRMInteractions(
    organizationId: string,
    filter?: any,
  ): Promise<CRMInteraction[]> {
    return this.genericGet("crm_interactions", organizationId, filter);
  }
  async createCRMInteraction(data: any): Promise<CRMInteraction> {
    return this.genericInsert("crm_interactions", data);
  }

  async getCalendarEvents(
    organizationId: string,
    filter?: any,
  ): Promise<CalendarEvent[]> {
    return this.genericGet("calendar_events", organizationId, filter);
  }
  async createCalendarEvent(data: any): Promise<CalendarEvent> {
    return this.genericInsert("calendar_events", data);
  }

  async getActivities(
    organizationId: string,
    filter?: any,
  ): Promise<Activity[]> {
    return this.genericGet("activities", organizationId, filter);
  }
  async createActivity(data: any): Promise<Activity> {
    return this.genericInsert("activities", data);
  }

  async getCoreTasks(organizationId: string, filter?: any): Promise<Task[]> {
    return this.genericGet("tasks", organizationId, filter);
  }
  async createCoreTask(data: any): Promise<Task> {
    return this.genericInsert("tasks", data);
  }

  async getEvidences(
    organizationId: string,
    filter?: any,
  ): Promise<Evidence[]> {
    return this.genericGet("evidences", organizationId, filter);
  }
  async createEvidence(data: any): Promise<Evidence> {
    return this.genericInsert("evidences", data);
  }

  async getAttachments(
    organizationId: string,
    filter?: any,
  ): Promise<Attachment[]> {
    return this.genericGet("attachments", organizationId, filter);
  }
  async createAttachment(data: any): Promise<Attachment> {
    return this.genericInsert("attachments", data);
  }

  async getWorkflowInstances(
    organizationId: string,
    filter?: any,
  ): Promise<WorkflowInstance[]> {
    return this.genericGet("workflow_instances", organizationId, filter);
  }
  async createWorkflowInstance(data: any): Promise<WorkflowInstance> {
    return this.genericInsert("workflow_instances", data);
  }

  async getWorkflowSteps(
    organizationId: string,
    instanceId: string,
  ): Promise<WorkflowStep[]> {
    const { data, error } = await this.getClient()
      .from("workflow_steps")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workflow_instance_id", instanceId)
      .order("step_order", { ascending: true });
    if (error) return [];
    return data.map(mapToCamelCase);
  }
  async createWorkflowStep(data: any): Promise<WorkflowStep> {
    return this.genericInsert("workflow_steps", data);
  }

  async getNotifications(
    organizationId: string,
    filter?: any,
  ): Promise<Notification[]> {
    return this.genericGet("notifications", organizationId, filter);
  }
  async createNotification(data: any): Promise<Notification> {
    return this.genericInsert("notifications", data);
  }

  // Sprint 15.1 - Module Access Layer Database operations
  async getModules(): Promise<Module[]> {
    const { data, error } = await this.getClient()
      .from("modules")
      .select("*")
      .order("code", { ascending: true });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getModules failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getOrganizationModules(
    organizationId: string,
  ): Promise<OrganizationModule[]> {
    const { data, error } = await this.getClient()
      .from("organization_modules")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getOrganizationModules failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async enableOrganizationModule(
    organizationId: string,
    moduleId: string,
    metadataJson: any = {},
  ): Promise<OrganizationModule> {
    const snakeObj = {
      organization_id: organizationId,
      module_id: moduleId,
      is_enabled: true,
      activated_at: new Date().toISOString(),
      metadata_json: metadataJson || {},
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.getClient()
      .from("organization_modules")
      .upsert(snakeObj, { onConflict: "organization_id,module_id" })
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: enableOrganizationModule failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(data);
  }

  async disableOrganizationModule(
    organizationId: string,
    moduleId: string,
  ): Promise<void> {
    const snakeObj = {
      organization_id: organizationId,
      module_id: moduleId,
      is_enabled: false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.getClient()
      .from("organization_modules")
      .upsert(snakeObj, { onConflict: "organization_id,module_id" });
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: disableOrganizationModule failed",
        error,
      );
      throw error;
    }
  }

  async getModuleFeatures(): Promise<ModuleFeature[]> {
    const { data, error } = await this.getClient()
      .from("module_features")
      .select("*")
      .order("feature_code", { ascending: true });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getModuleFeatures failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getOrganizationFeatures(
    organizationId: string,
  ): Promise<OrganizationFeatureOverride[]> {
    const { data, error } = await this.getClient()
      .from("organization_feature_overrides")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getOrganizationFeatures failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  // =========================================================================
  // SPRINT 15.2 - WORKSPACES, SETTINGS, AUDITING, ADMIN DB SUPPORT (SUPABASE)
  // =========================================================================

  async getWorkspaces(
    organizationId: string,
    filter?: any,
  ): Promise<Workspace[]> {
    const { data, error } = await this.getClient()
      .from("workspaces")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getWorkspaces failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createWorkspace(data: any): Promise<Workspace> {
    const snakeObj = {
      id: data.id || undefined, // let database default uuid if not supplied
      organization_id: data.organizationId,
      name: data.name,
      description: data.description,
      status: data.status || "ACTIVE",
      metadata_json: data.metadataJson || {},
      created_at: data.createdAt || new Date().toISOString(),
      updated_at: data.updatedAt || new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("workspaces")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createWorkspace failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateWorkspace(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<Workspace> {
    const snakeObj: any = {};
    if (data.name !== undefined) snakeObj.name = data.name;
    if (data.description !== undefined) snakeObj.description = data.description;
    if (data.status !== undefined) snakeObj.status = data.status;
    if (data.metadataJson !== undefined) {
      snakeObj.metadata_json = data.metadataJson;
    }
    snakeObj.updated_at = new Date().toISOString();

    const { data: updated, error } = await this.getClient()
      .from("workspaces")
      .update(snakeObj)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: updateWorkspace failed", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getOrganizationSettings(
    organizationId: string,
  ): Promise<OrganizationSetting[]> {
    const { data, error } = await this.getClient()
      .from("organization_settings")
      .select("*")
      .eq("organization_id", organizationId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getOrganizationSettings failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async updateOrganizationSetting(
    organizationId: string,
    settingKey: string,
    settingValue: string,
    metadataJson: any = {},
  ): Promise<OrganizationSetting> {
    const snakeObj = {
      organization_id: organizationId,
      setting_key: settingKey,
      setting_value: settingValue,
      metadata_json: metadataJson || {},
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.getClient()
      .from("organization_settings")
      .upsert(snakeObj, { onConflict: "organization_id,setting_key" })
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: updateOrganizationSetting failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(data);
  }

  async getAuditLogs(): Promise<SuperAdminAuditLog[]> {
    const { data, error } = await this.getClient()
      .from("super_admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getAuditLogs failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createAuditLog(data: any): Promise<SuperAdminAuditLog> {
    const snakeObj = {
      actor_user_id: data.actorUserId,
      organization_id: data.organizationId || "global",
      action_type: data.actionType,
      entity_type: data.entityType,
      entity_id: data.entityId,
      description: data.description,
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("super_admin_audit_logs")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createAuditLog failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getOrganizations(): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("organizations")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getOrganizations failed", error);
      return [];
    }
    return data;
  }

  async getOrganizationDetails(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getOrganizationDetails failed",
        error,
      );
      return null;
    }
    return data;
  }

  async getOrganizationUsers(organizationId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("users")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getOrganizationUsers failed",
        error,
      );
      return [];
    }
    return data;
  }

  // =========================================================================
  // SPRINT 15.3 - SHARED IMPORT CENTER (SUPABASE)
  // =========================================================================

  async createImportJob(data: any): Promise<ImportJob> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      module_code: data.moduleCode,
      job_type: data.jobType,
      status: data.status || "PENDING",
      started_at: data.startedAt || null,
      completed_at: data.completedAt || null,
      total_rows: data.totalRows || 0,
      processed_rows: data.processedRows || 0,
      success_rows: data.successRows || 0,
      error_rows: data.errorRows || 0,
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("import_jobs")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createImportJob failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateImportJob(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<ImportJob> {
    const snakeObj: any = {};
    if (data.status !== undefined) snakeObj.status = data.status;
    if (data.startedAt !== undefined) snakeObj.started_at = data.startedAt;
    if (data.completedAt !== undefined)
      snakeObj.completed_at = data.completedAt;
    if (data.totalRows !== undefined) snakeObj.total_rows = data.totalRows;
    if (data.processedRows !== undefined)
      snakeObj.processed_rows = data.processedRows;
    if (data.successRows !== undefined)
      snakeObj.success_rows = data.successRows;
    if (data.errorRows !== undefined) snakeObj.error_rows = data.errorRows;
    if (data.metadataJson !== undefined) {
      snakeObj.metadata_json = data.metadataJson;
    }
    snakeObj.updated_at = new Date().toISOString();

    const { data: updated, error } = await this.getClient()
      .from("import_jobs")
      .update(snakeObj)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: updateImportJob failed", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getImportJob(
    id: string,
    organizationId: string,
  ): Promise<ImportJob | null> {
    const { data, error } = await this.getClient()
      .from("import_jobs")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) {
      console.error("SupabaseDatabaseAdapter: getImportJob failed", error);
      return null;
    }
    return data ? mapToCamelCase(data) : null;
  }

  async getImportJobs(
    organizationId: string,
    workspaceId: string,
  ): Promise<ImportJob[]> {
    const { data, error } = await this.getClient()
      .from("import_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getImportJobs failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createImportLog(data: any): Promise<ImportJobLog> {
    const snakeObj = {
      id: data.id || undefined,
      job_id: data.jobId,
      level: data.level || "INFO",
      message: data.message,
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("import_job_logs")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createImportLog failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async createImportError(data: any): Promise<ImportJobError> {
    const snakeObj = {
      id: data.id || undefined,
      job_id: data.jobId,
      row_number: data.rowNumber || 0,
      error_code: data.errorCode || "GENERIC_ERROR",
      error_message: data.errorMessage || "",
      raw_data_json: data.rawDataJson || {},
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("import_job_errors")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createImportError failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getImportErrors(jobId: string): Promise<ImportJobError[]> {
    const { data, error } = await this.getClient()
      .from("import_job_errors")
      .select("*")
      .eq("job_id", jobId)
      .order("row_number", { ascending: true });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getImportErrors failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  // =========================================================================
  // SPRINT 15.4 - ELECTORAL OPERATIONAL INTEGRATION
  // =========================================================================

  async getCampaigns(
    organizationId: string,
    workspaceId: string,
  ): Promise<ElectoralCampaign[]> {
    const { data, error } = await this.getClient()
      .from("electoral_campaigns")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getCampaigns failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCampaign(data: any): Promise<ElectoralCampaign> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      name: data.name,
      description: data.description || null,
      campaign_type: data.campaignType,
      status: data.status || "PENDING",
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("electoral_campaigns")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createCampaign failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateCampaign(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<ElectoralCampaign> {
    const snakeObj: any = {};
    if (data.name !== undefined) snakeObj.name = data.name;
    if (data.description !== undefined) snakeObj.description = data.description;
    if (data.campaignType !== undefined)
      snakeObj.campaign_type = data.campaignType;
    if (data.status !== undefined) snakeObj.status = data.status;
    if (data.startDate !== undefined) snakeObj.start_date = data.startDate;
    if (data.endDate !== undefined) snakeObj.end_date = data.endDate;
    if (data.metadataJson !== undefined) {
      snakeObj.metadata_json = data.metadataJson;
    }
    snakeObj.updated_at = new Date().toISOString();

    const { data: updated, error } = await this.getClient()
      .from("electoral_campaigns")
      .update(snakeObj)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: updateCampaign failed", error);
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getCampaignMembers(campaignId: string): Promise<CampaignMember[]> {
    const { data, error } = await this.getClient()
      .from("campaign_members")
      .select("*")
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignMembers failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async addCampaignMember(data: any): Promise<CampaignMember> {
    const snakeObj = {
      id: data.id || undefined,
      campaign_id: data.campaignId,
      contact_id: data.contactId,
      role: data.role,
      status: data.status || "ACTIVE",
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("campaign_members")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: addCampaignMember failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCampaignGoals(campaignId: string): Promise<CampaignGoal[]> {
    const { data, error } = await this.getClient()
      .from("campaign_goals")
      .select("*")
      .eq("campaign_id", campaignId);
    if (error) {
      console.error("SupabaseDatabaseAdapter: getCampaignGoals failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCampaignGoal(data: any): Promise<CampaignGoal> {
    const snakeObj = {
      id: data.id || undefined,
      campaign_id: data.campaignId,
      title: data.title,
      description: data.description || null,
      goal_type: data.goalType,
      target_value: data.targetValue || 0,
      current_value: data.currentValue || 0,
      status: data.status || "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("campaign_goals")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createCampaignGoal failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateCampaignGoal(
    id: string,
    campaignId: string,
    data: any,
  ): Promise<CampaignGoal> {
    const snakeObj: any = {};
    if (data.title !== undefined) snakeObj.title = data.title;
    if (data.description !== undefined) snakeObj.description = data.description;
    if (data.goalType !== undefined) snakeObj.goal_type = data.goalType;
    if (data.targetValue !== undefined)
      snakeObj.target_value = data.targetValue;
    if (data.currentValue !== undefined)
      snakeObj.current_value = data.currentValue;
    if (data.status !== undefined) snakeObj.status = data.status;
    snakeObj.updated_at = new Date().toISOString();

    const { data: updated, error } = await this.getClient()
      .from("campaign_goals")
      .update(snakeObj)
      .eq("id", id)
      .eq("campaign_id", campaignId)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: updateCampaignGoal failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getCampaignActions(campaignId: string): Promise<CampaignAction[]> {
    const { data, error } = await this.getClient()
      .from("campaign_actions")
      .select("*")
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignActions failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCampaignAction(data: any): Promise<CampaignAction> {
    const snakeObj = {
      id: data.id || undefined,
      campaign_id: data.campaignId,
      activity_id: data.activityId || null,
      task_id: data.taskId || null,
      title: data.title,
      description: data.description || null,
      status: data.status || "PENDING",
      scheduled_for: data.scheduledFor || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("campaign_actions")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createCampaignAction failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCampaignEvidences(campaignId: string): Promise<CampaignEvidence[]> {
    const { data, error } = await this.getClient()
      .from("campaign_evidences")
      .select("*")
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignEvidences failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async linkCampaignEvidence(data: any): Promise<CampaignEvidence> {
    const snakeObj = {
      id: data.id || undefined,
      campaign_id: data.campaignId,
      evidence_id: data.evidenceId,
      description: data.description || null,
      created_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("campaign_evidences")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: linkCampaignEvidence failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  // =========================================================================
  // SPRINT 15.5 - COORDINATOR & TERRITORY OPERATIONAL LAYER
  // =========================================================================

  async getCampaignTerritories(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignTerritory[]> {
    const { data, error } = await this.getClient()
      .from("campaign_territories")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignTerritories failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCampaignTerritory(data: any): Promise<CampaignTerritory> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      parent_territory_id: data.parentTerritoryId || null,
      territory_type: data.territoryType,
      name: data.name,
      description: data.description || null,
      geo_code: data.geoCode || null,
      status: data.status || "ACTIVE",
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("campaign_territories")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createCampaignTerritory failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateCampaignTerritory(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<CampaignTerritory> {
    const snakeObj: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.parentTerritoryId !== undefined)
      snakeObj.parent_territory_id = data.parentTerritoryId;
    if (data.territoryType !== undefined)
      snakeObj.territory_type = data.territoryType;
    if (data.name !== undefined) snakeObj.name = data.name;
    if (data.description !== undefined) snakeObj.description = data.description;
    if (data.geoCode !== undefined) snakeObj.geo_code = data.geoCode;
    if (data.status !== undefined) snakeObj.status = data.status;
    if (data.metadataJson !== undefined)
      snakeObj.metadata_json = data.metadataJson;

    const { data: updated, error } = await this.getClient()
      .from("campaign_territories")
      .update(snakeObj)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: updateCampaignTerritory failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getCampaignCoordinators(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignCoordinator[]> {
    const { data, error } = await this.getClient()
      .from("campaign_coordinators")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignCoordinators failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCampaignCoordinator(data: any): Promise<CampaignCoordinator> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      contact_id: data.contactId,
      coordinator_level: data.coordinatorLevel,
      role: data.role,
      status: data.status || "ACTIVE",
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("campaign_coordinators")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createCampaignCoordinator failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateCampaignCoordinator(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<CampaignCoordinator> {
    const snakeObj: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.coordinatorLevel !== undefined)
      snakeObj.coordinator_level = data.coordinatorLevel;
    if (data.role !== undefined) snakeObj.role = data.role;
    if (data.status !== undefined) snakeObj.status = data.status;
    if (data.metadataJson !== undefined)
      snakeObj.metadata_json = data.metadataJson;

    const { data: updated, error } = await this.getClient()
      .from("campaign_coordinators")
      .update(snakeObj)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: updateCampaignCoordinator failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getCoordinatorAssignments(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignCoordinatorAssignment[]> {
    const { data, error } = await this.getClient()
      .from("campaign_coordinator_assignments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCoordinatorAssignments failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async assignCoordinatorToTerritory(
    data: any,
  ): Promise<CampaignCoordinatorAssignment> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      coordinator_id: data.coordinatorId,
      territory_id: data.territoryId,
      assignment_type: data.assignmentType,
      status: data.status || "ACTIVE",
      started_at: data.startedAt || new Date().toISOString(),
      ended_at: data.endedAt || null,
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await this.getClient()
      .from("campaign_coordinator_assignments")
      .insert(snakeObj)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: assignCoordinatorToTerritory failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async removeCoordinatorAssignment(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const { error } = await this.getClient()
      .from("campaign_coordinator_assignments")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: removeCoordinatorAssignment failed",
        error,
      );
      throw error;
    }
  }

  async getTerritoryCoverage(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignTerritoryCoverage[]> {
    const { data, error } = await this.getClient()
      .from("campaign_territory_coverage")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getTerritoryCoverage failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async computeTerritoryCoverage(
    data: any,
  ): Promise<CampaignTerritoryCoverage> {
    const { data: existing } = await this.getClient()
      .from("campaign_territory_coverage")
      .select("id")
      .eq("campaign_id", data.campaignId)
      .eq("territory_id", data.territoryId)
      .maybeSingle();

    const snakeObj = {
      id: existing?.id || data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      territory_id: data.territoryId,
      coordinators_count: data.coordinatorsCount || 0,
      members_count: data.membersCount || 0,
      actions_count: data.actionsCount || 0,
      evidences_count: data.evidencesCount || 0,
      last_activity_at: data.lastActivityAt || null,
      coverage_status: data.coverageStatus || "NO_DATA",
      metadata_json: data.metadataJson || {},
      updated_at: new Date().toISOString(),
    };

    let query;
    if (existing?.id) {
      query = this.getClient()
        .from("campaign_territory_coverage")
        .update(snakeObj)
        .eq("id", existing.id);
    } else {
      (snakeObj as any).created_at = new Date().toISOString();
      query = this.getClient()
        .from("campaign_territory_coverage")
        .insert(snakeObj);
    }

    const { data: inserted, error } = await query.select().single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: computeTerritoryCoverage failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getTerritoryConflicts(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignTerritoryConflict[]> {
    const { data, error } = await this.getClient()
      .from("campaign_territory_conflicts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getTerritoryConflicts failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async computeTerritoryConflicts(
    data: any,
  ): Promise<CampaignTerritoryConflict> {
    const { data: existing } = await this.getClient()
      .from("campaign_territory_conflicts")
      .select("id")
      .eq("campaign_id", data.campaignId)
      .eq("territory_id", data.territoryId)
      .eq("conflict_type", data.conflictType)
      .maybeSingle();

    const snakeObj = {
      id: existing?.id || data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      territory_id: data.territoryId,
      conflict_type: data.conflictType,
      description: data.description,
      status: data.status || "ACTIVE",
      metadata_json: data.metadataJson || {},
      updated_at: new Date().toISOString(),
    };

    let query;
    if (existing?.id) {
      query = this.getClient()
        .from("campaign_territory_conflicts")
        .update(snakeObj)
        .eq("id", existing.id);
    } else {
      (snakeObj as any).created_at = new Date().toISOString();
      query = this.getClient()
        .from("campaign_territory_conflicts")
        .insert(snakeObj);
    }

    const { data: inserted, error } = await query.select().single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: computeTerritoryConflicts failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCoordinatorHealth(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignCoordinatorHealth[]> {
    const { data, error } = await this.getClient()
      .from("campaign_coordinator_health")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCoordinatorHealth failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async computeCoordinatorHealth(
    data: any,
  ): Promise<CampaignCoordinatorHealth> {
    const { data: existing } = await this.getClient()
      .from("campaign_coordinator_health")
      .select("id")
      .eq("campaign_id", data.campaignId)
      .eq("coordinator_id", data.coordinatorId)
      .maybeSingle();

    const snakeObj = {
      id: existing?.id || data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      coordinator_id: data.coordinatorId,
      assigned_territories_count: data.assignedTerritoriesCount || 0,
      active_actions_count: data.activeActionsCount || 0,
      completed_actions_count: data.completedActionsCount || 0,
      pending_actions_count: data.pendingActionsCount || 0,
      last_activity_at: data.lastActivityAt || null,
      health_status: data.healthStatus || "NO_DATA",
      metadata_json: data.metadataJson || {},
      updated_at: new Date().toISOString(),
    };

    let query;
    if (existing?.id) {
      query = this.getClient()
        .from("campaign_coordinator_health")
        .update(snakeObj)
        .eq("id", existing.id);
    } else {
      (snakeObj as any).created_at = new Date().toISOString();
      query = this.getClient()
        .from("campaign_coordinator_health")
        .insert(snakeObj);
    }

    const { data: inserted, error } = await query.select().single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: computeCoordinatorHealth failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  // --- SPRINT 15.6 - CAMPAIGN CRM METHODS ---

  async getCampaignContacts(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContact[]> {
    const { data, error } = await this.getClient()
      .from("campaign_contacts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignContacts failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async addCampaignContact(data: any): Promise<CampaignContact> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      contact_id: data.contactId,
      contact_type: data.contactType,
      status: data.status || "ACTIVE",
      priority_level: data.priorityLevel || "MEDIUM",
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await this.getClient()
      .from("campaign_contacts")
      .insert(snakeObj)
      .select()
      .single();

    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: addCampaignContact failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateCampaignContact(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<CampaignContact> {
    const snakePayload: any = {};
    if (data.contactType !== undefined)
      snakePayload.contact_type = data.contactType;
    if (data.status !== undefined) snakePayload.status = data.status;
    if (data.priorityLevel !== undefined)
      snakePayload.priority_level = data.priorityLevel;
    if (data.metadataJson !== undefined)
      snakePayload.metadata_json = data.metadataJson;
    snakePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await this.getClient()
      .from("campaign_contacts")
      .update(snakePayload)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: updateCampaignContact failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getContactRelationships(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContactRelationship[]> {
    const { data, error } = await this.getClient()
      .from("campaign_contact_relationships")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getContactRelationships failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createRelationship(data: any): Promise<CampaignContactRelationship> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      source_contact_id: data.sourceContactId,
      target_contact_id: data.targetContactId,
      relationship_type: data.relationshipType,
      strength_level: data.strengthLevel || "medium",
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await this.getClient()
      .from("campaign_contact_relationships")
      .insert(snakeObj)
      .select()
      .single();

    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createRelationship failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getContactSegments(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContactSegment[]> {
    const { data, error } = await this.getClient()
      .from("campaign_contact_segments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getContactSegments failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createSegment(data: any): Promise<CampaignContactSegment> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      name: data.name,
      description: data.description || null,
      status: data.status || "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await this.getClient()
      .from("campaign_contact_segments")
      .insert(snakeObj)
      .select()
      .single();

    if (error) {
      console.error("SupabaseDatabaseAdapter: createSegment failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getContactEngagement(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignContactEngagement[]> {
    const { data, error } = await this.getClient()
      .from("campaign_contact_engagement")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getContactEngagement failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async computeContactEngagement(
    data: any,
  ): Promise<CampaignContactEngagement> {
    const { data: existing } = await this.getClient()
      .from("campaign_contact_engagement")
      .select("id")
      .eq("campaign_id", data.campaignId)
      .eq("contact_id", data.contactId)
      .maybeSingle();

    const snakeObj = {
      id: existing?.id || data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      contact_id: data.contactId,
      interactions_count: data.interactionsCount || 0,
      activities_count: data.activitiesCount || 0,
      events_count: data.eventsCount || 0,
      last_interaction_at: data.lastInteractionAt || null,
      engagement_status: data.engagementStatus || "NO_DATA",
      metadata_json: data.metadataJson || {},
      updated_at: new Date().toISOString(),
    };

    let query;
    if (existing?.id) {
      query = this.getClient()
        .from("campaign_contact_engagement")
        .update(snakeObj)
        .eq("id", existing.id);
    } else {
      (snakeObj as any).created_at = new Date().toISOString();
      query = this.getClient()
        .from("campaign_contact_engagement")
        .insert(snakeObj);
    }

    const { data: inserted, error } = await query.select().single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: computeContactEngagement failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  // --- SPRINT 15.7 - CAMPAIGN CALENDAR & EVENTS METHODS ---

  async getCampaignEvents(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignEvent[]> {
    const { data, error } = await this.getClient()
      .from("campaign_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error("SupabaseDatabaseAdapter: getCampaignEvents failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCampaignEvent(data: any): Promise<CampaignEvent> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      calendar_event_id: data.calendarEventId || null,
      event_type: data.eventType || "meeting",
      title: data.title,
      description: data.description || null,
      status: data.status || "ACTIVE",
      scheduled_start: data.scheduledStart,
      scheduled_end: data.scheduledEnd,
      location: data.location || null,
      metadata_json: data.metadataJson || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await this.getClient()
      .from("campaign_events")
      .insert(snakeObj)
      .select()
      .single();

    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createCampaignEvent failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async updateCampaignEvent(
    id: string,
    organizationId: string,
    campaignId: string,
    data: any,
  ): Promise<CampaignEvent> {
    const snakePayload: any = {};
    if (data.calendarEventId !== undefined)
      snakePayload.calendar_event_id = data.calendarEventId;
    if (data.eventType !== undefined) snakePayload.event_type = data.eventType;
    if (data.title !== undefined) snakePayload.title = data.title;
    if (data.description !== undefined)
      snakePayload.description = data.description;
    if (data.status !== undefined) snakePayload.status = data.status;
    if (data.scheduledStart !== undefined)
      snakePayload.scheduled_start = data.scheduledStart;
    if (data.scheduledEnd !== undefined)
      snakePayload.scheduled_end = data.scheduledEnd;
    if (data.location !== undefined) snakePayload.location = data.location;
    if (data.metadataJson !== undefined)
      snakePayload.metadata_json = data.metadataJson;
    snakePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await this.getClient()
      .from("campaign_events")
      .update(snakePayload)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId)
      .select()
      .single();

    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: updateCampaignEvent failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(updated);
  }

  async getEventParticipants(
    organizationId: string,
    campaignId: string,
    eventId: string,
  ): Promise<CampaignEventParticipant[]> {
    const { data, error } = await this.getClient()
      .from("campaign_event_participants")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId)
      .eq("event_id", eventId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getEventParticipants failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async addParticipant(data: any): Promise<CampaignEventParticipant> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      event_id: data.eventId,
      contact_id: data.contactId,
      participant_type: data.participantType || "guest",
      status: data.status || "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await this.getClient()
      .from("campaign_event_participants")
      .insert(snakeObj)
      .select()
      .single();

    if (error) {
      console.error("SupabaseDatabaseAdapter: addParticipant failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getEventAttendance(
    organizationId: string,
    campaignId: string,
    eventId: string,
  ): Promise<CampaignEventAttendance[]> {
    const { data, error } = await this.getClient()
      .from("campaign_event_attendance")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId)
      .eq("event_id", eventId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getEventAttendance failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async registerAttendance(data: any): Promise<CampaignEventAttendance> {
    const { data: existing, error: findError } = await this.getClient()
      .from("campaign_event_attendance")
      .select("*")
      .eq("event_id", data.eventId)
      .eq("contact_id", data.contactId)
      .maybeSingle();

    const snakeObj: any = {
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      event_id: data.eventId,
      contact_id: data.contactId,
      attendance_status: data.attendanceStatus || "confirmed",
      checkin_at: data.checkinAt || null,
      checkout_at: data.checkoutAt || null,
    };

    let query;
    if (existing?.id) {
      query = this.getClient()
        .from("campaign_event_attendance")
        .update(snakeObj)
        .eq("id", existing.id);
    } else {
      snakeObj.id = data.id || undefined;
      snakeObj.created_at = new Date().toISOString();
      query = this.getClient()
        .from("campaign_event_attendance")
        .insert(snakeObj);
    }

    const { data: result, error } = await query.select().single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: registerAttendance failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(result);
  }

  async linkEventTerritory(data: any): Promise<CampaignEventTerritory> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      event_id: data.eventId,
      territory_id: data.territoryId,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await this.getClient()
      .from("campaign_event_territories")
      .insert(snakeObj)
      .select()
      .single();

    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: linkEventTerritory failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async linkEventEvidence(data: any): Promise<CampaignEventEvidence> {
    const snakeObj = {
      id: data.id || undefined,
      organization_id: data.organizationId,
      workspace_id: data.workspaceId,
      campaign_id: data.campaignId,
      event_id: data.eventId,
      evidence_id: data.evidenceId,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await this.getClient()
      .from("campaign_event_evidences")
      .insert(snakeObj)
      .select()
      .single();

    if (error) {
      console.error("SupabaseDatabaseAdapter: linkEventEvidence failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCampaignEventTerritories(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignEventTerritory[]> {
    const { data, error } = await this.getClient()
      .from("campaign_event_territories")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignEventTerritories failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getCampaignEventEvidences(
    organizationId: string,
    campaignId: string,
  ): Promise<CampaignEventEvidence[]> {
    const { data, error } = await this.getClient()
      .from("campaign_event_evidences")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCampaignEventEvidences failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  // --- SPRINT 15.8 - COMMUNICATION & ACTION DISPATCH ---
  async getCommunicationThreads(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationThread[]> {
    const { data, error } = await this.getClient()
      .from("communication_threads")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .limit(500);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCommunicationThreads failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCommunicationThread(data: any): Promise<CommunicationThread> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("communication_threads")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createThread failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCommunicationMessages(
    organizationId: string,
    workspaceId: string,
    threadId: string,
  ): Promise<CommunicationMessage[]> {
    const { data, error } = await this.getClient()
      .from("communication_messages")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCommunicationMessages failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getTotalMessagesCount(
    organizationId: string,
    workspaceId: string,
  ): Promise<number> {
    const { count, error } = await this.getClient()
      .from("communication_messages")
      .select("*", { count: 'exact', head: true })
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
      
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getTotalMessagesCount failed",
        error,
      );
      return 0;
    }
    return count || 0;
  }

  async sendCommunicationMessage(data: any): Promise<CommunicationMessage> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("communication_messages")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: sendCommunicationMessage failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async addCommunicationParticipant(
    data: any,
  ): Promise<CommunicationParticipant> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("communication_participants")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: addCommunicationParticipant failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCommunicationParticipants(
    organizationId: string,
    workspaceId: string,
    threadId: string,
  ): Promise<CommunicationParticipant[]> {
    const { data, error } = await this.getClient()
      .from("communication_participants")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .eq("thread_id", threadId)
      .limit(500);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCommunicationParticipants failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getCommunicationRequests(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationRequest[]> {
    const { data, error } = await this.getClient()
      .from("communication_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCommunicationRequests failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCommunicationRequest(data: any): Promise<CommunicationRequest> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("communication_requests")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createRequest failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCommunicationDispatches(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationDispatch[]> {
    const { data, error } = await this.getClient()
      .from("communication_dispatches")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCommunicationDispatches failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCommunicationDispatch(data: any): Promise<CommunicationDispatch> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("communication_dispatches")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createDispatch failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async getCommunicationLogs(
    organizationId: string,
    workspaceId: string,
  ): Promise<CommunicationLog[]> {
    const { data, error } = await this.getClient()
      .from("communication_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getCommunicationLogs failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createCommunicationLog(data: any): Promise<CommunicationLog> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("communication_logs")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createCommunicationLog failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  // --- SPRINT 15.9: USER PRESENCE & OPERATIONAL COMMUNICATION ---

  async getUserPresence(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserPresence[]> {
    let query = this.getClient()
      .from("user_presence")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("SupabaseDatabaseAdapter: getUserPresence failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async updateUserPresence(data: any): Promise<UserPresence> {
    // Upsert equivalent manual via select then insert/update
    const { data: existing, error: findError } = await this.getClient()
      .from("user_presence")
      .select("id")
      .eq("organization_id", data.organizationId)
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", data.userId)
      .single();

    if (findError && findError.code !== "PGRST116") {
      // PGRST116 is no rows, ignore
      throw findError;
    }

    const row = mapToSnakeCase({
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString(),
    });

    if (existing) {
      // update
      const { data: updated, error } = await this.getClient()
        .from("user_presence")
        .update(row)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(updated);
    } else {
      // insert
      row.created_at = data.createdAt || new Date().toISOString();
      const { data: inserted, error } = await this.getClient()
        .from("user_presence")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(inserted);
    }
  }

  async getUserSessions(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserSession[]> {
    let query = this.getClient()
      .from("user_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .order("started_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("SupabaseDatabaseAdapter: getUserSessions failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createUserSession(data: any): Promise<UserSession> {
    const row = mapToSnakeCase({
      ...data,
      startedAt: data.startedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("user_sessions")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error("SupabaseDatabaseAdapter: createUserSession failed", error);
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  async closeUserSession(
    organizationId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<UserSession> {
    const { data, error } = await this.getClient()
      .from("user_sessions")
      .update({
        status: "terminated",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("SupabaseDatabaseAdapter: closeUserSession failed", error);
      throw error;
    }
    return mapToCamelCase(data);
  }

  async getUserActivityLog(
    organizationId: string,
    workspaceId: string,
    userId?: string,
  ): Promise<UserActivityLog[]> {
    let query = this.getClient()
      .from("user_activity_log")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: getUserActivityLog failed",
        error,
      );
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createUserActivity(data: any): Promise<UserActivityLog> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("user_activity_log")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error(
        "SupabaseDatabaseAdapter: createUserActivity failed",
        error,
      );
      throw error;
    }
    return mapToCamelCase(inserted);
  }

  // --- SPRINT 16.3: AI ROUTER FOUNDATION ---

  async getProviders(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("ai_provider_registry")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) {
      console.error("SupabaseDatabaseAdapter: getProviders failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async registerProvider(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.configuration) {
      dbData.configurationJson = dbData.configuration;
      delete dbData.configuration;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("ai_provider_registry")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async enableProvider(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const { data: updated, error } = await this.getClient()
      .from("ai_provider_registry")
      .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(updated);
  }

  async disableProvider(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const { data: updated, error } = await this.getClient()
      .from("ai_provider_registry")
      .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(updated);
  }

  async getPolicies(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("ai_router_policies")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) {
      console.error("SupabaseDatabaseAdapter: getPolicies failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createPolicy(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.configuration) {
      dbData.configurationJson = dbData.configuration;
      delete dbData.configuration;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("ai_router_policies")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getRouterRequests(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("ai_router_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getRouterRequests failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createRouterRequest(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("ai_router_requests")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async getRouterAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("ai_router_audits")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getRouterAudits failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async createRouterAudit(data: any): Promise<any> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("ai_router_audits")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  // --- SPRINT 16.4: BETA ACTION EXECUTION FOUNDATION ---

  async createActionRequest(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.payload) {
      dbData.payloadJson = dbData.payload;
      delete dbData.payload;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("beta_action_requests")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.payloadJson) {
      result.payload = result.payloadJson;
      delete result.payloadJson;
    }
    return result;
  }

  async getActionRequests(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_action_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getActionRequests failed", error);
      return [];
    }
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.payloadJson) {
        mapped.payload = mapped.payloadJson;
        delete mapped.payloadJson;
      }
      return mapped;
    });
  }

  async getActionRequestById(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("beta_action_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .single();
    if (error) return null;
    const mapped = mapToCamelCase(data);
    if (mapped.payloadJson) {
      mapped.payload = mapped.payloadJson;
      delete mapped.payloadJson;
    }
    return mapped;
  }

  async createActionDispatch(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("beta_action_dispatches")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getActionDispatches(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_action_dispatches")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getActionDispatches failed", error);
      return [];
    }
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createBetaActionLog(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.details) {
      dbData.detailsJson = dbData.details;
      delete dbData.details;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("beta_action_logs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.detailsJson) {
      result.details = result.detailsJson;
      delete result.detailsJson;
    }
    return result;
  }

  async getBetaActionLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_action_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getActionLogs failed", error);
      return [];
    }
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.detailsJson) {
        mapped.details = mapped.detailsJson;
        delete mapped.detailsJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 16.5: BETA SKILLS FOUNDATION ---

  async registerSkill(data: any): Promise<any> {
    const row = mapToSnakeCase({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("beta_skills")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async enableSkill(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const { data: updated, error } = await this.getClient()
      .from("beta_skills")
      .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) return null;
    return mapToCamelCase(updated);
  }

  async disableSkill(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const { data: updated, error } = await this.getClient()
      .from("beta_skills")
      .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) return null;
    return mapToCamelCase(updated);
  }

  async getSkill(organizationId: string, workspaceId: string, id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("beta_skills")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .single();
    if (error) return null;
    return mapToCamelCase(data);
  }

  async getSkills(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_skills")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getSkills failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getCapabilities(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_capabilities")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getCapabilities failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  async getSkillRegistry(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_skill_registry")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getSkillRegistry failed", error);
      return [];
    }
    return data.map(mapToCamelCase);
  }

  // --- SPRINT 16.6: BETA OPERATIONAL ORCHESTRATOR ---

  async createOperationalIntent(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("beta_operational_intents")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getOperationalIntents(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_operational_intents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getOperationalIntents failed", error);
      return [];
    }
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createOperationalDispatch(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("beta_operational_dispatches")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getOperationalDispatches(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_operational_dispatches")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getOperationalDispatches failed", error);
      return [];
    }
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createOperationalResult(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.details) {
      dbData.detailsJson = dbData.details;
      delete dbData.details;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("beta_operational_results")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.detailsJson) {
      result.details = result.detailsJson;
      delete result.detailsJson;
    }
    return result;
  }

  async getOperationalResults(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("beta_operational_results")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("SupabaseDatabaseAdapter: getOperationalResults failed", error);
      return [];
    }
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.detailsJson) {
        mapped.details = mapped.detailsJson;
        delete mapped.detailsJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 17.0: BETA GOV WORKSPACE FOUNDATION ---

  async getGovernmentWorkspace(organizationId: string, workspaceId: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_workspaces")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) return null;
    const result = mapToCamelCase(data);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createGovernmentWorkspace(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_workspaces")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createGovernmentWorkspaceSnapshot(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.snapshot) {
      dbData.snapshotJson = dbData.snapshot;
      delete dbData.snapshot;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_workspace_snapshots")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.snapshotJson) {
      result.snapshot = result.snapshotJson;
      delete result.snapshotJson;
    }
    return result;
  }

  async getGovernmentWorkspaceSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workspace_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.snapshotJson) {
        mapped.snapshot = mapped.snapshotJson;
        delete mapped.snapshotJson;
      }
      return mapped;
    });
  }

  async createGovernmentLog(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.details) {
      dbData.detailsJson = dbData.details;
      delete dbData.details;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_workspace_logs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.detailsJson) {
      result.details = result.detailsJson;
      delete result.detailsJson;
    }
    return result;
  }

  async getGovernmentLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workspace_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.detailsJson) {
        mapped.details = mapped.detailsJson;
        delete mapped.detailsJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 17.1: GOVERNMENT OBJECTIVES & PROGRAM MANAGEMENT ---

  async createGovernmentObjective(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_objectives")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentObjectives(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_objectives")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createGovernmentProgram(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_programs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_programs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createGovernmentProject(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_projects")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentProjects(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_projects")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createGovernmentAction(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_actions")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentActions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_actions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 17.2: GOVERNMENT INDICATORS & PERFORMANCE MANAGEMENT ---

  async createGovernmentIndicator(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_indicators")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_indicators")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createGovernmentGoal(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString(),
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_goals")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentGoals(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_goals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createGovernmentResult(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_results")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentResults(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_results")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async createGovernmentPerformanceSnapshot(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.snapshot) {
      dbData.snapshotJson = dbData.snapshot;
      delete dbData.snapshot;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_performance_snapshots")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.snapshotJson) {
      result.snapshot = result.snapshotJson;
      delete result.snapshotJson;
    }
    return result;
  }

  async getGovernmentPerformanceSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_performance_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.snapshotJson) {
        mapped.snapshot = mapped.snapshotJson;
        delete mapped.snapshotJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 17.3: GOVERNMENT REPORTING & EXECUTIVE BRIEF FOUNDATION ---

  async createGovernmentReport(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_reports")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentReports(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_reports")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getGovernmentReport(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const result = mapToCamelCase(data);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createExecutiveBrief(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_executive_briefs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_executive_briefs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getExecutiveBrief(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_executive_briefs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const result = mapToCamelCase(data);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createMonitoringSnapshot(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.snapshot) {
      dbData.snapshotJson = dbData.snapshot;
      delete dbData.snapshot;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_monitoring_snapshots")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.snapshotJson) {
      result.snapshot = result.snapshotJson;
      delete result.snapshotJson;
    }
    return result;
  }

  async getMonitoringSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_monitoring_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.snapshotJson) {
        mapped.snapshot = mapped.snapshotJson;
        delete mapped.snapshotJson;
      }
      return mapped;
    });
  }

  async createGovernmentReportLog(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.details) {
      dbData.detailsJson = dbData.details;
      delete dbData.details;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_report_logs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.detailsJson) {
      result.details = result.detailsJson;
      delete result.detailsJson;
    }
    return result;
  }

  async getGovernmentReportLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_report_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.detailsJson) {
        mapped.details = mapped.detailsJson;
        delete mapped.detailsJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 17.4: GOV GOVERNANCE & EXECUTIVE REVIEW FOUNDATION ---

  async createGovernanceReview(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_governance_reviews")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernanceReviews(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_governance_reviews")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getGovernanceReview(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_governance_reviews")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const mapped = mapToCamelCase(data);
    if (mapped.metadataJson) {
      mapped.metadata = mapped.metadataJson;
      delete mapped.metadataJson;
    }
    return mapped;
  }

  async createExecutiveMeeting(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_executive_meetings")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getExecutiveMeetings(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_executive_meetings")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getExecutiveMeeting(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_executive_meetings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const mapped = mapToCamelCase(data);
    if (mapped.metadataJson) {
      mapped.metadata = mapped.metadataJson;
      delete mapped.metadataJson;
    }
    return mapped;
  }

  async createStrategicCycle(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_strategic_cycles")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getStrategicCycles(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_strategic_cycles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getStrategicCycle(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_strategic_cycles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const mapped = mapToCamelCase(data);
    if (mapped.metadataJson) {
      mapped.metadata = mapped.metadataJson;
      delete mapped.metadataJson;
    }
    return mapped;
  }

  async createGovernmentDecision(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_decisions")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getGovernmentDecisions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_decisions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getGovernmentDecision(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_decisions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const mapped = mapToCamelCase(data);
    if (mapped.metadataJson) {
      mapped.metadata = mapped.metadataJson;
      delete mapped.metadataJson;
    }
    return mapped;
  }

  async createMonitoringReview(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("government_monitoring_reviews")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getMonitoringReviews(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_monitoring_reviews")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getMonitoringReview(id: string): Promise<any> {
    const { data, error } = await this.getClient()
      .from("government_monitoring_reviews")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const mapped = mapToCamelCase(data);
    if (mapped.metadataJson) {
      mapped.metadata = mapped.metadataJson;
      delete mapped.metadataJson;
    }
    return mapped;
  }

  // --- SPRINT 18.0: BETA LICITA WORKSPACE FOUNDATION ---

  async getProcurementWorkspace(organizationId: string, workspaceId: string): Promise<any | null> {
    const { data, error } = await this.getClient()
      .from("procurement_workspaces")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const mapped = mapToCamelCase(data);
    if (mapped.metadataJson) {
      mapped.metadata = mapped.metadataJson;
      delete mapped.metadataJson;
    }
    return mapped;
  }

  async createProcurementWorkspace(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_workspaces")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createProcurementLog(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.details) {
      dbData.detailsJson = dbData.details;
      delete dbData.details;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_workspace_logs")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.detailsJson) {
      result.details = result.detailsJson;
      delete result.detailsJson;
    }
    return result;
  }

  async getProcurementLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_workspace_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.detailsJson) {
        mapped.details = mapped.detailsJson;
        delete mapped.detailsJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 18.1: PROCUREMENT BID & OPPORTUNITY MANAGEMENT FOUNDATION ---

  async createOpportunity(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_opportunities")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createBid(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_bids")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createParticipation(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_participations")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createLot(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_lots")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createProposal(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_proposals")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getOpportunities(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_opportunities")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getBids(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_bids")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getParticipations(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_participations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getLots(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_lots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getProposals(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_proposals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 18.2: SUPPLIER & PROCUREMENT DOCUMENT MANAGEMENT FOUNDATION ---

  async createSupplier(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_suppliers")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createSupplierDocument(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_supplier_documents")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createSupplierCertificate(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_supplier_certificates")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createSupplierQualification(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_supplier_qualifications")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createSupplierRegistry(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_supplier_registries")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getSuppliers(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_suppliers")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getSupplierDocuments(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_supplier_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getSupplierCertificates(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_supplier_certificates")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getSupplierQualifications(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_supplier_qualifications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getSupplierRegistries(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_supplier_registries")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 18.3: PROCUREMENT CONTRACT & CONTRACT EXECUTION FOUNDATION ---

  async createContract(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_contracts")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createContractExecution(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_contract_executions")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createInspection(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_inspections")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createDelivery(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_deliveries")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createMeasurement(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_measurements")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createContractIssue(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_contract_issues")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getContracts(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_contracts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getContractExecutions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_contract_executions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getInspections(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_inspections")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getDeliveries(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_deliveries")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getMeasurements(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_measurements")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getContractIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_contract_issues")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  // --- SPRINT 18.4: PROCUREMENT AUDIT, COMPLIANCE & ARP MANAGEMENT FOUNDATION ---

  async createARP(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_arps")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createARPItem(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_arp_items")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createARPConsumption(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_arp_consumptions")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createARPParticipant(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_arp_participants")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createARPCarona(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_arp_caronas")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createAuditEvent(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_audit_events")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async createComplianceEvent(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    const { data: inserted, error } = await this.getClient()
      .from("procurement_compliance_events")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const result = mapToCamelCase(inserted);
    if (result.metadataJson) {
      result.metadata = result.metadataJson;
      delete result.metadataJson;
    }
    return result;
  }

  async getARPs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_arps")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getARPItems(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_arp_items")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getARPConsumptions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_arp_consumptions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getARPParticipants(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_arp_participants")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getARPCaronas(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_arp_caronas")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getAuditEvents(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_audit_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  async getComplianceEvents(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("procurement_compliance_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return data.map(d => {
      const mapped = mapToCamelCase(d);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    });
  }

  // --- Sprint 18.5 - Procurement Reporting & Executive Brief Foundation ---
  private fallbackReports: any[] = [];
  private fallbackExecutiveBriefs: any[] = [];
  private fallbackMonitoringSnapshots: any[] = [];
  private fallbackReportLogs: any[] = [];

  async createReport(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("procurement_reports")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackReports.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createProcurementExecutiveBrief(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("procurement_executive_briefs")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackExecutiveBriefs.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createProcurementMonitoringSnapshot(data: any): Promise<any> {
    const dbData = { ...data };
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("procurement_monitoring_snapshots")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(inserted);
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackMonitoringSnapshots.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createReportLog(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("procurement_report_logs")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackReportLogs.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getReports(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("procurement_reports")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackReports.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getReport(id: string): Promise<any> {
    try {
      const { data, error } = await this.getClient()
        .from("procurement_reports")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapToCamelCase(data);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      return this.fallbackReports.find(d => d.id === id) || null;
    }
  }

  async getProcurementExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("procurement_executive_briefs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackExecutiveBriefs.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getProcurementExecutiveBrief(id: string): Promise<any> {
    try {
      const { data, error } = await this.getClient()
        .from("procurement_executive_briefs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapToCamelCase(data);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      return this.fallbackExecutiveBriefs.find(d => d.id === id) || null;
    }
  }

  async getProcurementMonitoringSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("procurement_monitoring_snapshots")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => mapToCamelCase(d));
    } catch (e) {
      return this.fallbackMonitoringSnapshots.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  // --- SPRINT 19.0 - GOVERNMENT AMENDMENTS FOUNDATION ---
  private fallbackParliamentarians: any[] = [];
  private fallbackAmendments: any[] = [];
  private fallbackBeneficiaries: any[] = [];
  private fallbackDestinations: any[] = [];
  private fallbackExecutions: any[] = [];

  async createParliamentarian(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_parliamentarians")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackParliamentarians.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createAmendment(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendments")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackAmendments.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createBeneficiary(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_beneficiaries")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackBeneficiaries.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createDestination(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_destinations")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackDestinations.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createExecution(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_executions")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackExecutions.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getParliamentarians(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_parliamentarians")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackParliamentarians.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getAmendments(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendments")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackAmendments.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getBeneficiaries(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_beneficiaries")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackBeneficiaries.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getDestinations(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_destinations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackDestinations.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getExecutions(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_executions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackExecutions.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  // --- SPRINT 19.1 - GOVERNMENT AMENDMENT EXECUTION, MONITORING & ACCOUNTABILITY ---
  private fallbackMilestones: any[] = [];
  private fallbackMonitorings: any[] = [];
  private fallbackEvidences: any[] = [];
  private fallbackAccountabilities: any[] = [];
  private fallbackIssues: any[] = [];

  // --- SPRINT 19.2 - GOVERNMENT AMENDMENT REPORTING, EXECUTIVE REVIEW & ACCOUNTABILITY ---
  private fallbackGovAmendmentReports: any[] = [];
  private fallbackGovAmendmentExecutiveBriefs: any[] = [];
  private fallbackGovAmendmentSnapshots: any[] = [];
  private fallbackGovAmendmentReviews: any[] = [];
  private fallbackGovAmendmentCycles: any[] = [];

  // --- SPRINT 20.0 - GOVERNMENT HEALTH INTELLIGENCE FOUNDATION ---
  private fallbackHealthUnits: any[] = [];
  private fallbackHealthTeams: any[] = [];
  private fallbackHealthPrograms: any[] = [];
  private fallbackHealthIndicators: any[] = [];
  private fallbackHealthCoverages: any[] = [];
  private fallbackHealthProductions: any[] = [];
  // Sprint 20.1 Fallbacks
  private fallbackHealthGoals: any[] = [];
  private fallbackHealthResults: any[] = [];
  private fallbackHealthMonitorings: any[] = [];
  private fallbackHealthEvidences: any[] = [];
  private fallbackHealthIssues: any[] = [];
  private fallbackHealthSnapshots: any[] = [];
  // Sprint 21.0 Fallbacks
  private fallbackEducationUnits: any[] = [];
  private fallbackEducationTeams: any[] = [];
  private fallbackEducationPrograms: any[] = [];
  private fallbackEducationIndicators: any[] = [];
  private fallbackEducationCoverages: any[] = [];
  private fallbackEducationProductions: any[] = [];

  async createMilestone(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_milestones")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackMilestones.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createMonitoring(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_monitorings")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackMonitorings.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createGovAmendmentEvidence(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_evidences")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackEvidences.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createAccountability(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_accountabilities")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackAccountabilities.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createIssue(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_issues")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackIssues.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getMilestones(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_milestones")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackMilestones.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_monitorings")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackMonitorings.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getGovAmendmentEvidences(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_evidences")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackEvidences.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getAccountabilities(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_accountabilities")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackAccountabilities.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_issues")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackIssues.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  // --- SPRINT 19.2 - GOVERNMENT AMENDMENT REPORTING, EXECUTIVE REVIEW & ACCOUNTABILITY METRICS ---
  async createGovernmentAmendmentReport(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_reports")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackGovAmendmentReports.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createGovernmentAmendmentExecutiveBrief(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_executive_briefs")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackGovAmendmentExecutiveBriefs.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createGovernmentAmendmentSnapshot(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_snapshots")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackGovAmendmentSnapshots.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createGovernmentAmendmentReview(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_reviews")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackGovAmendmentReviews.push(fallbackItem);
      return fallbackItem;
    }
  }

  async createGovernmentAmendmentCycle(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const row = mapToSnakeCase({
      ...dbData,
      createdAt: dbData.createdAt || new Date().toISOString(),
      updatedAt: dbData.updatedAt || new Date().toISOString()
    });
    try {
      const { data: inserted, error } = await this.getClient()
        .from("government_amendment_cycles")
        .insert([row])
        .select()
        .single();
      if (error) throw error;
      const mapped = mapToCamelCase(inserted);
      if (mapped.metadataJson) {
        mapped.metadata = mapped.metadataJson;
        delete mapped.metadataJson;
      }
      return mapped;
    } catch (e) {
      const fallbackItem = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      this.fallbackGovAmendmentCycles.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getGovernmentAmendmentReports(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_reports")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackGovAmendmentReports.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getGovernmentAmendmentExecutiveBriefs(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_executive_briefs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackGovAmendmentExecutiveBriefs.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getGovernmentAmendmentSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_snapshots")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackGovAmendmentSnapshots.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getGovernmentAmendmentReviews(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_reviews")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackGovAmendmentReviews.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async getGovernmentAmendmentCycles(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_amendment_cycles")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(d => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackGovAmendmentCycles.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  // --- SPRINT 20.0 - GOVERNMENT HEALTH INTELLIGENCE FOUNDATION ---
  async createHealthUnit(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_units")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthUnits.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthUnits(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_units")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthUnits.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthTeam(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_teams")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthTeams.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthTeams(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_teams")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthTeams.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthProgram(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_programs")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthPrograms.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_programs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthPrograms.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthIndicator(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_indicators")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthIndicators.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_indicators")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthIndicators.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthCoverage(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_coverages")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthCoverages.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthCoverages(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_coverages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthCoverages.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthProduction(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_productions")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthProductions.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthProductions(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_productions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthProductions.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  // ============================================================================
  // SPRINT 20.1 - HEALTH PERFORMANCE & MONITORING FOUNDATION
  // ============================================================================

  async createHealthGoal(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_goals")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthGoals.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthGoals(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_goals")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthGoals.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthResult(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_results")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthResults.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthResults(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_results")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthResults.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthMonitoring(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_monitorings")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthMonitorings.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_monitorings")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthMonitorings.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthEvidence(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_evidences")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthEvidences.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthEvidences(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_evidences")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthEvidences.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthIssue(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_issues")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthIssues.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_issues")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthIssues.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createHealthSnapshot(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_health_snapshots")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackHealthSnapshots.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getHealthSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_health_snapshots")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackHealthSnapshots.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  // ============================================================================
  // SPRINT 21.0 - EDUCATION INTELLIGENCE FOUNDATION
  // ============================================================================

  async createEducationUnit(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_education_units")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackEducationUnits.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getEducationUnits(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_education_units")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackEducationUnits.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createEducationTeam(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_education_teams")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackEducationTeams.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getEducationTeams(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_education_teams")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackEducationTeams.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createEducationProgram(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_education_programs")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackEducationPrograms.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getEducationPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_education_programs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackEducationPrograms.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createEducationIndicator(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_education_indicators")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackEducationIndicators.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getEducationIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_education_indicators")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackEducationIndicators.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createEducationCoverage(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_education_coverages")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackEducationCoverages.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getEducationCoverages(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_education_coverages")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackEducationCoverages.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  async createEducationProduction(data: any): Promise<any> {
    const dbData = { ...data };
    if (dbData.metadata) {
      dbData.metadataJson = dbData.metadata;
      delete dbData.metadata;
    }
    const snakeCaseData = mapToSnakeCase(dbData);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    if (!snakeCaseData.status) snakeCaseData.status = "NO_DATA";

    try {
      const { data: result, error } = await this.getClient()
        .from("government_education_productions")
        .insert(snakeCaseData)
        .select()
        .single();
      if (error) throw error;
      return mapToCamelCase(result);
    } catch (e) {
      const fallbackItem = { ...data, id: data.id || crypto.randomUUID() };
      this.fallbackEducationProductions.push(fallbackItem);
      return fallbackItem;
    }
  }

  async getEducationProductions(organizationId: string, workspaceId: string): Promise<any[]> {
    try {
      const { data, error } = await this.getClient()
        .from("government_education_productions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data.map((d: any) => {
        const mapped = mapToCamelCase(d);
        if (mapped.metadataJson) {
          mapped.metadata = mapped.metadataJson;
          delete mapped.metadataJson;
        }
        return mapped;
      });
    } catch (e) {
      return this.fallbackEducationProductions.filter(
        d => d.organizationId === organizationId && d.workspaceId === workspaceId
      );
    }
  }

  // --- SPRINT 21.1 - EDUCATION PERFORMANCE & MONITORING FOUNDATION ---

  async createEducationGoal(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_education_goals")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getEducationGoals(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_education_goals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createEducationResult(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_education_results")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getEducationResults(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_education_results")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createEducationMonitoring(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_education_monitorings")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getEducationMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_education_monitorings")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createEducationEvidence(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_education_evidences")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getEducationEvidences(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_education_evidences")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createEducationIssue(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_education_issues")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getEducationIssues(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_education_issues")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createEducationSnapshot(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_education_snapshots")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getEducationSnapshots(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_education_snapshots")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  // --- SPRINT 19.3 - GOVERNMENT FUNDING OPPORTUNITY ---
  async getFundingOpportunities(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_funding_opportunities")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createFundingOpportunity(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_opportunities")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateFundingOpportunity(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_opportunities")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getFundingPrograms(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_funding_programs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createFundingProgram(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_programs")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getFundingNotices(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_funding_notices")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createFundingNotice(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_notices")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getFundingRequirements(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_funding_requirements")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createFundingRequirement(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_requirements")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getFundingProposals(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_funding_proposals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createFundingProposal(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_proposals")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateFundingProposal(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_proposals")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getFundingSubmissions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_funding_submissions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createFundingSubmission(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_funding_submissions")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 19.4: GOVERNMENT AMENDMENT STRATEGIC PLANNING & PORTFOLIO FOUNDATION ---
  async getAmendmentPortfolios(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_amendment_portfolios")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAmendmentPortfolio(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_portfolios")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateAmendmentPortfolio(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_portfolios")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAmendmentPortfolioItems(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_amendment_portfolio_items")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAmendmentPortfolioItem(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_portfolio_items")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateAmendmentPortfolioItem(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_portfolio_items")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAmendmentPriorities(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_amendment_priorities")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAmendmentPriority(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_priorities")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateAmendmentPriority(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_priorities")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAmendmentObjectives(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_amendment_objectives")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAmendmentObjective(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_objectives")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateAmendmentObjective(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_objectives")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAmendmentActionPlans(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_amendment_action_plans")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAmendmentActionPlan(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_action_plans")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateAmendmentActionPlan(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_action_plans")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAmendmentFollowUps(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_amendment_followups")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAmendmentFollowUp(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_followups")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async updateAmendmentFollowUp(id: string, organizationId: string, workspaceId: string, data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_amendment_followups")
      .update(snakeCaseData)
      .eq("id", id)
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }


  // --- SPRINT 22.0: PORTAL DA TRANSPARENCIA INTELIGENTE FOUNDATION ---
  async getTransparencyPublications(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_publications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyPublication(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_publications")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyCategories(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyCategory(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_categories")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyDatasets(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_datasets")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyDataset(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_datasets")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_indicators")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyIndicator(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_indicators")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyDocuments(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyDocument(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_documents")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyReports(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_reports")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyReport(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_reports")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 22.1: GOVERNMENT OMBUDSMAN FOUNDATION ---
  async getOmbudsmanRequests(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_ombudsman_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createOmbudsmanRequest(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_ombudsman_requests")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getOmbudsmanCategories(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_ombudsman_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createOmbudsmanCategory(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_ombudsman_categories")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getOmbudsmanProtocols(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_ombudsman_protocols")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createOmbudsmanProtocol(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_ombudsman_protocols")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getOmbudsmanResponses(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_ombudsman_responses")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createOmbudsmanResponse(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_ombudsman_responses")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getOmbudsmanAttachments(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_ombudsman_attachments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createOmbudsmanAttachment(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_ombudsman_attachments")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 22.2: TRANSPARENCY ANALYTICS ---
  
  async getTransparencyMetrics(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_metrics")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyMetric(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_metrics")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyKPIs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_kpis")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyKPI(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_kpis")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyCompliances(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_compliance")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyCompliance(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_compliance")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_audits")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyAudit(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_audits")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getTransparencyMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_transparency_monitorings")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createTransparencyMonitoring(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_transparency_monitorings")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 22.3: PUBLIC TRANSPARENCY PORTAL CONSOLIDATION ---

  async getPublicPortals(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_public_portals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createPublicPortal(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_public_portals")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getPublicCatalogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_public_catalogs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createPublicCatalog(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_public_catalogs")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getPublicDatasets(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_public_datasets")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createPublicDataset(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_public_datasets")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getPublicPublications(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_public_publications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createPublicPublication(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_public_publications")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getPublicQueries(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_public_queries")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createPublicQuery(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_public_queries")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getPublicAccessLogs(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_public_access_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createPublicAccessLog(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_public_access_logs")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 23.0: PREFEITURA ZERO PAPEL ---

  async getProtocols(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_protocols")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProtocol(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_protocols")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProcesses(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_processes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProcess(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_processes")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getDocumentRecords(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_document_records")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDocumentRecord(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_document_records")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getDispatches(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_dispatches")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDispatch(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_dispatches")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getRoutings(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_routings")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createRouting(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_routings")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProcessSteps(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_process_steps")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProcessStep(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_process_steps")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProcessHistories(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_process_history")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProcessHistory(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_process_history")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 23.1: PROTOCOL & PROCESS MANAGEMENT FOUNDATION ---

  async getDepartments(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_departments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDepartment(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_departments")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProtocolQueues(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_protocol_queues")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProtocolQueue(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_protocol_queues")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProcessAssignments(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_process_assignments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProcessAssignment(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_process_assignments")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProcessMovements(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_process_movements")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProcessMovement(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_process_movements")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProcessResponsibles(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_process_responsibles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProcessResponsible(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_process_responsibles")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getProcessSectors(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_process_sectors")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createProcessSector(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_process_sectors")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 23.2: WORKFLOW & ROUTING FOUNDATION ---

  async getWorkflows(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workflows")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createWorkflow(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_workflows")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getWorkflowStages(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workflow_stages")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createWorkflowStage(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_workflow_stages")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getWorkflowTransitions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workflow_transitions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createWorkflowTransition(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_workflow_transitions")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getWorkflowQueues(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workflow_queues")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createWorkflowQueue(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_workflow_queues")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getWorkflowExecutions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workflow_executions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createWorkflowExecution(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_workflow_executions")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getWorkflowRoutes(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_workflow_routes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createWorkflowRoute(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_workflow_routes")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 23.3: DOCUMENT LIFECYCLE FOUNDATION ---

  async getDocumentVersions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_document_versions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDocumentVersion(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_document_versions")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getDocumentClassifications(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_document_classifications")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDocumentClassification(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_document_classifications")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getDocumentRetentions(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_document_retentions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDocumentRetention(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_document_retentions")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getDocumentArchives(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_document_archives")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDocumentArchive(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_document_archives")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getDocumentMovements(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_document_movements")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDocumentMovement(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_document_movements")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getDocumentAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_document_audits")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createDocumentAudit(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_document_audits")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  // --- SPRINT 23.4: ADMINISTRATIVE GOVERNANCE FOUNDATION ---

  async getAdministrativeIndicators(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_administrative_indicators")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAdministrativeIndicator(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_administrative_indicators")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAdministrativeAudits(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_administrative_audits")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAdministrativeAudit(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_administrative_audits")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAdministrativeCompliances(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_administrative_compliances")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAdministrativeCompliance(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_administrative_compliances")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAdministrativeResponsibilities(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_administrative_responsibilities")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAdministrativeResponsibility(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_administrative_responsibilities")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAdministrativeMonitorings(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_administrative_monitorings")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAdministrativeMonitoring(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_administrative_monitorings")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getAdministrativeOccurrences(organizationId: string, workspaceId: string): Promise<any[]> {
    const { data, error } = await this.getClient()
      .from("government_administrative_occurrences")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createAdministrativeOccurrence(data: any): Promise<any> {
    const snakeCaseData = mapToSnakeCase(data);
    if (!snakeCaseData.created_at) snakeCaseData.created_at = new Date().toISOString();
    if (!snakeCaseData.updated_at) snakeCaseData.updated_at = new Date().toISOString();
    const { data: result, error } = await this.getClient()
      .from("government_administrative_occurrences")
      .insert(snakeCaseData)
      .select()
      .single();
    if (error) throw error;
    return mapToCamelCase(result);
  }

  async getCommercialOpportunities(organizationId: string, workspaceId?: string): Promise<any[]> {
    let query = this.getClient()
      .from("commercial_opportunities")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createCommercialOpportunity(data: any): Promise<any> {
    const now = new Date().toISOString();
    const payload = mapToSnakeCase({
      ...data,
      id: data.id || crypto.randomUUID(),
      status: data.status || 'new',
      priority: data.priority || 'medium',
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    });

    const { data: inserted, error } = await this.getClient()
      .from("commercial_opportunities")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async updateCommercialOpportunity(id: string, organizationId: string, workspaceId: string | undefined, data: any): Promise<any> {
    const payload = mapToSnakeCase({ ...data, updatedAt: new Date().toISOString() });
    let query = this.getClient().from('commercial_opportunities').update(payload).eq('id', id).eq('organization_id', organizationId);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data: updated, error } = await query.select().single();
    if (error) throw error;
    return mapToCamelCase(updated);
  }

  async deleteCommercialOpportunity(id: string, organizationId: string, workspaceId?: string): Promise<any> {
    let query = this.getClient()
      .from("commercial_opportunities")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { error } = await query;
    if (error) throw error;
    return { success: true };
  }

  async getCommercialRadarSyncRuns(organizationId: string, workspaceId?: string): Promise<any[]> {
    let query = this.getClient().from('commercial_radar_sync_runs').select('*').eq('organization_id', organizationId).order('started_at', { ascending: false });
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createCommercialRadarSyncRun(data: any): Promise<any> {
    const { data: inserted, error } = await this.getClient().from('commercial_radar_sync_runs').insert(mapToSnakeCase(data)).select().single();
    if (error) throw error;
    return mapToCamelCase(inserted);
  }

  async updateCommercialRadarSyncRun(id: string, organizationId: string, workspaceId: string | undefined, data: any): Promise<any> {
    let query = this.getClient().from('commercial_radar_sync_runs').update(mapToSnakeCase(data)).eq('id', id).eq('organization_id', organizationId);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data: updated, error } = await query.select().single();
    if (error) throw error;
    return mapToCamelCase(updated);
  }

  async getCommercialTasks(organizationId: string, workspaceId?: string): Promise<any[]> {
    let query = this.getClient()
      .from("commercial_tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return mapToCamelCase(data || []);
  }

  async createCommercialTasks(data: any[]): Promise<any[]> {
    if (data.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const payload = data.map((task) => mapToSnakeCase({
      ...task,
      id: task.id || crypto.randomUUID(),
      status: task.status || 'pending',
      createdAt: task.createdAt || now,
      updatedAt: task.updatedAt || now,
    }));

    const { data: inserted, error } = await this.getClient()
      .from("commercial_tasks")
      .upsert(payload, { onConflict: "id" })
      .select();

    if (error) throw error;
    return mapToCamelCase(inserted || []);
  }

  async clearCommercialTasks(organizationId: string, workspaceId?: string): Promise<any> {
    let query = this.getClient()
      .from("commercial_tasks")
      .delete()
      .eq("organization_id", organizationId);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { error } = await query;
    if (error) throw error;
    return { success: true };
  }

}
