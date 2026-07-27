import { DatabaseAdapter } from "../../server/database/DatabaseAdapter";

export type NodeType =
  | "USER"
  | "ORGANIZATION"
  | "PROJECT"
  | "OBJECTIVE"
  | "TASK"
  | "DECISION"
  | "DOCUMENT"
  | "MEMORY"
  | "KNOWLEDGE"
  | "GENERATED_CHUNK"
  | "OUTPUT"
  | "GOVERNMENT_ENTITY"
  | "CONTRACT"
  | "BID"
  | "AGREEMENT"
  | "PROGRAM"
  | "INDICATOR"
  | "PUBLIC_POLICY"
  | "NOTICE"
  | "SUPPLIER"
  | "LOT"
  | "ITEM"
  | "PROPOSAL"
  | "AWARD"
  | "HOMOLOGATION"
  | "PRICE_REGISTRY"
  | "PROCUREMENT_PROCESS"
  | "PURCHASE_REQUEST"
  | "CAMPAIGN"
  | "CANDIDATE"
  | "COORDINATOR"
  | "TERRITORY"
  | "VOTING_LOCATION"
  | "ELECTION"
  | "OPPONENT"
  | "POLITICAL_GROUP"
  | "LEADERSHIP"
  | "SUPPORTER"
  | "ELECTORAL_ANALYSIS"
  | "CAMPAIGN_OBJECTIVE"
  | "CAMPAIGN_TASK"
  | "CONTACT"
  | "SEGMENT"
  | "EVENT"
  | "EVIDENCE"
  | "THREAD"
  | "MESSAGE"
  | "REQUEST"
  | "DISPATCH"
  | "SESSION"
  | "PRESENCE"
  | "ACTIVITY"
  | "OPERATIONAL_SUMMARY"
  | "WORKSPACE_CONTEXT"
  | "WORKSPACE_STATUS"
  | "WORKSPACE_SNAPSHOT"
  | "ASSISTANT_CONTEXT"
  | "ASSISTANT_SNAPSHOT"
  | "AI_PROVIDER"
  | "AI_ROUTER_POLICY"
  | "AI_ROUTER_REQUEST"
  | "BETA_ACTION"
  | "BETA_MODULE"
  | "BETA_SKILL"
  | "BETA_CAPABILITY"
  | "MEMBER"
  | "OPERATIONAL_INTENT"
  | "OPERATIONAL_DISPATCH"
  | "GovernmentObjective"
  | "GovernmentProgram"
  | "GovernmentProject"
  | "GovernmentAction"
  | "GovernmentIndicator"
  | "GovernmentGoal"
  | "GovernmentResult"
  | "GovernmentWorkspace"
  | "GovernmentPerformance"
  | "GovernmentReport"
  | "GovernmentExecutiveBrief"
  | "GovernmentMonitoringSnapshot"
  | "GovernmentSummary"
  | "GovernmentGovernanceReview"
  | "GovernmentExecutiveMeeting"
  | "GovernmentStrategicCycle"
  | "GovernmentDecision"
  | "GovernmentMonitoringReview"
  | "ProcurementWorkspace"
  | "ProcurementOpportunity"
  | "ProcurementBid"
  | "ProcurementParticipation"
  | "ProcurementLot"
  | "ProcurementProposal"
  | "ProcurementContract"
  | "ProcurementContractExecution"
  | "ProcurementInspection"
  | "ProcurementDelivery"
  | "ProcurementMeasurement"
  | "ProcurementContractIssue"
  | "ProcurementSupplier"
  | "ProcurementSupplierDocument"
  | "ProcurementSupplierCertificate"
  | "ProcurementSupplierQualification"
  | "ProcurementSupplierRegistry"
  | "ProcurementARP"
  | "ProcurementARPItem"
  | "ProcurementARPConsumption"
  | "ProcurementARPParticipant"
  | "ProcurementARPCarona"
  | "ProcurementAuditEvent"
  | "ProcurementComplianceEvent"
  | "ProcurementReport"
  | "ProcurementExecutiveBrief"
  | "ProcurementMonitoringSnapshot"
  | "ProcurementSummary"
  | "GovernmentParliamentarian"
  | "GovernmentAmendment"
  | "GovernmentAmendmentBeneficiary"
  | "GovernmentAmendmentDestination"
  | "GovernmentAmendmentExecution"
  | "GovernmentAmendmentMilestone"
  | "GovernmentAmendmentMonitoring"
  | "GovernmentAmendmentEvidence"
  | "GovernmentAmendmentAccountability"
  | "GovernmentAmendmentIssue"
  | "GovernmentHealthUnit"
  | "GovernmentHealthTeam"
  | "GovernmentHealthProgram"
  | "GovernmentHealthIndicator"
  | "GovernmentHealthCoverage"
  | "GovernmentHealthProduction"
  | "GovernmentHealthGoal"
  | "GovernmentHealthResult"
  | "GovernmentHealthMonitoring"
  | "GovernmentHealthEvidence"
  | "GovernmentHealthIssue"
  | "GovernmentHealthSnapshot"
  | "GovernmentEducationUnit"
  | "GovernmentEducationTeam"
  | "GovernmentEducationProgram"
  | "GovernmentEducationIndicator"
  | "GovernmentEducationCoverage"
  | "GovernmentEducationProduction"
  // Sprint 19.3
  | "GovernmentFundingOpportunity"
  | "GovernmentFundingProgram"
  | "GovernmentFundingNotice"
  | "GovernmentFundingRequirement"
  | "GovernmentFundingProposal"
  | "GovernmentFundingSubmission"
  | "GovernmentAmendmentPortfolio"
  | "GovernmentAmendmentPortfolioItem"
  | "GovernmentAmendmentPriority"
  | "GovernmentAmendmentObjective"
  | "GovernmentAmendmentActionPlan"
  | "GovernmentAmendmentFollowUp"
  | "GovernmentTransparencyPublication"
  | "GovernmentTransparencyCategory"
  | "GovernmentTransparencyDataset"
  | "GovernmentTransparencyIndicator"
  | "GovernmentTransparencyDocument"
  | "GovernmentTransparencyReport"
  | "GovernmentOmbudsmanRequest"
  | "GovernmentOmbudsmanCategory"
  | "GovernmentOmbudsmanProtocol"
  | "GovernmentOmbudsmanResponse"
  | "GovernmentOmbudsmanAttachment"
  | "GovernmentTransparencyMetric"
  | "GovernmentTransparencyKPI"
  | "GovernmentTransparencyCompliance"
  | "GovernmentTransparencyAudit"
  | "GovernmentTransparencyMonitoring"
  | "GovernmentPublicPortal"
  | "GovernmentPublicCatalog"
  | "GovernmentPublicDataset"
  | "GovernmentPublicPublication"
  | "GovernmentPublicQuery"
  | "GovernmentPublicAccessLog"
  | "GovernmentProtocol"
  | "GovernmentProcess"
  | "GovernmentDocumentRecord"
  | "GovernmentDispatch"
  | "GovernmentRouting"
  | "GovernmentProcessStep"
  | "GovernmentProcessHistory"
  | "GovernmentDepartment"
  | "GovernmentProtocolQueue"
  | "GovernmentProcessAssignment"
  | "GovernmentProcessMovement"
  | "GovernmentProcessResponsible"
  | "GovernmentProcessSector"
  | "GovernmentWorkflow"
  | "GovernmentWorkflowStage"
  | "GovernmentWorkflowTransition"
  | "GovernmentWorkflowQueue"
  | "GovernmentWorkflowExecution"
  | "GovernmentWorkflowRoute"
  | "GovernmentDocumentVersion"
  | "GovernmentDocumentClassification"
  | "GovernmentDocumentRetention"
  | "GovernmentDocumentArchive"
  | "GovernmentDocumentMovement"
  | "GovernmentDocumentAudit"
  | "GovernmentAdministrativeIndicator"
  | "GovernmentAdministrativeAudit"
  | "GovernmentAdministrativeCompliance"
  | "GovernmentAdministrativeResponsibility"
  | "GovernmentAdministrativeMonitoring"
  | "GovernmentAdministrativeOccurrence";


