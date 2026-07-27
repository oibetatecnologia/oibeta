import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Bot,
  Box,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Layers3,
  PackageCheck,
  Radar,
  Rocket,
  ShieldCheck,
  Tags,
  Target,
  Users,
} from 'lucide-react';
import useClientsWorkspace from '../../hooks/useClientsWorkspace';
import ProductPortfolioCommandCenter from '../products/ProductPortfolioCommandCenter';
import type { ProductPortfolioAction } from '../../core/products/ProductPortfolioTypes';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import {
  BETA_MARKET_SERVICES,
  getMarketServiceStatusLabel,
  getOpportunityTypeLabel,
  type BetaMarketServiceDefinition,
} from '../../core/commercial/CommercialRadarRegistry';

const PRODUCT_STATUS_CLASSES: Record<BetaMarketServiceDefinition['status'], string> = {
  ready_to_audit: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  mapped: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  in_development: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  sellable: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

const PRODUCT_STATUS_WEIGHTS: Record<BetaMarketServiceDefinition['status'], number> = {
  ready_to_audit: 35,
  mapped: 55,
  in_development: 70,
  sellable: 90,
};

export default function EnterpriseProductsWorkspace() {
  const { createTask, tasks } = useWorkspace().tasks;
  const [creatingProductTaskId, setCreatingProductTaskId] = useState<string | null>(null);
  const [creatingPortfolioActionId, setCreatingPortfolioActionId] = useState<string | null>(null);

  const {
    clientsList,
    radarOpportunities,
    clientExecutiveSummary,
    productCommercializationSummary,
  } = useClientsWorkspace();

  const productUsage = useMemo(() => {
    return BETA_MARKET_SERVICES.map((service) => {
      const interestedClients = clientsList.filter((client) =>
        client.products.some((product) => product.productId === service.productId || product.serviceId === service.id)
      );

      const contractedClients = clientsList.filter((client) =>
        client.products.some(
          (product) =>
            (product.productId === service.productId || product.serviceId === service.id) &&
            ['contracted', 'implantation'].includes(product.status)
        )
      );

      const relatedOpportunities = radarOpportunities.filter((opportunity) => {
        const text = [
          opportunity.title,
          opportunity.object,
          opportunity.notes,
          opportunity.buyerName,
          opportunity.city,
          opportunity.state,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return service.procurementKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
      });

      return {
        service,
        interestedClients,
        contractedClients,
        relatedOpportunities,
      };
    });
  }, [clientsList, radarOpportunities]);

  const sellableProducts = productCommercializationSummary.sellableProducts;
  const mappedProducts = BETA_MARKET_SERVICES.filter((service) => service.status === 'mapped').length;
  const auditProducts = BETA_MARKET_SERVICES.filter((service) => service.status === 'ready_to_audit').length;
  const developmentProducts = BETA_MARKET_SERVICES.filter((service) => service.status === 'in_development').length;
  const totalInterestedClients = productCommercializationSummary.interestedClients;
  const totalContractedClients = productCommercializationSummary.contractedClients;
  const totalRelatedOpportunities = productCommercializationSummary.relatedOpportunities;
  const catalogReadiness = productCommercializationSummary.averageReadiness;

  const productRecommendations = useMemo(() => {
    const recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'alta' | 'média';
      taskTitle: string;
    }> = [];

    if (productCommercializationSummary.firstProductToSell) {
      recommendations.push({
        id: 'first-product-to-sell',
        title: `Priorizar ${productCommercializationSummary.firstProductToSell.service.shortName}`,
        description: productCommercializationSummary.firstProductToSell.nextAction,
        priority: productCommercializationSummary.firstProductToSell.readinessScore >= 70 ? 'média' : 'alta',
        taskTitle: productCommercializationSummary.firstProductToSell.taskTitle,
      });
    }

    if (clientExecutiveSummary.readinessLevel !== 'saudável') {
      recommendations.push({
        id: 'executive-product-priority',
        title: 'Alinhar produtos à prioridade executiva',
        description: clientExecutiveSummary.nextMilestone,
        priority: clientExecutiveSummary.readinessLevel === 'crítico' ? 'alta' : 'média',
        taskTitle: `[Produtos] Alinhar catálogo à prioridade executiva: ${clientExecutiveSummary.nextMilestone}`,
      });
    }

    recommendations.push(
      {
        id: 'sellable-criteria',
        title: 'Formalizar critérios de produto vendável',
        description: 'Cada produto deve possuir escopo, público comprador, indicadores, proposta, contrato, implantação e suporte definidos.',
        priority: 'alta',
        taskTitle: '[Produtos] Formalizar critérios de produto vendável',
      },
      {
        id: 'catalog-crm',
        title: 'Conectar catálogo ao CRM',
        description: 'Produtos sugeridos no CRM devem nascer deste catálogo oficial para evitar divergência comercial.',
        priority: 'alta',
        taskTitle: '[Produtos] Conectar catálogo oficial ao CRM',
      },
      {
        id: 'radar-priority',
        title: 'Priorizar produtos com oportunidades reais',
        description: 'Produtos com mais correspondência no Radar Comercial devem subir na fila de implementação.',
        priority: 'média',
        taskTitle: '[Produtos] Priorizar produtos com oportunidades reais do Radar',
      },
    );

    if (sellableProducts === 0) {
      recommendations.unshift({
        id: 'no-sellable-product',
        title: 'Nenhum produto marcado como vendável',
        description: 'A plataforma já tem operação comercial, mas o catálogo precisa evoluir até pelo menos um produto com status vendável.',
        priority: 'alta',
        taskTitle: '[Produtos] Definir primeiro produto com status vendável',
      });
    }

    return recommendations.slice(0, 4);
  }, [clientExecutiveSummary.nextMilestone, clientExecutiveSummary.readinessLevel, productCommercializationSummary.firstProductToSell, sellableProducts]);

  const handleCreatePortfolioTask = async (action: ProductPortfolioAction) => {
    setCreatingPortfolioActionId(action.id);
    try {
      await createTask(action.taskTitle);
    } finally {
      setCreatingPortfolioActionId(null);
    }
  };

  const handleCreateProductTask = async (recommendation: { id: string; taskTitle: string }) => {
    setCreatingProductTaskId(recommendation.id);

    try {
      await createTask(recommendation.taskTitle);
    } finally {
      setCreatingProductTaskId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-emerald-300 font-black">
              Oi Beta / Catálogo Comercial
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Box className="w-7 h-7 text-emerald-300" />
              Produtos
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área para organizar os produtos reais da Oi Beta, acompanhar maturidade comercial, relação com oportunidades, clientes interessados e preparação para venda.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-emerald-200 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Beta nos produtos
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Eu cruzo catálogo, Radar Comercial e CRM para indicar quais produtos devem ser priorizados, empacotados e preparados para venda.
            </p>
          </div>
        </div>
      </section>

      <ProductPortfolioCommandCenter
        commercialization={productCommercializationSummary}
        tasks={tasks}
        creatingId={creatingPortfolioActionId}
        onCreateTask={(action) => void handleCreatePortfolioTask(action)}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <ProductMetricCard icon={<PackageCheck className="w-4 h-4" />} label="Produtos" value={BETA_MARKET_SERVICES.length} helper="Catálogo atual" />
        <ProductMetricCard icon={<BadgeCheck className="w-4 h-4" />} label="Vendáveis" value={sellableProducts} helper="Prontos para oferta" />
        <ProductMetricCard icon={<Layers3 className="w-4 h-4" />} label="Mapeados" value={mappedProducts} helper="Escopo inicial" />
        <ProductMetricCard icon={<ClipboardList className="w-4 h-4" />} label="A auditar" value={auditProducts} helper="Revisão necessária" />
        <ProductMetricCard icon={<Rocket className="w-4 h-4" />} label="Em dev" value={developmentProducts} helper="Implementação" />
        <ProductMetricCard icon={<Users className="w-4 h-4" />} label="Interesse" value={totalInterestedClients} helper="Clientes/produtos" />
        <ProductMetricCard icon={<Radar className="w-4 h-4" />} label="Radar" value={totalRelatedOpportunities} helper="Oportunidades ligadas" />
        <ProductMetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Comercialização" value={`${productCommercializationSummary.averageReadiness}%`} helper={`${productCommercializationSummary.almostSellableProducts} quase vendáveis`} />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Catálogo oficial
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Produtos e serviços mapeados</h2>
            </div>

            <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Registry comercial
            </span>
          </div>

          <div className="space-y-3">
            {productCommercializationSummary.items.map((item) => (
              <ProductCatalogCard
                key={item.service.id}
                service={item.service}
                interestedClients={item.interestedClients}
                contractedClients={item.contractedClients}
                relatedOpportunities={item.relatedOpportunities}
                readinessScore={item.readinessScore}
                missingCriteria={item.missingCriteria}
                nextAction={item.nextAction}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Fila da Beta
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Ações para vender</h2>
            </div>

            <div className="space-y-3">
              {productRecommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-[var(--text-main)]">{recommendation.title}</h3>
                    <span className={`text-[10px] uppercase font-mono font-black ${recommendation.priority === 'alta' ? 'text-red-300' : 'text-amber-300'}`}>
                      {recommendation.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {recommendation.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => void handleCreateProductTask(recommendation)}
                    disabled={creatingProductTaskId === recommendation.id}
                    className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingProductTaskId === recommendation.id ? 'Criando tarefa...' : 'Criar tarefa'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Critérios
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Produto vendável</h2>
            </div>

            <div className="space-y-2">
              {[
                'Escopo funcional definido',
                'Benefícios comerciais claros',
                'Indicadores de valor',
                'Modelo de proposta',
                'Modelo de contrato',
                'Implantação prevista',
                'Suporte operacional',
                'Base para IA e conhecimento',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 px-3 py-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="text-xs font-bold text-[var(--text-main)]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Contratações
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Produtos ativos</h2>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-300" />
                <div>
                  <strong className="text-2xl font-black text-[var(--text-main)]">{totalContractedClients}</strong>
                  <p className="text-xs text-[var(--text-secondary)]">Relações cliente/produto contratadas ou em implantação.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-secondary)] font-black block mt-4">
        {label}
      </span>
      <strong className="text-2xl font-black text-[var(--text-main)] block mt-1">{value}</strong>
      <span className="text-xs text-[var(--text-secondary)]">{helper}</span>
    </div>
  );
}

function ProductCatalogCard({
  service,
  interestedClients,
  contractedClients,
  relatedOpportunities,
  readinessScore,
  missingCriteria,
  nextAction,
}: {
  service: BetaMarketServiceDefinition;
  interestedClients: number;
  contractedClients: number;
  relatedOpportunities: number;
  readinessScore: number;
  missingCriteria: string[];
  nextAction: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {service.serviceNumber && (
              <span className="text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                Sistema {service.serviceNumber}
              </span>
            )}
            <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${PRODUCT_STATUS_CLASSES[service.status]}`}>
              {getMarketServiceStatusLabel(service.status)}
            </span>
            <span className="text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              {readinessScore}% pronto
            </span>
          </div>

          <h3 className="text-base font-black text-[var(--text-main)] mt-3">
            {service.shortName}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
            {service.commercialName}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {service.targetBuyers.slice(0, 5).map((buyer) => (
              <span key={buyer} className="text-[10px] font-mono text-[var(--text-secondary)] border border-[var(--border-color)] rounded-full px-2 py-1">
                {buyer}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 xl:min-w-[270px]">
          <MiniProductStat icon={<Users className="w-3.5 h-3.5" />} value={interestedClients} label="Interesse" />
          <MiniProductStat icon={<BadgeCheck className="w-3.5 h-3.5" />} value={contractedClients} label="Ativos" />
          <MiniProductStat icon={<Target className="w-3.5 h-3.5" />} value={relatedOpportunities} label="Radar" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/50 p-3">
          <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] flex items-center gap-1.5">
            <Tags className="w-3.5 h-3.5" />
            Palavras-chave
          </span>
          <p className="text-xs text-[var(--text-main)] font-bold mt-2 leading-relaxed">
            {service.procurementKeywords.slice(0, 7).join(', ')}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/50 p-3">
          <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Modalidades
          </span>
          <p className="text-xs text-[var(--text-main)] font-bold mt-2 leading-relaxed">
            {service.opportunityTypes.map(getOpportunityTypeLabel).join(', ')}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <span className="text-[10px] uppercase font-mono font-black text-emerald-300">Próxima ação comercial</span>
        <p className="text-xs font-bold text-[var(--text-main)] mt-1">{nextAction}</p>
        {missingCriteria.length > 0 && (
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Falta: {missingCriteria.slice(0, 3).join(', ')}.
          </p>
        )}
      </div>
    </article>
  );
}

function MiniProductStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/50 p-3 text-center">
      <div className="text-emerald-300 flex items-center justify-center mb-1">{icon}</div>
      <strong className="text-lg font-black text-[var(--text-main)] block">{value}</strong>
      <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}
