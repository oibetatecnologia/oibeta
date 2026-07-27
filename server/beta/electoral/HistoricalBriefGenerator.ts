import { CandidateHistoryEngine } from "./CandidateHistoryEngine";
import { ElectoralTrendEngine } from "./ElectoralTrendEngine";
import { TerritorialHistoryEngine } from "./TerritorialHistoryEngine";

export class HistoricalBriefGenerator {
  constructor(
    private candidateEngine: CandidateHistoryEngine,
    private trendEngine: ElectoralTrendEngine,
    private territoryEngine: TerritorialHistoryEngine
  ) {}

  public async generateCandidateBrief(organizationId: string, candidateName: string): Promise<string> {
    const history = await this.candidateEngine.getCandidateHistory(organizationId, candidateName);
    const trend = await this.trendEngine.analyzeCandidateTrend(organizationId, candidateName);

    if (!history) {
      return "Ainda não há dados históricos suficientes para responder isso.";
    }

    const { elections, totalVotesCount, byMunicipality } = history;
    const topMuni = Object.entries(byMunicipality).sort((a, b) => b[1] - a[1])[0];

    const years = elections.map(e => e.year).sort().join(", ");

    return `Com os dados atualmente carregados, o candidato ${candidateName} acumula ${totalVotesCount} votos históricos, com disputas nos anos contidos na base (${years}). ${trend.description} O município de maior concentração de votos consolidados é ${topMuni ? topMuni[0] : 'N/A'}.`;
  }

  public async generateTerritoryBrief(organizationId: string, municipality: string): Promise<string> {
    const history = await this.territoryEngine.getTerritorialHistory(organizationId, municipality);

    if (!history) {
      return "Ainda não há dados históricos suficientes para responder isso.";
    }

    const { topCandidates, topParties, elections } = history;
    const years = elections.map(e => e.year).sort().join(", ");
    
    const candidatesStr = topCandidates.slice(0, 3).map(c => c.name).join(", ");
    const partiesStr = topParties.slice(0, 3).map(p => p.name).join(", ");

    return `Histórico territorial de ${municipality}: Foram mapeadas eleições nos anos ${years}. Entre os candidatos mais votados neste município, baseando-se estritamente em resultados passados, encontram-se ${candidatesStr}. Os partidos com maior peso histórico local são ${partiesStr}.`;
  }
}
