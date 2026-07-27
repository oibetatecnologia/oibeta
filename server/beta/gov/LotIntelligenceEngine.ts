import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class LotIntelligenceEngine {
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
    const lots: any[] = [];

    // Lote 01, Lote 1, etc., including Group definitions
    const lotRegex = /(?:lote|grupo)\s+(\d+)\s*[-:]?\s*([A-ZÀ-Ÿ0-9][A-Za-z0-9À-Ÿ\s,.-]{5,120})/gi;
    const matches = Array.from(txt.matchAll(lotRegex));

    // Fetch existing suppliers to resolve winnerSupplierId to a real node ID if possible
    const currentNodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    const existingSuppliers = currentNodes.filter(n => n.nodeType === "SUPPLIER");

    for (const match of matches) {
      const lotNumber = match[1];
      const lotDesc = match[2].replace(/\r?\n/g, " ").trim();

      const blockStart = Math.max(0, txt.indexOf(match[0]) - 100);
      const blockEnd = Math.min(txt.length, txt.indexOf(match[0]) + 500);
      const contextualBlock = txt.substring(blockStart, blockEnd).toLowerCase();

      let value: number | null = null;
      let winnerSupplierId: string | null = null;
      let isWinnerResolved = false;

      // Detect Value: "Valor total do lote: R$ 10.000,00" or similar
      const valMatch = /(?:valor|total|lote|global)\s*(?:estimado|de|arrematado)?\s*(?:r\$)?\s*([\d.]+,\d{2})/gi.exec(contextualBlock);
      if (valMatch) {
        value = parseFloat(valMatch[1].replace(/\./g, "").replace(",", "."));
      }

      // Associate winners: looking for company/supplier name in proximity
      const winMatch = /(?:vencedora|arrematante|vencedor|ganhador|adjudicatário|empresa)\s*[:\-=]?\s*([A-Za-z0-9À-Ÿ\s.&\-/]{5,45})/gi.exec(contextualBlock);
      if (winMatch) {
         const rawWinner = winMatch[1].trim().toUpperCase();
         // Check if we can map to an existing supplier node ID
         const matchedSupp = existingSuppliers.find(s => {
           const sName = s.title.toUpperCase();
           return sName.includes(rawWinner) || rawWinner.includes(sName);
         });

         if (matchedSupp) {
           winnerSupplierId = matchedSupp.id;
           isWinnerResolved = true;
         } else {
           // Standard human literal matching
           winnerSupplierId = winMatch[1].trim();
         }
      }

      const id = `lot_${Math.random().toString(36).substring(7)}`;
      const lotNode = {
        id,
        lotNumber,
        lotDesc,
        value,
        winnerSupplierId,
        isWinnerResolved
      };

      lots.push(lotNode);

      // Persist to KG
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "LOT",
        `Lote ${lotNumber} - ${lotDesc.slice(0, 45)}`,
        `Lote nº ${lotNumber}: ${lotDesc}`,
        id,
        {
          lotNumber,
          value,
          winnerSupplierId,
          isWinnerResolved,
          sourceDoc: document.id
        }
      );

      // Relationship with document
      await this.kgEngine.createRelationship(organizationId, document.id, id, "CONTAINS");

      // Relate to winner supplier if exists
      if (winnerSupplierId && isWinnerResolved) {
        await this.kgEngine.createRelationship(organizationId, id, winnerSupplierId, "AWARDED_TO");
      }

      // Proactively link items that belong to this lot (e.g., matching item number prefix or located in contextual proximity)
      const lotItems = currentNodes.filter(n => n.nodeType === "ITEM" && n.metadata && n.metadata.itemNum && String(n.metadata.itemNum).startsWith(lotNumber));
      for (const item of lotItems) {
        await this.kgEngine.createRelationship(organizationId, id, item.id, "CONTAINS");
      }
    }

    return lots;
  }
}
