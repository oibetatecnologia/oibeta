import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class HistoricalElectoralAggregateEngine {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async refreshAggregates(): Promise<void> {
    await this.dbAdapter.refreshElectoralAggregates();
  }

  public async getAvailableFilters(organizationId: string): Promise<any> {
    return this.dbAdapter.getElectoralAvailableFilters(organizationId);
  }

  public async getCandidateSummary(organizationId: string, filter?: any): Promise<any[]> {
    return this.dbAdapter.getElectoralCandidateSummary(organizationId, filter);
  }

  public async getMunicipalitySummary(organizationId: string, filter?: any): Promise<any[]> {
    return this.dbAdapter.getElectoralMunicipalitySummary(organizationId, filter);
  }

  public async getPartySummary(organizationId: string, filter?: any): Promise<any[]> {
    return this.dbAdapter.getElectoralPartySummary(organizationId, filter);
  }

  public async getLocationSummary(organizationId: string, filter?: any): Promise<any[]> {
    return this.dbAdapter.getElectoralLocationSummary(organizationId, filter);
  }

  public async getZoneSummary(organizationId: string, filter?: any): Promise<any[]> {
    return this.dbAdapter.getElectoralZoneSummary(organizationId, filter);
  }

  public async generateImportValidationSummary(organizationId: string, importRunId: string): Promise<any> {
    const computedData = await this.dbAdapter.computeElectoralImportValidation(organizationId, importRunId);
    return this.dbAdapter.createElectoralImportValidationSummary(computedData);
  }
}
