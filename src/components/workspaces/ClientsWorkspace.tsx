import { useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Building2, CalendarClock, CheckCircle2, DollarSign, FileText, FileSearch, Headphones, Link2, Mail, PackageCheck, Plus, Search, ShieldCheck, Sparkles, Trash2, UserPlus, Users, X } from 'lucide-react';
import type { ClientContactRole, ClientContractStatus, ClientEntityType, ClientFinancialStatus, ClientImplementationStatus, ClientProductStatus, ClientProposalStatus, ClientStatus, ClientSupportTicketPriority, ClientSupportTicketStatus, ClientTimelineEventType } from '../../hooks/useClientState';
import { BETA_MARKET_SERVICES, type BetaMarketServiceDefinition } from '../../core/commercial/CommercialRadarRegistry';
import type { CommercialOpportunity } from '../../core/commercial/OpportunityTypes';
import { CrmGovProposalService } from '../../core/crmGov/CrmGovProposalService';
import { CrmGovContractService } from '../../core/crmGov/CrmGovContractService';
import { CrmGovImplementationService } from '../../core/crmGov/CrmGovImplementationService';
import { CrmGovDiagnosisService, type CrmGovDiagnosisResult } from '../../core/crmGov/CrmGovDiagnosisService';
import useClientsWorkspace, { type ClientsWorkspaceClient, type NewClientContactInput, type NewClientTimelineInput, type NewClientContractInput, type NewClientFinancialInput, type NewClientImplementationInput, type NewClientProposalInput, type NewClientSupportTicketInput, type UpdateClientNextActionInput } from '../../hooks/useClientsWorkspace';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';

const ENTITY_TYPES: { value: ClientEntityType; label: string }[] = [
  { value: 'city_hall', label: 'Prefeitura' },
  { value: 'city_council', label: 'Câmara Municipal' },
  { value: 'autarchy', label: 'Autarquia' },
  { value: 'consortium', label: 'Consórcio' },
  { value: 'iprem', label: 'IPREM' },
  { value: 'foundation', label: 'Fundação' },
  { value: 'public_company', label: 'Empresa Pública' },
  { value: 'other', label: 'Outro' },
];

const CLIENT_STATUSES: { value: ClientStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Diagnóstico' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'contracted', label: 'Contratado' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'lost', label: 'Perdido' },
];


const PROPOSAL_STATUSES: { value: ClientProposalStatus; label: string }[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'sent', label: 'Enviada' },
  { value: 'negotiation', label: 'Negociação' },
  { value: 'accepted', label: 'Aceita' },
  { value: 'rejected', label: 'Rejeitada' },
];

