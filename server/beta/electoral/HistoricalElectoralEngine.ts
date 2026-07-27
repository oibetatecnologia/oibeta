import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";

export interface HistoricalResult {
  id: string;
  organizationId?: string;
  projectId?: string;
  anoEleitoral: number;
  uf: string;
  municipio: string;
  zona?: string;
  cargo: string;
  nome: string;
  partido?: string;
  numeroVotavel?: string;
  localVotacao?: string;
  enderecoLocal?: string;
  qtVotos: number;
  turno?: number;
  suplementar?: boolean;
  importRunId?: string;
  createdAt: string;
}

export class HistoricalElectoralEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine
  ) {}

  /**
   * Reads raw historical votes from the database with pagination and optimized filtering.
   */
  public async getRawResults(organizationId: string, filter?: any): Promise<HistoricalResult[]> {
    if (!organizationId) {
      throw new Error("organizationId is required");
    }
    const combinedFilter = { ...filter, organizationId };
    const results = await this.dbAdapter.getElectoralHistoricalResults(combinedFilter);
    return results as HistoricalResult[];
  }

  /**
   * Obtains aggregate statistics for historical results
   */
  public async getAggregates(organizationId: string, filter: any): Promise<{
    totalVotes: number;
    recordCount: number;
    uniqueCandidates: string[];
    uniqueParties: string[];
    uniqueMunicipalities: string[];
  }> {
    const records = await this.getRawResults(organizationId, filter);
    let totalVotes = 0;
    const candidates = new Set<string>();
    const parties = new Set<string>();
    const municipalities = new Set<string>();

    for (const r of records) {
      totalVotes += Number(r.qtVotos || 0);
      if (r.nome) candidates.add(r.nome);
      if (r.partido) parties.add(r.partido);
      if (r.municipio) municipalities.add(r.municipio);
    }

    return {
      totalVotes,
      recordCount: records.length,
      uniqueCandidates: Array.from(candidates),
      uniqueParties: Array.from(parties),
      uniqueMunicipalities: Array.from(municipalities),
    };
  }
}
