import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ProcurementMarketEngine } from "./ProcurementMarketEngine";

export class ProcurementHealthEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
  ) {}

  public async calculateHealth(
    organizationId: string,
    bids: any[],
    notices: any[],
    suppliers: any[],
    lots: any[],
    priceRegistries: any[],
    documents: any[],
    riskOutput: any,
    dataStatus: "NO_DATA" | "PARTIAL_DATA" | "READY"
  ): Promise<any> {
    if (dataStatus === "NO_DATA" || bids.length === 0) {
      return {
        score: null,
        healthScore: null,
        riskScore: null,
        status: "UNKNOWN",
        partial: true,
        summary: "Ainda não há dados de compras públicas suficientes carregados para calcular a saúde licitatória.",
        message: "Dados de compras públicas insuficientes para gerar pontuação.",
        details: {
          completeness: 0,
          competitiveness: 0,
          supplierVariety: 0,
          riskMitigation: 0
        },
        breakdown: {
          completeness: 0,
          competition: 0,
          supplierVariety: 0,
          riskMitigation: 0
        }
      };
    }

    const hasSufficient = bids.length > 0 && suppliers.length > 0;

    // 1. Document Completeness Criteria (max 100 points)
    const hasEdital = documents.some(d => d.title?.toLowerCase().includes("edital") || d.metadata?.type === "EDITAL");
    const hasTR = documents.some(d => d.title?.toLowerCase().includes("termo") || d.metadata?.type === "TERMO DE REFERÊNCIA");
    const hasHomologation = documents.some(d => d.title?.toLowerCase().includes("homologação") || d.metadata?.type === "HOMOLOGAÇÃO");
    const hasContract = documents.some(d => d.title?.toLowerCase().includes("contrato") || d.metadata?.type === "CONTRATO");

    let completenessPoints = 20; // baseline
    if (hasEdital) completenessPoints += 25;
    if (hasTR) completenessPoints += 25;
    if (hasHomologation) completenessPoints += 15;
    if (hasContract) completenessPoints += 15;
    const completenessScore = Math.min(100, completenessPoints);

    // 2. Competitiveness (max 100 points)
    const marketEngine = new ProcurementMarketEngine(this.dbAdapter);
    const marketAnalysis = await marketEngine.analyzeMarket(organizationId);
    
    // competitiveness index based on average competitor count per bid
    let competitivenessScore = 50; // baseline
    if (marketAnalysis.averageCompetitiveness >= 4) {
      competitivenessScore = 100;
    } else if (marketAnalysis.averageCompetitiveness >= 2) {
      competitivenessScore = 80;
    } else if (marketAnalysis.averageCompetitiveness > 0) {
      competitivenessScore = 30;
    }

    // 3. Supplier Variety (max 100 points)
    // Decreases as concentration increases
    let supplierVarietyScore = 100;
    if (marketAnalysis.supplierConcentrationScore > 75) {
      supplierVarietyScore = 30; // highly concentrated
    } else if (marketAnalysis.supplierConcentrationScore > 45) {
      supplierVarietyScore = 60; // moderately concentrated
    } else if (marketAnalysis.supplierConcentrationScore > 0) {
      supplierVarietyScore = 90;
    }

    // 4. Risk Mitigation (max 100 points)
    // Derived from riskOutput score
    const riskPenalty = riskOutput ? riskOutput.score : 0;
    const riskMitigationScore = Math.max(0, 100 - riskPenalty);

    // Weighted Formula
    // Completeness (35%), Competitiveness (25%), Supplier Variety (20%), Risk Mitigation (20%)
    const weightedSum = (completenessScore * 0.35) + 
                        (competitivenessScore * 0.25) + 
                        (supplierVarietyScore * 0.20) + 
                        (riskMitigationScore * 0.20);
                        
    const computedHealthScore = Math.max(0, Math.min(100, Math.round(weightedSum)));

    const finalHealthScore = hasSufficient ? computedHealthScore : null;
    const finalRiskScore = hasSufficient ? (riskOutput?.score !== undefined ? riskOutput.score : null) : null;

    let status = "HEALTHY";
    if (finalHealthScore !== null) {
      if (finalHealthScore < 50) status = "CRITICAL";
      else if (finalHealthScore < 75) status = "WARNING";
    } else {
      status = "UNKNOWN";
    }

    const isPartial = dataStatus === "PARTIAL_DATA" || !hasSufficient;
    const message = isPartial
      ? "Análise de integridade parcial baseada apenas nos dados atualmente carregados."
      : `Índice de saúde das contratações públicas avaliado como ${status} (${finalHealthScore}/100).`;

    return {
      score: finalHealthScore,
      healthScore: finalHealthScore,
      riskScore: finalRiskScore,
      status,
      partial: isPartial,
      summary: message,
      message,
      details: {
        completeness: Math.round(completenessScore),
        competitiveness: Math.round(competitivenessScore),
        supplierVariety: Math.round(supplierVarietyScore),
        riskMitigation: Math.round(riskMitigationScore)
      },
      breakdown: {
        completeness: Math.round(completenessScore),
        competition: Math.round(competitivenessScore),
        supplierVariety: Math.round(supplierVarietyScore),
        riskMitigation: Math.round(riskMitigationScore)
      }
    };
  }
}
