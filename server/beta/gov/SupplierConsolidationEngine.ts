import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class SupplierConsolidationEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async consolidateSuppliers(organizationId: string, workspaceId?: string): Promise<any> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, undefined, actualWorkspaceId);
    const suppliers = nodes.filter(n => n.nodeType === "SUPPLIER");

    if (suppliers.length <= 1) {
      return { consolidated: 0, total: suppliers.length };
    }

    // Helper to normalize supplier name
    const normalizeName = (name: string): string => {
      return (name || "")
        .toLowerCase()
        .replace(/\b(?:ltda|s\/a|s\.a\.|eireli|me|epp|s\/a\s+me|ltda\s+epp|ltda\s+me|empresa|grupo)\b/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
    };

    // Grouping
    const groups: { [key: string]: any[] } = {};

    suppliers.forEach(supp => {
      const meta = supp.metadata || {};
      const cnpj = meta.cnpj ? meta.cnpj.replace(/[^\d]/g, "") : null;
      const key = cnpj && cnpj.length === 14 ? `cnpj_${cnpj}` : `name_${normalizeName(supp.title)}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(supp);
    });

    let consolidatedAny = 0;

    for (const key of Object.keys(groups)) {
      const groupList = groups[key];
      if (groupList.length <= 1) continue;

      // Select primary node (one with CNPJ, or richest metadata, or first created)
      groupList.sort((a, b) => {
        const aMeta = a.metadata || {};
        const bMeta = b.metadata || {};
        const aHasCnpj = aMeta.cnpj ? 1 : 0;
        const bHasCnpj = bMeta.cnpj ? 1 : 0;
        if (aHasCnpj !== bHasCnpj) return bHasCnpj - aHasCnpj;

        const aFieldsCount = Object.values(aMeta).filter(Boolean).length;
        const bFieldsCount = Object.values(bMeta).filter(Boolean).length;
        return bFieldsCount - aFieldsCount;
      });

      const primary = groupList[0];
      const secondaries = groupList.slice(1);

      // Merge metadata into primary
      const primaryMeta = { ...(primary.metadata || {}) };
      
      secondaries.forEach(sec => {
        const secMeta = sec.metadata || {};
        Object.keys(secMeta).forEach(metaKey => {
          if (!primaryMeta[metaKey] && secMeta[metaKey]) {
            primaryMeta[metaKey] = secMeta[metaKey];
          }
        });
      });

      // Avoid duplication of sourceDocs
      const sourceDocs = new Set<string>();
      if (primaryMeta.sourceDoc) sourceDocs.add(primaryMeta.sourceDoc);
      secondaries.forEach(sec => {
        const secMeta = sec.metadata || {};
        if (secMeta.sourceDoc) sourceDocs.add(secMeta.sourceDoc);
      });
      primaryMeta.sourceDoc = Array.from(sourceDocs).join(", ");

      // Update primary node
      await this.dbAdapter.updateKnowledgeNode(primary.id, {
        metadata: primaryMeta,
      });

      // Rewire and delete secondaries
      const relations = await this.dbAdapter.getKnowledgeRelations(organizationId, actualWorkspaceId);

      for (const sec of secondaries) {
        // Rewrite existing relations
        const touchRelations = relations.filter(r => r.sourceNodeId === sec.id || r.targetNodeId === sec.id);
        
        for (const rel of touchRelations) {
          // Delete old relation
          await this.dbAdapter.deleteKnowledgeRelation(rel.id);

          const newSourceId = rel.sourceNodeId === sec.id ? primary.id : rel.sourceNodeId;
          const newTargetId = rel.targetNodeId === sec.id ? primary.id : rel.targetNodeId;

          // Re-create with primary
          await this.kgEngine.createRelationship(
            organizationId,
            newSourceId,
            newTargetId,
            rel.relationType,
            actualWorkspaceId
          );
        }

        // Delete secondary node
        await this.dbAdapter.deleteKnowledgeNode(sec.id);
        consolidatedAny++;
      }
    }

    return { consolidated: consolidatedAny, total: suppliers.length };
  }
}
