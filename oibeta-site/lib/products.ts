export type Product = {
  slug: string;
  name: string;
  eyebrow: string;
  audience: string[];
  summary: string;
  solves: string[];
  commercial: string;
  accent: 'violet' | 'blue' | 'cyan' | 'green' | 'amber' | 'rose';
  featured?: boolean;
};

export const products: Product[] = [
  {
    slug: 'inteligencia-eleitoral',
    name: 'Inteligência Eleitoral',
    eyebrow: 'ESTRATÉGIA • TERRITÓRIO • CRM POLÍTICO',
    audience: ['Candidatos', 'Partidos', 'Consultores políticos', 'Coordenações de campanha'],
    summary:
      'Plataforma para gestão estratégica de campanhas com inteligência territorial, histórico eleitoral, metas, apoiadores, lideranças e análise de prioridades.',
    solves: [
      'Histórico eleitoral',
      'Inteligência territorial',
      'Ranking de prioridades',
      'Análise de adversários',
      'CRM político',
      'Coordenadores e lideranças',
      'Metas e estratégia eleitoral',
    ],
    commercial: 'Licença SaaS para campanha, mandato e operação política.',
    accent: 'green',
    featured: true,
  },
  {
    slug: 'beta-gov',
    name: 'Beta Gov',
    eyebrow: 'GESTÃO PÚBLICA • GOVERNANÇA',
    audience: ['Prefeituras', 'Câmaras Municipais', 'Consórcios públicos', 'Autarquias', 'Fundações'],
    summary:
      'Gestão integrada de programas, projetos, metas, indicadores, resultados e governança para organizações públicas.',
    solves: [
      'Planejamento governamental',
      'Programas e projetos',
      'Metas e indicadores',
      'Monitoramento',
      'Governança',
      'Relatórios executivos',
    ],
    commercial: 'SaaS com implantação, treinamento e suporte.',
    accent: 'violet',
  },
  {
    slug: 'beta-licita',
    name: 'Beta Licita',
    eyebrow: 'LICITAÇÕES • CONTRATOS • COMPLIANCE',
    audience: ['Prefeituras', 'Câmaras', 'Autarquias', 'Consórcios', 'Empresas fornecedoras'],
    summary:
      'Ambiente para organizar licitações, contratos, atas de registro de preços, fiscalização, fornecedores e documentos.',
    solves: [
      'Gestão de licitações',
      'Contratos e ARP',
      'Fiscalização',
      'Compliance',
      'Fornecedores',
      'Certidões e propostas',
    ],
    commercial: 'Licenciamento SaaS para operação de licitações e contratos.',
    accent: 'blue',
  },
  {
    slug: 'beta-amendments',
    name: 'Beta Amendments',
    eyebrow: 'EMENDAS • RECURSOS • EXECUÇÃO',
    audience: ['Deputados', 'Senadores', 'Gabinetes', 'Prefeituras', 'Entidades'],
    summary:
      'Gestão de emendas parlamentares, beneficiários, destinações, execução, documentos, pendências e prestação de contas.',
    solves: [
      'Emendas parlamentares',
      'Captação de recursos',
      'Beneficiários e destinações',
      'Monitoramento da execução',
      'Documentos e evidências',
      'Prestação de contas',
    ],
    commercial: 'SaaS com implantação, configuração, treinamento e suporte.',
    accent: 'amber',
  },
  {
    slug: 'portal-transparencia',
    name: 'Portal da Transparência Inteligente',
    eyebrow: 'TRANSPARÊNCIA • DADOS ABERTOS',
    audience: ['Prefeituras', 'Câmaras', 'Autarquias'],
    summary:
      'Portal institucional para disponibilização de dados, publicações, indicadores, relatórios e informações públicas.',
    solves: [
      'Portal da Transparência',
      'Dados abertos',
      'Publicações',
      'Indicadores',
      'Relatórios públicos',
    ],
    commercial: 'Licença SaaS para órgãos públicos.',
    accent: 'cyan',
  },
  {
    slug: 'ouvidoria-digital',
    name: 'Ouvidoria Digital',
    eyebrow: 'ATENDIMENTO • PROTOCOLOS',
    audience: ['Prefeituras', 'Câmaras', 'Autarquias'],
    summary:
      'Canal digital para manifestações, protocolos, respostas e fluxos internos de atendimento ao cidadão.',
    solves: ['Ouvidoria', 'Manifestações', 'Protocolos', 'Respostas', 'Fluxos internos'],
    commercial: 'SaaS para atendimento e gestão de manifestações.',
    accent: 'rose',
  },
  {
    slug: 'prefeitura-zero-papel',
    name: 'Prefeitura Zero Papel',
    eyebrow: 'PROCESSOS • DOCUMENTOS • WORKFLOW',
    audience: ['Prefeituras', 'Câmaras', 'Autarquias'],
    summary:
      'Digitalização de processos administrativos com protocolo eletrônico, tramitação, workflow e gestão documental.',
    solves: [
      'Protocolo digital',
      'Processos administrativos',
      'Tramitação',
      'Workflow',
      'Gestão documental',
    ],
    commercial: 'Licença SaaS para transformação digital administrativa.',
    accent: 'green',
  },
  {
    slug: 'nucleo-operacional',
    name: 'Núcleo Operacional Beta',
    eyebrow: 'CRM • AGENDA • OPERAÇÃO',
    audience: ['Empresas', 'Associações', 'Cooperativas', 'Escritórios', 'Organizações públicas'],
    summary:
      'Núcleo operacional com CRM, agenda, tarefas, workflow, evidências, anexos e histórico de atividades.',
    solves: ['CRM', 'Agenda', 'Tarefas', 'Workflow', 'Evidências', 'Anexos', 'Atividades'],
    commercial: 'Pode ser contratado como módulo independente.',
    accent: 'blue',
  },
  {
    slug: 'bi-estrategico',
    name: 'Dashboard BI Estratégico',
    eyebrow: 'INDICADORES • ANALYTICS • DADOS',
    audience: ['Prefeituras', 'Empresas', 'Consórcios', 'Campanhas'],
    summary:
      'Dashboards, indicadores, analytics e engenharia de dados para leitura executiva e acompanhamento de resultados.',
    solves: ['Indicadores', 'Dashboards', 'Analytics', 'Engenharia de dados'],
    commercial: 'Projeto SaaS/BI ajustado ao contexto da organização.',
    accent: 'violet',
  },
  {
    slug: 'contratos-arp',
    name: 'Gestão de Contratos e ARP',
    eyebrow: 'CONTRATOS • FISCALIZAÇÃO • ARP',
    audience: ['Prefeituras', 'Câmaras', 'Autarquias'],
    summary:
      'Gestão de contratos administrativos, fiscalização, medições, atas de registro de preços, consumo e caronas.',
    solves: ['Contratos', 'Fiscalização', 'Medições', 'ARP', 'Consumo', 'Caronas'],
    commercial: 'Licenciamento SaaS para gestão contratual pública.',
    accent: 'amber',
  },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
