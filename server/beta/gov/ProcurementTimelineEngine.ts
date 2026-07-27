import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class ProcurementTimelineEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  private parseDateString(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    // Check if Brazilian format DD/MM/YYYY
    const brPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = brPattern.exec(dateStr.trim());
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? new Date() : new Date(parsed);
  }

  public async generateTimeline(organizationId: string, workspaceId?: string): Promise<any[]> {
    const events: any[] = [];

    // 1. Fetch real Knowledge Graph nodes
    try {
      const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");

      nodes.forEach((node) => {
        const date = node.createdAt || node.created_at || new Date().toISOString();
        const meta = node.metadata || {};

        if (node.nodeType === "BID" || node.nodeType === "NOTICE") {
          const rawDate = meta.publishDate || meta.openingDate || date;
          events.push({
            date: rawDate,
            parsedDate: this.parseDateString(rawDate),
            type: "PUBLICATION",
            title: `Publicação Processo Licitatório: ${node.title}`,
            description: node.description || "Início formal do certame e abertura do edital público.",
            id: node.id,
          });
        } else if (node.nodeType === "PROPOSAL") {
          events.push({
            date,
            parsedDate: this.parseDateString(date),
            type: "PROPOSAL_SUBMISSION",
            title: `Recebimento de Proposta: ${node.title}`,
            description: `Proposta de fornecedor registrada no valor de R$ ${(meta.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
            id: node.id,
          });
        } else if (node.nodeType === "LOT" || node.nodeType === "ITEM") {
          events.push({
            date,
            parsedDate: this.parseDateString(date),
            type: "JUDGMENT",
            title: `Julgamento de Itens/Lotes: ${node.title}`,
            description: `Classificação e encerramento de lances sobre o lote/item licitado.`,
            id: node.id,
          });
        } else if (node.nodeType === "AWARD") {
          const rawDate = meta.date || date;
          events.push({
            date: rawDate,
            parsedDate: this.parseDateString(rawDate),
            type: "ADJUDICATION",
            title: `Adjudicação Homologada: ${node.title}`,
            description: `Adjudicação de direito ao fornecedor vencedor no valor de R$ ${(meta.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
            id: node.id,
          });
        } else if (node.nodeType === "HOMOLOGATION") {
          const rawDate = meta.date || date;
          events.push({
            date: rawDate,
            parsedDate: this.parseDateString(rawDate),
            type: "HOMOLOGATION",
            title: `Homologação pela Autoridade: ${node.title}`,
            description: `Certame licitatório encerrado e validado legalmente pela autoridade competete.`,
            id: node.id,
          });
        } else if (node.nodeType === "CONTRACT") {
          const rawDate = meta.startDate || meta.signingDate || date;
          events.push({
            date: rawDate,
            parsedDate: this.parseDateString(rawDate),
            type: "CONTRATACAO",
            title: `Termo de Contratração: ${node.title}`,
            description: `Contrato assinado formalmente com o fornecedor adjudicante para entrega de serviços/produtos.`,
            id: node.id,
          });
        }
      });
    } catch (e) {
      console.warn("Could not query knowledge nodes for procurement timeline:", e);
    }

    // Sort by chronological order descending (newest first)
    events.sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    // Clean up parsedDate key before returning so it conforms exactly to the expected format
    return events.map(({ parsedDate, ...rest }) => rest);
  }
}
