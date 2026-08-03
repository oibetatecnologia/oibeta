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
  ArrowRight,
  AlertTriangle,
  Clock3,
  Send,
  TrendingUp,
} from 'lucide-react';
import { CommercialRadarService } from '../../core/commercial/CommercialRadarService';
import { getOpportunityTypeLabel } from '../../core/commercial/CommercialRadarRegistry';
import { OpportunityRepository } from '../../core/commercial/OpportunityRepository';
import { CommercialTaskRepository } from '../../core/commercial/CommercialTaskRepository';
import { IntegrationReadinessService } from '../../core/integrations/IntegrationReadinessService';
import { ProductCommercializationService } from '../../core/commercial/ProductCommercializationService';
import useCommercialExecutiveSummary from '../../hooks/useCommercialExecutiveSummary';
import type { StoredCommercialTask } from '../../core/commercial/CommercialTaskStorage';
import { isOpportunityExpired, type CommercialOpportunity, type CommercialOpportunityEngagement, type CommercialOpportunityInput } from '../../core/commercial/OpportunityTypes';
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
import RadarTenantCatalogPanel from './RadarTenantCatalogPanel';
import { RadarTenantCatalogRepository, type RadarSavedSearch, type RadarTenantProduct, type RadarTenantProductInput } from '../../core/commercial/RadarTenantCatalogRepository';
import { OpportunityAnalyzer } from '../../core/commercial/OpportunityAnalyzer';
import type { CompatibilityProfile } from '../../core/commercial/CompatibilityEngine';
import { CommercialRadarActionSummaryService, type CommercialRadarActionItem } from '../../core/commercial/CommercialRadarActionSummaryService';

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
  const [relevanceFilter, setRelevanceFilter] = useState<'matched' | 'all' | 'unmatched'>('all');
  const [minimumCompatibility, setMinimumCompatibility] = useState<'all' | '60' | '75' | '90'>('all');
  const [sortOrder, setSortOrder] = useState<'compatibility_desc' | 'priority' | 'deadline'>('compatibility_desc');
  const [engagementFilter, setEngagementFilter] = useState<'all' | CommercialOpportunityEngagement>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'active' | 'all' | 'expired'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [tenantProducts, setTenantProducts] = useState<RadarTenantProduct[]>([]);
  const [savedSearches, setSavedSearches] = useState<RadarSavedSearch[]>([]);
  const pageSize = 50;

  const compatibilityProfiles = useMemo<CompatibilityProfile[]>(() => tenantProducts.filter((product) => product.active).map((product) => ({
    id: `tenant-product-${product.id}`,
    productId: product.id,
    name: product.name,
    anchorKeywords: [...product.keywords, ...product.classificationCodes],
    supportingKeywords: [...product.synonyms, product.category || '', product.brand || '', product.manufacturer || ''].filter(Boolean),
    category: product.category,
    regions: product.regions,
    minimumScore: 40,
    origin: 'tenant_catalog' as const,
  })), [tenantProducts]);
  const analyzedOpportunities = useMemo(() => opportunities.map((opportunity) => ({ ...opportunity, analysis: OpportunityAnalyzer.analyze(opportunity, compatibilityProfiles) })), [opportunities, compatibilityProfiles]);
  const snapshot = useMemo(() => CommercialRadarService.buildSnapshot(analyzedOpportunities), [analyzedOpportunities]);
  const integrationReadinessSummary = IntegrationReadinessService.buildSummary();
  const productCommercializationSummary = ProductCommercializationService.buildSummary([], analyzedOpportunities);
  const executiveSummary = useCommercialExecutiveSummary(analyzedOpportunities);
  const opportunityTypes = CommercialRadarService.getOpportunityTypes();
  const availableProducts = useMemo(() => {
    const products = new Map<string, string>();
    for (const opportunity of analyzedOpportunities) {
      for (const match of opportunity.analysis?.bestMatches || []) {
        products.set(match.productId, match.serviceName);
      }
    }
    return [...products.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [analyzedOpportunities]);
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

    const filtered = analyzedOpportunities.filter((opportunity) => {
      const score = bestScore(opportunity);
      if (relevanceFilter === 'matched' && score <= 0) return false;
      if (relevanceFilter === 'unmatched' && score > 0) return false;
      if (priorityFilter !== 'all' && opportunity.priority !== priorityFilter) return false;
      if (engagementFilter !== 'all' && (opportunity.engagementStatus || 'new') !== engagementFilter) return false;
      if (deadlineFilter === 'active' && isOpportunityExpired(opportunity)) return false;
      if (deadlineFilter === 'expired' && !isOpportunityExpired(opportunity)) return false;
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
  }, [analyzedOpportunities, relevanceFilter, priorityFilter, productFilter, minimumCompatibility, sortOrder, engagementFilter, deadlineFilter, searchTerm]);
  const actionSummary = useMemo(() => CommercialRadarActionSummaryService.build(analyzedOpportunities), [analyzedOpportunities]);
  const opportunityCounters = useMemo(() => {
    const active = analyzedOpportunities.filter((item) => !isOpportunityExpired(item)).length;
    const expired = analyzedOpportunities.length - active;
    const matched = analyzedOpportunities.filter((item) => (item.analysis?.bestMatches?.[0]?.score || 0) > 0).length;
    const qualified = analyzedOpportunities.filter((item) => item.qualificationStatus === 'qualified').length;
    return { total: analyzedOpportunities.length, active, expired, matched, qualified };
  }, [analyzedOpportunities]);
  const firstVisibleItem = filteredOpportunities.length === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const lastVisibleItem = Math.min(page * pageSize, filteredOpportunities.length);

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

    const loadCatalog = async () => {
      try {
        const [products, searches] = await Promise.all([RadarTenantCatalogRepository.listProducts(), RadarTenantCatalogRepository.listSearches()]);
        if (isMounted) { setTenantProducts(products); setSavedSearches(searches); }
      } catch (error) { console.warn('[CommercialRadar] Não foi possível carregar o catálogo do tenant.', error); }
    };

    loadOpportunities();
    loadCommercialTasks();
    loadConnectors();
    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [relevanceFilter, priorityFilter, productFilter, minimumCompatibility, sortOrder, engagementFilter, deadlineFilter, searchTerm]);

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

  const handleEngagementChange = async (opportunity: CommercialOpportunity, status: CommercialOpportunityEngagement) => {
    const updated = await OpportunityRepository.update(opportunity.id, {
      engagementStatus: status,
      engagementUpdatedAt: new Date().toISOString(),
    });
    setOpportunities((current) => current.map((item) => item.id === updated.id ? updated : item));
    if (selectedOpportunity?.id === updated.id) setSelectedOpportunity(updated);
  };

  const handleSendToCrm = async (input: import('../../core/commercial/OpportunityRepository').OpportunityCrmHandoffInput) => {
    if (!selectedOpportunity) throw new Error('Nenhuma oportunidade selecionada.');
    const result = await OpportunityRepository.sendToCrm(selectedOpportunity.id, input);
    setOpportunities((current) => current.map((item) => item.id === result.opportunity.id ? result.opportunity : item));
    setSelectedOpportunity(result.opportunity);
    const refreshedTasks = await CommercialTaskRepository.list();
    setCommercialTasks(refreshedTasks);
    return result;
  };


  const handleSaveTenantProduct = async (input: RadarTenantProductInput) => {
    const saved = await RadarTenantCatalogRepository.saveProduct(input);
    setTenantProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
  };
  const handleDeleteTenantProduct = async (id: string) => {
    await RadarTenantCatalogRepository.deleteProduct(id);
    setTenantProducts((current) => current.filter((item) => item.id !== id));
  };
  const handleSaveSearch = async (input: { name: string; keywords: string[]; active: boolean }) => {
    const saved = await RadarTenantCatalogRepository.saveSearch(input);
    setSavedSearches((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
  };
  const handleDeleteSearch = async (id: string) => {
    await RadarTenantCatalogRepository.deleteSearch(id);
    setSavedSearches((current) => current.filter((item) => item.id !== id));
  };
  const handleUseSearch = (search: RadarSavedSearch) => {
    setSearchTerm(search.keywords.join(' '));
    setRelevanceFilter('all');
  };

  const handleCommercialAction = (item: CommercialRadarActionItem) => {
    setSearchTerm('');
    setEngagementFilter('all');
    setDeadlineFilter('active');

    if (item.id === 'critical') {
      setRelevanceFilter('matched');
      setMinimumCompatibility('75');
      setSortOrder('compatibility_desc');
      return;
    }

    if (item.id === 'ready_for_crm') {
      setRelevanceFilter('all');
      setMinimumCompatibility('all');
      setSortOrder('compatibility_desc');
      return;
    }

    if (item.id === 'expiring') {
      setRelevanceFilter('all');
      setMinimumCompatibility('all');
      setSortOrder('deadline');
      return;
    }

    setRelevanceFilter('all');
    setMinimumCompatibility('all');
    setSortOrder('compatibility_desc');
  };

  const handleSaveConnectorCredential = async (connectorId: string, input: { scope: 'global' | 'tenant'; secret: string; label?: string }) => {
    await RadarConnectorRepository.saveCredential(connectorId, input);
    const availableConnectors = await RadarConnectorRepository.listConnectors();
    setConnectors(availableConnectors);
  };

  const handleRevokeConnectorCredential = async (connectorId: string, scope: 'global' | 'tenant') => {
    await RadarConnectorRepository.revokeCredential(connectorId, scope);
    const availableConnectors = await RadarConnectorRepository.listConnectors();
    setConnectors(availableConnectors);
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

          <div className="relative rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-indigo-200">Beta Comercial</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {actionSummary.actionable} oportunidade(s) ativas estão disponíveis para decisão.
                  {actionSummary.topProduct
                    ? ` O produto com maior demanda atual é ${actionSummary.topProduct.name}, com ${actionSummary.topProduct.count} correspondência(s).`
                    : ' Cadastre produtos ou palavras-chave para ampliar a análise de aderência.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CommercialActionMetric icon={<TrendingUp className="w-3.5 h-3.5" />} label="Alta aderência" value={actionSummary.highCompatibility} />
              <CommercialActionMetric icon={<Send className="w-3.5 h-3.5" />} label="Prontas para CRM" value={actionSummary.readyForCrm} />
              <CommercialActionMetric icon={<Clock3 className="w-3.5 h-3.5" />} label="Vencem em 7 dias" value={actionSummary.expiringSoon} />
              <CommercialActionMetric icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Sem triagem" value={actionSummary.unreviewed} />
            </div>

            <div className="space-y-2">
              {actionSummary.items.filter((item) => item.count > 0).slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCommercialAction(item)}
                  className="w-full p-3 rounded-xl border border-indigo-500/15 bg-[var(--bg-card)]/50 text-left hover:bg-indigo-500/10 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-[var(--text-main)]">{item.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">{item.description}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <RadarChecklistItem label="PNCP e Compras.gov nativos" done={connectors.filter((item) => item.available).length >= 2} />
              <RadarChecklistItem label="Catálogo da empresa e buscas salvas" done={tenantProducts.length > 0 || savedSearches.length > 0} />
              <RadarChecklistItem label="Qualificação e envio manual ao CRM" done />
              <RadarChecklistItem label="Acompanhamento e decisões persistentes" done />
            </div>
          </div>
        </div>
      </section>

      <RadarConnectorPanel
        connectors={connectors}
        runs={connectorRuns}
        runningConnectorId={runningConnectorId}
        onRun={handleRunConnector}
        onSaveCredential={handleSaveConnectorCredential}
        onRevokeCredential={handleRevokeConnectorCredential}
      />

      <RadarTenantCatalogPanel
        products={tenantProducts}
        searches={savedSearches}
        onSaveProduct={handleSaveTenantProduct}
        onDeleteProduct={handleDeleteTenantProduct}
        onSaveSearch={handleSaveSearch}
        onDeleteSearch={handleDeleteSearch}
        onUseSearch={handleUseSearch}
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            ['Coletadas', opportunityCounters.total],
            ['Prazo ativo', opportunityCounters.active],
            ['Prazo encerrado', opportunityCounters.expired],
            ['Aderentes', opportunityCounters.matched],
            ['Qualificadas', opportunityCounters.qualified],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 px-3 py-2">
              <span className="block text-[9px] uppercase tracking-widest font-mono text-[var(--text-secondary)]">{label}</span>
              <strong className="text-sm text-[var(--text-main)]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-[var(--text-secondary)] font-mono">
          Mostrando {firstVisibleItem}-{lastVisibleItem} de {filteredOpportunities.length} oportunidade(s) conforme os filtros atuais. Base total analisada: {opportunityCounters.total}.
        </div>

        {isLoadingOpportunities ? (
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 text-xs text-[var(--text-secondary)]">
            Carregando oportunidades comerciais...
          </div>
        ) : (
          <>
            {pagedOpportunities.length > 0 ? (
              <OpportunitiesTable opportunities={pagedOpportunities} onDelete={handleDeleteOpportunity} onAnalyze={setSelectedOpportunity} onEngagementChange={handleEngagementChange} />
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/25 text-center space-y-3">
                <h3 className="text-sm font-black text-[var(--text-main)]">Nenhuma oportunidade atende aos filtros atuais</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-2xl mx-auto">
                  {analyzedOpportunities.length > 0
                    ? `Existem ${analyzedOpportunities.length} contratações importadas. A análise radar-v2.2.0 recalcula a aderência usando evidência funcional e contexto tecnológico, sem considerar modalidade ou órgão como prova isolada.`
                    : 'Ainda não existem contratações importadas para análise.'}
                </p>
                {analyzedOpportunities.length > 0 && relevanceFilter !== 'all' && (
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
        onSendToCrm={handleSendToCrm}
      />
    </div>
  );
}


function CommercialActionMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-indigo-500/15 bg-[var(--bg-card)]/45 p-3">
      <div className="flex items-center gap-2 text-indigo-300">{icon}<span className="text-[9px] uppercase font-mono font-black">{label}</span></div>
      <strong className="text-lg font-black text-[var(--text-main)] block mt-2">{value}</strong>
    </div>
  );
}
