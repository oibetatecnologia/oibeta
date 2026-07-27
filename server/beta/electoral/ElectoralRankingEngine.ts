import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { HistoricalResult } from "./HistoricalElectoralEngine";

export class ElectoralRankingEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async getCandidateRanking(organizationId: string, filter: any = {}): Promise<{ name: string; votes: number }[]> {
    return this.dbAdapter.getElectoralCandidateRanking(organizationId, filter);
  }

  public async getPartyRanking(organizationId: string, filter: any = {}): Promise<{ name: string; votes: number }[]> {
    return this.dbAdapter.getElectoralPartyRanking(organizationId, filter);
  }
}