export type RelationType =
  | "HAS_EDUCATION_UNIT"
  | "HAS_GOAL"
  | "HAS_RESULT"
  | "HAS_MONITORING"
  | "HAS_EVIDENCE"
  | "HAS_SNAPSHOT"
  | "HAS_HEALTH_UNIT"
  | "HAS_TEAM"
  | "HAS_COVERAGE"
  | "HAS_PRODUCTION"
  | "HAS_INDICATOR"
  // Sprint 19.3
  | "HAS_FUNDING_OPPORTUNITY"
  | "HAS_PROGRAM"
  | "HAS_NOTICE"
  | "HAS_REQUIREMENT"
  | "HAS_PROPOSAL"
  | "HAS_SUBMISSION"
  // Sprint 19.4
  | "HAS_AMENDMENT_PORTFOLIO"
  | "HAS_PORTFOLIO_ITEM"
  | "HAS_PRIORITY"
  | "HAS_OBJECTIVE"
  | "HAS_ACTION_PLAN"
  | "HAS_FOLLOWUP"
  | "HAS_TRANSPARENCY_PUBLICATION"
  | "HAS_CATEGORY" 
  | "HAS_DATASET" 
  | "HAS_INDICATOR" 
  | "HAS_DOCUMENT" 
  | "HAS_REPORT"
  | "HAS_OMBUDSMAN_REQUEST"
  | "HAS_PROTOCOL"
  | "HAS_RESPONSE"
  | "HAS_ATTACHMENT"
  | "BELONGS_TO"
  | "CREATED_BY"
  | "RELATED_TO"
  | "SUPPORTS"
  | "DEPENDS_ON"
  | "HAS_DOCUMENT"
  | "HAS_CERTIFICATE"
  | "HAS_QUALIFICATION"
  | "HAS_REGISTRY"
  | "HAS_EXECUTION"
  | "HAS_INSPECTION"
  | "HAS_DELIVERY"
  | "HAS_MEASUREMENT"
  | "HAS_ISSUE"
  | "GENERATED_FROM"
  | "PART_OF"
  | "REFERENCES"
  | "DOCUMENT_OUTPUT"
  | "GENERATED_CHUNK"
  | "PROCESSED_BY"
  | "BLOCKS"
  | "AFFECTS"
  | "MITIGATES"
  | "CRITICAL_FOR"
  | "RISK_OF"
  | "MANAGES"
  | "EXECUTES"
  | "FUNDS"
  | "SUPERVISES"
  | "CONTRACTS"
  | "IMPLEMENTS"
  | "REPORTS_TO"
  | "ASSOCIATED_WITH"
  | "PUBLISHED_BY"
  | "CONTAINS"
  | "SUBMITTED_BY"
  | "AWARDED_TO"
  | "PARTICIPATES_IN"
  | "RESULTED_IN"
  | "HOMOLOGATED_BY"
  | "SUPPLIES"
  | "COORDINATES"
  | "RESPONSIBLE_FOR"
  | "COMPETES_WITH"
  | "OPERATES_IN"
  | "ANALYZES"
  | "PART_OF_CAMPAIGN"
  | "ASSIGNED_TO"
  | "COVERS_TERRITORY"
  | "OBJECTIVE_OF_CAMPAIGN"
  | "TASK_OF_CAMPAIGN"
  | "TASK_BELONGS_TO_OBJECTIVE"
  | "RESPONSIBLE_FOR_TASK"
  | "RESPONSIBLE_FOR_OBJECTIVE"
  | "RESPONSIBLE_FOR_TERRITORY"
  | "ASSIGNED_TO_CAMPAIGN"
  | "ASSIGNED_TO_TERRITORY"
  | "COVERS"
  | "LOCATED_IN"
  | "BELONGS_TO_REGION"
  | "BELONGS_TO_ZONE"
  | "RESPONSIBLE_FOR_LOCATION"
  | "RESPONSIBLE_FOR_ZONE"
  | "OPPONENT_OF"
  | "OPPOSES"
  | "BELONGS_TO_GROUP"
  | "LEADS_GROUP"
  | "INFLUENCES"
  | "ACTIVE_IN_TERRITORY"
  | "WORKS_WITH"
  | "PARTICIPATED_IN_ELECTION"
  | "RECEIVED_VOTES_IN"
  | "RAN_FOR_POSITION"
  | "BELONGS_TO_PARTY"
  | "HISTORICAL_RESULT"
  | "HAS_CONTACT"
  | "HAS_EVENT"
  | "HAS_PARTICIPANT"
  | "OCCURS_IN"
  | "HAS_EVIDENCE"
  | "SENT"
  | "REQUESTED"
  | "DISPATCHED"
  | "HAS_THREAD"
  | "HAS_SESSION"
  | "PERFORMED"
  | "HAS_PRESENCE"
  | "HAS_OPERATIONAL_STATE"
  | "CONTRIBUTES_TO"
  | "HAS_CONTEXT"
  | "HAS_STATUS"
  | "HAS_SNAPSHOT"
  | "HAS_ASSISTANT_CONTEXT"
  | "HAS_ASSISTANT_SNAPSHOT"
  | "HAS_PROVIDER"
  | "HAS_POLICY"
  | "HAS_ROUTER_REQUEST"
  | "HAS_ACTION"
  | "DISPATCHED_TO"
  | "EXECUTED_ACTION"
  | "HAS_SKILL"
  | "HAS_CAPABILITY"
  | "PROVIDED_BY"
  | "CREATED_INTENT"
  | "HAS_INTENT"
  | "USES_SKILL"
  | "PREPARED_DISPATCH"
  | "HAS_GOVERNMENT_WORKSPACE"
  | "HAS_INDICATOR"
  | "HAS_PROGRAM"
  | "HAS_CONTRACT"
  | "HAS_BID"
  | "HAS_RISK"
  | "HAS_GOAL"
  | "HAS_RESULT"
  | "HAS_PERFORMANCE"
  | "HAS_GOVERNMENT_OBJECTIVE"
  | "HAS_GOVERNMENT_PROGRAM"
  | "HAS_GOVERNMENT_PROJECT"
  | "HAS_GOVERNMENT_ACTION"
  | "HAS_REPORT"
  | "HAS_BRIEF"
  | "HAS_MONITORING"
  | "HAS_GOVERNANCE_REVIEW"
  | "HAS_EXECUTIVE_MEETING"
  | "HAS_STRATEGIC_CYCLE"
  | "HAS_DECISION"
  | "HAS_MONITORING_REVIEW"
  | "HAS_PROCUREMENT_WORKSPACE"
  | "HAS_SUPPLIER"
  | "HAS_LOT"
  | "HAS_PROPOSAL"
  | "HAS_OPPORTUNITY"
  | "HAS_PARTICIPATION"
  | "HAS_ARP"
  | "HAS_ITEM"
  | "HAS_CONSUMPTION"
  | "HAS_PARTICIPANT"
  | "HAS_CARONA"
  | "HAS_AUDIT_EVENT"
  | "HAS_COMPLIANCE_EVENT"
  | "HAS_PARLIAMENTARIAN"
  | "HAS_AMENDMENT"
  | "HAS_BENEFICIARY"
  | "HAS_DESTINATION"
  | "HAS_MILESTONE"
  | "HAS_MONITORING"
  | "HAS_EVIDENCE"
  | "HAS_ACCOUNTABILITY"
  | "HAS_TRANSPARENCY_METRIC"
  | "HAS_KPI"
  | "HAS_COMPLIANCE"
  | "HAS_AUDIT"
  | "HAS_PUBLIC_PORTAL"
  | "HAS_PUBLIC_CATALOG"
  | "HAS_PUBLIC_DATASET"
  | "HAS_PUBLIC_PUBLICATION"
  | "HAS_PUBLIC_QUERY"
  | "HAS_ACCESS_LOG"
  | "HAS_PROTOCOL"
  | "HAS_PROCESS"
  | "HAS_DOCUMENT"
  | "HAS_DISPATCH"
  | "HAS_ROUTING"
  | "HAS_PROCESS_STEP"
  | "HAS_HISTORY"
  | "HAS_DEPARTMENT"
  | "HAS_PROTOCOL_QUEUE"
  | "HAS_ASSIGNMENT"
  | "HAS_MOVEMENT"
  | "HAS_RESPONSIBLE"
  | "HAS_SECTOR"
  | "HAS_WORKFLOW"
  | "HAS_STAGE"
  | "HAS_TRANSITION"
  | "HAS_QUEUE"
  | "HAS_EXECUTION"
  | "HAS_ROUTE"
  | "HAS_VERSION"
  | "HAS_CLASSIFICATION"
  | "HAS_RETENTION"
  | "HAS_ARCHIVE"
  | "HAS_AUDIT"
  | "HAS_ADMINISTRATIVE_INDICATOR"
  | "HAS_ADMINISTRATIVE_AUDIT"
  | "HAS_ADMINISTRATIVE_COMPLIANCE"
  | "HAS_ADMINISTRATIVE_RESPONSIBILITY"
  | "HAS_ADMINISTRATIVE_MONITORING"
  | "HAS_ADMINISTRATIVE_OCCURRENCE";


