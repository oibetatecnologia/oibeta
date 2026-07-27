import {
  DEFAULT_GOV_ORGANIZATION_UNITS,
  buildOrganizationTree,
  getOrganizationUnitStatusLabel,
  getOrganizationUnitTypeLabel,
  summarizeOrganization,
} from './OrganizationRegistry';
import {
  findOrganizationUnitById,
  getOrganizationAncestors,
  getOrganizationDescendants,
  getOrganizationTreeForTenant,
} from './organizationHierarchy';
import type {
  OrganizationSummary,
  OrganizationTreeNode,
  OrganizationUnit,
  OrganizationUnitStatus,
  OrganizationUnitType,
} from './organizationTypes';

export interface OrganizationRuntimeContext {
  tenantId: string;
}

export interface OrganizationOperationalSnapshot {
  units: OrganizationUnit[];
  tree: OrganizationTreeNode[];
  summary: OrganizationSummary;
}

/**
 * OrganizationService
 *
 * Primeira camada operacional da Sprint 21.
 * Nesta fase não acessa backend e não implementa CRUD.
 * Normaliza a estrutura institucional padrão para o tenant ativo e prepara
 * a futura integração com Beta Gov e administração institucional real.
 */
export class OrganizationService {
  static buildOperationalSnapshot(context: OrganizationRuntimeContext): OrganizationOperationalSnapshot {
    const units = DEFAULT_GOV_ORGANIZATION_UNITS.map((unit) => ({
      ...unit,
      tenantId: context.tenantId,
    }));

    return {
      units,
      tree: buildOrganizationTree(units),
      summary: summarizeOrganization(units),
    };
  }

  static getTypeLabel(type: OrganizationUnitType): string {
    return getOrganizationUnitTypeLabel(type);
  }

  static getStatusLabel(status: OrganizationUnitStatus): string {
    return getOrganizationUnitStatusLabel(status);
  }

  static findUnit(units: OrganizationUnit[], unitId: string): OrganizationUnit | undefined {
    return findOrganizationUnitById(units, unitId);
  }

  static getAncestors(units: OrganizationUnit[], unitId: string): OrganizationUnit[] {
    return getOrganizationAncestors(units, unitId);
  }

  static getDescendants(units: OrganizationUnit[], unitId: string): OrganizationUnit[] {
    return getOrganizationDescendants(units, unitId);
  }

  static getTreeForTenant(units: OrganizationUnit[], tenantId: string): OrganizationTreeNode[] {
    return getOrganizationTreeForTenant(units, tenantId);
  }
}
