import { CandidateHistoryEngine } from "./CandidateHistoryEngine";
import { PartyHistoryEngine } from "./PartyHistoryEngine";
import { TerritorialHistoryEngine } from "./TerritorialHistoryEngine";

export class ElectoralComparisonEngine {
  constructor(
    private candidateEngine: CandidateHistoryEngine,
    private partyEngine: PartyHistoryEngine,
    private territoryEngine: TerritorialHistoryEngine
  ) {}

  public async compareCandidates(organizationId: string, candidateNames: string[]): Promise<any> {
    const results = [];
    for (const name of candidateNames) {
      const history = await this.candidateEngine.getCandidateHistory(organizationId, name);
      if (history) {
        // Summary for comparison
        results.push({
          name: history.candidateName,
          totalVotes: history.totalVotesCount,
          electionsCount: history.elections.length,
          bestYear: history.elections.length > 0 ? history.elections.reduce((prev, current) => (prev.totalVotes > current.totalVotes) ? prev : current).year : null,
          topMunicipality: Object.entries(history.byMunicipality).sort((a, b) => b[1] - a[1])[0] || null,
        });
      }
    }
    return results;
  }

  public async compareParties(organizationId: string, partyNames: string[]): Promise<any> {
    const results = [];
    for (const name of partyNames) {
      const history = await this.partyEngine.getPartyHistory(organizationId, name);
      if (history) {
        results.push({
          party: history.party,
          totalVotes: history.totalVotesCount,
          electionsCount: history.elections.length,
          bestYear: history.elections.length > 0 ? history.elections.reduce((prev, current) => (prev.totalVotes > current.totalVotes) ? prev : current).year : null,
          topMunicipality: Object.entries(history.byMunicipality).sort((a, b) => b[1] - a[1])[0] || null,
        });
      }
    }
    return results;
  }
}
