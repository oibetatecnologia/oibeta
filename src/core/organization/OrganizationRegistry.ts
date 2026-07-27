import type {
  OrganizationSummary,
  OrganizationTreeNode,
  OrganizationUnit,
  OrganizationUnitStatus,
  OrganizationUnitType,
} from './organizationTypes';

export const DEFAULT_GOV_ORGANIZATION_UNITS: OrganizationUnit[] = [
  {
    id: 'org-root-city-hall',
    tenantId: 'org-oi-beta',
    name: 'Prefeitura Municipal',
    code: 'PREFEITURA',
    type: 'city_hall',
    status: 'implementation',
    productIds: ['beta-gov'],
    metadata: {
      description: 'Unidade institucional raiz do tenant público.',
    },
  },
  {
    id: 'org-cabinet',
    tenantId: 'org-oi-beta',
    name: 'Gabinete do Prefeito',
    code: 'GABINETE',
    type: 'cabinet',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['beta-gov'],
  },
  {
    id: 'org-controladoria',
    tenantId: 'org-oi-beta',
    name: 'Controladoria',
    code: 'CONTROLADORIA',
    type: 'department',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['beta-gov', 'portal-transparencia-inteligente'],
  },
  {
    id: 'org-procuradoria',
    tenantId: 'org-oi-beta',
    name: 'Procuradoria',
    code: 'PROCURADORIA',
    type: 'department',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['beta-gov'],
  },
  {
    id: 'org-secretaria-administracao',
    tenantId: 'org-oi-beta',
    name: 'Secretaria de Administração',
    code: 'SEC_ADMIN',
    type: 'secretariat',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['beta-gov', 'beta-licita', 'prefeitura-zero-papel'],
  },
  {
    id: 'org-compras',
    tenantId: 'org-oi-beta',
    name: 'Compras',
    code: 'COMPRAS',
    type: 'department',
    status: 'implementation',
    parentId: 'org-secretaria-administracao',
    productIds: ['beta-licita'],
  },
  {
    id: 'org-licitacoes',
    tenantId: 'org-oi-beta',
    name: 'Licitações',
    code: 'LICITACOES',
    type: 'department',
    status: 'implementation',
    parentId: 'org-secretaria-administracao',
    productIds: ['beta-licita'],
  },
  {
    id: 'org-contratos',
    tenantId: 'org-oi-beta',
    name: 'Contratos e ARP',
    code: 'CONTRATOS_ARP',
    type: 'team',
    status: 'implementation',
    parentId: 'org-secretaria-administracao',
    productIds: ['gestao-contratos-arp', 'beta-licita'],
  },
  {
    id: 'org-rh',
    tenantId: 'org-oi-beta',
    name: 'Recursos Humanos',
    code: 'RH',
    type: 'department',
    status: 'implementation',
    parentId: 'org-secretaria-administracao',
    productIds: ['beta-gov'],
  },
  {
    id: 'org-secretaria-saude',
    tenantId: 'org-oi-beta',
    name: 'Secretaria de Saúde',
    code: 'SEC_SAUDE',
    type: 'secretariat',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['beta-gov'],
  },
  {
    id: 'org-secretaria-educacao',
    tenantId: 'org-oi-beta',
    name: 'Secretaria de Educação',
    code: 'SEC_EDUCACAO',
    type: 'secretariat',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['beta-gov'],
  },
  {
    id: 'org-secretaria-obras',
    tenantId: 'org-oi-beta',
    name: 'Secretaria de Obras',
    code: 'SEC_OBRAS',
    type: 'secretariat',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['beta-gov'],
  },
  {
    id: 'org-ouvidoria',
    tenantId: 'org-oi-beta',
    name: 'Ouvidoria',
    code: 'OUVIDORIA',
    type: 'sector',
    status: 'implementation',
    parentId: 'org-root-city-hall',
    productIds: ['portal-transparencia-inteligente'],
  },
];

export function getOrganizationUnitTypeLabel(type: OrganizationUnitType): string {
  const labels: Record<OrganizationUnitType, string> = {
    city_hall: 'Prefeitura',
    cabinet: 'Gabinete',
    secretariat: 'Secretaria',
    department: 'Departamento',
    directorate: 'Diretoria',
    coordination: 'Coordenação',
    sector: 'Setor',
    team: 'Equipe',
    commission: 'Comissão',
    council: 'Conselho',
    campaign: 'Campanha',
    nucleus: 'Núcleo',
    other: 'Outro',
  };

  return labels[type];
}

export function getOrganizationUnitStatusLabel(status: OrganizationUnitStatus): string {
  const labels: Record<OrganizationUnitStatus, string> = {
    active: 'Ativo',
    implementation: 'Em implantação',
    paused: 'Pausado',
    inactive: 'Inativo',
  };

  return labels[status];
}

export function buildOrganizationTree(units: OrganizationUnit[]): OrganizationTreeNode[] {
  const nodeById = new Map<string, OrganizationTreeNode>();

  units.forEach((unit) => {
    nodeById.set(unit.id, {
      ...unit,
      children: [],
      level: 0,
      path: [unit.id],
    });
  });

  const roots: OrganizationTreeNode[] = [];

  nodeById.forEach((node) => {
    if (node.parentId && nodeById.has(node.parentId)) {
      const parent = nodeById.get(node.parentId)!;
      node.level = parent.level + 1;
      node.path = [...parent.path, node.id];
      parent.children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

export function summarizeOrganization(units: OrganizationUnit[]): OrganizationSummary {
  const tree = buildOrganizationTree(units);
  const maxDepth = getMaxDepth(tree);

  return {
    totalUnits: units.length,
    activeUnits: units.filter((unit) => unit.status === 'active').length,
    implementationUnits: units.filter((unit) => unit.status === 'implementation').length,
    rootUnits: units.filter((unit) => !unit.parentId).length,
    maxDepth,
  };
}

function getMaxDepth(nodes: OrganizationTreeNode[]): number {
  if (nodes.length === 0) return 0;

  return Math.max(
    ...nodes.map((node) => {
      if (node.children.length === 0) return node.level;
      return getMaxDepth(node.children);
    }),
  );
}