export const VALID_NODE_TYPES = new Set<string>([
  "USER", "ORGANIZATION", "PROJECT", "OBJECTIVE", "TASK", "DECISION", "DOCUMENT", "MEMORY", "KNOWLEDGE", "GENERATED_CHUNK", "OUTPUT", "GOVERNMENT_ENTITY", "CONTRACT", "BID", "AGREEMENT", "PROGRAM", "INDICATOR", "PUBLIC_POLICY", "NOTICE", "SUPPLIER", "LOT", "ITEM", "PROPOSAL", "AWARD", "HOMOLOGATION", "PRICE_REGISTRY", "PROCUREMENT_PROCESS", "PURCHASE_REQUEST", "CAMPAIGN", "CANDIDATE", "COORDINATOR", "TERRITORY", "VOTING_LOCATION", "ELECTION", "OPPONENT", "POLITICAL_GROUP", "LEADERSHIP", "SUPPORTER", "ELECTORAL_ANALYSIS", "CAMPAIGN_OBJECTIVE", "CAMPAIGN_TASK", "CONTACT", "SEGMENT", "EVENT", "EVIDENCE", "THREAD", "MESSAGE", "REQUEST", "DISPATCH", "SESSION", "PRESENCE", "ACTIVITY", "OPERATIONAL_SUMMARY", "WORKSPACE_CONTEXT", "WORKSPACE_STATUS", "WORKSPACE_SNAPSHOT", "ASSISTANT_CONTEXT", "ASSISTANT_SNAPSHOT", "AI_PROVIDER", "AI_ROUTER_POLICY", "AI_ROUTER_REQUEST", "BETA_ACTION", "BETA_MODULE", "BETA_SKILL", "BETA_CAPABILITY", "MEMBER", "OPERATIONAL_INTENT", "OPERATIONAL_DISPATCH",
  "GovernmentObjective", "GovernmentProgram", "GovernmentProject", "GovernmentAction", "GovernmentIndicator", "GovernmentGoal", "GovernmentResult", "GovernmentWorkspace", "GovernmentPerformance", "GovernmentReport", "GovernmentExecutiveBrief", "GovernmentMonitoringSnapshot", "GovernmentSummary", "GovernmentGovernanceReview", "GovernmentExecutiveMeeting", "GovernmentStrategicCycle", "GovernmentDecision", "GovernmentMonitoringReview",
  "ProcurementWorkspace", "ProcurementOpportunity", "ProcurementBid", "ProcurementParticipation", "ProcurementLot", "ProcurementProposal", "ProcurementContract", "ProcurementContractExecution", "ProcurementInspection", "ProcurementDelivery", "ProcurementMeasurement", "ProcurementContractIssue", "ProcurementSupplier", "ProcurementSupplierDocument", "ProcurementSupplierCertificate", "ProcurementSupplierQualification", "ProcurementSupplierRegistry", "ProcurementARP", "ProcurementARPItem", "ProcurementARPConsumption", "ProcurementARPParticipant", "ProcurementARPCarona", "ProcurementAuditEvent", "ProcurementComplianceEvent", "ProcurementReport", "ProcurementExecutiveBrief", "ProcurementMonitoringSnapshot", "ProcurementSummary",
  "GovernmentParliamentarian", "GovernmentAmendment", "GovernmentAmendmentBeneficiary", "GovernmentAmendmentDestination", "GovernmentAmendmentExecution", "GovernmentAmendmentMilestone", "GovernmentAmendmentMonitoring", "GovernmentAmendmentEvidence", "GovernmentAmendmentAccountability", "GovernmentAmendmentIssue",
  "GovernmentHealthUnit", "GovernmentHealthTeam", "GovernmentHealthProgram", "GovernmentHealthIndicator", "GovernmentHealthCoverage", "GovernmentHealthProduction", "GovernmentHealthGoal", "GovernmentHealthResult", "GovernmentHealthMonitoring", "GovernmentHealthEvidence", "GovernmentHealthIssue", "GovernmentHealthSnapshot",
  "GovernmentEducationUnit", "GovernmentEducationTeam", "GovernmentEducationProgram", "GovernmentEducationIndicator", "GovernmentEducationCoverage", "GovernmentEducationProduction",
  "GovernmentFundingOpportunity", "GovernmentFundingProgram", "GovernmentFundingNotice", "GovernmentFundingRequirement", "GovernmentFundingProposal", "GovernmentFundingSubmission",
  "GovernmentAmendmentPortfolio", "GovernmentAmendmentPortfolioItem", "GovernmentAmendmentPriority", "GovernmentAmendmentObjective", "GovernmentAmendmentActionPlan", "GovernmentAmendmentFollowUp",
  "GovernmentTransparencyPublication", "GovernmentTransparencyCategory", "GovernmentTransparencyDataset", "GovernmentTransparencyIndicator", "GovernmentTransparencyDocument", "GovernmentTransparencyReport",
  "GovernmentOmbudsmanRequest", "GovernmentOmbudsmanCategory", "GovernmentOmbudsmanProtocol", "GovernmentOmbudsmanResponse", "GovernmentOmbudsmanAttachment",
  "GovernmentTransparencyMetric", "GovernmentTransparencyKPI", "GovernmentTransparencyCompliance", "GovernmentTransparencyAudit", "GovernmentTransparencyMonitoring",
  "GovernmentPublicPortal", "GovernmentPublicCatalog", "GovernmentPublicDataset", "GovernmentPublicPublication", "GovernmentPublicQuery", "GovernmentPublicAccessLog",
  "GovernmentProtocol", "GovernmentProcess", "GovernmentDocumentRecord", "GovernmentDispatch", "GovernmentRouting", "GovernmentProcessStep", "GovernmentProcessHistory", "GovernmentDepartment", "GovernmentProtocolQueue", "GovernmentProcessAssignment", "GovernmentProcessMovement", "GovernmentProcessResponsible", "GovernmentProcessSector",
  "GovernmentWorkflow", "GovernmentWorkflowStage", "GovernmentWorkflowTransition", "GovernmentWorkflowQueue", "GovernmentWorkflowExecution", "GovernmentWorkflowRoute",
  "GovernmentDocumentVersion", "GovernmentDocumentClassification", "GovernmentDocumentRetention", "GovernmentDocumentArchive", "GovernmentDocumentMovement", "GovernmentDocumentAudit",
  "GovernmentAdministrativeIndicator", "GovernmentAdministrativeAudit", "GovernmentAdministrativeCompliance", "GovernmentAdministrativeResponsibility", "GovernmentAdministrativeMonitoring", "GovernmentAdministrativeOccurrence"
]);

