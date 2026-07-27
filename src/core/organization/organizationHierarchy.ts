import type { OrganizationTreeNode, OrganizationUnit } from './organizationTypes';
import { buildOrganizationTree } from './OrganizationRegistry';

export function findOrganizationUnitById(units: OrganizationUnit[], unitId: string): OrganizationUnit | undefined {
  return units.find((unit) => unit.id === unitId);
}

export function getOrganizationChildren(units: OrganizationUnit[], parentId: string): OrganizationUnit[] {
  return units.filter((unit) => unit.parentId === parentId);
}

export function getOrganizationAncestors(units: OrganizationUnit[], unitId: string): OrganizationUnit[] {
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const current = unitById.get(unitId);
  const ancestors: OrganizationUnit[] = [];

  let parentId = current?.parentId;

  while (parentId) {
    const parent = unitById.get(parentId);

    if (!parent) break;

    ancestors.unshift(parent);
    parentId = parent.parentId;
  }

  return ancestors;
}

export function getOrganizationDescendants(units: OrganizationUnit[], unitId: string): OrganizationUnit[] {
  const children = getOrganizationChildren(units, unitId);
  const descendants: OrganizationUnit[] = [];

  children.forEach((child) => {
    descendants.push(child);
    descendants.push(...getOrganizationDescendants(units, child.id));
  });

  return descendants;
}

export function flattenOrganizationTree(tree: OrganizationTreeNode[]): OrganizationTreeNode[] {
  return tree.flatMap((node) => [node, ...flattenOrganizationTree(node.children)]);
}

export function getOrganizationTreeForTenant(units: OrganizationUnit[], tenantId: string): OrganizationTreeNode[] {
  return buildOrganizationTree(units.filter((unit) => unit.tenantId === tenantId));
}
