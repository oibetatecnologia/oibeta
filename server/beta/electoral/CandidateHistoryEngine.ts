import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { HistoricalResult } from "./HistoricalElectoralEngine";

export class CandidateHistoryEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Recovers the entire voting history of a candidate across elections.
   */
  public async getCandidateHistory(organizationId: string, candidateName: string): Promise<{
    candidateName: string;
    totalVotesCount: number;
    elections: {
      year: number;
      position: string;
      totalVotes: number;
      municipalities: { [muni: string]: number };
      zones: { [zone: number]: number };
    }[];
    byPosition: { [position: string]: number };
    byMunicipality: { [muni: string]: number };
    byZone: { [zone: number]: number };
  } | null> {
    if (!candidateName) return null;

    const records: HistoricalResult[] = await this.dbAdapter.getElectoralHistoricalResults({
      organizationId,
      nome: candidateName,
    });

    if (records.length === 0) {
      return null;
    }

    let totalVotesCount = 0;
    const electionsMap: { [year: number]: {
      year: number;
      position: string;
      totalVotes: number;
      municipalities: { [muni: string]: number };
      zones: { [zone: string]: number };
    }} = {};

    const byPosition: { [position: string]: number } = {};
    const byMunicipality: { [muni: string]: number } = {};
    const byZone: { [zone: string]: number } = {};

    for (const r of records) {
      const votes = Number(r.qtVotos || 0);
      totalVotesCount += votes;

      // Global groupings
      byPosition[r.cargo] = (byPosition[r.cargo] || 0) + votes;
      byMunicipality[r.municipio] = (byMunicipality[r.municipio] || 0) + votes;
      if (r.zona) {
          byZone[r.zona] = (byZone[r.zona] || 0) + votes;
      }

      // Grouping by election
      if (!electionsMap[r.anoEleitoral]) {
        electionsMap[r.anoEleitoral] = {
          year: r.anoEleitoral,
          position: r.cargo,
          totalVotes: 0,
          municipalities: {},
          zones: {},
        };
      }

      const elec = electionsMap[r.anoEleitoral];
      elec.totalVotes += votes;
      elec.municipalities[r.municipio] = (elec.municipalities[r.municipio] || 0) + votes;
      if (r.zona) {
          elec.zones[r.zona] = (elec.zones[r.zona] || 0) + votes;
      }
    }

    const electionsList = Object.values(electionsMap).sort((a, b) => b.year - a.year);

    return {
      candidateName,
      totalVotesCount,
      elections: electionsList,
      byPosition,
      byMunicipality,
      byZone,
    };
  }

  /**
   * Recovers a list of all historical candidates present in the loaded database for autocomplete.
   */
  public async listUniqueCandidates(organizationId: string): Promise<string[]> {
    const records = await this.dbAdapter.getElectoralHistoricalResults({ organizationId });
    const candidates = new Set<string>();
    for (const r of records) {
      if (r.nome) {
        candidates.add(r.nome);
      }
    }
    return Array.from(candidates).sort();
  }
}
