import React from 'react';
import {
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CircleDollarSign,
  Code2,
  Headphones,
  Landmark,
  Rocket,
  Search,
  Users,
} from 'lucide-react';

export type EnterpriseAreaKey =
  | 'commercial_radar'
  | 'crm'
  | 'enterprise_clients'
  | 'implementations'
  | 'finance'
  | 'development'
  | 'support'
  | 'beta_brain'
  | 'knowledge'
  | 'platform_products'
  | 'platform_monitoring'
  | 'client_environments';

interface EnterpriseAreaWorkspaceProps {
  area: EnterpriseAreaKey;
}

const AREA_CONFIG: Record<EnterpriseAreaKey, {
  eyebrow: string;
  title: string;
  description: string;
  nextAction: string;
  icon: React.ReactNode;
}> = {
  commercial_radar: {
    eyebrow: 'Oi Beta / Mercado',
    title: 'Radar Comercial',
    description: 'Monitore licitações, pregões, dispensas e oportunidades compatíveis com os produtos da Beta Platform.',
    nextAction: 'Conectar PNCP e cadastrar fontes de oportunidades.',
    icon: <Search className="w-5 h-5" />,
  },
  crm: {
    eyebrow: 'Oi Beta / Relacionamento',
    title: 'CRM',
    description: 'Gerencie leads, prefeituras, câmaras, contatos, propostas e histórico comercial da Oi Beta.',
    nextAction: 'Criar a primeira base de leads e clientes potenciais.',
    icon: <Briefcase className="w-5 h-5" />,
  },
  enterprise_clients: {
    eyebrow: 'Oi Beta / Clientes',
    title: 'Clientes',
    description: 'Acompanhe clientes, status comercial, produtos contratados e vínculo com implantações.',
    nextAction: 'Cadastrar o primeiro cliente real da Oi Beta.',
    icon: <Building2 className="w-5 h-5" />,
  },
  implementations: {
    eyebrow: 'Oi Beta / Entrega',
    title: 'Implantações',
    description: 'Controle setups, treinamentos, migrações, pendências e go-live dos clientes.',
    nextAction: 'Criar o fluxo padrão de implantação por produto.',
    icon: <Rocket className="w-5 h-5" />,
  },
  finance: {
    eyebrow: 'Oi Beta / Financeiro',
    title: 'Financeiro',
    description: 'Acompanhe setup, MRR, contratos, renovações, faturamento e inadimplência.',
    nextAction: 'Definir os indicadores financeiros iniciais da operação.',
    icon: <CircleDollarSign className="w-5 h-5" />,
  },
  development: {
    eyebrow: 'Oi Beta / Engenharia',
    title: 'Desenvolvimento',
    description: 'Organize sprints, builds, roadmap, decisões técnicas e aderência dos produtos ao mercado.',
    nextAction: 'Conectar tarefas da empresa ao roadmap comercial.',
    icon: <Code2 className="w-5 h-5" />,
  },
  support: {
    eyebrow: 'Oi Beta / Suporte',
    title: 'Suporte',
    description: 'Gerencie chamados, incidentes, SLA, dúvidas de clientes e acompanhamento pós-implantação.',
    nextAction: 'Criar o modelo inicial de chamados e prioridades.',
    icon: <Headphones className="w-5 h-5" />,
  },
  beta_brain: {
    eyebrow: 'Beta / Inteligência',
    title: 'Cérebro Operacional',
    description: 'A Beta acompanha a operação da Oi Beta, entende contexto, recomenda prioridades e apoia execução.',
    nextAction: 'Conectar a Beta ao Radar Comercial, CRM e desenvolvimento.',
    icon: <Bot className="w-5 h-5" />,
  },
  knowledge: {
    eyebrow: 'Beta / Conhecimento',
    title: 'Conhecimento',
    description: 'Base de conhecimento operacional, documentação, aprendizados, referências e inteligência institucional.',
    nextAction: 'Organizar os primeiros documentos oficiais da empresa.',
    icon: <Landmark className="w-5 h-5" />,
  },
  platform_products: {
    eyebrow: 'Plataforma / Produtos',
    title: 'Produtos',
    description: 'Administre o catálogo de produtos, serviços vendáveis e aderência comercial da Beta Platform.',
    nextAction: 'Relacionar produtos oficiais aos tipos reais de editais.',
    icon: <Users className="w-5 h-5" />,
  },
  platform_monitoring: {
    eyebrow: 'Plataforma / Monitoramento',
    title: 'Monitoramento',
    description: 'Acompanhe saúde operacional, módulos, integrações, builds, ambientes e alertas técnicos.',
    nextAction: 'Definir os primeiros indicadores técnicos da RC-1.',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  client_environments: {
    eyebrow: 'Clientes / Ambientes',
    title: 'Ambientes de Clientes',
    description: 'Acesse ambientes de prefeituras, câmaras, autarquias e demais clientes quando forem cadastrados.',
    nextAction: 'Nenhum cliente cadastrado ainda.',
    icon: <Building2 className="w-5 h-5" />,
  },
};

export default function EnterpriseAreaWorkspace({ area }: EnterpriseAreaWorkspaceProps) {
  const config = AREA_CONFIG[area];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="space-y-3 max-w-3xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-[var(--blue-accent)] font-black">
              {config.eyebrow}
            </span>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center">
                {config.icon}
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-[var(--text-main)] tracking-tight">
                {config.title}
              </h1>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {config.description}
            </p>
          </div>

          <span className="text-[10px] uppercase font-black font-mono px-3 py-1.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20 self-start">
            Em preparação
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-black text-[var(--text-main)]">Estado inicial limpo</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Esta área já está navegável e pronta para evoluir sem dados fictícios. A próxima etapa será criar o primeiro fluxo operacional real.
          </p>

          <div className="p-4 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
            <span className="text-[10px] uppercase font-mono font-black tracking-widest text-[var(--text-secondary)] block">
              Próxima ação recomendada
            </span>
            <p className="text-sm font-bold text-[var(--text-main)] mt-1">
              {config.nextAction}
            </p>
          </div>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-black text-indigo-300">Beta — contexto da área</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Oi, Douglas. Esta capacidade ainda está em preparação. Quando conectarmos dados reais, vou acompanhar esta área, gerar alertas, sugerir tarefas e apoiar decisões operacionais.
          </p>
        </div>
      </section>
    </div>
  );
}
