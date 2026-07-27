import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';
import { BETA_MARKET_SERVICES, type BetaMarketServiceDefinition } from '../core/commercial/CommercialRadarRegistry';
import { OpportunityRepository } from '../core/commercial/OpportunityRepository';
import { ProductCommercializationService, type ProductCommercializationSummary } from '../core/commercial/ProductCommercializationService';
import { ClientOperationService } from '../core/crmGov/ClientOperationService';
import { ClientOperationalBacklogService, type ClientOperationalBacklogItem, type ClientOperationalFlowSummary } from '../core/crmGov/ClientOperationalBacklogService';
import { ClientLifecycleService, type ClientLifecycleItem, type ClientLifecycleSummary } from '../core/crmGov/ClientLifecycleService';
import { ClientRevenueService, type ClientRevenueSummary } from '../core/crmGov/ClientRevenueService';
import { ClientSuccessService, type ClientSuccessSummary } from '../core/crmGov/ClientSuccessService';
import { ClientExecutiveService, type ClientExecutiveSummary } from '../core/crmGov/ClientExecutiveService';
import { ClientServiceLevelService, type ClientServiceLevelSummary } from '../core/crmGov/ClientServiceLevelService';
import { ClientProvisioningService, type ClientProvisioningReadiness } from '../core/crmGov/ClientProvisioningService';
import { CrmGovImplementationService } from '../core/crmGov/CrmGovImplementationService';
import type { CommercialOpportunity } from '../core/commercial/OpportunityTypes';
import type {
  ClientContactRecord,
  ClientContactRole,
  ClientEntityType,
  ClientNextAction,
  ClientOpportunityLink,
  ClientProductLink,
  ClientProductStatus,
  ClientProposalRecord,
  ClientProposalStatus,
  ClientContractRecord,
  ClientContractStatus,
  ClientImplementationChecklistItem,
  ClientImplementationRecord,
  ClientImplementationStatus,
  ClientFinancialRecord,
  ClientFinancialStatus,
  ClientRecord,
  ClientSupportTicket,
  ClientSupportTicketPriority,
  ClientSupportTicketStatus,
  ClientStatus,
  ClientProvisioningStatus,
  ClientTimelineEvent,
  ClientTimelineEventType,
} from './useClientState';

export interface ClientsWorkspaceClient {
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
  commercialScore: number;
  healthScore: number;
  nextAction?: ClientNextAction;
  createdAt: string;
  updatedAt: string;
}


