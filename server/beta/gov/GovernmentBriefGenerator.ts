export class GovernmentBriefGenerator {
  public generateBrief(
    entities: any[],
    contracts: any[],
    programs: any[],
    indicators: any[],
    risks: any,
    health: any,
    narrative: string,
    dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY",
  ): string {
    if (dataStatus === "NO_DATA") {
      let welcome = `Resumo Executivo Governamental\n`;
      welcome += `==============================\n\n`;
      welcome += `Ainda não há dados governamentais suficientes para analisar a administração pública.\n\n`;
      welcome += `[Próximos Passos]\n`;
      welcome += `- Envie documentos governamentais como PPA, LOA, contratos, editais ou relatórios para iniciar a análise.\n`;
      return welcome;
    }

    let brief = `Resumo Executivo Governamental\n`;
    brief += `==============================\n\n`;

    if (dataStatus === "PARTIAL_DATA") {
      brief += `[ATENÇÃO: Esta é uma análise parcial baseada apenas nos dados carregados até o momento. O repositório documental e o mapeamento regulatório institucional estão incompletos.]\n\n`;
    } else {
      brief += `[Análise Governamental Completa do Município]\n\n`;
    }

    brief += `[Síntese Administrativa]\n${narrative}\n\n`;

    const scoreDisplay = health.score !== null ? `${health.score}/100` : "Indeterminado";
    brief += `[Saúde Operacional: ${health.status} (${scoreDisplay}) | Risco: ${risks.level} (${risks.score}/100)]\n\n`;

    brief += `Órgãos/Entidades Monitoradas (${entities.length}):\n`;
    if (entities.length === 0) {
      brief += `- Nenhuma entidade mapeada administrativamente.\n`;
    } else {
      entities.forEach((e) => {
        brief += `- ${e.name} (${e.type})\n`;
      });
    }

    brief += `\nContratos Ativos (${contracts.length}):\n`;
    if (contracts.length === 0) {
      brief += `- Nenhum contrato inteligenciado.\n`;
    } else {
      contracts.forEach((c: any) => {
        brief += `- Contrato nº ${c.number || "Sem nº"}: ${c.object || "Sem objeto"} (Valor: ${c.value || "Sem valor"})\n`;
      });
    }

    brief += `\nProgramas e Políticas (${programs.length}):\n`;
    if (programs.length === 0) {
      brief += `- Nenhum programa classificado.\n`;
    } else {
      programs.forEach((p: any) => {
        brief += `- ${p.name}\n`;
      });
    }

    brief += `\nIndicadores Chave (${indicators.length}):\n`;
    if (indicators.length === 0) {
      brief += `- Nenhum indicador registrado.\n`;
    } else {
      indicators.forEach((i) => {
        brief += `- ${i.name}: ${i.value} [${i.status}]\n`;
      });
    }

    brief += `\nRiscos e Pendências Identificadas (${risks.items ? risks.items.length : 0}):\n`;
    const riskItems = risks.items || [];
    if (riskItems.length === 0) {
      brief += `- Nenhum risco identificado no momento.\n`;
    } else {
      riskItems.forEach((r: any) => {
        brief += `- [${r.level}] ${r.description}\n`;
      });
    }

    return brief;
  }
}
