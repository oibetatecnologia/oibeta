import React from 'react';
import {
  ArrowRight,
  FileText,
  Globe,
  Mail,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import type { Campaign, Territory, Coordinator, DashboardMetrics } from './types';

interface ElectoralDashboardProps {
  dashboardMetrics: DashboardMetrics;
  campaigns: Campaign[];
  territories: Territory[];
  coordinators: Coordinator[];
  onNavigate: (tabId: string) => void;
}

/**
 * ElectoralDashboard
 *
 * Dashboard executivo do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar indicadores principais;
 * - renderizar snapshot operacional;
 * - delegar navegação ao ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralDashboard({
  dashboardMetrics,
  campaigns,
  territories,
  coordinators,
  onNavigate,
}: ElectoralDashboardProps) {
  const handleSubTabChange = onNavigate;

  return (
  <div className="space-y-6">
    
    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {[
        { label: 'Total de Campanhas', value: dashboardMetrics.totalCampaigns, icon: Target, isZero: dashboardMetrics.totalCampaigns === 0 },
        { label: 'Total de Territórios', value: dashboardMetrics.totalTerritories, icon: Globe, isZero: dashboardMetrics.totalTerritories === 0 },
        { label: 'Total de Coordenadores', value: dashboardMetrics.totalCoordinators, icon: Users, isZero: dashboardMetrics.totalCoordinators === 0 },
        { label: 'Total de Convites', value: dashboardMetrics.totalInvites, icon: Mail, isZero: dashboardMetrics.totalInvites === 0 },
        { label: 'Análises Salvas', value: dashboardMetrics.totalAnalyses, icon: FileText, isZero: dashboardMetrics.totalAnalyses === 0 },
      ].map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between shadow-sm hover:border-[var(--blue-accent)]/30 transition duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider font-mono">{stat.label}</span>
              <Icon className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-4 flex items-baseline">
              <span className={`text-2xl font-black text-[var(--text-main)] font-sans tracking-tight`}>
                {stat.isZero ? 'NO_DATA' : stat.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>

    {/* Memory snapshot and actionable links */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Visual Status Card */}
      <div className="lg:col-span-2 p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Consolidação Operacional de Inteligência</h3>
        </div>
        
        {campaigns.length === 0 && territories.length === 0 && coordinators.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--border-color)] rounded-xl">
            <p className="text-xs text-[var(--text-secondary)] font-sans">Nenhum dado integrado à organização Oi Beta.</p>
            <p className="text-[11px] text-[var(--text-secondary)] font-sans mt-1">Utilize as abas acima para registrar suas primeiras campanhas, territórios e coordenadores.</p>
          </div>
        ) : (
          <div className="space-y-4 text-xs font-sans leading-relaxed text-[var(--text-secondary)]">
            {campaigns.length > 0 && (
              <div className="p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1">
                <span className="font-bold text-[var(--text-main)] font-mono text-[10px] text-rose-400 block uppercase">Mapeamento de Campanhas</span>
                <p>
                  Organização ativa monitorando <strong>{campaigns.length}</strong> campanhas políticas integradas. Campanhas ativas operando no Distrito Municipal.
                </p>
              </div>
            )}
            
            {territories.length > 0 && (
              <div className="p-3.5 bg-[var(--blue-accent)]/5 border border-[var(--blue-accent)]/10 rounded-xl space-y-1">
                <span className="font-bold text-[var(--text-main)] font-mono text-[10px] text-[var(--blue-accent)] block uppercase">Hierarquia Territorial</span>
                <p>
                  Mapeamento consolidado de <strong>{territories.length}</strong> territórios estruturados geograficamente (regiões, UFs, municípios e zonas prioritárias).
                </p>
              </div>
            )}

            {coordinators.length > 0 && (
              <div className="p-3.5 bg-purple-500/5 border border-purple-505/10 rounded-xl space-y-1">
                <span className="font-bold text-[var(--text-main)] font-mono text-[10px] text-purple-400 block uppercase">Gestão de Coordenadores</span>
                <p>
                  Rede de ação civil contendo <strong>{coordinators.length}</strong> oficiais eleitorais ativos reportando sinal de avanço e cobertura operacional.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Operations side control */}
      <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl relative overflow-hidden flex flex-col justify-between">
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">Acesso Direto de Workspace</h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Gerencie convites com autenticação ou compute diagnósticos de forma imediata.
          </p>
        </div>
        
        <div className="mt-6 space-y-2">
          <button 
            onClick={() => handleSubTabChange('campaigns')}
            className="w-full flex items-center justify-between text-left p-3 rounded-lg border border-[var(--border-color)] hover:border-[var(--blue-accent)]/30 hover:bg-[var(--blue-accent)]/5 text-xs text-[var(--text-main)] font-bold transition cursor-pointer"
          >
            <span>Gerenciar Campanhas</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
          <button 
            onClick={() => handleSubTabChange('coordinators')}
            className="w-full flex items-center justify-between text-left p-3 rounded-lg border border-[var(--border-color)] hover:border-[var(--blue-accent)]/30 hover:bg-[var(--blue-accent)]/5 text-xs text-[var(--text-main)] font-bold transition cursor-pointer"
          >
            <span>Membros e Coordenadores</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
          <button 
            onClick={() => handleSubTabChange('analyses')}
            className="w-full flex items-center justify-between text-left p-3 rounded-lg border border-[var(--border-color)] hover:border-[var(--blue-accent)]/30 hover:bg-[var(--blue-accent)]/5 text-xs text-[var(--text-main)] font-bold transition cursor-pointer"
          >
            <span>Executar Análises Reais</span>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

    </div>

  </div>
  );
}
