export class GovernmentDocumentClassifier {
  public classifyDocument(filename: string, content: string): string {
    const lowerName = filename.toLowerCase();
    const txt = content ? content.toLowerCase() : "";

    if (
      lowerName.includes("edital") ||
      txt.includes("aviso de licitação") ||
      txt.includes("tomada de preços") ||
      txt.includes("concorrência pública")
    )
      return "EDITAL";

    if (
      lowerName.includes("contrato") ||
      (txt.includes("termo de contrato") &&
        txt.includes("contratante") &&
        txt.includes("contratada"))
    )
      return "CONTRATO";

    if (
      lowerName.includes("aditivo") ||
      (txt.includes("termo aditivo") && txt.includes("cláusula"))
    )
      return "TERMO_ADITIVO";

    if (
      lowerName.includes("ata") ||
      txt.includes("ata de registro de preços") ||
      txt.includes("ata da sessão")
    )
      return "ATA_REGISTRO";

    if (
      lowerName.includes("conve") ||
      lowerName.includes("convê") ||
      txt.includes("termo de convênio")
    )
      return "CONVENIO";

    if (
      lowerName.includes("plano_de_governo") ||
      txt.includes("plano de governo") ||
      txt.includes("diretrizes de governo")
    )
      return "PLANO_GOVERNO";

    if (
      lowerName.includes("ppa") ||
      txt.includes("plano plurianual") ||
      txt.includes("plano plurianual de ação")
    )
      return "PPA";

    if (
      lowerName.includes("ldo") ||
      txt.includes("lei de diretrizes orçamentárias")
    )
      return "LDO";

    if (lowerName.includes("loa") || txt.includes("lei orçamentária anual"))
      return "LOA";

    if (
      lowerName.includes("parecer") ||
      txt.includes("parecer jurídico") ||
      txt.includes("parecer técnico")
    )
      return "PARECER";

    if (
      lowerName.includes("relatório") ||
      lowerName.includes("relatorio") ||
      txt.includes("relatório técnico") ||
      txt.includes("relatório final")
    )
      return "RELATORIO_TECNICO";

    if (
      lowerName.includes("decreto") ||
      txt.includes("decreta:") ||
      txt.includes("o prefeito municipal")
    )
      return "DECRETO";

    if (
      lowerName.includes("portaria") ||
      txt.includes("resolve:") ||
      txt.includes("portaria nº")
    )
      return "PORTARIA";

    if (
      lowerName.includes("ofício") ||
      lowerName.includes("oficio") ||
      txt.includes("ofício nº")
    )
      return "OFICIO";

    if (
      lowerName.includes("projeto_de_lei") ||
      txt.includes("projeto de lei") ||
      txt.includes("a câmara municipal aprova:")
    )
      return "PROJETO_LEI";

    if (
      lowerName.includes("lei_municipal") ||
      txt.includes("lei municipal") ||
      txt.includes("promulgo a seguinte lei:")
    )
      return "LEI_MUNICIPAL";

    return "DOCUMENTO_GERAL";
  }
}
