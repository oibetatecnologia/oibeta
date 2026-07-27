import React from 'react';
import { Landmark, Plus, RefreshCw } from 'lucide-react';

interface GovHeaderProps {
  loading: boolean;
  activeTab: string;
  onRefresh: () => void;
  onCreate: (type: string) => void;
}

const CREATE_TYPE_BY_TAB: Record<string, string> = {
  gov_programs: 'program',
  gov_projects: 'project',
  gov_actions: 'action',
  gov_goals: 'goal',
};

/**
 * GovHeader
 *
 * Cabeçalho oficial do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar título, descrição e ações globais;
 * - delegar refresh e criação ao GovWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovHeader({
  loading,
  activeTab,
  onRefresh,
  onCreate,
}: GovHeaderProps) {
  const createType = CREATE_TYPE_BY_TAB[activeTab];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-color)] pb-4">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold font-sans text-[var(--text-main)] flex items-center gap-2">
          <Landmark className="w-6 h-6 text-indigo-400" /> Beta Gov™ — Gestão Pública Estratégica
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Acompanhamento operacional, relatórios, indicadores e sincronismo inter-secretarias de metas.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="p-2 bg-[var(--bg-card)] hover:bg-[var(--border-color)]/25 text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-color)] rounded-lg transition"
          title="Atualizar Dados Reais"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {createType && (
          <button
            onClick={() => onCreate(createType)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Registro
          </button>
        )}
      </div>
    </div>
  );
}
