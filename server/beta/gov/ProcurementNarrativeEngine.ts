export class ProcurementNarrativeEngine {
  public generateNarrative(
    bids: any[],
    notices: any[],
    suppliers: any[],
    lots: any[],
    proposals: any[],
    homologations: any[],
    risks: any,
    dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY"
  ): string {
    if (dataStatus === "NO_DATA") {
      return "Ainda não há histórico suficiente de compras públicas para gerar uma narrativa.";
    }

    let narrative = "";

    // 1. SITUAÇÃO ATUAL
    if (dataStatus === "PARTIAL_DATA") {
      narrative += "### 1. SITUAÇÃO ATUAL\nCom base nos dados atualmente carregados, realizamos uma análise preliminar baseada apenas em informações parciais. ";
    } else {
      narrative += "### 1. SITUAÇÃO ATUAL\nAnálise baseada nos dados de compras públicas disponíveis. ";
    }

    if (bids.length > 0) {
      narrative += `Até o momento, mapeamos ${bids.length} certame(s) licitatório(s) ativo(s) com a publicação de ${notices.length} edital(is) regulador(es) correspondente(s). `;
      if (homologations.length > 0) {
        narrative += `O processo licitatório alcançou as fases finais de encerramento jurídico, com ${homologations.length} termo(s) de homologação assinado(s) e validado(s) oficialmente pela autoridade administrativa competente. `;
      } else {
        narrative += "Não foram identificados termos de homologação assinados, indicando que os processos ainda estão sob fase interna ou em fase externa pendente de homologação formal. ";
      }
    } else {
      narrative += "Nenhum certame licitatório ou edital de compras pôde ser extraído e indexado até o momento. ";
    }

    // 2. PARTICIPANTES
    narrative += "\n\n### 2. PARTICIPAÇÕES E CONCORRÊNCIA\n";
    if (suppliers.length > 0) {
      narrative += `O monitoramento catalogou ${suppliers.length} fornecedor(es) credenciados ou formalmente habilitados. `;
      if (proposals.length > 0) {
        narrative += `Os proponentes registraram um total de ${proposals.length} propostas comerciais de preços nos lotes disputados. `;
      } else {
        narrative += "Verificamos a ausência de propostas comerciais de preços indexadas aos licitantes cadastrados. ";
      }
    } else {
      narrative += "Não há fornecedores ou participantes registrados na base de dados para disputar os lotes. ";
    }

    // 3. VENCEDORES
    narrative += "\n\n### 3. VENCEDORES E ADJUDICAÇÕES\n";
    const winnersList = lots
      .filter((l) => l.metadata?.winnerSupplierId && l.metadata?.winnerSupplierId !== "N/A")
      .map((l) => l.metadata?.winnerSupplierId || l.winnerSupplierId);

    if (winnersList.length > 0) {
      const uniqueWinners = Array.from(new Set(winnersList));
      const formattedWinners = uniqueWinners.map(w => {
        const found = suppliers.find(s => s.id === w);
        return found ? found.title : w;
      });
      narrative += `Os lotes ou itens adjudicados possuem fornecedores vencedores confirmados, com destaque para: ${formattedWinners.join(", ")}. `;
    } else {
      narrative += "Nenhum lote com vencedor homologado ou adjudicado foi identificado. Os itens licitados podem estar pendentes de lances ou classificados como desertos/fracassados. ";
    }

    // 4. RISCOS DE INTEGRIDADE
    narrative += "\n\n### 4. AUDITORIA DE RISCOS\n";
    if (risks && risks.items && risks.items.length > 0) {
      narrative += `A auditoria de integridade e conformidade de licitações apontou um nível de risco classificado como **${risks.level || "MEDIUM"}** (Índice de Risco: ${risks.score || 0}/100) decorrente de ${risks.items.length} desconformidades identificadas. `;
      
      const criticalAlarm = risks.items.filter((r: any) => r.severity === "CRITICAL" || r.severity === "HIGH");
      if (criticalAlarm.length > 0) {
        narrative += `Alertas de alta gravidade necessitam de averiguação imediata: ${criticalAlarm.map((r: any) => r.description).slice(0, 3).join("; ")}. `;
      } else {
        narrative += "Os riscos identificados são de gravidade moderada ou baixa, necessitando de ajustes de conformidade processual sem ameaças imediatas à lisura do certame. ";
      }
    } else {
      narrative += "Nenhum alerta de risco ou desconformidade processual foi detectado pela auditoria administrativa nos arquivos vigentes. ";
    }

    // 5. RECOMENDAÇÕES E PRÓXIMOS PASSOS
    narrative += "\n\n### 5. PRÓXIMOS PASSOS RECOMENDADOS\n";
    narrative += "1. **Auditoria Documental**: Sanear e anexar arquivos em falta, tais como termos de referência ou certidões de regularidade legal.\n";
    narrative += "2. **Mitigação de Monopólio**: Havendo indícios de domínio de mercado ou propostas únicas, realizar verificação concorrencial ou solicitar novas cotações.\n";
    narrative += "3. **Fechamento e Prorrogações**: Homologar lotes desertos ou estender editais de licitações desertas para incentivar a ampla competitividade pública.";

    return narrative;
  }
}
