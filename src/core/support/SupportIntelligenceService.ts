import type { ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import type {
  SupportActionPriority,
  SupportClientRiskItem,
  SupportIntelligenceSummary,
  SupportKnowledgeSuggestion,
  SupportPriorityAction,
  SupportRiskLevel,
  SupportTicketIntelligenceItem,
} from './SupportIntelligenceTypes';

const CLOSED = new Set(['resolved', 'closed']);
const SLA_HOURS = { low: 72, medium: 48, high: 24, critical: 8 } as const;
const STOP_WORDS = new Set([
  'para', 'com', 'sem', 'uma', 'das', 'dos', 'que', 'por', 'como', 'mais', 'sobre', 'cliente',
  'chamado', 'duvida', 'dúvida', 'erro', 'problema', 'sistema', 'beta', 'nao', 'não', 'esta', 'está',
]);

function hoursBetween(date: string, now: Date) {
  const parsed = new Date(date).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 3_600_000));
}

function riskFromTicket(breached: boolean, remainingHours: number, priority: string): SupportRiskLevel {
  if (breached || priority === 'critical') return 'critical';
  if (remainingHours <= 8 || priority === 'high') return 'attention';
  return 'healthy';
}

function actionPriority(risk: SupportRiskLevel, priority: string): SupportActionPriority {
  if (risk === 'critical' && priority === 'critical') return 'crítica';
  if (risk === 'critical') return 'alta';
  if (risk === 'attention') return 'média';
  return 'baixa';
}

function tokenize(text: string) {
  return text
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4 && !STOP_WORDS.has(term));
}

function buildKnowledgeSuggestions(clients: ClientsWorkspaceClient[]): SupportKnowledgeSuggestion[] {
  const clusters = new Map<string, { occurrences: number; clients: Set<string>; terms: Set<string> }>();

  clients.forEach((client) => {
    client.supportTickets.forEach((ticket) => {
      const terms = tokenize(`${ticket.title} ${ticket.description || ''}`);
      const unique = [...new Set(terms)].slice(0, 6);
      unique.forEach((term) => {
        const current = clusters.get(term) || { occurrences: 0, clients: new Set<string>(), terms: new Set<string>() };
        current.occurrences += 1;
        current.clients.add(client.id);
        unique.forEach((item) => current.terms.add(item));
        clusters.set(term, current);
      });
    });
  });

  return [...clusters.entries()]
    .filter(([, value]) => value.occurrences >= 2)
    .sort((a, b) => b[1].occurrences - a[1].occurrences || b[1].clients.size - a[1].clients.size)
    .slice(0, 5)
    .map(([term, value]) => ({
      id: `knowledge-${term}`,
      title: `Criar artigo sobre “${term}”`,
      occurrences: value.occurrences,
      clients: value.clients.size,
      confidence: Math.min(100, 45 + value.occurrences * 12 + value.clients.size * 8),
      sourceTerms: [...value.terms].slice(0, 5),
      taskTitle: `[Conhecimento] Documentar solução recorrente: ${term}`,
    }));
}

