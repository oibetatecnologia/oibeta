export type ProductStatus = 'active' | 'embedded' | 'planned' | 'static_pending_migration';

export type ProductWorkspaceKey =
  | 'gov'
  | 'sistema1'
  | 'sistema5'
  | 'electoral'
  | 'licita'
  | 'commercial_radar'
  | 'none';

export interface ProductTabDefinition {
  id: string;
  label: string;
}

export interface ProductDefinition {
  id: string;
  slug: string;
  commercialName: string;
  technicalName: string;
  description: string;
  category: 'govtech' | 'electoral' | 'core' | 'analytics';
  workspaceKey: ProductWorkspaceKey;
  status: ProductStatus;
  commerciallyAvailable?: boolean;
  internallyAvailable?: boolean;
  tabs: ProductTabDefinition[];
}

export const PRODUCT_REGISTRY: ProductDefinition[] = [
  {
    id: 'radar-comercial',
    slug: 'radar-comercial',
    commercialName: 'Radar Comercial',
    technicalName: 'CommercialRadarWorkspace',
    description: 'Monitoramento, qualificação e priorização de oportunidades comerciais com rastreabilidade, aderência ao portfólio e integração ao CRM.',
    category: 'core',
    workspaceKey: 'commercial_radar',
    status: 'active',
    commerciallyAvailable: true,
    internallyAvailable: true,
    tabs: [{ id: 'commercial_radar', label: 'Radar Comercial' }],
  },
  {
    id: 'beta-gov',
    slug: 'beta-gov',
    commercialName: 'Beta Gov',
    technicalName: 'GovWorkspace',
    description: 'Gestão governamental, programas, projetos, metas, indicadores, resultados, governança e relatórios executivos.',
    category: 'govtech',
    workspaceKey: 'gov',
    status: 'active',
    commerciallyAvailable: true,
    tabs: [
      { id: 'beta_gov', label: 'Beta Gov' },
      { id: 'gov_dashboard', label: 'Dashboard' },
      { id: 'gov_programs', label: 'Programas' },
      { id: 'gov_projects', label: 'Projetos' },
      { id: 'gov_actions', label: 'Ações' },
      { id: 'gov_indicators', label: 'Indicadores' },
      { id: 'gov_goals', label: 'Metas' },
      { id: 'gov_results', label: 'Resultados' },
      { id: 'gov_governance', label: 'Governança' },
      { id: 'gov_reviews', label: 'Revisões' },
      { id: 'gov_reports', label: 'Relatórios' },
    ],
  },
  {
    id: 'portal-transparencia-inteligente',
    slug: 'portal-transparencia-inteligente',
    commercialName: 'Portal da Transparência Inteligente',
    technicalName: 'Sistema1Workspace',
    description: 'Transparência ativa, publicações oficiais, indicadores, relatórios públicos, Ouvidoria Digital e e-SIC.',
    category: 'govtech',
    workspaceKey: 'sistema1',
    status: 'active',
    commerciallyAvailable: true,
    tabs: [
      { id: 's1_dashboard', label: 'Dashboard' },
      { id: 's1_transparencia', label: 'Transparência' },
      { id: 's1_ouvidoria', label: 'Ouvidoria' },
      { id: 's1_esic', label: 'e-SIC' },
      { id: 's1_solicitacoes', label: 'Solicitações' },
      { id: 's1_indicadores', label: 'Indicadores' },
      { id: 's1_relatorios', label: 'Relatórios' },
    ],
  },
  {
    id: 'prefeitura-zero-papel',
    slug: 'prefeitura-zero-papel',
    commercialName: 'Prefeitura Zero Papel',
    technicalName: 'Sistema5Workspace',
    description: 'Protocolos, processos administrativos, workflow, GED, documentos, auditoria e relatórios.',
    category: 'govtech',
    workspaceKey: 'sistema5',
    status: 'active',
    commerciallyAvailable: true,
    tabs: [
      { id: 's5_dashboard', label: 'Dashboard' },
      { id: 's5_protocolos', label: 'Protocolos' },
      { id: 's5_processos', label: 'Processos' },
      { id: 's5_workflow', label: 'Workflow' },
      { id: 's5_ged', label: 'GED' },
      { id: 's5_documentos', label: 'Documentos' },
      { id: 's5_auditoria', label: 'Auditoria' },
      { id: 's5_relatorios', label: 'Relatórios' },
    ],
  },
  {
    id: 'beta-electoral',
    slug: 'beta-electoral',
    commercialName: 'Beta Electoral',
    technicalName: 'ElectoralWorkspace',
    description: 'Inteligência eleitoral, campanhas, territórios, coordenadores, convites, análises e relatórios.',
    category: 'electoral',
    workspaceKey: 'electoral',
    status: 'active',
    commerciallyAvailable: true,
    tabs: [
      { id: 'beta_electoral', label: 'Beta Electoral' },
      { id: 'electoral_dashboard', label: 'Dashboard' },
      { id: 'electoral_campaigns', label: 'Campanhas' },
      { id: 'electoral_territories', label: 'Territórios' },
      { id: 'electoral_coordinators', label: 'Coordenadores' },
      { id: 'electoral_invites', label: 'Convites' },
      { id: 'electoral_analyses', label: 'Análises' },
      { id: 'electoral_reports', label: 'Relatórios' },
    ],
  },
  {
    id: 'beta-licita',
    slug: 'beta-licita',
    commercialName: 'Beta Licita',
    technicalName: 'LicitaWorkspace',
    description: 'Licitações, oportunidades, certames, fornecedores, contratos, ARPs, compliance e relatórios.',
    category: 'govtech',
    workspaceKey: 'licita',
    status: 'active',
    commerciallyAvailable: true,
    tabs: [
      { id: 'beta_licita', label: 'Beta Licita' },
      { id: 'licita_dashboard', label: 'Dashboard' },
      { id: 'licita_opportunities', label: 'Oportunidades' },
      { id: 'licita_bids', label: 'Certames' },
      { id: 'licita_suppliers', label: 'Fornecedores' },
      { id: 'licita_contracts', label: 'Contratos' },
      { id: 'licita_arps', label: 'ARPs' },
      { id: 'licita_compliance', label: 'Compliance' },
      { id: 'licita_reports', label: 'Relatórios' },
    ],
  },
  {
    id: 'gestao-contratos-arp',
    slug: 'gestao-contratos-arp',
    commercialName: 'Gestão de Contratos e ARP',
    technicalName: 'LicitaWorkspace',
    description: 'Gestão de contratos administrativos, ARPs, fornecedores, fiscalização e compliance contratual.',
    category: 'govtech',
    workspaceKey: 'licita',
    status: 'embedded',
    tabs: [
      { id: 'licita_contracts', label: 'Contratos' },
      { id: 'licita_arps', label: 'ARPs' },
      { id: 'licita_compliance', label: 'Compliance' },
    ],
  },
  {
    id: 'beta-amendments',
    slug: 'beta-amendments',
    commercialName: 'Beta Amendments',
    technicalName: 'PendingWorkspaceMigration',
    description: 'Gestão de emendas impositivas, parlamentares, beneficiários, execução, evidências e prestação de contas.',
    category: 'govtech',
    workspaceKey: 'none',
    status: 'static_pending_migration',
    tabs: [],
  },
  {
    id: 'nucleo-operacional-beta',
    slug: 'nucleo-operacional-beta',
    commercialName: 'Núcleo Operacional Beta',
    technicalName: 'CorePlatform',
    description: 'CRM, agenda, tarefas, workflow, evidências, anexos, atividades e rotinas operacionais transversais.',
    category: 'core',
    workspaceKey: 'none',
    status: 'embedded',
    tabs: [],
  },
  {
    id: 'dashboard-bi-estrategico',
    slug: 'dashboard-bi-estrategico',
    commercialName: 'Dashboard BI Estratégico',
    technicalName: 'AnalyticsCapabilities',
    description: 'Indicadores, dashboards, relatórios, analytics e inteligência gerencial distribuída entre os produtos.',
    category: 'analytics',
    workspaceKey: 'none',
    status: 'embedded',
    tabs: [],
  },
];

export function getProductByTab(tabId: string): ProductDefinition | undefined {
  return PRODUCT_REGISTRY.find((product) => product.tabs.some((tab) => tab.id === tabId));
}

export function getProductWorkspaceKeyByTab(tabId: string): ProductWorkspaceKey | undefined {
  return getProductByTab(tabId)?.workspaceKey;
}

export function getActiveProducts(): ProductDefinition[] {
  return PRODUCT_REGISTRY.filter((product) => product.status === 'active');
}
