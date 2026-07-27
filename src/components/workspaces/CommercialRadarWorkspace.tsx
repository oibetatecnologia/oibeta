import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Bot,
  FileSearch,
  Filter,
  Layers,
  ListChecks,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CommercialRadarService } from '../../core/commercial/CommercialRadarService';
import { getOpportunityTypeLabel } from '../../core/commercial/CommercialRadarRegistry';
import { OpportunityRepository } from '../../core/commercial/OpportunityRepository';
import { CommercialTaskRepository } from '../../core/commercial/CommercialTaskRepository';
import { IntegrationReadinessService } from '../../core/integrations/IntegrationReadinessService';
import { ProductCommercializationService } from '../../core/commercial/ProductCommercializationService';
import useCommercialExecutiveSummary from '../../hooks/useCommercialExecutiveSummary';
import type { StoredCommercialTask } from '../../core/commercial/CommercialTaskStorage';
import type { CommercialOpportunity, CommercialOpportunityInput } from '../../core/commercial/OpportunityTypes';
import { RadarConnectorRepository } from '../../core/commercial/connectors/RadarConnectorRepository';
import type { RadarConnectorDescriptor, RadarSyncRun } from '../../core/commercial/connectors/RadarConnectorTypes';
import {
  RadarChecklistItem,
  RadarMetricCard,
  RadarStatusBadge,
} from './CommercialRadarComponents';
import OpportunityFormPanel from './OpportunityFormPanel';
import OpportunitiesTable from './OpportunitiesTable';
import OpportunityAnalysisPanel from './OpportunityAnalysisPanel';
import CommercialBacklogPanel from './CommercialBacklogPanel';
import RadarConnectorPanel from './RadarConnectorPanel';
import CommercialExecutiveDashboard from './CommercialExecutiveDashboard';

