import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ProposalIntelligenceEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async extractFromDocument(
    document: any,
    content: string,
    projectId: string,
    organizationId: string,
    workspaceId?: string,
  ): Promise<any[]> {
    const txt = content || "";
    const proposals: any[] = [];

    // Detailed regex to extract structured proposals: "empresa LTDA de CNPJ ... no valor de R$ ..."
    const proposalRegex = /(?:empresa|licitante|proponente|fornecedor)\s+([A-Za-z0-9À-Ÿ\s.&\-/]{5,45})\s+(?:apresentou|ofereceu|propôs|proposta|ofertou)\s*(?:no\s+valor\s+de|valor)?\s*(?:r\$)?\s*([\d.]+,\d{2})/gi;
    const matches = Array.from(txt.matchAll(proposalRegex));

    // Fetch existing suppliers to resolve names to IDs
    const currentNodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    const existingSuppliers = currentNodes.filter(n => n.nodeType === "SUPPLIER");

    for (const match of matches) {
      const supplierName = match[1].trim();
      const valStr = match[2].replace(/\./g, "").replace(",", ".");
      const value = parseFloat(valStr);

      const blockStart = Math.max(0, txt.indexOf(match[0]) - 80);
      const blockEnd = Math.min(txt.length, txt.indexOf(match[0]) + 400);
      const contextualBlock = txt.substring(blockStart, blockEnd).toLowerCase();

      let classification = "Classificada";
      let situation = "HABILITADO";

      if (contextualBlock.includes("desclassificada") || contextualBlock.includes("inabilitada") || contextualBlock.includes("recusada")) {
        classification = "Desclassificada";
        situation = "DESCLASSIFICADO";
      } else if (contextualBlock.includes("vencedora") || contextualBlock.includes("1ª colocada") || contextualBlock.includes("venceu") || contextualBlock.includes("ganhadora")) {
        classification = "Vencedora";
        situation = "VENCEDOR";
      }

      // Try to resolve supplier ID
      const matchedSupp = existingSuppliers.find(s => {
        const sName = s.title.toUpperCase();
        const inputName = supplierName.toUpperCase();
        return sName.includes(inputName) || inputName.includes(sName);
      });

      const supplierId = matchedSupp ? matchedSupp.id : null;

      const id = `prop_${Math.random().toString(36).substring(7)}`;
      const propNode = {
        id,
        supplierName,
        supplierId,
        value, // offered value
        offeredValue: value,
        winningValue: situation === "VENCEDOR" ? value : null,
        classification,
        situation
      };

      proposals.push(propNode);

      // Persist to KG
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "PROPOSAL",
        `Proposta de ${supplierName.slice(0, 30)}`,
        `Proposta comercial de R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} extraída do documento ${document.filename}.`,
        id,
        {
          supplierName,
          supplierId,
          value,
          offeredValue: value,
          winningValue: situation === "VENCEDOR" ? value : null,
          classification,
          situation,
          sourceDoc: document.id
        }
      );

      // Relationship with document
      await this.kgEngine.createRelationship(organizationId, id, document.id, "GENERATED_FROM");

      // Relationship if supplier exists
      if (supplierId) {
        await this.kgEngine.createRelationship(organizationId, supplierId, id, "SUBMITTED_BY");
      }
    }

    return proposals;
  }

  /**
   * Compares a list of proposals to extract analytical indicators
   */
  public compareProposals(proposals: any[]): any {
    if (!proposals || proposals.length === 0) {
      return {
        bestProposal: null,
        worstProposal: null,
        pctDiff: 0,
        totalProposals: 0,
        averageValue: 0
      };
    }

    // Filter valid priced proposals
    const valid = proposals.filter(p => typeof p.value === "number" && p.value > 0);
    if (valid.length === 0) {
      return {
        bestProposal: null,
        worstProposal: null,
        pctDiff: 0,
        totalProposals: proposals.length,
        averageValue: 0
      };
    }

    // Best is lowest for public procurement
    const sorted = [...valid].sort((a, b) => a.value - b.value);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    let pctDiff = 0;
    if (best.value > 0) {
      pctDiff = Math.round(((worst.value - best.value) / best.value) * 100);
    }

    const sum = valid.reduce((acc, curr) => acc + curr.value, 0);
    const averageValue = sum / valid.length;

    return {
      bestProposal: {
        supplierName: best.supplierName || best.metadata?.supplierName,
        value: best.value,
        id: best.id
      },
      worstProposal: {
        supplierName: worst.supplierName || worst.metadata?.supplierName,
        value: worst.value,
        id: worst.id
      },
      pctDiff,
      totalProposals: proposals.length,
      averageValue
    };
  }
}
