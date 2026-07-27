import React from 'react';
import { Play, UserCheck } from 'lucide-react';
import type { Campaign, Territory, AnalysisQueryParams } from './types';



interface ElectoralAnalysesProps {
  analysisType: string;
  setAnalysisType: (value: string) => void;
  analysisQueryParams: AnalysisQueryParams;
  setAnalysisQueryParams: React.Dispatch<React.SetStateAction<AnalysisQueryParams>>;
  campaigns: Campaign[];
  territories: Territory[];
  executingAnalysis: boolean;
  analysisResult: any;
  analysisSaveTitle: string;
  setAnalysisSaveTitle: (value: string) => void;
  savingAnalysis: boolean;
  executeAnalysisEngine: () => void;
  saveExecutedAnalysis: () => void;
  setAnalysisResult: (value: any) => void;
}

/**
 * ElectoralAnalyses
 *
 * Tela de análises do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar filtros de análise;
 * - renderizar resultado de execução;
 * - delegar execução e salvamento ao ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralAnalyses({
  analysisType,
  setAnalysisType,
  analysisQueryParams,
  setAnalysisQueryParams,
  campaigns,
  territories,
  executingAnalysis,
  analysisResult,
  analysisSaveTitle,
  setAnalysisSaveTitle,
  savingAnalysis,
  executeAnalysisEngine,
  saveExecutedAnalysis,
  setAnalysisResult,
}: ElectoralAnalysesProps) {
  return (
  <div className="space-y-6 animate-fade-in" id="electoral-tab-analyses">
    
    <div>
      <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Execução de Modelos Eleitorais Reais</h3>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5">Defina filtros operacionais baseados na geolocalização e dispare o motor de inteligência matemática.</p>
    </div>

    {/* Control Panel (Filtros e Botão Executar) - Bloco 7 requirement */}
    <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Model Picker */}
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Modelo de Análise</label>
          <select
            value={analysisType}
            onChange={(e) => {
              setAnalysisType(e.target.value);
              setAnalysisResult(null);
            }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs p-2.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
          >
            <option value="historical">Historical Evolution</option>
            <option value="ranking">Priority Ranking</option>
            <option value="opponents">Opponent Analysis</option>
            <option value="strategic">Strategic Analysis</option>
            <option value="projection">Evidence Based Projection</option>
          </select>
        </div>

        {/* Campaign Filter */}
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Filtrar por Campanha</label>
          <select
            value={analysisQueryParams.campaignId}
            onChange={(e) => setAnalysisQueryParams(prev => ({ ...prev, campaignId: e.target.value }))}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs p-2.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
          >
            <option value="">Todas de Projeto</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Territory Filter */}
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Filtrar por Território</label>
          <select
            value={analysisQueryParams.territoryId}
            onChange={(e) => setAnalysisQueryParams(prev => ({ ...prev, territoryId: e.target.value }))}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs p-2.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
          >
            <option value="">Todos</option>
            {territories.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
            ))}
          </select>
        </div>

        {/* Limit Parameter */}
        <div className="space-y-1.5 col-span-1">
          <label className="text-[10px] font-extrabold font-mono text-[var(--text-secondary)] uppercase">Limite de Amostra</label>
          <select
            value={analysisQueryParams.limit}
            onChange={(e) => setAnalysisQueryParams(prev => ({ ...prev, limit: e.target.value }))}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs p-2.5 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
          >
            <option value="5">5 registros</option>
            <option value="10">10 registros</option>
            <option value="25">25 registros</option>
            <option value="50">50 registros</option>
          </select>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={executeAnalysisEngine}
          disabled={executingAnalysis}
          className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-xs cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" />
          {executingAnalysis ? 'Executando Algoritmo...' : 'Executar Análise'}
        </button>
      </div>
    </div>

    {/* Area results - Bloco 7 requirement */}
    <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl min-h-[160px] flex flex-col justify-between">
      <div>
        <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider font-mono block">Resultado Consolidado</span>
        
        {!analysisResult && !executingAnalysis && (
          <div className="py-12 text-center text-xs text-[var(--text-secondary)] font-mono">
            Defina os filtros acima e clique em "Executar Análise" para processar dados reais.
          </div>
        )}

        {executingAnalysis && (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-xs text-[var(--text-secondary)] font-mono animate-pulse">
            <div className="w-5 h-5 border-t-2 border-rose-500 rounded-full animate-spin"></div>
            <span>Processando cruzamento no banco...</span>
          </div>
        )}

        {analysisResult && !executingAnalysis && (
          <div className="mt-4 p-4 border border-[var(--border-color)] bg-[var(--bg-card)]/50 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)]/30 pb-2">
              <span className="text-xs font-bold text-[var(--text-main)] font-mono">Módulos Computados Oficial</span>
              <span className="text-[10px] font-bold text-[var(--text-secondary)] font-mono">{analysisType.toUpperCase()} SUCCESS</span>
            </div>
            
            {/* Structure response print */}
            <pre className="text-[11px] font-mono leading-relaxed text-[var(--text-main)] overflow-x-auto whitespace-pre-wrap select-text selection:bg-[var(--blue-accent)]/30">
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {analysisResult && !executingAnalysis && (
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-auto flex items-center gap-2">
            <input
              type="text"
              value={analysisSaveTitle}
              onChange={(e) => setAnalysisSaveTitle(e.target.value)}
              placeholder="Nome da análise a salvar..."
              className="w-full sm:w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)] font-semibold"
            />
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2 justify-end">
            <button
              onClick={saveExecutedAnalysis}
              disabled={savingAnalysis || !analysisSaveTitle}
              className="w-full sm:w-auto flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-2 rounded-lg transition hover:opacity-95 cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {savingAnalysis ? 'Gravando...' : 'Salvar Relatório'}
            </button>
          </div>
        </div>
      )}
    </div>

  </div>
  );
}
