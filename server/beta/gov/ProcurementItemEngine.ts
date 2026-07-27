import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ProcurementItemEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async extractFromDocument(
    document: any,
    content: string,
    projectId: string,
    organizationId: string
  ): Promise<any[]> {
    const txt = content || "";
    const items: any[] = [];

    // Detailed item regex: matches specific item descriptions
    const itemRegex = /(?:item\s+|lote\s+item\s+)(\d+)\s*[-:]?\s*([A-ZÀ-Ÿ0-9][A-Za-z0-9À-Ÿ\s,.-]{5,120})/gi;
    const matches = Array.from(txt.matchAll(itemRegex));

    for (const match of matches) {
      const itemNum = match[1];
      const itemName = match[2].replace(/\r?\n/g, " ").trim();

      // Proximity search for contextual items
      const blockStart = Math.max(0, txt.indexOf(match[0]) - 80);
      const blockEnd = Math.min(txt.length, txt.indexOf(match[0]) + 400);
      const contextualBlock = txt.substring(blockStart, blockEnd).toLowerCase();

      let quantity: number | null = null;
      let unit: string | null = null;
      let estimatedValue: number | null = null;
      let winningValue: number | null = null;
      let contractedValue: number | null = null;

      // Quantity Parsing: Qtd: 10, Quantidade: 5 etc.
      const qtyMatch = /(?:qtd|quantidade|quantid\.|quant|quant\.)\s*[:\-=]?\s*(\d+)/i.exec(contextualBlock);
      if (qtyMatch) quantity = parseInt(qtyMatch[1], 10);

      // Unit Parsing: un, und, pacote, etc.
      const unMatch = /(?:unidade|unid\.|un\b|und\b|pct\b|unid\b|litros\b|kg\b|kit\b)\s*[:\-=]?\s*([a-z]{1,8})/i.exec(contextualBlock);
      if (unMatch) unit = unMatch[1].trim().toUpperCase();

      // Estimated Value Parsing (Valor Estimado)
      const estMatch = /(?:valor estimado|preço máximo|estimado\s*r\$|ref\.\s*r\$|estimativa\s*r\$)\s*[:\-=]?\s*(?:r\$)?\s*([\d.]+,\d{2})/i.exec(contextualBlock);
      if (estMatch) {
        estimatedValue = parseFloat(estMatch[1].replace(/\./g, "").replace(",", "."));
      } else {
        // Fallback estimated value search in proximity
        const valMatch = /(?:estimado|referência|referência\s*r\$|unitário|máximo)\s*(?: unitário)?\s*(?:r\$)?\s*([\d.]+,\d{2})/i.exec(contextualBlock);
        if (valMatch) {
          estimatedValue = parseFloat(valMatch[1].replace(/\./g, "").replace(",", "."));
        }
      }

      // Winning / Contracted Value Parsing (Valor Vencedor / Contratado)
      const winMatch = /(?:valor vencedor|preço ofertado|lance vencedor|ganho\s*r\$|arrematado\s*r\$)\s*[:\-=]?\s*(?:r\$)?\s*([\d.]+,\d{2})/i.exec(contextualBlock);
      if (winMatch) {
        winningValue = parseFloat(winMatch[1].replace(/\./g, "").replace(",", "."));
      }

      const contrMatch = /(?:valor contratado|contratado\s*r\$|fechado\s*r\$|valor do contrato)\s*[:\-=]?\s*(?:r\$)?\s*([\d.]+,\d{2})/i.exec(contextualBlock);
      if (contrMatch) {
        contractedValue = parseFloat(contrMatch[1].replace(/\./g, "").replace(",", "."));
      }

      // If missing winning or contracted, cross-assign if likely similar
      if (winningValue && !contractedValue) contractedValue = winningValue;
      if (contractedValue && !winningValue) winningValue = contractedValue;

      const id = `item_${Math.random().toString(36).substring(7)}`;
      const itemNode = {
        id,
        name: `Item ${itemNum} - ${itemName.slice(0, 40)}`,
        description: itemName,
        quantity,
        unit,
        estimatedValue,
        winningValue,
        contractedValue
      };

      items.push(itemNode);

      // Persist Item Node in KG
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        "ITEM",
        itemNode.name,
        `Item licitatório nº ${itemNum}: ${itemName}`,
        id,
        {
          itemNum,
          quantity,
          unit,
          estimatedValue,
          winningValue,
          contractedValue,
          sourceDoc: document.id
        }
      );

      // Relationship with document
      await this.kgEngine.createRelationship(organizationId, document.id, id, "CONTAINS");
    }

    return items;
  }
}
