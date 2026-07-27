import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { ElectoralDomainEngine, Territory } from "./ElectoralDomainEngine";

export interface TerritoryTreeNode {
  id: string;
  name: string | null;
  type: string;
  parentId: string | null;
  parentTerritoryId: string | null;
  coverageStatus: string | null;
  priorityLevel: string | null;
  children: TerritoryTreeNode[];
}

export class TerritoryHierarchyEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine
  ) {}

  public async getHierarchy(organizationId: string): Promise<TerritoryTreeNode[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    
    // Map territories to nodes
    const nodeMap = new Map<string, TerritoryTreeNode>();
    territories.forEach((t) => {
      nodeMap.set(t.id, {
        id: t.id,
        name: t.name,
        type: t.type,
        parentId: t.parentId,
        parentTerritoryId: t.parentTerritoryId,
        coverageStatus: t.coverageStatus,
        priorityLevel: t.priorityLevel,
        children: []
      });
    });

    const roots: TerritoryTreeNode[] = [];

    // Assemble hierarchical tree
    territories.forEach((t) => {
      const node = nodeMap.get(t.id)!;
      const parentId = t.parentTerritoryId || t.parentId;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  public async getAncestors(organizationId: string, territoryId: string): Promise<Territory[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    const terrMap = new Map<string, Territory>();
    territories.forEach((t) => terrMap.set(t.id, t));

    const ancestors: Territory[] = [];
    let current = terrMap.get(territoryId);
    
    while (current) {
      const parentId = current.parentTerritoryId || current.parentId;
      if (parentId && terrMap.has(parentId)) {
        const parent = terrMap.get(parentId)!;
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  public async getDescendants(organizationId: string, territoryId: string): Promise<Territory[]> {
    const territories = await this.domainEngine.getTerritories(organizationId);
    
    const childrenMap = new Map<string, Territory[]>();
    territories.forEach((t) => {
      const parentId = t.parentTerritoryId || t.parentId;
      if (parentId) {
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(t);
      }
    });

    const descendants: Territory[] = [];
    const queue: string[] = [territoryId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = childrenMap.get(currentId) || [];
      for (const child of children) {
        descendants.push(child);
        queue.push(child.id);
      }
    }

    return descendants;
  }
}
