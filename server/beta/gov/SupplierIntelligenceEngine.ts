import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export interface SupplierStats {
  supplierId: string;
  name: string;
  cnpj: string | null;
  participations: number;
  victories: number;
  defeats: number;
  winRate: number; // percentage
  associatedContracts: any[];
  associatedPriceRegistries: any[];
}

export class SupplierIntelligenceEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async calculateSupplierStats(organizationId: string, projectId?: string, workspaceId?: string): Promise<SupplierStats[]> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, projectId, actualWorkspaceId);
    const suppliers = nodes.filter(n => n.nodeType === "SUPPLIER");
    const proposals = nodes.filter(n => n.nodeType === "PROPOSAL");
    const contracts = nodes.filter(n => n.nodeType === "CONTRACT");
    const registries = nodes.filter(n => n.nodeType === "PRICE_REGISTRY");
    const lots = nodes.filter(n => n.nodeType === "LOT");

    const statsList: SupplierStats[] = [];

    for (const supp of suppliers) {
      const suppMeta = supp.metadata || {};
      const sName = (supp.title || "").toUpperCase();
      const sId = supp.id;
      const sCnpj = suppMeta.cnpj || null;

      // 1. Participations: count proposals submitted by this supplier or matching name
      const suppProposals = proposals.filter(p => {
        const pMeta = p.metadata || {};
        const pSuppName = (pMeta.supplierName || p.title || "").toUpperCase();
        return pMeta.supplierId === sId || pSuppName.includes(sName) || sName.includes(pSuppName);
      });

      const participations = suppProposals.length || 0;

      // 2. Victories: count how many of their proposals have class "Vencedora" or sit "VENCEDOR", plus any Lots awarded as Vencedor to them
      const winningPropsCount = suppProposals.filter(p => {
        const pMeta = p.metadata || {};
        return (pMeta.classification || "").toLowerCase().includes("vencedor") || 
               (pMeta.situation || "").toUpperCase() === "VENCEDOR";
      }).length;

      const winningLotsCount = lots.filter(l => {
        const lMeta = l.metadata || {};
        const lWinner = String(lMeta.winnerSupplierId || "").toUpperCase();
        return lMeta.winnerSupplierId === sId || lWinner.includes(sName) || sName.includes(lWinner);
      }).length;

      const victories = Math.max(winningPropsCount, winningLotsCount);

      // 3. Defeats: total participations minus victories
      const defeats = Math.max(0, participations - victories);

      // 4. Win Rate
      const winRate = participations > 0 ? Math.round((victories / participations) * 100) : 0;

      // 5. Associated contracts
      const associatedContracts = contracts.filter(c => {
        const cMeta = c.metadata || {};
        const cSupplier = String(cMeta.supplierName || cMeta.supplier || "").toUpperCase();
        const firstSuppNodeId = cMeta.supplierNodeId || "";
        return firstSuppNodeId === sId || cSupplier.includes(sName) || sName.includes(cSupplier);
      }).map(c => ({
        id: c.id,
        title: c.title,
        value: c.metadata?.value || c.metadata?.contractValue || null,
        number: c.metadata?.number || c.metadata?.contractNumber || null
      }));

      // 6. Associated Atas / Price Registries
      const associatedPriceRegistries = registries.filter(r => {
        const rMeta = r.metadata || {};
        const rSupplier = String(rMeta.supplierName || rMeta.supplier || "").toUpperCase();
        return rMeta.supplierNodeId === sId || rSupplier.includes(sName) || sName.includes(rSupplier);
      }).map(r => ({
        id: r.id,
        title: r.title,
        number: r.metadata?.number || null
      }));

      statsList.push({
        supplierId: sId,
        name: supp.title,
        cnpj: sCnpj,
        participations,
        victories,
        defeats,
        winRate,
        associatedContracts,
        associatedPriceRegistries
      });
    }

    // Sort by participation rate descending
    return statsList.sort((a, b) => b.participations - a.participations);
  }
}
