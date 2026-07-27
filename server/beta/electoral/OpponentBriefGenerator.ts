import { DatabaseAdapter } from "../../database/DatabaseAdapter";

export class OpponentBriefGenerator {
  constructor(private dbAdapter: DatabaseAdapter) {}

  public async generateOpponentBrief(organizationId: string): Promise<{
    totalOpponents: number;
    totalGroups: number;
    totalLeaderships: number;
    totalRelationships: number;
    brief: string;
  }> {
    const opponents = await this.dbAdapter.getElectoralOpponents(organizationId);
    const groups = await this.dbAdapter.getElectoralPoliticalGroups(organizationId);
    const leaderships = await this.dbAdapter.getElectoralLeaderships(organizationId);
    const relationships = await this.dbAdapter.getElectoralRelationships(organizationId);

    const monitoredCount = opponents.filter(o => o.status === "MONITORED" || o.status === "ACTIVE").length;

    const brief = `Com os dados atualmente carregados, foram identificados ${opponents.length} adversários monitorados, distribuídos em ${groups.length} grupos políticos e relacionados a ${leaderships.length} lideranças cadastradas.`;

    return {
      totalOpponents: opponents.length,
      totalGroups: groups.length,
      totalLeaderships: leaderships.length,
      totalRelationships: relationships.length,
      brief
    };
  }
}
