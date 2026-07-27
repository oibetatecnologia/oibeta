import { HistoricalElectoralAggregateEngine } from "./HistoricalElectoralAggregateEngine";

export class StrategicAnalysisEngine {
  constructor(private aggregateEngine: HistoricalElectoralAggregateEngine) {}

  public async getStrategicInsights(organizationId: string, filter: any): Promise<any> {
    const limit = filter?.limit ? Number(filter.limit) : 5000;
    const data = await this.aggregateEngine.getMunicipalitySummary(organizationId, { ...filter, limit });
    
    const coverageInfo = { limitUsed: limit, isTruncated: data.length === limit };
    const warnings: string[] = [];
    if (coverageInfo.isTruncated) {
       warnings.push(`Warning: Data truncated to ${limit} records. Analysis may be incomplete.`);
    }

    if (!data || data.length === 0) {
      return { 
        dataStatus: "NO_DATA", 
        calculationMethod: "Classificação territorial baseada em quartis (Q4 = Strong, Q1 = Weak).", 
        evidenceSources: [], 
        warnings, 
        coverageInfo, 
        result: null 
      };
    }

    // FÓRMULA DE ESTRATÉGIA TERRITORIAL:
    // Identificar concentração territorial no conjunto filtrado por quartis.
    // Zonas de Força = Municípios Q4
    // Zonas de Fraqueza = Municípios Q1
    // Zonas Neutras = Municípios Q2/Q3

    let totalGlobal = 0;
    const munData: any[] = [];
    const evidenceSources: any[] = [];

    for (const row of data) {
       const v = Number(row.totalVotos) || 0;
       totalGlobal += v;
       munData.push({
         municipio: row.municipio,
         totalVotos: v
       });
       evidenceSources.push({ municipio: row.municipio, votos: v });
    }

    // Sort ascending for quartiles
    munData.sort((a, b) => a.totalVotos - b.totalVotos);

    const n = munData.length;
    let q1 = 0, q3 = 0;
    if (n > 0) {
      q1 = munData[Math.floor(n * 0.25)]?.totalVotos || 0;
      q3 = munData[Math.floor(n * 0.75)]?.totalVotos || 0;
    }

    const insights = {
       totalVotesAnalyzed: totalGlobal,
       opportunities: [] as any[],
       risks: [] as any[],
       strongRegions: [] as any[],
       weakRegions: [] as any[],
       neutralRegions: [] as any[]
    };

    if (totalGlobal > 0) {
       for (const md of munData) {
          const share = (md.totalVotos / totalGlobal) * 100;
          md.sharePercentage = parseFloat(share.toFixed(2));

          if (md.totalVotos >= q3) {
             insights.strongRegions.push(md);
             insights.risks.push(`Alta dependência identificada em ${md.municipio} (${md.sharePercentage}% dos votos).`);
          } else if (md.totalVotos <= q1) {
             insights.weakRegions.push(md);
             insights.opportunities.push(`Margem para expansão em ${md.municipio} (${md.sharePercentage}% dos votos).`);
          } else {
             insights.neutralRegions.push(md);
          }
       }
    }

    insights.strongRegions.sort((a, b) => b.totalVotos - a.totalVotos);
    insights.neutralRegions.sort((a, b) => b.totalVotos - a.totalVotos);
    insights.weakRegions.sort((a, b) => b.totalVotos - a.totalVotos);

    return {
      dataStatus: coverageInfo.isTruncated ? "PARTIAL_DATA" : "READY",
      calculationMethod: "Distribuição territorial baseada em quartis (Votos Q4 >= Q3 -> Fortes; Q1 <= Q1 -> Fracas).",
      evidenceSources,
      warnings,
      coverageInfo,
      result: {
        insights
      }
    };
  }
}