export default function CommercialRadarWorkspace() {
  const [opportunities, setOpportunities] = useState<CommercialOpportunity[]>([]);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<CommercialOpportunity | null>(null);
  const [commercialTasks, setCommercialTasks] = useState<StoredCommercialTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [connectors, setConnectors] = useState<RadarConnectorDescriptor[]>([]);
  const [connectorRuns, setConnectorRuns] = useState<RadarSyncRun[]>([]);
  const [runningConnectorId, setRunningConnectorId] = useState<string>();
  const [priorityFilter, setPriorityFilter] = useState<'all' | CommercialOpportunity['priority']>('all');
  const [productFilter, setProductFilter] = useState('all');
  const [relevanceFilter, setRelevanceFilter] = useState<'matched' | 'all' | 'unmatched'>('matched');
  const [minimumCompatibility, setMinimumCompatibility] = useState<'all' | '60' | '75' | '90'>('all');
  const [sortOrder, setSortOrder] = useState<'compatibility_desc' | 'priority' | 'deadline'>('compatibility_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const snapshot = useMemo(() => CommercialRadarService.buildSnapshot(opportunities), [opportunities]);
  const integrationReadinessSummary = IntegrationReadinessService.buildSummary();
  const productCommercializationSummary = ProductCommercializationService.buildSummary([], opportunities);
  const executiveSummary = useCommercialExecutiveSummary(opportunities);
  const opportunityTypes = CommercialRadarService.getOpportunityTypes();
  const availableProducts = useMemo(() => {
    const products = new Map<string, string>();
    for (const opportunity of opportunities) {
      for (const match of opportunity.analysis?.bestMatches || []) {
        products.set(match.productId, match.serviceName);
      }
    }
    return [...products.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [opportunities]);
  const filteredOpportunities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
    const minimumScore = minimumCompatibility === 'all' ? 0 : Number(minimumCompatibility);
    const priorityWeight: Record<CommercialOpportunity['priority'], number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    const bestScore = (opportunity: CommercialOpportunity) =>
      opportunity.analysis?.bestMatches?.[0]?.score || 0;

    const filtered = opportunities.filter((opportunity) => {
      const score = bestScore(opportunity);
      if (relevanceFilter === 'matched' && score <= 0) return false;
      if (relevanceFilter === 'unmatched' && score > 0) return false;
      if (priorityFilter !== 'all' && opportunity.priority !== priorityFilter) return false;
      if (productFilter !== 'all' && !(opportunity.analysis?.bestMatches || []).some((match) => match.productId === productFilter)) return false;
      if (bestScore(opportunity) < minimumScore) return false;
      if (normalizedSearch && ![opportunity.title, opportunity.object, opportunity.buyerName, opportunity.city, opportunity.state, opportunity.processNumber].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(normalizedSearch)) return false;
      return true;
    });

    return [...filtered].sort((left, right) => {
      if (sortOrder === 'priority') {
        return priorityWeight[right.priority] - priorityWeight[left.priority] || bestScore(right) - bestScore(left);
      }
      if (sortOrder === 'deadline') {
        const leftDeadline = left.submissionDeadline ? new Date(left.submissionDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDeadline = right.submissionDeadline ? new Date(right.submissionDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        return leftDeadline - rightDeadline || bestScore(right) - bestScore(left);
      }
      return bestScore(right) - bestScore(left) || priorityWeight[right.priority] - priorityWeight[left.priority];
    });
  }, [opportunities, relevanceFilter, priorityFilter, productFilter, minimumCompatibility, sortOrder, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / pageSize));
  const pagedOpportunities = useMemo(() => filteredOpportunities.slice((page - 1) * pageSize, page * pageSize), [filteredOpportunities, page]);

  useEffect(() => {
    let isMounted = true;

    const loadOpportunities = async () => {
      try {
        const items = await OpportunityRepository.list();
        if (isMounted) {
          setOpportunities(items);
        }
      } finally {
        if (isMounted) {
          setIsLoadingOpportunities(false);
        }
      }
    };

    const loadCommercialTasks = async () => {
      try {
        const items = await CommercialTaskRepository.list();
        if (isMounted) {
          setCommercialTasks(items);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTasks(false);
        }
      }
    };

    const loadConnectors = async () => {
      try {
        const [availableConnectors, runs] = await Promise.all([
          RadarConnectorRepository.listConnectors(),
          RadarConnectorRepository.listRuns(),
        ]);
        if (isMounted) {
          setConnectors(availableConnectors);
          setConnectorRuns(runs);
        }
      } catch (error) {
        console.warn('[CommercialRadar] Não foi possível carregar conectores.', error);
      }
    };

    loadOpportunities();
    loadCommercialTasks();
    loadConnectors();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [relevanceFilter, priorityFilter, productFilter, minimumCompatibility, sortOrder, searchTerm]);

  const handleCreateOpportunity = async (input: CommercialOpportunityInput) => {
    const created = await OpportunityRepository.create(input);
    setOpportunities((current) => [created, ...current.filter((opportunity) => opportunity.id !== created.id)]);
  };

  const handleQualificationChange = async (status: import('../../core/commercial/OpportunityTypes').CommercialOpportunityQualification) => {
    if (!selectedOpportunity) return;
    const updated = await OpportunityRepository.update(selectedOpportunity.id, { qualificationStatus: status });
    setOpportunities((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedOpportunity(updated);
  };


  const handleRunConnector = async (connectorId: string) => {
    setRunningConnectorId(connectorId);
    try {
      const startedRun = await RadarConnectorRepository.run(connectorId);
      setConnectorRuns((current) => [startedRun, ...current.filter((item) => item.id !== startedRun.id)]);

      const terminalStatuses = new Set<RadarSyncRun['status']>(['completed', 'completed_with_warnings', 'failed']);
      const pollingStartedAt = Date.now();
      const pollingTimeoutMs = 15 * 60_000;

      while (Date.now() - pollingStartedAt < pollingTimeoutMs) {
        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        const runs = await RadarConnectorRepository.listRuns();
        setConnectorRuns(runs);
        const currentRun = runs.find((item) => item.id === startedRun.id);

        if (!currentRun || terminalStatuses.has(currentRun.status)) {
          const refreshedOpportunities = await OpportunityRepository.list();
          setOpportunities(refreshedOpportunities);
          return;
        }
      }

      const finalRuns = await RadarConnectorRepository.listRuns();
      setConnectorRuns(finalRuns);
    } finally {
      setRunningConnectorId(undefined);
    }
  };

  const handleDeleteOpportunity = async (opportunityId: string) => {
    await OpportunityRepository.delete(opportunityId);
    setOpportunities((current) => current.filter((opportunity) => opportunity.id !== opportunityId));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,129,247,0.18),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.35fr_0.85fr] gap-6">
          <div className="space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-[var(--blue-accent)] font-black">
                  Beta Platform / Radar Comercial
                </span>
                <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
                  <Radar className="w-7 h-7 text-[var(--blue-accent)]" />
                  Radar Comercial Inteligente
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
                  Monitore oportunidades reais, compare-as com o portfólio ou perfil comercial da organização e conduza a qualificação com evidências rastreáveis.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[var(--blue-accent)] text-white font-black text-xs uppercase tracking-widest font-mono flex items-center gap-2 self-start"
              >
                <Plus className="w-4 h-4" />
                Nova oportunidade
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <RadarMetricCard
                icon={<FileSearch className="w-4 h-4" />}
                label="Oportunidades"
                value={snapshot.summary.totalOpportunities}
                helper={`${snapshot.summary.qualifiedOpportunities} qualificadas • ${snapshot.summary.expiringSoon} vencendo`}
              />
              <RadarMetricCard
                icon={<Search className="w-4 h-4" />}
                label="Integrações"
                value={`${integrationReadinessSummary.readinessScore}%`}
                helper={`${integrationReadinessSummary.pendingProviders} pendentes`}
              />
              <RadarMetricCard
                icon={<Layers className="w-4 h-4" />}
                label="Produtos"
                value={`${productCommercializationSummary.averageReadiness}%`}
                helper={`${productCommercializationSummary.sellableProducts} vendáveis`}
              />
              <RadarMetricCard
                icon={<ListChecks className="w-4 h-4" />}
                label="Domínio comercial"
                value={`${snapshot.summary.domainReadiness}%`}
                helper="Motor de análise preparado"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
              <h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-500" />
                Fluxo atual
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                O Radar possui agora uma camada própria de conectores, histórico de sincronização e controle de execução. As fontes externas serão ativadas somente após validação do adaptador oficial.
              </p>
            </div>
          </div>

          <div className="relative rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col justify-between gap-5">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center mb-4">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-indigo-200">Beta no Radar</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                O Radar já organiza oportunidades, análises e ações comerciais. A próxima etapa conecta fontes públicas reais sem misturar regras específicas de cada portal ao domínio central.
              </p>
            </div>

            <div className="space-y-2">
              <RadarChecklistItem label="Cadastro manual de oportunidades" done />
              <RadarChecklistItem label="API de persistência do Radar" done />
              <RadarChecklistItem label="Tabela profissional" done />
              <RadarChecklistItem label="Análise visual da Beta" done={productCommercializationSummary.averageReadiness >= 60} />
              <RadarChecklistItem label="Criar tarefa a partir do edital" />
              <RadarChecklistItem label="Integração PNCP" done={integrationReadinessSummary.readinessScore >= 70} />
            </div>
          </div>
        </div>
      </section>

      <RadarConnectorPanel
        connectors={connectors}
        runs={connectorRuns}
        runningConnectorId={runningConnectorId}
        onRun={handleRunConnector}
      />

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
        <div className="border-b border-[var(--border-color)] pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[var(--text-main)]">Oportunidades</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Contratações importadas e classificadas pelo grau de aderência real ao portfólio da Oi Beta.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-3 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-main)] text-xs font-black flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova oportunidade
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
          <label className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar órgão, objeto ou processo" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]" />
          </label>
          <select value={relevanceFilter} onChange={(event) => setRelevanceFilter(event.target.value as 'matched' | 'all' | 'unmatched')} className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]">
            <option value="matched">Somente oportunidades aderentes</option>
            <option value="all">Todas as contratações importadas</option>
            <option value="unmatched">Sem aderência ao portfólio</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | CommercialOpportunity['priority'])} className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]">
            <option value="all">Todas as prioridades</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option>
          </select>
          <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]">
            <option value="all">Todos os produtos</option>
            {availableProducts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={minimumCompatibility} onChange={(event) => setMinimumCompatibility(event.target.value as 'all' | '60' | '75' | '90')} className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]">
            <option value="all">Qualquer compatibilidade</option>
            <option value="90">90% ou mais</option>
            <option value="75">75% ou mais</option>
            <option value="60">60% ou mais</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'compatibility_desc' | 'priority' | 'deadline')} className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)]">
            <option value="compatibility_desc">Mais compatíveis primeiro</option>
            <option value="priority">Maior prioridade primeiro</option>
            <option value="deadline">Prazo mais próximo primeiro</option>
          </select>
        </div>

        <div className="text-[10px] text-[var(--text-secondary)] font-mono">{filteredOpportunities.length} oportunidade(s) exibida(s) de {opportunities.length} contratação(ões) importada(s)</div>

        {isLoadingOpportunities ? (
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 text-xs text-[var(--text-secondary)]">
            Carregando oportunidades comerciais...
          </div>
        ) : (
          <>
            {pagedOpportunities.length > 0 ? (
              <OpportunitiesTable opportunities={pagedOpportunities} onDelete={handleDeleteOpportunity} onAnalyze={setSelectedOpportunity} />
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/25 text-center space-y-3">
                <h3 className="text-sm font-black text-[var(--text-main)]">Nenhuma oportunidade atende aos filtros atuais</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-2xl mx-auto">
                  {opportunities.length > 0
                    ? `Existem ${opportunities.length} contratações importadas. A análise radar-v2.2.0 recalcula a aderência usando evidência funcional e contexto tecnológico, sem considerar modalidade ou órgão como prova isolada.`
                    : 'Ainda não existem contratações importadas para análise.'}
                </p>
                {opportunities.length > 0 && relevanceFilter !== 'all' && (
                  <button type="button" onClick={() => setRelevanceFilter('all')} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs font-black text-[var(--text-main)]">
                    Ver todas as contratações importadas
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs disabled:opacity-40 flex items-center gap-2"><ChevronLeft className="w-4 h-4" />Anterior</button>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">Página {page} de {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="px-3 py-2 rounded-lg border border-[var(--border-color)] text-xs disabled:opacity-40 flex items-center gap-2">Próxima<ChevronRight className="w-4 h-4" /></button>
            </div>
          </>
        )}
      </section>

      {isLoadingTasks ? (
        <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-secondary)]">Carregando backlog comercial...</p>
        </section>
      ) : (
        <CommercialBacklogPanel
          tasks={commercialTasks}
          onClear={() => setCommercialTasks([])}
        />
      )}

      <CommercialExecutiveDashboard summary={executiveSummary} />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h2 className="text-sm font-black text-[var(--text-main)]">Catálogo comercial Beta</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Serviços documentados que serão comparados contra objetos reais de licitação, pregão e dispensa.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {snapshot.services.map((service) => (
              <div
                key={service.id}
                className="p-4 bg-[var(--bg-main)]/35 border border-[var(--border-color)] rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[9px] uppercase font-mono tracking-widest text-[var(--text-secondary)] font-black">
                      {service.serviceNumber ? `Sistema ${service.serviceNumber}` : 'Produto'}
                    </span>
                    <h3 className="text-sm font-black text-[var(--text-main)] mt-1">
                      {service.shortName}
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                      {service.commercialName}
                    </p>
                  </div>

                  <RadarStatusBadge
                    status={service.status}
                    label={CommercialRadarService.getStatusLabel(service.status)}
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] uppercase font-mono font-black text-[var(--text-secondary)] block">
                      Palavras-chave
                    </span>
                    <p className="text-[10px] text-[var(--text-main)] mt-1">
                      {CommercialRadarService.getSearchKeywords(service)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {service.opportunityTypes.map((type) => (
                      <span
                        key={type}
                        className="text-[9px] font-bold text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-2 py-0.5"
                      >
                        {getOpportunityTypeLabel(type)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--blue-accent)]" />
              Tipos monitorados
            </h2>

            <div className="space-y-2">
              {opportunityTypes.map((type) => (
                <div key={type.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                  <span className="text-xs font-black text-[var(--text-main)]">{type.label}</span>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Fontes
            </h2>

            <div className="space-y-2">
              {snapshot.sources.map((source) => (
                <div key={source.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[var(--text-main)]">{source.label}</span>
                    <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-slate-500/10 text-slate-300 border-slate-500/20">
                      {source.status === 'planned' ? 'Planejado' : source.status === 'connected' ? 'Conectado' : 'Não conectado'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">{source.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <OpportunityFormPanel
        isOpen={isFormOpen}
        opportunityTypes={opportunityTypes}
        onClose={() => setIsFormOpen(false)}
        onCreate={handleCreateOpportunity}
      />

      <OpportunityAnalysisPanel
        opportunity={selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        onTasksCreated={async () => setCommercialTasks(await CommercialTaskRepository.list())}
        onQualificationChange={handleQualificationChange}
      />
    </div>
  );
}
