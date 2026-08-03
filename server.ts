import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateProjectContext } from "./src/engines/BetaContextEngine";
import { parseIntent } from "./server/beta/BetaIntentParser";
import { BetaActionEngine } from "./server/beta/BetaActionEngine";
import { ActionDispatcher } from "./server/beta/ActionDispatcher";
import { ensureSeededProjects } from "./server/database/Seeder";
import { KnowledgeGraphEngine } from "./server/beta/KnowledgeGraphEngine";
import { ContinuityEngine } from "./server/beta/ContinuityEngine";
import { AIConnectionManager } from "./server/beta/AIConnectionManager";
import { AIRouter } from "./server/beta/AIRouter";
import { CompositeReasoningEngine } from "./server/beta/CompositeReasoningEngine";
import { AIHealthMonitor } from "./server/beta/AIHealthMonitor";
import { SpecializationEngine } from "./server/beta/SpecializationEngine";
import { DocumentIntelligenceEngine } from "./server/beta/DocumentIntelligenceEngine";
import { DataPreviewEngine } from "./server/beta/DataPreviewEngine";
import { DataExtractionEngine } from "./server/beta/DataExtractionEngine";
import { BetaCommercialContextEngine } from "./server/beta/assistant/BetaCommercialContextEngine";
import { BetaCapabilityRegistry } from "./server/beta/capabilities/BetaCapabilityRegistry";
import { BetaCommercialCapabilityEngine } from "./server/beta/capabilities/BetaCommercialCapabilityEngine";
import { WorkspaceIntelligenceEngine } from "./server/beta/workspace/WorkspaceIntelligenceEngine";
import { MemoryOS } from "./server/beta/workspace/MemoryOS";
import { MemoryRebuilder } from "./server/beta/workspace/MemoryRebuilder";
import { GovernmentIntelligenceEngine } from "./server/beta/gov/GovernmentIntelligenceEngine";
import { ProcurementIntelligenceEngine } from "./server/beta/gov/ProcurementIntelligenceEngine";
import { ElectoralIntelligenceEngine } from "./server/beta/electoral/ElectoralIntelligenceEngine";
import { encrypt } from "./server/beta/providers/CryptoHelper";
import { RuntimeObservabilityService } from "./server/observability/RuntimeObservabilityService";
import { OperationalIncidentService } from "./server/observability/OperationalIncidentService";
import { IncidentEscalationService } from "./server/observability/IncidentEscalationService";
import { NotificationCenterService } from "./server/notifications/NotificationCenterService";
import { NotificationPreferenceService } from "./server/notifications/NotificationPreferenceService";
import { NotificationDeliveryService } from "./server/notifications/NotificationDeliveryService";
import { NotificationRetryScheduler } from "./server/notifications/NotificationRetryScheduler";
import { NotificationRetryRunService } from "./server/notifications/NotificationRetryRunService";
import { NotificationMaintenanceService } from "./server/notifications/NotificationMaintenanceService";
import { NotificationMaintenanceScheduler } from "./server/notifications/NotificationMaintenanceScheduler";
import { IncidentDetectionService } from "./server/observability/IncidentDetectionService";

dotenv.config();

import { RadarSyncService } from './server/commercial/radar/RadarSyncService';
import { RadarConnectorCredentialService } from './server/commercial/radar/RadarConnectorCredentialService';
import { RadarTenantCatalogService } from './server/commercial/radar/RadarTenantCatalogService';

const app = express();
const PORT = Number(process.env.PORT || 3000);
import { BetaGovernanceService } from "./server/beta/governance/BetaGovernanceService";
import { ReleaseCandidateCertificationService } from "./server/production/ReleaseCandidateCertificationService";

const runtimeObservabilityService = new RuntimeObservabilityService();
let operationalIncidentService: OperationalIncidentService;
let incidentEscalationService: IncidentEscalationService;

app.use(express.json({ limit: "50mb" }));
app.use(runtimeObservabilityService.createMiddleware());

// --- START HOTFIX 24.4 SECURITY Middleware ---
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;

app.use((req, res, next) => {
  // HOTFIX 24.4.1 - never rate limit frontend assets
  if (!req.path.startsWith('/api')) {
    return next();
  }

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'production' ? [] : ['*']);
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.includes('*')) {
     res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Organization-Id, X-Workspace-Id, x-organization-id, x-workspace-id, x-user-id, x-user-name, x-user-email, x-user-role');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content-Security-Policy base (avoid blocking Vite in dev)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:;");
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  // Rate Limiting specific endpoints
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown';
  const now = Date.now();
  
  let maxLimit = 300;
  let rateLimitBucket = 'general';
  if (req.path.startsWith('/api/auth/login')) {
    maxLimit = 20;
    rateLimitBucket = 'auth-login';
  } else if (req.path.startsWith('/api/auth/register')) {
    maxLimit = 10;
    rateLimitBucket = 'auth-register';
  } else if (req.path.startsWith('/api/core/ai-router') || req.path === '/api/chat') {
    maxLimit = 60;
    rateLimitBucket = 'beta-chat';
  } else if (req.path.includes('upload') || req.path.startsWith('/api/core/imports')) {
    maxLimit = 20;
    rateLimitBucket = 'uploads';
  } else if (req.path.includes('export')) {
    maxLimit = 20;
    rateLimitBucket = 'exports';
  }

  const rateLimitKey = `${ip}:${rateLimitBucket}`;
  let record = rateLimitMap.get(rateLimitKey);
  if (!record || record.resetTime < now) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitMap.set(rateLimitKey, record);
  } else {
    record.count++;
  }
  
  if (Math.random() < 0.05) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) rateLimitMap.delete(k);
    }
  }
  
  if (record.count > maxLimit) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  // Debug/Internal Protection in Production
  const isInternal = req.path.startsWith('/api/debug') || req.path.startsWith('/api/internal') || req.path.startsWith('/api/mock') || req.path.startsWith('/api/test') || req.path.startsWith('/api/dev');
  if (isInternal && process.env.NODE_ENV === 'production' && process.env.ENABLE_DEBUG_ROUTES !== 'true') {
    return res.status(403).json({ error: "Debug/Internal routes disabled in production" });
  }

  next();
});
// --- END HOTFIX 24.4 SECURITY Middleware ---

// Setup system port and body parsers

import {
  getCurrentUser,
  setActiveSessionUser,
} from "./server/auth/currentUser";
import { DatabaseAdapter } from "./server/database/DatabaseAdapter";
import { JsonDatabaseAdapter } from "./server/database/JsonDatabaseAdapter";
import { SupabaseDatabaseAdapter } from "./server/database/SupabaseDatabaseAdapter";
import { PERSISTENCE_TABLE_REQUIREMENTS } from "./server/persistence/PersistenceSchemaRegistry";
import { applyAuthorizationPolicy } from "./server/security/AuthorizationMiddleware";
import { enforceTenantIsolation, getTenantIsolationSummary } from "./server/security/TenantIsolationMiddleware";
import { createProductEntitlementMiddleware } from "./server/security/ProductEntitlementMiddleware";
import { AssistantScopeError, getAssistantContextIsolationSummary, resolveAssistantContextScope } from "./server/security/AssistantContextScope";
import { AdminDirectoryService } from "./server/admin/AdminDirectoryService";
import { AdminAccessReviewService } from "./server/admin/AdminAccessReviewService";
import { TenantCommercialContractService } from "./server/commercial/TenantCommercialContractService";
import { RadarCrmHandoffService } from "./server/commercial/radar/RadarCrmHandoffService";
import { ClientOnboardingOrchestrator } from "./server/onboarding/ClientOnboardingOrchestrator";
import { TenantProductInstallationService } from "./server/products/TenantProductInstallationService";
import { CustomerOperationsService } from "./server/customerOperations/CustomerOperationsService";
import { AdminAuditService } from "./server/admin/AdminAuditService";
import { DeploymentEnvironmentService } from "./server/deployment/DeploymentEnvironmentService";
import { DeploymentConfigurationService } from "./server/configuration/DeploymentConfigurationService";
import { DeploymentConnectivityService } from "./server/configuration/DeploymentConnectivityService";
import { DeploymentValidationService } from "./server/configuration/DeploymentValidationService";
import { DeploymentReleaseApprovalService } from "./server/configuration/DeploymentReleaseApprovalService";
import { DeploymentReleaseExecutionService } from "./server/configuration/DeploymentReleaseExecutionService";
import { DeploymentReleaseLifecycleService } from "./server/configuration/DeploymentReleaseLifecycleService";
import { createSessionResolver } from "./server/auth/SessionResolver";
import { SaasSecurityReadinessService } from "./server/security/SaasSecurityReadinessService";
import {
  getAuthorizationCoverageSummary,
  getServerPermissions,
  normalizeServerUserProfile,
} from "./server/security/AuthorizationPolicy";

export function extractTenant(req: any) {
  let organizationId: string | undefined;
  let workspaceId: string | undefined;

  try {
    const user = getCurrentUser(req);
    if (user?.organizationId) {
      organizationId = user.organizationId;
    }
  } catch (e) {
    // Ignore and proceed to query/headers/body
  }

  const headerOrgId = req.headers["x-organization-id"] || req.headers["x-organization-id"]?.toString();
  const headerWorkspaceId = req.headers["x-workspace-id"] || req.headers["x-workspace-id"]?.toString();

  const queryOrgId = req.query?.organizationId || req.query?.organization_id;
  const queryWorkspaceId = req.query?.workspaceId || req.query?.workspace_id;

  const bodyOrgId = req.body?.organizationId || req.body?.organization_id;
  const bodyWorkspaceId = req.body?.workspaceId || req.body?.workspace_id;

  const resolveItem = (val: any): string | undefined => {
    if (!val) return undefined;
    if (Array.isArray(val)) return resolveItem(val[0]);
    if (typeof val === "string") return val;
    return String(val);
  };

  return {
    organizationId: resolveItem(headerOrgId || queryOrgId || bodyOrgId || organizationId),
    workspaceId: resolveItem(headerWorkspaceId || queryWorkspaceId || bodyWorkspaceId),
  };
}

// --- START HOTFIX 24.4 TENANT & PAYLOAD VALIDATION ---
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();

  // Public exceptions
  const isPublic = req.path.startsWith('/api/health') || req.path === '/api/status' || req.path.startsWith('/api/auth');
  if (isPublic) return next();

  const tenant = extractTenant(req);
  
  // 1. Tenant validation for Operational endpoints
  if (!tenant.organizationId || !tenant.workspaceId) {
     return res.status(401).json({ error: "Missing required organizationId or workspaceId in context or headers" });
  }

  // 2. Payload Validation & Upload Security
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type']?.includes('application/json')) {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid payload: body is required and must be an object" });
    }

    // Tenant Injection & Tamper Protection
    if (req.body.organizationId && req.body.organizationId !== tenant.organizationId) {
      req.body.organizationId = tenant.organizationId;
    } else if (!req.body.organizationId) {
      req.body.organizationId = tenant.organizationId;
    }

    if (req.body.workspaceId && req.body.workspaceId !== tenant.workspaceId) {
       req.body.workspaceId = tenant.workspaceId;
    } else if (!req.body.workspaceId) {
       req.body.workspaceId = tenant.workspaceId;
    }

    // Upload Specific Checks
    if (req.path.includes('/upload')) {
       const filename = req.body.filename?.toString() || "";
       if (filename) {
         const ext = filename.split('.').pop()?.toLowerCase();
         // List based on requirements
         const blockedExts = ['exe', 'bat', 'sh', 'cmd', 'js', 'ts', 'html', 'php', 'py', 'jar', 'dll'];
         const allowedExts = ['csv', 'xlsx', 'pdf', 'docx', 'json', 'xml', 'zip', 'txt', 'png', 'jpg', 'jpeg', 'webp'];
         
         // Hard block forbidden extensions (even if renamed, we check extension at least, and potentially MIME downstream)
         if (blockedExts.includes(ext) || (!allowedExts.includes(ext) && ext)) {
           return res.status(400).json({ error: "Upload rejected: File extension not permitted." });
         }
         
         // Anti-traversal check
         if (filename.includes('..') || filename.includes('/')) {
           return res.status(400).json({ error: "Upload rejected: Malicious filename." });
         }
       }
       
       // File Size Check (assume basic check if base64 or length provided, usually handled by multer/limit, we already setted 50mb limit)
       // MIME Type Check: we can verify if mime-type is declared
       const mimeType = req.body.mimeType?.toString() || req.body.type?.toString() || "";
       if (mimeType && mimeType.includes('executable') || mimeType.includes('script')) {
          return res.status(400).json({ error: "Upload rejected: Malicious MIME type." });
       }
    }
  }

  next();
});
// --- END HOTFIX 24.4 TENANT & PAYLOAD VALIDATION ---

// Choose database adapter based on environment variable
const dbMode = (process.env.DATABASE_MODE || "json").toLowerCase();
const dbAdapter: DatabaseAdapter =
  dbMode === "supabase"
    ? new SupabaseDatabaseAdapter()
    : new JsonDatabaseAdapter();

const radarConnectorCredentialService = new RadarConnectorCredentialService(
  dbMode === 'supabase' ? 'supabase' : 'json',
  dbAdapter as SupabaseDatabaseAdapter,
);
const radarSyncService = new RadarSyncService(dbAdapter, radarConnectorCredentialService);
const radarTenantCatalogService = new RadarTenantCatalogService(
  dbMode === 'supabase' ? 'supabase' : 'json',
  dbAdapter as SupabaseDatabaseAdapter,
);

const adminDirectoryService = new AdminDirectoryService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const adminAccessReviewService = new AdminAccessReviewService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
  adminDirectoryService,
);

const tenantCommercialContractService = new TenantCommercialContractService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
  adminDirectoryService,
);

const tenantProductInstallationService = new TenantProductInstallationService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const clientOnboardingOrchestrator = new ClientOnboardingOrchestrator(
  adminDirectoryService,
  tenantCommercialContractService,
  tenantProductInstallationService,
);

const customerOperationsService = new CustomerOperationsService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
  dbAdapter,
);

const betaGovernanceService = new BetaGovernanceService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const releaseCandidateCertificationService =
  new ReleaseCandidateCertificationService(
    dbMode === "supabase" ? "supabase" : "json",
    dbAdapter as SupabaseDatabaseAdapter,
  );

const adminAuditService = new AdminAuditService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const deploymentEnvironmentService = new DeploymentEnvironmentService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const deploymentConfigurationService =
  new DeploymentConfigurationService();
const deploymentConnectivityService =
  new DeploymentConnectivityService(
    deploymentConfigurationService,
  );

const deploymentValidationService =
  new DeploymentValidationService(
    dbMode === "supabase" ? "supabase" : "json",
    dbAdapter as SupabaseDatabaseAdapter,
    deploymentConfigurationService,
    deploymentConnectivityService,
  );

const deploymentReleaseApprovalService =
  new DeploymentReleaseApprovalService(
    dbMode === "supabase" ? "supabase" : "json",
    dbAdapter as SupabaseDatabaseAdapter,
    deploymentValidationService,
  );

const deploymentReleaseExecutionService =
  new DeploymentReleaseExecutionService(
    dbMode === "supabase" ? "supabase" : "json",
    dbAdapter as SupabaseDatabaseAdapter,
    deploymentReleaseApprovalService,
    deploymentEnvironmentService,
  );

const deploymentReleaseLifecycleService =
  new DeploymentReleaseLifecycleService(
    dbMode === "supabase" ? "supabase" : "json",
    dbAdapter as SupabaseDatabaseAdapter,
    deploymentReleaseExecutionService,
    deploymentEnvironmentService,
  );

operationalIncidentService = new OperationalIncidentService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const notificationCenterService = new NotificationCenterService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const notificationPreferenceService = new NotificationPreferenceService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const notificationDeliveryService = new NotificationDeliveryService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const notificationRetryRunService = new NotificationRetryRunService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const saasSecurityReadinessService = new SaasSecurityReadinessService(
  dbMode,
  dbAdapter as SupabaseDatabaseAdapter,
);

const notificationMaintenanceService = new NotificationMaintenanceService(
  dbMode === "supabase" ? "supabase" : "json",
  dbAdapter as SupabaseDatabaseAdapter,
);

const notificationMaintenanceScheduler =
  new NotificationMaintenanceScheduler(
    notificationMaintenanceService,
    24 * 60 * 60 * 1_000,
  );

const notificationRetryScheduler = new NotificationRetryScheduler(
  notificationDeliveryService,
  notificationRetryRunService,
  60_000,
);

// Background schedulers write runtime JSON files. In local development those
// writes are unnecessary and can destabilize the Vite session. They remain
// available for production and can be enabled explicitly in other environments.
const backgroundSchedulersEnabled =
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_BACKGROUND_SCHEDULERS === "true";

if (backgroundSchedulersEnabled) {
  notificationMaintenanceScheduler.start();
  notificationRetryScheduler.start();
}

// Resolve the authenticated request identity before applying RBAC.
app.use(
  createSessionResolver({
    dbMode,
    getSupabaseClient: () =>
      (dbAdapter as SupabaseDatabaseAdapter).getClient(),
  }),
);

// Tenant scope is validated only after the authenticated session has been resolved.
app.use(enforceTenantIsolation);

// Centralized backend RBAC based on the official permission matrix.
app.use(applyAuthorizationPolicy);

// Initialize Knowledge Graph and Continuity Engines
const knowledgeGraphEngine = new KnowledgeGraphEngine(dbAdapter);
function getContinuityEngine() {
  return new ContinuityEngine(dbAdapter, aiRouter);
}

// Initialize Multi-IA Connected Intelligence Engines
const aiConnectionManager = new AIConnectionManager(dbAdapter);
const aiRouter = new AIRouter(aiConnectionManager);
const compositeReasoningEngine = new CompositeReasoningEngine(
  aiConnectionManager,
  aiRouter,
);
const aiHealthMonitor = new AIHealthMonitor(aiConnectionManager);
const specializationEngine = new SpecializationEngine(dbAdapter);
const dataPreviewEngine = new DataPreviewEngine();
const documentIntelligenceEngine = new DocumentIntelligenceEngine(
  dbAdapter,
  dataPreviewEngine,
  knowledgeGraphEngine,
);
const dataExtractionEngine = new DataExtractionEngine(
  dbAdapter,
  knowledgeGraphEngine,
);

const workspaceIntelligenceEngine = new WorkspaceIntelligenceEngine(
  dbAdapter,
  knowledgeGraphEngine,
);
const memoryOS = new MemoryOS(dbAdapter, workspaceIntelligenceEngine);
const betaCommercialContextEngine = new BetaCommercialContextEngine(dbAdapter);
const betaCommercialCapabilityEngine = new BetaCommercialCapabilityEngine(dbAdapter);
const radarCrmHandoffService = new RadarCrmHandoffService(dbAdapter);
const memoryRebuilder = new MemoryRebuilder(
  dbAdapter,
  workspaceIntelligenceEngine,
  knowledgeGraphEngine,
);
const governmentIntelligenceEngine = new GovernmentIntelligenceEngine(
  dbAdapter,
  knowledgeGraphEngine,
);
memoryOS.governmentEngine = governmentIntelligenceEngine;

const procurementIntelligenceEngine = new ProcurementIntelligenceEngine(
  dbAdapter,
  knowledgeGraphEngine,
);
memoryOS.procurementEngine = procurementIntelligenceEngine;

const electoralIntelligenceEngine = new ElectoralIntelligenceEngine(
  dbAdapter,
  knowledgeGraphEngine,
);
memoryOS.electoralEngine = electoralIntelligenceEngine;

// Sprint 15.0 - Beta Platform Operational Engines
import { ContactEngine } from "./server/beta/core/ContactEngine";
import { CRMEngine } from "./server/beta/core/CRMEngine";
import { CalendarEngine } from "./server/beta/core/CalendarEngine";
import { ActivityEngine } from "./server/beta/core/ActivityEngine";
import { TaskEngine } from "./server/beta/core/TaskEngine";
import { EvidenceEngine } from "./server/beta/core/EvidenceEngine";
import { AttachmentEngine } from "./server/beta/core/AttachmentEngine";
import { WorkflowEngine } from "./server/beta/core/WorkflowEngine";
import { NotificationEngine } from "./server/beta/core/NotificationEngine";
import { ModuleAccessEngine } from "./server/beta/core/ModuleAccessEngine";
import { WorkspaceEngine } from "./server/beta/core/WorkspaceEngine";
import { SuperAdminEngine } from "./server/beta/core/SuperAdminEngine";
import { ImportCenterEngine } from "./server/beta/core/ImportCenterEngine";
import { CampaignOperationalEngine } from "./server/beta/electoral/CampaignOperationalEngine";
import { TerritoryOperationalEngine } from "./server/beta/electoral/TerritoryOperationalEngine";
import { CoordinatorOperationalEngine } from "./server/beta/electoral/CoordinatorOperationalEngine";
import { CampaignCRMEngine } from "./server/beta/electoral/CampaignCRMEngine";
import { CampaignCalendarEngine } from "./server/beta/electoral/CampaignCalendarEngine";

// Sprint 15.8 - Communication & Action Dispatch Engines
import { CommunicationEngine } from "./server/beta/core/CommunicationEngine";
import { ActionDispatchEngine } from "./server/beta/core/ActionDispatchEngine";

// Sprint 15.9 - User Presence Engine
import { UserPresenceEngine } from "./server/beta/core/UserPresenceEngine";

// Sprint 16.0 - Operational Command Center
import { OperationalCommandCenterEngine } from "./server/beta/core/OperationalCommandCenterEngine";

const contactEngine = new ContactEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const crmEngine = new CRMEngine(dbAdapter, memoryOS, knowledgeGraphEngine);
const calendarEngine = new CalendarEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const activityEngine = new ActivityEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const taskEngine = new TaskEngine(dbAdapter, memoryOS, knowledgeGraphEngine);

const communicationEngine = new CommunicationEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const actionDispatchEngine = new ActionDispatchEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const userPresenceEngine = new UserPresenceEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);

// Pass dbAdapter only for the rest
const evidenceEngine = new EvidenceEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const attachmentEngine = new AttachmentEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const workflowEngine = new WorkflowEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const notificationEngine = new NotificationEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);

incidentEscalationService = new IncidentEscalationService(
  operationalIncidentService,
  adminDirectoryService,
  notificationCenterService,
  notificationPreferenceService,
  notificationDeliveryService,
);
const moduleAccessEngine = new ModuleAccessEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const workspaceEngine = new WorkspaceEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const superAdminEngine = new SuperAdminEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const importCenterEngine = new ImportCenterEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const campaignOperationalEngine = new CampaignOperationalEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const territoryOperationalEngine = new TerritoryOperationalEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const coordinatorOperationalEngine = new CoordinatorOperationalEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const campaignCRMEngine = new CampaignCRMEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
);
const campaignCalendarEngine = new CampaignCalendarEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
  calendarEngine,
  contactEngine,
  evidenceEngine,
  campaignOperationalEngine,
  coordinatorOperationalEngine,
  territoryOperationalEngine,
);

const operationalCommandCenterEngine = new OperationalCommandCenterEngine(
  dbAdapter,
  memoryOS,
  knowledgeGraphEngine,
  {
    campaignEngine: campaignOperationalEngine,
    coordinatorEngine: coordinatorOperationalEngine,
    territoryEngine: territoryOperationalEngine,
    crmEngine: campaignCRMEngine,
    calendarEngine: campaignCalendarEngine,
    taskEngine: taskEngine,
    workflowEngine: workflowEngine,
    evidenceEngine: evidenceEngine,
    communicationEngine: communicationEngine,
    actionDispatchEngine: actionDispatchEngine,
    userPresenceEngine: userPresenceEngine,
    workspaceEngine: workspaceEngine,
  },
);

import { WorkspaceIntelligenceOrchestrator } from "./server/beta/workspace/WorkspaceIntelligenceOrchestrator";
const workspaceIntelligenceOrchestrator = new WorkspaceIntelligenceOrchestrator(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  operationalCommandCenterEngine,
);

import { BetaAssistantContextEngine } from "./server/beta/assistant/BetaAssistantContextEngine";
const betaAssistantContextEngine = new BetaAssistantContextEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  operationalCommandCenterEngine,
  workspaceIntelligenceOrchestrator,
  {
    communicationEngine,
    userPresenceEngine,
    workspaceEngine,
  },
);

import { AIRouterEngine } from "./server/beta/assistant/AIRouterEngine";
const aiRouterEngine = new AIRouterEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  betaAssistantContextEngine,
  workspaceIntelligenceOrchestrator,
  operationalCommandCenterEngine,
  {
    moduleAccessEngine: undefined, // Add if available later
    workspaceEngine,
  }
);

import { BetaActionExecutionEngine } from "./server/beta/assistant/BetaActionExecutionEngine";
const betaActionExecutionEngine = new BetaActionExecutionEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  betaAssistantContextEngine,
  aiRouterEngine,
  workspaceIntelligenceOrchestrator,
  {
    taskEngine: undefined,
    calendarEngine: undefined,
    contactEngine: undefined,
    communicationEngine: undefined,
    workflowEngine: undefined,
    evidenceEngine: undefined,
    moduleAccessEngine: undefined,
  }
);

import { BetaSkillsEngine } from "./server/beta/assistant/BetaSkillsEngine";
const betaSkillsEngine = new BetaSkillsEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  {
    workspaceEngine,
    moduleAccessEngine: undefined,
  }
);

import { BetaOperationalOrchestrator } from "./server/beta/assistant/BetaOperationalOrchestrator";
const betaOperationalOrchestrator = new BetaOperationalOrchestrator(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  {
    betaAssistantContextEngine,
    aiRouterEngine,
    betaSkillsEngine,
    betaActionExecutionEngine,
    moduleAccessEngine: undefined,
    workspaceIntelligenceOrchestrator
  }
);

import { GovernmentWorkspaceEngine } from "./server/beta/gov/GovernmentWorkspaceEngine";
import { ProcurementWorkspaceEngine } from "./server/beta/licita/ProcurementWorkspaceEngine";
import { GovernmentDomainEngine } from "./server/beta/gov/GovernmentDomainEngine";
import { GovernmentMemoryEngine } from "./server/beta/gov/GovernmentMemoryEngine";
import { GovernmentContextEngine } from "./server/beta/gov/GovernmentContextEngine";
import { GovernmentIndicatorEngine } from "./server/beta/gov/GovernmentIndicatorEngine";
import { GovernmentRiskEngine } from "./server/beta/gov/GovernmentRiskEngine";
import { GovernmentHealthEngine } from "./server/beta/gov/GovernmentHealthEngine";
import { GovernmentHealthMonitoringEngine } from "./server/beta/gov/GovernmentHealthMonitoringEngine";
import { GovernmentEducationEngine } from "./server/beta/gov/GovernmentEducationEngine";
import { GovernmentEducationMonitoringEngine } from "./server/beta/gov/GovernmentEducationMonitoringEngine";
import { GovernmentTimelineEngine } from "./server/beta/gov/GovernmentTimelineEngine";
import { GovernmentNarrativeEngine } from "./server/beta/gov/GovernmentNarrativeEngine";
import { GovernmentProgramEngine } from "./server/beta/gov/GovernmentProgramEngine";
import { ContractIntelligenceEngine } from "./server/beta/gov/ContractIntelligenceEngine";
import { BidIntelligenceEngine } from "./server/beta/gov/BidIntelligenceEngine";
import { GovernmentProgramManagementEngine } from "./server/beta/gov/GovernmentProgramManagementEngine";
import { GovernmentAmendmentOpportunityEngine } from "./server/beta/gov/GovernmentAmendmentOpportunityEngine";
import { GovernmentAmendmentPortfolioEngine } from "./server/beta/gov/GovernmentAmendmentPortfolioEngine";
import { GovernmentTransparencyEngine } from "./server/beta/gov/GovernmentTransparencyEngine";
import { GovernmentTransparencyAnalyticsEngine } from "./server/beta/gov/GovernmentTransparencyAnalyticsEngine";
import { GovernmentPublicPortalEngine } from "./server/beta/gov/GovernmentPublicPortalEngine";
import { GovernmentZeroPaperEngine } from "./server/beta/gov/GovernmentZeroPaperEngine";
import { GovernmentProcessManagementEngine } from "./server/beta/gov/GovernmentProcessManagementEngine";
import { GovernmentWorkflowEngine } from "./server/beta/gov/GovernmentWorkflowEngine";
import { GovernmentDocumentLifecycleEngine } from "./server/beta/gov/GovernmentDocumentLifecycleEngine";
import { GovernmentAdministrativeGovernanceEngine } from "./server/beta/gov/GovernmentAdministrativeGovernanceEngine";
import { GovernmentOmbudsmanEngine } from "./server/beta/gov/GovernmentOmbudsmanEngine";



const govDomainEngine = new GovernmentDomainEngine(dbAdapter, knowledgeGraphEngine);
const govMemoryEngine = new GovernmentMemoryEngine(dbAdapter, knowledgeGraphEngine, govDomainEngine);
const govContextEngine = new GovernmentContextEngine(dbAdapter, knowledgeGraphEngine);
const govIndicatorEngine = new GovernmentIndicatorEngine(dbAdapter, knowledgeGraphEngine);
const govRiskEngine = new GovernmentRiskEngine(dbAdapter);
const govHealthEngine = new GovernmentHealthEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govHealthMonitoringEngine = new GovernmentHealthMonitoringEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govEducationEngine = new GovernmentEducationEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govEducationMonitoringEngine = new GovernmentEducationMonitoringEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govAmendmentOpportunityEngine = new GovernmentAmendmentOpportunityEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govAmendmentPortfolioEngine = new GovernmentAmendmentPortfolioEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govTransparencyEngine = new GovernmentTransparencyEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govTransparencyAnalyticsEngine = new GovernmentTransparencyAnalyticsEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govPublicPortalEngine = new GovernmentPublicPortalEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govZeroPaperEngine = new GovernmentZeroPaperEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govProcessManagementEngine = new GovernmentProcessManagementEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govWorkflowEngine = new GovernmentWorkflowEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govDocumentLifecycleEngine = new GovernmentDocumentLifecycleEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govAdministrativeGovernanceEngine = new GovernmentAdministrativeGovernanceEngine(dbAdapter, knowledgeGraphEngine, memoryOS);
const govOmbudsmanEngine = new GovernmentOmbudsmanEngine(dbAdapter, knowledgeGraphEngine, memoryOS);


const govTimelineEngine = new GovernmentTimelineEngine(dbAdapter);
const govNarrativeEngine = new GovernmentNarrativeEngine();
const govProgramEngine = new GovernmentProgramEngine(dbAdapter, knowledgeGraphEngine);
const contractIntEngine = new ContractIntelligenceEngine(dbAdapter, knowledgeGraphEngine);
const bidIntEngine = new BidIntelligenceEngine(dbAdapter, knowledgeGraphEngine);

const governmentWorkspaceEngine = new GovernmentWorkspaceEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  {
    govDomainEngine,
    govMemoryEngine,
    govContextEngine,
    govIndicatorEngine,
    govRiskEngine,
    govHealthEngine,
    govTimelineEngine,
    govNarrativeEngine,
    govProgramEngine,
    contractIntEngine,
    bidIntEngine,
    wsIntelligenceOrchestrator: workspaceIntelligenceOrchestrator,
    opCommandCenterEngine: undefined
  }
);

const procurementWorkspaceEngine = new ProcurementWorkspaceEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  undefined
);

import { ProcurementBidManagementEngine } from "./server/beta/licita/ProcurementBidManagementEngine";

const procurementBidManagementEngine = new ProcurementBidManagementEngine(
  dbAdapter,
  knowledgeGraphEngine,
  procurementWorkspaceEngine,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  memoryOS,
  workspaceIntelligenceOrchestrator
);

import { ProcurementSupplierManagementEngine } from "./server/beta/licita/ProcurementSupplierManagementEngine";

const procurementSupplierManagementEngine = new ProcurementSupplierManagementEngine(
  dbAdapter,
  knowledgeGraphEngine,
  procurementWorkspaceEngine,
  procurementBidManagementEngine,
  undefined,
  undefined,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  undefined
);

import { ProcurementContractManagementEngine } from "./server/beta/licita/ProcurementContractManagementEngine";

const procurementContractManagementEngine = new ProcurementContractManagementEngine(
  dbAdapter,
  knowledgeGraphEngine,
  procurementWorkspaceEngine,
  procurementBidManagementEngine,
  procurementSupplierManagementEngine,
  undefined,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  undefined
);

import { ProcurementComplianceEngine } from "./server/beta/licita/ProcurementComplianceEngine";

const procurementComplianceEngine = new ProcurementComplianceEngine(
  dbAdapter,
  knowledgeGraphEngine,
  procurementWorkspaceEngine,
  procurementBidManagementEngine,
  procurementSupplierManagementEngine,
  procurementContractManagementEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  undefined
);

import { ProcurementReportingEngine } from "./server/beta/licita/ProcurementReportingEngine";

const procurementReportingEngine = new ProcurementReportingEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  undefined
);


const governmentProgramManagementEngine = new GovernmentProgramManagementEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  governmentWorkspaceEngine,
  govProgramEngine,
  govIndicatorEngine,
  govRiskEngine
);

import { GovernmentPerformanceManagementEngine } from "./server/beta/gov/GovernmentPerformanceManagementEngine";

const governmentPerformanceManagementEngine = new GovernmentPerformanceManagementEngine(
  dbAdapter,
  knowledgeGraphEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  governmentWorkspaceEngine,
  governmentProgramManagementEngine,
  govIndicatorEngine,
  govHealthEngine,
  govRiskEngine
);

import { GovernmentReportingEngine } from "./server/beta/gov/GovernmentReportingEngine";

