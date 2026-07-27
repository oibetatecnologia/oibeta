import type { ClientSupportTicketPriority, ClientSupportTicketStatus } from '../../hooks/useClientState';

export type SupportRiskLevel = 'healthy' | 'attention' | 'critical';
export type SupportActionPriority = 'baixa' | 'média' | 'alta' | 'crítica';

export interface SupportTicketIntelligenceItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  status: ClientSupportTicketStatus;
  priority: ClientSupportTicketPriority;
  ageHours: number;
  idleHours: number;
  slaHours: number;
  remainingHours: number;
  breached: boolean;
  risk: SupportRiskLevel;
  createdAt: string;
  updatedAt: string;
}

export interface SupportClientRiskItem {
  clientId: string;
  clientName: string;
  openTickets: number;
  criticalTickets: number;
  breachedTickets: number;
  averageAgeHours: number;
  risk: SupportRiskLevel;
  mainReason: string;
}

export interface SupportKnowledgeSuggestion {
  id: string;
  title: string;
  occurrences: number;
  clients: number;
  confidence: number;
  sourceTerms: string[];
  taskTitle: string;
}

export interface SupportPriorityAction {
  id: string;
  title: string;
  description: string;
  priority: SupportActionPriority;
  clientName?: string;
  taskTitle: string;
}

export interface SupportIntelligenceSummary {
  healthScore: number;
  risk: SupportRiskLevel;
  totalTickets: number;
  activeTickets: number;
  resolvedTickets: number;
  slaBreaches: number;
  criticalOpenTickets: number;
  averageResolutionPotential: number;
  firstResponseRisk: number;
  ticketItems: SupportTicketIntelligenceItem[];
  clientRisks: SupportClientRiskItem[];
  knowledgeSuggestions: SupportKnowledgeSuggestion[];
  priorityActions: SupportPriorityAction[];
}
