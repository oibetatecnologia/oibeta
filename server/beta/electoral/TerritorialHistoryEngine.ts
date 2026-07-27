import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { HistoricalResult } from "./HistoricalElectoralEngine";

export class TerritorialHistoryEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Recovers the historical voting data for a specific territory (municipality or zone).
   */
  public async getTerritorialHistory(
    organizationId: string,
    municipality: string,
    zone?: number
  ): Promise<{
    municipality: string;
    zone?: number;
    totalVotesCount: number;
    elections: {
      year: number;
      totalVotes: number;
      candidates: { [candidateName: string]: number };
      parties: { [partyName: string]: number };
    }[];
    topCandidates: { name: string; totalVotes: number }[];
    topParties: { name: string; totalVotes: number }[];
  } | null> {
    if (!municipality) return null;

    const filter: any = { organizationId, municipio: municipality };
    if (zone !== undefined) {
      filter.zona = String(zone);
    }

    const records: HistoricalResult[] = await this.dbAdapter.getElectoralHistoricalResults(filter);

    if (records.length === 0) {
      return null;
    }

    let totalVotesCount = 0;
    const electionsMap: { [year: number]: {
      year: number;
      totalVotes: number;
      candidates: { [candidateName: string]: number };
      parties: { [partyName: string]: number };
    }} = {};

    const overallCandidates: { [name: string]: number } = {};
    const overallParties: { [name: string]: number } = {};

    for (const r of records) {
      const votes = Number(r.qtVotos || 0);
      totalVotesCount += votes;

      if (r.nome) {
        overallCandidates[r.nome] = (overallCandidates[r.nome] || 0) + votes;
      }
      if (r.partido) {
        overallParties[r.partido] = (overallParties[r.partido] || 0) + votes;
      }

      if (!electionsMap[r.anoEleitoral]) {
        electionsMap[r.anoEleitoral] = {
          year: r.anoEleitoral,
          totalVotes: 0,
          candidates: {},
          parties: {},
        };
      }

      const elec = electionsMap[r.anoEleitoral];
      elec.totalVotes += votes;
      if (r.nome) {
        elec.candidates[r.nome] = (elec.candidates[r.nome] || 0) + votes;
      }
      if (r.partido) {
        elec.parties[r.partido] = (elec.parties[r.partido] || 0) + votes;
      }
    }

    const electionsList = Object.values(electionsMap).sort((a, b) => b.year - a.year);

    const topCandidates = Object.entries(overallCandidates)
      .map(([name, totalVotes]) => ({ name, totalVotes }))
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 10);

    const topParties = Object.entries(overallParties)
      .map(([name, totalVotes]) => ({ name, totalVotes }))
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 10);

    return {
      municipality,
      zone,
      totalVotesCount,
      elections: electionsList,
      topCandidates,
      topParties,
    };
  }
}
