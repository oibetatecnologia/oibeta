import type { Project, Task, Decision, Memory } from '../../types';
import type { CommercialOpportunity } from '../commercial/OpportunityTypes';
import type { CustomerPortfolioSummary } from '../customerSuccess/CustomerPortfolioTypes';
import type { FinanceIntelligenceSummary } from '../finance/FinanceIntelligenceTypes';
import type { ExecutiveReportAlert, ExecutiveReportRisk, ExecutiveReportSection, ExecutiveReportSnapshot } from './ExecutiveReportTypes';

interface BuildExecutiveReportInput {
  organizationName: string;
  projects: Project[];
  tasks: Task[];
  decisions: Decision[];
  memories: Memory[];
  opportunities: CommercialOpportunity[];
  customers: CustomerPortfolioSummary;
  finance: FinanceIntelligenceSummary;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0);
const percent = (value: number) => `${clamp(value)}%`;
const riskFromScore = (score: number): ExecutiveReportRisk => score >= 75 ? 'saudável' : score >= 50 ? 'atenção' : 'crítico';

function isOverdue(task: Task, now: Date): boolean {
  return Boolean(task.dueDate && task.status !== 'completed' && new Date(task.dueDate).getTime() < now.getTime());
}

function buildCommercialSection(opportunities: CommercialOpportunity[]): ExecutiveReportSection {
  const scores = opportunities.map((item) => Number(item.analysis?.iac ?? item.analysis?.bestMatches?.[0]?.score ?? 0)).filter(Number.isFinite);
  const average = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const highFit = scores.filter((value) => value >= 70).length;
  const qualifiedRate = opportunities.length ? (highFit / opportunities.length) * 100 : 0;
  const totalValue = opportunities.reduce((sum, item) => sum + Number(item.estimatedValue ?? 0), 0);
  const score = clamp(average * 0.65 + qualifiedRate * 0.35);

  return {
    id: 'commercial', title: 'Radar e pipeline comercial', score, risk: riskFromScore(score),
    summary: opportunities.length ? `${opportunities.length} oportunidades monitoradas com compatibilidade média de ${percent(average)}.` : 'Ainda não existem oportunidades comerciais consolidadas.',
    metrics: [
      { id: 'opportunities', label: 'Oportunidades', value: opportunities.length, formattedValue: String(opportunities.length), helper: 'Registros ativos no radar', trend: opportunities.length ? 'positive' : 'neutral' },
      { id: 'fit', label: 'Compatibilidade média', value: average, formattedValue: percent(average), helper: 'Aderência aos produtos Beta', trend: average >= 70 ? 'positive' : average >= 50 ? 'neutral' : 'negative' },
      { id: 'pipeline', label: 'Pipeline estimado', value: totalValue, formattedValue: currency(totalValue), helper: 'Valor potencial identificado', trend: totalValue > 0 ? 'positive' : 'neutral' },
    ],
    highlights: highFit ? [`${highFit} oportunidades têm aderência igual ou superior a 70%.`] : ['Nenhuma oportunidade atingiu aderência de 70% até o momento.'],
  };
}

function buildExecutionSection(projects: Project[], tasks: Task[], now: Date): ExecutiveReportSection {
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const overdue = tasks.filter((task) => isOverdue(task, now)).length;
  const completionRate = tasks.length ? (completed / tasks.length) * 100 : 0;
  const activeProjects = projects.filter((project) => project.status === 'active').length;
  const score = clamp(completionRate - overdue * 5 + (activeProjects ? 15 : 0));
  return {
    id: 'execution', title: 'Execução operacional', score, risk: riskFromScore(score),
    summary: `${completed} de ${tasks.length} tarefas concluídas e ${overdue} vencidas.`,
    metrics: [
      { id: 'completion', label: 'Conclusão', value: completionRate, formattedValue: percent(completionRate), helper: 'Tarefas finalizadas', trend: completionRate >= 70 ? 'positive' : completionRate >= 45 ? 'neutral' : 'negative' },
      { id: 'overdue', label: 'Tarefas vencidas', value: overdue, formattedValue: String(overdue), helper: 'Pendências fora do prazo', trend: overdue ? 'negative' : 'positive' },
      { id: 'projects', label: 'Projetos ativos', value: activeProjects, formattedValue: String(activeProjects), helper: 'Frentes em andamento', trend: activeProjects ? 'positive' : 'neutral' },
    ],
    highlights: overdue ? [`${overdue} tarefa(s) precisam de replanejamento imediato.`] : ['Nenhuma tarefa vencida foi encontrada.'],
  };
}

function buildCustomerSection(customers: CustomerPortfolioSummary): ExecutiveReportSection {
  const score = clamp(customers.portfolioHealth);
  return {
    id: 'customers', title: 'Clientes e Customer Success', score, risk: riskFromScore(score),
    summary: `${customers.trackedClients} clientes acompanhados; ${customers.criticalClients} críticos e ${customers.attentionClients} em atenção.`,
    metrics: [
      { id: 'health', label: 'Saúde da carteira', value: score, formattedValue: percent(score), helper: 'Índice consolidado', trend: score >= 75 ? 'positive' : score >= 50 ? 'neutral' : 'negative' },
      { id: 'risk', label: 'Clientes em risco', value: customers.criticalClients + customers.attentionClients, formattedValue: String(customers.criticalClients + customers.attentionClients), helper: 'Atenção ou crítico', trend: customers.criticalClients ? 'negative' : 'neutral' },
      { id: 'expansion', label: 'Prontos para expansão', value: customers.expansionReadyClients, formattedValue: String(customers.expansionReadyClients), helper: 'Potencial de novos produtos', trend: customers.expansionReadyClients ? 'positive' : 'neutral' },
    ],
    highlights: customers.revenueAtRisk > 0 ? [`${currency(customers.revenueAtRisk)} de receita recorrente estão associados a clientes em risco.`] : ['Nenhuma receita recorrente foi classificada como em risco.'],
  };
}