export const VALID_RELATION_TYPES = new Set<string>([
  "HAS_EDUCATION_UNIT", "HAS_GOAL", "HAS_RESULT", "HAS_MONITORING", "HAS_EVIDENCE", "HAS_SNAPSHOT", "HAS_HEALTH_UNIT", "HAS_TEAM", "HAS_COVERAGE", "HAS_PRODUCTION", "HAS_INDICATOR",
  "HAS_FUNDING_OPPORTUNITY", "HAS_PROGRAM", "HAS_NOTICE", "HAS_REQUIREMENT", "HAS_PROPOSAL", "HAS_SUBMISSION",
  "HAS_AMENDMENT_PORTFOLIO", "HAS_PORTFOLIO_ITEM", "HAS_PRIORITY", "HAS_OBJECTIVE", "HAS_ACTION_PLAN", "HAS_FOLLOWUP",
  "HAS_TRANSPARENCY_PUBLICATION", "HAS_CATEGORY", "HAS_DATASET", "HAS_DOCUMENT", "HAS_REPORT",
  "HAS_OMBUDSMAN_REQUEST", "HAS_PROTOCOL", "HAS_RESPONSE", "HAS_ATTACHMENT",
  "BELONGS_TO", "CREATED_BY", "RELATED_TO", "SUPPORTS", "DEPENDS_ON", "HAS_CERTIFICATE", "HAS_QUALIFICATION", "HAS_REGISTRY", "HAS_EXECUTION", "HAS_INSPECTION", "HAS_DELIVERY", "HAS_MEASUREMENT", "HAS_ISSUE", "GENERATED_FROM", "PART_OF", "REFERENCES", "DOCUMENT_OUTPUT", "GENERATED_CHUNK", "PROCESSED_BY", "BLOCKS", "AFFECTS", "MITIGATES", "CRITICAL_FOR", "RISK_OF", "MANAGES", "EXECUTES", "FUNDS", "SUPERVISES", "CONTRACTS", "IMPLEMENTS", "REPORTS_TO", "ASSOCIATED_WITH", "PUBLISHED_BY", "CONTAINS", "SUBMITTED_BY", "AWARDED_TO", "PARTICIPATES_IN", "RESULTED_IN", "HOMOLOGATED_BY", "SUPPLIES", "COORDINATES", "RESPONSIBLE_FOR", "COMPETES_WITH", "OPERATES_IN", "ANALYZES", "PART_OF_CAMPAIGN", "ASSIGNED_TO", "COVERS_TERRITORY", "OBJECTIVE_OF_CAMPAIGN", "TASK_OF_CAMPAIGN",
  "TASK_BELONGS_TO_OBJECTIVE", "RESPONSIBLE_FOR_TASK", "RESPONSIBLE_FOR_OBJECTIVE", "RESPONSIBLE_FOR_TERRITORY", "ASSIGNED_TO_CAMPAIGN", "ASSIGNED_TO_TERRITORY", "COVERS", "LOCATED_IN", "BELONGS_TO_REGION", "BELONGS_TO_ZONE", "RESPONSIBLE_FOR_LOCATION", "RESPONSIBLE_FOR_ZONE", "OPPONENT_OF", "OPPOSES", "BELONGS_TO_GROUP", "LEADS_GROUP", "INFLUENCES", "ACTIVE_IN_TERRITORY", "WORKS_WITH", "PARTICIPATED_IN_ELECTION", "RECEIVED_VOTES_IN", "RAN_FOR_POSITION", "BELONGS_TO_PARTY", "HISTORICAL_RESULT", "HAS_CONTACT", "HAS_EVENT", "HAS_PARTICIPANT", "OCCURS_IN", "SENT", "REQUESTED", "DISPATCHED", "HAS_THREAD", "HAS_SESSION", "PERFORMED", "HAS_PRESENCE", "HAS_OPERATIONAL_STATE", "CONTRIBUTES_TO", "HAS_CONTEXT", "HAS_STATUS", "HAS_ASSISTANT_CONTEXT", "HAS_ASSISTANT_SNAPSHOT", "HAS_PROVIDER", "HAS_POLICY", "HAS_ROUTER_REQUEST", "HAS_ACTION", "DISPATCHED_TO", "EXECUTED_ACTION", "HAS_SKILL", "HAS_CAPABILITY", "PROVIDED_BY", "CREATED_INTENT", "HAS_INTENT", "USES_SKILL", "PREPARED_DISPATCH", "HAS_GOVERNMENT_WORKSPACE", "HAS_GOVERNMENT_PROGRAM", "HAS_GOVERNMENT_PROJECT", "HAS_GOVERNMENT_ACTION", "HAS_BRIEF", "HAS_GOVERNANCE_REVIEW", "HAS_EXECUTIVE_MEETING", "HAS_STRATEGIC_CYCLE", "HAS_DECISION", "HAS_MONITORING_REVIEW", "HAS_PROCUREMENT_WORKSPACE", "HAS_SUPPLIER", "HAS_LOT", "HAS_PROPOSAL", "HAS_OPPORTUNITY", "HAS_PARTICIPATION", "HAS_ARP", "HAS_ITEM", "HAS_CONSUMPTION", "HAS_CARONA", "HAS_AUDIT_EVENT", "HAS_COMPLIANCE_EVENT", "HAS_PARLIAMENTARIAN", "HAS_AMENDMENT", "HAS_BENEFICIARY", "HAS_DESTINATION", "HAS_MILESTONE", "HAS_ACCOUNTABILITY", "HAS_TRANSPARENCY_METRIC", "HAS_KPI", "HAS_COMPLIANCE", "HAS_AUDIT", "HAS_PUBLIC_PORTAL", "HAS_PUBLIC_CATALOG", "HAS_PUBLIC_DATASET", "HAS_PUBLIC_PUBLICATION", "HAS_PUBLIC_QUERY", "HAS_ACCESS_LOG", "HAS_ROUTING", "HAS_PROCESS_STEP", "HAS_HISTORY", "HAS_DEPARTMENT", "HAS_PROTOCOL_QUEUE", "HAS_ASSIGNMENT", "HAS_MOVEMENT", "HAS_RESPONSIBLE", "HAS_SECTOR", "HAS_WORKFLOW", "HAS_STAGE", "HAS_TRANSITION", "HAS_QUEUE", "HAS_ROUTE", "HAS_VERSION", "HAS_CLASSIFICATION", "HAS_RETENTION", "HAS_ARCHIVE", "HAS_ADMINISTRATIVE_INDICATOR", "HAS_ADMINISTRATIVE_AUDIT", "HAS_ADMINISTRATIVE_COMPLIANCE", "HAS_ADMINISTRATIVE_RESPONSIBILITY", "HAS_ADMINISTRATIVE_MONITORING", "HAS_ADMINISTRATIVE_OCCURRENCE"
]);


