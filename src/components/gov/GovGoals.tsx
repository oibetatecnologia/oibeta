import React from 'react';
import { Target } from 'lucide-react';
import DataTable, { DataTableColumn } from '../shared/tables/DataTable';
import StatusBadge from '../shared/badges/StatusBadge';

interface GovGoalsProps {
  loading: boolean;
  goals: any[];
  getIndicatorName: (id: string) => string;
  onView: (item: any) => void;
}

/**
 * GovGoals
 *
 * Lista de metas do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar a tabela de metas;
 * - exibir estados de loading e vazio;
 * - delegar ações para o GovWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovGoals({
  loading,
  goals,
  getIndicatorName,
  onView,
}: GovGoalsProps) {
  const columns: DataTableColumn<any>[] = [
    {
      key: 'meta',
      label: 'Meta Executiva / Descrição',
      className: 'font-semibold text-[var(--text-main)]',
      render: (item) => item.metadata?.descricaoMeta || 'N/A',
    },
    {
      key: 'indicador',
      label: 'Indicador de Ligação',
      className: 'text-indigo-400',
      render: (item) => getIndicatorName(item.indicatorId),
    },
    {
      key: 'valorAlvo',
      label: 'Valor Alvo',
      className: 'font-mono font-bold text-emerald-400',
      render: (item) => item.goalValue,
    },
    {
      key: 'prazo',
      label: 'Prazo',
      className: 'text-[var(--text-secondary)] font-mono',
      render: (item) => item.metadata?.prazo || '2026-12-31',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <StatusBadge
          status={item.status}
          variant={item.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'}
        />
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item) => (
        <button
          onClick={() => onView(item)}
          className="p-1 px-2.5 bg-[var(--bg-main)] hover:bg-[var(--border-color)]/25 text-[var(--text-secondary)] hover:text-indigo-400 border border-[var(--border-color)] rounded transition text-[10px] font-bold"
        >
          Visualizar
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={goals}
      loading={loading}
      loadingText="Carregando metas..."
      getRowKey={(item) => item.id}
      emptyState={
        <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
          <Target className="w-12 h-12 text-[var(--text-secondary)]/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-main)]">Nenhum dado encontrado.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Sem metas estratégicas criadas.</p>
        </div>
      }
    />
  );
}