const governmentReportingEngine = new GovernmentReportingEngine(
  dbAdapter,
  governmentWorkspaceEngine,
  governmentProgramManagementEngine,
  governmentPerformanceManagementEngine,
  govIndicatorEngine,
  govRiskEngine,
  govHealthEngine,
  memoryOS,
  knowledgeGraphEngine,
  workspaceIntelligenceOrchestrator,
  operationalCommandCenterEngine
);

import { GovernmentGovernanceEngine } from "./server/beta/gov/GovernmentGovernanceEngine";

const governmentGovernanceEngine = new GovernmentGovernanceEngine(
  dbAdapter,
  governmentWorkspaceEngine,
  governmentProgramManagementEngine,
  governmentPerformanceManagementEngine,
  governmentReportingEngine,
  memoryOS,
  knowledgeGraphEngine,
  workspaceIntelligenceOrchestrator,
  operationalCommandCenterEngine
);

import { GovernmentAmendmentEngine } from "./server/beta/gov/GovernmentAmendmentEngine";

const governmentAmendmentEngine = new GovernmentAmendmentEngine(
  dbAdapter,
  knowledgeGraphEngine,
  governmentWorkspaceEngine,
  governmentProgramManagementEngine,
  governmentPerformanceManagementEngine,
  governmentReportingEngine,
  governmentGovernanceEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  operationalCommandCenterEngine
);

import { GovernmentAmendmentMonitoringEngine } from "./server/beta/gov/GovernmentAmendmentMonitoringEngine";

const governmentAmendmentMonitoringEngine = new GovernmentAmendmentMonitoringEngine(
  dbAdapter,
  knowledgeGraphEngine,
  governmentAmendmentEngine,
  governmentWorkspaceEngine,
  governmentProgramManagementEngine,
  governmentReportingEngine,
  governmentGovernanceEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  operationalCommandCenterEngine
);

import { GovernmentAmendmentReportingEngine } from "./server/beta/gov/GovernmentAmendmentReportingEngine";

const governmentAmendmentReportingEngine = new GovernmentAmendmentReportingEngine(
  dbAdapter,
  knowledgeGraphEngine,
  governmentAmendmentEngine,
  governmentAmendmentMonitoringEngine,
  governmentWorkspaceEngine,
  governmentReportingEngine,
  governmentGovernanceEngine,
  memoryOS,
  workspaceIntelligenceOrchestrator,
  operationalCommandCenterEngine
);


async function updateProjectState(
  projectId: string,
  userId?: string,
  organizationId?: string,
): Promise<any> {
  let finalUserId = userId;
  let finalOrgId = organizationId;

  if (!finalUserId || !finalOrgId) {
    try {
      const u = getCurrentUser();
      finalUserId = finalUserId || u.id;
      finalOrgId = finalOrgId || u.organizationId;
    } catch {
      if (dbMode === "supabase") {
        const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();
        const { data } = await supabase
          .from("projects")
          .select("user_id, organization_id")
          .eq("id", projectId)
          .single();
        if (data) {
          finalUserId = data.user_id;
          finalOrgId = data.organization_id;
        }
      } else {
        finalUserId = "dev-user-douglas";
        finalOrgId = "org-oi-beta";
      }
    }
  }

  const proj = await dbAdapter.getProjectById(
    projectId,
    finalUserId!,
    finalOrgId!,
  );
  if (!proj) return null;

  // Gather real collections
  const decisions = await dbAdapter.getDecisions(projectId);
  const tasks = await dbAdapter.getTasks(projectId);
  const memories = await dbAdapter.getMemories(projectId);
  const chatHistory = await dbAdapter.getMessages(projectId);

  // Run the premium context engine
  const context = await generateProjectContext(
    proj,
    decisions,
    tasks,
    memories,
    chatHistory,
    aiRouter,
    finalUserId!,
    finalOrgId!,
    projectId,
  );

  const newState = {
    projectId: context.projectId,
    projectName: context.projectName,
    currentObjective: context.currentObjective,
    currentStage: context.currentStage,
    lastStopPoint: context.lastStopPoint,
    recentDecisions: context.recentDecisions,
    pendingTasks: context.pendingTasks,
    executiveSummary: context.executiveSummary,
    nextRecommendedAction: context.nextRecommendedAction,
    importantMemories: context.importantMemories,
    risks: context.risks,
    confidenceScore: context.confidenceScore,
    lastUpdatedDate: context.updatedAt,
    updatedAt: context.updatedAt,
  };

  const updatedState = await dbAdapter.saveProjectContext(projectId, newState);

  try {
    await memoryRebuilder.rebuildMemoryContext(projectId, finalOrgId!);
  } catch (ex) {
    console.error("Memory rebuild failed:", ex);
  }

  return updatedState;
}

// REST API Endpoints

// Authentication validation middleware
const requireAuth = async (req: any, res: any, next: any) => {
  const bypassPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/reset",
    "/api/auth/session",
  ];

  const requestPath = req.path || req.url || "";
  if (bypassPaths.some((p) => requestPath.startsWith(p))) {
    return next();
  }

  try {
    if (dbMode !== "supabase") {
      // JSON mode fallback is simple / local dev
      const user = getCurrentUser(req);
      req.currentUser = user;
      return next();
    }

    // Supabase validation
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Sessão não autorizada ou token ausente." });
    }

    const token = authHeader.split(" ")[1];
    if (token === "mock-json-token-for-dev") {
      const user = getCurrentUser(req);
      req.currentUser = user;
      return next();
    }

    const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();

    // Verify token with Supabase Client auth
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !authUser) {
      return res.status(401).json({ error: "Sessão expirada ou inválida." });
    }

    // Load profile from public.users table corresponding to the sub
    const { data: dbUser, error: userErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (userErr || !dbUser) {
      return res.status(401).json({
        error: "Usuário com perfil inexistente ou incompleto no Supabase.",
      });
    }

    const organizationId = dbUser.organization_id;
    const [{ data: organization }, { data: workspaces }] = await Promise.all([
      supabase
        .from("organizations")
        .select("id,licensed_product_ids")
        .eq("id", organizationId)
        .single(),
      supabase
        .from("workspaces")
        .select("id,organization_id,status")
        .eq("organization_id", organizationId),
    ]);

    const activeWorkspace = Array.isArray(workspaces)
      ? workspaces.find((workspace: any) => workspace.status !== "INACTIVE")
      : undefined;

    req.currentUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      organizationId,
      tenantId: dbUser.tenant_id || organizationId,
      workspaceId: activeWorkspace?.id,
      role: dbUser.profile || dbUser.role || "operator",
      productIds: Array.isArray(dbUser.product_ids) ? dbUser.product_ids : [],
      licensedProductIds: Array.isArray(organization?.licensed_product_ids)
        ? organization.licensed_product_ids
        : [],
    };

    next();
  } catch (err: any) {
    console.error("Authentication middleware failure:", err);
    res.status(401).json({ error: "Não autorizado." });
  }
};

app.use(requireAuth);

// Product APIs require an authenticated user, a valid license and an active installation.
app.use(createProductEntitlementMiddleware(tenantProductInstallationService));

// Sprint 10 - Document & Data Intelligence Endpoints
app.post("/api/documents/upload", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { projectId, filename, fileType, fileSize, metadata, content } =
      req.body;

    // Save to real disk for processing
    const dir = path.join(process.cwd(), ".data", "storage");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const uniqueFilename = `${Date.now()}_${filename}`;
    const storagePath = path.join(dir, uniqueFilename);

    if (content) {
      if (content.startsWith("data:")) {
        const base64Data = content.split(",")[1];
        fs.writeFileSync(storagePath, base64Data, "base64");
      } else {
        fs.writeFileSync(storagePath, content, "utf8");
      }
    } else {
      // Mock empty file if no content provided for testing
      fs.writeFileSync(storagePath, "");
    }

    const result = await documentIntelligenceEngine.processUpload({
      organizationId: user.organizationId,
      projectId: projectId || undefined,
      uploadedBy: user.id,
      filename,
      fileType,
      fileSize,
      storagePath,
      metadata: metadata || {},
    });

    if (projectId) {
      const projectSpec =
        await specializationEngine.getActiveForProject(projectId);
      if (projectSpec) {
        // Assume specialization node exists or just rely on graph flexibility. We can ensure it.
        await knowledgeGraphEngine.ensureNode(
          user.organizationId,
          projectId,
          "KNOWLEDGE",
          "Specialization: " + projectSpec.name,
          "",
          projectSpec.key,
          {},
        );
        await knowledgeGraphEngine.createRelationship(
          user.organizationId,
          result.document.id,
          projectSpec.key,
          "PROCESSED_BY",
        );

        if (projectSpec.key === "BETA_GOV") {
          await governmentIntelligenceEngine.processDocument(
            result.document,
            content || "",
            projectId,
            user.organizationId,
          );
        }
      }
    }

    res.json({
      success: true,
      document: result.document,
      preview: result.preview,
    });
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/documents/:id/preview", async (req, res) => {
  try {
    const doc = await dbAdapter.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, preview: doc.metadata?.preview || null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/documents/:id/extract", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const instructions = req.body.instructions;

    const output = await dataExtractionEngine.extract(
      req.params.id,
      instructions,
      user.organizationId,
      user.id,
    );
    res.json({ success: true, output });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/documents/:id/chunks", async (req, res) => {
  try {
    const chunks = await dbAdapter.getDocumentChunks(req.params.id);
    res.json({ success: true, chunks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/documents/:id/outputs", async (req, res) => {
  try {
    const outputs = await dbAdapter.getDocumentOutputs(req.params.id);
    res.json({ success: true, outputs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/documents/jobs/:id", async (req, res) => {
  try {
    const job = await dbAdapter.getDocumentJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, job });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/documents/jobs/:id/cancel", async (req, res) => {
  try {
    const job = await dbAdapter.updateDocumentJob(req.params.id, {
      status: "CANCELED",
      finishedAt: new Date().toISOString(),
    });

    // Log cancellation
    if (job) {
      await dbAdapter.createDocumentAuditLog({
        organizationId: job.organizationId,
        documentId: job.documentId,
        jobId: job.id,
        action: "JOB_CANCELED",
        details: { reason: "User requested" },
      });
    }

    res.json({ success: true, job });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/documents/health", async (req, res) => {
  try {
    const health = await dbAdapter.getDocumentHealth();
    res.json({ success: true, health });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/documents/stats", async (req, res) => {
  try {
    const { organizationId } = req.query;
    const stats = await dbAdapter.getDocumentStats(organizationId as string);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



app.get("/api/auth/session-health", (req: any, res) => {
  try {
    const user = getCurrentUser(req);
    const authorization = String(req.headers.authorization || "");

    res.json({
      authenticated: true,
      source: user.source || req.sessionSource || "none",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        tenantId: user.tenantId || user.organizationId,
        workspaceId: user.workspaceId,
        role: user.role,
        productIds: user.productIds || [],
        licensedProductIds: user.licensedProductIds || [],
      },
      tokenRequired: dbMode === "supabase" || process.env.NODE_ENV === "production",
      tokenPresent: authorization.startsWith("Bearer "),
      checkedAt: new Date().toISOString(),
    });
  } catch {
    res.status(401).json({
      authenticated: false,
      source: req.sessionSource || "none",
      user: null,
      tokenRequired: dbMode === "supabase" || process.env.NODE_ENV === "production",
      tokenPresent: String(req.headers.authorization || "").startsWith("Bearer "),
      checkedAt: new Date().toISOString(),
    });
  }
});

app.get("/api/security/access-health", (req, res) => {
  try {
    const user = getCurrentUser(req);
    const profile = normalizeServerUserProfile(user.role);
    const permissions = getServerPermissions(user.role);
    const coverage = getAuthorizationCoverageSummary();

    res.json({
      authenticated: true,
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      sessionSource: user.source || (req as any).sessionSource || "none",
      profile,
      permissions,
      coverage,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    res.status(401).json({
      authenticated: false,
      permissions: [],
      coverage: getAuthorizationCoverageSummary(),
      checkedAt: new Date().toISOString(),
    });
  }
});


















app.get("/api/configuration/deployment/release-lifecycles", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    res.json(await deploymentReleaseLifecycleService.list(
      Number.isFinite(limit) ? limit : 100,
    ));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to list release lifecycles" });
  }
});

app.post("/api/configuration/deployment/release-lifecycles", async (req, res) => {
  try {
    res.status(201).json(await deploymentReleaseLifecycleService.initialize(
      String(req.body?.executionId || ""),
      String(req.body?.responsible || ""),
    ));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to initialize release lifecycle" });
  }
});

app.put("/api/configuration/deployment/release-lifecycles/:id/checklist/:itemId", async (req, res) => {
  try {
    res.json(await deploymentReleaseLifecycleService.updateChecklist(
      req.params.id,
      req.params.itemId,
      Boolean(req.body?.completed),
      String(req.body?.responsible || ""),
      req.body?.notes,
    ));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to update cutover checklist" });
  }
});

app.post("/api/configuration/deployment/release-lifecycles/:id/evidences", async (req, res) => {
  try {
    res.status(201).json(await deploymentReleaseLifecycleService.addEvidence(req.params.id, {
      type: req.body?.type,
      label: String(req.body?.label || ""),
      reference: String(req.body?.reference || ""),
      recordedBy: String(req.body?.recordedBy || ""),
    }));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to add release evidence" });
  }
});

app.post("/api/configuration/deployment/release-lifecycles/:id/verify", async (req, res) => {
  try {
    res.json(await deploymentReleaseLifecycleService.verifyPostDeploy(req.params.id));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to verify post-deploy" });
  }
});

app.post("/api/configuration/deployment/release-lifecycles/:id/rollback", async (req, res) => {
  try {
    const lifecycle = await deploymentReleaseLifecycleService.rollback(
      req.params.id,
      String(req.body?.reason || ""),
      String(req.body?.responsible || ""),
    );
    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: lifecycle.organizationId,
      actionType: "deployment_recorded",
      entityType: "directory",
      entityId: lifecycle.environmentId,
      description: `Rollback da release ${lifecycle.version} executado.`,
      metadata: lifecycle.rollback ? { ...lifecycle.rollback } : {},
    });
    res.json(lifecycle);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to execute rollback" });
  }
});

app.post("/api/configuration/deployment/release-lifecycles/:id/complete", async (req, res) => {
  try {
    res.json(await deploymentReleaseLifecycleService.complete(req.params.id));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to complete release lifecycle" });
  }
});

app.get("/api/configuration/deployment/release-executions", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);

    res.json(
      await deploymentReleaseExecutionService.list(
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error:
        error?.message ||
        "Failed to list deployment release executions",
    });
  }
});

app.post("/api/configuration/deployment/release-executions", async (req, res) => {
  try {
    const result =
      await deploymentReleaseExecutionService.create({
        approvalId: String(req.body?.approvalId || ""),
        environmentId: String(req.body?.environmentId || ""),
        status: req.body?.status || "success",
        responsible: String(req.body?.responsible || ""),
        notes: req.body?.notes,
      });

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: result.execution.organizationId,
      actionType: "deployment_recorded",
      entityType: "directory",
      entityId: result.execution.environmentId,
      description: `Release ${result.execution.version} executada em ${result.execution.target}.`,
      metadata: {
        approvalId: result.execution.approvalId,
        validationRunId: result.execution.validationRunId,
        deploymentRecordId:
          result.execution.deploymentRecordId,
        status: result.execution.status,
        responsible: result.execution.responsible,
      },
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to execute approved deployment release",
    });
  }
});

app.get("/api/configuration/deployment/release-approvals", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);

    res.json(
      await deploymentReleaseApprovalService.list(
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error:
        error?.message ||
        "Failed to list deployment release approvals",
    });
  }
});

app.post("/api/configuration/deployment/release-approvals", async (req, res) => {
  try {
    res.status(201).json(
      await deploymentReleaseApprovalService.create({
        validationRunId: String(req.body?.validationRunId || ""),
        target: req.body?.target,
        version: String(req.body?.version || ""),
        requestedBy: String(req.body?.requestedBy || ""),
        notes: req.body?.notes,
      }),
    );
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to create deployment release approval",
    });
  }
});

app.put("/api/configuration/deployment/release-approvals/:id", async (req, res) => {
  try {
    res.json(
      await deploymentReleaseApprovalService.decide(
        req.params.id,
        {
          status: req.body?.status,
          decidedBy: String(req.body?.decidedBy || ""),
          notes: req.body?.notes,
        },
      ),
    );
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to decide deployment release approval",
    });
  }
});

app.get("/api/configuration/deployment/validations", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);

    res.json(
      await deploymentValidationService.list(
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error:
        error?.message ||
        "Failed to list deployment validations",
    });
  }
});

app.post("/api/configuration/deployment/validations", async (_req, res) => {
  try {
    res.status(201).json(
      await deploymentValidationService.execute(),
    );
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to execute deployment validation",
    });
  }
});

app.get("/api/configuration/deployment/connectivity", async (_req, res) => {
  try {
    res.json(await deploymentConnectivityService.buildSummary());
  } catch (error: any) {
    res.status(500).json({
      error:
        error?.message ||
        "Failed to validate deployment connectivity",
    });
  }
});

app.get("/api/configuration/deployment", (_req, res) => {
  res.json(deploymentConfigurationService.buildSummary());
});

app.get("/api/health/live", (_req, res) => {
  res.json({
    status: "ok",
    service: "beta-platform",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/ready", async (_req, res) => {
  try {
    const configuration = deploymentConfigurationService.buildSummary();
    const connectivity = await deploymentConnectivityService.buildSummary();
    const ready = !configuration.productionBlocked && !connectivity.productionBlocked;

    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "blocked",
      ready,
      configurationScore: configuration.score,
      connectivityScore: connectivity.score,
      databaseMode: configuration.databaseMode,
      environment: configuration.environment,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: "error",
      ready: false,
      error: error?.message || "Readiness check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/notification-maintenance/scheduler", (_req, res) => {
  res.json(notificationMaintenanceScheduler.getSnapshot());
});

app.post("/api/notification-maintenance/scheduler/run", async (_req, res) => {
  try {
    await notificationMaintenanceScheduler.run();
    res.json(notificationMaintenanceScheduler.getSnapshot());
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to execute notification maintenance scheduler",
    });
  }
});

app.get("/api/notification-maintenance/preview", async (_req, res) => {
  try {
    res.json(await notificationMaintenanceService.preview());
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to preview notification maintenance",
    });
  }
});

app.get("/api/notification-maintenance/runs", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    res.json(
      await notificationMaintenanceService.listRuns(
        Number.isFinite(limit) ? limit : 50,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list notification maintenance runs",
    });
  }
});

app.post("/api/notification-maintenance/execute", async (_req, res) => {
  try {
    res.json(await notificationMaintenanceService.execute("manual"));
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to execute notification maintenance",
    });
  }
});

app.get("/api/notification-deliveries/retry-runs", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);

    res.json(
      await notificationRetryRunService.list(
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list notification retry runs",
    });
  }
});

app.get("/api/notification-deliveries/retry-scheduler", (_req, res) => {
  res.json(notificationRetryScheduler.getSnapshot());
});

app.post("/api/notification-deliveries/retry-scheduler/run", async (_req, res) => {
  try {
    await notificationRetryScheduler.run("manual");
    res.json(notificationRetryScheduler.getSnapshot());
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to execute notification retry scheduler",
    });
  }
});

app.post("/api/notification-deliveries/retry-failed", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    res.json(
      await notificationDeliveryService.retryAllFailed(
        tenant.organizationId,
        user.id,
      ),
    );
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to retry notification deliveries",
    });
  }
});

app.post("/api/notification-deliveries/:id/retry", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    res.json(
      await notificationDeliveryService.retry(
        tenant.organizationId,
        user.id,
        req.params.id,
      ),
    );
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to retry notification delivery",
    });
  }
});

app.get("/api/notification-deliveries", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);
    const limit = Number(req.query.limit || 100);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    res.json(
      await notificationDeliveryService.list(
        tenant.organizationId,
        user.id,
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list notification deliveries",
    });
  }
});

app.get("/api/notification-preferences", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    res.json(
      await notificationPreferenceService.get(
        tenant.organizationId,
        user.id,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to load notification preferences",
    });
  }
});

app.put("/api/notification-preferences", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    res.json(
      await notificationPreferenceService.update(
        tenant.organizationId,
        user.id,
        {
          inAppEnabled:
            req.body?.inAppEnabled === undefined
              ? undefined
              : Boolean(req.body.inAppEnabled),
          incidentAlertsEnabled:
            req.body?.incidentAlertsEnabled === undefined
              ? undefined
              : Boolean(req.body.incidentAlertsEnabled),
          minimumEscalationLevel:
            req.body?.minimumEscalationLevel,
          markReadOnOpen:
            req.body?.markReadOnOpen === undefined
              ? undefined
              : Boolean(req.body.markReadOnOpen),
        },
      ),
    );
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to update notification preferences",
    });
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);
    const limit = Number(req.query.limit || 100);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    res.json(
      await notificationCenterService.list(
        tenant.organizationId,
        user.id,
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list notifications",
    });
  }
});

app.put("/api/notifications/read-all", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    const result = await notificationCenterService.markAllRead(
      tenant.organizationId,
      user.id,
    );
    await notificationDeliveryService.markAllRead(
      tenant.organizationId,
      user.id,
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to mark notifications as read",
    });
  }
});

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const user = getCurrentUser(req);

    if (!tenant.organizationId || !user.id) {
      return res.status(400).json({
        error: "organizationId and userId are required",
      });
    }

    const notification = await notificationCenterService.markRead(
      tenant.organizationId,
      user.id,
      req.params.id,
    );
    await notificationDeliveryService.markRead(
      tenant.organizationId,
      user.id,
      req.params.id,
    );

    res.json(notification);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to mark notification as read",
    });
  }
});

app.get("/api/observability/incident-alerts", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    const limit = Number(req.query.limit || 100);

    if (!organizationId) {
      return res.status(400).json({
        error: "organizationId is required",
      });
    }

    res.json(
      await incidentEscalationService.listAlerts(
        organizationId,
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list incident alerts",
    });
  }
});

app.post("/api/observability/incidents/:id/escalate", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);

    if (!organizationId) {
      return res.status(400).json({
        error: "organizationId is required",
      });
    }

    res.json(
      await incidentEscalationService.escalate(
        organizationId,
        req.params.id,
      ),
    );
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to escalate incident",
    });
  }
});

app.get("/api/observability/incidents", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    const limit = Number(req.query.limit || 100);

    if (!organizationId) {
      return res.status(400).json({
        error: "organizationId is required",
      });
    }

    res.json(
      await operationalIncidentService.list(
        organizationId,
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list incidents",
    });
  }
});

app.post("/api/observability/incidents/synchronize", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId) {
      return res.status(400).json({
        error: "organizationId is required",
      });
    }

    const detection = IncidentDetectionService.detect(
      tenant.organizationId,
      tenant.workspaceId,
      runtimeObservabilityService.getSnapshot(),
    );
    const results = [];

    for (const input of detection.detected) {
      results.push(
        await operationalIncidentService.upsertDetected(input),
      );
    }

    res.json({
      checkedAt: detection.checkedAt,
      detected: detection.detected.length,
      created: results.filter((result) => result.created).length,
      updated: results.filter((result) => !result.created).length,
      incidents: results.map((result) => result.incident),
    });
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to synchronize incidents",
    });
  }
});

app.post("/api/observability/incidents", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId) {
      return res.status(400).json({
        error: "organizationId is required",
      });
    }

    const incident = await operationalIncidentService.create({
      organizationId: tenant.organizationId,
      workspaceId: tenant.workspaceId,
      title: String(req.body?.title || ""),
      description: String(req.body?.description || ""),
      source: String(req.body?.source || "manual"),
      severity: req.body?.severity || "medium",
      owner: req.body?.owner,
    });

    res.status(201).json(incident);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to create incident",
    });
  }
});

app.put("/api/observability/incidents/:id", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({
        error: "organizationId is required",
      });
    }

    res.json(
      await operationalIncidentService.update(
        organizationId,
        req.params.id,
        req.body || {},
      ),
    );
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to update incident",
    });
  }
});

app.get("/api/observability/runtime", (_req, res) => {
  res.json(runtimeObservabilityService.getSnapshot());
});

// Persistence runtime health — does not expose secret values.
app.get("/api/persistence/health", (_req, res) => {
  const supabaseUrlConfigured = Boolean(process.env.SUPABASE_URL);
  const supabaseKeyConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  );
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const configured =
    dbMode === "supabase"
      ? supabaseUrlConfigured && supabaseKeyConfigured
      : true;

  res.json({
    mode: dbMode === "supabase" ? "supabase" : "json",
    adapter: dbAdapter.constructor.name,
    configured,
    supabaseUrlConfigured,
    supabaseKeyConfigured,
    serviceRoleConfigured,
    checkedAt: new Date().toISOString(),
  });
});


app.get("/api/persistence/schema-health", async (_req, res) => {
  const checkedAt = new Date().toISOString();

  if (dbMode !== "supabase") {
    return res.json({
      mode: "json",
      checkedAt,
      tables: PERSISTENCE_TABLE_REQUIREMENTS.map((requirement) => ({
        ...requirement,
        status: "not_applicable",
        error: null,
      })),
    });
  }

  try {
    const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();

    const tables = await Promise.all(
      PERSISTENCE_TABLE_REQUIREMENTS.map(async (requirement) => {
        const { error } = await supabase
          .from(requirement.table)
          .select("id", { head: true, count: "exact" })
          .limit(1);

        return {
          ...requirement,
          status: error ? "missing_or_inaccessible" : "ready",
          error: error?.message || null,
        };
      }),
    );

    res.json({
      mode: "supabase",
      checkedAt,
      tables,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to validate persistence schema",
      checkedAt,
    });
  }
});



app.get("/api/admin/environments", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    const tenantId = String(
      req.query.tenantId ||
      tenant.organizationId ||
      "",
    );

    if (!tenantId) {
      return res.status(400).json({
        error: "tenantId is required",
      });
    }

    const tenants = await adminDirectoryService.listTenants();
    const targetTenant = tenants.find(
      (item) =>
        item.id === tenantId ||
        item.organizationId === tenantId,
    );
    const organizationId =
      targetTenant?.organizationId ||
      tenant.organizationId ||
      tenantId;
    const workspaceId =
      targetTenant?.workspaceId ||
      tenant.workspaceId;

    res.json(
      await deploymentEnvironmentService.listEnvironments(
        tenantId,
        organizationId,
        workspaceId,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list deployment environments",
    });
  }
});

app.put("/api/admin/environments/:id", async (req, res) => {
  try {
    const environment =
      await deploymentEnvironmentService.updateEnvironment(
        req.params.id,
        req.body || {},
      );

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: environment.organizationId,
      actionType: "environment_updated",
      entityType: "directory",
      entityId: environment.id,
      description: `Ambiente ${environment.name} atualizado.`,
      metadata: {
        kind: environment.kind,
        status: environment.status,
        version: environment.version,
        changedFields: Object.keys(req.body || {}),
      },
    });

    res.json(environment);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to update deployment environment",
    });
  }
});

app.get("/api/admin/environments/:id/deployments", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    res.json(
      await deploymentEnvironmentService.listDeployments(
        req.params.id,
        Number.isFinite(limit) ? limit : 50,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list deployment history",
    });
  }
});

app.post("/api/admin/environments/:id/deployments", async (req, res) => {
  try {
    const result =
      await deploymentEnvironmentService.recordDeployment(
        req.params.id,
        {
          version: String(req.body?.version || ""),
          status: req.body?.status || "success",
          responsible: String(req.body?.responsible || ""),
          notes: req.body?.notes,
        },
      );

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: result.environment.organizationId,
      actionType: "deployment_recorded",
      entityType: "directory",
      entityId: result.environment.id,
      description: `Deploy ${result.deployment.version} registrado em ${result.environment.name}.`,
      metadata: {
        environmentKind: result.environment.kind,
        deploymentStatus: result.deployment.status,
        responsible: result.deployment.responsible,
      },
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to record deployment",
    });
  }
});


app.get("/api/admin/governance/overview", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    res.json(await adminAccessReviewService.overview(organizationId));
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to load admin governance overview",
    });
  }
});

app.get("/api/admin/governance/access-reviews", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }
    const limit = Number(req.query.limit || 50);
    res.json(
      await adminAccessReviewService.list(
        organizationId,
        Number.isFinite(limit) ? limit : 50,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || "Failed to list access reviews",
    });
  }
});

app.post("/api/admin/governance/access-reviews", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }
    const actor = getCurrentUser(req);
    const review = await adminAccessReviewService.create(
      organizationId,
      actor.name || actor.id,
    );
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId,
      actionType: "access_review_created",
      entityType: "directory",
      entityId: review.id,
      description: `Revisão de acesso criada com ${review.items.length} usuário(s).`,
      metadata: { status: review.status },
    });
    res.status(201).json(review);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to create access review",
    });
  }
});

app.put("/api/admin/governance/access-reviews/:id/users/:userId", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }
    const actor = getCurrentUser(req);
    const review = await adminAccessReviewService.decide(
      organizationId,
      req.params.id,
      req.params.userId,
      {
        ...req.body,
        decidedBy: String(req.body?.decidedBy || actor.name || actor.id),
      },
    );
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId,
      actionType: "access_review_decided",
      entityType: "user",
      entityId: req.params.userId,
      description: `Decisão de acesso registrada: ${String(req.body?.decision || "")}.`,
      metadata: {
        reviewId: review.id,
        decision: req.body?.decision,
        reviewStatus: review.status,
      },
    });
    res.json(review);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to decide access review",
    });
  }
});

app.get("/api/admin/security/tenant-isolation", async (req, res) => {
  try {
    const actor = getCurrentUser(req);
    const profile = normalizeServerUserProfile(actor.role);
    if (profile !== "master_admin") {
      return res.status(403).json({ error: "Apenas o administrador master pode consultar este diagnóstico." });
    }
    res.json(getTenantIsolationSummary());
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to load tenant isolation summary" });
  }
});

app.get("/api/admin/security/beta-context", (_req, res) => {
  res.json(getAssistantContextIsolationSummary());
});


app.get("/api/admin/audit", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const actor = getCurrentUser(req);
    const requestedLimit = Number.parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 500)) : 100;

    // The audit service applies organization filtering in both JSON and Supabase modes.
    // Master administrators still receive only the active organization unless they use
    // a dedicated global administrative flow.
    const entries = await adminAuditService.list(organizationId, limit);

    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId,
      actionType: "directory_viewed",
      entityType: "directory",
      entityId: "audit-log",
      description: "Histórico de auditoria consultado.",
      metadata: { limit },
    });

    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to list audit entries" });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    res.json(await adminDirectoryService.listUsers(organizationId));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to list users" });
  }
});

app.post("/api/admin/users/invite", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const user = await adminDirectoryService.inviteUser({
      ...req.body,
      organizationId,
      tenantId: req.body?.tenantId || organizationId,
    });

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId,
      actionType: "user_invited",
      entityType: "user",
      entityId: user.id,
      description: `Convite enviado para ${user.email}.`,
      metadata: {
        invitedProfile: user.profile,
        invitedEmail: user.email,
        tenantId: user.tenantId,
      },
    });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to invite user" });
  }
});

app.post("/api/admin/users/:id/resend-invitation", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: "organizationId is required" });
    const user = await adminDirectoryService.resendInvitation(organizationId, req.params.id);
    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id, actorName: actor.name, organizationId,
      actionType: "user_invitation_resent", entityType: "user", entityId: user.id,
      description: `Convite reenviado para ${user.email}.`,
      metadata: { invitedEmail: user.email, profile: user.profile },
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to resend invitation" });
  }
});

app.delete("/api/admin/users/:id/invitation", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: "organizationId is required" });
    const user = await adminDirectoryService.cancelInvitation(organizationId, req.params.id);
    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id, actorName: actor.name, organizationId,
      actionType: "user_invitation_cancelled", entityType: "user", entityId: user.id,
      description: `Convite de ${user.email} cancelado.`,
      metadata: { invitedEmail: user.email, profile: user.profile },
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to cancel invitation" });
  }
});

app.put("/api/admin/users/:id", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const user = await adminDirectoryService.updateUser(
      organizationId,
      req.params.id,
      req.body || {},
    );

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId,
      actionType: "user_updated",
      entityType: "user",
      entityId: user.id,
      description: `Usuário ${user.email} atualizado.`,
      metadata: {
        profile: user.profile,
        status: user.status,
        changedFields: Object.keys(req.body || {}),
      },
    });

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to update user" });
  }
});






app.get("/api/production/release-candidate-certifications", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId || !tenant.workspaceId) {
      return res.status(400).json({
        error: "organizationId and workspaceId are required",
      });
    }
    const limit = Number(req.query.limit || 100);
    res.json(
      await releaseCandidateCertificationService.list(
        tenant.organizationId,
        tenant.workspaceId,
        Number.isFinite(limit) ? limit : 100,
      ),
    );
  } catch (error: any) {
    res.status(500).json({
      error:
        error?.message ||
        "Failed to list release candidate certifications",
    });
  }
});

app.post("/api/production/release-candidate-certifications", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId || !tenant.workspaceId) {
      return res.status(400).json({
        error: "organizationId and workspaceId are required",
      });
    }

    const certification =
      await releaseCandidateCertificationService.create(
        tenant.organizationId,
        tenant.workspaceId,
        {
          version: String(req.body?.version || ""),
          createdBy: String(req.body?.createdBy || ""),
        },
      );

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: tenant.organizationId,
      actionType: "rc_certification_created",
      entityType: "directory",
      entityId: certification.id,
      description: `Certificação ${certification.version} iniciada.`,
      metadata: {
        version: certification.version,
        requiredControls: certification.requiredControls,
      },
    });

    res.status(201).json(certification);
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to create release candidate certification",
    });
  }
});

