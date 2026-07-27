export class GovernmentNarrativeEngine {
  public generateNarrative(
    entities: any[],
    contracts: any[],
    programs: any[],
    indicators: any[],
    risks: any,
    dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY",
  ): string {
    if (dataStatus === "NO_DATA") {
      return "Ainda não há histórico governamental suficiente para gerar uma narrativa administrativa.";
    }

    let narrative = "";

    if (dataStatus === "PARTIAL_DATA") {
      narrative += "Com base nos dados atualmente carregados... ";
    } else {
      narrative += "Relatório Completo: Análise integral do arcabouço administrativo. ";
    }

    // Entities
    if (entities.length > 0) {
      narrative += `Mapeamos e monitoramos ativamente ${entities.length} órgão(s) ou entidade(s) administrativas. `;
    } else {
      narrative += "Nenhum órgão público pôde ser extraído dos documentos até o momento. ";
    }

    // Programs
    if (programs.length > 0) {
      narrative += `Identificamos ${programs.length} programa(s) estratégico(s) de governo ativo(s). `;
    } else {
      narrative += "Não há programas registrados ou identificados em andamento. ";
    }

    // Contracts
    if (contracts.length > 0) {
      narrative += `Nossos motores identificaram ${contracts.length} contrato(s) formalizado(s). `;
    } else {
      narrative += "Não foram coligidos registros de contratos válidos nesta amostra. ";
    }

    // Risks & Warnings
    if (risks && risks.items && risks.items.length > 0) {
      narrative += `A avaliação de risco geral é de grau ${risks.level || "LOW"} com score de ${risks.score || 0}/100. `;
      
      const criticals = risks.items.filter((r: any) => r.level === "CRITICAL" || r.level === "HIGH");
      if (criticals.length > 0) {
        narrative += `Principais pontos que demandam auditoria regulatória urgente incluem: ${criticals.map((r: any) => r.description).slice(0, 2).join("; ")}. `;
      } else {
        narrative += "As desconformidades mapeadas são de baixa severidade formal. ";
      }
    } else {
      narrative += "Não há riscos formais de conformidade identificados. ";
    }

    // Indicators
    const alertIndicators = indicators.filter((i) => i.status === "CRITICAL" || i.status === "WARNING");
    if (alertIndicators.length > 0) {
      narrative += `Observa-se que ${alertIndicators.length} indicador(es) estratégico(s) encontram-se fora da faixa de conformidade planejada.`;
    } else if (indicators.length > 0) {
      narrative += "Os indicadores de gestão analisados operam dentro das diretrizes estipuladas.";
    }

    return narrative;
  }
}
