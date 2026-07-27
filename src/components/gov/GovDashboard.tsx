import React from 'react';
import { Layers, Briefcase, CheckSquare, Activity, Target, CheckCircle2, FileText, ArrowRight, Gauge } from 'lucide-react';
import { useGovDashboard } from './hooks/useGovDashboard';

interface GovDashboardProps {
  loading: boolean;
  programs: any[];
  projectsData: any[];
  actions: any[];
  indicators: any[];
  goals: any[];
  results: any[];
  reports: any[];
  progSummary: any;
  perfSummary: any;
  setActiveTab: (tab: string) => void;
}

export default function GovDashboard({
  loading,
  programs,
  projectsData,
  actions,
  indicators,
  goals,
  results,
  reports,
  progSummary,
  perfSummary,
  setActiveTab,
}: GovDashboardProps) {
  const dashboard = useGovDashboard({
    programs,
    projectsData,
    actions,
    indicators,
    goals,
    results,
    reports,
    progSummary,
    perfSummary,
  });

  return (
<div className="space-y-6">
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
    
    {/* CARD 1: Programas */}
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between">
      <span className="absolute top-2 right-2 text-indigo-500/20"><Layers className="w-8 h-8" /></span>
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Programas</p>
      <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">
        {loading ? '...' : dashboard.programsLabel}
      </h3>
      <button onClick={() => setActiveTab('gov_programs')} className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-2">
        Acessar <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>

    {/* CARD 2: Projetos */}
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between">
      <span className="absolute top-2 right-2 text-indigo-500/20"><Briefcase className="w-8 h-8" /></span>
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Projetos</p>
      <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">
        {loading ? '...' : dashboard.projectsLabel}
      </h3>
      <button onClick={() => setActiveTab('gov_projects')} className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-2">
        Acessar <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>

    {/* CARD 3: Ações */}
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between">
      <span className="absolute top-2 right-2 text-indigo-500/20"><CheckSquare className="w-8 h-8" /></span>
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Ações</p>
      <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">
        {loading ? '...' : dashboard.actionsLabel}
      </h3>
      <button onClick={() => setActiveTab('gov_actions')} className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-2">
        Acessar <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>

    {/* CARD 4: Indicadores */}
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between">
      <span className="absolute top-2 right-2 text-indigo-500/20"><Activity className="w-8 h-8" /></span>
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Indicadores</p>
      <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">
        {loading ? '...' : dashboard.indicatorsLabel}
      </h3>
      <button onClick={() => setActiveTab('gov_indicators')} className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-2">
        Acessar <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>

    {/* CARD 5: Metas */}
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between">
      <span className="absolute top-2 right-2 text-indigo-500/20"><Target className="w-8 h-8" /></span>
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Metas</p>
      <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">
        {loading ? '...' : dashboard.goalsLabel}
      </h3>
      <button onClick={() => setActiveTab('gov_goals')} className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-2">
        Acessar <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>

    {/* CARD 6: Resultados */}
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between">
      <span className="absolute top-2 right-2 text-indigo-500/20"><CheckCircle2 className="w-8 h-8" /></span>
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Resultados</p>
      <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">
        {loading ? '...' : dashboard.resultsLabel}
      </h3>
      <button onClick={() => setActiveTab('gov_results')} className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-2">
        Acessar <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>

    {/* CARD 7: Relatórios */}
    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between">
      <span className="absolute top-2 right-2 text-indigo-500/20"><FileText className="w-8 h-8" /></span>
      <p className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Relatórios</p>
      <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">
        {loading ? '...' : dashboard.reportsLabel}
      </h3>
      <button onClick={() => setActiveTab('gov_reports')} className="text-[10px] text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-2">
        Acessar <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>

  </div>

  {/* DYNAMIC BACKEND PERFORMANCE STATUS */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    
    {/* Saúde do Programa Executivo */}
    <div className="lg:col-span-2 p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <h4 className="text-xs uppercase font-mono font-bold text-[#f59e0b] flex items-center gap-1.5">
          <Gauge className="w-4 h-4" /> Desempenho e Cobertura Pública Reais
        </h4>
        <span className="text-[10px] py-0.5 px-2 bg-indigo-500/10 text-indigo-400 font-bold rounded">Real-Time Data</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 bg-[var(--bg-sidebar)]/55 border border-[var(--border-color)]/50 rounded-lg">
          <p className="text-[10px] font-mono text-[var(--text-secondary)]">TAXA DE SUCESSO DE METAS</p>
          <p className="text-lg font-bold text-[var(--text-main)] mt-1">
            {dashboard.programSuccessRateLabel}
          </p>
        </div>
        <div className="p-3.5 bg-[var(--bg-sidebar)]/55 border border-[var(--border-color)]/50 rounded-lg">
          <p className="text-[10px] font-mono text-[var(--text-secondary)]">COMPLIANCE COMPORTAMENTAL</p>
          <p className="text-lg font-bold text-[var(--text-main)] mt-1">
            {dashboard.complianceRatioLabel}
          </p>
        </div>
        <div className="p-3.5 bg-[var(--bg-sidebar)]/55 border border-[var(--border-color)]/50 rounded-lg">
          <p className="text-[10px] font-mono text-[var(--text-secondary)]">ORGANIZAÇÕES ENVOLVIDAS</p>
          <p className="text-lg font-bold text-[var(--text-main)] mt-1">1 PM / 3 Autarquias</p>
        </div>
      </div>

      <div className="space-y-2 mt-4 pt-2 border-t border-[var(--border-color)]/40 text-xs">
        <div className="flex justify-between items-center text-[var(--text-secondary)]">
          <span>Iniciativas Públicas Concluídas</span>
          <span className="font-mono text-[var(--text-main)]">
            {loading ? '...' : dashboard.completedProjectsLabel}
          </span>
        </div>
        <div className="flex justify-between items-center text-[var(--text-secondary)]">
          <span>Ações em Período Crítico</span>
          <span className="font-mono text-[var(--text-main)]">
            {loading ? '...' : `${actions.filter(a => a.status === 'CRITICAL' || a.status === 'DELAYED').length}`}
          </span>
        </div>
      </div>
    </div>

    {/* Identidade Visual da Beta */}
    <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">MOMENTO OPERACIONAL</span>
        </div>
        <h4 className="text-base font-bold text-[var(--text-main)]">Sistema SIPO Ativo</h4>
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
          Workspace Gov™ consolidando trâmites analíticos de secretarias municipais e monitoramento de desempenho sem intervenção de score heurístico.
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-color)]/50 space-y-1">
        <p className="text-[10px] font-mono text-[var(--text-secondary)]">PREFEITURA DE CONTRATAÇÃO</p>
        <p className="text-xs font-semibold text-indigo-400">Gabinete Municipal Integrado</p>
      </div>
    </div>

  </div>
</div>
  );
}
