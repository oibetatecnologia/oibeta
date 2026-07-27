import { HistoricalElectoralAggregateEngine } from "./HistoricalElectoralAggregateEngine";

export class HistoricalAnalysisEngine {
  constructor(private aggregateEngine: HistoricalElectoralAggregateEngine) {}

  public async getHistoricalEvolution(organizationId: string, filter: any): Promise<any> {
    const limit = filter?.limit ? Number(filter.limit) : 5000;
    const data = await this.aggregateEngine.getCandidateSummary(organizationId, { ...filter, limit });
    
    const coverageInfo = { limitUsed: limit, isTruncated: data.length === limit };
    const warnings = [];
    if (coverageInfo.isTruncated) {
       warnings.push(`Warning: Data truncated to ${limit} records. Analysis may be incomplete.`);
    }

    if (!data || data.length === 0) {
      return { 
        dataStatus: "NO_DATA", 
        calculationMethod: "Crescimento Absoluto = Votos Ano - Votos Anterior; Percentual = Absoluto / Anterior", 
        evidenceSources: [], 
        warnings, 
        coverageInfo, 
        result: [] 
      };
    }

    // Grouping data by candidate -> year
    const candidateHistory: Record<string, any[]> = {};
    for (const row of data) {
      const c = row.candidato ? String(row.candidato).toUpperCase().trim() : "UNKNOWN";
      if (!candidateHistory[c]) candidateHistory[c] = [];
      candidateHistory[c].push(row);
    }

    const evolutionResult = [];
    const evidenceSources = [];

    // FÓRMULA DE CRESCIMENTO:
    // Crescimento Absoluto = Votos (Ano Atual) - Votos (Ano Anterior)
    // Crescimento Percentual = (Crescimento Absoluto / Votos do Ano Anterior) * 100
    for (const [candidate, records] of Object.entries(candidateHistory)) {
      // Sort chronologically
      records.sort((a, b) => Number(a.anoEleitoral) - Number(b.anoEleitoral));
      
      const metrics = [];
      for (let i = 0; i < records.length; i++) {
        const current = records[i];
        const prev = i > 0 ? records[i - 1] : null;

        let absoluteGrowth = null;
        let percentageGrowth = null;

        if (prev) {
           const currVotes = Number(current.totalVotos) || 0;
           const prevVotes = Number(prev.totalVotos) || 0;
           absoluteGrowth = currVotes - prevVotes;
           percentageGrowth = prevVotes > 0 ? (absoluteGrowth / prevVotes) * 100 : null;
        }

        metrics.push({
          anoEleitoral: current.anoEleitoral,
          totalVotos: current.totalVotos,
          absoluteGrowth,
          percentageGrowth: percentageGrowth !== null ? parseFloat(percentageGrowth.toFixed(2)) : null
        });
        
        evidenceSources.push({ ano: current.anoEleitoral, candidato: candidate, votos: current.totalVotos });
      }

      evolutionResult.push({
        candidato: candidate,
        history: metrics,
        uf: records[0]?.uf,
        municipio: records[0]?.municipio,
        cargo: records[0]?.cargo
      });
    }

    return {
      dataStatus: coverageInfo.isTruncated ? "PARTIAL_DATA" : "READY",
      calculationMethod: "Crescimento Absoluto = Votos (Ano Atual) - Votos (Ano Anterior); Crescimento Percentual = (Crescimento Absoluto / Votos do Ano Anterior) * 100",
      evidenceSources,
      warnings,
      coverageInfo,
      result: evolutionResult
    };
  }
}
