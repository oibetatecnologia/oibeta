import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class GovernmentTimelineEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async generateTimeline(organizationId: string, workspaceId?: string): Promise<any[]> {
    const events: any[] = [];

    // 1. Fetch real Knowledge Graph nodes
    try {
      const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
      
      nodes.forEach((node) => {
        const date = node.createdAt || node.created_at || new Date().toISOString();
        if (node.nodeType === "CONTRACT") {
          events.push({
            date,
            type: "CONTRACT_EXTRACTED",
            title: `Contrato Mapeado: ${node.title}`,
            description: node.description || "Identificado na auditoria documental automática.",
            id: node.id,
          });
        } else if (node.nodeType === "BID") {
          events.push({
            date,
            type: "BID_EXTRACTED",
            title: `Licitação Mapeada: ${node.title}`,
            description: node.description || "Inserido na listagem de compras governamentais.",
            id: node.id,
          });
        } else if (node.nodeType === "PROGRAM") {
          events.push({
            date,
            type: "PROGRAM_RECORDED",
            title: `Programa de Governo: ${node.title}`,
            description: node.description || "Registrado sob o programa plurianual.",
            id: node.id,
          });
        }
      });
    } catch (e) {
      console.warn("Could not query knowledge nodes for timeline:", e);
    }

    // 2. Fetch government snapshots
    try {
      const snaps = await this.dbAdapter.getGovernmentSnapshots(organizationId);
      snaps.forEach((s) => {
        const date = s.generatedAt || s.generated_at || new Date().toISOString();
        events.push({
          date,
          type: "GOVERNMENT_SNAPSHOT",
          title: "Fotografia Institucional Gerada",
          description: `Consolidação dos dados de conformidade (Saúde Score: ${s.indicators ? "Mapeado" : "não disponível"}).`,
          id: s.id,
        });
      });
    } catch (e) {
      console.warn("Could not query snapshots for timeline:", e);
    }

    // Sort by date desc
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return events;
  }
}
