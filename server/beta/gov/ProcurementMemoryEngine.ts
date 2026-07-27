import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ProcurementDomainEngine } from "./ProcurementDomainEngine";

export class ProcurementMemoryEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private procurementDomain: ProcurementDomainEngine,
  ) {}

  public async synthesizeProcurementMemory(
    organizationId: string,
    bids: any[],
    notices: any[],
    suppliers: any[],
    lots: any[],
    proposals: any[],
    workspaceId?: string,
  ): Promise<any> {
    const snaps = await this.dbAdapter.getProcurementSnapshots(organizationId, workspaceId || "default-workspace");
    const lastSnap = snaps.length > 0 ? snaps[0] : null;

    // Fetch contracts and price registries for memory recall completeness
    const allNodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, workspaceId || "default-workspace");
    const contracts = allNodes.filter(n => n.nodeType === "CONTRACT").map(c => ({
      id: c.id,
      title: c.title,
      number: c.metadata?.number || c.metadata?.contractNumber || null,
      value: c.metadata?.value || c.metadata?.contractValue || null,
      supplierName: c.metadata?.supplierName || null
    }));

    const priceRegistries = allNodes.filter(n => n.nodeType === "PRICE_REGISTRY").map(pr => ({
      id: pr.id,
      title: pr.title,
      number: pr.metadata?.number || null,
      validity: pr.metadata?.validity || null
    }));

    // Record the detected risks
    const risksList = lastSnap ? (lastSnap.risks || []) : [];

    return {
      lastSnapTimestamp: lastSnap ? lastSnap.generatedAt : null,
      bidsCount: bids.length,
      noticesCount: notices.length,
      suppliersCount: suppliers.length,
      lotsCount: lots.length,
      proposalsCount: proposals.length,
      contractsCount: contracts.length,
      priceRegistriesCount: priceRegistries.length,
      
      // Detailed Memory Lists
      suppliersMemory: suppliers.map(s => ({
        id: s.id,
        title: s.title,
        cnpj: s.metadata?.cnpj || null
      })),
      
      proposalsMemory: proposals.map(p => ({
        id: p.id,
        supplierName: p.metadata?.supplierName || p.title,
        value: p.metadata?.value || p.value || null,
        classification: p.metadata?.classification || null,
        situation: p.metadata?.situation || null
      })),

      lotsMemory: lots.map(l => ({
        id: l.id,
        lotNumber: l.metadata?.lotNumber || l.lotNumber || null,
        description: l.title,
        value: l.metadata?.value || l.value || null,
        winnerSupplierId: l.metadata?.winnerSupplierId || null
      })),

      linkedContracts: contracts,
      linkedAtas: priceRegistries,
      detectedRisks: risksList,
      
      memoryValid: true,
    };
  }
}
