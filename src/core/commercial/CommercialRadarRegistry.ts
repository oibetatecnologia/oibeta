export type ProcurementOpportunityType =
  | 'pregao'
  | 'dispensa'
  | 'concorrencia'
  | 'credenciamento'
  | 'chamamento'
  | 'ata_registro_precos'
  | 'inexigibilidade';

export type ProcurementSourceKey =
  | 'pncp'
  | 'compras_gov'
  | 'portal_compras_publicas'
  | 'bll'
  | 'bbm'
  | 'licitanet'
  | 'state_portal'
  | 'municipal_portal';

export type BetaMarketServiceStatus = 'ready_to_audit' | 'mapped' | 'in_development' | 'sellable';

export interface ProcurementOpportunityTypeDefinition {
  id: ProcurementOpportunityType;
  label: string;
  description: string;
  typicalObjects: string[];
}

export interface ProcurementSourceDefinition {
  id: ProcurementSourceKey;
  label: string;
  description: string;
  status: 'not_connected' | 'planned' | 'connected';
}

export interface BetaMarketServiceDefinition {
  id: string;
  productId: string;
  serviceNumber?: number;
  commercialName: string;
  shortName: string;
  targetBuyers: string[];
  /** Termos específicos que comprovam aderência ao produto. */
  anchorKeywords: string[];
  /** Termos auxiliares. Nunca geram aderência isoladamente. */
  supportingKeywords: string[];
  /** Termos que indicam objetos fora do escopo principal do produto. */
  exclusionKeywords?: string[];
  /** Mantido para apresentação e compatibilidade com serviços existentes. */
  procurementKeywords: string[];
  opportunityTypes: ProcurementOpportunityType[];
  minimumMatchScore?: number;
  status: BetaMarketServiceStatus;
}

export const PROCUREMENT_OPPORTUNITY_TYPES: ProcurementOpportunityTypeDefinition[] = [
  {
    id: 'pregao',
    label: 'Pregão',
    description: 'Contratações competitivas para bens e serviços comuns, normalmente com disputa eletrônica.',
    typicalObjects: ['licenciamento de software', 'plataforma SaaS', 'implantação e suporte técnico'],
  },
  {
    id: 'dispensa',
    label: 'Dispensa',
    description: 'Contratações diretas por valor ou hipóteses legais específicas, muito comuns em SaaS GovTech de menor porte.',
    typicalObjects: ['modernização administrativa', 'portal da transparência', 'gestão de contratos'],
  },
  {
    id: 'concorrencia',
    label: 'Concorrência',
    description: 'Procedimentos competitivos para contratações de maior complexidade ou valor.',
    typicalObjects: ['plataforma integrada de gestão pública', 'solução corporativa municipal'],
  },
  {
    id: 'credenciamento',
    label: 'Credenciamento',
    description: 'Modelo usado quando a administração pode contratar múltiplos interessados que atendam critérios definidos.',
    typicalObjects: ['serviços tecnológicos especializados', 'fornecedores de plataforma'],
  },
  {
    id: 'chamamento',
    label: 'Chamamento',
    description: 'Chamadas públicas para seleção de parceiros, projetos ou soluções em contexto específico.',
    typicalObjects: ['soluções de inovação', 'parcerias institucionais', 'projetos-piloto'],
  },
  {
    id: 'ata_registro_precos',
    label: 'Ata / Registro de Preços',
    description: 'Formação de preço registrado para contratações futuras, podendo envolver licenças, implantação e suporte.',
    typicalObjects: ['registro de preços para sistemas', 'serviços continuados de tecnologia'],
  },
  {
    id: 'inexigibilidade',
    label: 'Inexigibilidade',
    description: 'Contratação direta quando houver inviabilidade de competição, especialmente em hipóteses técnicas bem justificadas.',
    typicalObjects: ['solução singular', 'tecnologia especializada', 'serviço técnico exclusivo'],
  },
];

export const PROCUREMENT_SOURCES: ProcurementSourceDefinition[] = [
  {
    id: 'pncp',
    label: 'PNCP',
    description: 'Portal Nacional de Contratações Públicas.',
    status: 'planned',
  },
  {
    id: 'compras_gov',
    label: 'Compras.gov.br',
    description: 'Portal federal de compras públicas.',
    status: 'not_connected',
  },
  {
    id: 'portal_compras_publicas',
    label: 'Portal de Compras Públicas',
    description: 'Fonte privada recorrente em municípios e câmaras.',
    status: 'not_connected',
  },
  {
    id: 'bll',
    label: 'BLL',
    description: 'Bolsa de Licitações e Leilões.',
    status: 'not_connected',
  },
  {
    id: 'bbm',
    label: 'BBM',
    description: 'Bolsa Brasileira de Mercadorias.',
    status: 'not_connected',
  },
  {
    id: 'licitanet',
    label: 'Licitanet',
    description: 'Portal privado de pregões e dispensas eletrônicas.',
    status: 'not_connected',
  },
  {
    id: 'state_portal',
    label: 'Portais estaduais',
    description: 'Portais de compras dos estados.',
    status: 'not_connected',
  },
  {
    id: 'municipal_portal',
    label: 'Portais municipais',
    description: 'Portais próprios de municípios, câmaras, autarquias e consórcios.',
    status: 'not_connected',
  },
];

