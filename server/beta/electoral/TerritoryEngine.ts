import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { KnowledgeGraphEngine } from "../KnowledgeGraphEngine";
import { ElectoralDomainEngine, Territory } from "./ElectoralDomainEngine";

export class TerritoryEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private kgEngine: KnowledgeGraphEngine,
    private domainEngine: ElectoralDomainEngine
  ) {}

  public async registerTerritory(
    organizationId: string,
    projectId: string | null,
    territory: {
      id?: string;
      name: string;
      type: 'STATE' | 'REGION' | 'MUNICIPALITY' | 'ZONE' | 'VOTING_LOCATION';
      parentId?: string | null;
      code?: string | null;
    }
  ): Promise<any> {
    const registered = await this.domainEngine.registerTerritory(organizationId, projectId, territory);

    // If parentId is specified, ensure relationship and build hierarchal tree associations
    if (territory.parentId) {
      await this.kgEngine.createRelationship(
        organizationId,
        registered.id,
        territory.parentId,
        "BELONGS_TO"
      );
    }

    return registered;
  }

  /**
   * Retrieves a hierarchical layout of active locations.
   */
  public async getTerritoryHierarchy(organizationId: string): Promise<any> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    
    // Sort and relate them
    const states = territories.filter(t => t.type === 'STATE');
    const regions = territories.filter(t => t.type === 'REGION');
    const municipalities = territories.filter(t => t.type === 'MUNICIPALITY');
    const zones = territories.filter(t => t.type === 'ZONE');
    const votingLocations = territories.filter(t => t.type === 'VOTING_LOCATION');

    return {
      states: states.map(s => this.buildSubtree(s, regions, municipalities, zones, votingLocations)),
      orphanRegions: regions.filter(r => !r.parentId).map(r => this.buildSubtree(r, regions, municipalities, zones, votingLocations)),
      orphanMunicipalities: municipalities.filter(m => !m.parentId).map(m => this.buildSubtree(m, regions, municipalities, zones, votingLocations)),
      orphanZones: zones.filter(z => !z.parentId).map(z => this.buildSubtree(z, regions, municipalities, zones, votingLocations)),
      orphanVotingLocations: votingLocations.filter(v => !v.parentId)
    };
  }

  private buildSubtree(node: Territory, regions: Territory[], municipalities: Territory[], zones: Territory[], votingLocations: Territory[]): any {
    const children: any[] = [];

    if (node.type === 'STATE') {
      // Find regions or municipalities that belong to this state
      const subRegions = regions.filter(r => r.parentId === node.id);
      const subMunicipals = municipalities.filter(m => m.parentId === node.id);
      
      children.push(...subRegions.map(r => this.buildSubtree(r, regions, municipalities, zones, votingLocations)));
      children.push(...subMunicipals.map(m => this.buildSubtree(m, regions, municipalities, zones, votingLocations)));
    } else if (node.type === 'REGION') {
      const subMunicipals = municipalities.filter(m => m.parentId === node.id);
      children.push(...subMunicipals.map(m => this.buildSubtree(m, regions, municipalities, zones, votingLocations)));
    } else if (node.type === 'MUNICIPALITY') {
      const subZones = zones.filter(z => z.parentId === node.id);
      children.push(...subZones.map(z => this.buildSubtree(z, regions, municipalities, zones, votingLocations)));
    } else if (node.type === 'ZONE') {
      const subVotingLocations = votingLocations.filter(v => v.parentId === node.id);
      children.push(...subVotingLocations);
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      code: node.code || null,
      parentId: node.parentId,
      children: children.length > 0 ? children : undefined
    };
  }
}
