export interface DocumentClassificationResult {
  documentType: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export class ProcurementDocumentClassifier {
  public classifyDocument(filename: string, content: string): DocumentClassificationResult {
    const lowerName = filename.toLowerCase();
    const txt = content ? content.toLowerCase() : "";

    // Check specific sections, headers, and structural clues
    const hasHeader = (terms: string[]) => terms.some(t => txt.includes(t));
    
    // ESTUDO TÉCNICO PRELIMINAR (ETP)
    if (
      lowerName.includes("estudo técnico preliminar") ||
      lowerName.includes("estudo_tecnico_preliminar") ||
      lowerName.includes("etp")
    ) {
      return { documentType: "ESTUDO TÉCNICO PRELIMINAR", confidence: "HIGH" };
    }
    if (
      hasHeader(["estudo técnico preliminar", "diretrizes do certame", "viabilidade da contratação", "planejamento da contratação"]) && 
      hasHeader(["descrição da necessidade", "requisitos da contratação"])
    ) {
      return { documentType: "ESTUDO TÉCNICO PRELIMINAR", confidence: "MEDIUM" };
    }

    // TERMO DE REFERÊNCIA
    if (
      lowerName.includes("termo de referência") ||
      lowerName.includes("termo_de_referencia") ||
      lowerName.includes("tr_") ||
      lowerName.includes("projeto básico")
    ) {
      return { documentType: "TERMO DE REFERÊNCIA", confidence: "HIGH" };
    }
    if (
      hasHeader(["termo de referência", "projeto básico", "do objeto da contratação", "especificações técnicas", "obrigações da contratante", "obrigações da contratada"]) &&
      hasHeader(["justificativa", "método de fornecimento"])
    ) {
      return { documentType: "TERMO DE REFERÊNCIA", confidence: "MEDIUM" };
    }

    // ATA DE REGISTRO DE PREÇOS
    if (
      lowerName.includes("arp") ||
      lowerName.includes("ata de registro de preço") ||
      lowerName.includes("ata de registro de preco") ||
      lowerName.includes("ata_de_registro")
    ) {
      return { documentType: "ATA DE REGISTRO DE PREÇOS", confidence: "HIGH" };
    }
    if (
      hasHeader(["ata de registro de preços", "ata de registro de preço"]) &&
      hasHeader(["compromisso de fornecimento", "orgao gerenciador", "validade do registro"])
    ) {
      return { documentType: "ATA DE REGISTRO DE PREÇOS", confidence: "MEDIUM" };
    }

    // JULGAMENTO
    if (
      lowerName.includes("julgamento") ||
      lowerName.includes("resultado da licitação") ||
      lowerName.includes("ata de julgamento")
    ) {
      return { documentType: "JULGAMENTO", confidence: "HIGH" };
    }
    if (
      hasHeader(["ata de julgamento", "resultado do julgamento", "termo de julgamento", "propostas classificadas", "critério de julgamento", "decisão da comissão", "classificação das propostas"])
    ) {
      return { documentType: "JULGAMENTO", confidence: "MEDIUM" };
    }

    // HOMOLOGAÇÃO
    if (
      lowerName.includes("homologacao") ||
      lowerName.includes("homologação")
    ) {
      return { documentType: "HOMOLOGAÇÃO", confidence: "HIGH" };
    }
    if (
      hasHeader(["termo de homologação", "homologo o certame", "homologação da licitação", "homologado"]) &&
      hasHeader(["autoridade competente", "deliberação"])
    ) {
      return { documentType: "HOMOLOGAÇÃO", confidence: "MEDIUM" };
    }

    // ADJUDICAÇÃO
    if (
      lowerName.includes("adjudicacao") ||
      lowerName.includes("adjudicação")
    ) {
      return { documentType: "ADJUDICAÇÃO", confidence: "HIGH" };
    }
    if (
      hasHeader(["termo de adjudicação", "adjudico o objeto", "adjudicação da licitação", "adjudicado"]) &&
      hasHeader(["fornecedor vencedor", "lote adjudicado"])
    ) {
      return { documentType: "ADJUDICAÇÃO", confidence: "MEDIUM" };
    }

    // EDITAL
    if (
      lowerName.includes("edital") ||
      lowerName.includes("aviso de licitação")
    ) {
      return { documentType: "EDITAL", confidence: "HIGH" };
    }
    if (
      hasHeader(["edital de licitação", "aviso de licitação", "processo licitatório", "pregão eletrônico", "tomada de preços", "concorrência pública", "carta convite"]) &&
      hasHeader(["preâmbulo", "das condições de participação", "do credenciamento", "da apresentação das propostas"])
    ) {
      return { documentType: "EDITAL", confidence: "MEDIUM" };
    }

    // PROPOSTA
    if (
      lowerName.includes("proposta") ||
      lowerName.includes("cotação") ||
      lowerName.includes("cotacao")
    ) {
      return { documentType: "PROPOSTA", confidence: "HIGH" };
    }
    if (
      hasHeader(["proposta de preços", "proposta comercial", "proposta financeira", "planilha de custos", "declaração de conformidade"]) &&
      hasHeader(["validade da proposta", "prazo de entrega"])
    ) {
      return { documentType: "PROPOSTA", confidence: "MEDIUM" };
    }

    // PARECER
    if (
      lowerName.includes("parecer") ||
      lowerName.includes("nota técnica") ||
      lowerName.includes("opinamos")
    ) {
      return { documentType: "PARECER", confidence: "HIGH" };
    }
    if (
      hasHeader(["parecer jurídico", "parecer técnico", "nota técnica", "comissão de licitação", "opinamos pelo", "recomenda-se"]) &&
      hasHeader(["fundamentação", "conclusão"])
    ) {
      return { documentType: "PARECER", confidence: "MEDIUM" };
    }

    // CONTRATO
    if (
      lowerName.includes("contrato") ||
      lowerName.includes("termo de contrato")
    ) {
      return { documentType: "CONTRATO", confidence: "HIGH" };
    }
    if (
      hasHeader(["termo de contrato", "instrumento de contrato", "contratante", "contratada"]) &&
      hasHeader(["cláusula primeira", "do objeto", "da vigência", "do valor"])
    ) {
      return { documentType: "CONTRATO", confidence: "MEDIUM" };
    }

    // ANEXO TÉCNICO
    if (
      lowerName.includes("anexo técnico") ||
      lowerName.includes("anexo_tecnico") ||
      lowerName.includes("memorial descritivo") ||
      lowerName.includes("especificacao")
    ) {
      return { documentType: "ANEXO TÉCNICO", confidence: "HIGH" };
    }
    if (
      hasHeader(["anexo técnico", "memorial descritivo", "especificações detalhadas", "detalhamento dos itens", "cronograma físico-financeiro"])
    ) {
      return { documentType: "ANEXO TÉCNICO", confidence: "MEDIUM" };
    }

    // ATA
    if (
      lowerName.includes("ata")
    ) {
      return { documentType: "ATA", confidence: "HIGH" };
    }
    if (
      hasHeader(["ata de reunião", "ata da sessão", "presente ata"]) &&
      hasHeader(["abertura dos trabalhos", "membros da comissão", "encerramento"])
    ) {
      return { documentType: "ATA", confidence: "MEDIUM" };
    }

    return { documentType: null, confidence: "LOW" };
  }
}
