import type { ClientsWorkspaceClient } from '../../hooks/useClientsWorkspace';
import type { FinanceActionItem, FinanceClientItem, FinanceIntelligenceSummary, FinanceRiskLevel } from './FinanceIntelligenceTypes';

const DAY = 86_400_000;

export class FinanceIntelligenceService {
  static build(clients: ClientsWorkspaceClient[], now = new Date()): FinanceIntelligenceSummary {
    const active = clients.filter((client) => ['contracted', 'active', 'paused'].includes(client.status));
    const records = active.flatMap((client) => client.financialRecords.map((record) => ({ client, record })));
    const recurringRevenue = active.reduce((sum, client) => sum + client.contracts.reduce((value, contract) => value + (contract.monthlyValue || 0), 0), 0);
    const expectedRevenue = records.filter(({ record }) => record.status !== 'cancelled').reduce((sum, { record }) => sum + record.amount, 0);
    const receivedRevenue = records.filter(({ record }) => record.status === 'paid').reduce((sum, { record }) => sum + record.amount, 0);
    const openRevenue = records.filter(({ record }) => record.status === 'pending' || record.status === 'overdue').reduce((sum, { record }) => sum + record.amount, 0);
    const overdueRevenue = records.filter(({ record }) => record.status === 'overdue').reduce((sum, { record }) => sum + record.amount, 0);
    const forecastLimit = now.getTime() + 30 * DAY;
    const forecast30Days = records.filter(({ record }) => {
      if (record.status !== 'pending' || !record.dueDate) return false;
      const due = new Date(record.dueDate).getTime();
      return Number.isFinite(due) && due >= now.getTime() && due <= forecastLimit;
    }).reduce((sum, { record }) => sum + record.amount, 0);

    const items = active.map((client) => this.analyzeClient(client));
    const actions = items.flatMap((item) => this.createActions(item)).sort((a, b) => this.priority(b.severity) - this.priority(a.severity));

    return {
      recurringRevenue,
      expectedRevenue,
      receivedRevenue,
      openRevenue,
      overdueRevenue,
      collectionRate: expectedRevenue > 0 ? Math.round((receivedRevenue / expectedRevenue) * 100) : 100,
      delinquencyRate: expectedRevenue > 0 ? Math.round((overdueRevenue / expectedRevenue) * 100) : 0,
      forecast30Days,
      healthyClients: items.filter((item) => item.riskLevel === 'healthy').length,
      attentionClients: items.filter((item) => item.riskLevel === 'attention').length,
      criticalClients: items.filter((item) => item.riskLevel === 'critical').length,
      clients: items.sort((a, b) => b.overdueAmount - a.overdueAmount || a.collectionScore - b.collectionScore),
      actions: actions.slice(0, 10),
    };
  }

  private static analyzeClient(client: ClientsWorkspaceClient): FinanceClientItem {
    const valid = client.financialRecords.filter((record) => record.status !== 'cancelled');
    const paid = valid.filter((record) => record.status === 'paid').reduce((sum, record) => sum + record.amount, 0);
    const overdue = valid.filter((record) => record.status === 'overdue');
    const pending = valid.filter((record) => record.status === 'pending');
    const expected = valid.reduce((sum, record) => sum + record.amount, 0);
    const overdueAmount = overdue.reduce((sum, record) => sum + record.amount, 0);
    const totalOpen = [...overdue, ...pending].reduce((sum, record) => sum + record.amount, 0);
    const reasons: string[] = [];
    if (overdue.length > 0) reasons.push(`${overdue.length} cobrança(s) vencida(s)`);
    if (client.contracts.length > 0 && valid.length === 0) reasons.push('contrato sem lançamento financeiro');
    if (pending.length >= 3) reasons.push('alto volume de cobranças pendentes');
    const collectionScore = expected > 0 ? Math.round((paid / expected) * 100) : client.contracts.length > 0 ? 45 : 100;
    let riskLevel: FinanceRiskLevel = 'healthy';
    if (overdueAmount > 0 || collectionScore < 45) riskLevel = 'critical';
    else if (reasons.length > 0 || collectionScore < 75) riskLevel = 'attention';
    return {
      clientId: client.id,
      clientName: client.name || client.entity || 'Cliente',
      monthlyRevenue: client.contracts.reduce((sum, contract) => sum + (contract.monthlyValue || 0), 0),
      totalOpen,
      overdueAmount,
      overdueCount: overdue.length,
      pendingCount: pending.length,
      collectionScore,
      riskLevel,
      reasons,
    };
  }

  private static createActions(item: FinanceClientItem): FinanceActionItem[] {
    const actions: FinanceActionItem[] = [];
    if (item.overdueCount > 0) actions.push({ id: `collect-${item.clientId}`, clientId: item.clientId, clientName: item.clientName, title: `Recuperar inadimplência — ${item.clientName}`, description: `${item.overdueCount} cobrança(s) vencida(s), totalizando ${this.currency(item.overdueAmount)}.`, taskTitle: `[Financeiro] ${item.clientName}: plano de cobrança para ${this.currency(item.overdueAmount)}`, severity: 'alta' });
    if (item.monthlyRevenue > 0 && item.totalOpen === 0 && item.collectionScore === 45) actions.push({ id: `billing-${item.clientId}`, clientId: item.clientId, clientName: item.clientName, title: `Estruturar faturamento — ${item.clientName}`, description: 'Existe receita contratada sem lançamento financeiro associado.', taskTitle: `[Financeiro] ${item.clientName}: criar faturamento recorrente`, severity: 'média' });
    if (item.pendingCount >= 3) actions.push({ id: `review-${item.clientId}`, clientId: item.clientId, clientName: item.clientName, title: `Revisar agenda de recebimentos — ${item.clientName}`, description: 'Há concentração de cobranças pendentes que exige acompanhamento.', taskTitle: `[Financeiro] ${item.clientName}: revisar agenda de recebimentos`, severity: 'média' });
    return actions;
  }

  private static priority(value: FinanceActionItem['severity']) { return value === 'alta' ? 3 : value === 'média' ? 2 : 1; }
  private static currency(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
}
