import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientRepository } from '../core/crmGov/ClientRepository';

export type ClientStatus = 'lead' | 'prospect' | 'proposal' | 'contracted' | 'active' | 'paused' | 'lost';
export type ClientProvisioningStatus = 'not_provisioned' | 'provisioning' | 'provisioned' | 'blocked';
export type ClientEntityType = 'city_hall' | 'city_council' | 'autarchy' | 'consortium' | 'iprem' | 'foundation' | 'public_company' | 'other';
export type ClientContactRole =
  | 'mayor'
  | 'vice_mayor'
  | 'president'
  | 'secretary'
  | 'controller'
  | 'attorney'
  | 'procurement'
  | 'it'
  | 'cabinet'
  | 'other';

export type ClientTimelineEventType =
  | 'created'
  | 'call'
  | 'email'
  | 'meeting'
  | 'visit'
  | 'opportunity'
  | 'proposal'
  | 'contract'
  | 'implementation'
  | 'note';

export interface ClientContactRecord {
  id: string;
  name: string;
  role: ClientContactRole;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface ClientTimelineEvent {
  id: string;
  type: ClientTimelineEventType;
  title: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface ClientNextAction {
  title: string;
  dueDate?: string;
  notes?: string;
  updatedAt: string;
}

export interface ClientOpportunityLink {
  opportunityId: string;
  title: string;
  source: 'commercial_radar';
  linkedAt: string;
}

export type ClientProductStatus = 'suggested' | 'interested' | 'proposal' | 'implantation' | 'contracted';

export interface ClientProductLink {
  serviceId: string;
  productId: string;
  shortName: string;
  commercialName: string;
  status: ClientProductStatus;
  linkedAt: string;
}

export type ClientProposalStatus = 'draft' | 'sent' | 'negotiation' | 'accepted' | 'rejected';

export interface ClientProposalRecord {
  id: string;
  title: string;
  status: ClientProposalStatus;
  estimatedValue?: number;
  opportunityId?: string;
  productIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientContractStatus = 'draft' | 'ready' | 'signed' | 'active' | 'expired' | 'cancelled';

export interface ClientContractRecord {
  id: string;
  title: string;
  status: ClientContractStatus;
  proposalId?: string;
  contractValue: number;
  monthlyValue?: number;
  setupValue?: number;
  startDate?: string;
  endDate?: string;
  implementationDays?: number;
  scope: string[];
  clauses: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientImplementationStatus =
  | 'preparation'
  | 'in_progress'
  | 'waiting_client'
  | 'training'
  | 'go_live'
  | 'completed'
  | 'blocked';

export interface ClientImplementationChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
}

export interface ClientImplementationRecord {
  id: string;
  title: string;
  status: ClientImplementationStatus;
  progress: number;
  responsible: string;
  expectedGoLiveDate?: string;
  contractId?: string;
  checklist: ClientImplementationChecklistItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientFinancialStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface ClientFinancialRecord {
  id: string;
  title: string;
  status: ClientFinancialStatus;
  amount: number;
  dueDate?: string;
  paidAt?: string;
  contractId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientSupportTicketStatus = 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed';
export type ClientSupportTicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ClientSupportTicket {
  id: string;
  title: string;
  status: ClientSupportTicketStatus;
  priority: ClientSupportTicketPriority;
  productId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRecord {
  id: string;
  organizationId?: string;
  tenantId?: string;
  tenantCommercialContractId?: string;
  provisioningStatus: ClientProvisioningStatus;
  name: string;
  city: string;
  state: string;
  entity: string;
  entityType: ClientEntityType;
  manager: string;
  status: ClientStatus;
  contact: string;
  cnpj?: string;
  population?: string;
  website?: string;
  pncpUrl?: string;
  notes?: string;
  contacts: ClientContactRecord[];
  timeline: ClientTimelineEvent[];
  opportunities: ClientOpportunityLink[];
  products: ClientProductLink[];
  proposals: ClientProposalRecord[];
  contracts: ClientContractRecord[];
  implementations: ClientImplementationRecord[];
  financialRecords: ClientFinancialRecord[];
  supportTickets: ClientSupportTicket[];
  nextAction?: ClientNextAction;
  createdAt: string;
  updatedAt: string;
}

export default function useClientState() {
  const [clientsList, setClientsList] = useState<ClientRecord[]>([]);
  const persistenceReadyRef = useRef(false);
  const skipNextPersistenceRef = useRef(false);
  const persistenceTimerRef = useRef<number | null>(null);


  const [newClientCity, setNewClientCity] = useState('');
  const [newClientEntity, setNewClientEntity] = useState('');
  const [newClientManager, setNewClientManager] = useState('');
  const [newClientContact, setNewClientContact] = useState('');

  useEffect(() => {
    let active = true;

    ClientRepository.list()
      .then((clients) => {
        if (!active) return;
        skipNextPersistenceRef.current = true;
        setClientsList(clients.map(normalizeClientRecord));
        persistenceReadyRef.current = true;
      })
      .catch((error) => {
        console.warn('[CRM Gov] Falha ao hidratar clientes.', error);
        if (active) {
          persistenceReadyRef.current = true;
        }
      });

    return () => {
      active = false;
      if (persistenceTimerRef.current) {
        window.clearTimeout(persistenceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!persistenceReadyRef.current) return;

    if (skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false;
      return;
    }

    if (persistenceTimerRef.current) {
      window.clearTimeout(persistenceTimerRef.current);
    }

    persistenceTimerRef.current = window.setTimeout(() => {
      void ClientRepository.replaceAll(clientsList.map(normalizeClientRecord));
    }, 500);

    return () => {
      if (persistenceTimerRef.current) {
        window.clearTimeout(persistenceTimerRef.current);
      }
    };
  }, [clientsList]);

  const handleAddClient = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (!newClientCity.trim() || !newClientEntity.trim()) return;

    const parsedLocation = parseCityAndState(newClientCity);
    const now = new Date().toISOString();

    const newClient: ClientRecord = {
      id: createClientId(),
      provisioningStatus: 'not_provisioned',
      name: newClientEntity.trim(),
      city: parsedLocation.city,
      state: parsedLocation.state,
      entity: newClientEntity.trim(),
      entityType: 'city_hall',
      manager: newClientManager.trim() || 'Responsável não definido',
      status: 'lead',
      contact: newClientContact.trim() || '',
      contacts: [],
      timeline: [
        {
          id: createTimelineEventId(),
          type: 'created',
          title: 'Órgão cadastrado no CRM Gov',
          description: 'Registro inicial criado na carteira comercial da Oi Beta.',
          date: now,
          createdAt: now,
        },
      ],
      opportunities: [],
      products: [],
      proposals: [],
      contracts: [],
      implementations: [],
      financialRecords: [],
      supportTickets: [],
      createdAt: now,
      updatedAt: now,
    };

    setClientsList((current) => [newClient, ...current]);
    setNewClientCity('');
    setNewClientEntity('');
    setNewClientManager('');
    setNewClientContact('');
  }, [newClientCity, newClientEntity, newClientManager, newClientContact]);

  return {
    clientsList,
    setClientsList,
    newClientCity,
    setNewClientCity,
    newClientEntity,
    setNewClientEntity,
    newClientManager,
    setNewClientManager,
    newClientContact,
    setNewClientContact,
    handleAddClient,
  };
}

function normalizeClientRecord(record: Partial<ClientRecord>, index: number): ClientRecord {
  const now = new Date().toISOString();

  return {
    id: record.id || `client-${index}`,
    organizationId: record.organizationId,
    tenantId: record.tenantId || record.organizationId,
    tenantCommercialContractId: record.tenantCommercialContractId,
    provisioningStatus: record.provisioningStatus || 'not_provisioned',
    name: record.name || record.entity || '',
    city: record.city || '',
    state: record.state || '',
    entity: record.entity || record.name || '',
    entityType: record.entityType || 'other',
    manager: record.manager || '',
    status: record.status || 'lead',
    contact: record.contact || '',
    cnpj: record.cnpj,
    population: record.population,
    website: record.website,
    pncpUrl: record.pncpUrl,
    notes: record.notes,
    contacts: Array.isArray(record.contacts) ? record.contacts.map(normalizeContactRecord) : [],
    timeline: Array.isArray(record.timeline) ? record.timeline.map(normalizeTimelineEvent) : [],
    opportunities: Array.isArray(record.opportunities) ? record.opportunities.map(normalizeOpportunityLink) : [],
    products: Array.isArray(record.products) ? record.products.map(normalizeProductLink) : [],
    proposals: Array.isArray(record.proposals) ? record.proposals.map(normalizeProposalRecord) : [],
    contracts: Array.isArray(record.contracts) ? record.contracts.map(normalizeContractRecord) : [],
    implementations: Array.isArray(record.implementations) ? record.implementations.map(normalizeImplementationRecord) : [],
    financialRecords: Array.isArray(record.financialRecords) ? record.financialRecords.map(normalizeFinancialRecord) : [],
    supportTickets: Array.isArray(record.supportTickets) ? record.supportTickets.map(normalizeSupportTicket) : [],
    nextAction: record.nextAction ? normalizeNextAction(record.nextAction) : undefined,
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
  };
}

function normalizeContactRecord(contact: Partial<ClientContactRecord>, index: number): ClientContactRecord {
  return {
    id: contact.id || `contact-${index}`,
    name: contact.name || '',
    role: contact.role || 'other',
    email: contact.email,
    phone: contact.phone,
    notes: contact.notes,
    createdAt: contact.createdAt || new Date().toISOString(),
  };
}

function normalizeTimelineEvent(event: Partial<ClientTimelineEvent>, index: number): ClientTimelineEvent {
  const now = new Date().toISOString();

  return {
    id: event.id || `timeline-${index}`,
    type: event.type || 'note',
    title: event.title || 'Evento registrado',
    description: event.description,
    date: event.date || now,
    createdAt: event.createdAt || now,
  };
}

function normalizeOpportunityLink(link: Partial<ClientOpportunityLink>, index: number): ClientOpportunityLink {
  return {
    opportunityId: link.opportunityId || `opportunity-${index}`,
    title: link.title || 'Oportunidade vinculada',
    source: 'commercial_radar',
    linkedAt: link.linkedAt || new Date().toISOString(),
  };
}

function normalizeProductLink(product: Partial<ClientProductLink>, index: number): ClientProductLink {
  return {
    serviceId: product.serviceId || `service-${index}`,
    productId: product.productId || `product-${index}`,
    shortName: product.shortName || product.commercialName || 'Produto Beta',
    commercialName: product.commercialName || product.shortName || 'Produto Beta',
    status: product.status || 'suggested',
    linkedAt: product.linkedAt || new Date().toISOString(),
  };
}

function normalizeProposalRecord(proposal: Partial<ClientProposalRecord>, index: number): ClientProposalRecord {
  const now = new Date().toISOString();

  return {
    id: proposal.id || `proposal-${index}`,
    title: proposal.title || 'Proposta comercial',
    status: proposal.status || 'draft',
    estimatedValue: proposal.estimatedValue,
    opportunityId: proposal.opportunityId,
    productIds: Array.isArray(proposal.productIds) ? proposal.productIds : [],
    notes: proposal.notes,
    createdAt: proposal.createdAt || now,
    updatedAt: proposal.updatedAt || now,
  };
}

function normalizeContractRecord(contract: Partial<ClientContractRecord>, index: number): ClientContractRecord {
  const now = new Date().toISOString();

  return {
    id: contract.id || `contract-${index}`,
    title: contract.title || 'Contrato comercial',
    status: contract.status || 'draft',
    proposalId: contract.proposalId,
    contractValue: contract.contractValue || 0,
    monthlyValue: contract.monthlyValue,
    setupValue: contract.setupValue,
    startDate: contract.startDate,
    endDate: contract.endDate,
    implementationDays: contract.implementationDays,
    scope: Array.isArray(contract.scope) ? contract.scope : [],
    clauses: Array.isArray(contract.clauses) ? contract.clauses : [],
    notes: contract.notes,
    createdAt: contract.createdAt || now,
    updatedAt: contract.updatedAt || now,
  };
}

function normalizeImplementationRecord(implementation: Partial<ClientImplementationRecord>, index: number): ClientImplementationRecord {
  const now = new Date().toISOString();

  return {
    id: implementation.id || `implementation-${index}`,
    title: implementation.title || 'Implantação',
    status: implementation.status || 'preparation',
    progress: implementation.progress || 0,
    responsible: implementation.responsible || 'Equipe de implantação Oi Beta',
    expectedGoLiveDate: implementation.expectedGoLiveDate,
    contractId: implementation.contractId,
    checklist: Array.isArray(implementation.checklist) ? implementation.checklist.map(normalizeChecklistItem) : [],
    notes: implementation.notes,
    createdAt: implementation.createdAt || now,
    updatedAt: implementation.updatedAt || now,
  };
}

function normalizeChecklistItem(item: Partial<ClientImplementationChecklistItem>, index: number): ClientImplementationChecklistItem {
  return {
    id: item.id || `checklist-${index}`,
    label: item.label || 'Etapa',
    description: item.description || '',
    done: Boolean(item.done),
  };
}

function normalizeFinancialRecord(record: Partial<ClientFinancialRecord>, index: number): ClientFinancialRecord {
  const now = new Date().toISOString();

  return {
    id: record.id || `financial-${index}`,
    title: record.title || 'Lançamento financeiro',
    status: record.status || 'pending',
    amount: record.amount || 0,
    dueDate: record.dueDate,
    paidAt: record.paidAt,
    contractId: record.contractId,
    notes: record.notes,
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
  };
}

function normalizeSupportTicket(ticket: Partial<ClientSupportTicket>, index: number): ClientSupportTicket {
  const now = new Date().toISOString();

  return {
    id: ticket.id || `ticket-${index}`,
    title: ticket.title || 'Chamado',
    status: ticket.status || 'open',
    priority: ticket.priority || 'medium',
    productId: ticket.productId,
    description: ticket.description,
    createdAt: ticket.createdAt || now,
    updatedAt: ticket.updatedAt || now,
  };
}

function normalizeNextAction(nextAction: Partial<ClientNextAction>): ClientNextAction {
  return {
    title: nextAction.title || '',
    dueDate: nextAction.dueDate,
    notes: nextAction.notes,
    updatedAt: nextAction.updatedAt || new Date().toISOString(),
  };
}

function parseCityAndState(value: string): { city: string; state: string } {
  const parts = value.split('-').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      city: parts.slice(0, -1).join(' - '),
      state: parts[parts.length - 1].toUpperCase(),
    };
  }

  return {
    city: value.trim(),
    state: '',
  };
}

function createClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `client-${crypto.randomUUID()}`;
  }

  return `client-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function createTimelineEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `timeline-${crypto.randomUUID()}`;
  }

  return `timeline-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}