const CONTRACT_STATUSES: { value: ClientContractStatus; label: string }[] = [
  { value: 'draft', label: 'Minuta' },
  { value: 'ready', label: 'Pronto' },
  { value: 'signed', label: 'Assinado' },
  { value: 'active', label: 'Ativo' },
  { value: 'expired', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
];


const FINANCIAL_STATUSES: { value: ClientFinancialStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'overdue', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
];

const SUPPORT_STATUSES: { value: ClientSupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em atendimento' },
  { value: 'waiting_client', label: 'Aguardando cliente' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
];

const SUPPORT_PRIORITIES: { value: ClientSupportTicketPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

const IMPLEMENTATION_STATUSES: { value: ClientImplementationStatus; label: string }[] = [
  { value: 'preparation', label: 'Preparação' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'waiting_client', label: 'Aguardando cliente' },
  { value: 'training', label: 'Treinamento' },
  { value: 'go_live', label: 'Go Live' },
  { value: 'completed', label: 'Concluída' },
  { value: 'blocked', label: 'Bloqueada' },
];

const COMMERCIAL_PIPELINE_STAGES: { value: ClientStatus; label: string; description: string }[] = [
  { value: 'lead', label: 'Lead', description: 'Órgão identificado' },
  { value: 'prospect', label: 'Diagnóstico', description: 'Necessidade em avaliação' },
  { value: 'proposal', label: 'Proposta', description: 'Proposta em andamento' },
  { value: 'contracted', label: 'Contrato', description: 'Contrato fechado' },
  { value: 'active', label: 'Cliente ativo', description: 'Em operação' },
];

const PIPELINE_FLOW: ClientStatus[] = ['lead', 'prospect', 'proposal', 'contracted', 'active'];

const CONTACT_ROLES: { value: ClientContactRole; label: string }[] = [
  { value: 'mayor', label: 'Prefeito' },
  { value: 'vice_mayor', label: 'Vice-prefeito' },
  { value: 'president', label: 'Presidente' },
  { value: 'secretary', label: 'Secretário' },
  { value: 'controller', label: 'Controlador' },
  { value: 'attorney', label: 'Procurador' },
  { value: 'procurement', label: 'Compras / Licitação' },
  { value: 'it', label: 'TI' },
  { value: 'cabinet', label: 'Gabinete' },
  { value: 'other', label: 'Outro' },
];

const TIMELINE_TYPES: { value: ClientTimelineEventType; label: string }[] = [
  { value: 'call', label: 'Ligação' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'visit', label: 'Visita' },
  { value: 'opportunity', label: 'Oportunidade' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'contract', label: 'Contrato' },
  { value: 'implementation', label: 'Implantação' },
  { value: 'note', label: 'Nota' },
];

export default function ClientsWorkspace() {
  const {
    clientsList,
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
    operationalFlowSummary,
    clientLifecycleSummary,
    clientRevenueSummary,
    clientSuccessSummary,
    clientExecutiveSummary,
    productCommercializationSummary,
    getSuggestedOpportunitiesForClient,
    getSuggestedProductsForClient,
    handleLinkOpportunity,
    handleSetProductStatus,
    handleAddProposal,
    handleAddContract,
    handleAddImplementation,
    handleToggleImplementationItem,
    handleAddFinancialRecord,
    handleAddSupportTicket,
    handleUpdateSupportTicketStatus,
    getClientOperationSummary,
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
  } = useClientsWorkspace();

  const [selectedClient, setSelectedClient] = useState<ClientsWorkspaceClient | null>(null);

  const currentSelectedClient = selectedClient
    ? clientsList.find((client) => client.id === selectedClient.id) || null
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,129,247,0.16),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-[var(--blue-accent)] font-black">
              Oi Beta / CRM Gov
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Building2 className="w-7 h-7 text-[var(--blue-accent)]" />
              CRM Gov
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Carteira comercial especializada em órgãos públicos, agora com contatos, próxima ação e timeline operacional.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-indigo-200">Beta no CRM</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Oi, Douglas. Agora consigo acompanhar histórico e próximas ações por órgão. Isso evita oportunidades esquecidas.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <CrmMetricCard icon={<Building2 className="w-4 h-4" />} label="Órgãos" value={totalClients} helper="Carteira Gov" />
        <CrmMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Ativos" value={activeClients} helper="Clientes em operação" />
        <CrmMetricCard icon={<Search className="w-4 h-4" />} label="Leads" value={leads} helper="Prospecção" />
        <CrmMetricCard icon={<Mail className="w-4 h-4" />} label="Propostas" value={proposals} helper="Negociação" />
        <CrmMetricCard icon={<Users className="w-4 h-4" />} label="Contatos" value={contactsCount} helper="Pessoas-chave" />
        <CrmMetricCard icon={<CalendarClock className="w-4 h-4" />} label="Próximas ações" value={nextActionsCount} helper="Follow-up" />
        <CrmMetricCard icon={<FileSearch className="w-4 h-4" />} label="Oportunidades" value={linkedOpportunitiesCount} helper="Vínculos Radar" />
        <CrmMetricCard icon={<PackageCheck className="w-4 h-4" />} label="Produtos" value={linkedProductsCount} helper="Interesse comercial" />
        <CrmMetricCard icon={<BarChart3 className="w-4 h-4" />} label="Score médio" value={`${averageCommercialScore}%`} helper="Potencial comercial" />
        <CrmMetricCard icon={<Sparkles className="w-4 h-4" />} label="Relacionamento" value={`${averageHealthScore}%`} helper="Health médio" />
        <CrmMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Produtos" value={`${productCommercializationSummary.averageReadiness}%`} helper={`${productCommercializationSummary.sellableProducts} vendáveis`} />
      </section>

      <CommercialPipelineBoard clients={clientsList} />

      <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.85fr] gap-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h2 className="text-sm font-black text-[var(--text-main)]">Carteira de órgãos</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Clique em um órgão para abrir contatos, timeline e próxima ação.
            </p>
          </div>

          <ClientsTable
            clients={clientsList}
            onRemove={handleRemoveClient}
            onOpen={setSelectedClient}
          />
        </div>

        <form onSubmit={handleCreateClient} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-color)] shadow-sm space-y-4 h-fit">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.22em] text-[var(--blue-accent)] font-black">
              Cadastro rápido
            </span>
            <h2 className="text-lg font-black text-[var(--text-main)] mt-1">
              Novo órgão
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Cadastre o órgão real e depois complemente no painel de detalhes.
            </p>
          </div>

          <Field label="Cidade / UF" required>
            <input value={newClientCity} onChange={(event) => setNewClientCity(event.target.value)} className="crm-input" placeholder="Ex: Campinas - SP" required />
          </Field>

          <Field label="Órgão / Entidade" required>
            <input value={newClientEntity} onChange={(event) => setNewClientEntity(event.target.value)} className="crm-input" placeholder="Ex: Prefeitura Municipal de Campinas" required />
          </Field>

          <Field label="Responsável principal">
            <input value={newClientManager} onChange={(event) => setNewClientManager(event.target.value)} className="crm-input" placeholder="Ex: Prefeito, secretário, comprador..." />
          </Field>

          <Field label="E-mail / contato">
            <input type="email" value={newClientContact} onChange={(event) => setNewClientContact(event.target.value)} className="crm-input" placeholder="Ex: gabinete@municipio.gov.br" />
          </Field>

          <button type="submit" className="bg-[var(--blue-accent)] hover:opacity-95 text-white font-black py-2.5 px-5 rounded-xl text-xs sm:text-sm tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer w-full border-0">
            <Plus className="w-4 h-4" /> Cadastrar órgão
          </button>
        </form>
      </section>

      <ClientDetailsPanel
        client={currentSelectedClient}
        onClose={() => setSelectedClient(null)}
        onStatusChange={handleUpdateClientStatus}
        onTypeChange={handleUpdateClientType}
        onAddContact={handleAddContact}
        onAddTimelineEvent={handleAddTimelineEvent}
        onUpdateNextAction={handleUpdateNextAction}
        getSuggestedOpportunities={getSuggestedOpportunitiesForClient}
        onLinkOpportunity={handleLinkOpportunity}
        getSuggestedProducts={getSuggestedProductsForClient}
        onSetProductStatus={handleSetProductStatus}
        onAddProposal={handleAddProposal}
        onAddContract={handleAddContract}
        onAddImplementation={handleAddImplementation}
        onToggleImplementationItem={handleToggleImplementationItem}
        onAddFinancialRecord={handleAddFinancialRecord}
        onAddSupportTicket={handleAddSupportTicket}
        onUpdateSupportTicketStatus={handleUpdateSupportTicketStatus}
        getOperationSummary={getClientOperationSummary}
      />
    </div>
  );
}

