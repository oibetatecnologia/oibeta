export type OrganizationUnitType =
  | 'city_hall'
  | 'cabinet'
  | 'secretariat'
  | 'department'
  | 'directorate'
  | 'coordination'
  | 'sector'
  | 'team'
  | 'commission'
  | 'council'
  | 'campaign'
  | 'nucleus'
  | 'other';

export type OrganizationUnitStatus = 'active' | 'implementation' | 'paused' | 'inactive';

export interface OrganizationUnitMetadata {
  description?: string;
  legalBasis?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface OrganizationUnit {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: OrganizationUnitType;
  status: OrganizationUnitStatus;
  parentId?: string;
  responsibleUserId?: string;
  productIds: string[];
  metadata?: OrganizationUnitMetadata;
}

export interface OrganizationTreeNode extends OrganizationUnit {
  children: OrganizationTreeNode[];
  level: number;
  path: string[];
}

export interface OrganizationSummary {
  totalUnits: number;
  activeUnits: number;
  implementationUnits: number;
  rootUnits: number;
  maxDepth: number;
}