export const BETA_MARKET_SERVICES: BetaMarketServiceDefinition[] = [
  {
    id: 'radar-comercial-beta',
    productId: 'radar-comercial',
    commercialName: 'Radar Comercial Inteligente',
    shortName: 'Radar Comercial',
    targetBuyers: ['Empresas fornecedoras', 'Consultorias', 'Escritórios', 'Entidades públicas'],
    anchorKeywords: ['radar comercial', 'monitoramento de oportunidades', 'inteligência comercial', 'prospecção pública', 'monitoramento de editais'],
    supportingKeywords: ['licitações', 'editais', 'oportunidades comerciais', 'prospecção', 'mercado público'],
    procurementKeywords: ['radar comercial', 'monitoramento de oportunidades', 'inteligência comercial', 'editais e licitações', 'prospecção pública'],
    opportunityTypes: ['pregao', 'dispensa', 'concorrencia', 'chamamento'],
    minimumMatchScore: 58,
    status: 'sellable',
  },
  {
    id: 'sistema-1-transparencia-ouvidoria-esic',
    productId: 'portal-transparencia-inteligente',
    serviceNumber: 1,
    commercialName: 'Portal da Transparência Inteligente e Ouvidoria (e-SIC)',
    shortName: 'Transparência + Ouvidoria',
    targetBuyers: ['Prefeituras', 'Câmaras Municipais', 'Consórcios', 'Iprems'],
    anchorKeywords: ['portal da transparência', 'ouvidoria digital', 'e-sic', 'serviço de informação ao cidadão', 'acesso à informação'],
    supportingKeywords: ['lai', 'transparência pública', 'pedido de informação', 'ouvidoria', 'publicação de dados públicos'],
    procurementKeywords: ['portal da transparência', 'ouvidoria', 'e-SIC', 'LAI', 'LGPD', 'governo digital'],
    opportunityTypes: ['pregao', 'dispensa', 'concorrencia'],
    minimumMatchScore: 58,
    status: 'mapped',
  },
  {
    id: 'sistema-2-emendas-impositivas',
    productId: 'beta-amendments',
    serviceNumber: 2,
    commercialName: 'Plataforma de Gestão de Emendas Impositivas Parlamentares',
    shortName: 'Emendas Impositivas',
    targetBuyers: ['Câmaras Municipais', 'Prefeituras'],
    anchorKeywords: ['emendas impositivas', 'emendas parlamentares', 'gestão de emendas', 'execução de emendas'],
    supportingKeywords: ['beneficiários de emendas', 'prestação de contas', 'execução orçamentária', 'parecer técnico'],
    procurementKeywords: ['emendas impositivas', 'emendas parlamentares', 'execução orçamentária', 'parecer técnico'],
    opportunityTypes: ['pregao', 'dispensa', 'concorrencia'],
    minimumMatchScore: 58,
    status: 'ready_to_audit',
  },
  {
    id: 'sistema-3-bi-estrategico',
    productId: 'dashboard-bi-estrategico',
    serviceNumber: 3,
    commercialName: 'Dashboard de BI Estratégico e Engenharia de Dados',
    shortName: 'BI Estratégico',
    targetBuyers: ['Secretarias', 'Gabinetes', 'Planejamento', 'Controladorias'],
    anchorKeywords: ['business intelligence', 'dashboard gerencial', 'dashboard estratégico', 'painel de indicadores', 'engenharia de dados', 'data warehouse', 'analytics', 'plataforma de coleta tratamento e visualização de dados', 'plataforma tecnológica de dados'],
    supportingKeywords: ['indicadores gerenciais', 'integração de dados', 'monitoramento de metas', 'gestão estratégica', 'painel gerencial', 'visualização de dados', 'tratamento de dados'],
    exclusionKeywords: ['aquisição de equipamentos', 'gêneros alimentícios', 'material hospitalar', 'medicamentos', 'material de expediente', 'locação de veículos'],
    procurementKeywords: ['business intelligence', 'dashboard gerencial', 'painel de indicadores', 'engenharia de dados', 'analytics'],
    opportunityTypes: ['pregao', 'dispensa', 'concorrencia'],
    minimumMatchScore: 60,
    status: 'ready_to_audit',
  },
  {
    id: 'sistema-4-contratos-arp',
    productId: 'gestao-contratos-arp',
    serviceNumber: 4,
    commercialName: 'Sistema de Gestão de Contratos e Atas de Registro de Preços',
    shortName: 'Contratos e ARP',
    targetBuyers: ['Compras', 'Licitações', 'Controladorias', 'Procuradorias'],
    anchorKeywords: ['sistema de gestão de contratos', 'gestão de contratos administrativos', 'gestão de atas de registro de preços', 'controle de contratos', 'fiscalização contratual'],
    supportingKeywords: ['ata de registro de preços', 'arp', 'aditivos contratuais', 'vigência contratual', 'fiscal de contrato'],
    procurementKeywords: ['gestão de contratos', 'atas de registro de preços', 'ARP', 'fiscalização contratual', 'aditivos'],
    opportunityTypes: ['pregao', 'dispensa', 'ata_registro_precos'],
    minimumMatchScore: 58,
    status: 'mapped',
  },
  {
    id: 'sistema-5-zero-papel',
    productId: 'prefeitura-zero-papel',
    serviceNumber: 5,
    commercialName: 'Protocolo Digital e Tramitação de Processos (Prefeitura Zero Papel)',
    shortName: 'Prefeitura Zero Papel',
    targetBuyers: ['Prefeituras', 'Câmaras', 'Autarquias', 'Iprems'],
    anchorKeywords: ['protocolo digital', 'processo administrativo eletrônico', 'processo eletrônico', 'tramitação eletrônica', 'gestão eletrônica de documentos', 'prefeitura zero papel'],
    supportingKeywords: ['ged', 'assinatura digital', 'workflow documental', 'documento eletrônico', 'digitalização de processos'],
    procurementKeywords: ['protocolo digital', 'processo eletrônico', 'zero papel', 'tramitação', 'assinatura digital', 'Gov.br'],
    opportunityTypes: ['pregao', 'dispensa', 'concorrencia'],
    minimumMatchScore: 58,
    status: 'mapped',
  },
  {
    id: 'sistema-6-ppa-loa-inteligente',
    productId: 'beta-gov',
    serviceNumber: 6,
    commercialName: 'Monitoramento de Metas e Plano de Governo (PPA / LOA Inteligente)',
    shortName: 'PPA / LOA Inteligente',
    targetBuyers: ['Gabinetes', 'Planejamento', 'Finanças', 'Controladorias'],
    anchorKeywords: ['plano plurianual', 'ppa', 'lei de diretrizes orçamentárias', 'ldo', 'lei orçamentária anual', 'loa', 'monitoramento de plano de governo'],
    supportingKeywords: ['metas governamentais', 'planejamento estratégico governamental', 'programas de governo', 'execução orçamentária', 'indicadores de governo'],
    procurementKeywords: ['PPA', 'LDO', 'LOA', 'plano de governo', 'metas governamentais', 'planejamento estratégico'],
    opportunityTypes: ['pregao', 'dispensa', 'concorrencia'],
    minimumMatchScore: 58,
    status: 'ready_to_audit',
  },
  {
    id: 'beta-licita-gestao-compras',
    productId: 'beta-licita',
    commercialName: 'Beta Licita — Gestão Inteligente de Compras Públicas',
    shortName: 'Beta Licita',
    targetBuyers: ['Prefeituras', 'Câmaras', 'Autarquias', 'Setores de Compras e Licitações'],
    anchorKeywords: ['sistema de licitações', 'gestão de compras públicas', 'plataforma de compras públicas', 'gestão de processos licitatórios', 'sistema de pregão eletrônico', 'sistema saas de pesquisa e comparação de preços públicos', 'sistema de pesquisa de preços públicos'],
    supportingKeywords: ['planejamento de contratações', 'pca', 'etp', 'termo de referência', 'pesquisa de preços', 'comparação de preços públicos', 'processo licitatório', 'compras e licitações'],
    procurementKeywords: ['sistema de licitações', 'gestão de compras públicas', 'processos licitatórios', 'PCA', 'ETP', 'termo de referência'],
    opportunityTypes: ['pregao', 'dispensa', 'concorrencia'],
    minimumMatchScore: 58,
    status: 'mapped',
  },
];

export function getOpportunityTypeLabel(type: ProcurementOpportunityType): string {
  return PROCUREMENT_OPPORTUNITY_TYPES.find((item) => item.id === type)?.label || type;
}

export function getMarketServiceStatusLabel(status: BetaMarketServiceStatus): string {
  const labels: Record<BetaMarketServiceStatus, string> = {
    ready_to_audit: 'A auditar',
    mapped: 'Mapeado',
    in_development: 'Em desenvolvimento',
    sellable: 'Vendável',
  };

  return labels[status];
}
