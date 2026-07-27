import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class GovernmentKnowledgeQueryService {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async getGovNodes(organizationId: string, types: string[], workspaceId?: string): Promise<any[]> {
    try {
      const actualWorkspaceId = workspaceId || "default-workspace";
      const allNodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, actualWorkspaceId);
      return allNodes.filter(node => types.includes(node.nodeType));
    } catch (e) {
      console.error("Error in getGovNodes:", e);
      return [];
    }
  }

  public async getGovRelations(organizationId: string, types?: string[], workspaceId?: string): Promise<any[]> {
    try {
      const actualWorkspaceId = workspaceId || "default-workspace";
      const allRelations = await this.dbAdapter.getKnowledgeRelations(organizationId, actualWorkspaceId);
      if (types) {
        return allRelations.filter(rel => types.includes(rel.relationType));
      }
      return allRelations;
    } catch (e) {
      console.error("Error in getGovRelations:", e);
      return [];
    }
  }

  public async getEntities(organizationId: string, workspaceId?: string): Promise<any[]> {
    const nodes = await this.getGovNodes(organizationId, ["GOVERNMENT_ENTITY"], workspaceId);
    return nodes.map(node => ({
      id: node.id,
      name: node.title,
      type: node.nodeType,
      description: node.description,
      metadata: node.metadata || {}
    }));
  }

  public async getContracts(organizationId: string, workspaceId?: string): Promise<any[]> {
    const nodes = await this.getGovNodes(organizationId, ["CONTRACT"], workspaceId);
    return nodes.map(node => {
      const meta = node.metadata || {};
      const titleCleaned = node.title && !node.title.includes("Contrato Extraído") ? node.title : null;
      const descCleaned = node.description && !node.description.includes("Objeto não especificado") ? node.description : null;
      return {
        id: node.id,
        number: meta.number || titleCleaned || null,
        object: meta.object || descCleaned || null,
        contractor: meta.contractor || null,
        issuer: meta.issuer || null,
        value: meta.value || null,
        validity: meta.validity || null,
        signingDate: meta.signingDate || null,
        modality: meta.modality || null,
        biddingProcess: meta.biddingProcess || null,
        cnpj: meta.cnpj || null
      };
    });
  }

  public async getBids(organizationId: string, workspaceId?: string): Promise<any[]> {
    const nodes = await this.getGovNodes(organizationId, ["BID"], workspaceId);
    return nodes.map(node => {
      const meta = node.metadata || {};
      const titleCleaned = node.title && !node.title.includes("Extraída") && !node.title.includes("Licitação") ? node.title : null;
      const descCleaned = node.description && !node.description.includes("Objeto licitatório") ? node.description : null;
      return {
        id: node.id,
        number: meta.number || titleCleaned || null,
        modality: meta.modality || null,
        object: meta.object || descCleaned || null,
        responsibleEntity: meta.responsibleEntity || null,
        openingDate: meta.openingDate || null,
        estimatedValue: meta.estimatedValue || null,
        judgmentCriteria: meta.judgmentCriteria || null
      };
    });
  }

  public async getPrograms(organizationId: string, workspaceId?: string): Promise<any[]> {
    const nodes = await this.getGovNodes(organizationId, ["PROGRAM"], workspaceId);
    return nodes.map(node => {
      const nameCleaned = node.title && !node.title.includes("Programa Governamental Extraído") ? node.title : null;
      return {
        id: node.id,
        name: nameCleaned,
        description: node.description || null,
        metadata: node.metadata || {}
      };
    });
  }

  public async getIndicators(organizationId: string, workspaceId?: string): Promise<any[]> {
    const nodes = await this.getGovNodes(organizationId, ["INDICATOR"], workspaceId);
    return nodes.map(node => ({
      id: node.id,
      name: node.title,
      value: node.metadata?.value || null,
      status: node.metadata?.status || "PENDING",
      metadata: node.metadata || {}
    }));
  }
}
