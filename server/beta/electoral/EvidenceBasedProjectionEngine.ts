import { HistoricalElectoralAggregateEngine } from "./HistoricalElectoralAggregateEngine";

export class EvidenceBasedProjectionEngine {
  constructor(private aggregateEngine: HistoricalElectoralAggregateEngine) {}

  public async getProjection(organizationId: string, filter: any): Promise<any> {
    const limit = filter?.limit ? Number(filter.limit) : 5000;
    const data = await this.aggregateEngine.getCandidateSummary(organizationId, { ...filter, limit });
    
    const coverageInfo = { limitUsed: limit, isTruncated: data.length === limit };
    const warnings: string[] = [];
    if (coverageInfo.isTruncated) {
       warnings.push(`Warning: Data truncated to ${limit} records. Analysis may be incomplete.`);
    }

    if (!data || data.length === 0) {
      return { 
        dataStatus: "NO_DATA", 
        calculationMethod: "Crescimento Absoluto Médio Histórico (Requer >= 2 pleitos passados).", 
        evidenceSources: [], 
        warnings, 
        coverageInfo, 
        result: { projections: [] } 
      };
    }

    // FÓRMULA DE PROJEÇÃO BASEADA EM EVIDÊNCIAS:
    // Requer histórico de pelo menos 2 eleições do mesmo candidato no mesmo cargo.
    // Crescimento Médio (CM) = Média das taxas de crescimento absolutas históricas.
    // Projection Value = Última Votação + CM
    // Confidence Score = 
    //   - Alto (85): >= 3 pleitos históricos
    //   - Médio (60): 2 pleitos históricos
    // Se houver apenas 1 dado no histórico, Projection Value = null, Retorno PARTIAL_DATA

    // Grouping records by candidate
    const candidateData: Record<string, any[]> = {};
    for (const r of data) {
       const cd = r.candidato ? String(r.candidato).toUpperCase().trim() : "UNKNOWN";
       if (!candidateData[cd]) candidateData[cd] = [];
       candidateData[cd].push({ anoEleitoral: Number(r.anoEleitoral), totalVotos: Number(r.totalVotos) });
    }

    const projections = [];
    let engineDataStatus = "READY";
    const evidenceSources: any[] = [];

    for (const [candidate, history] of Object.entries(candidateData)) {
       history.sort((a, b) => a.anoEleitoral - b.anoEleitoral);
       
       let previousVotes = 0;
       const growthRates = [];
       
       for (let i = 0; i < history.length; i++) {
           const current = history[i].totalVotos;
           if (i > 0) {
              const diff = current - previousVotes;
              growthRates.push(diff);
           }
           previousVotes = current;
           evidenceSources.push({ ano: history[i].anoEleitoral, candidato: candidate, votos: current });
       }

       const lastVote = history[history.length - 1].totalVotos;
       const nextYear = history[history.length - 1].anoEleitoral + 4; // Usual election cycle

       let projectionValue: number | null = null;
       let confidenceScore: number | null = null;
       let isProjectionValid = false;
       
       if (history.length >= 2) {
           const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
           projectionValue = Math.max(0, lastVote + avgGrowth); // Não projetar voto negativo
           
           if (history.length >= 3) {
               confidenceScore = 85; // High
           } else if (history.length === 2) {
               confidenceScore = 60; // Medium
           }
           isProjectionValid = true;
       } else {
           warnings.push(`Candidato ${candidate} possui apenas 1 ciclo histórico. Projeção ignorada.`);
           engineDataStatus = "PARTIAL_DATA";
       }

       projections.push({
          candidato: candidate,
          calculationMethod: "AVERAGE_HISTORICAL_ABSOLUTE_GROWTH",
          evidenceSources: history.map(h => ({ ano: h.anoEleitoral, votos: h.totalVotos })),
          projectionForYear: nextYear,
          projectionValue: projectionValue !== null ? Math.round(projectionValue) : null,
          confidenceScore,
          isProjectionValid
       });
    }

    if (coverageInfo.isTruncated && engineDataStatus !== "NO_DATA") {
       engineDataStatus = "PARTIAL_DATA";
    }

    // Sort by projected value descending, nulls last
    projections.sort((a, b) => {
       if (a.projectionValue === null && b.projectionValue === null) return 0;
       if (a.projectionValue === null) return 1;
       if (b.projectionValue === null) return -1;
       return b.projectionValue - a.projectionValue;
    });

    return {
      dataStatus: engineDataStatus,
      calculationMethod: "Crescimento Absoluto Médio Histórico (Requer >= 2 pleitos passados). Projection Value = Última Votação + Crescimento Médio.",
      evidenceSources,
      warnings,
      coverageInfo,
      result: {
        projections
      }
    };
  }
}
