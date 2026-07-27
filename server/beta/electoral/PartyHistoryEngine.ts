import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { HistoricalResult } from "./HistoricalElectoralEngine";

export class PartyHistoryEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Recovers the aggregate historical performance of a political party.
   */
  public async getPartyHistory(organizationId: string, party: string): Promise<{
    party: string;
    totalVotesCount: number;
    elections: {
      year: number;
      totalVotes: number;
      topCandidates: { name: string; votes: number }[];
    }[];
    byMunicipality: { [muni: string]: number };
  } | null> {
    if (!party) return null;

    const records: HistoricalResult[] = await this.dbAdapter.getElectoralHistoricalResults({ organizationId, partido: party });

    if (records.length === 0) {
      return null;
    }

    let totalVotesCount = 0;
    const electionsMap: { [year: number]: {
      year: number;
      totalVotes: number;
      candidates: { [candidateName: string]: number };
    }} = {};

    const byMunicipality: { [muni: string]: number } = {};

    for (const r of records) {
      const votes = Number(r.qtVotos || 0);
      totalVotesCount += votes;

      byMunicipality[r.municipio] = (byMunicipality[r.municipio] || 0) + votes;

      if (!electionsMap[r.anoEleitoral]) {
        electionsMap[r.anoEleitoral] = {
          year: r.anoEleitoral,
          totalVotes: 0,
          candidates: {},
        };
      }

      const elec = electionsMap[r.anoEleitoral];
      elec.totalVotes += votes;
      if (r.nome) {
        elec.candidates[r.nome] = (elec.candidates[r.nome] || 0) + votes;
      }
    }

    const electionsList = Object.values(electionsMap).map(e => ({
      year: e.year,
      totalVotes: e.totalVotes,
      topCandidates: Object.entries(e.candidates)
        .map(([name, votes]) => ({ name, votes }))
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5)
    })).sort((a, b) => b.year - a.year);

    return {
      party,
      totalVotesCount,
      elections: electionsList,
      byMunicipality,
    };
  }
}
