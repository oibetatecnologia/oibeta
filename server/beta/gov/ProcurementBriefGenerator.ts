export class ProcurementBriefGenerator {
  public generateBrief(
    bids: any[],
    notices: any[],
    suppliers: any[],
    lots: any[],
    proposals: any[],
    homologations: any[],
    risks: any,
    health: any,
    narrative: string,
    dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY",
  ): string {
    if (dataStatus === "NO_DATA") {
      let welcome = `RELATÓRIO EXECUÇÃO E COMPLEMENTO DE LICITAÇÕES\n`;
      welcome += `==============================================\n\n`;
      welcome += `Sem dados suficientes para gerar análise de compras públicas.\n\n`;
      welcome += `[Próximos Passos]\n`;
      welcome += `- Realize o upload de editais, atas de lances, propostas ou homologações.\n`;
      welcome += `- O motor operacional Beta Licita irá processar os arquivos automaticamente e estruturar os relacionamentos.\n`;
      return welcome;
    }

    let brief = `RELATÓRIO DE INTELIGÊNCIA EM COMPRAS PÚBLICAS (BETA LICITA)\n`;
    brief += `==========================================================\n\n`;

    // 1. STATUS DO PROCESSO
    brief += `[1] STATUS DO PROCESSO\n`;
    if (dataStatus === "PARTIAL_DATA") {
      brief += `- Situação dos Dados: Análise parcial baseada nos dados atualmente carregados.\n`;
    } else if (dataStatus === "READY") {
      brief += `- Situação dos Dados: Análise baseada nos dados de compras públicas disponíveis.\n`;
    } else {
      brief += `- Situação dos Dados: Sem dados suficientes para gerar análise de compras públicas.\n`;
    }

    if (bids.length > 0) {
      bids.forEach((b) => {
        const modalityStr = b.metadata?.modality || b.modality || null;
        const responsibleAgency = b.metadata?.responsibleAgency || b.responsibleAgency || null;
        const phaseStr = homologations.length > 0 ? "Homologação identificada nos dados disponíveis." : "Concorrência e análise de propostas.";
        const estValue = b.metadata?.estimatedValue || b.estimatedValue || null;
        const estValueStr = estValue !== null ? `R$ ${Number(estValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Valor estimado não identificado nos dados carregados.";

        brief += `- Certame: Licitação nº ${b.metadata?.number || b.number || b.id}\n`;
        brief += `- Modalidade: ${modalityStr || "Não identificadas nos dados disponíveis"}\n`;
        brief += `- Órgão Licitante: ${responsibleAgency || "Não identificado nos dados disponíveis"}\n`;
        brief += `- Fase Atual: ${phaseStr}\n`;
        brief += `- Valor Estimado: ${estValueStr}\n`;
      });
    } else {
      brief += `- Certame: Não identificado especificamente.\n`;
    }
    brief += `\n`;

    // 2. PARTICIPANTES (COMPETITORS)
    brief += `[2] PARTICIPANTES E LICITANTES CONCORRENTES Mapeados (${suppliers.length})\n`;
    if (suppliers.length === 0) {
      brief += `- Nenhum concorrente extraído ou registrado ainda.\n`;
    } else {
      suppliers.forEach((s) => {
        const sMeta = s.metadata || {};
        const stateStr = sMeta.uf ? ` - ${sMeta.uf}` : "";
        brief += `- Fornecedor: ${s.title} (CNPJ: ${sMeta.cnpj || null}${stateStr})\n`;
      });
    }
    brief += `\n`;

    // 3. VENCEDORES (WINNERS)
    brief += `[3] FORNECEDORES VENCEDORES E ADJUDICADOS\n`;
    const lotWinners = lots.filter((l) => l.metadata?.winnerSupplierId);
    if (lotWinners.length === 0) {
      brief += `- Nenhum vencedor homologado detectado nos lotes.\n`;
    } else {
      lotWinners.forEach((lw) => {
        const lwMeta = lw.metadata || {};
        const winId = lwMeta.winnerSupplierId;
        const matchedSupp = suppliers.find(s => s.id === winId);
        const winName = matchedSupp ? matchedSupp.title : winId;
        const lotVal = lwMeta.value || lw.value || null;
        const lotValStr = lotVal !== null ? `R$ ${Number(lotVal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Valor não identificado";
        brief += `- Lote nº ${lwMeta.lotNumber || lw.lotNumber}: ${lotValStr} adjudicado para "${winName || null}"\n`;
      });
    }
    brief += `\n`;

    // 4. RISCOS (COMPLIANCE RISKS)
    brief += `[4] AUDITORIA DE RISCOS E ALERTAS DE CONFORMIDADE (${risks.items ? risks.items.length : 0})\n`;
    brief += `- Índice de Insegurança: ${risks.score}/100 (Classificação: ${risks.level || "LOW"})\n`;
    brief += `- Índice de Saúde Geral: ${health.score}/100 (Status: ${health.status})\n`;
    
    const riskItems = risks.items || [];
    if (riskItems.length === 0) {
      brief += `- Nenhum risco legal ou administrativo mapeado até o momento.\n`;
    } else {
      riskItems.forEach((r: any) => {
        brief += `- [ALERTA: ${r.severity || "MEDIUM"}] ${r.description} (Impacto Mapeado: ${r.impact})\n`;
      });
    }
    brief += `\n`;

    // 5. ITENS PENDENTES (PENDING ITEMS)
    brief += `[5] ITENS PENDENTES E ARQUIVOS RECOMENDADOS\n`;
    const hasEdital = notices.length > 0;
    const hasHomolog = homologations.length > 0;
    const hasProps = proposals.length > 0;

    if (!hasEdital) {
      brief += `- PENDÊNCIA: Ausência de Edital Regulador publicado no sistema.\n`;
    }
    if (!hasProps) {
      brief += `- PENDÊNCIA: Sem registro de Propostas Comerciais carregadas no certame.\n`;
    }
    if (!hasHomolog) {
      brief += `- PENDÊNCIA: Falta o termo de homologação assinado do certame.\n`;
    }
    if (hasEdital && hasProps && hasHomolog) {
      brief += `- Nenhuma pendência documental estrutural grave detectada.\n`;
    }
    brief += `\n`;

    // 6. PRÓXIMOS PASSOS (RECOMMENDATIONS)
    brief += `[6] PRÓXIMOS PASSOS RECOMENDADOS\n`;
    if (riskItems.length > 0) {
      brief += `- 1. Iniciar verificação de conformidade jurídica para dirimir os alertas de risco.\n`;
    }
    if (!hasHomolog) {
      brief += `- 2. Cobrar ou anexar a ata e homologação final para encerramento jurídico do certame.\n`;
    }
    brief += `- 3. Emitir ordem de serviço ou empenho contratual com base nos itens vencedores descritos.\n`;
    brief += `- 4. Realizar auditoria dos preços homologados em relação ao mercado local para evitar sobrepreço.\n`;

    return brief;
  }
}