function buildFinanceSection(finance: FinanceIntelligenceSummary): ExecutiveReportSection {
  const score = clamp(finance.collectionRate - finance.delinquencyRate * 0.5);
  return {
    id: 'finance', title: 'Receita e cobrança', score, risk: riskFromScore(score),
    summary: `${currency(finance.receivedRevenue)} recebidos, com ${currency(finance.overdueRevenue)} vencidos.`,
    metrics: [
      { id: 'mrr', label: 'Receita recorrente', value: finance.recurringRevenue, formattedValue: currency(finance.recurringRevenue), helper: 'MRR contratado', trend: finance.recurringRevenue > 0 ? 'positive' : 'neutral' },
      { id: 'collection', label: 'Eficiência de cobrança', value: finance.collectionRate, formattedValue: percent(finance.collectionRate), helper: 'Recebido sobre faturado', trend: finance.collectionRate >= 80 ? 'positive' : finance.collectionRate >= 60 ? 'neutral' : 'negative' },
      { id: 'overdue', label: 'Total vencido', value: finance.overdueRevenue, formattedValue: currency(finance.overdueRevenue), helper: 'Cobranças fora do prazo', trend: finance.overdueRevenue > 0 ? 'negative' : 'positive' },
    ],
    highlights: finance.forecast30Days > 0 ? [`Previsão de ${currency(finance.forecast30Days)} para os próximos 30 dias.`] : ['Não há previsão de recebimentos cadastrada para os próximos 30 dias.'],
  };
}

function buildGovernanceSection(decisions: Decision[], memories: Memory[]): ExecutiveReportSection {
  const importantDecisions = decisions.filter((item) => item.importance === 'alta' || item.importance === 'crítica' || item.impact === 'estratégico').length;
  const importantMemories = memories.filter((item) => item.importance === 'alta' || item.importance === 'crítica').length;
  const score = clamp((decisions.length ? 45 : 0) + (memories.length ? 35 : 0) + Math.min(20, importantDecisions + importantMemories));
  return {
    id: 'governance', title: 'Governança e conhecimento', score, risk: riskFromScore(score),
    summary: `${decisions.length} decisões e ${memories.length} memórias registradas na base operacional.`,
    metrics: [
      { id: 'decisions', label: 'Decisões', value: decisions.length, formattedValue: String(decisions.length), helper: 'Registros formais', trend: decisions.length ? 'positive' : 'neutral' },
      { id: 'memories', label: 'Memórias', value: memories.length, formattedValue: String(memories.length), helper: 'Conhecimento preservado', trend: memories.length ? 'positive' : 'neutral' },
      { id: 'critical', label: 'Registros estratégicos', value: importantDecisions + importantMemories, formattedValue: String(importantDecisions + importantMemories), helper: 'Alta importância ou impacto', trend: importantDecisions + importantMemories ? 'positive' : 'neutral' },
    ],
    highlights: decisions.length && memories.length ? ['A trilha de governança possui decisões e memórias registradas.'] : ['É recomendável fortalecer o registro formal de decisões e aprendizados.'],
  };
}

export const ExecutiveReportService = {
  build(input: BuildExecutiveReportInput): ExecutiveReportSnapshot {
    const now = new Date();
    const sections = [
      buildCommercialSection(input.opportunities),
      buildCustomerSection(input.customers),
      buildFinanceSection(input.finance),
      buildExecutionSection(input.projects, input.tasks, now),
      buildGovernanceSection(input.decisions, input.memories),
    ];
    const executiveScore = clamp(sections.reduce((sum, section) => sum + section.score, 0) / sections.length);
    const alerts: ExecutiveReportAlert[] = [];
    sections.filter((section) => section.risk !== 'saudável').forEach((section) => alerts.push({
      id: `report-${section.id}`, title: `${section.title} exige atenção`, description: section.summary, area: section.title,
      severity: section.risk === 'crítico' ? 'alta' : 'média', targetTab: section.id === 'commercial' ? 'commercial_radar' : section.id === 'customers' ? 'enterprise_clients' : section.id === 'finance' ? 'finance' : section.id === 'execution' ? 'tasks' : 'decisions',
      taskTitle: `[Relatório executivo] Recuperar indicador de ${section.title}`,
    }));
    const recommendations = sections.sort((a, b) => a.score - b.score).slice(0, 3).map((section) => `Priorizar ${section.title.toLowerCase()}: ${section.summary}`);
    return {
      generatedAt: now.toISOString(), organizationName: input.organizationName, executiveScore, risk: riskFromScore(executiveScore),
      headline: executiveScore >= 75 ? 'Operação consolidada e saudável.' : executiveScore >= 50 ? 'Operação estável, com pontos que exigem atenção.' : 'Operação em nível crítico e com necessidade de recuperação coordenada.',
      sections, alerts, recommendations,
    };
  },
};