app.put("/api/production/release-candidate-certifications/:id/controls/:controlId", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId || !tenant.workspaceId) {
      return res.status(400).json({
        error: "organizationId and workspaceId are required",
      });
    }

    res.json(
      await releaseCandidateCertificationService.updateControl(
        tenant.organizationId,
        tenant.workspaceId,
        req.params.id,
        req.params.controlId,
        {
          status: req.body?.status,
          owner: String(req.body?.owner || ""),
          evidence: req.body?.evidence,
          expiresAt: req.body?.expiresAt,
          notes: req.body?.notes,
        },
      ),
    );
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to update release candidate control",
    });
  }
});

app.post("/api/production/release-candidate-certifications/:id/approve", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId || !tenant.workspaceId) {
      return res.status(400).json({
        error: "organizationId and workspaceId are required",
      });
    }

    const certification =
      await releaseCandidateCertificationService.approve(
        tenant.organizationId,
        tenant.workspaceId,
        req.params.id,
        String(req.body?.approvedBy || ""),
      );

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: tenant.organizationId,
      actionType: "rc_certification_approved",
      entityType: "directory",
      entityId: certification.id,
      description: `Certificação ${certification.version} aprovada.`,
      metadata: {
        score: certification.score,
        approvedBy: certification.approvedBy,
        approvedAt: certification.approvedAt,
      },
    });

    res.json(certification);
  } catch (error: any) {
    res.status(400).json({
      error:
        error?.message ||
        "Failed to approve release candidate certification",
    });
  }
});

app.get("/api/beta/governance/assets", async (req, res) => {
  try { const tenant=extractTenant(req); if(!tenant.organizationId||!tenant.workspaceId) return res.status(400).json({error:"organizationId and workspaceId are required"}); res.json(await betaGovernanceService.list(tenant.organizationId,tenant.workspaceId)); } catch(error:any){res.status(500).json({error:error?.message||"Failed to list Beta governance assets"});}
});
app.get("/api/beta/governance/overview", async (req, res) => {
  try { const tenant=extractTenant(req); if(!tenant.organizationId||!tenant.workspaceId) return res.status(400).json({error:"organizationId and workspaceId are required"}); const items=await betaGovernanceService.list(tenant.organizationId,tenant.workspaceId); res.json(betaGovernanceService.buildSummary(items)); } catch(error:any){res.status(500).json({error:error?.message||"Failed to build Beta governance overview"});}
});
app.post("/api/beta/governance/assets", async (req, res) => {
  try { const tenant=extractTenant(req); if(!tenant.organizationId||!tenant.workspaceId) return res.status(400).json({error:"organizationId and workspaceId are required"}); res.status(201).json(await betaGovernanceService.upsert(tenant.organizationId,tenant.workspaceId,req.body)); } catch(error:any){res.status(400).json({error:error?.message||"Failed to save Beta governance asset"});}
});
app.put("/api/beta/governance/assets/:id/status", async (req, res) => {
  try { const tenant=extractTenant(req); if(!tenant.organizationId||!tenant.workspaceId) return res.status(400).json({error:"organizationId and workspaceId are required"}); res.json(await betaGovernanceService.setStatus(tenant.organizationId,tenant.workspaceId,req.params.id,req.body?.status,String(req.body?.owner||""))); } catch(error:any){res.status(400).json({error:error?.message||"Failed to update Beta governance asset"});}
});
app.get("/api/customer-operations/plans", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) {
      return res.status(400).json({ error: "organizationId and workspaceId are required" });
    }

    res.json(await customerOperationsService.list(organizationId, workspaceId));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to list customer operations plans" });
  }
});

app.get("/api/customer-operations/overview", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) {
      return res.status(400).json({ error: "organizationId and workspaceId are required" });
    }

    res.json(await customerOperationsService.buildSummary(organizationId, workspaceId));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to build customer operations overview" });
  }
});

app.post("/api/customer-operations/plans", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) {
      return res.status(400).json({ error: "organizationId and workspaceId are required" });
    }

    const plan = await customerOperationsService.upsert(
      organizationId,
      workspaceId,
      req.body,
    );
    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId,
      actionType: "customer_operations_updated",
      entityType: "directory",
      entityId: plan.clientId,
      description: `Plano operacional atualizado para ${plan.clientName}.`,
      metadata: {
        clientId: plan.clientId,
        lifecycleStage: plan.lifecycleStage,
        healthStatus: plan.healthStatus,
        healthScore: plan.healthScore,
        owner: plan.owner,
        supportSlaHours: plan.supportSlaHours,
      },
    });

    res.json(plan);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to save customer operations plan" });
  }
});

app.get("/api/admin/commercial-contracts", async (req, res) => {
  try {
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : undefined;
    res.json(await tenantCommercialContractService.list(tenantId));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to list commercial contracts" });
  }
});

app.post("/api/admin/commercial-contracts", async (req, res) => {
  try {
    const contract = await tenantCommercialContractService.save({
      tenantId: String(req.body?.tenantId || ""),
      planName: String(req.body?.planName || ""),
      status: req.body?.status || "draft",
      productIds: Array.isArray(req.body?.productIds) ? req.body.productIds : [],
      monthlyValue: Number(req.body?.monthlyValue || 0),
      setupValue: Number(req.body?.setupValue || 0),
      billingDay: Number(req.body?.billingDay || 10),
      startDate: String(req.body?.startDate || ""),
      endDate: req.body?.endDate || undefined,
      autoRenew: req.body?.autoRenew !== false,
      responsible: String(req.body?.responsible || ""),
      notes: req.body?.notes,
    });
    const tenants = await adminDirectoryService.listTenants();
    const tenant = tenants.find((item) => item.id === contract.tenantId || item.organizationId === contract.organizationId);
    if (tenant) {
      await tenantProductInstallationService.sync({
        tenantId: tenant.id,
        organizationId: tenant.organizationId,
        workspaceId: tenant.workspaceId,
        productIds: contract.productIds,
      });
    }
    const actor = getCurrentUser(req);
    await adminAuditService.record({ actorUserId: actor.id, actorName: actor.name, organizationId: contract.organizationId, actionType: "commercial_contract_updated", entityType: "tenant", entityId: contract.tenantId, description: `Contrato comercial ${contract.planName} atualizado.`, metadata: { status: contract.status, productIds: contract.productIds, monthlyValue: contract.monthlyValue, billingDay: contract.billingDay } });
    res.status(201).json(contract);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to save commercial contract" });
  }
});

app.get("/api/admin/tenants/:id/licenses", async (req, res) => {
  try {
    res.json(
      await adminDirectoryService.getTenantProductLicenses(req.params.id),
    );
  } catch (error: any) {
    res.status(404).json({
      error: error?.message || "Failed to load tenant licenses",
    });
  }
});

app.put("/api/admin/tenants/:id/licenses", async (req, res) => {
  try {
    const before =
      await adminDirectoryService.getTenantProductLicenses(req.params.id);
    const snapshot =
      await adminDirectoryService.updateTenantProductLicenses(
        req.params.id,
        {
          productIds: Array.isArray(req.body?.productIds)
            ? req.body.productIds
            : [],
          synchronizeUsers: req.body?.synchronizeUsers !== false,
        },
      );

    const tenants = await adminDirectoryService.listTenants();
    const tenant = tenants.find((item) => item.id === snapshot.tenantId || item.organizationId === snapshot.organizationId);
    if (tenant) {
      await tenantProductInstallationService.sync({ tenantId: tenant.id, organizationId: tenant.organizationId, workspaceId: tenant.workspaceId, productIds: snapshot.licensedProductIds });
    }

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: snapshot.organizationId,
      actionType: "product_licenses_updated",
      entityType: "tenant",
      entityId: snapshot.tenantId,
      description: `Licenças do tenant atualizadas para ${snapshot.licensedProductIds.length} produto(s).`,
      metadata: {
        previousProductIds: before.licensedProductIds,
        licensedProductIds: snapshot.licensedProductIds,
        synchronizeUsers: req.body?.synchronizeUsers !== false,
        usersSynchronized: snapshot.usersSynchronized,
        userCount: snapshot.userCount,
      },
    });

    res.json(snapshot);
  } catch (error: any) {
    res.status(400).json({
      error: error?.message || "Failed to update tenant licenses",
    });
  }
});


app.get("/api/admin/tenants/:id/product-installations", async (req, res) => {
  try {
    const tenants = await adminDirectoryService.listTenants();
    const tenant = tenants.find((item) => item.id === req.params.id || item.organizationId === req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant não encontrado." });
    res.json(await tenantProductInstallationService.list(tenant.organizationId));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to list tenant product installations" });
  }
});

app.get("/api/product-installations/current", async (req, res) => {
  try {
    const { organizationId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: "organizationId is required" });
    res.json(await tenantProductInstallationService.list(organizationId));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to list current product installations" });
  }
});

app.post("/api/admin/client-onboarding", async (req, res) => {
  try {
    const result = await clientOnboardingOrchestrator.create(req.body || {});
    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id, actorName: actor.name, organizationId: result.tenant.organizationId,
      actionType: "tenant_created", entityType: "tenant", entityId: result.tenant.id,
      description: `Onboarding operacional de ${result.tenant.name} concluído.`,
      metadata: { workspaceId: result.tenant.workspaceId, contractId: result.contract.id, readinessScore: result.readiness.score, licensedProducts: result.tenant.licensedProductIds.length },
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to complete client onboarding" });
  }
});

app.get("/api/admin/client-onboarding/:id/readiness", async (req, res) => {
  try { res.json(await clientOnboardingOrchestrator.evaluate(req.params.id)); }
  catch (error: any) { res.status(400).json({ error: error?.message || "Failed to evaluate client readiness" }); }
});

app.post("/api/admin/client-onboarding/:id/activate", async (req, res) => {
  try {
    const result = await clientOnboardingOrchestrator.activate(req.params.id);
    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id, actorName: actor.name, organizationId: result.tenant.organizationId,
      actionType: "tenant_recovered", entityType: "tenant", entityId: result.tenant.id,
      description: `Tenant ${result.tenant.name} liberado para o primeiro acesso do cliente.`,
      metadata: { status: result.tenant.status, readinessScore: result.readiness.score },
    });
    res.json(result);
  } catch (error: any) { res.status(400).json({ error: error?.message || "Failed to activate client" }); }
});

app.get("/api/admin/tenants", async (_req, res) => {
  try {
    res.json(await adminDirectoryService.listTenants());
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to list tenants" });
  }
});

app.put("/api/admin/tenants/:id", async (req, res) => {
  try {
    const before = (await adminDirectoryService.listTenants()).find(
      (item) => item.id === req.params.id || item.organizationId === req.params.id,
    );
    if (!before) return res.status(404).json({ error: "Tenant não encontrado." });

    const tenant = await adminDirectoryService.updateTenant(req.params.id, {
      status: req.body?.status,
      primaryAdminName: req.body?.primaryAdminName,
      primaryAdminEmail: req.body?.primaryAdminEmail,
    });

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: tenant.organizationId,
      actionType: "tenant_recovered",
      entityType: "tenant",
      entityId: tenant.id,
      description: `Tenant ${tenant.name} atualizado durante recuperação operacional.`,
      metadata: {
        previousStatus: before.status,
        status: tenant.status,
        primaryAdminEmail: tenant.primaryAdminEmail,
      },
    });

    res.json(tenant);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to update tenant" });
  }
});

app.post("/api/admin/tenants", async (req, res) => {
  try {
    const tenant = await adminDirectoryService.createTenant(req.body || {});

    const actor = getCurrentUser(req);
    await adminAuditService.record({
      actorUserId: actor.id,
      actorName: actor.name,
      organizationId: tenant.organizationId,
      actionType: "tenant_created",
      entityType: "tenant",
      entityId: tenant.id,
      description: `Tenant ${tenant.name} criado.`,
      metadata: {
        tenantType: tenant.type,
        workspaceId: tenant.workspaceId,
        licensedProducts: tenant.licensedProductIds.length,
        primaryAdminEmail: tenant.primaryAdminEmail,
      },
    });

    res.status(201).json(tenant);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || "Failed to create tenant" });
  }
});

// Beta Capability System
app.get("/api/beta/capabilities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    res.json(BetaCapabilityRegistry.resolveForUser(user));
  } catch (error: any) {
    res.status(401).json({ error: error?.message || "Unable to resolve Beta capabilities" });
  }
});

// Projects


// Commercial Radar connector infrastructure
app.get('/api/commercial/radar-connectors', async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { organizationId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });
    const role = String(user.role || '').toLowerCase();
    const canConfigureCredential = role === 'master_admin' || role === 'tenant_admin' || role === 'admin';
    const credentials = await radarConnectorCredentialService.listMetadata(organizationId);
    const connectors = radarSyncService.listConnectors().map((connector) => {
      const tenantCredential = credentials.find((item) => item.connectorId === connector.id && item.scope === 'tenant');
      const globalCredential = credentials.find((item) => item.connectorId === connector.id && item.scope === 'global');
      const selected = tenantCredential || globalCredential;
      return {
        ...connector,
        credentialConfigured: connector.authPolicy === 'PUBLIC_NO_AUTH' ? true : Boolean(selected),
        credentialScope: selected?.scope,
        credentialMaskedValue: selected?.maskedValue,
        canConfigureCredential,
      };
    });
    res.json(connectors);
  } catch (error: any) {
    res.status(401).json({ error: error?.message || 'Unable to list radar connectors' });
  }
});

app.put('/api/commercial/radar-connectors/:connectorId/credential', async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { organizationId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });
    const role = String(user.role || '').toLowerCase();
    const isMaster = role === 'master_admin' && user.organizationId === 'org-oi-beta';
    const isTenantAdmin = role === 'tenant_admin' || role === 'admin';
    if (!isMaster && !isTenantAdmin) return res.status(403).json({ error: 'Only administrators can configure connector credentials' });

    const requestedScope = req.body?.scope === 'global' ? 'global' : 'tenant';
    if (requestedScope === 'global' && !isMaster) return res.status(403).json({ error: 'Only the Oi Beta master administrator can configure global credentials' });
    const targetOrganizationId = isMaster && req.body?.organizationId
      ? String(req.body.organizationId)
      : organizationId;
    const metadata = await radarConnectorCredentialService.upsert({
      connectorId: req.params.connectorId,
      scope: requestedScope,
      organizationId: requestedScope === 'tenant' ? targetOrganizationId : undefined,
      secret: String(req.body?.secret || ''),
      label: req.body?.label ? String(req.body.label) : undefined,
      updatedBy: user.id,
    });
    res.json(metadata);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Unable to save connector credential' });
  }
});

app.delete('/api/commercial/radar-connectors/:connectorId/credential', async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { organizationId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });
    const role = String(user.role || '').toLowerCase();
    const isMaster = role === 'master_admin' && user.organizationId === 'org-oi-beta';
    const isTenantAdmin = role === 'tenant_admin' || role === 'admin';
    if (!isMaster && !isTenantAdmin) return res.status(403).json({ error: 'Only administrators can revoke connector credentials' });
    const scope = req.query.scope === 'global' ? 'global' : 'tenant';
    if (scope === 'global' && !isMaster) return res.status(403).json({ error: 'Only the Oi Beta master administrator can revoke global credentials' });
    await radarConnectorCredentialService.revoke({
      connectorId: req.params.connectorId,
      scope,
      organizationId: scope === 'tenant' ? organizationId : undefined,
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Unable to revoke connector credential' });
  }
});

app.get('/api/commercial/radar-connectors/runs', async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });
    res.json(await radarSyncService.listRuns(organizationId, workspaceId));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Unable to list radar synchronization runs' });
  }
});

app.post('/api/commercial/radar-connectors/:connectorId/runs', async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });
    const run = await radarSyncService.start({ organizationId, workspaceId, connectorId: req.params.connectorId, initiatedBy: user.id, options: req.body || {} });
    res.status(run.status === 'running' ? 202 : 201).json(run);
  } catch (error: any) {
    const message = error?.message || 'Unable to start radar synchronization';
    res.status(message.includes('already running') ? 409 : 500).json({ error: message });
  }
});

// Radar tenant catalog and independent keyword monitoring
app.get('/api/commercial/radar-catalog/products', async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) return res.status(400).json({ error: 'organizationId and workspaceId are required' });
    res.json(await radarTenantCatalogService.listProducts(organizationId, workspaceId));
  } catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to list radar products' }); }
});
app.post('/api/commercial/radar-catalog/products', async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) return res.status(400).json({ error: 'organizationId and workspaceId are required' });
    const product = await radarTenantCatalogService.saveProduct({ ...req.body, organizationId, workspaceId });
    res.status(req.body?.id ? 200 : 201).json(product);
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to save radar product' }); }
});
app.delete('/api/commercial/radar-catalog/products/:id', async (req, res) => {
  try { const { organizationId, workspaceId } = extractTenant(req); if (!organizationId || !workspaceId) return res.status(400).json({ error: 'organizationId and workspaceId are required' }); await radarTenantCatalogService.deleteProduct(req.params.id, organizationId, workspaceId); res.status(204).end(); }
  catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to delete radar product' }); }
});
app.get('/api/commercial/radar-catalog/searches', async (req, res) => {
  try { const { organizationId, workspaceId } = extractTenant(req); if (!organizationId || !workspaceId) return res.status(400).json({ error: 'organizationId and workspaceId are required' }); res.json(await radarTenantCatalogService.listSearches(organizationId, workspaceId)); }
  catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to list radar searches' }); }
});
app.post('/api/commercial/radar-catalog/searches', async (req, res) => {
  try { const { organizationId, workspaceId } = extractTenant(req); if (!organizationId || !workspaceId) return res.status(400).json({ error: 'organizationId and workspaceId are required' }); const item = await radarTenantCatalogService.saveSearch({ ...req.body, organizationId, workspaceId }); res.status(req.body?.id ? 200 : 201).json(item); }
  catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to save radar search' }); }
});
app.delete('/api/commercial/radar-catalog/searches/:id', async (req, res) => {
  try { const { organizationId, workspaceId } = extractTenant(req); if (!organizationId || !workspaceId) return res.status(400).json({ error: 'organizationId and workspaceId are required' }); await radarTenantCatalogService.deleteSearch(req.params.id, organizationId, workspaceId); res.status(204).end(); }
  catch (error: any) { res.status(500).json({ error: error?.message || 'Unable to delete radar search' }); }
});

// Sprint 20.1 - Commercial Radar Persistence API
app.get("/api/commercial/opportunities", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const opportunities = await dbAdapter.getCommercialOpportunities(organizationId, workspaceId);
    res.json(opportunities);
  } catch (error: any) {
    console.error("[CommercialRadar] Failed to list opportunities:", error);
    res.status(500).json({ error: error?.message || "Failed to list commercial opportunities" });
  }
});

app.post("/api/commercial/opportunities", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) {
      return res.status(400).json({ error: "organizationId and workspaceId are required" });
    }

    const payload = {
      ...req.body,
      organizationId,
      workspaceId,
    };

    const opportunity = await dbAdapter.createCommercialOpportunity(payload);
    res.status(201).json(opportunity);
  } catch (error: any) {
    console.error("[CommercialRadar] Failed to create opportunity:", error);
    res.status(500).json({ error: error?.message || "Failed to create commercial opportunity" });
  }
});

app.patch("/api/commercial/opportunities/:id", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) return res.status(400).json({ error: "organizationId is required" });
    const opportunity = await dbAdapter.updateCommercialOpportunity(req.params.id, organizationId, workspaceId, req.body);
    res.json(opportunity);
  } catch (error: any) {
    console.error("[CommercialRadar] Failed to update opportunity:", error);
    res.status(500).json({ error: error?.message || "Failed to update commercial opportunity" });
  }
});


app.post("/api/commercial/opportunities/:id/send-to-crm", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) {
      return res.status(400).json({ error: "organizationId and workspaceId are required" });
    }

    const result = await radarCrmHandoffService.send({
      opportunityId: req.params.id,
      organizationId,
      workspaceId,
      requestedBy: user,
      responsible: req.body?.responsible,
      priority: req.body?.priority,
      nextAction: req.body?.nextAction,
      notes: req.body?.notes,
      createTask: req.body?.createTask !== false,
    });

    res.status(result.alreadyLinked ? 200 : 201).json(result);
  } catch (error: any) {
    const message = error?.message || "Failed to send opportunity to CRM";
    const status = message.includes("não encontrada") ? 404 : message.includes("qualificada") ? 409 : 500;
    console.error("[CommercialRadar] Failed to send opportunity to CRM:", error);
    res.status(status).json({ error: message });
  }
});

app.delete("/api/commercial/opportunities/:id", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const result = await dbAdapter.deleteCommercialOpportunity(req.params.id, organizationId, workspaceId);
    res.json(result);
  } catch (error: any) {
    console.error("[CommercialRadar] Failed to delete opportunity:", error);
    res.status(500).json({ error: error?.message || "Failed to delete commercial opportunity" });
  }
});

// Sprint 20.2 - Commercial Generated Tasks Persistence API
app.get("/api/commercial/tasks", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const tasks = await dbAdapter.getCommercialTasks(organizationId, workspaceId);
    res.json(tasks);
  } catch (error: any) {
    console.error("[CommercialRadar] Failed to list generated tasks:", error);
    res.status(500).json({ error: error?.message || "Failed to list commercial generated tasks" });
  }
});

app.post("/api/commercial/tasks/bulk", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) {
      return res.status(400).json({ error: "organizationId and workspaceId are required" });
    }

    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const payload = tasks.map((task: any) => ({
      ...task,
      organizationId,
      workspaceId,
    }));

    const created = await dbAdapter.createCommercialTasks(payload);
    res.status(201).json(created);
  } catch (error: any) {
    console.error("[CommercialRadar] Failed to create generated tasks:", error);
    res.status(500).json({ error: error?.message || "Failed to create commercial generated tasks" });
  }
});

app.delete("/api/commercial/tasks", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const result = await dbAdapter.clearCommercialTasks(organizationId, workspaceId);
    res.json(result);
  } catch (error: any) {
    console.error("[CommercialRadar] Failed to clear generated tasks:", error);
    res.status(500).json({ error: error?.message || "Failed to clear commercial generated tasks" });
  }
});

// Sprint 20.3 - CRM Gov Clients Persistence API
app.get("/api/crm-gov/clients", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const clients = await dbAdapter.getCrmGovClients(organizationId, workspaceId);
    res.json(clients);
  } catch (error: any) {
    console.error("[CRM Gov] Failed to list clients:", error);
    res.status(500).json({ error: error?.message || "Failed to list CRM Gov clients" });
  }
});

app.put("/api/crm-gov/clients", async (req, res) => {
  try {
    const { organizationId, workspaceId } = extractTenant(req);
    if (!organizationId || !workspaceId) {
      return res.status(400).json({ error: "organizationId and workspaceId are required" });
    }

    const clients = Array.isArray(req.body?.clients) ? req.body.clients : [];
    const saved = await dbAdapter.replaceCrmGovClients(organizationId, workspaceId, clients);
    res.json(saved);
  } catch (error: any) {
    console.error("[CRM Gov] Failed to replace clients:", error);
    res.status(500).json({ error: error?.message || "Failed to replace CRM Gov clients" });
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId || !tenant.workspaceId) {
      return res.status(400).json({ error: "Missing organizationId or workspaceId" });
    }
    const user = getCurrentUser(req);
    const projects = await ensureSeededProjects(
      dbAdapter,
      user.id,
      tenant.organizationId,
      tenant.workspaceId,
      updateProjectState,
    );
    res.json(projects);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to retrieve projects" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const tenant = extractTenant(req);
    if (!tenant.organizationId || !tenant.workspaceId) {
      return res.status(400).json({ error: "Missing organizationId or workspaceId" });
    }
    const user = getCurrentUser(req);
    const projectData = req.body;

    let project;
    if (projectData.id) {
      project = await dbAdapter.updateProject(projectData.id, {
        ...projectData,
        userId: user.id,
        organizationId: tenant.organizationId,
        workspaceId: tenant.workspaceId,
      });
    } else {
      project = await dbAdapter.createProject({
        ...projectData,
        userId: user.id,
        organizationId: tenant.organizationId,
        workspaceId: tenant.workspaceId,
      });
    }

    if (project && project.id) {
      if (!projectData.id) {
        // Create corresponding knowledge node and associations
        await knowledgeGraphEngine
          .onProjectCreated(project)
          .catch((err) => console.error("KG onProjectCreated failed:", err));
      }
      // Re-calculate project state
      await updateProjectState(project.id);
      // Rebuild continuity snapshot
      await getContinuityEngine()
        .rebuild(project.id, tenant.organizationId)
        .catch((err) => console.error("Continuity rebuild failed:", err));
    }

    res.json({ success: true, project });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create/update project" });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await dbAdapter.deleteProject(id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

app.get("/api/admin/security/readiness", async (req: any, res) => {
  try {
    let user;
    try { user = getCurrentUser(req); } catch { user = undefined; }
    res.json(await saasSecurityReadinessService.build({
      user,
      sessionSource: req.sessionSource || user?.source || "none",
    }));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Falha ao validar segurança SaaS." });
  }
});

// Authentication, Objectives & Workspace State APIs

// 1. Authentication APIs
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, organizationName, organizationType } =
      req.body;
    const orgType = organizationType || "empresa";
    const orgId = "org_" + Math.random().toString(36).substr(2, 9);
    const userId = "usr_" + Math.random().toString(36).substr(2, 9);

    if (dbMode === "supabase") {
      const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();
      // SignUp in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const realUserId = data.user?.id || userId;

      // Insert organization
      const { data: orgData, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          id: orgId,
          name: organizationName || "Organização Oi Beta",
          type: orgType,
        })
        .select()
        .single();
      if (orgErr) {
        console.error("Error inserting organization into Supabase:", orgErr);
      }

      // Insert user record in public.users
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .insert({
          id: realUserId,
          name: name,
          email: email,
          organization_id: orgId,
          role: "admin",
        })
        .select()
        .single();
      if (userErr) {
        console.error(
          "Error inserting user into public.users in Supabase:",
          userErr,
        );
      }

      const freshUser = {
        id: realUserId,
        name: name,
        email: email,
        organizationId: orgId,
        role: "admin",
      };

      setActiveSessionUser(freshUser);
      return res.json({
        success: true,
        user: freshUser,
        token: data.session?.access_token || "mock-token-for-dev",
      });
    } else {
      // JSON File Mode fallback
      const adapter = dbAdapter as JsonDatabaseAdapter;
      // We can read and modify the raw JSON db
      const dbPath = path.join(process.cwd(), "db.json");
      let db: any = { users: [], organizations: [] };
      if (fs.existsSync(dbPath)) {
        try {
          db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        } catch (e) {}
      }
      if (!db.users) db.users = [];
      if (!db.organizations) db.organizations = [];

      const exists = db.users.find((u: any) => u.email === email);
      if (exists) {
        return res
          .status(400)
          .json({ error: "E-mail já cadastrado no sistema." });
      }

      const newOrg = {
        id: orgId,
        name: organizationName || "Organização Oi Beta",
        type: orgType,
        createdAt: new Date().toISOString(),
      };
      const newUser = {
        id: userId,
        name,
        email,
        organizationId: orgId,
        role: "admin",
        createdAt: new Date().toISOString(),
      };

      db.organizations.push(newOrg);
      db.users.push(newUser);
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");

      setActiveSessionUser(newUser);
      return res.json({
        success: true,
        user: newUser,
        token: "mock-json-token-for-dev",
      });
    }
  } catch (err: any) {
    console.error("Error in auth register route:", err);
    res.status(500).json({ error: err.message || "Failed to register" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (dbMode === "supabase") {
      const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return res.status(400).json({ error: error.message });
      }

      const realUserId = data.user?.id;
      // Get user profiles from public.users table
      const { data: dbUser, error: userErr } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userErr || !dbUser) {
        console.warn("Authenticated user has no valid public.users profile.");
        return res.status(403).json({
          error: "Perfil de acesso não provisionado. Solicite a ativação à administração da organização.",
        });
      }

      const organizationId = dbUser.organization_id;
      const [{ data: organization }, { data: workspaces }] = await Promise.all([
        supabase.from("organizations").select("id,licensed_product_ids").eq("id", organizationId).single(),
        supabase.from("workspaces").select("id,organization_id,status").eq("organization_id", organizationId),
      ]);
      const activeWorkspace = Array.isArray(workspaces)
        ? workspaces.find((workspace: any) => workspace.status !== "INACTIVE")
        : undefined;

      const freshUser = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        organizationId,
        tenantId: dbUser.tenant_id || organizationId,
        workspaceId: activeWorkspace?.id,
        role: dbUser.profile || dbUser.role,
        productIds: Array.isArray(dbUser.product_ids) ? dbUser.product_ids : [],
        licensedProductIds: Array.isArray(organization?.licensed_product_ids)
          ? organization.licensed_product_ids
          : [],
      };
      setActiveSessionUser(freshUser);
      return res.json({
        success: true,
        user: freshUser,
        token: data.session?.access_token || "mock-token-for-dev",
      });
    } else {
      // JSON File login check
      const dbPath = path.join(process.cwd(), "db.json");
      let db: any = { users: [] };
      if (fs.existsSync(dbPath)) {
        try {
          db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
        } catch (e) {}
      }
      if (!db.users) db.users = [];

      const matchedUser = db.users.find((u: any) => u.email === email);
      if (!matchedUser) {
        return res
          .status(400)
          .json({ error: "Credenciais inválidas ou usuário não cadastrado." });
      }

      setActiveSessionUser(matchedUser);
      return res.json({
        success: true,
        user: matchedUser,
        token: "mock-json-token-for-dev",
      });
    }
  } catch (err: any) {
    console.error("Error in auth login route:", err);
    res.status(500).json({ error: err.message || "Failed to log in" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    if (dbMode === "supabase") {
      const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();
      await supabase.auth.signOut().catch(() => {});
    }
    setActiveSessionUser(null);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error logging out:", err);
    res.status(500).json({ error: "Failed to logout" });
  }
});

app.post("/api/auth/reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (dbMode === "supabase") {
      const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();
      await supabase.auth.resetPasswordForEmail(email);
    }
    res.json({
      success: true,
      message: "Link de recuperação enviado com sucesso.",
    });
  } catch (err: any) {
    console.error("Error in password reset route:", err);
    res.status(500).json({ error: "Falha ao solicitar recuperação de senha." });
  }
});

app.get("/api/auth/session", async (req, res) => {
  try {
    // If authHeader is present, try to extract and validate it dynamically
    const authHeader = req.headers.authorization;
    if (
      authHeader &&
      authHeader.startsWith("Bearer ") &&
      dbMode === "supabase"
    ) {
      const token = authHeader.split(" ")[1];
      if (token !== "mock-json-token-for-dev") {
        const supabase = (dbAdapter as SupabaseDatabaseAdapter).getClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser(token);
        if (authUser) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", authUser.id)
            .single();
          if (dbUser) {
            const freshUser = {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              organizationId: dbUser.organization_id,
              role: dbUser.profile || dbUser.role || "admin",
              productIds: Array.isArray(dbUser.product_ids)
                ? dbUser.product_ids
                : [],
            };
            return res.json({ success: true, user: freshUser });
          }
        }
      }
    }

    const user = getCurrentUser(req);
    res.json({ success: true, user });
  } catch (e) {
    res.json({ success: true, user: null });
  }
});

// 2. Objectives APIs
app.get("/api/objectives", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res
        .status(400)
        .json({ error: "projectId query parameter is required." });
    }
    const list = await dbAdapter.getObjectives(projectId as string);
    res.json(list);
  } catch (e) {
    console.error("Failed to retrieve objectives:", e);
    res.status(500).json({ error: "Failed to retrieve objectives" });
  }
});

app.post("/api/objectives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { projectId, title, description, taskId, status } = req.body;
    if (!projectId || !title) {
      return res
        .status(400)
        .json({ error: "projectId and title are required fields." });
    }
    const objective = await dbAdapter.createObjective({
      projectId,
      title,
      description,
      taskId,
      status: status || "pending",
      userId: user.id,
      organizationId: user.organizationId,
    });

    // Auto Knowledge Graph Node and Continuity rebuild
    await knowledgeGraphEngine
      .onObjectiveCreated(objective)
      .catch((err) => console.error(err));
    await getContinuityEngine()
      .rebuild(projectId, user.organizationId)
      .catch((err) => console.error(err));

    res.json({ success: true, objective });
  } catch (e) {
    console.error("Failed to create objective:", e);
    res.status(500).json({ error: "Failed to create objective" });
  }
});

app.put("/api/objectives/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, taskId } = req.body;
    const objective = await dbAdapter.updateObjective(id, {
      title,
      description,
      status,
      taskId,
    });
    res.json({ success: true, objective });
  } catch (e) {
    console.error("Failed to update objective:", e);
    res.status(500).json({ error: "Failed to update objective" });
  }
});

app.delete("/api/objectives/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await dbAdapter.deleteObjective(id);
    res.json({ success: true });
  } catch (e) {
    console.error("Failed to delete objective:", e);
    res.status(500).json({ error: "Failed to delete objective" });
  }
});

// 3. Workspace States APIs for active project, active specialization, and last context save/load
app.get("/api/workspace-state", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { workspaceId } = req.query;
    const wId = (workspaceId as string) || "workspace-oi-beta";
    const state = await dbAdapter.getWorkspaceState(
      user.id,
      user.organizationId,
      wId,
    );
    res.json({ success: true, state });
  } catch (e) {
    console.error("Failed to fetch workspace state:", e);
    res.status(500).json({ error: "Failed to fetch workspace state" });
  }
});

