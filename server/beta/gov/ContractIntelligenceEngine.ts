import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export class ContractIntelligenceEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async processContract(
    document: any,
    content: string,
    projectId: string,
    organizationId: string,
  ): Promise<any> {
    const txt = content || "";
    const txtLower = txt.toLowerCase();

    let number: string | null = null;
    let object: string | null = null;
    let contractor: string | null = null;
    let issuer: string | null = null;
    let cnpj: string | null = null;
    let value: string | null = null;
    let validity: string | null = null;
    let signingDate: string | null = null;
    let modality: string | null = null;
    let biddingProcess: string | null = null;

    // 1. Extract Number
    const numMatch = txt.match(/contrato\s*(?:nº|n\.º|no|numero|n\s*)\s*([\w\.\-/]+)/i);
    if (numMatch) {
      number = numMatch[1].trim();
    }

    // 2. Extract CNPJ
    const cnpjMatch = txt.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    if (cnpjMatch) {
      cnpj = cnpjMatch[1].trim();
    }

    // 3. Extract Value
    const valMatch = txt.match(/(?:valor|r\$)\s*(?:total)?\s*(?:de|:)?\s*r\$\s*([\d\.,]+)/i);
    if (valMatch) {
      value = "R$ " + valMatch[1].trim();
    } else {
      const genericR$ = txt.match(/r\$\s*([\d\.,]+)/i);
      if (genericR$) {
        value = "R$ " + genericR$[1].trim();
      }
    }

    // 4. Extract Object
    if (txtLower.includes("objeto:")) {
      const idx = txtLower.indexOf("objeto:");
      const endLineIdx = txt.indexOf("\n", idx);
      const limit = endLineIdx !== -1 ? endLineIdx : idx + 100;
      object = txt.substring(idx + 7, limit).trim();
    } else {
      const objMatch = txt.match(/objeto\s*do\s*contrato\s*:\s*([^\n\.]+)/i);
      if (objMatch) {
        object = objMatch[1].trim();
      }
    }

    // 5. Extract Contractor
    if (txtLower.includes("contratada:")) {
      const idx = txtLower.indexOf("contratada:");
      const endLineIdx = txt.indexOf("\n", idx);
      contractor = txt.substring(idx + 11, endLineIdx !== -1 ? endLineIdx : idx + 80).trim();
    } else if (txtLower.includes("contratado:")) {
      const idx = txtLower.indexOf("contratado:");
      const endLineIdx = txt.indexOf("\n", idx);
      contractor = txt.substring(idx + 11, endLineIdx !== -1 ? endLineIdx : idx + 80).trim();
    }

    // 6. Extract Issuer (Contratante)
    if (txtLower.includes("contratante:")) {
      const idx = txtLower.indexOf("contratante:");
      const endLineIdx = txt.indexOf("\n", idx);
      issuer = txt.substring(idx + 12, endLineIdx !== -1 ? endLineIdx : idx + 80).trim();
    }

    // 7. Extract Validity
    const vigMatch = txt.match(/(?:vigência|vigencia|prazo)\s*(?:de|:)?\s*([^\n\.]+)/i);
    if (vigMatch) {
      validity = vigMatch[1].trim();
    }

    // 8. Extract Signing Date
    const signMatch = txt.match(/(?:data\s*de\s*assinatura|assinado\s*em)\s*(?:de|:)?\s*([^\n\.]+)/i);
    if (signMatch) {
      signingDate = signMatch[1].trim();
    } else {
      const dateMatch = txt.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        signingDate = dateMatch[1].trim();
      }
    }

    // 9. Modality and Bidding Process
    if (txtLower.includes("pregão") || txtLower.includes("pregao")) {
      modality = "Pregão";
    } else if (txtLower.includes("concorrência") || txtLower.includes("concorrencia")) {
      modality = "Concorrência Pública";
    } else if (txtLower.includes("dispensa")) {
      modality = "Dispensa de Licitação";
    }

    const procMatch = txt.match(/(?:processo|processo\s*licitatório)\s*(?:nº|n\.º|no|:)?\s*([\w\.\-/]+)/i);
    if (procMatch) {
      biddingProcess = procMatch[1].trim();
    }

    const contractData = {
      id: `ctt_${Math.random().toString(36).substring(7)}`,
      number,
      object,
      contractor,
      issuer,
      value,
      cnpj,
      validity,
      signingDate,
      modality,
      biddingProcess,
      documentId: document.id,
    };

    await this.kgEngine.ensureNode(
      organizationId,
      projectId,
      "CONTRACT",
      number ? `Contrato nº ${number}` : "Campo não identificado no documento.",
      object || "Campo não identificado no documento.",
      contractData.id,
      contractData,
    );
    await this.kgEngine.createRelationship(
      organizationId,
      contractData.id,
      document.id,
      "GENERATED_FROM",
    );

    return contractData;
  }
}
