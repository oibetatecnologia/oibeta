import type { DatabaseAdapter } from "../../database/DatabaseAdapter";
import type { CurrentUser } from "../../auth/currentUser";
import { PRODUCT_REGISTRY } from "../../../src/products/productRegistry";
import { ensureCurrentOpportunityAnalysis } from '../../../src/core/commercial/OpportunityAnalyzer';

export interface BetaOperationalContextSnapshot {
  generatedAt: string;
  organizationId: string;
  tenantId: string;
  workspaceId: string;
  role: string;
  isOiBetaView: boolean;
  allowedProductIds: string[];
  licensedProductIds: string[];
  radar: {
    total: number;
    qualified: number;
    reviewRequired: number;
    expiringSoon: number;
    top: Array<{ id: string; title: string; iac: number; deadline?: string; productIds: string[]; products: Array<{ id: string; name: string; score: number }> }>;
    demandByProduct: Array<{ productId: string; productName: string; opportunities: number; averageScore: number }>;
  };
  crm: {
    totalClients: number;
    contractedOrActive: number;
    provisioningPending: number;
  };
  commercialTasks: {
    total: number;
    pending: number;
  };
}

function normalizeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getAnalysis(opportunity: any): any {
  if (!opportunity || typeof opportunity !== 'object') return {};
  return ensureCurrentOpportunityAnalysis(opportunity);
}

export class BetaCommercialContextEngine {
  constructor(private readonly db: DatabaseAdapter) {}

  async build(user: CurrentUser, workspaceId: string): Promise<BetaOperationalContextSnapshot> {
    const [opportunities, clients, commercialTasks] = await Promise.all([
      this.db.getCommercialOpportunities(user.organizationId, workspaceId).catch(() => []),
      this.db.getCrmGovClients(user.organizationId, workspaceId).catch(() => []),
      this.db.getCommercialTasks(user.organizationId, workspaceId).catch(() => []),
    ]);

    const now = Date.now();
    const sevenDays = now + 7 * 86400000;
    const top = [...opportunities]
      .map((item: any) => {
        const analysis = getAnalysis(item);
        const matches = Array.isArray(analysis.bestMatches) ? analysis.bestMatches : [];
        return {
          id: String(item.id || ""),
          title: String(item.title || item.object || "Oportunidade sem título"),
          iac: Number(analysis.iac || item.iac || 0),
          deadline: item.submissionDeadline || item.deadline || undefined,
          productIds: matches.map((match: any) => String(match.productId || "")).filter(Boolean),
          products: matches.slice(0, 4).map((match: any) => {
            const productId = String(match.productId || "");
            const product = PRODUCT_REGISTRY.find((item) => item.id === productId);
            return { id: productId, name: product?.commercialName || String(match.serviceName || productId), score: Number(match.score || 0) };
          }).filter((item: { id: string }) => Boolean(item.id)),
        };
      })
      .sort((a, b) => b.iac - a.iac)
      .slice(0, 5);

    const productDemand = new Map<string, { total: number; score: number }>();
    for (const opportunity of opportunities as any[]) {
      const matches = Array.isArray(getAnalysis(opportunity).bestMatches) ? getAnalysis(opportunity).bestMatches : [];
      for (const match of matches) {
        const productId = String(match.productId || "");
        if (!productId) continue;
        const current = productDemand.get(productId) || { total: 0, score: 0 };
        current.total += 1;
        current.score += Number(match.score || 0);
        productDemand.set(productId, current);
      }
    }
    const demandByProduct = [...productDemand.entries()]
      .map(([productId, value]) => ({
        productId,
        productName: PRODUCT_REGISTRY.find((item) => item.id === productId)?.commercialName || productId,
        opportunities: value.total,
        averageScore: Math.round(value.score / Math.max(1, value.total)),
      }))
      .sort((a, b) => b.opportunities - a.opportunities || b.averageScore - a.averageScore);

    return {
      generatedAt: new Date().toISOString(),
      organizationId: user.organizationId,
      tenantId: user.tenantId || user.organizationId,
      workspaceId,
      role: user.role,
      isOiBetaView: user.role === "master_admin" && user.organizationId === "org-oi-beta",
      allowedProductIds: normalizeArray(user.productIds),
      licensedProductIds: normalizeArray(user.licensedProductIds),
      radar: {
        total: opportunities.length,
        qualified: opportunities.filter((item: any) => item.qualificationStatus === "qualified").length,
        reviewRequired: opportunities.filter((item: any) => item.qualificationStatus === "review_required").length,
        expiringSoon: opportunities.filter((item: any) => {
          const raw = item.submissionDeadline || item.deadline;
          if (!raw) return false;
          const timestamp = new Date(raw).getTime();
          return Number.isFinite(timestamp) && timestamp >= now && timestamp <= sevenDays;
        }).length,
        top,
        demandByProduct,
      },
      crm: {
        totalClients: clients.length,
        contractedOrActive: clients.filter((item: any) => ["contracted", "active"].includes(item.status)).length,
        provisioningPending: clients.filter((item: any) => ["not_provisioned", "provisioning"].includes(item.provisioningStatus)).length,
      },
      commercialTasks: {
        total: commercialTasks.length,
        pending: commercialTasks.filter((item: any) => !["completed", "done", "cancelled"].includes(item.status)).length,
      },
    };
  }

