import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class BidIntelligenceEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async processBid(
    document: any,
    content: string,
    projectId: string,
    organizationId: string,
  ): Promise<any> {
    const txt = content || "";
    const txtLower = txt.toLowerCase();

    let modality: string | null = null;
    let number: string | null = null;
    let processNumber: string | null = null;
    let object: string | null = null;
    let responsibleEntity: string | null = null;
    let openingDate: string | null = null;
    let estimatedValue: string | null = null;
    let judgmentCriteria: string | null = null;

    // 1. Identify modality
    if (txtLower.includes("pregão eletrônico") || txtLower.includes("pregao eletronico")) {
      modality = "Pregão Eletrônico";
    } else if (txtLower.includes("pregão presencial") || txtLower.includes("pregao presencial")) {
      modality = "Pregão Presencial";
    } else if (txtLower.includes("tomada de preços") || txtLower.includes("tomada de precos")) {
      modality = "Tomada de Preços";
    } else if (txtLower.includes("concorrência pública") || txtLower.includes("concorrencia publica")) {
      modality = "Concorrência Pública";
    } else if (txtLower.includes("chamamento público") || txtLower.includes("chamamento publico")) {
      modality = "Chamamento Público";
    } else if (txtLower.includes("pregão") || txtLower.includes("pregao")) {
      modality = "Pregão";
    }

    // 2. Extract number
    const numMatch = txt.match(/(?:edital|licitação|licitacao)\s*(?:nº|n\.º|no|numero|n\s*)\s*([\w\.\-/]+)/i);
    if (numMatch) {
      number = numMatch[1].trim();
    }

    // 3. Extract process number
    const procMatch = txt.match(/(?:processo|processo\s*licitatório|processo\s*administrativo)\s*(?:nº|n\.º|no|:)?\s*([\w\.\-/]+)/i);
    if (procMatch) {
      processNumber = procMatch[1].trim();
    }

    // 4. Extract Object
    if (txtLower.includes("objeto:")) {
      const idx = txtLower.indexOf("objeto:");
      const endLineIdx = txt.indexOf("\n", idx);
      object = txt.substring(idx + 7, endLineIdx !== -1 ? endLineIdx : idx + 100).trim();
    } else {
      const objMatch = txt.match(/objeto\s*do\s*edital\s*:\s*([^\n\.]+)/i);
      if (objMatch) {
        object = objMatch[1].trim();
      }
    }

    // 5. Extract responsible entity
    if (txtLower.includes("órgão responsável:") || txtLower.includes("orgao responsavel:")) {
      const idx = txtLower.includes("órgão responsável:") ? txtLower.indexOf("órgão responsável:") : txtLower.indexOf("orgao responsavel:");
      const endLineIdx = txt.indexOf("\n", idx);
      responsibleEntity = txt.substring(idx + 18, endLineIdx !== -1 ? endLineIdx : idx + 80).trim();
    } else if (txtLower.includes("realização:") || txtLower.includes("realizacao:")) {
      const idx = txtLower.includes("realização:") ? txtLower.indexOf("realização:") : txtLower.indexOf("realizacao:");
      const endLineIdx = txt.indexOf("\n", idx);
      responsibleEntity = txt.substring(idx + 11, endLineIdx !== -1 ? endLineIdx : idx + 80).trim();
    }

    // 6. Extract raw date of opening
    const dateMatch = txt.match(/(?:abertura|sessão|data\s*de\s*abertura|realização)\s*(?:em|:|\s)\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
      openingDate = dateMatch[1].trim();
    }

    // 7. Estimated value
    const valMatch = txt.match(/(?:estimado|valor\s*estimado|r\$)\s*(?:total)?\s*(?:de|:)?\s*r\$\s*([\d\.,]+)/i);
    if (valMatch) {
      estimatedValue = "R$ " + valMatch[1].trim();
    }

    // 8. Judgment Criteria
    const critMatch = txt.match(/(?:critério\s*de\s*julgamento|criterio\s*de\s*julgamento|julgamento)\s*(?:de|:)?\s*([^\n\.]+)/i);
    if (critMatch) {
      judgmentCriteria = critMatch[1].trim();
    }

    const bidData = {
      id: `bid_${Math.random().toString(36).substring(7)}`,
      number,
      processNumber,
      modality: modality || null,
      object,
      responsibleEntity,
      openingDate,
      estimatedValue,
      judgmentCriteria,
      documentId: document.id,
    };

    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "BID",
      number ? `Edital/Licitação nº ${number}` : "Campo não identificado no documento.",
      object || "Campo não identificado no documento.",
      bidData.id,
      bidData,
    );
    await this.kgEngine.createRelationship(
      organizationId,
      bidData.id,
      document.id,
      "GENERATED_FROM",
    );

    return bidData;
  }
}
