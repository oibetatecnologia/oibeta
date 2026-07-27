import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ElectoralDomainEngine, ElectoralAnalysis } from "./ElectoralDomainEngine";

export class ElectoralAnalysisEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private domainEngine: ElectoralDomainEngine
  ) {}

  public async createAnalysis(
    organizationId: string,
    projectId: string | null,
    analysisData: {
      id?: string;
      title: string;
      type: 'HISTORICAL' | 'OPPONENT' | 'TERRITORIAL' | 'STRATEGIC' | 'PRIORITY';
      summary: string;
      metadata?: any;
    }
  ): Promise<ElectoralAnalysis> {
    const analysisObj: Partial<ElectoralAnalysis> = {
      id: analysisData.id,
      title: analysisData.title,
      type: analysisData.type,
      summary: analysisData.summary,
      metadata: analysisData.metadata || {},
    };

    const registered = await this.domainEngine.registerAnalysis(organizationId, projectId, analysisObj);
    
    // Create relationship in Knowledge Graph
    if (analysisData.metadata?.campaignId) {
      await this.kgEngine.createRelationship(organizationId, registered.id, analysisData.metadata.campaignId, "ANALYZES");
    }

    return registered;
  }

  public async getAnalysesByCampaign(organizationId: string, campaignId: string): Promise<ElectoralAnalysis[]> {
    const list = await this.domainEngine.getAnalyses(organizationId);
    return list.filter(a => a.metadata?.campaignId === campaignId);
  }

  public async getAnalysesByType(organizationId: string, type: 'HISTORICAL' | 'OPPONENT' | 'TERRITORIAL' | 'STRATEGIC' | 'PRIORITY'): Promise<ElectoralAnalysis[]> {
    const list = await this.domainEngine.getAnalyses(organizationId);
    return list.filter(a => a.type === type);
  }
}
