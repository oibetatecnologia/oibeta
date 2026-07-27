import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { SupplierIntelligenceEngine, SupplierStats } from "./SupplierIntelligenceEngine";

export interface MarketAnalysis {
  supplierConcentrationScore: number; // 0-100 indicating concentration
  dominantSuppliers: string[]; // names of highly dominant suppliers
  averageCompetitiveness: number; // average competitors per bid
  hasLowCompetitiveness: boolean; // if < 2 competitors on average
  excessiveRepetitions: string[]; // suppliers winning multiple times
  totalVictories: number;
}

export class ProcurementMarketEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async analyzeMarket(organizationId: string, projectId?: string, workspaceId?: string): Promise<MarketAnalysis> {
    const actualWorkspaceId = workspaceId || "default-workspace";
    const supplierIntel = new SupplierIntelligenceEngine(this.dbAdapter);
    const statsList = await supplierIntel.calculateSupplierStats(organizationId, projectId, actualWorkspaceId);

    const totalVictories = statsList.reduce((acc, curr) => acc + curr.victories, 0);
    const totalParticipations = statsList.reduce((acc, curr) => acc + curr.participations, 0);

    const dominantSuppliers: string[] = [];
    const excessiveRepetitions: string[] = [];

    // Find if any supplier holds > 40% of all victories
    statsList.forEach(s => {
      if (totalVictories > 0) {
        const share = (s.victories / totalVictories) * 100;
        if (share >= 40 && s.victories > 1) {
          dominantSuppliers.push(s.name);
        }
      }
      if (s.victories >= 3) {
        excessiveRepetitions.push(s.name);
      }
    });

    // Competitiveness
    const nodes = await this.dbAdapter.getKnowledgeNodes(organizationId, projectId, actualWorkspaceId);
    const bids = nodes.filter(n => n.nodeType === "BID" || n.nodeType === "NOTICE");
    const proposals = nodes.filter(n => n.nodeType === "PROPOSAL");

    let averageCompetitiveness = 0;
    if (bids.length > 0) {
      // average proposals per bid
      averageCompetitiveness = parseFloat((proposals.length / bids.length).toFixed(1));
    } else if (statsList.length > 0) {
      // average proposal per supplier
      averageCompetitiveness = parseFloat((totalParticipations / statsList.length).toFixed(1));
    }

    // Concentration Score (using Top 3 share of victories)
    let supplierConcentrationScore = 0;
    if (totalVictories > 0) {
      const top3Victories = statsList
        .slice(0, 3)
        .reduce((acc, curr) => acc + curr.victories, 0);
      supplierConcentrationScore = Math.round((top3Victories / totalVictories) * 100);
    }

    return {
      supplierConcentrationScore,
      dominantSuppliers,
      averageCompetitiveness,
      hasLowCompetitiveness: averageCompetitiveness < 2,
      excessiveRepetitions,
      totalVictories
    };
  }
}