export interface KnowledgeGraphQuery {
  organizationId: string;
  workspaceId: string;
  targetNodeId?: string;
  relationType?: string;
}
export interface KnowledgeGraphResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeRelation[];
}
export interface KnowledgeNodeProperties {
  title?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}
export interface RelationProperties {
  weight?: number;
  [key: string]: unknown;
}
export interface KnowledgeNodeMetadata {
  sourceId?: string;
  [key: string]: unknown;
}

export interface KnowledgeRelationMetadata {
  sourceId?: string;
  [key: string]: unknown;
}

export interface KnowledgeGraphScope {
  organizationId: string;
  workspaceId: string;
}

export interface KnowledgeNode {
  id: string;
  title: string;
  nodeType: NodeType;
  organizationId: string;
  projectId?: string | null;
  workspaceId: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeRelation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  organizationId: string;
  workspaceId: string;
  metadata?: KnowledgeRelationMetadata;
  createdAt: string;
  updatedAt?: string;
}

export class KnowledgeGraphEngine {
  private dbAdapter: DatabaseAdapter;

  constructor(dbAdapter: DatabaseAdapter) {
    this.dbAdapter = dbAdapter;
  }

  /**
   * Garante a existência de um nó e o retorna.
   */
  public async ensureNode(
    organizationId: string,
    projectId: string | null,
    nodeType: NodeType,
    title: string,
    description: string,
    sourceId: string,
    extraMetadata: Record<string, any> = {},
    workspaceId?: string
  ): Promise<KnowledgeNode> {
    try {
      let orgId = organizationId;
      let wsId = workspaceId;

      if (!orgId || orgId === "system" || !wsId) {
        if (process.env.NODE_ENV === "production") {
          console.warn("[KnowledgeGraphEngine] Rejected ensureNode missing organizationId or workspaceId in production.", { nodeType, sourceId });
          throw new Error("Missing organizationId or workspaceId in production");
        }
        if (!extraMetadata?.developmentOnly && !extraMetadata?.isDevelopmentFallback) {
           console.warn("[KnowledgeGraphEngine] development fallback used without explicit flag", { nodeType, sourceId });
        }
        orgId = orgId && orgId !== "system" ? orgId : "org-oi-beta";
        wsId = wsId || "default-workspace";
      }

      if (!VALID_NODE_TYPES.has(nodeType)) {
        console.warn(`[KnowledgeGraphEngine] Invalid nodeType detected: ${nodeType}`);
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Invalid nodeType: ${nodeType}`);
        }
      }
      const validatedNodeType = VALID_NODE_TYPES.has(nodeType) ? nodeType : "KNOWLEDGE" as NodeType;

      const existing = await this.dbAdapter.getKnowledgeNodeBySourceAndType(
        orgId,
        sourceId,
        validatedNodeType,
        wsId
      );
      if (existing) {
        return existing;
      }
      return await this.dbAdapter.createKnowledgeNode({
        organizationId: orgId,
        projectId,
        nodeType: validatedNodeType,
        title: title || `${validatedNodeType} ${sourceId}`,
        description: description || "",
        metadata: { ...extraMetadata, sourceId },
        workspaceId: wsId,
      });
    } catch (e) {
      console.warn("Error in ensureNode of KnowledgeGraphEngine:", e);
      if (process.env.NODE_ENV === "production") {
        throw e;
      }
      return {
        id: sourceId,
        title,
        nodeType,
        organizationId: organizationId || "org-oi-beta",
        workspaceId: workspaceId || "default-workspace",
        description: description || "",
        metadata: { ...extraMetadata, sourceId },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  public async createRelationship(
    organizationId: string,
    sourceNodeId: string,
    targetNodeId: string,
    relationType: RelationType,
    workspaceId?: string
  ): Promise<KnowledgeRelation | null> {
    try {
      if (!organizationId || organizationId === "system" || !workspaceId) {
         if (process.env.NODE_ENV === "production") {
            console.warn("[KnowledgeGraphEngine] Rejected createRelationship missing organizationId or workspaceId in production.");
            return null;
         }
      }
      const orgId = organizationId && organizationId !== "system" ? organizationId : "org-oi-beta";
      const wsId = workspaceId || "default-workspace";
      
      if (!VALID_RELATION_TYPES.has(relationType)) {
        console.warn(`[KnowledgeGraphEngine] Invalid relationType detected: ${relationType}`);
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Invalid relationType: ${relationType}`);
        }
      }
      const validatedRelation = VALID_RELATION_TYPES.has(relationType) ? relationType : "RELATED_TO" as RelationType;