function ClientsTable({ clients, onRemove, onOpen }: { clients: ClientsWorkspaceClient[]; onRemove: (clientId: string) => void; onOpen: (client: ClientsWorkspaceClient) => void }) {
  if (clients.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border-color)] rounded-2xl p-8 text-center bg-[var(--bg-main)]/20">
        <div className="w-12 h-12 rounded-2xl mx-auto bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center mb-4">
          <Users className="w-5 h-5" />
        </div>
        <h3 className="text-base font-black text-[var(--text-main)]">Nenhum órgão cadastrado</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md mx-auto leading-relaxed">
          Comece cadastrando o primeiro órgão real da carteira comercial da Oi Beta.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
      <table className="w-full min-w-[920px] text-left">
        <thead className="bg-[var(--bg-sidebar)] border-b border-[var(--border-color)]">
          <tr>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Órgão</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Localidade</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Responsável</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Próxima ação</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Score</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Status</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] text-right">Ações</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-[var(--bg-main)]/25 transition">
              <td className="px-4 py-4 align-top">
                <button type="button" onClick={() => onOpen(client)} className="text-left">
                  <span className="text-sm font-black text-[var(--text-main)] block hover:text-[var(--blue-accent)]">{client.entity}</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">{getEntityTypeLabel(client.entityType)} · {client.contacts.length} contatos</span>
                </button>
              </td>
              <td className="px-4 py-4 align-top">
                <span className="text-xs font-bold text-[var(--text-main)]">{client.city || 'Não informado'}</span>
                {client.state && <span className="text-xs text-[var(--text-secondary)]">/{client.state}</span>}
              </td>
              <td className="px-4 py-4 align-top text-xs text-[var(--text-main)]">{client.manager || 'Não definido'}</td>
              <td className="px-4 py-4 align-top text-xs text-[var(--text-main)]">{client.nextAction?.title || 'Não definida'}</td>
              <td className="px-4 py-4 align-top">
                <span className="text-xs font-black text-[var(--blue-accent)]">{client.commercialScore}%</span>
                <span className="block text-[9px] text-[var(--text-secondary)]">Health {client.healthScore}%</span>
              </td>
              <td className="px-4 py-4 align-top">
                <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                  {getStatusLabel(client.status)}
                </span>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="flex justify-end">
                  <button type="button" onClick={() => onRemove(client.id)} className="p-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10" title="Remover">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientDetailsPanel({ client, onClose, onStatusChange, onTypeChange, onAddContact, onAddTimelineEvent, onUpdateNextAction, getSuggestedOpportunities, onLinkOpportunity, getSuggestedProducts, onSetProductStatus, onAddProposal, onAddContract, onAddImplementation, onToggleImplementationItem, onAddFinancialRecord, onAddSupportTicket, onUpdateSupportTicketStatus, getOperationSummary }: {
  client: ClientsWorkspaceClient | null;
  onClose: () => void;
  onStatusChange: (clientId: string, status: ClientStatus) => void;
  onTypeChange: (clientId: string, entityType: ClientEntityType) => void;
  onAddContact: (clientId: string, input: NewClientContactInput) => void;
  onAddTimelineEvent: (clientId: string, input: NewClientTimelineInput) => void;
  onUpdateNextAction: (clientId: string, input: UpdateClientNextActionInput) => void;
  getSuggestedOpportunities: (client: ClientsWorkspaceClient) => CommercialOpportunity[];
  onLinkOpportunity: (clientId: string, opportunity: CommercialOpportunity) => void;
  getSuggestedProducts: (client: ClientsWorkspaceClient) => BetaMarketServiceDefinition[];
  onSetProductStatus: (clientId: string, service: BetaMarketServiceDefinition, status: ClientProductStatus) => void;
  onAddProposal: (clientId: string, input: NewClientProposalInput) => void;
  onAddContract: (clientId: string, input: NewClientContractInput) => void;
  onAddImplementation: (clientId: string, input: NewClientImplementationInput) => void;
  onToggleImplementationItem: (clientId: string, implementationId: string, itemId: string) => void;
  onAddFinancialRecord: (clientId: string, input: NewClientFinancialInput) => void;
  onAddSupportTicket: (clientId: string, input: NewClientSupportTicketInput) => void;
  onUpdateSupportTicketStatus: (clientId: string, ticketId: string, status: ClientSupportTicketStatus) => void;
  getOperationSummary: (client: ClientsWorkspaceClient) => ReturnType<typeof import('../../core/crmGov/ClientOperationService').ClientOperationService.buildSummary>;
}) {
  const { createTask } = useWorkspace().tasks;
  const [isCreatingNextActionTask, setIsCreatingNextActionTask] = useState(false);
  const [creatingCommercialTaskKey, setCreatingCommercialTaskKey] = useState<string | null>(null);

  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState<ClientContactRole>('other');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [timelineType, setTimelineType] = useState<ClientTimelineEventType>('note');
  const [timelineTitle, setTimelineTitle] = useState('');
  const [timelineDescription, setTimelineDescription] = useState('');
  const [nextActionTitle, setNextActionTitle] = useState(client?.nextAction?.title || '');
  const [nextActionDueDate, setNextActionDueDate] = useState(client?.nextAction?.dueDate || '');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalValue, setProposalValue] = useState('');
  const [proposalStatus, setProposalStatus] = useState<ClientProposalStatus>('draft');
  const [proposalNotes, setProposalNotes] = useState('');
  const [generatedProposalPreview, setGeneratedProposalPreview] = useState<ReturnType<typeof CrmGovProposalService.generateFromProducts> | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState('');
  const [generatedContractPreview, setGeneratedContractPreview] = useState<ReturnType<typeof CrmGovContractService.generateFromProposal> | null>(null);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [generatedImplementationPreview, setGeneratedImplementationPreview] = useState<ReturnType<typeof CrmGovImplementationService.generateFromContract> | null>(null);
  const [financialTitle, setFinancialTitle] = useState('');
  const [financialAmount, setFinancialAmount] = useState('');
  const [financialStatus, setFinancialStatus] = useState<ClientFinancialStatus>('pending');
  const [financialDueDate, setFinancialDueDate] = useState('');
  const [supportTitle, setSupportTitle] = useState('');
  const [supportStatus, setSupportStatus] = useState<ClientSupportTicketStatus>('open');
  const [supportPriority, setSupportPriority] = useState<ClientSupportTicketPriority>('medium');
  const [supportDescription, setSupportDescription] = useState('');

  if (!client) return null;

  const suggestedProducts = getSuggestedProducts(client);
  const diagnosis = CrmGovDiagnosisService.analyzeClient(client, suggestedProducts);
  const operationSummary = getOperationSummary(client);

  const handleAddContactSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onAddContact(client.id, {
      name: contactName,
      role: contactRole,
      email: contactEmail,
      phone: contactPhone,
    });
    setContactName('');
    setContactRole('other');
    setContactEmail('');
    setContactPhone('');
  };

  const handleAddTimelineSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onAddTimelineEvent(client.id, {
      type: timelineType,
      title: timelineTitle,
      description: timelineDescription,
    });
    setTimelineType('note');
    setTimelineTitle('');
    setTimelineDescription('');
  };

  const handleNextActionSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdateNextAction(client.id, {
      title: nextActionTitle,
      dueDate: nextActionDueDate,
    });
  };

  const handleCreateNextActionTask = async () => {
    const title = nextActionTitle.trim() || client.nextAction?.title?.trim();

    if (!title) return;

    const dueDate = nextActionDueDate || client.nextAction?.dueDate;
    const clientName = client.name || client.entity || 'Órgão';
    const dueDateText = dueDate ? ` até ${formatDate(dueDate)}` : '';
    const taskTitle = `[CRM] ${clientName}: ${title}${dueDateText}`;

    setIsCreatingNextActionTask(true);

    try {
      await createTask(taskTitle);
    } finally {
      setIsCreatingNextActionTask(false);
    }
  };

  const handleCreateCommercialTask = async (taskKey: string, taskTitle: string) => {
    setCreatingCommercialTaskKey(taskKey);

    try {
      await createTask(taskTitle);
    } finally {
      setCreatingCommercialTaskKey(null);
    }
  };

  const handleGenerateProposalFromProducts = () => {
    const selectedProducts: BetaMarketServiceDefinition[] = client.products
      .filter((product) => product.status === 'suggested' || product.status === 'interested' || product.status === 'proposal' || product.status === 'contracted')
      .map((product) => {
        const catalogProduct = BETA_MARKET_SERVICES.find(
          (service) => service.id === product.serviceId || service.productId === product.productId,
        );

        if (catalogProduct) {
          return catalogProduct;
        }

        return {
          id: product.serviceId,
          productId: product.productId,
          serviceNumber: undefined,
          commercialName: product.commercialName,
          shortName: product.shortName,
          targetBuyers: [],
          anchorKeywords: [],
          supportingKeywords: [],
          exclusionKeywords: [],
          procurementKeywords: [],
          opportunityTypes: [],
          minimumMatchScore: 60,
          status: 'mapped',
        };
      });

    const proposal = CrmGovProposalService.generateFromProducts(client.entity, selectedProducts);

    setGeneratedProposalPreview(proposal);
    setProposalTitle(proposal.title);
    setProposalValue(String(proposal.estimatedValue));
    setProposalStatus('draft');
    setProposalNotes(proposal.notes);
  };

  const handleProposalSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onAddProposal(client.id, {
      title: proposalTitle,
      status: proposalStatus,
      estimatedValue: parseCurrencyValue(proposalValue),
      notes: proposalNotes,
    });

    setProposalTitle('');
    setProposalValue('');
    setProposalStatus('draft');
    setProposalNotes('');
  };

  const handleGenerateContractFromProposal = () => {
    const proposal = client.proposals.find((item) => item.id === selectedProposalId) || client.proposals[0];

    if (!proposal) return;

    const contract = CrmGovContractService.generateFromProposal(client.entity, proposal);
    setSelectedProposalId(proposal.id);
    setGeneratedContractPreview(contract);
  };

  const handleContractSubmit = () => {
    if (!generatedContractPreview) return;

    onAddContract(client.id, {
      ...generatedContractPreview,
      proposalId: selectedProposalId || undefined,
    });

    setGeneratedContractPreview(null);
  };

  const handleGenerateImplementationFromContract = () => {
    const contract = client.contracts.find((item) => item.id === selectedContractId) || client.contracts[0];

    if (!contract) return;

    const implementation = CrmGovImplementationService.generateFromContract(client.entity, contract);
    setSelectedContractId(contract.id);
    setGeneratedImplementationPreview(implementation);
  };

  const handleImplementationSubmit = () => {
    if (!generatedImplementationPreview) return;

    onAddImplementation(client.id, generatedImplementationPreview);
    setGeneratedImplementationPreview(null);
  };

  const handleFinancialSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onAddFinancialRecord(client.id, {
      title: financialTitle,
      status: financialStatus,
      amount: parseCurrencyValue(financialAmount) || 0,
      dueDate: financialDueDate || undefined,
    });

    setFinancialTitle('');
    setFinancialAmount('');
    setFinancialStatus('pending');
    setFinancialDueDate('');
  };

  const handleSupportSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onAddSupportTicket(client.id, {
      title: supportTitle,
      status: supportStatus,
      priority: supportPriority,
      description: supportDescription,
    });

    setSupportTitle('');
    setSupportStatus('open');
    setSupportPriority('medium');
    setSupportDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-4xl h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] p-5 flex items-start justify-between gap-4 z-10">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--blue-accent)] font-black">CRM Gov</span>
            <h2 className="text-xl font-black text-[var(--text-main)] mt-1">{client.entity}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{client.city || 'Cidade não informada'}{client.state ? `/${client.state}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Status comercial">
              <select value={client.status} onChange={(event) => onStatusChange(client.id, event.target.value as ClientStatus)} className="crm-input">
                {CLIENT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </Field>

            <Field label="Tipo de órgão">
              <select value={client.entityType} onChange={(event) => onTypeChange(client.id, event.target.value as ClientEntityType)} className="crm-input">
                {ENTITY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </Field>
          </section>

          <CommercialPipelineControls
            client={client}
            onStatusChange={onStatusChange}
          />

          <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <h3 className="text-sm font-black text-indigo-200">Beta no órgão</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Oi, Douglas. Este órgão possui {client.contacts.length} contato(s), {client.timeline.length} evento(s) no histórico e {client.nextAction?.title ? 'uma próxima ação definida' : 'nenhuma próxima ação definida'}.
            </p>
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              Operação do cliente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <ProposalPreviewMetric label="Status" value={getOperationalStatusLabel(operationSummary.operationalStatus)} />
              <ProposalPreviewMetric label="MRR" value={formatCurrency(operationSummary.monthlyRevenue)} />
              <ProposalPreviewMetric label="Tickets abertos" value={String(operationSummary.openTickets)} />
              <ProposalPreviewMetric label="Renovações 60d" value={String(operationSummary.renewalsIn60Days)} />
            </div>

            <div className="space-y-2">
              {operationSummary.betaAlerts.map((alert) => (
                <div key={alert} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] text-xs text-[var(--text-main)]">
                  {alert}
                </div>
              ))}
            </div>
          </section>

          <DiagnosisPanel diagnosis={diagnosis} />


          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[var(--blue-accent)]" />
              Oportunidades do Radar
            </h3>

            {client.opportunities.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Nenhuma oportunidade vinculada a este órgão.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.opportunities.map((opportunity) => (
                  <div key={opportunity.opportunityId} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <h4 className="text-xs font-black text-[var(--text-main)]">{opportunity.title}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">Vinculada em {formatDate(opportunity.linkedAt)}</p>
                  </div>
                ))}
              </div>
            )}

            <SuggestedOpportunities
              client={client}
              opportunities={getSuggestedOpportunities(client)}
              onLinkOpportunity={onLinkOpportunity}
            />
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[var(--blue-accent)]" />
              Produtos e recomendações
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ScoreBox label="Score comercial" value={`${client.commercialScore}%`} helper="Potencial de venda" />
              <ScoreBox label="Relacionamento" value={`${client.healthScore}%`} helper="Saúde do contato" />
            </div>

            {client.products.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Nenhum produto vinculado a este órgão.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.products.map((product) => (
                  <div key={product.serviceId} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-[var(--text-main)]">{product.shortName}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">{product.commercialName}</p>
                      </div>
                      <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {getProductStatusLabel(product.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <SuggestedProducts
              client={client}
              products={suggestedProducts}
              onSetProductStatus={onSetProductStatus}
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <form onSubmit={handleNextActionSubmit} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[var(--blue-accent)]" />
                Próxima ação
              </h3>
              <Field label="Ação prioritária">
                <input value={nextActionTitle} onChange={(event) => setNextActionTitle(event.target.value)} className="crm-input" placeholder="Ex: Agendar reunião com secretário" />
              </Field>
              <Field label="Prazo">
                <input type="date" value={nextActionDueDate} onChange={(event) => setNextActionDueDate(event.target.value)} className="crm-input" />
              </Field>
              <button type="submit" className="w-full bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                Salvar próxima ação
              </button>
              <button
                type="button"
                onClick={() => void handleCreateNextActionTask()}
                disabled={isCreatingNextActionTask || !(nextActionTitle.trim() || client.nextAction?.title?.trim())}
                className="w-full border border-[var(--blue-accent)]/30 bg-[var(--blue-accent)]/10 text-[var(--cyan-accent)] font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingNextActionTask ? 'Criando tarefa...' : 'Criar tarefa da ação'}
              </button>
            </form>

            <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black text-[var(--text-main)]">Resumo comercial</h3>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <p><strong className="text-[var(--text-main)]">Status:</strong> {getStatusLabel(client.status)}</p>
                <p><strong className="text-[var(--text-main)]">Tipo:</strong> {getEntityTypeLabel(client.entityType)}</p>
                <p><strong className="text-[var(--text-main)]">Responsável:</strong> {client.manager || 'Não definido'}</p>
                <p><strong className="text-[var(--text-main)]">Contato principal:</strong> {client.contact || 'Não informado'}</p>
              </div>
            </section>
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[var(--blue-accent)]" />
              Contatos estratégicos
            </h3>

            <form onSubmit={handleAddContactSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nome" required>
                <input value={contactName} onChange={(event) => setContactName(event.target.value)} className="crm-input" required placeholder="Nome do contato" />
              </Field>
              <Field label="Papel">
                <select value={contactRole} onChange={(event) => setContactRole(event.target.value as ClientContactRole)} className="crm-input">
                  {CONTACT_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </Field>
              <Field label="E-mail">
                <input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="crm-input" placeholder="email@orgao.gov.br" />
              </Field>
              <Field label="Telefone">
                <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className="crm-input" placeholder="(00) 00000-0000" />
              </Field>
              <button type="submit" className="md:col-span-2 bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                Adicionar contato
              </button>
            </form>

            {client.contacts.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Nenhum contato cadastrado para este órgão.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.contacts.map((contact) => (
                  <div key={contact.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <h4 className="text-xs font-black text-[var(--text-main)]">{contact.name}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">{getContactRoleLabel(contact.role)}</p>
                    <p className="text-[10px] font-mono text-[var(--text-main)] mt-1">{contact.email || 'sem e-mail'} {contact.phone ? `· ${contact.phone}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--blue-accent)]" />
              Propostas comerciais
            </h3>

            <div className="rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-[var(--text-main)]">Gerador de proposta da Beta</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Use os produtos vinculados ao órgão para preencher uma proposta inicial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateProposalFromProducts}
                  className="px-3 py-2 rounded-xl bg-[var(--blue-accent)] text-white text-[10px] font-black uppercase tracking-widest font-mono"
                >
                  Gerar proposta
                </button>
              </div>

              {generatedProposalPreview && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <ProposalPreviewMetric label="Setup" value={formatCurrency(generatedProposalPreview.setupValue)} />
                  <ProposalPreviewMetric label="Mensal" value={formatCurrency(generatedProposalPreview.monthlyValue)} />
                  <ProposalPreviewMetric label="12 meses" value={formatCurrency(generatedProposalPreview.estimatedValue)} />
                </div>
              )}
            </div>

            <form onSubmit={handleProposalSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Título" required>
                <input value={proposalTitle} onChange={(event) => setProposalTitle(event.target.value)} className="crm-input" required placeholder="Ex: Proposta Portal + Zero Papel" />
              </Field>
              <Field label="Status">
                <select value={proposalStatus} onChange={(event) => setProposalStatus(event.target.value as ClientProposalStatus)} className="crm-input">
                  {PROPOSAL_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </Field>
              <Field label="Valor estimado">
                <input value={proposalValue} onChange={(event) => setProposalValue(event.target.value)} className="crm-input" placeholder="Ex: 120000" />
              </Field>
              <Field label="Observações">
                <input value={proposalNotes} onChange={(event) => setProposalNotes(event.target.value)} className="crm-input" placeholder="Escopo, validade, contato responsável..." />
              </Field>
              <button type="submit" className="md:col-span-2 bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                Registrar proposta
              </button>
            </form>

            {client.proposals.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Nenhuma proposta registrada para este órgão.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.proposals.map((proposal) => (
                  <div key={proposal.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-[var(--text-main)]">{proposal.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">{proposal.notes || 'Sem observações adicionais.'}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20 block">
                          {getProposalStatusLabel(proposal.status)}
                        </span>
                        <span className="text-[10px] text-[var(--text-main)] font-mono block">
                          {formatCurrency(proposal.estimatedValue || 0)}
                        </span>
                      </div>
                    </div>
                    {(proposal.status === 'sent' || proposal.status === 'negotiation') && (
                      <button
                        type="button"
                        onClick={() => void handleCreateCommercialTask(
                          `proposal-${proposal.id}`,
                          `[CRM] ${client.name || client.entity}: acompanhar proposta ${proposal.title}`
                        )}
                        disabled={creatingCommercialTaskKey === `proposal-${proposal.id}`}
                        className="mt-3 rounded-lg border border-[var(--blue-accent)]/30 bg-[var(--blue-accent)]/10 px-3 py-1.5 text-[11px] font-black text-[var(--cyan-accent)] hover:bg-[var(--blue-accent)]/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingCommercialTaskKey === `proposal-${proposal.id}` ? 'Criando tarefa...' : 'Criar tarefa comercial'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--blue-accent)]" />
              Contratos
            </h3>

            <div className="rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="Proposta base">
                  <select value={selectedProposalId} onChange={(event) => setSelectedProposalId(event.target.value)} className="crm-input">
                    <option value="">Selecionar proposta</option>
                    {client.proposals.map((proposal) => (
                      <option key={proposal.id} value={proposal.id}>{proposal.title}</option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={handleGenerateContractFromProposal}
                  disabled={client.proposals.length === 0}
                  className="px-3 py-2.5 rounded-xl bg-[var(--blue-accent)] text-white text-[10px] font-black uppercase tracking-widest font-mono disabled:opacity-50"
                >
                  Gerar minuta
                </button>
              </div>

              {generatedContractPreview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <ProposalPreviewMetric label="Valor total" value={formatCurrency(generatedContractPreview.contractValue)} />
                    <ProposalPreviewMetric label="Mensal" value={formatCurrency(generatedContractPreview.monthlyValue)} />
                    <ProposalPreviewMetric label="Implantação" value={`${generatedContractPreview.implementationDays} dias`} />
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                    <h4 className="text-xs font-black text-[var(--text-main)]">{generatedContractPreview.title}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">{generatedContractPreview.notes}</p>
                  </div>
                  <button type="button" onClick={handleContractSubmit} className="w-full bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                    Registrar contrato no CRM
                  </button>
                </div>
              )}
            </div>

            {client.contracts.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Nenhum contrato registrado para este órgão.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.contracts.map((contract) => (
                  <div key={contract.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-[var(--text-main)]">{contract.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                          Vigência: {contract.startDate || 'não definida'} até {contract.endDate || 'não definida'}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 block">
                          {getContractStatusLabel(contract.status)}
                        </span>
                        <span className="text-[10px] text-[var(--text-main)] font-mono block">
                          {formatCurrency(contract.contractValue || 0)}
                        </span>
                      </div>
                    </div>
                    {(contract.status === 'signed' || contract.status === 'active') && (
                      <button
                        type="button"
                        onClick={() => void handleCreateCommercialTask(
                          `contract-${contract.id}`,
                          `[Implantação] ${client.name || client.entity}: iniciar implantação do contrato ${contract.title}`
                        )}
                        disabled={creatingCommercialTaskKey === `contract-${contract.id}`}
                        className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingCommercialTaskKey === `contract-${contract.id}` ? 'Criando tarefa...' : 'Criar tarefa de implantação'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[var(--blue-accent)]" />
              Implantação
            </h3>

            <div className="rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="Contrato base">
                  <select value={selectedContractId} onChange={(event) => setSelectedContractId(event.target.value)} className="crm-input">
                    <option value="">Selecionar contrato</option>
                    {client.contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>{contract.title}</option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={handleGenerateImplementationFromContract}
                  disabled={client.contracts.length === 0}
                  className="px-3 py-2.5 rounded-xl bg-[var(--blue-accent)] text-white text-[10px] font-black uppercase tracking-widest font-mono disabled:opacity-50"
                >
                  Gerar implantação
                </button>
              </div>

              {generatedImplementationPreview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <ProposalPreviewMetric label="Status" value={getImplementationStatusLabel(generatedImplementationPreview.status)} />
                    <ProposalPreviewMetric label="Progresso" value={`${generatedImplementationPreview.progress}%`} />
                    <ProposalPreviewMetric label="Go Live" value={generatedImplementationPreview.expectedGoLiveDate} />
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                    <h4 className="text-xs font-black text-[var(--text-main)]">{generatedImplementationPreview.title}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">{generatedImplementationPreview.notes}</p>
                  </div>
                  <button type="button" onClick={handleImplementationSubmit} className="w-full bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                    Registrar implantação
                  </button>
                </div>
              )}
            </div>

            {client.implementations.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Nenhuma implantação registrada para este órgão.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {client.implementations.map((implementation) => (
                  <div key={implementation.id} className="p-4 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-[var(--text-main)]">{implementation.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                          Responsável: {implementation.responsible} · Go Live: {implementation.expectedGoLiveDate || 'não definido'}
                        </p>
                      </div>
                      <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                        {getImplementationStatusLabel(implementation.status)}
                      </span>
                    </div>

                    <div>
                      <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden border border-[var(--border-color)]">
                        <div className="h-full bg-[var(--blue-accent)]" style={{ width: `${implementation.progress}%` }} />
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">{implementation.progress}% concluído</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {implementation.checklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onToggleImplementationItem(client.id, implementation.id, item.id)}
                          className={`text-left p-3 rounded-xl border transition ${
                            item.done
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)]'
                          }`}
                        >
                          <span className="text-xs font-black block">{item.done ? '✓ ' : '☐ '}{item.label}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--blue-accent)]" />
                Financeiro do cliente
              </h3>

              <form onSubmit={handleFinancialSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Lançamento" required>
                  <input value={financialTitle} onChange={(event) => setFinancialTitle(event.target.value)} className="crm-input" required placeholder="Ex: Mensalidade julho" />
                </Field>
                <Field label="Status">
                  <select value={financialStatus} onChange={(event) => setFinancialStatus(event.target.value as ClientFinancialStatus)} className="crm-input">
                    {FINANCIAL_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </Field>
                <Field label="Valor">
                  <input value={financialAmount} onChange={(event) => setFinancialAmount(event.target.value)} className="crm-input" placeholder="Ex: 2500" />
                </Field>
                <Field label="Vencimento">
                  <input type="date" value={financialDueDate} onChange={(event) => setFinancialDueDate(event.target.value)} className="crm-input" />
                </Field>
                <button type="submit" className="md:col-span-2 bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                  Registrar financeiro
                </button>
              </form>

              {client.financialRecords.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">Nenhum lançamento financeiro.</p>
              ) : (
                <div className="space-y-2">
                  {client.financialRecords.map((record) => (
                    <div key={record.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black text-[var(--text-main)]">{record.title}</h4>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Vencimento: {record.dueDate || 'não definido'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-[var(--text-main)] block">{formatCurrency(record.amount)}</span>
                          <span className="text-[9px] uppercase font-mono text-[var(--text-secondary)]">{getFinancialStatusLabel(record.status)}</span>
                        </div>
                      </div>
                      {(record.status === 'pending' || record.status === 'overdue') && (
                        <button
                          type="button"
                          onClick={() => void handleCreateCommercialTask(
                            `financial-${record.id}`,
                            `[Financeiro] ${client.name || client.entity}: ${record.title} (${formatCurrency(record.amount)})`
                          )}
                          disabled={creatingCommercialTaskKey === `financial-${record.id}`}
                          className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingCommercialTaskKey === `financial-${record.id}` ? 'Criando tarefa...' : 'Criar tarefa financeira'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <Headphones className="w-4 h-4 text-[var(--blue-accent)]" />
                Suporte inicial
              </h3>

              <form onSubmit={handleSupportSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Chamado" required>
                  <input value={supportTitle} onChange={(event) => setSupportTitle(event.target.value)} className="crm-input" required placeholder="Ex: Dúvida sobre usuários" />
                </Field>
                <Field label="Prioridade">
                  <select value={supportPriority} onChange={(event) => setSupportPriority(event.target.value as ClientSupportTicketPriority)} className="crm-input">
                    {SUPPORT_PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={supportStatus} onChange={(event) => setSupportStatus(event.target.value as ClientSupportTicketStatus)} className="crm-input">
                    {SUPPORT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </Field>
                <Field label="Descrição">
                  <input value={supportDescription} onChange={(event) => setSupportDescription(event.target.value)} className="crm-input" placeholder="Resumo do chamado" />
                </Field>
                <button type="submit" className="md:col-span-2 bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                  Registrar chamado
                </button>
              </form>

              {client.supportTickets.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">Nenhum chamado registrado.</p>
              ) : (
                <div className="space-y-2">
                  {client.supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black text-[var(--text-main)]">{ticket.title}</h4>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-1">{ticket.description || 'Sem descrição.'}</p>
                        </div>
                        <select
                          value={ticket.status}
                          onChange={(event) => onUpdateSupportTicketStatus(client.id, ticket.id, event.target.value as ClientSupportTicketStatus)}
                          className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-main)]"
                        >
                          {SUPPORT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                      </div>
                      <span className="text-[9px] uppercase font-mono text-[var(--text-secondary)] mt-2 block">Prioridade: {getSupportPriorityLabel(ticket.priority)}</span>
                      {!['resolved', 'closed'].includes(ticket.status) && (
                        <button
                          type="button"
                          onClick={() => void handleCreateCommercialTask(
                            `support-${ticket.id}`,
                            `[Suporte] ${client.name || client.entity}: ${ticket.title}`
                          )}
                          disabled={creatingCommercialTaskKey === `support-${ticket.id}`}
                          className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-black text-sky-200 hover:bg-sky-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingCommercialTaskKey === `support-${ticket.id}` ? 'Criando tarefa...' : 'Criar tarefa de suporte'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[var(--text-main)]">Timeline comercial</h3>

            <form onSubmit={handleAddTimelineSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Tipo">
                <select value={timelineType} onChange={(event) => setTimelineType(event.target.value as ClientTimelineEventType)} className="crm-input">
                  {TIMELINE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </Field>
              <Field label="Título" required>
                <input value={timelineTitle} onChange={(event) => setTimelineTitle(event.target.value)} className="crm-input" required placeholder="Ex: Reunião com compras" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Descrição">
                  <textarea value={timelineDescription} onChange={(event) => setTimelineDescription(event.target.value)} className="crm-input min-h-[90px]" placeholder="Resumo do contato, reunião ou encaminhamento." />
                </Field>
              </div>
              <button type="submit" className="md:col-span-2 bg-[var(--blue-accent)] text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-mono">
                Registrar evento
              </button>
            </form>

            {client.timeline.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-5 text-center">
                <p className="text-xs text-[var(--text-secondary)]">Nenhum evento registrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.timeline.map((event) => (
                  <div key={event.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-[var(--text-main)]">{event.title}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">{event.description || getTimelineTypeLabel(event.type)}</p>
                      </div>
                      <span className="text-[9px] text-[var(--text-secondary)] font-mono">{formatDate(event.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
      <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span>
      <span className="text-lg font-black text-[var(--text-main)] block mt-1">{value}</span>
      <span className="text-[10px] text-[var(--text-secondary)] block">{helper}</span>
    </div>
  );
}

function SuggestedProducts({
  client,
  products,
  onSetProductStatus,
}: {
  client: ClientsWorkspaceClient;
  products: BetaMarketServiceDefinition[];
  onSetProductStatus: (clientId: string, service: BetaMarketServiceDefinition, status: ClientProductStatus) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
        <p className="text-[10px] text-[var(--text-secondary)]">Nenhuma nova recomendação de produto para este órgão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">
        Produtos sugeridos pela Beta
      </span>
      {products.map((product) => (
        <div key={product.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-[var(--text-main)]">{product.shortName}</h4>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">{product.commercialName}</p>
            </div>
            <button
              type="button"
              onClick={() => onSetProductStatus(client.id, product, 'interested')}
              className="px-2 py-1 rounded-lg bg-[var(--blue-accent)] text-white text-[10px] font-black whitespace-nowrap"
            >
              Marcar interesse
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CommercialPipelineBoard({ clients }: { clients: ClientsWorkspaceClient[] }) {
  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-3">
        <h2 className="text-sm font-black text-[var(--text-main)]">Pipeline Comercial Gov</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Visão rápida do avanço comercial dos órgãos: Lead → Diagnóstico → Proposta → Contrato → Cliente ativo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {COMMERCIAL_PIPELINE_STAGES.map((stage) => {
          const stageClients = clients.filter((client) => client.status === stage.value);

          return (
            <div key={stage.value} className="rounded-2xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-4 min-h-[140px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-[var(--text-main)]">{stage.label}</h3>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">{stage.description}</p>
                </div>
                <span className="text-[10px] font-black font-mono text-[var(--blue-accent)]">{stageClients.length}</span>
              </div>

              <div className="space-y-2 mt-3">
                {stageClients.slice(0, 4).map((client) => (
                  <div key={client.id} className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                    <span className="text-[10px] font-black text-[var(--text-main)] block truncate">{client.entity}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] block truncate">
                      {client.city || 'Cidade não informada'}{client.state ? `/${client.state}` : ''}
                    </span>
                  </div>
                ))}

                {stageClients.length > 4 && (
                  <p className="text-[9px] text-[var(--text-secondary)] font-mono">
                    +{stageClients.length - 4} órgão(s)
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CommercialPipelineControls({
  client,
  onStatusChange,
}: {
  client: ClientsWorkspaceClient;
  onStatusChange: (clientId: string, status: ClientStatus) => void;
}) {
  const currentIndex = PIPELINE_FLOW.indexOf(client.status);
  const previousStatus = currentIndex > 0 ? PIPELINE_FLOW[currentIndex - 1] : null;
  const nextStatus = currentIndex >= 0 && currentIndex < PIPELINE_FLOW.length - 1 ? PIPELINE_FLOW[currentIndex + 1] : null;

  return (
    <section className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-4">
      <div>
        <h3 className="text-sm font-black text-[var(--text-main)]">Pipeline Comercial</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Avance ou retroceda o órgão no fluxo comercial sem sair do dossiê.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {COMMERCIAL_PIPELINE_STAGES.map((stage) => {
          const isCurrent = client.status === stage.value;

          return (
            <button
              key={stage.value}
              type="button"
              onClick={() => onStatusChange(client.id, stage.value)}
              className={`p-3 rounded-xl border text-left transition ${
                isCurrent
                  ? 'bg-[var(--blue-accent)]/10 border-[var(--blue-accent)]/40 text-[var(--blue-accent)]'
                  : 'bg-[var(--bg-main)]/35 border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
              }`}
            >
              <span className="text-[10px] font-black block">{stage.label}</span>
              <span className="text-[9px] block mt-1">{stage.description}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={!previousStatus}
          onClick={() => previousStatus && onStatusChange(client.id, previousStatus)}
          className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] text-xs font-black text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar etapa
        </button>

        <button
          type="button"
          disabled={!nextStatus}
          onClick={() => nextStatus && onStatusChange(client.id, nextStatus)}
          className="flex-1 px-3 py-2 rounded-xl bg-[var(--blue-accent)] text-white text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Avançar etapa
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}

function DiagnosisPanel({ diagnosis }: { diagnosis: CrmGovDiagnosisResult }) {
  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--blue-accent)]" />
            Diagnóstico Beta do órgão
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Leitura inicial do potencial comercial, maturidade digital e relacionamento.
          </p>
        </div>
        <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
          Diagnóstico local
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ScoreBox label="Digitalização" value={`${diagnosis.digitalizationIndex}%`} helper="Maturidade estimada" />
        <ScoreBox label="Prontidão comercial" value={`${diagnosis.commercialReadiness}%`} helper="Chance de avançar" />
        <ScoreBox label="Relacionamento" value={`${diagnosis.relationshipHealth}%`} helper="Saúde do contato" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <DiagnosisList
          title="Lacunas identificadas"
          empty="Nenhuma lacuna crítica detectada."
          items={diagnosis.missingCapabilities}
        />
        <DiagnosisList
          title="Alertas comerciais"
          empty="Nenhum alerta relevante."
          items={diagnosis.riskAlerts}
        />
        <DiagnosisList
          title="Próximos passos"
          empty="Nenhuma ação sugerida."
          items={diagnosis.nextSteps}
        />
      </div>

      {diagnosis.recommendedProducts.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">
            Produtos recomendados
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {diagnosis.recommendedProducts.map((product) => (
              <span key={product.id} className="text-[10px] font-bold text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-2 py-1">
                {product.shortName}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DiagnosisList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
      <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">
        {title}
      </span>
      {items.length === 0 ? (
        <p className="text-[10px] text-[var(--text-secondary)] mt-2">{empty}</p>
      ) : (
        <div className="space-y-1.5 mt-2">
          {items.map((item) => (
            <p key={item} className="text-[10px] text-[var(--text-main)] leading-relaxed">
              • {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestedOpportunities({
  client,
  opportunities,
  onLinkOpportunity,
}: {
  client: ClientsWorkspaceClient;
  opportunities: CommercialOpportunity[];
  onLinkOpportunity: (clientId: string, opportunity: CommercialOpportunity) => void;
}) {
  if (opportunities.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
        <p className="text-[10px] text-[var(--text-secondary)]">
          Nenhuma sugestão automática encontrada no Radar para este órgão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">
        Sugestões do Radar
      </span>
      {opportunities.map((opportunity) => (
        <div key={opportunity.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-[var(--text-main)]">{opportunity.title}</h4>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">{opportunity.object}</p>
            </div>
            <button
              type="button"
              onClick={() => onLinkOpportunity(client.id, opportunity)}
              className="px-2 py-1 rounded-lg bg-[var(--blue-accent)] text-white text-[10px] font-black whitespace-nowrap"
            >
              Vincular
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProposalPreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
      <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span>
      <span className="text-xs font-black text-[var(--text-main)] block mt-1">{value}</span>
    </div>
  );
}

function CrmMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">{icon}</div>
      <div>
        <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black block">{label}</span>
        <span className="text-lg font-black text-[var(--text-main)] block mt-1 truncate">{value}</span>
        <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{helper}</span>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

function getEntityTypeLabel(type: ClientEntityType): string {
  return ENTITY_TYPES.find((item) => item.value === type)?.label || 'Outro';
}

function getStatusLabel(status: ClientStatus): string {
  return CLIENT_STATUSES.find((item) => item.value === status)?.label || status;
}

function getContactRoleLabel(role: ClientContactRole): string {
  return CONTACT_ROLES.find((item) => item.value === role)?.label || 'Outro';
}

function getFinancialStatusLabel(status: ClientFinancialStatus): string {
  return FINANCIAL_STATUSES.find((item) => item.value === status)?.label || status;
}

function getSupportPriorityLabel(priority: ClientSupportTicketPriority): string {
  return SUPPORT_PRIORITIES.find((item) => item.value === priority)?.label || priority;
}

function getOperationalStatusLabel(status: 'healthy' | 'attention' | 'critical'): string {
  const labels: Record<'healthy' | 'attention' | 'critical', string> = {
    healthy: 'Saudável',
    attention: 'Atenção',
    critical: 'Crítico',
  };

  return labels[status];
}

function getImplementationStatusLabel(status: ClientImplementationStatus): string {
  return IMPLEMENTATION_STATUSES.find((item) => item.value === status)?.label || status;
}

function getContractStatusLabel(status: ClientContractStatus): string {
  return CONTRACT_STATUSES.find((item) => item.value === status)?.label || status;
}

function getProposalStatusLabel(status: ClientProposalStatus): string {
  return PROPOSAL_STATUSES.find((item) => item.value === status)?.label || status;
}

function parseCurrencyValue(value: string): number | undefined {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function getTimelineTypeLabel(type: ClientTimelineEventType): string {
  return TIMELINE_TYPES.find((item) => item.value === type)?.label || 'Evento';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(value));
}


function getProductStatusLabel(status: ClientProductStatus): string {
  const labels: Record<ClientProductStatus, string> = {
    suggested: 'Sugerido',
    interested: 'Interesse',
    proposal: 'Proposta',
    implantation: 'Implantação',
    contracted: 'Contratado',
  };

  return labels[status];
}