  toPrompt(snapshot: BetaOperationalContextSnapshot): string {
    const topLines = snapshot.radar.top.length > 0
      ? snapshot.radar.top.map((item) => `- ${item.title} | IAC ${item.iac} | produtos: ${item.products.map((product) => `${product.name} (${product.score})`).join(", ") || "não identificados"}${item.deadline ? ` | prazo: ${item.deadline}` : ""}`).join("\n")
      : "- Nenhuma oportunidade registrada.";

    return `===== CONTEXTO OPERACIONAL DA ORGANIZAÇÃO =====\n` +
      `Organização: ${snapshot.organizationId}\n` +
      `Tenant: ${snapshot.tenantId}\n` +
      `Workspace: ${snapshot.workspaceId}\n` +
      `Perfil: ${snapshot.role}\n` +
      `Visão: ${snapshot.isOiBetaView ? "Administração mestre da Oi Beta" : "Organização cliente"}\n` +
      `Produtos permitidos ao usuário: ${snapshot.allowedProductIds.join(", ") || "nenhum informado"}\n` +
      `Produtos licenciados ao tenant: ${snapshot.licensedProductIds.join(", ") || "nenhum informado"}\n\n` +
      `RADAR COMERCIAL\n` +
      `- Total: ${snapshot.radar.total}\n` +
      `- Qualificadas: ${snapshot.radar.qualified}\n` +
      `- Exigem revisão: ${snapshot.radar.reviewRequired}\n` +
      `- Prazo em até 7 dias: ${snapshot.radar.expiringSoon}\n` +
      `Principais oportunidades:\n${topLines}\n\n` +
      `CRM E OPERAÇÃO COMERCIAL\n` +
      `- Clientes registrados: ${snapshot.crm.totalClients}\n` +
      `- Contratados ou ativos: ${snapshot.crm.contractedOrActive}\n` +
      `- Provisionamento pendente: ${snapshot.crm.provisioningPending}\n` +
      `- Tarefas comerciais pendentes: ${snapshot.commercialTasks.pending}\n`;
  }

  answerLocally(message: string, snapshot: BetaOperationalContextSnapshot): string | null {
    const text = message.toLocaleLowerCase("pt-BR");
    const asksRadar = ["radar", "oportunidade", "licitação", "licitacao", "dispensa", "pregão", "pregao"].some((term) => text.includes(term));
    const asksCompatibility = ["mais a ver", "compatível", "compativel", "aderente", "meus produtos", "nossos produtos", "portfólio", "portfolio"].some((term) => text.includes(term));
    const asksClients = ["cliente", "crm", "contrato", "implantação", "implantacao", "provisionamento"].some((term) => text.includes(term));
    const asksProducts = ["produto", "portfólio", "portfolio", "licença", "licenca"].some((term) => text.includes(term));

    if (asksRadar) {
      if (snapshot.radar.total === 0) {
        return "No contexto atual, o Radar Comercial ainda não possui oportunidades registradas. Portanto, não tenho evidências para indicar uma oportunidade prioritária.";
      }

      if (asksCompatibility) {
        const ranked = snapshot.radar.demandByProduct.slice(0, 8);
        const ranking = ranked.length > 0
          ? ranked.map((item, index) => `${index + 1}. **${item.productName}** — ${item.opportunities} oportunidade(s), aderência média ${item.averageScore}%`).join("\n")
          : "Nenhum produto recebeu aderência determinística nas análises persistidas.";
        const examples = snapshot.radar.top.slice(0, 5).map((item, index) => {
          const best = item.products[0];
          return `${index + 1}. **${item.title}** — ${best ? `${best.name} (${best.score}% de compatibilidade)` : "produto ainda não identificado"} — IAC ${item.iac}`;
        }).join("\n");
        return `Comparei as **${snapshot.radar.total} oportunidades** com todos os produtos que possuem perfil comercial cadastrado no Radar.\n\n**Produtos com maior demanda identificada:**\n${ranking}\n\n**Exemplos prioritários:**\n${examples}\n\nA classificação é determinística e utiliza o objeto, modalidade, comprador, palavras-chave e evidências persistidas. Ela deve ser revisada antes de uma decisão comercial.`;
      }

      const top = snapshot.radar.top.slice(0, 5).map((item, index) => {
        const best = item.products[0];
        return `${index + 1}. **${item.title}** — IAC ${item.iac}${best ? ` — melhor aderência: ${best.name} (${best.score}%)` : ""}${item.deadline ? ` — prazo ${item.deadline}` : ""}`;
      }).join("\n");
      return `Encontrei **${snapshot.radar.total}** oportunidades no Radar, sendo **${snapshot.radar.qualified} qualificadas** e **${snapshot.radar.reviewRequired} aguardando revisão**.\n\nPrincipais registros por aderência:\n${top}\n\nEssa priorização utiliza somente os dados e análises persistidos no Radar.`;
    }

    if (asksClients) {
      return `No CRM existem **${snapshot.crm.totalClients} clientes**, dos quais **${snapshot.crm.contractedOrActive} estão contratados ou ativos**. Há **${snapshot.crm.provisioningPending} clientes com provisionamento pendente** e **${snapshot.commercialTasks.pending} tarefas comerciais pendentes**.`;
    }

    if (asksProducts) {
      const portfolio = PRODUCT_REGISTRY.filter((item) => item.commerciallyAvailable).map((item) => item.commercialName).join(", ");
      const licensed = snapshot.licensedProductIds.length > 0 ? snapshot.licensedProductIds.join(", ") : "nenhum produto informado";
      const allowed = snapshot.allowedProductIds.length > 0 ? snapshot.allowedProductIds.join(", ") : "nenhum acesso individual informado";
      return `Portfólio comercial cadastrado: **${portfolio || "nenhum produto comercial cadastrado"}**.\n\nProdutos licenciados ao tenant: **${licensed}**.\n\nProdutos permitidos ao usuário atual: **${allowed}**.\n\nA Beta é nativa da plataforma e não é licenciada separadamente.`;
    }

    return null;
  }
}
