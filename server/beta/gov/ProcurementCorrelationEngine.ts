import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ProcurementCorrelationEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async correlateProcess(organizationId: string, projectId?: string, workspaceId?: string): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, projectId, actualWorkspaceId);

    const notices = nodes.filter(n => n.nodeType === "NOTICE" || n.nodeType === "BID");
    const proposals = nodes.filter(n => n.nodeType === "PROPOSAL");
    const judgments = nodes.filter(n => n.nodeType === "JULGAMENTO");
    const homologations = nodes.filter(n => n.nodeType === "HOMOLOGATION");
    const contracts = nodes.filter(n => n.nodeType === "CONTRACT");
    const priceRegistries = nodes.filter(n => n.nodeType === "PRICE_REGISTRY");
    const atas = nodes.filter(n => n.nodeType === "ATA");

    let numCorrelations = 0;

    // 1. EDITAL (NOTICE) -> PROPOSAL (SUBMITTED_BY, GENERATED_FROM or RELATED_TO)
    for (const notice of notices) {
      for (const prop of proposals) {
        await this.kgEngine.createRelationship(organizationId, prop.id, notice.id, "GENERATED_FROM");
        numCorrelations++;
      }
    }

    // 2. PROPOSAL -> JULGAMENTO
    for (const prop of proposals) {
      for (const judgment of judgments) {
        await this.kgEngine.createRelationship(organizationId, judgment.id, prop.id, "REFERENCES");
        numCorrelations++;
      }
    }

    // 3. JULGAMENTO -> HOMOLOGAÇÃO
    for (const judgment of judgments) {
      for (const hom of homologations) {
        await this.kgEngine.createRelationship(organizationId, hom.id, judgment.id, "RESULTED_IN");
        numCorrelations++;
      }
    }

    // 4. HOMOLOGAÇÃO -> CONTRATO / ATA / PRICE_REGISTRY
    for (const hom of homologations) {
      for (const contract of contracts) {
        await this.kgEngine.createRelationship(organizationId, contract.id, hom.id, "GENERATED_FROM");
        numCorrelations++;
      }
      for (const arp of priceRegistries) {
        await this.kgEngine.createRelationship(organizationId, arp.id, hom.id, "GENERATED_FROM");
        numCorrelations++;
      }
      for (const ata of atas) {
        await this.kgEngine.createRelationship(organizationId, ata.id, hom.id, "GENERATED_FROM");
        numCorrelations++;
      }
    }

    return { success: true, correlatedRelations: numCorrelations };
  }
}
