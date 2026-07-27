import { DatabaseAdapter } from "../../database/DatabaseAdapter";
import { Coordinator, ElectoralDomainEngine } from "./ElectoralDomainEngine";

export interface HierarchyNode {
  coordinator: Coordinator;
  children: HierarchyNode[];
}

export class CoordinatorHierarchyEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private domainEngine: ElectoralDomainEngine
  ) {}

  /**
   * Builds the hierarchical tree representation of all coordinators.
   */
  public async getHierarchy(organizationId: string): Promise<HierarchyNode[]> {
    const coords = await this.domainEngine.getCoordinators(organizationId);
    
    const map = new Map<string, HierarchyNode>();
    coords.forEach(c => {
      map.set(c.id, { coordinator: c, children: [] });
    });

    const roots: HierarchyNode[] = [];
    coords.forEach(c => {
      const node = map.get(c.id)!;
      if (c.parentCoordinatorId && map.has(c.parentCoordinatorId)) {
        const parentNode = map.get(c.parentCoordinatorId)!;
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Retrieves all recursive descendants of a given coordinator.
   */
  public async getSubordinates(organizationId: string, coordinatorId: string): Promise<Coordinator[]> {
    const coords = await this.domainEngine.getCoordinators(organizationId);
    const map = new Map<string, Coordinator[]>();
    coords.forEach(c => {
      if (c.parentCoordinatorId) {
        const list = map.get(c.parentCoordinatorId) || [];
        list.push(c);
        map.set(c.parentCoordinatorId, list);
      }
    });

    const result: Coordinator[] = [];
    const queue: string[] = [coordinatorId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const children = map.get(currentId) || [];
      children.forEach(child => {
        result.push(child);
        queue.push(child.id);
      });
    }

    return result;
  }

  /**
   * Retrieves all ancestors in the command line up to the root coordinator.
   */
  public async getSupervisors(organizationId: string, coordinatorId: string): Promise<Coordinator[]> {
    const coords = await this.domainEngine.getCoordinators(organizationId);
    const coordMap = new Map<string, Coordinator>();
    coords.forEach(c => coordMap.set(c.id, c));

    const supervisors: Coordinator[] = [];
    let current = coordMap.get(coordinatorId);
    const visited = new Set<string>();

    while (current && current.parentCoordinatorId) {
      if (visited.has(current.id)) {
        break; // Loop protection
      }
      visited.add(current.id);

      const parent = coordMap.get(current.parentCoordinatorId);
      if (parent) {
        supervisors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return supervisors;
  }

  /**
   * Validates if a proposed parent-child supervisor assignment is structurally sound and levels are logically ordered.
   */
  public async validateHierarchy(organizationId: string, coordinatorId: string, parentId: string | null): Promise<{ valid: boolean; error?: string }> {
    if (!parentId) return { valid: true };

    if (coordinatorId === parentId) {
      return { valid: false, error: "Um coordenador não pode ser supervisor de si mesmo." };
    }

    const coords = await this.domainEngine.getCoordinators(organizationId);
    const coordMap = new Map<string, Coordinator>();
    coords.forEach(c => coordMap.set(c.id, c));

    const target = coordMap.get(coordinatorId);
    const parent = coordMap.get(parentId);

    if (!target) return { valid: false, error: "Coordenador não encontrado." };
    if (!parent) return { valid: false, error: "Supervisor não encontrado." };

    const LEVEL_WEIGHT: Record<string, number> = {
      GENERAL: 5,
      REGIONAL: 4,
      MUNICIPAL: 3,
      DISTRICT: 2,
      VOTING_LOCATION: 1
    };

    const targetWeight = LEVEL_WEIGHT[target.level] || 0;
    const parentWeight = LEVEL_WEIGHT[parent.level] || 0;

    if (parentWeight <= targetWeight) {
      return {
        valid: false,
        error: `Inconsistência de nível: um supervisor de nível ${parent.level} não pode supervisionar um coordenador de nível ${target.level}.`
      };
    }

    // Circularity check
    let currentId: string | null = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === coordinatorId) {
        return { valid: false, error: "Hierarquia circular detectada: a relação criaria um loop de supervisão." };
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      const currNode = coordMap.get(currentId);
      currentId = currNode ? currNode.parentCoordinatorId : null;
    }

    return { valid: true };
  }
}
