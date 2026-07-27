import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface ProcurementBid {
  id: string;
  number: string | null;
  modality: string | null;
  object: string | null;
  responsibleAgency: string | null;
  openingDate: string | null;
  estimatedValue: number | null;
  judgmentCriteria: string | null;
  processNumber: string | null;
}

export interface ProcurementNotice {
  id: string;
  bidId: string | null;
  title: string | null;
  publishDate: string | null;
  content: string | null;
}

export interface ProcurementSupplier {
  id: string;
  name: string | null;
  cnpj: string | null;
  address: string | null;
  representative: string | null;
  contacts: string | null;
}

export interface ProcurementLot {
  id: string;
  bidId: string | null;
  lotNumber: string | null;
  value: number | null;
  winnerSupplierId: string | null;
}

export interface ProcurementItem {
  id: string;
  lotId: string | null;
  bidId: string | null;
  name: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  estimatedValue: number | null;
  winningValue: number | null;
}

export interface ProcurementProposal {
  id: string;
  bidId: string | null;
  supplierId: string | null;
  value: number | null;
  classification: string | null;
}

export interface ProcurementAward {
  id: string;
  bidId: string | null;
  supplierId: string | null;
  value: number | null;
  date: string | null;
}

export interface ProcurementHomologation {
  id: string;
  bidId: string | null;
  date: string | null;
  authority: string | null;
}

export interface ProcurementPriceRegistry {
  id: string;
  bidId: string | null;
  number: string | null;
  validity: string | null;
}

export interface ProcurementProcess {
  id: string;
  number: string | null;
  status: string | null;
}

export interface ProcurementPurchaseRequest {
  id: string;
  demander: string | null;
  value: number | null;
}

export class ProcurementDomainEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async getBids(organizationId: string): Promise<ProcurementBid[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "BID")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          number: meta.number || null,
          modality: meta.modality || null,
          object: meta.object || null,
          responsibleAgency: meta.responsibleAgency || meta.responsibleEntity || null,
          openingDate: meta.openingDate || null,
          estimatedValue: typeof meta.estimatedValue === "number" ? meta.estimatedValue : null,
          judgmentCriteria: meta.judgmentCriteria || null,
          processNumber: meta.processNumber || null,
        };
      });
  }

  public async getNotices(organizationId: string): Promise<ProcurementNotice[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "NOTICE")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          bidId: meta.bidId || null,
          title: n.title || null,
          publishDate: meta.publishDate || null,
          content: n.description || null,
        };
      });
  }

  public async getSuppliers(organizationId: string): Promise<ProcurementSupplier[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "SUPPLIER")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          name: n.title || null,
          cnpj: meta.cnpj || null,
          address: meta.address || null,
          representative: meta.representative || null,
          contacts: meta.contacts || null,
        };
      });
  }

  public async getLots(organizationId: string): Promise<ProcurementLot[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "LOT")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          bidId: meta.bidId || null,
          lotNumber: meta.lotNumber || n.title || null,
          value: typeof meta.value === "number" ? meta.value : null,
          winnerSupplierId: meta.winnerSupplierId || null,
        };
      });
  }

  public async getItems(organizationId: string): Promise<ProcurementItem[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "ITEM")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          lotId: meta.lotId || null,
          bidId: meta.bidId || null,
          name: n.title || null,
          description: n.description || null,
          quantity: typeof meta.quantity === "number" ? meta.quantity : null,
          unit: meta.unit || null,
          estimatedValue: typeof meta.estimatedValue === "number" ? meta.estimatedValue : null,
          winningValue: typeof meta.winningValue === "number" ? meta.winningValue : null,
        };
      });
  }

  public async getProposals(organizationId: string): Promise<ProcurementProposal[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "PROPOSAL")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          bidId: meta.bidId || null,
          supplierId: meta.supplierId || null,
          value: typeof meta.value === "number" ? meta.value : null,
          classification: meta.classification || null,
        };
      });
  }

  public async getAwards(organizationId: string): Promise<ProcurementAward[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "AWARD")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          bidId: meta.bidId || null,
          supplierId: meta.supplierId || null,
          value: typeof meta.value === "number" ? meta.value : null,
          date: meta.date || null,
        };
      });
  }

  public async getHomologations(organizationId: string): Promise<ProcurementHomologation[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "HOMOLOGATION")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          bidId: meta.bidId || null,
          date: meta.date || null,
          authority: meta.authority || null,
        };
      });
  }

  public async getPriceRegistries(organizationId: string): Promise<ProcurementPriceRegistry[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "PRICE_REGISTRY")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          bidId: meta.bidId || null,
          number: meta.number || null,
          validity: meta.validity || null,
        };
      });
  }

  public async getProcurementProcesses(organizationId: string): Promise<ProcurementProcess[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "PROCUREMENT_PROCESS")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          number: meta.number || null,
          status: meta.status || null,
        };
      });
  }

  public async getPurchaseRequests(organizationId: string): Promise<ProcurementPurchaseRequest[]> {
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId);
    return nodes
      .filter((n) => n.nodeType === "PURCHASE_REQUEST")
      .map((n) => {
        const meta = n.metadata || {};
        return {
          id: n.id,
          demander: meta.demander || null,
          value: typeof meta.value === "number" ? meta.value : null,
        };
      });
  }
}
