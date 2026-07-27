import { HistoricalElectoralAggregateEngine } from "./HistoricalElectoralAggregateEngine";
import { resolveCandidateIdentity } from "./CandidateResolutionUtil";

export class OpponentAnalysisEngine {
  constructor(private aggregateEngine: HistoricalElectoralAggregateEngine) {}

  public async getOpponentComparison(organizationId: string, filter: any): Promise<any> {
    const limit = filter?.limit ? Number(filter.limit) : 5000;
    const warnings: string[] = [];
    const coverageInfo = { limitUsed: limit, isTruncated: false };
    const emptyResult = {
        dataStatus: "NO_DATA", 
        calculationMethod: "Comparação Direta = |Votos A - Votos B|", 
        evidenceSources: [], 
        warnings, 
        coverageInfo, 
        result: null 
    };

    if (!filter.candidatoA || !filter.candidatoB) {
       warnings.push("Candidato A and Candidato B are required");
       return emptyResult;
    }

    // Traz o histórico apenas baseando-se no agregado completo (sem injetar nomes fictícios)
    const baseFilter = { ...filter, limit };
    delete baseFilter.candidatoA;
    delete baseFilter.candidatoB;

    const data = await this.aggregateEngine.getCandidateSummary(organizationId, baseFilter);
    if (!data || data.length === 0) {
       return emptyResult;
    }

    coverageInfo.isTruncated = data.length === limit;
    if (coverageInfo.isTruncated) {
       warnings.push(`Warning: Data truncated to ${limit} records. Analysis may be incomplete.`);
    }

    const nameA = String(filter.candidatoA);
    const nameB = String(filter.candidatoB);

    // Filtra exclusivamente os dois candidatos a partir dos dados reais evitando match parcial agressivo
    const recordsA = resolveCandidateIdentity(data, nameA);
    const recordsB = resolveCandidateIdentity(data, nameB);

    if (recordsA.length === 0 && recordsB.length === 0) {
        warnings.push("Neither candidate found in historical data.");
        return emptyResult;
    }

    const hasA = recordsA.length > 0;
    const hasB = recordsB.length > 0;

    let dataStatus = "READY";
    if (!hasA) {
        warnings.push(`Candidate A (${nameA}) not found.`);
        dataStatus = "PARTIAL_DATA";
    }
    if (!hasB) {
        warnings.push(`Candidate B (${nameB}) not found.`);
        dataStatus = "PARTIAL_DATA";
    }

    // FÓRMULA DE COMPARAÇÃO DIRETA
    // Total Votos A = Sum(qt_votos onde nome LIKE A)
    // Total Votos B = Sum(qt_votos onde nome LIKE B)
    // Diferença Absoluta = |Votos A - Votos B|
    // Vantagem = Votos A > Votos B ? Candidato A : Candidato B
    
    const sumA = recordsA.reduce((acc, row) => acc + (Number(row.totalVotos) || 0), 0);
    const sumB = recordsB.reduce((acc, row) => acc + (Number(row.totalVotos) || 0), 0);

    const matchCandidateA = hasA ? recordsA[0].candidato : nameA;
    const matchCandidateB = hasB ? recordsB[0].candidato : nameB;

    const difference = Math.abs(sumA - sumB);
    let advantage = "EMPATE";
    if (sumA > sumB) advantage = matchCandidateA;
    if (sumB > sumA) advantage = matchCandidateB;

    const evidenceSources = [
       ...recordsA.map(r => ({ candidato: r.candidato, votos: r.totalVotos, ano: r.anoEleitoral })),
       ...recordsB.map(r => ({ candidato: r.candidato, votos: r.totalVotos, ano: r.anoEleitoral }))
    ];

    if (coverageInfo.isTruncated && dataStatus !== "NO_DATA") {
       dataStatus = "PARTIAL_DATA";
    }

    return {
      dataStatus,
      calculationMethod: "Comparação Direta. Vantagem = Candidato com mais votos. Diferença = |Votos A - Votos B|.",
      evidenceSources,
      warnings,
      coverageInfo,
      result: {
        comparison: {
          candidateA: {
            nome: matchCandidateA,
            totalVotos: sumA,
            historico: recordsA.map(r => ({ anoEleitoral: r.anoEleitoral, totalVotos: r.totalVotos, municipio: r.municipio }))
          },
          candidateB: {
            nome: matchCandidateB,
            totalVotos: sumB,
            historico: recordsB.map(r => ({ anoEleitoral: r.anoEleitoral, totalVotos: r.totalVotos, municipio: r.municipio }))
          },
          metrics: {
            difference,
            advantage,
            candidateAFound: hasA,
            candidateBFound: hasB
          }
        }
      }
    };
  }
}