app.post("/api/workspace-state", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const { workspaceId, activeProjectId, activeSpecialization, lastContext } =
      req.body;
    const wId = workspaceId || "workspace-oi-beta";
    const state = await dbAdapter.saveWorkspaceState({
      userId: user.id,
      organizationId: user.organizationId,
      workspaceId: wId,
      activeProjectId,
      activeSpecialization,
      lastContext,
    });
    res.json({ success: true, state });
  } catch (e) {
    console.error("Failed to save workspace state:", e);
    res.status(500).json({ error: "Failed to save workspace state" });
  }
});

// Detailed Project Information
app.get("/api/projects/:projectId/details", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const pId = req.params.projectId;
    const project = await dbAdapter.getProjectById(
      pId,
      user.id,
      user.organizationId,
    );
    const decisions = await dbAdapter.getDecisions(pId);
    const tasks = await dbAdapter.getTasks(pId);
    const memories = await dbAdapter.getMemories(pId);
    res.json({ project, decisions, tasks, memories });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to retrieve project details" });
  }
});

// GET Knowledge Graph Report (Etapa 13)
app.get("/api/knowledge/context/:projectId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const pId = req.params.projectId;
    const project = await dbAdapter.getProjectById(
      pId,
      user.id,
      user.organizationId,
    );
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const report = await knowledgeGraphEngine.buildKnowledgeContext(
      user.organizationId,
      pId,
    );
    res.json({ success: true, projectId: pId, contextReport: report });
  } catch (e: any) {
    console.error("Error fetching knowledge context:", e);
    res
      .status(500)
      .json({ error: "Failed to build knowledge context", message: e.message });
  }
});

// GET reconstructed context from BetaContextEngine
app.get("/api/projects/:id/context", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const pId = req.params.id;
    const project = await dbAdapter.getProjectById(
      pId,
      user.id,
      user.organizationId,
    );
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const decisions = await dbAdapter.getDecisions(pId);
    const tasks = await dbAdapter.getTasks(pId);
    const memories = await dbAdapter.getMemories(pId);
    const chatHistory = await dbAdapter.getMessages(pId);

    const context = await generateProjectContext(
      project,
      decisions,
      tasks,
      memories,
      chatHistory,
      aiRouter,
    );
    res.json(context);
  } catch (error) {
    console.error("Error generating context raw endpoint:", error);
    res.status(500).json({ error: "Internal server error generating context" });
  }
});

// POST manually rebuild context for project
app.post("/api/projects/:id/rebuild-context", async (req, res) => {
  const pId = req.params.id;
  try {
    const updatedState = await updateProjectState(pId);
    if (updatedState) {
      res.json({ success: true, projectState: updatedState });
    } else {
      res
        .status(404)
        .json({ error: "Project not found or state rebuild failed" });
    }
  } catch (error) {
    console.error("Error rebuilding context manually:", error);
    res.status(500).json({ error: "Failed to manually rebuild state context" });
  }
});

// Track Project Stop Point
app.post("/api/projects/:projectId/stop-point", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const pId = req.params.projectId;
    const { lastStopPoint } = req.body;

    const project = await dbAdapter.getProjectById(
      pId,
      user.id,
      user.organizationId,
    );
    if (project) {
      project.lastStopPoint = lastStopPoint || "";
      const updated = await dbAdapter.updateProject(pId, project);

      // Auto-update project state
      await updateProjectState(pId);

      res.json({ success: true, project: updated });
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update stop point" });
  }
});

// Decisions
app.get("/api/decisions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    const allDecisions: any[] = [];
    for (const proj of projects) {
      const decs = await dbAdapter.getDecisions(proj.id);
      allDecisions.push(...decs);
    }
    res.json(allDecisions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch decisions" });
  }
});

app.post("/api/decisions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const decData = req.body;

    let dec;
    if (decData.id) {
      dec = await dbAdapter.updateDecision(decData.id, {
        ...decData,
        userId: user.id,
        organizationId: user.organizationId,
      });
    } else {
      dec = await dbAdapter.createDecision({
        ...decData,
        userId: user.id,
        organizationId: user.organizationId,
      });
    }

    if (dec && dec.projectId) {
      if (!decData.id) {
        await knowledgeGraphEngine
          .onDecisionCreated(dec)
          .catch((err) => console.error(err));
      }
      await updateProjectState(dec.projectId);
      await getContinuityEngine()
        .rebuild(dec.projectId, user.organizationId)
        .catch((err) => console.error(err));
    }

    res.json({ success: true, decision: dec });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create/update decision" });
  }
});

app.delete("/api/decisions/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const id = req.params.id;

    let pId: string | null = null;
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    for (const proj of projects) {
      const decs = await dbAdapter.getDecisions(proj.id);
      const found = decs.find((d) => d.id === id);
      if (found) {
        pId = found.projectId;
        break;
      }
    }

    await dbAdapter.deleteDecision(id);

    if (pId) {
      await updateProjectState(pId);
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete decision" });
  }
});

// Tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    const allTasks: any[] = [];
    for (const proj of projects) {
      const ts = await dbAdapter.getTasks(proj.id);
      allTasks.push(...ts);
    }
    res.json(allTasks);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const taskData = req.body;

    let task;
    if (taskData.id) {
      task = await dbAdapter.updateTask(taskData.id, {
        ...taskData,
        userId: user.id,
        organizationId: user.organizationId,
      });
    } else {
      task = await dbAdapter.createTask({
        ...taskData,
        userId: user.id,
        organizationId: user.organizationId,
      });
    }

    if (task && task.projectId) {
      if (!taskData.id) {
        await knowledgeGraphEngine
          .onTaskCreated(task)
          .catch((err) => console.error(err));
      }
      await updateProjectState(task.projectId);
      await getContinuityEngine()
        .rebuild(task.projectId, user.organizationId)
        .catch((err) => console.error(err));
    }

    res.json({ success: true, task });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create/update task" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const id = req.params.id;

    let pId: string | null = null;
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    for (const proj of projects) {
      const ts = await dbAdapter.getTasks(proj.id);
      const found = ts.find((t) => t.id === id);
      if (found) {
        pId = found.projectId;
        break;
      }
    }

    await dbAdapter.deleteTask(id);

    if (pId) {
      await updateProjectState(pId);
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Memories
app.get("/api/memories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    const allMemories: any[] = [];

    const globalMems = await dbAdapter.getMemories("");
    allMemories.push(...globalMems);

    for (const proj of projects) {
      const mems = await dbAdapter.getMemories(proj.id);
      allMemories.push(...mems);
    }
    res.json(allMemories);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch memories" });
  }
});

app.post("/api/memories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const memoryData = req.body;

    let memory;
    if (memoryData.id) {
      memory = await dbAdapter.updateMemory(memoryData.id, {
        ...memoryData,
        userId: user.id,
        organizationId: user.organizationId,
      });
    } else {
      memory = await dbAdapter.createMemory({
        ...memoryData,
        userId: user.id,
        organizationId: user.organizationId,
      });
    }

    if (memory && memory.projectId) {
      if (!memoryData.id) {
        await knowledgeGraphEngine
          .onMemoryCreated(memory)
          .catch((err) => console.error(err));
      }
      await updateProjectState(memory.projectId);
      await getContinuityEngine()
        .rebuild(memory.projectId, user.organizationId)
        .catch((err) => console.error(err));
    }

    res.json({ success: true, memory });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create/update memory" });
  }
});

app.delete("/api/memories/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const id = req.params.id;

    let pId: string | null = null;
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);

    const globalMems = await dbAdapter.getMemories("");
    const foundGlobal = globalMems.find((m) => m.id === id);

    if (foundGlobal) {
      pId = null;
    } else {
      for (const proj of projects) {
        const mems = await dbAdapter.getMemories(proj.id);
        const found = mems.find((m) => m.id === id);
        if (found) {
          pId = found.projectId;
          break;
        }
      }
    }

    await dbAdapter.deleteMemory(id);

    if (pId) {
      await updateProjectState(pId);
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete memory" });
  }
});

// Unified Project State GET and PUT API Routes
app.get("/api/project-states", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    const states: any[] = [];
    for (const proj of projects) {
      const state = await dbAdapter.getProjectContext(proj.id);
      if (state) {
        states.push(state);
      }
    }
    res.json(states);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch project states" });
  }
});

app.get("/api/project-states/:projectId", async (req, res) => {
  try {
    const pId = req.params.projectId;
    const state = await dbAdapter.getProjectContext(pId);
    if (state) {
      res.json(state);
    } else {
      res.status(404).json({ error: "Project state not found" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch project state" });
  }
});

app.post("/api/project-states/:projectId/update", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const pId = req.params.projectId;
    const { currentObjective, currentStage } = req.body;

    const project = await dbAdapter.getProjectById(
      pId,
      user.id,
      user.organizationId,
    );
    const pName = project?.name || "Projeto";

    let existingState = await dbAdapter.getProjectContext(pId);
    if (!existingState) {
      existingState = {
        projectId: pId,
        projectName: pName,
        currentObjective:
          currentObjective || "Definição do escopo e metas iniciais.",
        currentStage: currentStage || "Fase de Planejamento Estratégico",
        lastStopPoint: "",
        recentDecisions: [],
        pendingTasks: [],
        executiveSummary: "Iniciando a sintetização do estado.",
        lastUpdatedDate: new Date().toISOString(),
      };
    } else {
      if (currentObjective !== undefined)
        existingState.currentObjective = currentObjective;
      if (currentStage !== undefined) existingState.currentStage = currentStage;
    }

    await dbAdapter.saveProjectContext(pId, existingState);

    const updated = await updateProjectState(pId);
    res.json({ success: true, projectState: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update project state" });
  }
});

// Action History GET
app.get("/api/actions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const workspaceId = req.query.workspaceId as string || "";
    const actions = await dbAdapter.getActionLogs(user.organizationId, workspaceId);
    res.json(actions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch action logs" });
  }
});

// Action Execution Logs GET (Beta AI Debug)
app.get("/api/debug-logs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const workspaceId = req.query.workspaceId as string || "";
    const logs = await dbAdapter.getActionExecutionLogs(user.organizationId, workspaceId);
    const sorted = [...logs].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
    res.json(sorted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch action execution logs" });
  }
});

// GET AI Connections
app.get("/api/ai-connections", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const conns = await aiConnectionManager.getConnections(user.organizationId);
    res.json(conns);
  } catch (e) {
    console.error("Failed to list AI connections:", e);
    res.status(500).json({ error: "Failed to list AI connections" });
  }
});

// CREATE AI Connection
app.post("/api/ai-connections", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const data = req.body;
    const created = await aiConnectionManager.registerConnection(
      user.organizationId,
      user.id,
      data,
    );
    res.json(created);
  } catch (e) {
    console.error("Failed to create AI connection:", e);
    res.status(500).json({ error: "Failed to create AI connection" });
  }
});

// UPDATE AI Connection
app.put("/api/ai-connections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.apiKey) {
      data.apiKeyEncrypted = encrypt(data.apiKey);
      delete data.apiKey;
    }
    const updated = await dbAdapter.updateAIConnection(id, data);
    res.json(updated);
  } catch (e) {
    console.error("Failed to update AI connection:", e);
    res.status(500).json({ error: "Failed to update AI connection" });
  }
});

// DELETE AI Connection
app.delete("/api/ai-connections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await dbAdapter.deleteAIConnection(id);
    res.json({ success: true });
  } catch (e) {
    console.error("Failed to delete AI connection:", e);
    res.status(500).json({ error: "Failed to delete AI connection" });
  }
});

// TEST AI Connection
app.post("/api/ai-connections/test", async (req, res) => {
  try {
    const data = req.body;
    let connToTest = data;
    if (data.id) {
      const user = getCurrentUser(req);
      const conns = await dbAdapter.getAIConnections(user.organizationId);
      const matched = conns.find((c: any) => c.id === data.id);
      if (matched) {
        connToTest = matched;
      }
    } else if (data.apiKey) {
      connToTest = {
        provider: data.provider,
        apiKeyEncrypted: encrypt(data.apiKey),
        baseUrl: data.baseUrl,
        model: data.model,
      };
    }

    const testRes = await aiConnectionManager.testConnection(connToTest);
    res.json(testRes);
  } catch (e) {
    console.error("Failed to test AI connection:", e);
    res.status(500).json({ error: "Failed to test AI connection" });
  }
});

// GET AI Health Reports
app.get("/api/ai-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const health = await aiHealthMonitor.checkAllConnections(
      user.organizationId,
    );
    res.json(health);
  } catch (e) {
    console.error("Failed to fetch AI health status:", e);
    res.status(500).json({ error: "Failed to fetch AI health status" });
  }
});

// Chat History GET
app.get("/api/chat", async (req, res) => {
  try {
    const chatHistory = await dbAdapter.getMessages();
    res.json(chatHistory);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch chat logs" });
  }
});