export class SupportIntelligenceService {
  static buildSummary(clients: ClientsWorkspaceClient[], now = new Date()): SupportIntelligenceSummary {
    const ticketItems: SupportTicketIntelligenceItem[] = clients.flatMap((client) =>
      client.supportTickets.map((ticket) => {
        const slaHours = SLA_HOURS[ticket.priority];
        const ageHours = hoursBetween(ticket.createdAt, now);
        const idleHours = hoursBetween(ticket.updatedAt, now);
        const active = !CLOSED.has(ticket.status);
        const remainingHours = active ? slaHours - ageHours : slaHours;
        const breached = active && remainingHours < 0;
        const risk = active ? riskFromTicket(breached, remainingHours, ticket.priority) : 'healthy';
        return {
          id: ticket.id,
          clientId: client.id,
          clientName: client.name || client.entity,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          ageHours,
          idleHours,
          slaHours,
          remainingHours,
          breached,
          risk,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        };
      })
    );

    const activeItems = ticketItems.filter((item) => !CLOSED.has(item.status));
    const resolvedTickets = ticketItems.length - activeItems.length;
    const slaBreaches = activeItems.filter((item) => item.breached).length;
    const criticalOpenTickets = activeItems.filter((item) => item.priority === 'critical').length;

    const clientRisks: SupportClientRiskItem[] = clients
      .map((client) => {
        const items = activeItems.filter((item) => item.clientId === client.id);
        const breachedTickets = items.filter((item) => item.breached).length;
        const criticalTickets = items.filter((item) => item.priority === 'critical').length;
        const averageAgeHours = items.length
          ? Math.round(items.reduce((sum, item) => sum + item.ageHours, 0) / items.length)
          : 0;
        const risk: SupportRiskLevel = criticalTickets > 0 || breachedTickets > 0
          ? 'critical'
          : items.length >= 3 || items.some((item) => item.risk === 'attention')
            ? 'attention'
            : 'healthy';
        const mainReason = criticalTickets > 0
          ? `${criticalTickets} chamado(s) crítico(s) em aberto`
          : breachedTickets > 0
            ? `${breachedTickets} violação(ões) de SLA`
            : items.length >= 3
              ? `${items.length} chamados ativos acumulados`
              : items.length > 0
                ? 'Atendimento em acompanhamento'
                : 'Sem chamados ativos';
        return {
          clientId: client.id,
          clientName: client.name || client.entity,
          openTickets: items.length,
          criticalTickets,
          breachedTickets,
          averageAgeHours,
          risk,
          mainReason,
        };
      })
      .filter((item) => item.openTickets > 0)
      .sort((a, b) => (b.criticalTickets * 100 + b.breachedTickets * 50 + b.openTickets) - (a.criticalTickets * 100 + a.breachedTickets * 50 + a.openTickets));

    const priorityActions: SupportPriorityAction[] = activeItems
      .filter((item) => item.risk !== 'healthy' || item.idleHours >= 24)
      .sort((a, b) => Number(b.breached) - Number(a.breached) || b.idleHours - a.idleHours)
      .slice(0, 8)
      .map((item) => ({
        id: `support-action-${item.clientId}-${item.id}`,
        title: item.breached ? `Recuperar SLA — ${item.clientName}` : `Avançar atendimento — ${item.clientName}`,
        description: item.breached
          ? `O chamado “${item.title}” ultrapassou o SLA em ${Math.abs(item.remainingHours)} hora(s).`
          : `O chamado “${item.title}” está sem atualização há ${item.idleHours} hora(s).`,
        priority: actionPriority(item.risk, item.priority),
        clientName: item.clientName,
        taskTitle: `[Suporte] ${item.clientName}: ${item.title}`,
      }));

    const penalty = slaBreaches * 12 + criticalOpenTickets * 10 + activeItems.filter((item) => item.idleHours >= 48).length * 5;
    const resolutionRate = ticketItems.length ? Math.round((resolvedTickets / ticketItems.length) * 100) : 100;
    const healthScore = Math.max(0, Math.min(100, resolutionRate - penalty + (activeItems.length === 0 ? 20 : 0)));
    const risk: SupportRiskLevel = healthScore < 45 || slaBreaches > 0 ? 'critical' : healthScore < 75 ? 'attention' : 'healthy';

    return {
      healthScore,
      risk,
      totalTickets: ticketItems.length,
      activeTickets: activeItems.length,
      resolvedTickets,
      slaBreaches,
      criticalOpenTickets,
      averageResolutionPotential: resolutionRate,
      firstResponseRisk: activeItems.filter((item) => item.status === 'open' && item.ageHours >= 8).length,
      ticketItems: ticketItems.sort((a, b) => Number(b.breached) - Number(a.breached) || b.ageHours - a.ageHours),
      clientRisks,
      knowledgeSuggestions: buildKnowledgeSuggestions(clients),
      priorityActions,
    };
  }
}
