import { HistoricalElectoralAggregateEngine } from "./HistoricalElectoralAggregateEngine";

export class PriorityRankingEngine {
  constructor(private aggregateEngine: HistoricalElectoralAggregateEngine) {}

  public async getPriorityRanking(organizationId: string, filter: any): Promise<any> {
    const limit = filter?.limit ? Number(filter.limit) : 5000;
    // Retrieves location summary to determine priority territories
    const data = await this.aggregateEngine.getLocationSummary(organizationId, { ...filter, limit });

    const coverageInfo = { limitUsed: limit, isTruncated: data.length === limit };
    const warnings = [];
    if (coverageInfo.isTruncated) {
       warnings.push(`Warning: Data truncated to ${limit} records. Analysis may be incomplete.`);
    }

    if (!data || data.length === 0) {
      return { 
        dataStatus: "NO_DATA", 
        calculationMethod: "Ranking calculado por quartis com base na distribuição real de votos.", 
        evidenceSources: [], 
        warnings, 
        coverageInfo, 
        result: [] 
      };
    }

    let totalGlobalVotes = 0;
    const locations: Array<any> = [];
    const evidenceSources = [];

    for (const row of data) {
       const v = Number(row.totalVotos) || 0;
       totalGlobalVotes += v;
       locations.push({
         localVotacao: row.localVotacao,
         municipio: row.municipio,
         totalVotos: v
       });
       evidenceSources.push({ local: row.localVotacao, municipio: row.municipio, votos: v });
    }

    // Sort by votes ascending to calculate quartiles
    locations.sort((a, b) => a.totalVotos - b.totalVotos);

    // Calculate quartiles
    const n = locations.length;
    let q1 = 0, q3 = 0;
    if (n > 0) {
      q1 = locations[Math.floor(n * 0.25)]?.totalVotos || 0;
      q3 = locations[Math.floor(n * 0.75)]?.totalVotos || 0;
    }

    const averageVotes = locations.length > 0 ? totalGlobalVotes / locations.length : 0;

    const rankedLocations = locations.map(loc => {
       // Q4 = ALTA (>= Q3)
       // Q2/Q3 = MÉDIA (>= Q1 and < Q3)
       // Q1 = BAIXA (< Q1)
       let priorityLevel = "BAIXA";
       if (loc.totalVotos >= q3) {
          priorityLevel = "ALTA";
       } else if (loc.totalVotos >= q1) {
          priorityLevel = "MÉDIA";
       }

       return {
         ...loc,
         priorityLevel,
         deviationFromAverage: averageVotes > 0 ? parseFloat(((loc.totalVotos - averageVotes) / averageVotes * 100).toFixed(2)) : 0
       };
    });

    // Ordenar de maior prioridade e votos para menor para o retorno
    rankedLocations.sort((a, b) => b.totalVotos - a.totalVotos);

    return {
      dataStatus: coverageInfo.isTruncated ? "PARTIAL_DATA" : "READY",
      calculationMethod: "Ranking calculado por quartis com base na distribuição real de votos por local de votação. Q4 (>=Q3) = ALTA, Q2/Q3 = MÉDIA, Q1 (<Q1) = BAIXA.",
      evidenceSources,
      warnings,
      coverageInfo,
      result: {
        rankings: rankedLocations,
        metrics: {
           totalGlobalVotes,
           averageVotes: parseFloat(averageVotes.toFixed(2)),
           q1,
           q3
        }
      }
    };
  }
}
