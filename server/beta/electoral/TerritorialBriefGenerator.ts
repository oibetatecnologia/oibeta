import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine } from "./ElectoralDomainEngine";
import { TerritoryCoverageEngine } from "./TerritoryCoverageEngine";

export class TerritorialBriefGenerator {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine,
    private coverageEngine: TerritoryCoverageEngine
  ) {}

  public async generateBrief(organizationId: string): Promise<string> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    if (territories.length === 0) {
      return "Ainda não há dados territoriais suficientes ou cadastrados para formular um resumo executivo.";
    }

    const coverageResults = await this.coverageEngine.getCoverage(organizationId);
    const coveredOrPartial = coverageResults.filter((r) => r.status === "COVERED" || r.status === "PARTIAL").length;
    const uncovered = coverageResults.filter((r) => r.status === "UNCOVERED").length;

    return `Com os dados atualmente carregados, a região possui ${territories.length} territórios cadastrados, dos quais ${coveredOrPartial} possuem cobertura operacional e ${uncovered} permanecem sem responsável definido.`;
  }
}