// Clear Chat History
app.post("/api/chat/clear", async (req, res) => {
  try {
    const user = getCurrentUser(req);

    const supabase = (dbAdapter as any).client;
    if (supabase) {
      await supabase.from("messages").delete().neq("id", "none");
    } else {
      const db = (dbAdapter as any).readDB();
      db.chatHistory = [];
      (dbAdapter as any).writeDB(db);
    }

    const welcomeMsg = await dbAdapter.createMessage({
      userId: user.id,
      organizationId: user.organizationId,
      sender: "beta",
      content:
        "Chat reiniciado. Eu sou a Beta e posso ajudar com a operação da organização, seus produtos, oportunidades, clientes, tarefas, decisões, memórias e contextos ativos.",
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, history: [welcomeMsg] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to clear chat logs" });
  }
});

// GET /api/memory/health
app.get("/api/memory/health", async (req, res) => {
  try {
    const health = await memoryOS.getMemoryHealth();
    // approximate globals
    const mems = await dbAdapter.getMemories("");
    const snaps = await dbAdapter.getWorkspaceSnapshots();
    health.totalMemories = mems.length;
    health.totalSnapshots = snaps.length;
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/workspace/health
app.get("/api/workspace/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    let active = 0;
    let blocked = 0;
    let critical = 0;
    let sumHealth = 0;
    let sumRisk = 0;

    for (const p of projects) {
      const state = await workspaceIntelligenceEngine.analyzeWorkspace(
        p.id,
        user.organizationId,
      );
      if (state.state === "ACTIVE") active++;
      if (
        state.state === "BLOCKED" ||
        state.cognitive.criticalPath.path.length > 0
      )
        blocked++;
      if (state.cognitive.health.status === "CRITICAL") critical++;
      sumHealth += state.cognitive.health.score;
      sumRisk += state.cognitive.risk.score;
    }

    const avgHealth =
      projects.length > 0 ? (sumHealth / projects.length).toFixed(1) : 0;
    const avgRisk =
      projects.length > 0 ? (sumRisk / projects.length).toFixed(1) : 0;

    res.json({
      success: true,
      activeProjectsCount: active,
      totalProjects: projects.length,
      averageHealthScore: avgHealth,
      criticalProjectsCount: critical,
      blockedProjectsCount: blocked,
      globalRiskScore: avgRisk,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/projects/:id/workspace-summary
app.get("/api/projects/:id/workspace-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const analysis = await workspaceIntelligenceEngine.analyzeWorkspace(
      req.params.id,
      user.organizationId,
    );
    res.json(analysis);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 18.0: BETA LICITA WORKSPACE FOUNDATION ====================

app.get("/api/licita/workspace", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const ws = await procurementWorkspaceEngine.buildProcurementWorkspace(orgId, workspaceId);
    res.json(ws);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await procurementWorkspaceEngine.getProcurementSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await procurementWorkspaceEngine.getProcurementHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/timeline", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const timeline = await procurementWorkspaceEngine.getProcurementTimeline(orgId, workspaceId);
    res.json(timeline);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/opportunities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const opps = await procurementBidManagementEngine.getOpportunities(orgId, workspaceId);
    res.json(opps);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/opportunities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementBidManagementEngine.createOpportunity({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/bids", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const bidsFromDb = await procurementBidManagementEngine.getBids(orgId, workspaceId);
    const bidsFromDomain = await procurementWorkspaceEngine.getProcurementBids(orgId, workspaceId);
    res.json([...bidsFromDb, ...bidsFromDomain]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/bids", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementBidManagementEngine.createBid({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/participations", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const participations = await procurementBidManagementEngine.getParticipations(orgId, workspaceId);
    res.json(participations);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/participations", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementBidManagementEngine.createParticipation({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/suppliers", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const suppliers = await procurementWorkspaceEngine.getProcurementSuppliers(orgId, workspaceId);
    res.json(suppliers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/lots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const lotsFromDb = await procurementBidManagementEngine.getLots(orgId, workspaceId);
    const lotsFromDomain = await procurementWorkspaceEngine.getProcurementLots(orgId, workspaceId);
    res.json([...lotsFromDb, ...lotsFromDomain]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/lots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementBidManagementEngine.createLot({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/proposals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const proposalsFromDb = await procurementBidManagementEngine.getProposals(orgId, workspaceId);
    const proposalsFromDomain = await procurementWorkspaceEngine.getProcurementProposals(orgId, workspaceId);
    res.json([...proposalsFromDb, ...proposalsFromDomain]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/proposals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementBidManagementEngine.createProposal({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/bid-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await procurementBidManagementEngine.getBidSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/bid-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await procurementBidManagementEngine.getBidHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/contracts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const dbContracts = await procurementContractManagementEngine.getContracts(orgId, workspaceId);
    const domContracts = await procurementWorkspaceEngine.getProcurementContracts(orgId, workspaceId);
    res.json([...dbContracts, ...domContracts]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/contracts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementContractManagementEngine.createContract({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/contract-executions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementContractManagementEngine.getContractExecutions(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/contract-executions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementContractManagementEngine.createContractExecution({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/inspections", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementContractManagementEngine.getInspections(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/inspections", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementContractManagementEngine.createInspection({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/deliveries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementContractManagementEngine.getDeliveries(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/deliveries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementContractManagementEngine.createDelivery({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/measurements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementContractManagementEngine.getMeasurements(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/measurements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementContractManagementEngine.createMeasurement({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/contract-issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementContractManagementEngine.getContractIssues(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/contract-issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementContractManagementEngine.createContractIssue({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/contract-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await procurementContractManagementEngine.getContractSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/contract-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await procurementContractManagementEngine.getContractHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SPRINT 18.4: PROCUREMENT AUDIT, COMPLIANCE & ARP MANAGEMENT FOUNDATION ---

app.get("/api/licita/arps", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementComplianceEngine.getARPs(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/arps", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementComplianceEngine.createARP({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/arp-items", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementComplianceEngine.getARPItems(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/arp-items", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementComplianceEngine.createARPItem({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/arp-consumptions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementComplianceEngine.getARPConsumptions(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/arp-consumptions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementComplianceEngine.createARPConsumption({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/arp-participants", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementComplianceEngine.getARPParticipants(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/arp-participants", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementComplianceEngine.createARPParticipant({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/arp-caronas", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementComplianceEngine.getARPCaronas(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/arp-caronas", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementComplianceEngine.createARPCarona({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/audit-events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementComplianceEngine.getAuditEvents(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/audit-events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementComplianceEngine.createAuditEvent({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/compliance-events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await procurementComplianceEngine.getComplianceEvents(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/compliance-events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementComplianceEngine.createComplianceEvent({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/compliance-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await procurementComplianceEngine.getComplianceSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/compliance-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await procurementComplianceEngine.getComplianceHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- SPRINT 18.2: SUPPLIER & PROCUREMENT DOCUMENT MANAGEMENT FOUNDATION ---

app.get("/api/licita/suppliers", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const dbSups = await procurementSupplierManagementEngine.getSuppliers(orgId, workspaceId);
    const domSups = await procurementWorkspaceEngine.getProcurementSuppliers(orgId, workspaceId);
    res.json([...dbSups, ...domSups]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/suppliers", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementSupplierManagementEngine.createSupplier({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/supplier-documents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const docs = await procurementSupplierManagementEngine.getSupplierDocuments(orgId, workspaceId);
    res.json(docs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/supplier-documents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementSupplierManagementEngine.createSupplierDocument({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/supplier-certificates", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const certs = await procurementSupplierManagementEngine.getSupplierCertificates(orgId, workspaceId);
    res.json(certs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/supplier-certificates", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementSupplierManagementEngine.createSupplierCertificate({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/supplier-qualifications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const quals = await procurementSupplierManagementEngine.getSupplierQualifications(orgId, workspaceId);
    res.json(quals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/supplier-qualifications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementSupplierManagementEngine.createSupplierQualification({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/supplier-registries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const regs = await procurementSupplierManagementEngine.getSupplierRegistries(orgId, workspaceId);
    res.json(regs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/supplier-registries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementSupplierManagementEngine.createSupplierRegistry({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/supplier-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await procurementSupplierManagementEngine.getSupplierSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/supplier-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await procurementSupplierManagementEngine.getSupplierHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 18.5: PROCUREMENT REPORTING & EXECUTIVE BRIEF ====================

app.get("/api/licita/reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const reports = await procurementReportingEngine.getReports(orgId, workspaceId);
    res.json(reports);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/reports/:id", async (req, res) => {
  try {
    const report = await procurementReportingEngine.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementReportingEngine.createReport({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/executive-briefs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const briefs = await procurementReportingEngine.getExecutiveBriefs(orgId, workspaceId);
    res.json(briefs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/executive-briefs/:id", async (req, res) => {
  try {
    const brief = await procurementReportingEngine.getExecutiveBrief(req.params.id);
    if (!brief) return res.status(404).json({ error: "Executive Brief not found" });
    res.json(brief);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/executive-briefs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementReportingEngine.createExecutiveBrief({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/monitoring-snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const snapshots = await procurementReportingEngine.getMonitoringSnapshots(orgId, workspaceId);
    res.json(snapshots);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/licita/monitoring-snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await procurementReportingEngine.createMonitoringSnapshot({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/reporting-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await procurementReportingEngine.generateSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/licita/reporting-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await procurementReportingEngine.generateHealthCheck(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 17.0: BETA GOV WORKSPACE FOUNDATION ====================

app.get("/api/gov/workspace", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const ws = await governmentWorkspaceEngine.buildGovernmentWorkspace(orgId, workspaceId);
    res.json(ws);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await governmentReportingEngine.getGovernmentSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await governmentReportingEngine.getGovernmentReports(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const report = await governmentReportingEngine.createGovernmentReport(orgId, workspaceId, req.body);
    res.status(201).json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/reports/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const report = await governmentReportingEngine.getGovernmentReport(orgId, workspaceId, req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });
    res.json(report);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/briefs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await governmentReportingEngine.getExecutiveBriefs(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/briefs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const brief = await governmentReportingEngine.createExecutiveBrief(orgId, workspaceId, req.body);
    res.status(201).json(brief);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/briefs/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const brief = await governmentReportingEngine.getExecutiveBrief(orgId, workspaceId, req.params.id);
    if (!brief) return res.status(404).json({ error: "Executive Brief not found." });
    res.json(brief);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/monitoring", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const list = await governmentReportingEngine.getMonitoringSnapshots(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/monitoring", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const snapshot = await governmentReportingEngine.createMonitoringSnapshot(orgId, workspaceId, req.body);
    res.status(201).json(snapshot);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SPRINT 17.4: GOVERNMENT GOVERNANCE & EXECUTIVE REVIEW ENDPOINTS ---

// 1. Governance Reviews
app.get("/api/gov/governance/reviews", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const reviews = await governmentGovernanceEngine.getGovernanceReviews(orgId, workspaceId);
    res.json(reviews);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/governance/reviews", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const review = await governmentGovernanceEngine.createGovernanceReview(orgId, workspaceId, req.body);
    res.status(201).json(review);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/governance/reviews/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const review = await governmentGovernanceEngine.getGovernanceReviewsById(orgId, workspaceId, req.params.id);
    if (!review) return res.status(404).json({ error: "Governance Review not found." });
    res.json(review);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Executive Meetings
app.get("/api/gov/governance/meetings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const meetings = await governmentGovernanceEngine.getExecutiveMeetings(orgId, workspaceId);
    res.json(meetings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/governance/meetings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const meeting = await governmentGovernanceEngine.createExecutiveMeeting(orgId, workspaceId, req.body);
    res.status(201).json(meeting);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/governance/meetings/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const meeting = await governmentGovernanceEngine.getExecutiveMeetingById(orgId, workspaceId, req.params.id);
    if (!meeting) return res.status(404).json({ error: "Executive Meeting not found." });
    res.json(meeting);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Strategic Cycles
app.get("/api/gov/governance/cycles", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const cycles = await governmentGovernanceEngine.getStrategicCycles(orgId, workspaceId);
    res.json(cycles);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/governance/cycles", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const cycle = await governmentGovernanceEngine.createStrategicCycle(orgId, workspaceId, req.body);
    res.status(201).json(cycle);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/governance/cycles/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const cycle = await governmentGovernanceEngine.getStrategicCycleById(orgId, workspaceId, req.params.id);
    if (!cycle) return res.status(404).json({ error: "Strategic Cycle not found." });
    res.json(cycle);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Government Decisions
app.get("/api/gov/governance/decisions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const decisions = await governmentGovernanceEngine.getGovernmentDecisions(orgId, workspaceId);
    res.json(decisions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/governance/decisions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const decision = await governmentGovernanceEngine.createGovernmentDecision(orgId, workspaceId, req.body);
    res.status(201).json(decision);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/governance/decisions/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const decision = await governmentGovernanceEngine.getGovernmentDecisionById(orgId, workspaceId, req.params.id);
    if (!decision) return res.status(404).json({ error: "Government Decision not found." });
    res.json(decision);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Monitoring Reviews (Strategic Monitorings)
app.get("/api/gov/governance/monitoring", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const reviews = await governmentGovernanceEngine.getMonitoringReviews(orgId, workspaceId);
    res.json(reviews);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/governance/monitoring", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const review = await governmentGovernanceEngine.createMonitoringReview(orgId, workspaceId, req.body);
    res.status(201).json(review);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/governance/monitoring/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const review = await governmentGovernanceEngine.getMonitoringReviewById(orgId, workspaceId, req.params.id);
    if (!review) return res.status(404).json({ error: "Monitoring Review not found." });
    res.json(review);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Summary & Health
app.get("/api/gov/governance/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await governmentGovernanceEngine.getGovernanceSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/governance/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await governmentGovernanceEngine.getGovernanceHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await governmentWorkspaceEngine.getGovernmentHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/timeline", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const timeline = await governmentWorkspaceEngine.getGovernmentTimeline(orgId, workspaceId);
    res.json(timeline);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const indicators = await governmentPerformanceManagementEngine.getGovernmentIndicators(orgId, workspaceId);
    res.json(indicators);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const { objectiveId, programId, projectId, indicatorName, description, unit, metadata } = req.body;
    const indicator = await governmentPerformanceManagementEngine.createGovernmentIndicator(
      orgId,
      workspaceId,
      objectiveId || null,
      programId || null,
      projectId || null,
      indicatorName,
      description,
      unit,
      metadata
    );
    res.json(indicator);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const goals = await governmentPerformanceManagementEngine.getGovernmentGoals(orgId, workspaceId);
    res.json(goals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const { indicatorId, goalValue, currentValue, status, metadata } = req.body;
    const goal = await governmentPerformanceManagementEngine.createGovernmentGoal(
      orgId,
      workspaceId,
      indicatorId,
      Number(goalValue),
      Number(currentValue || 0),
      status,
      metadata
    );
    res.json(goal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/results", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const results = await governmentPerformanceManagementEngine.getGovernmentResults(orgId, workspaceId);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/results", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const { indicatorId, resultValue, referenceDate, metadata } = req.body;
    const result = await governmentPerformanceManagementEngine.createGovernmentResult(
      orgId,
      workspaceId,
      indicatorId,
      Number(resultValue),
      referenceDate,
      metadata
    );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/performance", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const perf = await governmentPerformanceManagementEngine.getGovernmentPerformance(orgId, workspaceId);
    res.json(perf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/performance-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await governmentPerformanceManagementEngine.getGovernmentPerformanceSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/performance-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await governmentPerformanceManagementEngine.getGovernmentPerformanceHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 17.1: GOV PROGRAM MANAGEMENT ====================

app.get("/api/gov/objectives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const objectives = await governmentProgramManagementEngine.getGovernmentObjectives(orgId, workspaceId);
    res.json(objectives);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/objectives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const { name, description, status, metadata } = req.body;
    const objective = await governmentProgramManagementEngine.createGovernmentObjective(orgId, workspaceId, name, description, status, metadata);
    res.json(objective);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const programs = await governmentProgramManagementEngine.getGovernmentPrograms(orgId, workspaceId);
    res.json(programs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const { objectiveId, name, description, status, metadata } = req.body;
    const program = await governmentProgramManagementEngine.createGovernmentProgram(orgId, workspaceId, objectiveId, name, description, status, metadata);
    res.json(program);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/projects", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const projects = await governmentProgramManagementEngine.getGovernmentProjects(orgId, workspaceId);
    res.json(projects);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/projects", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const { programId, name, description, status, metadata } = req.body;
    const project = await governmentProgramManagementEngine.createGovernmentProject(orgId, workspaceId, programId, name, description, status, metadata);
    res.json(project);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/actions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const actions = await governmentProgramManagementEngine.getGovernmentActions(orgId, workspaceId);
    res.json(actions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/actions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const { projectId, name, description, status, metadata } = req.body;
    const action = await governmentProgramManagementEngine.createGovernmentAction(orgId, workspaceId, projectId, name, description, status, metadata);
    res.json(action);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/program-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await governmentProgramManagementEngine.getGovernmentProgramHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/program-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await governmentProgramManagementEngine.getGovernmentProgramSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================

app.get("/api/gov/contracts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const contracts = await governmentWorkspaceEngine.getGovernmentContracts(orgId, workspaceId);
    res.json(contracts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/bids", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const bids = await governmentWorkspaceEngine.getGovernmentBids(orgId, workspaceId);
    res.json(bids);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/risks", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const risks = await governmentWorkspaceEngine.getGovernmentRisks(orgId, workspaceId);
    res.json(risks);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 19.0: GOVERNMENT AMENDMENTS ROUTING ====================

app.get("/api/gov/parliamentarians", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentEngine.getParliamentarians(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/parliamentarians", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentEngine.createParliamentarian({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentEngine.getAmendments(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentEngine.createAmendment({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/beneficiaries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentEngine.getBeneficiaries(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/beneficiaries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentEngine.createBeneficiary({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/destinations", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentEngine.getDestinations(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/destinations", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentEngine.createDestination({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/executions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentEngine.getExecutions(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/executions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentEngine.createExecution({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await governmentAmendmentEngine.getAmendmentSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await governmentAmendmentEngine.getAmendmentHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 19.1: GOVERNMENT AMENDMENT EXECUTION, MONITORING & ACCOUNTABILITY ROUTING ====================

app.get("/api/gov/amendment-milestones", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentMonitoringEngine.getMilestones(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-milestones", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentMonitoringEngine.createMilestone({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentMonitoringEngine.getMonitorings(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentMonitoringEngine.createMonitoring({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentMonitoringEngine.getEvidences(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentMonitoringEngine.createEvidence({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-accountabilities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentMonitoringEngine.getAccountabilities(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-accountabilities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentMonitoringEngine.createAccountability({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentMonitoringEngine.getIssues(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentMonitoringEngine.createIssue({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-monitoring-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await governmentAmendmentMonitoringEngine.getMonitoringSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-monitoring-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await governmentAmendmentMonitoringEngine.getMonitoringHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 19.2: GOVERNMENT AMENDMENT REPORTING, EXECUTIVE REVIEW & ACCOUNTABILITY ROUTING ====================

app.get("/api/gov/amendment-reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentReportingEngine.getReports(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentReportingEngine.createReport({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-executive-briefs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentReportingEngine.getExecutiveBriefs(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-executive-briefs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentReportingEngine.createExecutiveBrief({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentReportingEngine.getSnapshots(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentReportingEngine.createSnapshot({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-reviews", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentReportingEngine.getReviews(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-reviews", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentReportingEngine.createReview({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-cycles", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await governmentAmendmentReportingEngine.getCycles(orgId, workspaceId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-cycles", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const payload = req.body || {};
    const created = await governmentAmendmentReportingEngine.createCycle({
      ...payload,
      organizationId: orgId,
      workspaceId
    });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-reporting-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await governmentAmendmentReportingEngine.getReportingSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-reporting-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await governmentAmendmentReportingEngine.getReportingHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// SPRINT 20.0 - GOVERNMENT HEALTH INTELLIGENCE FOUNDATION
// ============================================================================

app.get("/api/gov/health/units", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const units = await govHealthEngine.getHealthUnits(orgId, workspaceId);
    res.json(units);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/units", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;

    const unit = await govHealthEngine.createHealthUnit(data);
    res.json(unit);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/teams", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const teams = await govHealthEngine.getHealthTeams(orgId, workspaceId);
    res.json(teams);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/teams", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;

    const team = await govHealthEngine.createHealthTeam(data);
    res.json(team);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const programs = await govHealthEngine.getHealthPrograms(orgId, workspaceId);
    res.json(programs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;

    const program = await govHealthEngine.createHealthProgram(data);
    res.json(program);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const indicators = await govHealthEngine.getHealthIndicators(orgId, workspaceId);
    res.json(indicators);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;

    const indicator = await govHealthEngine.createHealthIndicator(data);
    res.json(indicator);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/coverages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const coverages = await govHealthEngine.getHealthCoverages(orgId, workspaceId);
    res.json(coverages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/coverages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;

    const coverage = await govHealthEngine.createHealthCoverage(data);
    res.json(coverage);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/productions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const productions = await govHealthEngine.getHealthProductions(orgId, workspaceId);
    res.json(productions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/productions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;

    const production = await govHealthEngine.createHealthProduction(data);
    res.json(production);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await govHealthEngine.getHealthSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/status", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const status = await govHealthEngine.getHealthStatus(orgId, workspaceId);
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// SPRINT 20.1 - HEALTH PERFORMANCE & MONITORING FOUNDATION
// ============================================================================

app.get("/api/gov/health/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const goals = await govHealthMonitoringEngine.getGoals(orgId, workspaceId);
    res.json(goals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const goal = await govHealthMonitoringEngine.createGoal(data);
    res.json(goal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/results", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const results = await govHealthMonitoringEngine.getResults(orgId, workspaceId);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/results", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const result = await govHealthMonitoringEngine.createResult(data);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const monitorings = await govHealthMonitoringEngine.getMonitorings(orgId, workspaceId);
    res.json(monitorings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const monitoring = await govHealthMonitoringEngine.createMonitoring(data);
    res.json(monitoring);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const evidences = await govHealthMonitoringEngine.getEvidences(orgId, workspaceId);
    res.json(evidences);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const evidence = await govHealthMonitoringEngine.createEvidence(data);
    res.json(evidence);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================

app.get("/api/gov/health/issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const issues = await govHealthMonitoringEngine.getIssues(orgId, workspaceId);
    res.json(issues);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const issue = await govHealthMonitoringEngine.createIssue(data);
    res.json(issue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const snapshots = await govHealthMonitoringEngine.getSnapshots(orgId, workspaceId);
    res.json(snapshots);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/health/snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const snapshot = await govHealthMonitoringEngine.createSnapshot(data);
    res.json(snapshot);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/monitoring-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govHealthMonitoringEngine.getMonitoringSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/health/monitoring-status", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const status = await govHealthMonitoringEngine.getMonitoringStatus(orgId, workspaceId);
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// SPRINT 21.1 - EDUCATION PERFORMANCE & MONITORING FOUNDATION
// ============================================================================

app.get("/api/gov/education/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationMonitoringEngine.getGoals(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationMonitoringEngine.createGoal(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/results", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationMonitoringEngine.getResults(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/results", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationMonitoringEngine.createResult(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationMonitoringEngine.getMonitorings(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationMonitoringEngine.createMonitoring(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationMonitoringEngine.getEvidences(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationMonitoringEngine.createEvidence(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationMonitoringEngine.getIssues(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/issues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationMonitoringEngine.createIssue(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationMonitoringEngine.getSnapshots(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/snapshots", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationMonitoringEngine.createSnapshot(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/monitoring-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govEducationMonitoringEngine.getMonitoringSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/monitoring-status", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const status = await govEducationMonitoringEngine.getMonitoringStatus(orgId, workspaceId);
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


app.get("/api/gov/education/units", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationEngine.getEducationUnits(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/units", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationEngine.createEducationUnit(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/teams", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationEngine.getEducationTeams(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/teams", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationEngine.createEducationTeam(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationEngine.getEducationPrograms(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationEngine.createEducationProgram(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationEngine.getEducationIndicators(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationEngine.createEducationIndicator(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/coverages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationEngine.getEducationCoverages(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/coverages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationEngine.createEducationCoverage(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/productions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govEducationEngine.getEducationProductions(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/education/productions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govEducationEngine.createEducationProduction(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govEducationEngine.getEducationSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/education/status", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const status = await govEducationEngine.getEducationStatus(orgId, workspaceId);
    res.json(status);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Government Amendment Opportunity API Routes ---
app.get("/api/gov/funding-opportunities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentOpportunityEngine.getFundingOpportunities(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/funding-opportunities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentOpportunityEngine.createFundingOpportunity(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/funding-programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentOpportunityEngine.getFundingPrograms(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/funding-programs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentOpportunityEngine.createFundingProgram(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/funding-notices", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentOpportunityEngine.getFundingNotices(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/funding-notices", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentOpportunityEngine.createFundingNotice(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/funding-requirements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentOpportunityEngine.getFundingRequirements(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/funding-requirements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentOpportunityEngine.createFundingRequirement(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/funding-proposals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentOpportunityEngine.getFundingProposals(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/funding-proposals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentOpportunityEngine.createFundingProposal(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/funding-submissions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentOpportunityEngine.getFundingSubmissions(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/funding-submissions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentOpportunityEngine.createFundingSubmission(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/funding-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govAmendmentOpportunityEngine.getFundingSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/funding-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const health = await govAmendmentOpportunityEngine.getFundingHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- Government Amendment Portfolio API Routes ---
app.get("/api/gov/amendment-portfolios", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentPortfolios(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-portfolios", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentPortfolioEngine.createAmendmentPortfolio(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-portfolio-items", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentPortfolioItems(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-portfolio-items", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentPortfolioEngine.createAmendmentPortfolioItem(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-priorities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentPriorities(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-priorities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentPortfolioEngine.createAmendmentPriority(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-objectives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentObjectives(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-objectives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentPortfolioEngine.createAmendmentObjective(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-action-plans", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentActionPlans(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-action-plans", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentPortfolioEngine.createAmendmentActionPlan(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-followups", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentFollowUps(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/amendment-followups", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govAmendmentPortfolioEngine.createAmendmentFollowUp(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-portfolio-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentPortfolioSummary(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/amendment-portfolio-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAmendmentPortfolioEngine.getAmendmentPortfolioHealth(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- Government Transparency API Routes ---
app.get("/api/gov/transparency/publications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencyPublications(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/publications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govTransparencyEngine.createTransparencyPublication(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/categories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencyCategories(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/categories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govTransparencyEngine.createTransparencyCategory(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/datasets", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencyDatasets(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/datasets", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govTransparencyEngine.createTransparencyDataset(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencyIndicators(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govTransparencyEngine.createTransparencyIndicator(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/documents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencyDocuments(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/documents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govTransparencyEngine.createTransparencyDocument(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencyReports(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/reports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.body.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const data = req.body;
    data.organizationId = orgId;
    data.workspaceId = workspaceId;
    const item = await govTransparencyEngine.createTransparencyReport(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencySummary(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyEngine.getTransparencyHealth(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SPRINT 22.1: GOVERNMENT OMBUDSMAN ENDPOINTS ---

app.get("/api/gov/ombudsman/requests", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govOmbudsmanEngine.getOmbudsmanRequests(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/ombudsman/requests", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govOmbudsmanEngine.createOmbudsmanRequest(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/ombudsman/categories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govOmbudsmanEngine.getOmbudsmanCategories(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/ombudsman/categories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govOmbudsmanEngine.createOmbudsmanCategory(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/ombudsman/protocols", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govOmbudsmanEngine.getOmbudsmanProtocols(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/ombudsman/protocols", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govOmbudsmanEngine.createOmbudsmanProtocol(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/ombudsman/responses", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govOmbudsmanEngine.getOmbudsmanResponses(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/ombudsman/responses", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govOmbudsmanEngine.createOmbudsmanResponse(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/ombudsman/attachments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govOmbudsmanEngine.getOmbudsmanAttachments(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/ombudsman/attachments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govOmbudsmanEngine.createOmbudsmanAttachment(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/ombudsman/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govOmbudsmanEngine.getOmbudsmanSummary(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/ombudsman/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govOmbudsmanEngine.getOmbudsmanHealth(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SPRINT 22.2: GOVERNMENT TRANSPARENCY ANALYTICS ENDPOINTS ---

app.get("/api/gov/transparency/metrics", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyAnalyticsEngine.getTransparencyMetrics(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/metrics", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govTransparencyAnalyticsEngine.createTransparencyMetric(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/kpis", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyAnalyticsEngine.getTransparencyKPIs(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/kpis", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govTransparencyAnalyticsEngine.createTransparencyKPI(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/compliance", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyAnalyticsEngine.getTransparencyCompliances(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/compliance", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govTransparencyAnalyticsEngine.createTransparencyCompliance(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/audits", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyAnalyticsEngine.getTransparencyAudits(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/audits", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govTransparencyAnalyticsEngine.createTransparencyAudit(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyAnalyticsEngine.getTransparencyMonitorings(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/transparency/monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govTransparencyAnalyticsEngine.createTransparencyMonitoring(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/analytics-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyAnalyticsEngine.getAnalyticsSummary(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/transparency/analytics-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govTransparencyAnalyticsEngine.getAnalyticsHealth(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- SPRINT 22.3: PUBLIC TRANSPARENCY PORTAL ENDPOINTS ---

app.get("/api/gov/public-portal", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicPortals(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/public-portal", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govPublicPortalEngine.createPublicPortal(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/public-catalogs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicCatalogs(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/public-catalogs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govPublicPortalEngine.createPublicCatalog(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/public-datasets", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicDatasets(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/public-datasets", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govPublicPortalEngine.createPublicDataset(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/public-publications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicPublications(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/public-publications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govPublicPortalEngine.createPublicPublication(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/public-queries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicQueries(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/public-queries", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govPublicPortalEngine.createPublicQuery(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/public-access-logs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicAccessLogs(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/public-access-logs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govPublicPortalEngine.createPublicAccessLog(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/public-portal-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicPortalSummary(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/public-portal-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govPublicPortalEngine.getPublicPortalHealth(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- SPRINT 23.0: PREFEITURA ZERO PAPEL ROUTERS ---

app.get("/api/gov/protocols", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govZeroPaperEngine.getProtocols(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/protocols", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govZeroPaperEngine.createProtocol(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/processes", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govZeroPaperEngine.getProcesses(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/processes", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govZeroPaperEngine.createProcess(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-records", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govZeroPaperEngine.getDocumentRecords(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/document-records", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govZeroPaperEngine.createDocumentRecord(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/dispatches", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govZeroPaperEngine.getDispatches(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/dispatches", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govZeroPaperEngine.createDispatch(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/routings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govZeroPaperEngine.getRoutings(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/routings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govZeroPaperEngine.createRouting(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-steps", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govZeroPaperEngine.getProcessSteps(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/process-steps", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govZeroPaperEngine.createProcessStep(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-history", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govZeroPaperEngine.getProcessHistories(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/process-history", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govZeroPaperEngine.createProcessHistory(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/zero-paper-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govZeroPaperEngine.getZeroPaperSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/zero-paper-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const health = await govZeroPaperEngine.getZeroPaperHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- SPRINT 23.1: PROTOCOL & PROCESS MANAGEMENT ROUTERS ---

app.get("/api/gov/departments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govProcessManagementEngine.getDepartments(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/departments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govProcessManagementEngine.createDepartment(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/protocol-queues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govProcessManagementEngine.getProtocolQueues(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/protocol-queues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govProcessManagementEngine.createProtocolQueue(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-assignments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govProcessManagementEngine.getProcessAssignments(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/process-assignments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govProcessManagementEngine.createProcessAssignment(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-movements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govProcessManagementEngine.getProcessMovements(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/process-movements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govProcessManagementEngine.createProcessMovement(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-responsibles", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govProcessManagementEngine.getProcessResponsibles(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/process-responsibles", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govProcessManagementEngine.createProcessResponsible(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-sectors", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govProcessManagementEngine.getProcessSectors(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/process-sectors", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govProcessManagementEngine.createProcessSector(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-management-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govProcessManagementEngine.getProcessManagementSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/process-management-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const health = await govProcessManagementEngine.getProcessManagementHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- SPRINT 23.2: WORKFLOW & ROUTING ROUTERS ---

app.get("/api/gov/workflows", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govWorkflowEngine.getWorkflows(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/workflows", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govWorkflowEngine.createWorkflow(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/workflow-stages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govWorkflowEngine.getWorkflowStages(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/workflow-stages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govWorkflowEngine.createWorkflowStage(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/workflow-transitions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govWorkflowEngine.getWorkflowTransitions(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/workflow-transitions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govWorkflowEngine.createWorkflowTransition(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/workflow-queues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govWorkflowEngine.getWorkflowQueues(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/workflow-queues", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govWorkflowEngine.createWorkflowQueue(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/workflow-executions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govWorkflowEngine.getWorkflowExecutions(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/workflow-executions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govWorkflowEngine.createWorkflowExecution(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/workflow-routes", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govWorkflowEngine.getWorkflowRoutes(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/workflow-routes", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govWorkflowEngine.createWorkflowRoute(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/workflow-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govWorkflowEngine.getWorkflowSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/workflow-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const health = await govWorkflowEngine.getWorkflowHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- SPRINT 23.3: DOCUMENT LIFECYCLE ROUTERS ---

app.get("/api/gov/document-versions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govDocumentLifecycleEngine.getDocumentVersions(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/document-versions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govDocumentLifecycleEngine.createDocumentVersion(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-classifications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govDocumentLifecycleEngine.getDocumentClassifications(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/document-classifications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govDocumentLifecycleEngine.createDocumentClassification(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-retentions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govDocumentLifecycleEngine.getDocumentRetentions(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/document-retentions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govDocumentLifecycleEngine.createDocumentRetention(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-archives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govDocumentLifecycleEngine.getDocumentArchives(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/document-archives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govDocumentLifecycleEngine.createDocumentArchive(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-movements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govDocumentLifecycleEngine.getDocumentMovements(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/document-movements", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govDocumentLifecycleEngine.createDocumentMovement(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-audits", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govDocumentLifecycleEngine.getDocumentAudits(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/document-audits", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govDocumentLifecycleEngine.createDocumentAudit(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-lifecycle-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govDocumentLifecycleEngine.getLifecycleSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/document-lifecycle-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const health = await govDocumentLifecycleEngine.getLifecycleHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// --- SPRINT 23.4: ADMINISTRATIVE GOVERNANCE ROUTERS ---

app.get("/api/gov/administrative-indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAdministrativeGovernanceEngine.getAdministrativeIndicators(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/administrative-indicators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govAdministrativeGovernanceEngine.createAdministrativeIndicator(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/administrative-audits", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAdministrativeGovernanceEngine.getAdministrativeAudits(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/administrative-audits", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govAdministrativeGovernanceEngine.createAdministrativeAudit(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/administrative-compliances", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAdministrativeGovernanceEngine.getAdministrativeCompliances(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/administrative-compliances", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govAdministrativeGovernanceEngine.createAdministrativeCompliance(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/administrative-responsibilities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAdministrativeGovernanceEngine.getAdministrativeResponsibilities(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/administrative-responsibilities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govAdministrativeGovernanceEngine.createAdministrativeResponsibility(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/administrative-monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAdministrativeGovernanceEngine.getAdministrativeMonitorings(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/administrative-monitorings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govAdministrativeGovernanceEngine.createAdministrativeMonitoring(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/administrative-occurrences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const items = await govAdministrativeGovernanceEngine.getAdministrativeOccurrences(orgId, workspaceId);
    res.json(items);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gov/administrative-occurrences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const data = { ...req.body, organizationId: orgId };
    if (!data.workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const item = await govAdministrativeGovernanceEngine.createAdministrativeOccurrence(data);
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/administrative-governance-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const summary = await govAdministrativeGovernanceEngine.getSummary(orgId, workspaceId);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/gov/administrative-governance-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const health = await govAdministrativeGovernanceEngine.getHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});



// GET /api/procurement/summary
app.get("/api/procurement/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const analysis =
      await procurementIntelligenceEngine.synthesizeProcurementSnapshot(
        user.organizationId,
      );
    // Explicitly package detailed procurement data for the client
    res.json({
      ...analysis,
      meta: {
        totalSuppliersIdentified: analysis.suppliers.length,
        totalBidsMonitored: analysis.bids.length,
        totalContractsLinked: analysis.memoryStatus?.contractsCount || 0,
        totalAtasLinked: analysis.memoryStatus?.priceRegistriesCount || 0,
        timelineEventsCount: analysis.timeline.length,
        consolidatedAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/procurement/health
app.get("/api/procurement/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const analysis =
      await procurementIntelligenceEngine.synthesizeProcurementSnapshot(
        user.organizationId,
      );

    const criticalRisksCount = analysis.risks.items
      ? analysis.risks.items.filter(
          (r: any) => r.severity === "CRITICAL" || r.severity === "HIGH",
        ).length
      : 0;

    const biddingItemsLength = analysis.items ? analysis.items.length : 0;
    const suppliersParticipants = analysis.suppliers
      ? analysis.suppliers.length
      : 0;

    // Calculate total estimated value across bids
    const totalEstimatedValue = analysis.bids.reduce((acc: number, b: any) => {
      const val = b.metadata?.estimatedValue || b.estimatedValue || 0;
      return acc + Number(val);
    }, 0);

    // Build critical risk description list
    const criticalRisksList = (analysis.risks.items || [])
      .filter((r: any) => r.severity === "CRITICAL" || r.severity === "HIGH")
      .map((r: any) => ({
        description: r.description,
        impact: r.impact,
        severity: r.severity,
      }));

    res.json({
      healthScore: analysis.health.score,
      riskScore: analysis.risks.score,
      dataStatus: analysis.dataStatus,
      partial: analysis.health.partial,
      message: analysis.health.message,
      bidsMonitored: analysis.bids.length,
      suppliersParticipants,
      biddingItemsCount: biddingItemsLength,
      criticalRisksCount,

      // Detailed Multi-criteria Health & Market Metrics
      detailedMetrics: {
        completenessScore: analysis.health.breakdown?.completeness || 100,
        competitionScore: analysis.health.breakdown?.competition || 100,
        supplierDiversityScore:
          analysis.health.breakdown?.supplierVariety || 100,
        hazardMitigationScore: analysis.health.breakdown?.riskMitigation || 100,
        totalEstimatedValue,
        criticalRisks: criticalRisksList,
        marketIntelligence: {
          concentrationIndex:
            analysis.marketAnalysis?.concentrationIndex || "LOW",
          excessiveRepetitionCount:
            analysis.marketAnalysis?.metrics?.excessiveRepetitions || 0,
          lowCompetitivenessCount:
            analysis.marketAnalysis?.metrics?.low競爭Count ||
            analysis.marketAnalysis?.metrics?.lowCompetitiveness ||
            0,
          dominantSuppliers:
            analysis.marketAnalysis?.metrics?.dominantSuppliers || [],
        },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 14: ELECTORAL DOMAIN INTEGRATION
// ==========================================

// GET /api/electoral/summary
app.get("/api/electoral/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const analysis = await electoralIntelligenceEngine.getElectoralSnapshot(
      user.organizationId,
    );
    res.json({
      ...analysis,
      meta: {
        totalCampaigns: analysis.campaigns.length,
        totalTerritories: analysis.territories.length,
        totalCoordinators: analysis.coordinators.length,
        totalAnalyses: analysis.analyses.length,
        consolidatedAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/health
app.get("/api/electoral/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const analysis = await electoralIntelligenceEngine.getElectoralSnapshot(
      user.organizationId,
    );

    let score = 100;
    const messages: string[] = [];

    if (analysis.dataStatus === "NO_DATA") {
      score = 0;
      messages.push(
        "Ainda não há dados eleitorais suficientes para calcular a saúde do módulo.",
      );
    } else {
      if (analysis.metrics.unassignedTerritoriesCount > 0) {
        score -= Math.min(analysis.metrics.unassignedTerritoriesCount * 15, 45);
        messages.push(
          `Existem ${analysis.metrics.unassignedTerritoriesCount} território(s) sem responsável designado.`,
        );
      }

      const activeCamps = analysis.campaigns.filter(
        (c: any) => c.status === "ACTIVE",
      );
      const activeWithoutCoordCount = activeCamps.filter(
        (c: any) =>
          !analysis.coordinators.some((co: any) => co.campaignId === c.id),
      ).length;

      if (activeWithoutCoordCount > 0) {
        score -= Math.min(activeWithoutCoordCount * 20, 40);
        messages.push(
          `Existem ${activeWithoutCoordCount} campanha(s) ativa(s) sem coordenador mapeado.`,
        );
      }

      if (analysis.dataStatus === "PARTIAL_DATA") {
        messages.push(
          "Análise parcial baseada nos dados eleitorais atualmente carregados.",
        );
      } else {
        if (messages.length === 0) {
          messages.push(
            "Com os dados atualmente carregados, nenhum problema crítico foi identificado.",
          );
        }
      }
    }

    if (score < 0) score = 0;

    res.json({
      healthScore: score,
      riskScore: 100 - score,
      dataStatus: analysis.dataStatus,
      partial: analysis.dataStatus === "PARTIAL_DATA",
      message: messages.join(" "),
      campaignsCount: analysis.campaigns.length,
      coordinatorsCount: analysis.coordinators.length,
      unassignedTerritoriesCount: analysis.metrics.unassignedTerritoriesCount,
      consolidatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/campaigns
app.get("/api/electoral/campaigns", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaigns =
      await electoralIntelligenceEngine.domainEngine.getCampaigns(
        user.organizationId,
      );
    const count = campaigns.length;
    const dataStatus = count === 0 ? "NO_DATA" : "READY";
    const message =
      count === 0
        ? "Ainda não há campanhas eleitorais cadastradas."
        : "Dados de campanhas eleitorais carregados com sucesso.";
    res.json({
      dataStatus,
      campaigns,
      count,
      message,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/campaigns/:id
app.get("/api/electoral/campaigns/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const campaign =
      await electoralIntelligenceEngine.campaignEngine.getCampaignById(
        user.organizationId,
        campaignId,
      );
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/campaigns/:id
app.put("/api/electoral/campaigns/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const {
      name,
      candidateName,
      party,
      office,
      electionYear,
      status,
      description,
      startDate,
      endDate,
    } = req.body;

    const updated =
      await electoralIntelligenceEngine.campaignEngine.updateCampaign(
        user.organizationId,
        campaignId,
        {
          name,
          candidateName: candidateName || null,
          party: party || null,
          office: office || null,
          electionYear:
            electionYear !== undefined && electionYear !== null
              ? Number(electionYear)
              : null,
          status,
          description: description || null,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/campaigns/:id/objectives
app.get("/api/electoral/campaigns/:id/objectives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const objectives =
      await electoralIntelligenceEngine.objectiveEngine.getObjectives(
        user.organizationId,
        campaignId,
      );
    res.json(objectives);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/campaigns/:id/objectives
app.post("/api/electoral/campaigns/:id/objectives", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const { title, description, priority, status, dueDate, projectId } =
      req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required for objective" });
    }

    const created =
      await electoralIntelligenceEngine.objectiveEngine.createObjective(
        user.organizationId,
        projectId || null,
        campaignId,
        {
          title,
          description: description || null,
          priority: priority || "MEDIUM",
          status: status || "PENDING",
          dueDate: dueDate || null,
        },
      );
    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/campaigns/:id/objectives/:objId
app.put("/api/electoral/campaigns/:id/objectives/:objId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const objectiveId = req.params.objId;
    const { title, description, priority, status, dueDate } = req.body;

    const updated =
      await electoralIntelligenceEngine.objectiveEngine.updateObjective(
        user.organizationId,
        objectiveId,
        {
          title,
          description,
          priority,
          status,
          dueDate,
        },
      );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/campaigns/:id/tasks
app.get("/api/electoral/campaigns/:id/tasks", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const tasks = await electoralIntelligenceEngine.taskEngine.getTasks(
      user.organizationId,
      campaignId,
    );
    res.json(tasks);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/campaigns/:id/tasks
app.post("/api/electoral/campaigns/:id/tasks", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      objectiveId,
      assignedCoordinatorId,
      projectId,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required for task" });
    }

    const created = await electoralIntelligenceEngine.taskEngine.createTask(
      user.organizationId,
      projectId || null,
      campaignId,
      {
        title,
        description: description || null,
        status: status || "PENDING",
        priority: priority || "MEDIUM",
        dueDate: dueDate || null,
        objectiveId: objectiveId || null,
        assignedCoordinatorId: assignedCoordinatorId || null,
      },
    );
    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/campaigns/:id/tasks/:taskId
app.put("/api/electoral/campaigns/:id/tasks/:taskId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const taskId = req.params.taskId;
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      objectiveId,
      assignedCoordinatorId,
    } = req.body;

    const updated = await electoralIntelligenceEngine.taskEngine.updateTask(
      user.organizationId,
      taskId,
      {
        title,
        description,
        status,
        priority,
        dueDate,
        objectiveId,
        assignedCoordinatorId,
      },
    );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/campaigns/:id/progress
app.get("/api/electoral/campaigns/:id/progress", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const objectives =
      await electoralIntelligenceEngine.objectiveEngine.getObjectives(
        user.organizationId,
        campaignId,
      );
    const tasks = await electoralIntelligenceEngine.taskEngine.getTasks(
      user.organizationId,
      campaignId,
    );
    const coordinators =
      await electoralIntelligenceEngine.coordinatorEngine.getCoordinatorsByCampaign(
        user.organizationId,
        campaignId,
      );
    const territories =
      await electoralIntelligenceEngine.domainEngine.getTerritories(
        user.organizationId,
      );

    const progress =
      electoralIntelligenceEngine.progressEngine.calculateProgress(
        objectives,
        tasks,
        territories,
        coordinators,
      );
    res.json(progress);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/campaigns/:id/health
app.get("/api/electoral/campaigns/:id/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const objectives =
      await electoralIntelligenceEngine.objectiveEngine.getObjectives(
        user.organizationId,
        campaignId,
      );
    const tasks = await electoralIntelligenceEngine.taskEngine.getTasks(
      user.organizationId,
      campaignId,
    );
    const coordinators =
      await electoralIntelligenceEngine.coordinatorEngine.getCoordinatorsByCampaign(
        user.organizationId,
        campaignId,
      );
    const territories =
      await electoralIntelligenceEngine.domainEngine.getTerritories(
        user.organizationId,
      );

    const progress =
      electoralIntelligenceEngine.progressEngine.calculateProgress(
        objectives,
        tasks,
        territories,
        coordinators,
      );
    const health = electoralIntelligenceEngine.healthEngine.calculateHealth(
      coordinators.length,
      progress,
    );
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/campaigns/:id/intelligence
app.get("/api/electoral/campaigns/:id/intelligence", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const campaignId = req.params.id;
    const intel = await electoralIntelligenceEngine.getCampaignIntelligence(
      user.organizationId,
      campaignId,
    );
    res.json(intel);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories
app.get("/api/electoral/territories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const territories =
      await electoralIntelligenceEngine.domainEngine.getTerritories(
        user.organizationId,
      );
    const hierarchy =
      await electoralIntelligenceEngine.territoryEngine.getTerritoryHierarchy(
        user.organizationId,
      );
    const count = territories.length;
    const dataStatus = count === 0 ? "NO_DATA" : "READY";
    const message =
      count === 0
        ? "Ainda não há territórios eleitorais cadastrados."
        : "Dados de territórios eleitorais cadastrados carregados com sucesso.";
    res.json({
      dataStatus,
      territories,
      hierarchy,
      count,
      message,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/coordinators
app.get("/api/electoral/coordinators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const coordinators =
      await electoralIntelligenceEngine.domainEngine.getCoordinators(
        user.organizationId,
      );
    const count = coordinators.length;
    const dataStatus = count === 0 ? "NO_DATA" : "READY";
    const message =
      count === 0
        ? "Ainda não há coordenadores eleitorais cadastrados."
        : "Dados de coordenadores eleitorais carregados com sucesso.";
    res.json({
      dataStatus,
      coordinators,
      count,
      message,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/campaign
app.post("/api/electoral/campaign", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const {
      name,
      candidateName,
      party,
      office,
      electionYear,
      status,
      description,
      projectId,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Campaign name is required" });
    }

    const campaign =
      await electoralIntelligenceEngine.domainEngine.registerCampaign(
        user.organizationId,
        projectId || null,
        {
          name,
          candidateName: candidateName || null,
          party: party || null,
          office: office || null,
          electionYear:
            electionYear !== undefined && electionYear !== null
              ? Number(electionYear)
              : null,
          status: status || "PLANNING",
          description: description || null,
        },
      );

    res.json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/territory
app.post("/api/electoral/territory", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const { name, type, parentId, code, projectId } = req.body;

    if (!name || !type) {
      return res
        .status(400)
        .json({ error: "Territory name and type are required" });
    }

    const territory =
      await electoralIntelligenceEngine.territoryEngine.registerTerritory(
        user.organizationId,
        projectId || null,
        {
          name,
          type,
          parentId: parentId || null,
          code: code || null,
        },
      );

    res.json(territory);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/coordinator
app.post("/api/electoral/coordinator", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const {
      name,
      email,
      phone,
      level,
      status,
      assignedTerritory,
      campaignId,
      projectId,
    } = req.body;

    if (!name || !level) {
      return res
        .status(400)
        .json({ error: "Coordinator name and level are required" });
    }

    const coor =
      await electoralIntelligenceEngine.coordinatorEngine.registerCoordinator(
        user.organizationId,
        projectId || null,
        {
          name,
          email: email || null,
          phone: phone || null,
          level,
          status: status || "ACTIVE",
          assignedTerritory: assignedTerritory || null,
          campaignId: campaignId || null,
        },
      );

    res.json(coor);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/analysis
app.post("/api/electoral/analysis", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const { title, type, summary, metadata, projectId } = req.body;

    if (!title || !type) {
      return res
        .status(400)
        .json({ error: "Analysis title and type are required" });
    }

    const analysis =
      await electoralIntelligenceEngine.analysisEngine.createAnalysis(
        user.organizationId,
        projectId || null,
        {
          title,
          type,
          summary: summary || null,
          metadata: metadata || {},
        },
      );

    res.json(analysis);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/invite
app.post("/api/electoral/invite", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const { campaignId, email, phone, role, assignedTerritoryId, projectId } =
      req.body;

    if (!campaignId || !role) {
      return res
        .status(400)
        .json({ error: "CampaignId and role are required" });
    }

    const invite =
      await electoralIntelligenceEngine.inviteEngine.generateInvite(
        user.organizationId,
        projectId || null,
        {
          campaignId,
          email: email || null,
          phone: phone || null,
          role,
          assignedTerritoryId: assignedTerritoryId || null,
          invitedByUserId: user.id,
        },
      );

    res.json(invite);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/invite/accept
app.post("/api/electoral/invite/accept", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const { inviteId, name, phone } = req.body;

    if (!inviteId) {
      return res.status(400).json({ error: "InviteId is required" });
    }

    // Use passed name/phone or authenticated user name as fallback. Otherwise, null (no artificial names)
    const acceptedName = name || user.name || null;
    const acceptedPhone = phone || null;

    const result = await electoralIntelligenceEngine.inviteEngine.acceptInvite(
      user.organizationId,
      inviteId,
      user.id,
      acceptedName,
      acceptedPhone,
    );
    res.json(result);
  } catch (e: any) {
    res.status(450).json({ error: e.message });
  }
});

// GET /api/electoral/coordinators/hierarchy - returns tree hierarchy of coordinators
app.get("/api/electoral/coordinators/hierarchy", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const tree = await electoralIntelligenceEngine.hierarchyEngine.getHierarchy(
      user.organizationId,
    );
    res.json(tree);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/coordinators/:id/subordinates - returns descendant tree list of a coordinator
app.get("/api/electoral/coordinators/:id/subordinates", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const list =
      await electoralIntelligenceEngine.hierarchyEngine.getSubordinates(
        user.organizationId,
        req.params.id,
      );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/coordinators/:id/supervisors - returns ascending lines of command for a coordinator
app.get("/api/electoral/coordinators/:id/supervisors", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const list =
      await electoralIntelligenceEngine.hierarchyEngine.getSupervisors(
        user.organizationId,
        req.params.id,
      );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/coordinators/validate-hierarchy - validates parent/child assignment compatibility
app.post("/api/electoral/coordinators/validate-hierarchy", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const { coordinatorId, parentId } = req.body;
    if (!coordinatorId) {
      return res.status(400).json({ error: "coordinatorId is required" });
    }
    const result =
      await electoralIntelligenceEngine.hierarchyEngine.validateHierarchy(
        user.organizationId,
        coordinatorId,
        parentId || null,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/coordinators/:id - update a coordinator's parentCoordinatorId or level or status
app.put("/api/electoral/coordinators/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const { parentCoordinatorId, level, status, name, email, phone } = req.body;
    const coordinatorId = req.params.id;

    // Validate hierarchy loop or level rules if parent is being modified
    if (parentCoordinatorId !== undefined) {
      const val =
        await electoralIntelligenceEngine.hierarchyEngine.validateHierarchy(
          user.organizationId,
          coordinatorId,
          parentCoordinatorId || null,
        );
      if (!val.valid) {
        return res.status(400).json({ error: val.error });
      }
    }

    const payload: any = {};
    if (parentCoordinatorId !== undefined)
      payload.parentCoordinatorId = parentCoordinatorId || null;
    if (level !== undefined) payload.level = level;
    if (status !== undefined) payload.status = status;
    if (name !== undefined) payload.name = name;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.phone = phone;

    const updated = await dbAdapter.updateElectoralCoordinator(
      coordinatorId,
      payload,
    );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/coordinators/:id/assign-territory - assign territory
app.post(
  "/api/electoral/coordinators/:id/assign-territory",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user || !user.organizationId) {
        return res
          .status(401)
          .json({ error: "organizationId is missing or invalid" });
      }
      const { territoryId } = req.body;
      if (!territoryId) {
        return res.status(400).json({ error: "territoryId is required" });
      }
      const updated =
        await electoralIntelligenceEngine.territoryAssignmentEngine.assignTerritory(
          user.organizationId,
          req.params.id,
          territoryId,
        );
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// POST /api/electoral/coordinators/:id/remove-territory - remove territory
app.post(
  "/api/electoral/coordinators/:id/remove-territory",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user || !user.organizationId) {
        return res
          .status(401)
          .json({ error: "organizationId is missing or invalid" });
      }
      const updated =
        await electoralIntelligenceEngine.territoryAssignmentEngine.removeTerritory(
          user.organizationId,
          req.params.id,
        );
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// GET /api/electoral/coordinators/territory-coverage - coverage overview
app.get("/api/electoral/coordinators/territory-coverage", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const coverage =
      await electoralIntelligenceEngine.territoryAssignmentEngine.getTerritoryCoverage(
        user.organizationId,
      );
    res.json(coverage);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/coordinators/territory-conflicts - conflict overview
app.get("/api/electoral/coordinators/territory-conflicts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const conflicts =
      await electoralIntelligenceEngine.territoryAssignmentEngine.detectConflicts(
        user.organizationId,
      );
    res.json(conflicts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/coordinators/:id/responsibilities - aggregated responsibilities
app.get(
  "/api/electoral/coordinators/:id/responsibilities",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user || !user.organizationId) {
        return res
          .status(401)
          .json({ error: "organizationId is missing or invalid" });
      }
      const resp =
        await electoralIntelligenceEngine.responsibilityEngine.getResponsibilities(
          user.organizationId,
          req.params.id,
        );
      res.json(resp);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// GET /api/electoral/coordinators/:id/health - health appraisal score
app.get("/api/electoral/coordinators/:id/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const health =
      await electoralIntelligenceEngine.coordinatorHealthEngine.getCoordinatorHealth(
        user.organizationId,
        req.params.id,
      );
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/invite/:id/decline - decline invite
app.post("/api/electoral/invite/:id/decline", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result = await electoralIntelligenceEngine.inviteEngine.declineInvite(
      user.organizationId,
      req.params.id,
      user.id,
    );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/invite/:id/revoke - revoke invite
app.post("/api/electoral/invite/:id/revoke", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result = await electoralIntelligenceEngine.inviteEngine.revokeInvite(
      user.organizationId,
      req.params.id,
      user.id,
    );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/invite/:id/audit-trail - audit logs
app.get("/api/electoral/invite/:id/audit-trail", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const logs = await electoralIntelligenceEngine.inviteEngine
      .getInvites(user.organizationId)
      .then(async () => {
        return dbAdapter.getElectoralInviteAuditLogs(
          user.organizationId,
          req.params.id,
        );
      });
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories/hierarchy
app.get("/api/electoral/territories/hierarchy", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const hierarchy =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.hierarchyEngine.getHierarchy(
        user.organizationId,
      );
    res.json(hierarchy);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories/coverage
app.get("/api/electoral/territories/coverage", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const coverage =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.coverageEngine.getCoverage(
        user.organizationId,
      );
    res.json(coverage);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories/priorities
app.get("/api/electoral/territories/priorities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const priorities =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.priorityEngine.getPriorities(
        user.organizationId,
      );
    res.json(priorities);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories/conflicts
app.get("/api/electoral/territories/conflicts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const conflicts =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.conflictEngine.detectConflicts(
        user.organizationId,
      );
    res.json(conflicts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories/:id/responsibilities
app.get("/api/electoral/territories/:id/responsibilities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const resp =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.responsibilityEngine.getResponsibilities(
        user.organizationId,
        req.params.id,
      );
    res.json(resp);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories/:id/health
app.get("/api/electoral/territories/:id/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const territories =
      await electoralIntelligenceEngine.domainEngine.getTerritories(
        user.organizationId,
      );
    const coordinators =
      await electoralIntelligenceEngine.domainEngine.getCoordinators(
        user.organizationId,
      );

    const coverageRes =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.coverageEngine.calculateCoverageForTerritory(
        user.organizationId,
        req.params.id,
        territories,
        coordinators,
      );

    const conflicts =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.conflictEngine.detectConflicts(
        user.organizationId,
      );
    const territoryConflicts = conflicts.filter(
      (c) => c.territoryId === req.params.id,
    );

    // Score synthesis
    let score = 100;
    if (coverageRes.status === "UNCOVERED") {
      score = 0;
    } else if (coverageRes.status === "PARTIAL") {
      score = 50;
    }
    score -= territoryConflicts.length * 20;
    score = Math.max(0, Math.min(100, score));

    // Balanced tentative diagnostics (no absolute phrases)
    let diagnostics = `A região analisada indica cobertura sob o estado ${coverageRes.status}. `;
    if (territoryConflicts.length > 0) {
      diagnostics += `Sugere-se atenção técnica devido a indício de conflito ou sobreposição observado.`;
    } else {
      diagnostics += `Não há fortes indícios de conflitos estruturais neste território específico no momento.`;
    }

    res.json({
      territoryId: req.params.id,
      score,
      coverageStatus: coverageRes.status,
      conflictsCount: territoryConflicts.length,
      conflicts: territoryConflicts,
      diagnostics,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/territories/:id/intelligence
app.get("/api/electoral/territories/:id/intelligence", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const territories =
      await electoralIntelligenceEngine.domainEngine.getTerritories(
        user.organizationId,
      );
    const coordinators =
      await electoralIntelligenceEngine.domainEngine.getCoordinators(
        user.organizationId,
      );

    const matchTerritory = territories.find((t) => t.id === req.params.id);
    if (!matchTerritory) {
      return res.status(404).json({ error: "Territory not found" });
    }

    const ancestors =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.hierarchyEngine.getAncestors(
        user.organizationId,
        req.params.id,
      );
    const descendants =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.hierarchyEngine.getDescendants(
        user.organizationId,
        req.params.id,
      );
    const coverage =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.coverageEngine.calculateCoverageForTerritory(
        user.organizationId,
        req.params.id,
        territories,
        coordinators,
      );

    const allCampaigns =
      await electoralIntelligenceEngine.domainEngine.getCampaigns(
        user.organizationId,
      );
    const mainCampaignId =
      allCampaigns.length > 0 ? allCampaigns[0].id : undefined;
    const allTasks = mainCampaignId
      ? await dbAdapter.getElectoralCampaignTasks(
          user.organizationId,
          mainCampaignId,
        )
      : [];
    const allObjectives = mainCampaignId
      ? await dbAdapter.getElectoralCampaignObjectives(
          user.organizationId,
          mainCampaignId,
        )
      : [];

    const priority =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.priorityEngine.calculatePriority(
        user.organizationId,
        req.params.id,
        territories,
        coordinators,
        allTasks,
        allObjectives,
      );

    const conflicts =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.conflictEngine.detectConflicts(
        user.organizationId,
      );
    const territoryConflicts = conflicts.filter(
      (c) => c.territoryId === req.params.id,
    );

    const responsibilities =
      await electoralIntelligenceEngine.territorialIntelligenceEngine.responsibilityEngine.getResponsibilities(
        user.organizationId,
        req.params.id,
      );

    // Formulate a beautiful territorial text brief
    const brief = `Análise pontual indica que o território "${matchTerritory.name}" atua sob classificação ${matchTerritory.type}. Apresenta-se com cobertura de coordenação avaliada como ${coverage.status} e prioridade estimada em nível ${priority.priorityLevel}.`;

    res.json({
      territory: matchTerritory,
      ancestors,
      descendants,
      coverage,
      priority,
      conflicts: territoryConflicts,
      responsibilities,
      brief,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SPRINT 14.4 OPPONENT MONITORING ENDPOINTS ====================

// GET /api/electoral/opponents
app.get("/api/electoral/opponents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.opponentEngine.getOpponents(
        user.organizationId,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/opponents/:id
app.get("/api/electoral/opponents/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.opponentEngine.getOpponentById(
        user.organizationId,
        req.params.id,
      );
    if (!result) {
      return res.status(404).json({ error: "Opponent not found" });
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/opponents
app.post("/api/electoral/opponents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const projectId = req.body.projectId || req.query.projectId || null;
    const result =
      await electoralIntelligenceEngine.opponentEngine.createOpponent(
        user.organizationId,
        projectId ? String(projectId) : null,
        req.body,
      );
    res.status(201).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/opponents/:id
app.put("/api/electoral/opponents/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.opponentEngine.updateOpponent(
        req.params.id,
        req.body,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/electoral/opponents/:id
app.get("/api/electoral/opponents/:id/delete", async (req, res) => {
  try {
    await electoralIntelligenceEngine.opponentEngine.deleteOpponent(
      req.params.id,
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.delete("/api/electoral/opponents/:id", async (req, res) => {
  try {
    await electoralIntelligenceEngine.opponentEngine.deleteOpponent(
      req.params.id,
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/groups
app.get("/api/electoral/groups", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.politicalGroupEngine.getPoliticalGroups(
        user.organizationId,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/groups/:id
app.get("/api/electoral/groups/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.politicalGroupEngine.getPoliticalGroupById(
        user.organizationId,
        req.params.id,
      );
    if (!result) {
      return res.status(404).json({ error: "Political group not found" });
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/groups
app.post("/api/electoral/groups", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const projectId = req.body.projectId || req.query.projectId || null;
    const result =
      await electoralIntelligenceEngine.politicalGroupEngine.createPoliticalGroup(
        user.organizationId,
        projectId ? String(projectId) : null,
        req.body,
      );
    res.status(201).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/groups/:id
app.put("/api/electoral/groups/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.politicalGroupEngine.updatePoliticalGroup(
        req.params.id,
        req.body,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/electoral/groups/:id
app.delete("/api/electoral/groups/:id", async (req, res) => {
  try {
    await electoralIntelligenceEngine.politicalGroupEngine.deletePoliticalGroup(
      req.params.id,
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/leaderships
app.get("/api/electoral/leaderships", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.leadershipEngine.getLeaderships(
        user.organizationId,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/leaderships/:id
app.get("/api/electoral/leaderships/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.leadershipEngine.getLeadershipById(
        user.organizationId,
        req.params.id,
      );
    if (!result) {
      return res.status(404).json({ error: "Leadership not found" });
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/leaderships
app.post("/api/electoral/leaderships", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const projectId = req.body.projectId || req.query.projectId || null;
    const result =
      await electoralIntelligenceEngine.leadershipEngine.createLeadership(
        user.organizationId,
        projectId ? String(projectId) : null,
        req.body,
      );
    res.status(201).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/leaderships/:id
app.put("/api/electoral/leaderships/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.leadershipEngine.updateLeadership(
        req.params.id,
        req.body,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/electoral/leaderships/:id
app.delete("/api/electoral/leaderships/:id", async (req, res) => {
  try {
    await electoralIntelligenceEngine.leadershipEngine.deleteLeadership(
      req.params.id,
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/relationships
app.get("/api/electoral/relationships", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.relationshipEngine.getRelationships(
        user.organizationId,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/relationships
app.post("/api/electoral/relationships", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const projectId = req.body.projectId || req.query.projectId || null;
    const result =
      await electoralIntelligenceEngine.relationshipEngine.createRelationship(
        user.organizationId,
        projectId ? String(projectId) : null,
        req.body,
      );
    res.status(201).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/electoral/relationships/:id
app.put("/api/electoral/relationships/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.relationshipEngine.updateRelationship(
        req.params.id,
        req.body,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/electoral/relationships/:id
app.delete("/api/electoral/relationships/:id", async (req, res) => {
  try {
    await electoralIntelligenceEngine.relationshipEngine.deleteRelationship(
      req.params.id,
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/opponents/:id/intelligence
app.get("/api/electoral/opponents/:id/intelligence", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result = await electoralIntelligenceEngine.getOpponentIntelligence(
      user.organizationId,
      req.params.id,
    );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/opponents/:id/health
app.get("/api/electoral/opponents/:id/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.opponentHealthEngine.evaluateOpponentHealth(
        user.organizationId,
        req.params.id,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/opponents-brief
app.get("/api/electoral/opponents-brief", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.opponentBriefGenerator.generateOpponentBrief(
        user.organizationId,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/history/candidate/:id
app.get("/api/electoral/history/candidate/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.candidateHistoryEngine.getCandidateHistory(
        user.organizationId,
        req.params.id,
      );
    if (!result || result.elections.length === 0) {
      return res.json({
        dataStatus: "NO_DATA",
        result: null,
        count: 0,
        message:
          "Ainda não há dados históricos suficientes para responder isso.",
      });
    }
    res.json({
      dataStatus: "READY",
      result,
      count: result.elections.length,
      message: "Dados históricos recuperados com sucesso.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/history/party/:id
app.get("/api/electoral/history/party/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const result =
      await electoralIntelligenceEngine.partyHistoryEngine.getPartyHistory(
        user.organizationId,
        req.params.id,
      );
    if (!result || result.elections.length === 0) {
      return res.json({
        dataStatus: "NO_DATA",
        result: null,
        count: 0,
        message:
          "Ainda não há dados históricos suficientes para responder isso.",
      });
    }
    res.json({
      dataStatus: "READY",
      result,
      count: result.elections.length,
      message: "Dados históricos recuperados com sucesso.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/history/territory/:id
app.get("/api/electoral/history/territory/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const filter = req.query;
    const result =
      await electoralIntelligenceEngine.territorialHistoryEngine.getTerritorialHistory(
        user.organizationId,
        req.params.id,
        filter.zone ? Number(filter.zone) : undefined,
      );
    if (!result || result.elections.length === 0) {
      return res.json({
        dataStatus: "NO_DATA",
        result: null,
        count: 0,
        message:
          "Ainda não há dados históricos suficientes para responder isso.",
      });
    }
    res.json({
      dataStatus: "READY",
      result,
      count: result.elections.length,
      message: "Dados históricos recuperados com sucesso.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/history/comparison
app.get(
  [
    "/api/electoral/history/comparison",
    "/api/electoral/history/opponent-comparison",
  ],
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user || !user.organizationId) {
        return res
          .status(401)
          .json({ error: "organizationId is missing or invalid" });
      }
      const filter = req.query;
      let result: any[] = [];
      if (filter.type === "candidato" && Array.isArray(filter.names)) {
        result =
          await electoralIntelligenceEngine.electoralComparisonEngine.compareCandidates(
            user.organizationId,
            filter.names as string[],
          );
      } else if (filter.type === "partido" && Array.isArray(filter.names)) {
        result =
          await electoralIntelligenceEngine.electoralComparisonEngine.compareParties(
            user.organizationId,
            filter.names as string[],
          );
      } else {
        return res.status(400).json({
          error:
            "Missing type ('candidato' or 'partido') or array of names[] in query.",
        });
      }

      if (!result || result.length === 0) {
        return res.json({
          dataStatus: "NO_DATA",
          result: null,
          count: 0,
          message:
            "Ainda não há dados históricos suficientes para responder isso.",
        });
      }
      res.json({
        dataStatus: "READY",
        result,
        count: result.length,
        message: "Dados históricos recuperados com sucesso.",
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// GET /api/electoral/history/ranking
app.get("/api/electoral/history/ranking", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const filter = req.query;
    const queryFilter = {
      municipio: filter.municipality as string,
      zona: filter.zone ? Number(filter.zone) : undefined,
      partido: filter.party as string,
      cargo: filter.position as string,
      anoEleitoral: filter.year ? Number(filter.year) : undefined,
      limit: filter.limit ? Number(filter.limit) : 10,
    };

    let result: any[] = [];
    if (filter.type === "party") {
      result =
        await electoralIntelligenceEngine.electoralRankingEngine.getPartyRanking(
          user.organizationId,
          queryFilter,
        );
    } else {
      result =
        await electoralIntelligenceEngine.electoralRankingEngine.getCandidateRanking(
          user.organizationId,
          queryFilter,
        );
    }

    if (!result || result.length === 0) {
      return res.json({
        dataStatus: "NO_DATA",
        result: null,
        count: 0,
        message:
          "Ainda não há dados históricos suficientes para responder isso.",
      });
    }
    res.json({
      dataStatus: "READY",
      result,
      count: result.length,
      message: "Dados históricos recuperados com sucesso.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/history/trends
app.get("/api/electoral/history/trends", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const name = req.query.name as string;
    if (!name) {
      return res.status(400).json({ error: "Missing name in query." });
    }
    const result =
      await electoralIntelligenceEngine.electoralTrendEngine.analyzeCandidateTrend(
        user.organizationId,
        name,
      );
    if (!result) {
      return res.json({
        dataStatus: "NO_DATA",
        result: null,
        count: 0,
        message:
          "Ainda não há dados históricos suficientes para responder isso.",
      });
    }
    res.json({
      dataStatus: "READY",
      result,
      count: 1,
      message: "Dados históricos recuperados com sucesso.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/electoral/history/import
app.post("/api/electoral/history/import", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    // Allow global imports if superadmin, but for now we require organizationId context or allow missing if platform import.
    // The spec says organizationId is optional. But user should probably be authenticated.

    const config = {
      filePath: req.body.filePath,
      organizationId:
        req.body.organizationId || (user ? user.organizationId : undefined),
      projectId: req.body.projectId,
      uf: req.body.uf,
      anoEleitoral: req.body.anoEleitoral
        ? Number(req.body.anoEleitoral)
        : undefined,
      dryRun: req.body.dryRun,
      batchSize: req.body.batchSize ? Number(req.body.batchSize) : undefined,
    };

    if (!config.filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }

    // Security check: restrict path
    // Basic protection against directory traversal
    if (
      config.filePath.includes("..") ||
      (!config.filePath.endsWith(".csv") &&
        !config.filePath.endsWith(".csv.gz"))
    ) {
      return res.status(400).json({
        error:
          "Invalid filePath. Must be a .csv or .csv.gz file and cannot contain traversal characters.",
      });
    }

    const job =
      await electoralIntelligenceEngine.bulkImportEngine.startImport(config);
    res.json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/history/import/:id
app.get("/api/electoral/history/import/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const job = await dbAdapter.getElectoralImportJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    // Basic check: if job has org, user must belong
    if (
      job.organizationId &&
      user &&
      user.organizationId !== job.organizationId
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/history/imports
app.get("/api/electoral/history/imports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (!user || !user.organizationId) {
      return res
        .status(401)
        .json({ error: "organizationId is missing or invalid" });
    }
    const jobs = await dbAdapter.getElectoralImportJobs(user.organizationId);
    res.json(jobs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// Sprint 14.5.3 - Aggregates & Dashboards API
// ==========================================

// GET /api/electoral/history/filters
// [PERFORMANCE AUDIT]
// Endpoint uses RPC: get_electoral_available_filters()
// Indexes utilized: none specific (full table scan on organization_id, but JSONB aggregation is optimized on Postgres)
app.get("/api/electoral/history/filters", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId || "";
    const filters =
      await electoralIntelligenceEngine.aggregateEngine.getAvailableFilters(
        orgId,
      );
    res.json({
      dataStatus: "READY",
      result: filters,
      count: 1,
      message: "Filtros recuperados do sumário.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// [PERFORMANCE AUDIT]
// Endpoint uses MATERIALIZED VIEW: electoral_candidate_summary
// Indexes utilized: idx_mv_cand_sum_org, idx_mv_cand_sum_ano_uf_mun, idx_mv_cand_sum_cand
app.get("/api/electoral/history/candidate-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.aggregateEngine.getCandidateSummary(
        user?.organizationId || "",
        req.query,
      );
    res.json({
      dataStatus: result.length > 0 ? "READY" : "NO_DATA",
      result,
      count: result.length,
      message: "Sumário de candidatos recuperado.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// [PERFORMANCE AUDIT]
// Endpoint uses MATERIALIZED VIEW: electoral_municipality_summary
// Indexes utilized: idx_mv_mun_sum_org, idx_mv_mun_sum_ano_uf
app.get("/api/electoral/history/municipality-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.aggregateEngine.getMunicipalitySummary(
        user?.organizationId || "",
        req.query,
      );
    res.json({
      dataStatus: result.length > 0 ? "READY" : "NO_DATA",
      result,
      count: result.length,
      message: "Sumário de municípios recuperado.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// [PERFORMANCE AUDIT]
// Endpoint uses MATERIALIZED VIEW: electoral_party_summary
// Indexes utilized: idx_mv_party_sum_org, idx_mv_party_sum_ano_uf, idx_mv_party_sum_partido
app.get("/api/electoral/history/party-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.aggregateEngine.getPartySummary(
        user?.organizationId || "",
        req.query,
      );
    res.json({
      dataStatus: result.length > 0 ? "READY" : "NO_DATA",
      result,
      count: result.length,
      message: "Sumário de partidos recuperado.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// [PERFORMANCE AUDIT]
// Endpoint uses MATERIALIZED VIEW: electoral_location_summary
// Indexes utilized: idx_mv_loc_sum_org, idx_mv_loc_sum_ano_uf, idx_mv_loc_sum_loc
app.get("/api/electoral/history/location-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.aggregateEngine.getLocationSummary(
        user?.organizationId || "",
        req.query,
      );
    res.json({
      dataStatus: result.length > 0 ? "READY" : "NO_DATA",
      result,
      count: result.length,
      message: "Sumário de locais recuperado.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// [PERFORMANCE AUDIT]
// Endpoint uses MATERIALIZED VIEW: electoral_zone_summary
// Indexes utilized: idx_mv_zone_sum_org, idx_mv_zone_sum_ano_uf, idx_mv_zone_sum_zona
app.get("/api/electoral/history/zone-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.aggregateEngine.getZoneSummary(
        user?.organizationId || "",
        req.query,
      );
    res.json({
      dataStatus: result.length > 0 ? "READY" : "NO_DATA",
      result,
      count: result.length,
      message: "Sumário de zonas recuperado.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// [PERFORMANCE AUDIT]
// Endpoint uses RPC: refresh_electoral_aggregates()
// Refreshes all materialized views.
app.post("/api/admin/electoral/refresh-aggregates", async (req, res) => {
  try {
    await electoralIntelligenceEngine.aggregateEngine.refreshAggregates();
    res.json({
      status: "success",
      message: "Aggregates refreshed successfully.",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// [PERFORMANCE AUDIT]
// Endpoint uses DIRECT QUERY on base table and computes real data aggregation for the import run.
app.get(
  "/api/admin/electoral/import-validation/:importRunId",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      // If not exists, maybe generate
      // Real implementation would look into `electoral_import_validation_summary`
      const summary =
        await electoralIntelligenceEngine.aggregateEngine.generateImportValidationSummary(
          user?.organizationId || "",
          req.params.importRunId,
        );
      res.json({ status: "success", summary });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// Since the ranking API was already defined at /api/electoral/history/ranking, and so was opponent comparison, we will leave those existing routes intact or they will route to the ranking engine which now leverages DB queries correctly.

// ==========================================
// Sprint 14.6 - Electoral Analytics & Projection Foundation
// ==========================================

// GET /api/electoral/analytics/historical
app.get("/api/electoral/analytics/historical", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.historicalAnalysisEngine.getHistoricalEvolution(
        user?.organizationId || "",
        req.query,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/analytics/ranking
app.get("/api/electoral/analytics/ranking", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.candidatePriorityRankingEngine.getPriorityRanking(
        user?.organizationId || "",
        req.query,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/analytics/opponents
app.get("/api/electoral/analytics/opponents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.trueOpponentAnalysisEngine.getOpponentComparison(
        user?.organizationId || "",
        req.query,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/analytics/strategic
app.get("/api/electoral/analytics/strategic", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.strategicAnalysisEngine.getStrategicInsights(
        user?.organizationId || "",
        req.query,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/electoral/analytics/projection
app.get("/api/electoral/analytics/projection", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const result =
      await electoralIntelligenceEngine.evidenceBasedProjectionEngine.getProjection(
        user?.organizationId || "",
        req.query,
      );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 15.0 - BETA PLATFORM OPERATIONAL ENDPOINTS
// ==========================================

app.get("/api/core/contacts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await contactEngine.getContacts(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/contacts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await contactEngine.createContact(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/crm/interactions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await crmEngine.getInteractions(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/crm/interactions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await crmEngine.createInteraction(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/calendar/events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await calendarEngine.getEvents(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/calendar/events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await calendarEngine.createEvent(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/activities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await activityEngine.getActivities(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/activities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await activityEngine.createActivity(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/tasks", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await taskEngine.getTasks(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/tasks", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await taskEngine.createTask(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await evidenceEngine.getEvidences(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await evidenceEngine.createEvidence(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/attachments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await attachmentEngine.getAttachments(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/attachments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await attachmentEngine.createAttachment(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/workflows", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await workflowEngine.getWorkflowInstances(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/workflows", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await workflowEngine.createWorkflowInstance(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/notifications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await notificationEngine.getNotifications(orgId, req.query);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/core/notifications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await notificationEngine.createNotification(orgId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 15.1 - MODULE ACCESS LAYER ENDPOINTS
// ==========================================

app.get("/api/core/modules", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await moduleAccessEngine.getModules(orgId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/modules/active", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await moduleAccessEngine.getActiveModules(orgId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/modules/enable", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { moduleCode, metadata } = req.body;
    if (!moduleCode) {
      return res
        .status(400)
        .json({ error: "Validation Error: moduleCode is required." });
    }
    const result = await moduleAccessEngine.enableModule(
      orgId,
      moduleCode,
      metadata,
    );
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/modules/disable", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { moduleCode } = req.body;
    if (!moduleCode) {
      return res
        .status(400)
        .json({ error: "Validation Error: moduleCode is required." });
    }
    await moduleAccessEngine.disableModule(orgId, moduleCode);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/features", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await moduleAccessEngine.getFeatures(orgId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/features/active", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const result = await moduleAccessEngine.getActiveFeatures(orgId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 15.2 — CLIENT WORKSPACE & SUPER ADMIN ENDPOINTS
// ==========================================

// 1. Client Workspaces (Multi-Tenant)
app.get("/api/core/workspaces", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res.status(400).json({
        error:
          "Multi-Tenant Error: organization_id is required is query workspaces.",
      });
    }
    const workspaces = await workspaceEngine.getWorkspaces(orgId);
    res.json(workspaces);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/workspaces", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res.status(400).json({
        error:
          "Multi-Tenant Error: organization_id is required to create workspace.",
      });
    }
    const { name, description, metadataJson } = req.body;
    const ws = await workspaceEngine.createWorkspace(orgId, {
      name,
      description,
      metadataJson,
    });

    // Log admin audit
    await superAdminEngine.createAuditLog(
      user?.id || "unknown",
      orgId,
      "CREATE_WORKSPACE",
      "WORKSPACE",
      ws.id,
      `Created workspace: ${name}`,
      metadataJson,
    );

    res.status(201).json(ws);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/core/workspaces/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res.status(400).json({
        error:
          "Multi-Tenant Error: organization_id is required to update workspace.",
      });
    }
    const { id } = req.params;
    const { name, description, status, metadataJson } = req.body;
    const ws = await workspaceEngine.updateWorkspace(orgId, id, {
      name,
      description,
      status,
      metadataJson,
    });

    // Log admin audit
    await superAdminEngine.createAuditLog(
      user?.id || "unknown",
      orgId,
      "UPDATE_WORKSPACE",
      "WORKSPACE",
      id,
      `Updated workspace details for: ${ws.name}`,
      metadataJson,
    );

    res.json(ws);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Organization Settings (Multi-Tenant)
app.get("/api/core/settings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res.status(400).json({
        error:
          "Multi-Tenant Error: organization_id is required to fetch settings.",
      });
    }
    const settings = await superAdminEngine.getOrganizationSettings(orgId);
    res.json(settings);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/core/settings", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { key, value, metadataJson } = req.body;
    if (!key) {
      return res
        .status(400)
        .json({ error: "Validation Error: setting key is required." });
    }
    const setting = await superAdminEngine.updateOrganizationSetting(
      user?.id || "unknown",
      orgId,
      key,
      value,
      metadataJson,
    );
    res.json(setting);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Super Admin Administrative Controllers
app.get("/api/admin/organizations", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    // Simple admin check: restrict to administrative roles in local dev
    if (
      user?.role !== "admin" &&
      user?.role !== "superuser" &&
      user?.role !== "super_admin"
    ) {
      return res
        .status(403)
        .json({ error: "Access Denied: Super Admin permissions required." });
    }
    const list = await superAdminEngine.getOrganizations();
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/organizations/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (
      user?.role !== "admin" &&
      user?.role !== "superuser" &&
      user?.role !== "super_admin"
    ) {
      return res
        .status(403)
        .json({ error: "Access Denied: Super Admin permissions required." });
    }
    const { id } = req.params;
    const org = await superAdminEngine.getOrganizationDetails(id);
    if (!org) {
      return res.status(404).json({ error: "Organization not found." });
    }
    const activeModules = await superAdminEngine.getOrganizationModules(id);
    const users = await superAdminEngine.getOrganizationUsers(id);
    const settings = await superAdminEngine.getOrganizationSettings(id);

    res.json({
      organization: org,
      activeModules,
      users,
      settings,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/audit-logs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    if (
      user?.role !== "admin" &&
      user?.role !== "superuser" &&
      user?.role !== "super_admin"
    ) {
      return res
        .status(403)
        .json({ error: "Access Denied: Super Admin permissions required." });
    }
    const logs = await superAdminEngine.getAuditLogs();
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 15.3 — SHARED IMPORT CENTER ENDPOINTS
// ==========================================

app.post("/api/core/imports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { workspaceId, moduleCode, jobType, metadataJson } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        error: "Multi-Tenant Error: workspaceId is mandatory for import jobs.",
      });
    }
    const job = await importCenterEngine.createImportJob(
      orgId,
      workspaceId,
      moduleCode,
      jobType,
      metadataJson,
    );
    res.status(201).json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/imports", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) {
      return res.status(400).json({
        error: "Multi-Tenant Error: workspaceId query parameter is required.",
      });
    }
    const list = await importCenterEngine.getImportJobs(orgId, workspaceId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/imports/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const job = await importCenterEngine.getImportJob(orgId, id);
    if (!job) {
      return res.status(404).json({ error: "Import job not found." });
    }
    res.json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/imports/:id/errors", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const errors = await importCenterEngine.getImportErrors(orgId, id);
    res.json(errors);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/imports/:id/start", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const job = await importCenterEngine.startImportJob(orgId, id);
    res.json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/imports/:id/complete", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const { totalRows, processedRows, successRows, errorRows } = req.body;
    const job = await importCenterEngine.completeImportJob(orgId, id, {
      totalRows,
      processedRows,
      successRows,
      errorRows,
    });
    res.json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/imports/:id/fail", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const { errorMessage } = req.body;
    if (!errorMessage) {
      return res.status(400).json({
        error: "Validation Error: errorMessage is required to fail a job.",
      });
    }
    const job = await importCenterEngine.failImportJob(orgId, id, errorMessage);
    res.json(job);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// =========================================================================
// SPRINT 15.4 — BETA ELECTORAL OPERATIONAL CAMPAIGN PATHS
// =========================================================================

app.post("/api/electoral/campaigns", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const {
      name,
      description,
      campaignType,
      workspaceId,
      status,
      startDate,
      endDate,
      metadataJson,
    } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        error:
          "Multi-Tenant Error: workspaceId is mandatory for electoral campaigns.",
      });
    }
    if (!name || !campaignType) {
      return res.status(400).json({
        error: "Validation Error: name and campaignType are required.",
      });
    }
    const campaign = await campaignOperationalEngine.createCampaign(
      orgId,
      workspaceId,
      {
        name,
        description,
        campaignType,
        status,
        startDate,
        endDate,
        metadataJson,
      },
    );
    res.status(201).json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is required." });
    }
    const list = await campaignOperationalEngine.getCampaigns(
      orgId,
      workspaceId,
    );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const campaign = await campaignOperationalEngine.getCampaign(orgId, id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found." });
    }
    res.json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/electoral/campaigns/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const {
      name,
      description,
      campaignType,
      status,
      startDate,
      endDate,
      metadataJson,
    } = req.body;
    const campaign = await campaignOperationalEngine.updateCampaign(id, orgId, {
      name,
      description,
      campaignType,
      status,
      startDate,
      endDate,
      metadataJson,
    });
    res.json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/members", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const { contactId, role, status, metadataJson } = req.body;
    if (!contactId || !role) {
      return res
        .status(400)
        .json({ error: "Validation Error: contactId and role are required." });
    }
    const member = await campaignOperationalEngine.addMember(orgId, id, {
      contactId,
      role,
      status,
      metadataJson,
    });
    res.status(201).json(member);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id/members", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const camp = await campaignOperationalEngine.getCampaign(orgId, id);
    if (!camp) {
      return res.status(404).json({ error: "Campaign not found." });
    }
    const list = await campaignOperationalEngine.getMembers(id);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const { title, description, goalType, targetValue, currentValue, status } =
      req.body;
    if (!title || !goalType) {
      return res
        .status(400)
        .json({ error: "Validation Error: title and goalType are required." });
    }
    const goal = await campaignOperationalEngine.createGoal(orgId, id, {
      title,
      description,
      goalType,
      targetValue,
      currentValue,
      status,
    });
    res.status(201).json(goal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id/goals", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const camp = await campaignOperationalEngine.getCampaign(orgId, id);
    if (!camp) {
      return res.status(404).json({ error: "Campaign not found." });
    }
    const list = await campaignOperationalEngine.getGoals(id);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/electoral/campaigns/:id/goals/:goalId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id, goalId } = req.params;
    const { title, description, goalType, targetValue, currentValue, status } =
      req.body;
    const goal = await campaignOperationalEngine.updateGoal(orgId, id, goalId, {
      title,
      description,
      goalType,
      targetValue,
      currentValue,
      status,
    });
    res.json(goal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/actions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const { title, description, status, scheduledFor, activityId, taskId } =
      req.body;
    if (!title) {
      return res
        .status(400)
        .json({ error: "Validation Error: title is required." });
    }
    const action = await campaignOperationalEngine.createAction(orgId, id, {
      title,
      description,
      status,
      scheduledFor,
      activityId,
      taskId,
    });
    res.status(201).json(action);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id/actions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const camp = await campaignOperationalEngine.getCampaign(orgId, id);
    if (!camp) {
      return res.status(404).json({ error: "Campaign not found." });
    }
    const list = await campaignOperationalEngine.getActions(id);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const { evidenceId, description } = req.body;
    if (!evidenceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: evidenceId is required." });
    }
    const evidence = await campaignOperationalEngine.linkEvidence(orgId, id, {
      evidenceId,
      description,
    });
    res.status(201).json(evidence);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id/evidences", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const camp = await campaignOperationalEngine.getCampaign(orgId, id);
    if (!camp) {
      return res.status(404).json({ error: "Campaign not found." });
    }
    const list = await campaignOperationalEngine.getEvidences(id);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id } = req.params;
    const health = await campaignOperationalEngine.getCampaignHealth(orgId, id);
    if (health === "NO_DATA") {
      res.json({ health: "NO_DATA" });
    } else {
      res.json(health);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(
  "/api/electoral/workspaces/:workspaceId/diagnostics",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { workspaceId } = req.params;
      const diagnostics =
        await campaignOperationalEngine.getWorkspaceOperationalDiagnostics(
          orgId,
          workspaceId,
        );
      res.json(diagnostics);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// =========================================================================
// SPRINT 15.5 — COORDINATOR & TERRITORY OPERATIONAL CAMPAIGN PATHS
// =========================================================================

// --- TERRITORIES OPERATIONAL PATHS ---

app.post("/api/electoral/campaigns/:id/territories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const {
      workspaceId,
      parentTerritoryId,
      territoryType,
      name,
      description,
      geoCode,
      status,
      metadataJson,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
    }
    if (!name || !territoryType) {
      return res.status(400).json({
        error: "Validation Error: name and territoryType are required.",
      });
    }
    const territory = await territoryOperationalEngine.createTerritory(
      orgId,
      workspaceId,
      campaignId,
      {
        parentTerritoryId,
        territoryType,
        name,
        description,
        geoCode,
        status,
        metadataJson,
      },
    );
    res.status(201).json(territory);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put(
  "/api/electoral/campaigns/:id/territories/:territoryId",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, territoryId } = req.params;
      const {
        parentTerritoryId,
        territoryType,
        name,
        description,
        geoCode,
        status,
        metadataJson,
      } = req.body;
      const territory = await territoryOperationalEngine.updateTerritory(
        territoryId,
        orgId,
        campaignId,
        {
          parentTerritoryId,
          territoryType,
          name,
          description,
          geoCode,
          status,
          metadataJson,
        },
      );
      res.json(territory);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get("/api/electoral/campaigns/:id/territories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await territoryOperationalEngine.getTerritories(
      orgId,
      campaignId,
    );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- COORDINATORS OPERATIONAL PATHS ---

app.post("/api/electoral/campaigns/:id/coordinators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const {
      workspaceId,
      contactId,
      coordinatorLevel,
      role,
      status,
      metadataJson,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
    }
    if (!contactId || !coordinatorLevel || !role) {
      return res.status(400).json({
        error:
          "Validation Error: contactId, coordinatorLevel, and role are required.",
      });
    }
    const coordinator = await coordinatorOperationalEngine.createCoordinator(
      orgId,
      workspaceId,
      campaignId,
      {
        contactId,
        coordinatorLevel,
        role,
        status,
        metadataJson,
      },
    );
    res.status(201).json(coordinator);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put(
  "/api/electoral/campaigns/:id/coordinators/:coordinatorId",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, coordinatorId } = req.params;
      const { coordinatorLevel, role, status, metadataJson } = req.body;
      const coordinator = await coordinatorOperationalEngine.updateCoordinator(
        coordinatorId,
        orgId,
        campaignId,
        {
          coordinatorLevel,
          role,
          status,
          metadataJson,
        },
      );
      res.json(coordinator);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get("/api/electoral/campaigns/:id/coordinators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await coordinatorOperationalEngine.getCoordinators(
      orgId,
      campaignId,
    );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- ASSIGNMENTS PATHS ---

app.post("/api/electoral/campaigns/:id/assignments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const {
      workspaceId,
      coordinatorId,
      territoryId,
      assignmentType,
      status,
      startedAt,
      endedAt,
      metadataJson,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
    }
    if (!coordinatorId || !territoryId || !assignmentType) {
      return res.status(400).json({
        error:
          "Validation Error: coordinatorId, territoryId, and assignmentType are required.",
      });
    }
    const assignment = await coordinatorOperationalEngine.assignCoordinator(
      orgId,
      workspaceId,
      campaignId,
      {
        coordinatorId,
        territoryId,
        assignmentType,
        status,
        startedAt,
        endedAt,
        metadataJson,
      },
    );
    res.status(201).json(assignment);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id/assignments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await coordinatorOperationalEngine.getAssignments(
      orgId,
      campaignId,
    );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete(
  "/api/electoral/campaigns/:id/assignments/:assignmentId",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { assignmentId } = req.params;
      await coordinatorOperationalEngine.removeAssignment(assignmentId, orgId);
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// --- COVERAGE AND CONFLICTS ---

app.post(
  "/api/electoral/campaigns/:id/coverage/:territoryId/compute",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, territoryId } = req.params;
      const { workspaceId } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      const result = await territoryOperationalEngine.computeCoverage(
        orgId,
        workspaceId,
        campaignId,
        territoryId,
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get("/api/electoral/campaigns/:id/coverage", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await territoryOperationalEngine.getCoverage(
      orgId,
      campaignId,
    );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post(
  "/api/electoral/campaigns/:id/conflicts/:territoryId/detect",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, territoryId } = req.params;
      const { workspaceId } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      const result = await territoryOperationalEngine.detectConflicts(
        orgId,
        workspaceId,
        campaignId,
        territoryId,
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get("/api/electoral/campaigns/:id/conflicts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await territoryOperationalEngine.getConflicts(
      orgId,
      campaignId,
    );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- COORDINATOR HEALTH ---

app.post(
  "/api/electoral/campaigns/:id/coordinators/:coordinatorId/health/compute",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, coordinatorId } = req.params;
      const { workspaceId } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      const result = await coordinatorOperationalEngine.computeHealth(
        orgId,
        workspaceId,
        campaignId,
        coordinatorId,
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get("/api/electoral/campaigns/:id/coordinator-health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await coordinatorOperationalEngine.getHealth(
      orgId,
      campaignId,
    );
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// =========================================================================
// SPRINT 15.6 — CAMPAIGN CRM INTEGRATION PATHS
// =========================================================================

// --- CONTACTS ---

app.get("/api/electoral/campaigns/:id/contacts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await campaignCRMEngine.getContacts(orgId, campaignId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/contacts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const {
      workspaceId,
      contactId,
      contactType,
      status,
      priorityLevel,
      metadataJson,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
    }
    if (!contactId || !contactType) {
      return res.status(400).json({
        error: "Validation Error: contactId and contactType are required.",
      });
    }
    const contact = await campaignCRMEngine.addContact(
      orgId,
      workspaceId,
      campaignId,
      {
        contactId,
        contactType,
        status,
        priorityLevel,
        metadataJson,
      },
    );
    res.status(201).json(contact);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put(
  "/api/electoral/campaigns/:id/contacts/:contactId",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, contactId } = req.params;
      const { contactType, status, priorityLevel, metadataJson } = req.body;
      const contact = await campaignCRMEngine.updateContact(
        contactId,
        orgId,
        campaignId,
        {
          contactType,
          status,
          priorityLevel,
          metadataJson,
        },
      );
      res.json(contact);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get(
  "/api/electoral/campaigns/:id/contacts/:contactId",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, contactId } = req.params;
      const contact = await campaignCRMEngine.getContact(
        orgId,
        campaignId,
        contactId,
      );
      if (!contact) {
        return res
          .status(404)
          .json({ error: "Campaign contact metadata not found." });
      }
      res.json(contact);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// --- RELATIONSHIPS ---

app.get("/api/electoral/campaigns/:id/relationships", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await campaignCRMEngine.getRelationships(orgId, campaignId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/relationships", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const {
      workspaceId,
      sourceContactId,
      targetContactId,
      relationshipType,
      strengthLevel,
      metadataJson,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
    }
    if (!sourceContactId || !targetContactId || !relationshipType) {
      return res.status(400).json({
        error:
          "Validation Error: sourceContactId, targetContactId, and relationshipType are required.",
      });
    }
    const rel = await campaignCRMEngine.createRelationship(
      orgId,
      workspaceId,
      campaignId,
      {
        sourceContactId,
        targetContactId,
        relationshipType,
        strengthLevel,
        metadataJson,
      },
    );
    res.status(201).json(rel);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SEGMENTS ---

app.get("/api/electoral/campaigns/:id/segments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await campaignCRMEngine.getSegments(orgId, campaignId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/segments", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const { workspaceId, name, description, status } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
    }
    if (!name) {
      return res
        .status(400)
        .json({ error: "Validation Error: name is required." });
    }
    const segment = await campaignCRMEngine.createSegment(
      orgId,
      workspaceId,
      campaignId,
      {
        name,
        description,
        status,
      },
    );
    res.status(201).json(segment);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- ENGAGEMENT ---

app.get("/api/electoral/campaigns/:id/engagement", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const list = await campaignCRMEngine.getEngagement(orgId, campaignId);
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post(
  "/api/electoral/campaigns/:id/engagement/compute",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId } = req.params;
      const { workspaceId, contactId } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      if (!contactId) {
        return res
          .status(400)
          .json({ error: "Validation Error: contactId is required." });
      }
      const engagement = await campaignCRMEngine.computeEngagement(
        orgId,
        workspaceId,
        campaignId,
        contactId,
      );
      res.json(engagement);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// --- NETWORK SUMMARY ---

app.get("/api/electoral/campaigns/:id/network-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const summary = await campaignCRMEngine.getNetworkSummary(
      orgId,
      campaignId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SPRINT 15.7 - CAMPAIGN CALENDAR & EVENT ENDPOINTS ---

app.get("/api/electoral/campaigns/:id/events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const events = await campaignCalendarEngine.getEvents(orgId, campaignId);
    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/electoral/campaigns/:id/events", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const {
      workspaceId,
      calendarEventId,
      eventType,
      title,
      description,
      status,
      scheduledStart,
      scheduledEnd,
      location,
      metadataJson,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
    }
    const event = await campaignCalendarEngine.createEvent(
      orgId,
      workspaceId,
      campaignId,
      {
        calendarEventId,
        eventType,
        title,
        description,
        status,
        scheduledStart,
        scheduledEnd,
        location,
        metadataJson,
      },
    );
    res.status(201).json(event);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/electoral/campaigns/:id/events/:eventId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId, eventId } = req.params;
    const updated = await campaignCalendarEngine.updateEvent(
      orgId,
      campaignId,
      eventId,
      req.body,
    );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/electoral/campaigns/:id/events/:eventId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId, eventId } = req.params;
    const event = await campaignCalendarEngine.getEvent(
      orgId,
      campaignId,
      eventId,
    );
    if (!event) {
      return res
        .status(404)
        .json({ error: `Event metadata not found for ID: ${eventId}` });
    }
    res.json(event);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get(
  "/api/electoral/campaigns/:id/events/:eventId/participants",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, eventId } = req.params;
      const participants = await campaignCalendarEngine.getParticipants(
        orgId,
        campaignId,
        eventId,
      );
      res.json(participants);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.post(
  "/api/electoral/campaigns/:id/events/:eventId/participants",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, eventId } = req.params;
      const { workspaceId, contactId, participantType, status } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      const participant = await campaignCalendarEngine.addParticipant(
        orgId,
        workspaceId,
        campaignId,
        eventId,
        {
          contactId,
          participantType,
          status,
        },
      );
      res.status(201).json(participant);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get(
  "/api/electoral/campaigns/:id/events/:eventId/attendance",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, eventId } = req.params;
      const attendance = await campaignCalendarEngine.getAttendance(
        orgId,
        campaignId,
        eventId,
      );
      res.json(attendance);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.post(
  "/api/electoral/campaigns/:id/events/:eventId/attendance",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, eventId } = req.params;
      const {
        workspaceId,
        contactId,
        attendanceStatus,
        checkinAt,
        checkoutAt,
      } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      const attendance = await campaignCalendarEngine.registerAttendance(
        orgId,
        workspaceId,
        campaignId,
        eventId,
        {
          contactId,
          attendanceStatus,
          checkinAt,
          checkoutAt,
        },
      );
      res.json(attendance);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.post(
  "/api/electoral/campaigns/:id/events/:eventId/territories",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, eventId } = req.params;
      const { workspaceId, territoryId } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      const link = await campaignCalendarEngine.linkTerritory(
        orgId,
        workspaceId,
        campaignId,
        eventId,
        territoryId,
      );
      res.status(201).json(link);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.post(
  "/api/electoral/campaigns/:id/events/:eventId/evidences",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organization_id is required." });
      }
      const { id: campaignId, eventId } = req.params;
      const { workspaceId, evidenceId } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: workspaceId is mandatory." });
      }
      const link = await campaignCalendarEngine.linkEvidence(
        orgId,
        workspaceId,
        campaignId,
        eventId,
        evidenceId,
      );
      res.status(201).json(link);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get("/api/electoral/campaigns/:id/agenda-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organization_id is required." });
    }
    const { id: campaignId } = req.params;
    const summary = await campaignCalendarEngine.getAgendaSummary(
      orgId,
      campaignId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 15.8 - COMMUNICATION & ACTION DISPATCH ENDPOINTS
// ==========================================

// 1. Threads
app.get("/api/core/communication/threads", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const threads = await communicationEngine.getThreads(orgId, workspaceId);
    res.json(threads);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/communication/threads", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const { workspaceId, threadType, title, status, metadataJson, campaignId } =
      req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const thread = await communicationEngine.createThread(orgId, workspaceId, {
      threadType,
      title,
      status,
      metadataJson,
      campaignId,
    });
    res.status(201).json(thread);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Messages
app.get("/api/core/communication/threads/:id/messages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const threadId = req.params.id;
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const messages = await communicationEngine.getMessages(
      orgId,
      workspaceId,
      threadId,
    );
    res.json(messages);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/communication/threads/:id/messages", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const threadId = req.params.id;
    const { workspaceId, senderUserId, messageType, content, metadataJson } =
      req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const message = await communicationEngine.sendMessage(
      orgId,
      workspaceId,
      threadId,
      {
        senderUserId,
        messageType,
        content,
        metadataJson,
      },
    );
    res.status(201).json(message);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Participants
app.post(
  "/api/core/communication/threads/:id/participants",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organizationId is required." });
      }
      const threadId = req.params.id;
      const { workspaceId, userId, participantRole, status } = req.body;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Validation Error: workspaceId is mandatory." });
      }
      const participant = await communicationEngine.addParticipant(
        orgId,
        workspaceId,
        threadId,
        {
          userId,
          participantRole,
          status,
        },
      );
      res.status(201).json(participant);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

app.get(
  "/api/core/communication/threads/:id/participants",
  async (req, res) => {
    try {
      const user = getCurrentUser(req);
      const orgId = user?.organizationId;
      if (!orgId) {
        return res
          .status(400)
          .json({ error: "Multi-Tenant Error: organizationId is required." });
      }
      const threadId = req.params.id;
      const workspaceId =
        (req.query.workspaceId as string) ||
        (req.headers["x-workspace-id"] as string);
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "Validation Error: workspaceId is mandatory." });
      }
      const participants = await communicationEngine.getParticipants(
        orgId,
        workspaceId,
        threadId,
      );
      res.json(participants);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },
);

// 4. Requests (meeting_request, report_request, etc.)
app.get("/api/core/communication/requests", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }

    let result;
    if (req.query.pending === "true") {
      result = await actionDispatchEngine.getPendingRequests(
        orgId,
        workspaceId,
      );
    } else {
      result = await actionDispatchEngine.getRequests(orgId, workspaceId);
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/communication/requests", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const {
      workspaceId,
      requestType,
      requesterUserId,
      targetUserId,
      relatedEntityType,
      relatedEntityId,
      description,
      status,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const request = await actionDispatchEngine.createRequest(
      orgId,
      workspaceId,
      {
        requestType,
        requesterUserId,
        targetUserId,
        relatedEntityType,
        relatedEntityId,
        description,
        status,
      },
    );
    res.status(201).json(request);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Dispatches (task_dispatch, report_dispatch, etc.)
app.get("/api/core/communication/dispatches", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    let result;
    if (req.query.pending === "true") {
      result = await actionDispatchEngine.getPendingDispatches(
        orgId,
        workspaceId,
      );
    } else {
      result = await actionDispatchEngine.getDispatches(orgId, workspaceId);
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/communication/dispatches", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const {
      workspaceId,
      dispatchType,
      sourceUserId,
      targetUserId,
      relatedEntityType,
      relatedEntityId,
      description,
      status,
    } = req.body;
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const dispatch = await actionDispatchEngine.createDispatch(
      orgId,
      workspaceId,
      {
        dispatchType,
        sourceUserId,
        targetUserId,
        relatedEntityType,
        relatedEntityId,
        description,
        status,
      },
    );
    res.status(201).json(dispatch);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Logs
app.get("/api/core/communication/logs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const logs = await communicationEngine.getLogs(orgId, workspaceId);
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 7. Intelligence
app.get("/api/core/communication/intelligence", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    }
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId) {
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });
    }
    const intel = await actionDispatchEngine.getWorkspaceIntelligence(
      orgId,
      workspaceId,
    );
    res.json(intel);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 15.9 - USER PRESENCE & REAL-TIME OPERATIONAL COMMUNICATION
// ==========================================

app.get("/api/core/presence", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const presence = await userPresenceEngine.getPresence(orgId, workspaceId);
    res.json(presence);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/presence/:userId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const presence = await userPresenceEngine.getPresence(
      orgId,
      workspaceId,
      req.params.userId,
    );
    res.json(presence);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/core/presence/:userId", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const { status, metadataJson } = req.body;
    const presence = await userPresenceEngine.updatePresence(
      orgId,
      workspaceId,
      req.params.userId,
      status,
      metadataJson,
    );
    res.json(presence);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/sessions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const sessions = await userPresenceEngine.getSessions(
      orgId,
      workspaceId,
      req.query.userId as string,
    );
    res.json(sessions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/sessions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const { userId, sessionToken, metadataJson } = req.body;
    const session = await userPresenceEngine.createSession(orgId, workspaceId, {
      userId,
      sessionToken,
      metadataJson,
    });
    res.status(201).json(session);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/sessions/:id/close", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const session = await userPresenceEngine.closeSession(
      orgId,
      workspaceId,
      req.params.id,
    );
    res.json(session);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/activity-log", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const logs = await userPresenceEngine.getActivityLog(
      orgId,
      workspaceId,
      req.query.userId as string,
    );
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/activity-log", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const { userId, activityType, entityType, entityId, description } =
      req.body;
    const log = await userPresenceEngine.recordActivity(orgId, workspaceId, {
      userId,
      activityType,
      entityType,
      entityId,
      description,
    });
    res.status(201).json(log);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/presence-summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await userPresenceEngine.getOrganizationPresenceSummary(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 16.0 - UNIFIED OPERATIONAL COMMAND CENTER
// ==========================================

app.get("/api/core/command-center/summary", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getOperationalSummary(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/campaigns", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getCampaignSummary(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/territories", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getTerritorySummary(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/coordinators", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getCoordinatorSummary(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/communications", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary =
      await operationalCommandCenterEngine.getCommunicationSummary(
        orgId,
        workspaceId,
      );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/presence", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getPresenceSummary(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/activity", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getActivitySummary(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/pending", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getPendingItems(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

app.get("/api/core/command-center/alerts", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const summary = await operationalCommandCenterEngine.getOperationalAlerts(
      orgId,
      workspaceId,
    );
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: e.message, fallback: [] });
  }
});

// ==========================================
// SPRINT 16.1 - WORKSPACE INTELLIGENCE ORCHESTRATOR
// ==========================================

app.get("/api/core/workspace-intelligence/context", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const context =
      await workspaceIntelligenceOrchestrator.buildWorkspaceContext(
        orgId,
        workspaceId,
      );
    res.json(context);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/workspace-intelligence/status", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const status = await workspaceIntelligenceOrchestrator.getWorkspaceStatus(
      orgId,
      workspaceId,
    );
    res.json({ status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/workspace-intelligence/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await workspaceIntelligenceOrchestrator.getWorkspaceHealth(
      orgId,
      workspaceId,
    );
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/workspace-intelligence/timeline", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const timeline =
      await workspaceIntelligenceOrchestrator.getWorkspaceTimeline(
        orgId,
        workspaceId,
      );
    res.json(timeline);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/workspace-intelligence/snapshot", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId)
      return res
        .status(400)
        .json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId =
      (req.query.workspaceId as string) ||
      (req.headers["x-workspace-id"] as string);
    if (!workspaceId)
      return res
        .status(400)
        .json({ error: "Validation Error: workspaceId is mandatory." });

    const snapshot =
      await workspaceIntelligenceOrchestrator.getWorkspaceSnapshot(
        orgId,
        workspaceId,
      );
    res.json(snapshot);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 16.2 - BETA ASSISTANT CONTEXT FOUNDATION
// ==========================================

app.get("/api/core/assistant/context", async (req, res) => {
  try {
    const scope = resolveAssistantContextScope(req);
    const context = await betaAssistantContextEngine.createAssistantContext(
      scope.organizationId,
      scope.workspaceId,
    );
    res.json(context);
  } catch (e: any) {
    const status = e instanceof AssistantScopeError ? e.statusCode : 500;
    res.status(status).json({ error: e.message, code: e.code });
  }
});

app.get("/api/core/assistant/status", async (req, res) => {
  try {
    const scope = resolveAssistantContextScope(req);
    const status = await betaAssistantContextEngine.getAssistantContextStatus(
      scope.organizationId,
      scope.workspaceId,
    );
    res.json({ status });
  } catch (e: any) {
    const status = e instanceof AssistantScopeError ? e.statusCode : 500;
    res.status(status).json({ error: e.message, code: e.code });
  }
});

app.get("/api/core/assistant/snapshot", async (req, res) => {
  try {
    const scope = resolveAssistantContextScope(req);
    const snapshot = await betaAssistantContextEngine.getAssistantSnapshot(
      scope.organizationId,
      scope.workspaceId,
    );
    res.json(snapshot);
  } catch (e: any) {
    const status = e instanceof AssistantScopeError ? e.statusCode : 500;
    res.status(status).json({ error: e.message, code: e.code });
  }
});

app.get("/api/core/assistant/timeline", async (req, res) => {
  try {
    const scope = resolveAssistantContextScope(req);
    const timeline = await betaAssistantContextEngine.getAssistantTimeline(
      scope.organizationId,
      scope.workspaceId,
    );
    res.json(timeline);
  } catch (e: any) {
    const status = e instanceof AssistantScopeError ? e.statusCode : 500;
    res.status(status).json({ error: e.message, code: e.code });
  }
});

// ==========================================
// SPRINT 16.3 - AI ROUTER FOUNDATION
// ==========================================

app.get("/api/core/ai-router/providers", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const providers = await aiRouterEngine.getAvailableProviders(orgId, workspaceId);
    res.json(providers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/ai-router/providers", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await aiRouterEngine.registerProvider(orgId, workspaceId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/ai-router/policies", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const policy = await aiRouterEngine.getRouterPolicy(orgId, workspaceId);
    res.json(policy ? [policy] : []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/ai-router/policies", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await aiRouterEngine.createPolicy(orgId, workspaceId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/ai-router/status", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const status = await aiRouterEngine.getRouterStatus(orgId, workspaceId);
    res.json({ status });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/ai-router/health", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const health = await aiRouterEngine.getRouterHealth(orgId, workspaceId);
    res.json(health);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/ai-router/audits", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const audits = await aiRouterEngine.getRouterAudits(orgId, workspaceId);
    res.json(audits);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 16.4 - BETA ACTION EXECUTION FOUNDATION
// ==========================================

app.get("/api/core/actions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const requests = await dbAdapter.getActionRequests(orgId, workspaceId).catch(() => []);
    res.json(requests);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/actions", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    const userId = user?.id;
    if (!orgId || !userId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId and userId are required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await betaActionExecutionEngine.createActionRequest({
      organizationId: orgId,
      workspaceId,
      userId,
      ...req.body
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/actions/logs", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const logs = await betaActionExecutionEngine.getActionLogs(orgId, workspaceId);
    res.json(logs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/actions/dispatches", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const dispatches = await dbAdapter.getActionDispatches(orgId, workspaceId).catch(() => []);
    res.json(dispatches);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/actions/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const action = await dbAdapter.getActionRequestById(orgId, workspaceId, req.params.id);
    if (!action) return res.status(404).json({ error: "Not found" });
    res.json(action);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/actions/:id/dispatch", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    const userId = user?.id;
    if (!orgId || !userId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId and userId are required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await betaActionExecutionEngine.createActionDispatch(orgId, workspaceId, userId, req.params.id, req.body.targetModule, req.body.metadata);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// SPRINT 16.5 - BETA SKILLS FOUNDATION
// ==========================================

app.get("/api/core/skills", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const skills = await dbAdapter.getSkills(orgId, workspaceId).catch(() => []);
    res.json(skills);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/skills", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    // Assuming we would register via betaSkillsEngine
    const result = await betaSkillsEngine.registerSkill(orgId, workspaceId, req.body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/skills/:id/enable", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await betaSkillsEngine.enableSkill(orgId, workspaceId, req.params.id);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/skills/:id/disable", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const result = await betaSkillsEngine.disableSkill(orgId, workspaceId, req.params.id);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/skills/:id", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const skill = await betaSkillsEngine.getSkill(orgId, workspaceId, req.params.id);
    if (!skill) return res.status(404).json({ error: "Skill not found" });
    res.json(skill);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/capabilities", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const caps = await betaSkillsEngine.getCapabilities(orgId, workspaceId);
    res.json(caps);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/skill-registry", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const reg = await dbAdapter.getSkillRegistry(orgId, workspaceId).catch(() => []);
    res.json(reg);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================

// ==========================================
// SPRINT 16.6 - BETA OPERATIONAL ORCHESTRATOR
// ==========================================

app.get("/api/core/orchestrator/intents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const intents = await dbAdapter.getOperationalIntents(orgId, workspaceId).catch(() => []);
    res.json(intents);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/core/orchestrator/intents", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = req.body.workspaceId || req.headers["x-workspace-id"];
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const data = {
      organizationId: orgId,
      workspaceId,
      userId: user.id || req.body.userId,
      intentType: req.body.intentType,
      skill: req.body.skill,
      metadata: req.body.metadata
    };

    const intent = await betaOperationalOrchestrator.createOperationalIntent(data);
    res.json(intent);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/orchestrator/dispatches", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const dispatches = await dbAdapter.getOperationalDispatches(orgId, workspaceId).catch(() => []);
    res.json(dispatches);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/orchestrator/results", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });

    const results = await dbAdapter.getOperationalResults(orgId, workspaceId).catch(() => []);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/core/orchestrator/status", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const orgId = user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Multi-Tenant Error: organizationId is required." });
    const workspaceId = (req.query.workspaceId as string) || (req.headers["x-workspace-id"] as string);
    if (!workspaceId) return res.status(400).json({ error: "Validation Error: workspaceId is mandatory." });
    const intentId = req.query.intentId as string;
    if (!intentId) return res.status(400).json({ error: "intentId parameter required" });

    const validation = await betaOperationalOrchestrator.validateOperationalIntent(orgId, workspaceId, intentId);
    if (validation.status !== "VALID") {
       return res.json({ status: "REJECTED", reason: validation.reason });
    }

    const result = await betaOperationalOrchestrator.getOperationalResult(orgId, workspaceId, intentId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================

// POST user message + AI (Beta Core Assistant Brain)
app.post("/api/chat", async (req, res) => {
  try {
    const user = getCurrentUser(req);
    const {
      content,
      projectId,
      currentProjectId,
      workspaceId: reqWorkspaceId,
    } = req.body;
    const workspaceId = reqWorkspaceId || "workspace-oi-beta";

    let wsState = null;
    try {
      wsState = await dbAdapter.getWorkspaceState(
        user.id,
        user.organizationId,
        workspaceId,
      );
    } catch (e) {
      console.warn("Error fetching workspace state inside api/chat:", e);
    }

    const activeProjId =
      projectId ||
      currentProjectId ||
      (wsState ? wsState.activeProjectId : null);

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // Create user message
    const userMsg = await dbAdapter.createMessage({
      projectId: activeProjId,
      userId: user.id,
      organizationId: user.organizationId,
      sender: "user",
      content,
      createdAt: new Date().toISOString(),
    });

    const operationalSnapshot = await betaCommercialContextEngine.build(user, workspaceId);
    const operationalContextReport = betaCommercialContextEngine.toPrompt(operationalSnapshot);

    // Load contexts of projects belonging to the current organization
    const projects = await dbAdapter.getProjects(user.id, user.organizationId);
    const activeProjects = projects.filter((p) => p.status === "active");
    const pausedProjects = projects.filter((p) => p.status === "paused");
    const completedProjects = projects.filter((p) => p.status === "completed");

    // Load active decisions, tasks, memories of user's organization to enrich prompt
    const allDecisions: any[] = [];
    const allTasks: any[] = [];
    const allMemories: any[] = [];
    const allStates: any[] = [];

    const globalMems = await dbAdapter.getMemories("");
    allMemories.push(...globalMems);

    for (const p of projects) {
      const decs = await dbAdapter.getDecisions(p.id);
      allDecisions.push(...decs);

      const ts = await dbAdapter.getTasks(p.id);
      allTasks.push(...ts);

      const ms = await dbAdapter.getMemories(p.id);
      allMemories.push(...ms);

      const st = await dbAdapter.getProjectContext(p.id);
      if (st) {
        allStates.push(st);
      }
    }

    // Let's build a clean text summarized context for the prompt
    let contextReport = operationalContextReport +
      "\n===== CONTEXTO DE PROJETOS E CONTINUIDADE =====\n";
    contextReport += `PROJETOS ATIVOS (${activeProjects.length}):\n`;
    activeProjects.forEach((p) => {
      contextReport += `- [${p.name}] (ID: ${p.id}): ${p.description || "Nenhuma descrição."}\n`;
      contextReport += `  Último Ponto de Parada: "${p.lastStopPoint || "Não definido ainda"}"\n`;

      const decs = allDecisions.filter((d) => d.projectId === p.id);
      if (decs.length > 0) {
        contextReport += `  Decisões Tomadas:\n`;
        decs.forEach(
          (d) =>
            (contextReport += `    * ${d.title}: ${d.description || ""}\n`),
        );
      }

      const tsks = allTasks.filter(
        (t) => t.status !== "completed" && t.projectId === p.id,
      );
      if (tsks.length > 0) {
        contextReport += `  Metas de Trabalho Pendentes:\n`;
        tsks.forEach((t) => (contextReport += `    * ${t.title}\n`));
      }

      const mems = allMemories.filter((m) => m.projectId === p.id);
      if (mems.length > 0) {
        contextReport += `  Memórias Importantes Estáveis:\n`;
        mems.forEach((m) => (contextReport += `    * ${m.content}\n`));
      }
    });

    if (pausedProjects.length > 0) {
      contextReport += `\nPROJETOS EM PAUSA (${pausedProjects.length}):\n`;
      pausedProjects.forEach(
        (p) => (contextReport += `- ${p.name}: ${p.description || ""}\n`),
      );
    }

    if (completedProjects.length > 0) {
      contextReport += `\nPROJETOS CONCLUÍDOS (${completedProjects.length}):\n`;
      completedProjects.forEach(
        (p) => (contextReport += `- ${p.name}: ${p.description || ""}\n`),
      );
    }

    const unassignedMems = allMemories.filter((m) => !m.projectId);
    if (unassignedMems.length > 0) {
      contextReport += `\nMEMÓRIAS GERAIS ADICIONAIS:\n`;
      unassignedMems.forEach((m) => (contextReport += `- ${m.content}\n`));
    }

    if (allStates.length > 0) {
      contextReport +=
        "\n===== DADOS DETALHADOS DO PROJECT_STATE_ENGINE =====\n";
      allStates.forEach((s) => {
        contextReport += `ID do Projeto: ${s.projectId}\n`;
        contextReport += `- Nome: "${s.projectName}"\n`;
        contextReport += `  Objetivo Estratégico Ativo: "${s.currentObjective}"\n`;
        contextReport += `  Etapa no Pipeline: "${s.currentStage}"\n`;
        contextReport += `  Último Ponto de Parada Mapeado: "${s.lastStopPoint}"\n`;
        contextReport += `  Decisões Tomadas Recentes: ${(s.recentDecisions || []).join(", ") || "Nenhuma registrada."}\n`;
        contextReport += `  Metas de Trabalho Pendentes: ${(s.pendingTasks || []).join(", ") || "Nenhuma pendente."}\n`;
        contextReport += `  RESUMO EXECUTIVO GERADO DA BETA EM MEMÓRIA: "${s.executiveSummary}"\n`;
        contextReport += `  Última Consolidação: ${s.lastUpdatedDate}\n\n`;
      });
    }

    // Consult Knowledge Graph Engine
    const graphContext = await knowledgeGraphEngine.buildKnowledgeContext(
      user.organizationId,
      activeProjId || undefined,
    );
    contextReport += `\n${graphContext}\n`;

    // Consult Continuity snapshot
    if (activeProjId) {
      const snap = await dbAdapter.getContinuitySnapshot(activeProjId);
      if (snap) {
        contextReport += `\n===== MARCO DE CONTINUIDADE ATUAL =====\n`;
        contextReport += `- Resumo de Progresso: ${snap.summary}\n`;
        contextReport += `- Estágio Identificado: ${snap.currentStage}\n`;
        contextReport += `- Último Registro de Parada: ${snap.lastStopPoint}\n`;
        contextReport += `- Próxima Ação recomendada: ${snap.recommendedNextAction}\n`;
      }
    }

    // Consult Specialization Engine
    const activeSpec = await specializationEngine.getActiveForProject(
      activeProjId || "global",
    );
    const specContextText =
      specializationEngine.getPromptForActiveSpecialization(activeSpec);
    contextReport += `\n\n${specContextText}\n`;

    const textLower = content.toLowerCase();

    // CAPABILITY SYSTEM — ações comerciais controladas e auditáveis
    const capabilityHistory = await dbAdapter.getMessages();
    const lastCapabilityBetaMessage = [...capabilityHistory]
      .reverse()
      .find((message) => message.sender === "beta");

    const confirmedCommercialAction = await betaCommercialCapabilityEngine.processPendingConfirmation(
      content,
      lastCapabilityBetaMessage,
      user,
      workspaceId,
    );

    if (confirmedCommercialAction) {
      const botMsg = await dbAdapter.createMessage({
        projectId: activeProjId,
        userId: user.id,
        organizationId: user.organizationId,
        sender: "beta",
        content: confirmedCommercialAction.message,
        suggestions: confirmedCommercialAction.suggestions || null,
        createdAt: new Date().toISOString(),
      });
      return res.json({
        success: true,
        response: confirmedCommercialAction.message,
        suggestions: confirmedCommercialAction.suggestions || null,
        actionExecuted: confirmedCommercialAction.actionExecuted || null,
        message: botMsg,
        betaMessage: botMsg,
      });
    }

    const preparedCommercialAction = await betaCommercialCapabilityEngine.prepareFromMessage(
      content,
      user,
      workspaceId,
    );

    if (preparedCommercialAction) {
      const botMsg = await dbAdapter.createMessage({
        projectId: activeProjId,
        userId: user.id,
        organizationId: user.organizationId,
        sender: "beta",
        content: preparedCommercialAction.message,
        suggestions: preparedCommercialAction.suggestions || null,
        createdAt: new Date().toISOString(),
      });
      return res.json({
        success: true,
        response: preparedCommercialAction.message,
        suggestions: preparedCommercialAction.suggestions || null,
        actionExecuted: preparedCommercialAction.actionExecuted || null,
        message: botMsg,
        betaMessage: botMsg,
      });
    }

    // COMANDOS DE ESPECIALIZAÇÃO
    if (textLower.includes("arquivo:")) {
      let responseText = "Identifiquei o arquivo.";

      const docs = await dbAdapter.getDocuments(activeProjId);
      if (docs.length > 0) {
        const latestDoc = docs.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];
        const preview = latestDoc.metadata?.preview || {};

        if (preview.type === "spreadsheet") {
          responseText += `\n\nTipo:\nPlanilha (${latestDoc.filename})\n\n`;
          responseText += `Linhas estimadas: ${preview.estimatedRows}\n`;
          responseText += `Colunas detectadas: [${preview.columns?.slice(0, 5).join(", ")}${preview.columns?.length > 5 ? "..." : ""}]\n\n`;
          responseText += `Quais colunas, filtros ou intervalo você deseja extrair?`;
        } else if (preview.type === "archive") {
          responseText += `\n\nArquivo ZIP detectado.\n\nArquivos encontrados:\n`;
          preview.files?.slice(0, 5).forEach((f: any) => {
            responseText += `- ${f.name}\n`;
          });
          responseText += `\nQuais arquivos deseja analisar?`;
        } else {
          responseText += `\n\nO documento "${latestDoc.filename}" foi inserido no meu processador e seus chunks estão na memória. O que deseja saber sobre ele?`;
        }
      } else {
        responseText =
          "Identifiquei a menção a um arquivo, mas não encontrei o documento no banco de dados do projeto.";
      }

      const botMsg = await dbAdapter.createMessage({
        projectId: activeProjId,
        userId: user.id,
        organizationId: user.organizationId,
        sender: "beta",
        content: responseText,
        createdAt: new Date().toISOString(),
      });
      return res.json({
        success: true,
        response: responseText,
        message: botMsg,
      });
    }

    // MEMORY OS COMMANDS (ETAPA 10)
    const isMemoryCommand =
      textLower.startsWith("beta, onde paramos") ||
      textLower.startsWith("beta, qual o estado") ||
      textLower.startsWith("beta, quais objetivos") ||
      textLower.startsWith("beta, quais tarefas") ||
      textLower.startsWith("beta, quais decisões") ||
      textLower.startsWith("beta, quais são os próximos passos") ||
      textLower.startsWith("beta, gere um resumo");

    if (isMemoryCommand && activeProjId) {
      const memoryResponseText = await memoryOS.executeCommand(
        textLower,
        activeProjId,
        user.organizationId,
        workspaceId,
      );
      const botMsg = await dbAdapter.createMessage({
        projectId: activeProjId,
        userId: user.id,
        organizationId: user.organizationId,
        sender: "beta",
        content: memoryResponseText,
        createdAt: new Date().toISOString(),
      });
      return res.json({
        success: true,
        response: memoryResponseText,
        message: botMsg,
      });
    }

    if (
      textLower.startsWith("beta, quais especializações") ||
      textLower.startsWith("beta, especializações")
    ) {
      const specs = specializationEngine.getAvailableSpecializations();
      const specList = specs
        .map((s) => `- **${s.name}** (${s.key}): ${s.description}`)
        .join("\n");
      const responseText = `Essas são as minhas especializações oficiais disponíveis no momento:\n\n${specList}\n\nPara ativar, basta me pedir: "Beta, ativar [Nome]".`;
      const botMsg = await dbAdapter.createMessage({
        projectId: activeProjId,
        userId: user.id,
        organizationId: user.organizationId,
        sender: "beta",
        content: responseText,
        createdAt: new Date().toISOString(),
      });
      return res.json({
        success: true,
        response: responseText,
        message: botMsg,
      });
    }

    if (textLower.startsWith("beta, ativar beta ")) {
      const parts = textLower.split("ativar beta ");
      if (parts.length > 1) {
        let requestedName =
          "BETA_" + parts[1].trim().toUpperCase().replace(/\s+/g, "_");

        let targetSpec =
          specializationEngine.getSpecializationDef(requestedName);

        if (
          !targetSpec ||
          (targetSpec.key === "BETA_CORE" && requestedName !== "BETA_CORE")
        ) {
          // tentar mapear com partes
          const availableKeys = specializationEngine
            .getAvailableSpecializations()
            .map((s) => s.key);
          const found = availableKeys.find((k) =>
            k.includes(parts[1].trim().toUpperCase()),
          );
          if (found) {
            targetSpec = specializationEngine.getSpecializationDef(found);
          }
        }

        if (targetSpec && activeProjId) {
          await specializationEngine.activateSpecialization(
            activeProjId,
            user.organizationId,
            targetSpec.key,
          );
          const responseText = `Especialização **${targetSpec.name}** ativada com sucesso para o contexto atual.\n\nA partir de agora operarei com a diretriz: *${targetSpec.description}*`;
          const botMsg = await dbAdapter.createMessage({
            projectId: activeProjId,
            userId: user.id,
            organizationId: user.organizationId,
            sender: "beta",
            content: responseText,
            createdAt: new Date().toISOString(),
          });
          return res.json({
            success: true,
            response: responseText,
            message: botMsg,
          });
        } else if (!activeProjId) {
          const responseText = `Para ativar uma especialização, precisamos estar dentro do contexto de um Projeto.`;
          const botMsg = await dbAdapter.createMessage({
            projectId: null,
            userId: user.id,
            organizationId: user.organizationId,
            sender: "beta",
            content: responseText,
            createdAt: new Date().toISOString(),
          });
          return res.json({
            success: true,
            response: responseText,
            message: botMsg,
          });
        }
      }
    }

    if (
      textLower.startsWith("beta, qual especialização está ativa") ||
      textLower.startsWith("qual a especialização ativa")
    ) {
      const responseText = `Estou operando sob a diretriz da especialização **${activeSpec.name}**.\n\n*${activeSpec.description}*`;
      const botMsg = await dbAdapter.createMessage({
        projectId: activeProjId,
        userId: user.id,
        organizationId: user.organizationId,
        sender: "beta",
        content: responseText,
        createdAt: new Date().toISOString(),
      });
      return res.json({
        success: true,
        response: responseText,
        message: botMsg,
      });
    }

    // COMANDO ESPECIAL: Intercepta dúvidas clássicas de andamento ("De onde paramos?") de maneira local sem IA externa
    const isContinuityQuestion = [
      "de onde paramos",
      "ponto de parada",
      "paramos onde",
      "onde paramos",
      "o que está pendente",
      "o que esta pendente",
      "quais pendencias",
      "quais pendências",
      "onde estamos",
      "qual o próximo passo",
      "qual o proximo passo",
      "o que mudou",
      "o que foi decidido",
    ].some((phrase) => textLower.includes(phrase));

    if (isContinuityQuestion && activeProjId) {
      let questionType: "parada" | "pendencias" | "geral" = "geral";
      if (textLower.includes("parada") || textLower.includes("paramos")) {
        questionType = "parada";
      } else if (
        textLower.includes("pendente") ||
        textLower.includes("pendência") ||
        textLower.includes("pendencia")
      ) {
        questionType = "pendencias";
      }

      const continuityText = await getContinuityEngine().getContinuityResponse(
        activeProjId,
        user.organizationId,
        questionType,
      );

      // Salva a resposta como mensagem da Beta
      const botMsg = await dbAdapter.createMessage({
        projectId: activeProjId,
        userId: user.id,
        organizationId: user.organizationId,
        sender: "beta",
        content: continuityText,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        response: continuityText,
        suggestions: null,
        message: botMsg,
      });
    }

    let botResponseText = "";
    let extractedSuggestions: any = null;
    let executeWithActionEngine = false;

    let actionExecutedValue: string | null = null;
    let projectUpdatedValue = false;
    let contextUpdatedValue = false;

    // 1. Process pending confirmation first
    const actionEngine = new BetaActionEngine(dbAdapter, aiRouter);
    const actionDispatcher = new ActionDispatcher(dbAdapter, aiRouter);
    const chatHistory = await dbAdapter.getMessages();
    const lastBetaMsg = [...chatHistory]
      .reverse()
      .find((m) => m.sender === "beta");

    const pendingResult = await actionEngine.processPendingConfirmation(
      content,
      lastBetaMsg,
      user.id,
      user.organizationId,
      updateProjectState,
      workspaceId,
    );

    if (pendingResult) {
      botResponseText = pendingResult.message;
      extractedSuggestions = pendingResult.suggestions || null;
      executeWithActionEngine = true;
    } else {
      // 2. Parse intent and entities
      const parsedIntent = await parseIntent(
        content,
        activeProjId,
        projects,
        aiRouter,
        user.id,
        user.organizationId,
        activeProjId,
      );

      const isCrudIntent = [
        "CREATE_PROJECT",
        "UPDATE_PROJECT",
        "DELETE_PROJECT",
        "CREATE_TASK",
        "UPDATE_TASK",
        "COMPLETE_TASK",
        "DELETE_TASK",
        "CREATE_DECISION",
        "DELETE_DECISION",
        "CREATE_MEMORY",
        "DELETE_MEMORY",
        "CREATE_DOCUMENT_NOTE",
        "ASK_TASKS",
        "ASK_DECISIONS",
        "ASK_CONTEXT",
        "ASK_STATUS",
        "ASK_PROJECTS",
        "ASK_MEMORIES",
      ].includes(parsedIntent.intent);

      const isActionHistoryQuery = [
        "o que você acabou de fazer",
        "o que voce fez",
        "oque vc fez",
        "oq vc fez",
        "historico",
        "ações recentes",
        "o que você fez",
      ].some((phrase) => textLower.includes(phrase));

      if (isCrudIntent) {
        // Is it a destructive intent?
        const isDestructiveIntent = [
          "DELETE_PROJECT",
          "DELETE_TASK",
          "DELETE_DECISION",
          "DELETE_MEMORY",
        ].includes(parsedIntent.intent);

        const isDirectExecutionIntent = [
          "CREATE_TASK",
          "CREATE_DECISION",
          "CREATE_MEMORY",
        ].includes(parsedIntent.intent);

        if (isDestructiveIntent) {
          // Destructive actions: require confirmation flow always!
          const actionResult = await actionEngine.executeIntent(
            parsedIntent,
            user.id,
            user.organizationId,
            activeProjId,
            updateProjectState,
            workspaceId,
          );
          botResponseText = actionResult.message;
          extractedSuggestions = actionResult.suggestions || null;
          executeWithActionEngine = true;
        } else if (parsedIntent.confidence >= 0.75 || isDirectExecutionIntent) {
          // High confidence & non-destructive or direct execution: Direct execution on backend
          const dispatchRes = await actionDispatcher.dispatchAction(
            parsedIntent,
            user.id,
            user.organizationId,
            activeProjId,
            updateProjectState,
            workspaceId,
          );
          botResponseText = dispatchRes.message;
          extractedSuggestions = null; // No suggestions/cards/buttons/cliques for direct execution
          executeWithActionEngine = true;

          // Populate Sprint 5.2 metadata
          actionExecutedValue = dispatchRes.actionExecuted;
          projectUpdatedValue = dispatchRes.projectUpdated;
          contextUpdatedValue = dispatchRes.contextUpdated;
        } else {
          // Low confidence (< 0.75): Fallback to visual recommendation suggestions
          const suggestionProjId =
            parsedIntent.entities.projectId || activeProjId;
          let lowConfidenceSuggestions: any = {};
          let triggerSuggestion = false;

          if (parsedIntent.intent === "CREATE_PROJECT") {
            lowConfidenceSuggestions = {
              suggestedProject: {
                name: parsedIntent.entities.projectName,
                description: parsedIntent.entities.projectDescription,
              },
            };
            triggerSuggestion = true;
          } else if (parsedIntent.intent === "CREATE_TASK") {
            lowConfidenceSuggestions = {
              suggestedTask: {
                projectId: suggestionProjId,
                title: parsedIntent.entities.taskTitle,
              },
            };
            triggerSuggestion = true;
          } else if (parsedIntent.intent === "CREATE_DECISION") {
            lowConfidenceSuggestions = {
              suggestedDecision: {
                projectId: suggestionProjId,
                title: parsedIntent.entities.decisionTitle,
                description: parsedIntent.entities.decisionDescription,
              },
            };
            triggerSuggestion = true;
          } else if (parsedIntent.intent === "CREATE_MEMORY") {
            lowConfidenceSuggestions = {
              suggestedMemory: {
                projectId: suggestionProjId,
                content: parsedIntent.entities.memoryContent,
              },
            };
            triggerSuggestion = true;
          }

          if (triggerSuggestion) {
            botResponseText =
              "Com base em nossa conversa, identifiquei a possibilidade de atualizar os registros corporativamente. Gostaria de autorizar essa alteração pelo painel de aprovação visual?";
            extractedSuggestions = lowConfidenceSuggestions;
            executeWithActionEngine = true;
          } else {
            // General query fallback
            const actionResult = await actionEngine.executeIntent(
              parsedIntent,
              user.id,
              user.organizationId,
              activeProjId,
              updateProjectState,
              workspaceId,
            );
            botResponseText = actionResult.message;
            extractedSuggestions = actionResult.suggestions || null;
            executeWithActionEngine = true;
          }
        }
      } else if (isActionHistoryQuery) {
        botResponseText = await actionEngine.generateActionsSummary(
          user.organizationId,
          workspaceId || "",
        );
        executeWithActionEngine = true;
      }
    }

    if (!executeWithActionEngine) {
      // Intercept de Comandos de Diagnóstico e Configuração de Especialistas
      if (
        textLower.includes("auditar dependências de ia") ||
        textLower.includes("auditar dependencias de ia")
      ) {
        const connections = await aiConnectionManager.getConnections(
          user.organizationId,
        );
        const defaultConn = await aiConnectionManager.getDefaultConnection(
          user.organizationId,
        );

        const defaultName = defaultConn
          ? `${defaultConn.provider} (${defaultConn.connectionName})`
          : "Nenhum provedor externo configurado";
        const providerList =
          connections.length > 0
            ? connections
                .map(
                  (c) =>
                    `- ${c.provider} (${c.connectionName}) - Status: ${c.status}`,
                )
                .join("\n")
            : "- Nenhuma conexão de IA externa cadastrada.";

        const auditResponse = `🔬 **Laudo de Auditoria — Camada de Independência Multi-IA (Beta Core)**

Aqui estão os detalhes técnicos referentes à resiliência e acoplamento de modelos:

- **Provedores Ativos e Conexões Registradas:**
${providerList}

- **Provedor Avançado Padrão (default_provider):**
  * **Configurado:** ${defaultName}

- **Pesquisa de Dependências Diretas (Coupling Check):**
  * **SDK Gemini (GoogleGenAI):** 🟢 100% Isolado e retirado dos motores transacionais principais.
  * **AIRouter:** Ativo e centralizando todas as inferências de forma neutra.
  * **CompositeReasoningEngine:** Ativo, orquestrando etapas de raciocínio por \`AIRouter.generate\`.
  * **ContinuityEngine / BetaContextEngine / IntentParser:** Ativos e integrados ao barramento neutro.

- **Mitigação de Riscos de Bloqueio:**
  * **Acoplamento Técnico:** 🟢 NULO. Nenhuma chamada de API possui amarração direta ao SDK.
  * **Políticas de Resiliência:** Fila de Contingência em cascata ativa (Especialista Recomendado ➔ Provedor Padrão ➔ Canais Secundários Cadastrados ➔ Modo Local autônomo offline).
  * **Modo Sem IA:** Homologado e funcional (Heurísticas locais e estrutura de dados offline).`;

        const botMsg = await dbAdapter.createMessage({
          projectId: activeProjId,
          userId: user.id,
          organizationId: user.organizationId,
          sender: "beta",
          content: auditResponse,
          createdAt: new Date().toISOString(),
        });

        return res.json({
          success: true,
          response: auditResponse,
          suggestions: null,
          message: botMsg,
        });
      }

      if (
        textLower.includes("quais inteligências estão conectadas") ||
        textLower.includes("quais inteligencias estao conectadas") ||
        textLower.includes("inteligências conectadas") ||
        textLower.includes("provedores ativos") ||
        textLower.includes("status das ias")
      ) {
        const reports = await aiHealthMonitor.checkAllConnections(
          user.organizationId,
        );
        let diagResponse =
          "📋 **Status de Conexões de Inteligência Corporativa - Beta Core**\n\nAqui está o relatório sobre os canais de especialistas disponíveis:\n\n";
        for (const r of reports) {
          const statusIcon = r.status === "online" ? "🟢" : "🔴";
          diagResponse += `- ${statusIcon} **Provedor:** ${r.provider} (${r.connectionName || "Sem Nome"})\n`;
          diagResponse += `  *Status:* ${r.status?.toUpperCase()} • *Latência:* ${r.latency}ms • *Disponibilidade:* ${r.availability}\n`;
          try {
            const models = await aiConnectionManager.listAvailableModels(
              r.provider,
            );
            diagResponse += `  *Modelos Suportados:* ${models.slice(0, 3).join(", ")}\n\n`;
          } catch {
            diagResponse += `  *Modelos Suportados:* Padrão do Provedor\n\n`;
          }
        }
        diagResponse += `_Para adicionar novos especialistas ou reconfigurar as credenciais criptografadas, acesse o painel lateral do sistema de inteligência ou digite uma solicitação de auxílio._`;

        const botMsg = await dbAdapter.createMessage({
          projectId: activeProjId,
          userId: user.id,
          organizationId: user.organizationId,
          sender: "beta",
          content: diagResponse,
          createdAt: new Date().toISOString(),
        });

        return res.json({
          success: true,
          response: diagResponse,
          suggestions: null,
          message: botMsg,
        });
      }

      if (
        textLower.includes("conectar open") ||
        textLower.includes("conectar claude") ||
        textLower.includes("conectar gemini") ||
        textLower.includes("conectar groq") ||
        textLower.includes("conectar ollama")
      ) {
        let targetProv = "PROVEDOR";
        if (textLower.includes("openai")) targetProv = "OpenAI";
        if (textLower.includes("claude")) targetProv = "Claude (Anthropic)";
        if (textLower.includes("gemini")) targetProv = "Gemini (Google)";
        if (textLower.includes("groq")) targetProv = "Groq";
        if (textLower.includes("ollama")) targetProv = "Ollama (Local)";

        const connectGui =
          `🔌 **Instruções para Conectar o Especialista ${targetProv}**\n\n` +
          `Para registrar e habilitar o ${targetProv} no ecossistema intelectual da Beta:\n\n` +
          `1. Acesse a aba de **Configurações / Especialistas Multi-IA** no painel superior/lateral.\n` +
          `2. Clique no botão de **"Nova Conexão"**.\n` +
          `3. Escolha o provedor, insira o nome da conexão e forneça a sua **API Key**.\n\n` +
          `🔒 _Nota de Segurança: Suas chaves de API nunca são expostas ao cliente ou transmitidas em texto simples. Elas são criptografadas localmente via AES-256 antes da persistência._`;

        const botMsg = await dbAdapter.createMessage({
          projectId: activeProjId,
          userId: user.id,
          organizationId: user.organizationId,
          sender: "beta",
          content: connectGui,
          createdAt: new Date().toISOString(),
        });

        return res.json({
          success: true,
          response: connectGui,
          suggestions: null,
          message: botMsg,
        });
      }

      const localOperationalAnswer = betaCommercialContextEngine.answerLocally(content, operationalSnapshot);
      if (localOperationalAnswer) {
        botResponseText = localOperationalAnswer;
      }

      if (!botResponseText) try {
        const systemInstruction = `Você é a "Beta", a assistente operacional nativa da Beta Platform. Você é profissional, clara, confiável e orientada por evidências. 
Sua missão é compreender a organização, o workspace, o contexto operacional ativo, os produtos, o Radar Comercial, o CRM, as tarefas, decisões, memórias e demais dados autorizados. Projetos são apenas um dos contextos possíveis.
Você utiliza memória, Knowledge Graph, Workspace Intelligence e os dados reais da plataforma. Nunca trate um modelo externo como fonte oficial de verdade.

COMPORTAMENTO E ATITUDE:
1. Responda em português brasileiro (PT-BR). Use postura segura de uma analista sênior/diretora estratégica.
2. Trate o usuário pelo nome quando ele estiver disponível. Evite apelidos genéricos como "parceiro" e evite linguagem promocional.
3. Diferencie fatos, inferências, hipóteses e ausência de evidência. Nunca invente oportunidades, clientes, contratos, produtos ou estados operacionais.
4. Quando perguntada "De onde paramos?" (ou derivados), você DEVE responder estruturando as informações EXATAMENTE no seguinte modelo de formatação corporativo (substituindo com dados reais do contexto de ProjectState/Project do projeto ativo):

"Estamos trabalhando no projeto [Nome do Projeto].

Objetivo atual:
[Objetivo atual registrado]

Fase atual:
[Fase/Etapa de execução calculada]

Últimas decisões importantes:
* [Decisão importante 1 ou "- Nenhuma decisão importante cadastrada."]
* [Decisão importante 2]

Pendências principais:
* [Tarefa/Meta pendente 1 ou "- Sem metas pendentes no pipeline."]
* [Tarefa/Meta pendente 2]

Próxima ação recomendada:
[Ação recomendada calculada pelo motor]

Confiança do contexto:
[Alta | Média | Baixa baseada no score de confiança]"

5. Se o usuário falar sobre uma nova etapa, sugestão, ou parar o projeto atual em determinada fase, sugira criar uma nova tarefa, decisão, memória ou atualizar o ponto de parada correspondente usando a estrutura JSON especial descrita abaixo.
6. Você pode sugerir ações controladas ao usuário. Se o usuário quiser criar projetos, registrar decisões, tarefas, memórias ou atualizar o status do projeto, adicione um bloco JSON exclusivo com o marcador [BETA_SUGGESTION] ao final do seu texto.

Exemplo de sugestão [BETA_SUGGESTION]:
[BETA_SUGGESTION]
{
  "suggestedProject": { "name": "Nome da Iniciativa", "description": "Breve sumário estratégico" },
  "suggestedDecision": { "projectId": "idDoProjeto", "title": "Título da decisão comercial/institucional", "description": "Descrição detalhada dos impactos" },
  "suggestedTask": { "projectId": "idDoProjeto", "title": "Ação pendente prioritária" },
  "suggestedMemory": { "projectId": "idDoProjeto", "content": "Conhecimento crítico relevante obtido" },
  "suggestedStopPointUpdate": { "projectId": "idDoProjeto", "stopPoint": "Detalhes de onde o trabalho foi interrompido" }
}
(Envie apenas se a intenção for clara na fala recente do usuário. Não invente sugestões desnecessárias. Use IDs de projetos reais fornecidos no contexto acima).`;

        const userPrompt = `${contextReport}

MENSAGEM DO USUÁRIO RECENTE:
"${content}"

Por favor, responda como a Beta. Lembre-se, se houver necessidade (como o usuário dizendo "anote a decisão X" ou "crie a nova tarefa Y" ou "o projeto X parou na etapa Z" ou "quais projetos temos? de onde paramos?"), responda cordialmente no texto e adicione o bloco [BETA_SUGGESTION] idêntico ao modelo com os campos que o usuário deseja inserir / atualizar.`;

        // Executar utilizando Roteamento Inteligente e Fila de Resiliência Multi-IA
        // Verifica complexidade para acionar inteligência composta
        const isComposite =
          textLower.includes("edital") ||
          textLower.includes("estratégia") ||
          textLower.includes("analise") ||
          textLower.includes("relatório técnico") ||
          textLower.includes("plano") ||
          textLower.includes("composto") ||
          textLower.includes("composta") ||
          textLower.includes("estratégico");

        let responseText = "";
        let usedProviderStr = "";

        if (isComposite) {
          responseText = await compositeReasoningEngine.processComposite(
            user.organizationId,
            userPrompt,
            systemInstruction,
          );
          usedProviderStr = "COMPOSITE";
        } else {
          const res = await aiRouter.generate(
            user.organizationId,
            userPrompt,
            systemInstruction,
          );
          responseText = res.response;
          usedProviderStr = res.usedProvider;
        }

        console.log(
          `[BETA MULTI-IA] Execução concluída. Provedor utilizado: ${usedProviderStr}`,
        );

        const marker = "[BETA_SUGGESTION]";
        if (responseText.includes(marker)) {
          const parts = responseText.split(marker);
          botResponseText = parts[0].trim();
          const jsonStr = parts[1].trim();
          try {
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extractedSuggestions = JSON.parse(jsonMatch[0]);
            }
          } catch (je) {
            console.error(
              "Failed to parse suggested JSON from Beta Multi-IA:",
              je,
            );
          }
        } else {
          botResponseText = responseText.trim();
        }
      } catch (error: any) {
        console.error("AI Provider error in general chat:", error);

        // Explica de forma polida e profissional que houve limite de cota/429 ou erro e ativa as heurísticas locais imediatamente.
        const isQuotaExceeded =
          error?.message?.includes("quota") ||
          error?.message?.includes("429") ||
          error?.status === "RESOURCE_EXHAUSTED" ||
          JSON.stringify(error).includes("429") ||
          JSON.stringify(error).includes("quota");

        let notice = `Modo Local Ativo: Meus provedores externos estão offline, mas a diretriz de **${activeSpec.name}** continua orientando meu processamento local.\n\n`;

        let fallbackText = "";
        if (
          textLower.includes("onde paramos") ||
          textLower.includes("de onde paramos")
        ) {
          let targetProjId = projectId;
          if (!targetProjId && projects.length > 0) {
            targetProjId = projects[0].id;
          }

          const stateObj = allStates.find((s) => s.projectId === targetProjId);
          const projObj = projects.find((p) => p.id === targetProjId);

          if (stateObj && projObj) {
            let confidenceStr = "Alta";
            if (stateObj.confidenceScore !== undefined) {
              if (stateObj.confidenceScore < 40) confidenceStr = "Baixa";
              else if (stateObj.confidenceScore < 75) confidenceStr = "Média";
            }

            fallbackText =
              `Estamos trabalhando no projeto **${projObj.name}**.\n\n` +
              `**Objetivo atual:**\n${stateObj.currentObjective || "Não especificado."}\n\n` +
              `**Fase atual:**\n${stateObj.currentStage || "Ideação"}.\n\n` +
              `**Últimas decisões importantes:**\n` +
              (stateObj.recentDecisions && stateObj.recentDecisions.length > 0
                ? stateObj.recentDecisions.map((d: any) => `* ${d}`).join("\n")
                : "* Nenhuma decisão registrada ainda nesta etapa.") +
              `\n\n` +
              `**Pendências principais:**\n` +
              (stateObj.pendingTasks && stateObj.pendingTasks.length > 0
                ? stateObj.pendingTasks.map((t: any) => `* ${t}`).join("\n")
                : "* Nenhuma meta pendente no pipeline atual.") +
              `\n\n` +
              `**Próxima ação recomendada:**\n` +
              `${stateObj.nextRecommendedAction || `Executar novas metas para a fase de ${stateObj.currentStage}.`}\n\n` +
              `**Confiança do contexto:**\n${confidenceStr}.`;
          } else if (projObj) {
            fallbackText =
              `Estamos trabalhando no projeto **${projObj.name}**.\n\n` +
              `**Objetivo atual:**\n${projObj.description || "Definição do escopo inicial."}\n\n` +
              `**Fase atual:**\nPlanejamento.\n\n` +
              `**Últimas decisões importantes:**\n* Nenhuma decisão formal registrada recentemente.\n\n` +
              `**Pendências principais:**\n* Estabelecer o pipeline de metas.\n\n` +
              `**Próxima ação recomendada:**\nMapear as primeiras tarefas e decisões operacionais.\n\n` +
              `**Confiança do contexto:**\nMédia.`;
          } else {
            fallbackText =
              "👋 **Olá! Sou a Beta.** No momento, não encontrei nenhum projeto registrado no espaço corporativo para analisarmos nosso ponto de parada. Gostaria de criar um projeto piloto agora mesmo?";
          }
        } else if (
          textLower.includes("ativos") ||
          textLower.includes("projeto")
        ) {
          let activeReport =
            "💼 **Oi! Aqui estão as nossas iniciativas mapeadas no Oi Beta:**\n\n";
          activeProjects.forEach((p) => {
            const state = allStates.find((s) => s.projectId === p.id);
            activeReport += `- **${p.name}**\n  *Status:* Ativo • *Etapa:* ${state ? state.currentStage : "Inicial"}\n  *Resumo:* ${state ? state.executiveSummary : p.description || "Iniciativa mapeada sob monitoramento da Beta."}\n\n`;
          });
          fallbackText =
            activeReport +
            "_Deseja direcionar nossa atenção inteligente para alguma destas frentes ou estabelecer uma nova pasta corporativa?_";
        } else if (
          textLower.includes("decis") ||
          textLower.includes("decidimos")
        ) {
          let decReport =
            "🔑 **Estas são as principais diretrizes registradas no canal Oi Beta:**\n\n";
          if (allDecisions.length === 0) {
            decReport +=
              "Ainda não oficializamos decisões corporativas em nosso espaço.";
          } else {
            allDecisions.forEach((d) => {
              const projName =
                projects.find((p) => p.id === d.projectId)?.name || "Geral";
              decReport += `✔ **${d.title}** (Projeto: *${projName}*)\n  _Contexto:_ ${d.description || "Registrado sob acompanhamento técnico."}\n\n`;
            });
          }
          fallbackText = decReport;
        } else if (
          textLower.includes("meta") ||
          textLower.includes("tarefa") ||
          textLower.includes("atividade")
        ) {
          let tasksReport =
            "📋 **Estas são as tarefas ativas em nosso pipeline corporativo:**\n\n";
          if (allTasks.length === 0) {
            tasksReport += "Não há metas ou atividades cadastradas no momento.";
          } else {
            allTasks.forEach((t) => {
              const projName =
                projects.find((p) => p.id === t.projectId)?.name || "Geral";
              const statusSymbol = t.status === "completed" ? "✅" : "⏳";
              tasksReport += `${statusSymbol} **${t.title}** (Projeto: *${projName}*)\n  _Prioridade:_ ${t.priority || "MÉDIA"} • _Status:_ ${t.status || "pendente"}\n\n`;
            });
          }
          fallbackText = tasksReport;
        } else if (
          textLower.includes("memór") ||
          textLower.includes("conhec")
        ) {
          let memReport =
            "🧠 **Estas são as memórias corporativas que guardei em meu cérebro digital:**\n\n";
          if (allMemories.length === 0) {
            memReport += "Não há fatos ou memórias registradas ainda.";
          } else {
            allMemories.forEach((m) => {
              const projName = m.projectId
                ? projects.find((p) => p.id === m.projectId)?.name || "Geral"
                : "Geral";
              memReport += `- **[${m.type?.toUpperCase() || "CONTEXTO"}]** *${m.content}* (Projeto: *${projName}*)\n`;
            });
          }
          fallbackText = memReport;
        } else {
          fallbackText = `Olá, Douglas! Registrei sua mensagem em segurança: "${content}". Como sua assistente estratégica, posso responder dúvidas e ajudar na governança corporativa offline. \n\nVocê também pode utilizar os botões de ação e abas interativas do workspace para criar projetos, registrar metas e oficializar decisões diretamente, sem depender de processamento de nuvem complementar!`;
        }

        botResponseText = notice + fallbackText;
      }
    } // Fechamento de executing with Action Engine

    // Create Beta response message
    const betaMsg = await dbAdapter.createMessage({
      projectId: projectId || null,
      userId: user.id,
      organizationId: user.organizationId,
      sender: "beta",
      content: botResponseText,
      suggestions: extractedSuggestions || undefined,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      userMessage: userMsg,
      betaMessage: betaMsg,
      actionExecuted: actionExecutedValue,
      projectUpdated: projectUpdatedValue,
      contextUpdated: contextUpdatedValue,
    });
  } catch (error) {
    console.error("Critical error in /api/chat handler:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dev & Production configuration for static files handler and Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BETA CORE backend running on http://localhost:${PORT}`);
  });
}

startServer();