export interface NewClientContactInput {
  name: string;
  role: ClientContactRole;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface NewClientTimelineInput {
  type: ClientTimelineEventType;
  title: string;
  description?: string;
  date?: string;
}

export interface UpdateClientNextActionInput {
  title: string;
  dueDate?: string;
  notes?: string;
}

export interface NewClientProposalInput {
  title: string;
  status: ClientProposalStatus;
  estimatedValue?: number;
  opportunityId?: string;
  productIds?: string[];
  notes?: string;
}

export interface NewClientContractInput {
  title: string;
  status: ClientContractStatus;
  proposalId?: string;
  contractValue: number;
  monthlyValue?: number;
  setupValue?: number;
  startDate?: string;
  endDate?: string;
  implementationDays?: number;
  scope?: string[];
  clauses?: string[];
  notes?: string;
}

export interface NewClientImplementationInput {
  title: string;
  status: ClientImplementationStatus;
  progress: number;
  responsible: string;
  expectedGoLiveDate?: string;
  contractId?: string;
  checklist: ClientImplementationChecklistItem[];
  notes?: string;
}

export interface NewClientFinancialInput {
  title: string;
  status: ClientFinancialStatus;
  amount: number;
  dueDate?: string;
  paidAt?: string;
  contractId?: string;
  notes?: string;
}

export interface NewClientSupportTicketInput {
  title: string;
  status: ClientSupportTicketStatus;
  priority: ClientSupportTicketPriority;
  productId?: string;
  description?: string;
}

export default function useClientsWorkspace() {
  const workspace = useWorkspace();

  const {
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
  } = workspace.clients;

  const [radarOpportunities, setRadarOpportunities] = useState<CommercialOpportunity[]>([]);
  const [preparingClientId, setPreparingClientId] = useState<string | null>(null);
  const [provisioningError, setProvisioningError] = useState<string>();

  useEffect(() => {
    let active = true;

    OpportunityRepository.list()
      .then((opportunities) => {
        if (active) {
          setRadarOpportunities(opportunities);
        }
      })
      .catch((error) => {
        console.warn('[CRM Gov] Falha ao carregar oportunidades do Radar Comercial.', error);
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedClientsList = useMemo<ClientsWorkspaceClient[]>(
    () =>
      clientsList.map((client, index) => {
        const safeClient = client as Partial<ClientRecord>;
        const now = new Date().toISOString();

        return {
          id: safeClient.id ?? `client-${index}`,
          organizationId: safeClient.organizationId,
          tenantId: safeClient.tenantId || safeClient.organizationId,
          tenantCommercialContractId: safeClient.tenantCommercialContractId,
          provisioningStatus: safeClient.provisioningStatus ?? 'not_provisioned',
          name: safeClient.name ?? safeClient.entity ?? '',
          city: safeClient.city ?? '',
          state: safeClient.state ?? '',
          entity: safeClient.entity ?? safeClient.name ?? '',
          entityType: safeClient.entityType ?? 'other',
          manager: safeClient.manager ?? '',
          status: safeClient.status ?? 'lead',
          contact: safeClient.contact ?? '',
          cnpj: safeClient.cnpj,
          population: safeClient.population,
          website: safeClient.website,
          pncpUrl: safeClient.pncpUrl,
          notes: safeClient.notes,
          contacts: Array.isArray(safeClient.contacts) ? safeClient.contacts : [],
          timeline: Array.isArray(safeClient.timeline) ? safeClient.timeline : [],
          opportunities: Array.isArray(safeClient.opportunities) ? safeClient.opportunities : [],
          products: Array.isArray(safeClient.products) ? safeClient.products : [],
          proposals: Array.isArray(safeClient.proposals) ? safeClient.proposals : [],
          contracts: Array.isArray(safeClient.contracts) ? safeClient.contracts : [],
          implementations: Array.isArray(safeClient.implementations) ? safeClient.implementations : [],
          financialRecords: Array.isArray(safeClient.financialRecords) ? safeClient.financialRecords : [],
          supportTickets: Array.isArray(safeClient.supportTickets) ? safeClient.supportTickets : [],
          commercialScore: calculateCommercialScore(safeClient),
          healthScore: calculateHealthScore(safeClient),
          nextAction: safeClient.nextAction,
          createdAt: safeClient.createdAt ?? now,
          updatedAt: safeClient.updatedAt ?? now,
        };
      }),
    [clientsList]
  );

  const handlePrepareContractedClient = useCallback(
    async (clientId: string): Promise<ClientProvisioningReadiness> => {
      const client = normalizedClientsList.find((item) => item.id === clientId);
      if (!client) throw new Error('Cliente não encontrado.');
      if (!['contracted', 'active', 'paused'].includes(client.status)) {
        throw new Error('Somente clientes contratados ou ativos podem ser preparados para operação.');
      }

      setPreparingClientId(clientId);
      setProvisioningError(undefined);

      try {
        const resolution = await ClientProvisioningService.resolve(client as ClientRecord);
        const now = new Date().toISOString();
        const hasImplementation = client.implementations.some(
          (item) => item.contractId === resolution.tenantCommercialContractId,
        );
        const crmContract = [...client.contracts]
          .filter((item) => item.status === 'active' || item.status === 'signed')
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        const generatedPlan = !hasImplementation && crmContract
          ? CrmGovImplementationService.generateFromContract(client.name || client.entity, crmContract)
          : undefined;
        const implementation = generatedPlan
          ? {
              ...generatedPlan,
              id: createImplementationId(),
              contractId: resolution.tenantCommercialContractId,
              createdAt: now,
              updatedAt: now,
            }
          : undefined;

        let finalReadiness = resolution.readiness;

        const implementations = implementation
          ? [implementation, ...client.implementations]
          : client.implementations;
        const prepared: ClientRecord = {
          ...(client as ClientRecord),
          organizationId: resolution.organizationId,
          tenantId: resolution.tenantId,
          tenantCommercialContractId: resolution.tenantCommercialContractId,
          provisioningStatus: 'provisioned',
          status: client.status === 'paused' ? client.status : 'contracted',
          products: client.products.map((product) =>
            resolution.productIds.includes(product.productId)
              ? { ...product, status: 'contracted' as const }
              : product,
          ),
          implementations,
          timeline: [
            createTimelineEvent({
              type: 'implementation',
              title: 'Ambiente do cliente preparado',
              description: `${resolution.productIds.length} produto(s) licenciado(s), tenant e contrato comercial vinculados${implementation ? ' e implantação inicial criada' : ''}.`,
            }),
            ...client.timeline,
          ],
          updatedAt: now,
        };

        finalReadiness = ClientProvisioningService.buildReadiness(
          prepared,
          resolution.readiness.tenant,
          resolution.readiness.contract,
          resolution.productIds,
        );

        setClientsList((current) =>
          current.map((item) => String(item.id) === clientId
            ? prepared as unknown as typeof item
            : item),
        );

        return finalReadiness;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setProvisioningError(message);
        setClientsList((current) =>
          current.map((item) => String(item.id) === clientId
            ? { ...item, provisioningStatus: 'blocked' as const, updatedAt: new Date().toISOString() }
            : item),
        );
        throw error;
      } finally {
        setPreparingClientId(null);
      }
    },
    [normalizedClientsList, setClientsList],
  );

  const handleRemoveClient = useCallback(
    (clientId: string) => {
      setClientsList(clientsList.filter((item) => item.id !== clientId));
    },
    [clientsList, setClientsList]
  );

  const handleUpdateClientStatus = useCallback(
    (clientId: string, status: ClientStatus) => {
      setClientsList(
        clientsList.map((client) =>
          client.id === clientId
            ? {
                ...client,
                status,
                timeline: [
                  createTimelineEvent({
                    type: 'note',
                    title: `Status alterado para ${status}`,
                    description: 'Atualização registrada no pipeline comercial.',
                  }),
                  ...(Array.isArray(client.timeline) ? client.timeline : []),
                ],
                updatedAt: new Date().toISOString(),
              }
            : client
        )
      );
    },
    [clientsList, setClientsList]
  );

  const handleUpdateClientType = useCallback(
    (clientId: string, entityType: ClientEntityType) => {
      setClientsList(
        clientsList.map((client) =>
          client.id === clientId
            ? { ...client, entityType, updatedAt: new Date().toISOString() }
            : client
        )
      );
    },
    [clientsList, setClientsList]
  );

  const handleAddContact = useCallback(
    (clientId: string, input: NewClientContactInput) => {
      if (!input.name.trim()) return;

      const now = new Date().toISOString();
      const contact: ClientContactRecord = {
        id: createContactId(),
        name: input.name.trim(),
        role: input.role,
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdAt: now,
      };

      setClientsList(
        clientsList.map((client) =>
          client.id === clientId
            ? {
                ...client,
                contacts: [contact, ...(Array.isArray(client.contacts) ? client.contacts : [])],
                timeline: [
                  createTimelineEvent({
                    type: 'note',
                    title: `Contato cadastrado: ${contact.name}`,
                    description: contact.email || contact.phone || undefined,
                  }),
                  ...(Array.isArray(client.timeline) ? client.timeline : []),
                ],
                updatedAt: now,
              }
            : client
        )
      );
    },
    [clientsList, setClientsList]
  );

  const handleAddTimelineEvent = useCallback(
    (clientId: string, input: NewClientTimelineInput) => {
      if (!input.title.trim()) return;

      const event = createTimelineEvent(input);

      setClientsList(
        clientsList.map((client) =>
          client.id === clientId
            ? {
                ...client,
                timeline: [event, ...(Array.isArray(client.timeline) ? client.timeline : [])],
                updatedAt: new Date().toISOString(),
              }
            : client
        )
      );
    },
    [clientsList, setClientsList]
  );

  const handleUpdateNextAction = useCallback(
    (clientId: string, input: UpdateClientNextActionInput) => {
      const title = input.title.trim();

      setClientsList(
        clientsList.map((client) =>
          client.id === clientId
            ? {
                ...client,
                nextAction: title
                  ? {
                      title,
                      dueDate: input.dueDate || undefined,
                      notes: input.notes?.trim() || undefined,
                      updatedAt: new Date().toISOString(),
                    }
                  : undefined,
                timeline: title
                  ? [
                      createTimelineEvent({
                        type: 'note',
                        title: `Próxima ação definida: ${title}`,
                        description: input.dueDate ? `Prazo: ${input.dueDate}` : undefined,
                      }),
                      ...(Array.isArray(client.timeline) ? client.timeline : []),
                    ]
                  : Array.isArray(client.timeline) ? client.timeline : [],
                updatedAt: new Date().toISOString(),
              }
            : client
        )
      );
    },
    [clientsList, setClientsList]
  );

  const getSuggestedOpportunitiesForClient = useCallback(
    (client: ClientsWorkspaceClient): CommercialOpportunity[] => {
      const city = client.city.trim().toLowerCase();
      const state = client.state.trim().toLowerCase();
      const entity = client.entity.trim().toLowerCase();

      return radarOpportunities.filter((opportunity) => {
        const buyer = opportunity.buyerName.toLowerCase();
        const opportunityCity = opportunity.city?.toLowerCase() || '';
        const opportunityState = opportunity.state?.toLowerCase() || '';

        const alreadyLinked = client.opportunities.some((link) => link.opportunityId === opportunity.id);

        if (alreadyLinked) return false;

        return (
          (city && opportunityCity === city) ||
          (state && opportunityState === state && buyer.includes(entity.split(' ')[0])) ||
          (entity && buyer.includes(entity.split(' ')[0]))
        );
      });
    },
    [radarOpportunities]
  );

  const getSuggestedProductsForClient = useCallback(
    (client: ClientsWorkspaceClient): BetaMarketServiceDefinition[] => {
      const entityLabel = resolveEntityTarget(client.entityType).toLowerCase();
      const linkedProductIds = new Set(client.products.map((product) => product.productId));
      const opportunityText = client.opportunities.map((opportunity) => opportunity.title).join(' ').toLowerCase();

      return BETA_MARKET_SERVICES
        .filter((service) => !linkedProductIds.has(service.productId))
        .filter((service) => {
          const targetMatch = service.targetBuyers.some((buyer) => buyer.toLowerCase().includes(entityLabel));
          const keywordMatch = service.procurementKeywords.some((keyword) => opportunityText.includes(keyword.toLowerCase()));

          return targetMatch || keywordMatch || client.opportunities.length === 0;
        })
        .slice(0, 4);
    },
    []
  );

  const handleSetProductStatus = useCallback(
    (clientId: string, service: BetaMarketServiceDefinition, status: ClientProductStatus) => {
      const now = new Date().toISOString();
      const productLink: ClientProductLink = {
        serviceId: service.id,
        productId: service.productId,
        shortName: service.shortName,
        commercialName: service.commercialName,
        status,
        linkedAt: now,
      };

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          const currentProducts = Array.isArray(client.products) ? client.products : [];
          const existingProduct = currentProducts.find((item) => item.serviceId === service.id);
          const nextProducts = existingProduct
            ? currentProducts.map((item) => (item.serviceId === service.id ? { ...item, status } : item))
            : [productLink, ...currentProducts];

          return {
            ...client,
            products: nextProducts,
            timeline: [
              createTimelineEvent({
                type: 'note',
                title: `Produto ${existingProduct ? 'atualizado' : 'vinculado'}: ${service.shortName}`,
                description: `Status comercial: ${status}`,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleAddFinancialRecord = useCallback(
    (clientId: string, input: NewClientFinancialInput) => {
      if (!input.title.trim()) return;

      const now = new Date().toISOString();
      const financialRecord: ClientFinancialRecord = {
        id: createFinancialRecordId(),
        title: input.title.trim(),
        status: input.status,
        amount: input.amount,
        dueDate: input.dueDate,
        paidAt: input.paidAt,
        contractId: input.contractId,
        notes: input.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          return {
            ...client,
            financialRecords: [financialRecord, ...(Array.isArray(client.financialRecords) ? client.financialRecords : [])],
            timeline: [
              createTimelineEvent({
                type: 'note',
                title: `Financeiro registrado: ${financialRecord.title}`,
                description: financialRecord.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleAddSupportTicket = useCallback(
    (clientId: string, input: NewClientSupportTicketInput) => {
      if (!input.title.trim()) return;

      const now = new Date().toISOString();
      const ticket: ClientSupportTicket = {
        id: createSupportTicketId(),
        title: input.title.trim(),
        status: input.status,
        priority: input.priority,
        productId: input.productId,
        description: input.description?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          return {
            ...client,
            supportTickets: [ticket, ...(Array.isArray(client.supportTickets) ? client.supportTickets : [])],
            timeline: [
              createTimelineEvent({
                type: 'note',
                title: `Chamado registrado: ${ticket.title}`,
                description: ticket.description,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleUpdateSupportTicketStatus = useCallback(
    (clientId: string, ticketId: string, status: ClientSupportTicketStatus) => {
      const now = new Date().toISOString();

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          return {
            ...client,
            supportTickets: (Array.isArray(client.supportTickets) ? client.supportTickets : []).map((ticket) =>
              ticket.id === ticketId ? { ...ticket, status, updatedAt: now } : ticket
            ),
            timeline: [
              createTimelineEvent({
                type: 'note',
                title: `Status do chamado atualizado`,
                description: status,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleAddImplementation = useCallback(
    (clientId: string, input: NewClientImplementationInput) => {
      if (!input.title.trim()) return;

      const now = new Date().toISOString();
      const implementation: ClientImplementationRecord = {
        id: createImplementationId(),
        title: input.title.trim(),
        status: input.status,
        progress: input.progress,
        responsible: input.responsible,
        expectedGoLiveDate: input.expectedGoLiveDate,
        contractId: input.contractId,
        checklist: input.checklist,
        notes: input.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          return {
            ...client,
            status: implementation.status === 'completed' ? 'active' : 'contracted',
            implementations: [implementation, ...(Array.isArray(client.implementations) ? client.implementations : [])],
            timeline: [
              createTimelineEvent({
                type: 'implementation',
                title: `Implantação criada: ${implementation.title}`,
                description: implementation.expectedGoLiveDate ? `Go Live previsto: ${implementation.expectedGoLiveDate}` : implementation.notes,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleToggleImplementationItem = useCallback(
    (clientId: string, implementationId: string, itemId: string) => {
      const now = new Date().toISOString();

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          const implementations = (Array.isArray(client.implementations) ? client.implementations : []).map((implementation) => {
            if (implementation.id !== implementationId) return implementation;

            const checklist = implementation.checklist.map((item) =>
              item.id === itemId ? { ...item, done: !item.done } : item
            );

            const progress = checklist.length === 0
              ? 0
              : Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);

            return {
              ...implementation,
              checklist,
              progress,
              status: resolveImplementationStatus(progress),
              updatedAt: now,
            };
          });

          const changedImplementation = implementations.find((implementation) => implementation.id === implementationId);

          return {
            ...client,
            status: changedImplementation?.status === 'completed' ? 'active' : client.status,
            implementations,
            timeline: [
              createTimelineEvent({
                type: 'implementation',
                title: 'Checklist de implantação atualizado',
                description: changedImplementation ? `${changedImplementation.progress}% concluído` : undefined,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleAddContract = useCallback(
    (clientId: string, input: NewClientContractInput) => {
      if (!input.title.trim()) return;

      const now = new Date().toISOString();
      const contract: ClientContractRecord = {
        id: createContractId(),
        title: input.title.trim(),
        status: input.status,
        proposalId: input.proposalId,
        contractValue: input.contractValue,
        monthlyValue: input.monthlyValue,
        setupValue: input.setupValue,
        startDate: input.startDate,
        endDate: input.endDate,
        implementationDays: input.implementationDays,
        scope: input.scope || [],
        clauses: input.clauses || [],
        notes: input.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          return {
            ...client,
            status: contract.status === 'active' || contract.status === 'signed' ? 'contracted' : client.status,
            contracts: [contract, ...(Array.isArray(client.contracts) ? client.contracts : [])],
            timeline: [
              createTimelineEvent({
                type: 'contract',
                title: `Contrato registrado: ${contract.title}`,
                description: contract.contractValue
                  ? `Valor: ${contract.contractValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : contract.notes,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleAddProposal = useCallback(
    (clientId: string, input: NewClientProposalInput) => {
      if (!input.title.trim()) return;

      const now = new Date().toISOString();
      const proposal: ClientProposalRecord = {
        id: createProposalId(),
        title: input.title.trim(),
        status: input.status,
        estimatedValue: input.estimatedValue,
        opportunityId: input.opportunityId,
        productIds: input.productIds || [],
        notes: input.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          return {
            ...client,
            status: proposal.status === 'accepted' ? 'contracted' : 'proposal',
            proposals: [proposal, ...(Array.isArray(client.proposals) ? client.proposals : [])],
            timeline: [
              createTimelineEvent({
                type: 'proposal',
                title: `Proposta registrada: ${proposal.title}`,
                description: proposal.estimatedValue
                  ? `Valor estimado: ${proposal.estimatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : proposal.notes,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const handleLinkOpportunity = useCallback(
    (clientId: string, opportunity: CommercialOpportunity) => {
      const now = new Date().toISOString();
      const link: ClientOpportunityLink = {
        opportunityId: opportunity.id,
        title: opportunity.title,
        source: 'commercial_radar',
        linkedAt: now,
      };

      setClientsList(
        clientsList.map((client) => {
          if (client.id !== clientId) return client;

          const currentLinks = Array.isArray(client.opportunities) ? client.opportunities : [];
          const alreadyLinked = currentLinks.some((item) => item.opportunityId === opportunity.id);

          if (alreadyLinked) return client;

          return {
            ...client,
            opportunities: [link, ...currentLinks],
            timeline: [
              createTimelineEvent({
                type: 'opportunity',
                title: `Oportunidade vinculada: ${opportunity.title}`,
                description: opportunity.object,
              }),
              ...(Array.isArray(client.timeline) ? client.timeline : []),
            ],
            updatedAt: now,
          };
        })
      );
    },
    [clientsList, setClientsList]
  );

  const getClientOperationSummary = useCallback(
    (client: ClientsWorkspaceClient) =>
      ClientOperationService.buildSummary({
        contracts: client.contracts,
        financialRecords: client.financialRecords,
        supportTickets: client.supportTickets,
        implementations: client.implementations,
      }),
    []
  );

  const handleCreateClient = useCallback(
    (event: React.FormEvent) => {
      return handleAddClient(event);
    },
    [handleAddClient]
  );

  const totalClients = normalizedClientsList.length;
  const activeClients = normalizedClientsList.filter((client) => client.status === 'active').length;
  const leads = normalizedClientsList.filter((client) => client.status === 'lead' || client.status === 'prospect').length;
  const proposals = normalizedClientsList.filter((client) => client.status === 'proposal').length;
  const contactsCount = normalizedClientsList.reduce((sum, client) => sum + client.contacts.length, 0);
  const nextActionsCount = normalizedClientsList.filter((client) => Boolean(client.nextAction?.title)).length;
  const linkedOpportunitiesCount = normalizedClientsList.reduce((sum, client) => sum + client.opportunities.length, 0);
  const linkedProductsCount = normalizedClientsList.reduce((sum, client) => sum + client.products.length, 0);
  const proposalsCount = normalizedClientsList.reduce((sum, client) => sum + client.proposals.length, 0);
  const contractsCount = normalizedClientsList.reduce((sum, client) => sum + client.contracts.length, 0);
  const implementationsCount = normalizedClientsList.reduce((sum, client) => sum + client.implementations.length, 0);
  const financialRecordsCount = normalizedClientsList.reduce((sum, client) => sum + client.financialRecords.length, 0);
  const overdueAmount = normalizedClientsList.reduce((sum, client) => sum + client.financialRecords.filter((record) => record.status === 'overdue').reduce((clientSum, record) => clientSum + record.amount, 0), 0);
  const supportTicketsCount = normalizedClientsList.reduce((sum, client) => sum + client.supportTickets.length, 0);
  const openSupportTicketsCount = normalizedClientsList.reduce((sum, client) => sum + client.supportTickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length, 0);
  const averageImplementationProgress = calculateAverage(normalizedClientsList.flatMap((client) => client.implementations.map((implementation) => implementation.progress)));
  const contractsValue = normalizedClientsList.reduce((sum, client) => sum + client.contracts.reduce((clientSum, contract) => clientSum + (contract.contractValue || 0), 0), 0);
  const proposalsValue = normalizedClientsList.reduce((sum, client) => sum + client.proposals.reduce((clientSum, proposal) => clientSum + (proposal.estimatedValue || 0), 0), 0);
  const averageCommercialScore = calculateAverage(normalizedClientsList.map((client) => client.commercialScore));
  const averageHealthScore = calculateAverage(normalizedClientsList.map((client) => client.healthScore));

  const operationalBacklog = useMemo<ClientOperationalBacklogItem[]>(
    () => ClientOperationalBacklogService.buildForClients(normalizedClientsList),
    [normalizedClientsList]
  );

  const operationalFlowSummary = useMemo<ClientOperationalFlowSummary>(
    () => ClientOperationalBacklogService.buildSummary(normalizedClientsList, operationalBacklog),
    [normalizedClientsList, operationalBacklog]
  );

  const clientLifecycle = useMemo<ClientLifecycleItem[]>(
    () => ClientLifecycleService.buildForClients(normalizedClientsList, operationalBacklog),
    [normalizedClientsList, operationalBacklog]
  );

  const clientLifecycleSummary = useMemo<ClientLifecycleSummary>(
    () => ClientLifecycleService.buildSummary(clientLifecycle),
    [clientLifecycle]
  );

  const clientRevenueSummary = useMemo<ClientRevenueSummary>(
    () => ClientRevenueService.buildSummary(normalizedClientsList),
    [normalizedClientsList]
  );

  const clientSuccessSummary = useMemo<ClientSuccessSummary>(
    () => ClientSuccessService.buildSummary(
      normalizedClientsList,
      clientLifecycle,
      clientLifecycleSummary,
      clientRevenueSummary,
    ),
    [normalizedClientsList, clientLifecycle, clientLifecycleSummary, clientRevenueSummary]
  );

  const clientServiceLevelSummary = useMemo<ClientServiceLevelSummary>(
    () => ClientServiceLevelService.buildSummary(normalizedClientsList),
    [normalizedClientsList]
  );

  const clientExecutiveSummary = useMemo<ClientExecutiveSummary>(
    () => ClientExecutiveService.buildSummary({
      operationalBacklog,
      operationalFlowSummary,
      clientLifecycleSummary,
      clientRevenueSummary,
      clientSuccessSummary,
    }),
    [
      operationalBacklog,
      operationalFlowSummary,
      clientLifecycleSummary,
      clientRevenueSummary,
      clientSuccessSummary,
    ]
  );

  const productCommercializationSummary = useMemo<ProductCommercializationSummary>(
    () => ProductCommercializationService.buildSummary(normalizedClientsList, radarOpportunities),
    [normalizedClientsList, radarOpportunities]
  );

  return useMemo(
    () => ({
      clientsList: normalizedClientsList,
      totalClients,
      activeClients,
      leads,
      proposals,
      contactsCount,
      nextActionsCount,
      linkedOpportunitiesCount,
      linkedProductsCount,
      proposalsCount,
      contractsCount,
      implementationsCount,
      averageImplementationProgress,
      financialRecordsCount,
      overdueAmount,
      supportTicketsCount,
      openSupportTicketsCount,
      contractsValue,
      proposalsValue,
      averageCommercialScore,
      averageHealthScore,
      operationalBacklog,
      operationalFlowSummary,
      clientLifecycle,
      clientLifecycleSummary,
      clientRevenueSummary,
      clientSuccessSummary,
      clientServiceLevelSummary,
      clientExecutiveSummary,
      productCommercializationSummary,
      radarOpportunities,
      newClientCity,
      setNewClientCity,
      newClientEntity,
      setNewClientEntity,
      newClientManager,
      setNewClientManager,
      newClientContact,
      setNewClientContact,
      handleCreateClient,
      handleRemoveClient,
      handleUpdateClientStatus,
      handleUpdateClientType,
      handleAddContact,
      handleAddTimelineEvent,
      handleUpdateNextAction,
      getSuggestedOpportunitiesForClient,
      handleLinkOpportunity,
      getSuggestedProductsForClient,
      handleSetProductStatus,
      handleAddProposal,
      handleAddContract,
      handleAddImplementation,
      handleToggleImplementationItem,
      handlePrepareContractedClient,
      preparingClientId,
      provisioningError,
      handleAddFinancialRecord,
      handleAddSupportTicket,
      handleUpdateSupportTicketStatus,
      getClientOperationSummary,
    }),
    [
      normalizedClientsList,
      totalClients,
      activeClients,
      leads,
      proposals,
      contactsCount,
      nextActionsCount,
      linkedOpportunitiesCount,
      linkedProductsCount,
      proposalsCount,
      contractsCount,
      implementationsCount,
      averageImplementationProgress,
      financialRecordsCount,
      overdueAmount,
      supportTicketsCount,
      openSupportTicketsCount,
      contractsValue,
      proposalsValue,
      averageCommercialScore,
      averageHealthScore,
      operationalBacklog,
      operationalFlowSummary,
      clientLifecycle,
      clientLifecycleSummary,
      clientRevenueSummary,
      clientSuccessSummary,
      clientServiceLevelSummary,
      clientExecutiveSummary,
      productCommercializationSummary,
      radarOpportunities,
      newClientCity,
      setNewClientCity,
      newClientEntity,
      setNewClientEntity,
      newClientManager,
      setNewClientManager,
      newClientContact,
      setNewClientContact,
      handleCreateClient,
      handleRemoveClient,
      handleUpdateClientStatus,
      handleUpdateClientType,
      handleAddContact,
      handleAddTimelineEvent,
      handleUpdateNextAction,
      getSuggestedOpportunitiesForClient,
      handleLinkOpportunity,
      getSuggestedProductsForClient,
      handleSetProductStatus,
      handleAddProposal,
      handleAddContract,
      handleAddImplementation,
      handleToggleImplementationItem,
      handlePrepareContractedClient,
      preparingClientId,
      provisioningError,
      handleAddFinancialRecord,
      handleAddSupportTicket,
      handleUpdateSupportTicketStatus,
      getClientOperationSummary,
    ]
  );
}



function calculateCommercialScore(client: Partial<ClientRecord> & { implementations?: ClientImplementationRecord[] }): number {
  const statusWeight: Record<ClientStatus, number> = {
    lead: 10,
    prospect: 18,
    proposal: 45,
    contracted: 75,
    active: 90,
    paused: 40,
    lost: 0,
  };

  const base = statusWeight[client.status || 'lead'] || 0;
  const contacts = Math.min(20, (Array.isArray(client.contacts) ? client.contacts.length : 0) * 6);
  const opportunities = Math.min(25, (Array.isArray(client.opportunities) ? client.opportunities.length : 0) * 10);
  const nextAction = client.nextAction?.title ? 10 : 0;
  const products = Math.min(15, (Array.isArray(client.products) ? client.products.length : 0) * 5);
  const proposals = Math.min(20, (Array.isArray(client.proposals) ? client.proposals.length : 0) * 10);
  const contracts = Math.min(25, (Array.isArray(client.contracts) ? client.contracts.length : 0) * 15);
  const implementations = Math.min(25, (Array.isArray(client.implementations) ? client.implementations.length : 0) * 15);
  const finance = Array.isArray(client.financialRecords) && client.financialRecords.length > 0 ? 10 : 0;
  const support = Array.isArray(client.supportTickets) && client.supportTickets.length > 0 ? 5 : 0;

  return Math.min(100, Math.round(base + contacts + opportunities + nextAction + products + proposals + contracts + implementations + finance + support));
}

function calculateHealthScore(client: Partial<ClientRecord>): number {
  const contacts = Math.min(30, (Array.isArray(client.contacts) ? client.contacts.length : 0) * 10);
  const timeline = Array.isArray(client.timeline) ? client.timeline : [];
  const recentInteraction = timeline.some((event) => {
    const time = new Date(event.date).getTime();
    return Number.isFinite(time) && Date.now() - time < 1000 * 60 * 60 * 24 * 30;
  }) ? 30 : 0;
  const nextAction = client.nextAction?.title ? 25 : 0;
  const activePipeline = client.status && !['lost', 'paused'].includes(client.status) ? 15 : 0;
  const proposals = Array.isArray(client.proposals) && client.proposals.length > 0 ? 10 : 0;
  const contracts = Array.isArray(client.contracts) && client.contracts.length > 0 ? 15 : 0;
  const implementations = Array.isArray(client.implementations) && client.implementations.some((implementation) => implementation.status === 'completed') ? 15 : 0;
  const overduePenalty = Array.isArray(client.financialRecords) && client.financialRecords.some((record) => record.status === 'overdue') ? -20 : 0;
  const criticalTicketPenalty = Array.isArray(client.supportTickets) && client.supportTickets.some((ticket) => ticket.priority === 'critical' && ticket.status !== 'closed') ? -15 : 0;

  return Math.max(0, Math.min(100, Math.round(contacts + recentInteraction + nextAction + activePipeline + proposals + contracts + implementations + overduePenalty + criticalTicketPenalty)));
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function resolveEntityTarget(entityType: ClientEntityType): string {
  const targets: Record<ClientEntityType, string> = {
    city_hall: 'prefeituras',
    city_council: 'câmaras',
    autarchy: 'autarquias',
    consortium: 'consórcios',
    iprem: 'iprems',
    foundation: 'fundações',
    public_company: 'empresas públicas',
    other: '',
  };

  return targets[entityType];
}

function createFinancialRecordId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `financial-${crypto.randomUUID()}`;
  }

  return `financial-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function createSupportTicketId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `ticket-${crypto.randomUUID()}`;
  }

  return `ticket-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function createImplementationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `implementation-${crypto.randomUUID()}`;
  }

  return `implementation-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function resolveImplementationStatus(progress: number): ClientImplementationStatus {
  if (progress >= 100) return 'completed';
  if (progress >= 80) return 'go_live';
  if (progress >= 55) return 'training';
  if (progress > 0) return 'in_progress';

  return 'preparation';
}

function createContractId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `contract-${crypto.randomUUID()}`;
  }

  return `contract-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function createProposalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `proposal-${crypto.randomUUID()}`;
  }

  return `proposal-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function createContactId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `contact-${crypto.randomUUID()}`;
  }

  return `contact-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function createTimelineEvent(input: NewClientTimelineInput): ClientTimelineEvent {
  const now = new Date().toISOString();

  return {
    id: createTimelineEventId(),
    type: input.type,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    date: input.date || now,
    createdAt: now,
  };
}

function createTimelineEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `timeline-${crypto.randomUUID()}`;
  }

  return `timeline-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}
