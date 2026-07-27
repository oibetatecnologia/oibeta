import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class GovernmentEntityExtractor {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async extractFromDocument(
    document: any,
    content: string,
    projectId: string,
    organizationId: string,
  ): Promise<any[]> {
    const txt = content.toLowerCase();
    const entities = [];

    // Simple rule-based entity extraction
    const terms = [
      "secretaria",
      "departamento",
      "fundo",
      "conselho",
      "autarquia",
      "empresa pública",
      "órgão estadual",
      "órgão federal",
      "prefeitura",
      "câmara",
    ];

    for (const term of terms) {
      if (txt.includes(term)) {
        entities.push({
          type: term === "secretaria" ? "SECRETARIAT" : "GOVERNMENT_ENTITY",
          name: term.charAt(0).toUpperCase() + term.slice(1) + " (Inferido)",
          id: `ent_${term}_${Math.random().toString(36).substring(7)}`,
        });
      }
    }

    // Persist to KG
    for (const ent of entities) {
      await this.kgEngine.ensureNode(
        organizationId,
        projectId,
        ent.type,
        ent.name,
        "Entidade extraída automaticamente.",
        ent.id,
        {},
      );
      // Relate document to entity
      await this.kgEngine.createRelationship(
        organizationId,
        document.id,
        ent.id,
        "REFERENCES",
      );
    }

    return entities;
  }
}