      return await this.dbAdapter.createKnowledgeRelation({
        organizationId: orgId,
        sourceNodeId,
        targetNodeId,
        relationType: validatedRelation,
        workspaceId: wsId,
      });
    } catch (e) {
      console.warn("Error in createRelationship of KnowledgeGraphEngine:", e);
      if (process.env.NODE_ENV === "production") {
         throw e;
      }
      return null;
    }
  }

  public async createNode(
    id: string,
    nodeType: string,
    properties: Record<string, any>
  ): Promise<KnowledgeNode | null> {
    try {
      let orgId = "org-oi-beta";
      let wsId = "default-workspace";
      let actualId = id;
      let actualNodeType = nodeType;
      let actualProps = properties || {};

      if (properties && typeof properties === "object") {
        const looksLikeDualSignature = typeof id === "string" && typeof nodeType === "string" && (properties.id || properties.type);
        if (looksLikeDualSignature) {
          orgId = id && id !== "system" ? id : "org-oi-beta";
          wsId = nodeType || "default-workspace";
          actualId = properties.id || properties.sourceId || "unknown_id";
          actualNodeType = properties.type || properties.nodeType || "KNOWLEDGE";
          actualProps = properties.properties || properties;
        } else {
          orgId = properties.organizationId || properties.organization_id || "org-oi-beta";
          wsId = properties.workspaceId || properties.workspace_id || "default-workspace";
        }
      }

      const validatedNodeType = VALID_NODE_TYPES.has(actualNodeType as string) ? (actualNodeType as NodeType) : "KNOWLEDGE";
      
      if (!VALID_NODE_TYPES.has(actualNodeType as string)) {
         console.warn(`[KnowledgeGraphEngine] createNode Invalid nodeType detected: ${actualNodeType}`);
         if (process.env.NODE_ENV === "production") {
           throw new Error(`Invalid nodeType: ${actualNodeType}`);
         }
      }

      const title = actualProps.name || actualProps.indicatorName || actualProps.goalValue || actualProps.resultValue || actualProps.title || `${validatedNodeType} ${actualId}`;

      return await this.ensureNode(
        orgId,
        actualProps.projectId || null,
        validatedNodeType,
        String(title),
        actualProps.description || "",
        actualId,
        actualProps,
        wsId
      );
    } catch (e) {
      console.warn("Error in createNode fallback:", e);
      return null;
    }
  }

  public async createEdge(
    sourceId: string,
    targetId: string,
    relationType: string,
    organizationId?: string,
    workspaceId?: string
  ): Promise<KnowledgeRelation | null> {
    try {
      const orgId = organizationId && organizationId !== "system" ? organizationId : "org-oi-beta";
      const wsId = workspaceId || "default-workspace";
      const validatedRelation = VALID_RELATION_TYPES.has(relationType as string) ? (relationType as RelationType) : "RELATED_TO" as RelationType;
      
      if (!VALID_RELATION_TYPES.has(relationType as string)) {
         console.warn(`[KnowledgeGraphEngine] createEdge Invalid relationType detected: ${relationType}`);
         if (process.env.NODE_ENV === "production") {
           throw new Error(`Invalid relationType: ${relationType}`);
         }
      }

      return await this.createRelationship(
        orgId,
        sourceId,
        targetId,
        validatedRelation,
        wsId
      );
    } catch (e) {
      console.warn("Error in createEdge fallback:", e);
      return null;
    }
  }

  /**
   * Relação Automática: Projeto
   * Criar node: PROJECT
   * Relacionamentos:
   * - BELONGS_TO ORGANIZATION
   * - CREATED_BY USER
   */
  public async onProjectCreated(project: Record<string, any>): Promise<void> {
    const orgId = project.organizationId;
    const userId = project.userId || "system";
    const workspaceId = project.workspaceId || "default-workspace";

    const orgNode = await this.ensureNode(
      orgId,
      null,
      "ORGANIZATION",
      "Organização Oi Beta",
      "",
      orgId,
      {},
      workspaceId,
    );
    const userNode = await this.ensureNode(
      orgId,
      null,
      "USER",
      "Douglas",
      "",
      userId,
      {},
      workspaceId,
    );
    const projNode = await this.ensureNode(
      orgId,
      project.id,
      "PROJECT",
      project.name,
      project.description,
      project.id,
      {},
      workspaceId,
    );

    await this.createRelationship(orgId, projNode.id, orgNode.id, "BELONGS_TO", workspaceId);
    await this.createRelationship(
      orgId,
      projNode.id,
      userNode.id,
      "CREATED_BY",
      workspaceId,
    );
  }

  /**
   * Relação Automática: Objetivo
   * Criar node: OBJECTIVE
   * Relacionamentos:
   * - BELONGS_TO PROJECT
   * - CREATED_BY USER
   * - RELATED_TO PROJECT
   */
  public async onObjectiveCreated(objective: Record<string, any>): Promise<void> {
    const orgId = objective.organizationId;
    const userId = objective.userId || "system";
    const projId = objective.projectId;
    const workspaceId = objective.workspaceId || "default-workspace";

    const projNode = await this.ensureNode(
      orgId,
      projId,
      "PROJECT",
      "Beta Core",
      "",
      projId,
      {},
      workspaceId,
    );
    const userNode = await this.ensureNode(
      orgId,
      null,
      "USER",
      "Douglas",
      "",
      userId,
      {},
      workspaceId,
    );
    const objNode = await this.ensureNode(
      orgId,
      projId,
      "OBJECTIVE",
      objective.title,
      objective.description || "",
      objective.id,
      {},
      workspaceId,
    );

    await this.createRelationship(orgId, objNode.id, projNode.id, "BELONGS_TO", workspaceId);
    await this.createRelationship(orgId, objNode.id, userNode.id, "CREATED_BY", workspaceId);
    await this.createRelationship(orgId, objNode.id, projNode.id, "RELATED_TO", workspaceId);
  }

  /**
   * Relação Automática: Tarefa
   * Criar node: TASK
   * Relacionamentos:
   * - BELONGS_TO PROJECT
   * - CREATED_BY USER
   * - PART_OF OBJECTIVE quando existir objetivo associado.
   */
  public async onTaskCreated(task: Record<string, any>): Promise<void> {
    const orgId = task.organizationId;
    const userId = task.userId || "system";
    const projId = task.projectId;
    const workspaceId = task.workspaceId || "default-workspace";

    const projNode = await this.ensureNode(
      orgId,
      projId,
      "PROJECT",
      "Beta Core",
      "",
      projId,
      {},
      workspaceId,
    );
    const userNode = await this.ensureNode(
      orgId,
      null,
      "USER",
      "Douglas",
      "",
      userId,
      {},
      workspaceId,
    );
    const taskNode = await this.ensureNode(
      orgId,
      projId,
      "TASK",
      task.title,
      task.description || "",
      task.id,
      {},
      workspaceId,
    );

    await this.createRelationship(
      orgId,
      taskNode.id,
      projNode.id,
      "BELONGS_TO",
      workspaceId,
    );
    await this.createRelationship(
      orgId,
      taskNode.id,
      userNode.id,
      "CREATED_BY",
      workspaceId,
    );

    // Relatar PART_OF OBJECTIVE se houver algum objetivo associado ou ativo no projeto
    try {
      const objectives = await this.dbAdapter.getObjectives(projId, workspaceId);
      if (objectives && objectives.length > 0) {
        // Find if any objective is linked or choose the first active one
        const matchedObjective =
          objectives.find((o: Record<string, any>) => o.taskId === task.id) || objectives[0];
        if (matchedObjective) {
          const objNode = await this.ensureNode(
            orgId,
            projId,
            "OBJECTIVE",
            matchedObjective.title,
            matchedObjective.description || "",
            matchedObjective.id,
            {},
            workspaceId,
          );
          await this.createRelationship(
            orgId,
            taskNode.id,
            objNode.id,
            "PART_OF",
            workspaceId,
          );
        }
      }
    } catch (e) {
      console.warn(
        "Error associating task to objectives in KnowledgeGraph:",
        e,
      );
    }
  }

  /**
   * Relação Automática: Decisão
   * Criar node: DECISION
   * Relacionamentos:
   * - BELONGS_TO PROJECT
   * - CREATED_BY USER
   * - SUPPORTS OBJECTIVE
   * - RELATED_TO TASKS quando existirem.
   */
  public async onDecisionCreated(decision: Record<string, any>): Promise<void> {
    const orgId = decision.organizationId;
    const userId = decision.userId || "system";
    const projId = decision.projectId;
    const workspaceId = decision.workspaceId || "default-workspace";

    const projNode = await this.ensureNode(
      orgId,
      projId,
      "PROJECT",
      "Beta Core",
      "",
      projId,
      {},
      workspaceId,
    );
    const userNode = await this.ensureNode(
      orgId,
      null,
      "USER",
      "Douglas",
      "",
      userId,
      {},
      workspaceId,
    );
    const decNode = await this.ensureNode(
      orgId,
      projId,
      "DECISION",
      decision.title,
      decision.description || "",
      decision.id,
      {},
      workspaceId,
    );

    await this.createRelationship(orgId, decNode.id, projNode.id, "BELONGS_TO", workspaceId);
    await this.createRelationship(orgId, decNode.id, userNode.id, "CREATED_BY", workspaceId);

    // SUPPORTS OBJECTIVE quando existirem
    try {
      const objectives = await this.dbAdapter.getObjectives(projId, workspaceId);
      for (const obj of objectives) {
        const objNode = await this.ensureNode(
          orgId,
          projId,
          "OBJECTIVE",
          obj.title,
          obj.description || "",
          obj.id,
          {},
          workspaceId,
        );
        await this.createRelationship(
          orgId,
          decNode.id,
          objNode.id,
          "SUPPORTS",
          workspaceId,
        );
      }
    } catch (e) {
      console.warn("Error linking decision to objectives:", e);
    }

    // RELATED_TO TASKS quando existirem
    try {
      const tasks = await this.dbAdapter.getTasks(projId, workspaceId);
      const targetTasks = decision.taskId
        ? tasks.filter((t: Record<string, any>) => t.id === decision.taskId)
        : tasks.slice(0, 3); // Defer to top pending tasks as context

      for (const t of targetTasks) {
        const tNode = await this.ensureNode(
          orgId,
          projId,
          "TASK",
          t.title,
          t.description || "",
          t.id,
          {},
          workspaceId,
        );
        await this.createRelationship(
          orgId,
          decNode.id,
          tNode.id,
          "RELATED_TO",
          workspaceId,
        );
      }
    } catch (e) {
      console.warn("Error linking decision to tasks:", e);
    }
  }

  /**
   * Relação Automática: Memória
   * Criar node: MEMORY
   * Relacionar com: Projeto, Objetivos, Tarefas, Decisões quando aplicável.
   */
  public async onMemoryCreated(memory: Record<string, any>): Promise<void> {
    const orgId = memory.organizationId;
    const userId = memory.userId || "system";
    const projId = memory.projectId;
    const workspaceId = memory.workspaceId || "default-workspace";

    const projNode = await this.ensureNode(
      orgId,
      projId,
      "PROJECT",
      "Beta Core",
      "",
      projId,
      {},
      workspaceId,
    );
    const userNode = await this.ensureNode(
      orgId,
      null,
      "USER",
      "Douglas",
      "",
      userId,
      {},
      workspaceId,
    );
    const memNode = await this.ensureNode(
      orgId,
      projId,
      "MEMORY",
      memory.content.substring(0, 50) + "...",
      memory.content || "",
      memory.id,
      {},
      workspaceId,
    );

    await this.createRelationship(orgId, memNode.id, projNode.id, "RELATED_TO", workspaceId);
    await this.createRelationship(orgId, memNode.id, userNode.id, "CREATED_BY", workspaceId);

    const contentLower = (memory.content || "").toLowerCase();

    // Sincronização com Objetivos
    try {
      const objectives = await this.dbAdapter.getObjectives(projId, workspaceId);
      for (const obj of objectives) {
        if (
          contentLower.includes(obj.title.toLowerCase()) ||
          (obj.description &&
            contentLower.includes(obj.description.toLowerCase()))
        ) {
          const objNode = await this.ensureNode(
            orgId,
            projId,
            "OBJECTIVE",
            obj.title,
            obj.description || "",
            obj.id,
            {},
            workspaceId,
          );
          await this.createRelationship(
            orgId,
            memNode.id,
            objNode.id,
            "RELATED_TO",
            workspaceId,
          );
        }
      }
    } catch (e) {
      console.warn("Error linking memory to objectives:", e);
    }

    // Sincronização com Tarefas
    try {
      const tasks = await this.dbAdapter.getTasks(projId, workspaceId);
      for (const t of tasks) {
        if (contentLower.includes(t.title.toLowerCase())) {
          const tNode = await this.ensureNode(
            orgId,
            projId,
            "TASK",
            t.title,
            t.description || "",
            t.id,
            {},
            workspaceId,
          );
          await this.createRelationship(
            orgId,
            memNode.id,
            tNode.id,
            "RELATED_TO",
            workspaceId,
          );
        }
      }
    } catch (e) {
      console.warn("Error linking memory to tasks:", e);
    }

    // Sincronização com Decisões
    try {
      const decisions = await this.dbAdapter.getDecisions(projId, workspaceId);
      for (const d of decisions) {
        if (contentLower.includes(d.title.toLowerCase())) {
          const dNode = await this.ensureNode(
            orgId,
            projId,
            "DECISION",
            d.title,
            d.description || "",
            d.id,
            {},
            workspaceId,
          );
          await this.createRelationship(
            orgId,
            memNode.id,
            dNode.id,
            "RELATED_TO",
            workspaceId,
          );
        }
      }
    } catch (e) {
      console.warn("Error linking memory to decisions:", e);
    }
  }

  /**
   * Relação Automática: Documento (ETAPA 6)
   * Criar suporte interno para nó DOCUMENT.
   */
  public async onDocumentCreated(document: Record<string, any>): Promise<void> {
    const orgId = document.organizationId || "org-oi-beta";
    const userId = document.userId || "system";
    const projId = document.projectId;
    const workspaceId = document.workspaceId || "default-workspace";

    const projNode = await this.ensureNode(
      orgId,
      projId,
      "PROJECT",
      "Beta Core",
      "",
      projId,
      {},
      workspaceId,
    );
    const userNode = await this.ensureNode(
      orgId,
      null,
      "USER",
      "Douglas",
      "",
      userId,
      {},
      workspaceId,
    );
    const docNode = await this.ensureNode(
      orgId,
      projId,
      "DOCUMENT",
      document.title || "Documento Técnico",
      document.content || "",
      document.id,
      {},
      workspaceId,
    );

    await this.createRelationship(orgId, docNode.id, projNode.id, "BELONGS_TO", workspaceId);
    await this.createRelationship(orgId, docNode.id, userNode.id, "CREATED_BY", workspaceId);

    const contentLower =
       (document.content || "").toLowerCase() +
       (document.title || "").toLowerCase();

    // Relaciona com objetivos quando aplicável
    try {
      const objectives = await this.dbAdapter.getObjectives(projId, workspaceId);
      for (const obj of objectives) {
        if (contentLower.includes(obj.title.toLowerCase())) {
          const objNode = await this.ensureNode(
            orgId,
            projId,
            "OBJECTIVE",
            obj.title,
            obj.description || "",
            obj.id,
            {},
            workspaceId,
          );
          await this.createRelationship(
            orgId,
            docNode.id,
            objNode.id,
            "RELATED_TO",
            workspaceId,
          );
        }
      }
    } catch (e) {
      console.warn("Error linking document to objectives:", e);
    }

    // Relaciona com tarefas quando aplicável
    try {
      const tasks = await this.dbAdapter.getTasks(projId, workspaceId);
      for (const t of tasks) {
        if (contentLower.includes(t.title.toLowerCase())) {
          const tNode = await this.ensureNode(
            orgId,
            projId,
            "TASK",
            t.title,
            t.description || "",
            t.id,
            {},
            workspaceId,
          );
          await this.createRelationship(
            orgId,
            docNode.id,
            tNode.id,
            "RELATED_TO",
            workspaceId,
          );
        }
      }
    } catch (e) {
      console.warn("Error linking document to tasks:", e);
    }
  }

  /**
   * Geração de Relatório de Contexto de Conhecimento (ETAPA 9)
   */
  public async buildKnowledgeContext(
    organizationId: string,
    projectId?: string,
    workspaceId?: string,
  ): Promise<string> {
    try {
      const actualWorkspaceId = workspaceId || "default-workspace";
      const nodes = await this.dbAdapter.getKnowledgeNodes(
        organizationId,
        projectId,
        actualWorkspaceId,
      );
      const relations =
        await this.dbAdapter.getKnowledgeRelations(organizationId, actualWorkspaceId);

      // Fetch direct resources for structural reporting
      let projects: Record<string, any>[] = [];
      let objectives: Record<string, any>[] = [];
      let tasks: Record<string, any>[] = [];
      let decisions: Record<string, any>[] = [];
      let memories: Record<string, any>[] = [];

      try {
        projects = await this.dbAdapter.getProjects("system", organizationId, actualWorkspaceId);
      } catch {}

      if (projectId) {
        try {
          objectives = await this.dbAdapter.getObjectives(projectId, actualWorkspaceId);
        } catch {}
        try {
          tasks = await this.dbAdapter.getTasks(projectId, actualWorkspaceId);
        } catch {}
        try {
          decisions = await this.dbAdapter.getDecisions(projectId, actualWorkspaceId);
        } catch {}
        try {
          memories = await this.dbAdapter.getMemories(projectId, actualWorkspaceId);
        } catch {}
      }

      let report = `### 🌐 MAPA DE CONHECIMENTO SEMÂNTICO (KNOWLEDGE GRAPH)\n`;
      report += `Conexões e mapeamentos cognitivos estruturados ativamente no Oi Beta:\n\n`;

      // 1. Related Projects
      if (projects.length > 0) {
        report += `**📁 PROJETOS ASSOCIADOS:**\n`;
        projects.forEach((p) => {
          report += `- **${p.name}** \`[id: ${p.id}, status: ${p.status}]\` - ${p.description || "Sem descrição"}\n`;
        });
        report += `\n`;
      }

      // 2. Related Objectives
      if (objectives.length > 0) {
        report += `**🎯 OBJETIVOS RELACIONADOS:**\n`;
        objectives.forEach((o) => {
          report += `- [${o.status === "completed" ? "X" : " "}] **${o.title}** - ${o.description || "Sem descrição"}\n`;
        });
        report += `\n`;
      }

      // 3. Related Tasks
      if (tasks.length > 0) {
        report += `**📋 TAREFAS RELACIONADAS:**\n`;
        tasks.slice(0, 10).forEach((t) => {
          report += `- [${t.status === "completed" || t.status === "concluido" ? "X" : " "}] **${t.title}** \`[prioridade: ${t.priority}]\`\n`;
        });
        if (tasks.length > 10)
          report += `- *...e mais ${tasks.length - 10} tarefas.*\n`;
        report += `\n`;
      }

      // 4. Related Decisions
      if (decisions.length > 0) {
        report += `**⚖️ DECISÕES OPERACIONAIS E GOVERNANÇA:**\n`;
        decisions.forEach((d) => {
          report += `- **${d.title}**: ${d.content || d.description || "Sem detalhes"}. (Impacto: \`${d.impact}\`, Importância: \`${d.importance}\`)\n`;
        });
        report += `\n`;
      }

      // 5. Related Memories
      if (memories.length > 0) {
        report += `**🧠 MEMÓRIAS COGNITIVAS EXTRAÍDAS:**\n`;
        memories.slice(0, 5).forEach((m) => {
          report += `- "*${m.content}*" \`[importância: ${m.importance}]\`\n`;
        });
        report += `\n`;
      }

      // 6. Active semantic relationships
      report += `**🔗 RELACIONAMENTOS RELEVANTES MAPEADOS:**\n`;
      const nodeIdToNode = new Map<string, Record<string, any>>();
      for (const node of nodes) {
        nodeIdToNode.set(node.id, node);
        if (node.metadata && node.metadata.sourceId) {
          nodeIdToNode.set(node.metadata.sourceId, node);
        }
      }

      const relationLines: string[] = [];
      for (const r of relations) {
        const source = nodeIdToNode.get(r.sourceNodeId);
        const target = nodeIdToNode.get(r.targetNodeId);
        if (source && target) {
          relationLines.push(
            `- **${source.title}** (\`${source.nodeType}\`) ───[${r.relationType}]───> **${target.title}** (\`${target.nodeType}\`)`,
          );
        }
      }

      if (relationLines.length > 0) {
        report += relationLines.slice(0, 30).join("\n") + "\n";
      } else {
        report += `- *Nenhum relacionamento semântico formal estabelecido entre os nós ainda.*\n`;
      }

      return report;
    } catch (e) {
      console.error("Error building Knowledge context:", e);
      return "Erro ao processar as relações do Knowledge Graph.";
    }
  }
}
