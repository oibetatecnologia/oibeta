import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ElectoralDomainEngine } from "./ElectoralDomainEngine";
import { ElectoralContextEngine } from "./ElectoralContextEngine";

export class ElectoralMemoryEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private domainEngine: ElectoralDomainEngine,
    private contextEngine: ElectoralContextEngine
  ) {}

  public async getElectoralMemorySnapshot(organizationId: string): Promise<any> {
    const context = await this.contextEngine.compileElectoralContext(organizationId, null);
    
    // Status Determination (Etapa 7)
    let dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY" = "NO_DATA";
    const hasCampaigns = context.campaigns.length > 0;
    const hasTerritories = context.territories.length > 0;
    const hasCoordinators = context.coordinators.length > 0;

    if (!hasCampaigns && !hasTerritories && !hasCoordinators) {
      dataStatus = "NO_DATA";
    } else if (hasCampaigns && hasTerritories && hasCoordinators) {
      dataStatus = "READY";
    } else {
      dataStatus = "PARTIAL_DATA";
    }

    // Summarize campaigns without generic placeholders (Etapa 1)
    let campaignSummary = null;
    if (context.campaigns.length > 0) {
      campaignSummary = context.campaigns.map((c: any) => {
        const parts = [];
        if (c.name) parts.push(`Campanha: ${c.name}`);
        if (c.candidateName) parts.push(`Candidato: ${c.candidateName}`);
        if (c.party) parts.push(`Partido: ${c.party}`);
        if (c.electionYear) parts.push(`Ano: ${c.electionYear}`);
        parts.push(`Status: ${c.status}`);
        return `- ${parts.join(", ")}`;
      }).join("\n");
    }

    // Summarize physical geography cover without generic placeholders (Etapa 2)
    let territorialSummary = null;
    if (context.territories.length > 0) {
      territorialSummary = context.territories.map((t: any) => {
        const parts = [];
        if (t.name) parts.push(t.name);
        if (t.type) parts.push(`Tipo: ${t.type}`);
        return `- ${parts.join(", ")}`;
      }).join("\n");
    }

    // Summarize coordinator distribution without generic placeholders (Etapa 3)
    let coordinatorSummary = null;
    if (context.coordinators.length > 0) {
      coordinatorSummary = context.coordinators.map((co: any) => {
        const parts = [];
        if (co.name) parts.push(co.name);
        parts.push(`Nível: ${co.level}`);
        parts.push(`Status: ${co.status}`);
        if (co.assignedTerritory) parts.push(`Território: ${co.assignedTerritory}`);
        return `- ${parts.join(", ")}`;
      }).join("\n");
    }

    // Summarize analyses without generic placeholders (Etapa 4)
    let analysisSummary = null;
    if (context.analyses.length > 0) {
      analysisSummary = context.analyses.map((a: any) => {
        const parts = [];
        if (a.title) parts.push(`Título: ${a.title}`);
        parts.push(`Tipo: ${a.type}`);
        if (a.summary) parts.push(`Resumo: ${a.summary}`);
        return `- ${parts.join(", ")}`;
      }).join("\n");
    }

    // Summarize gaps / pendências
    const gaps: string[] = [];
    if (context.campaigns.length > 0) {
      const activeHasNoCoordinators = context.campaigns.filter((c: any) => 
        c.status === "ACTIVE" && !context.coordinators.some((co: any) => co.campaignId === c.id)
      );
      if (activeHasNoCoordinators.length > 0) {
        gaps.push("Campanhas ativas sem nenhum coordenador associado mapeado.");
      }
    }
    if (context.metrics.unassignedTerritoriesCount > 0) {
      gaps.push(`Existem ${context.metrics.unassignedTerritoriesCount} territórios cadastrados sem responsáveis designados.`);
    }

    const gapsSummary = gaps.length > 0 ? gaps.map(g => `- ${g}`).join("\n") : null;

    return {
      dataStatus,
      campaigns: context.campaigns,
      territories: context.territories,
      coordinators: context.coordinators,
      analyses: context.analyses,
      metrics: context.metrics,
      summaries: {
        campaignSummary,
        territorialSummary,
        coordinatorSummary,
        analysisSummary,
        gapsSummary
      }
    };
  }
}
