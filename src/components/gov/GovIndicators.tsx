import React from 'react';
import { Activity } from 'lucide-react';
import DataTable, { DataTableColumn } from '../shared/tables/DataTable';

interface GovIndicatorsProps {
  loading: boolean;
  indicators: any[];
  goals: any[];
  onView: (item: any) => void;
}

/**
 * GovIndicators
 *
 * Lista de indicadores do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar a tabela de indicadores;
 * - exibir estados de loading e vazio;
 * - delegar ações para o GovWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovIndicators({
  loading,
  indicators,
  goals,
  onView,
}: GovIndicatorsProps) {
  const columns: DataTableColumn<any>[] = [
    {
      key: 'indicador',
      label: 'Indicador',
      render: (item) => (
        <div className="font-semibold text-[var(--text-main)]">
          <div>{item.indicatorName || item.name}</div>
          <div className="text-[10px] text-[var(--text-secondary)] font-normal">{item.description}</div>
        </div>
      ),
    },
    {
      key: 'unidade',
      label: 'Unidade',
      className: 'font-mono text-[var(--text-secondary)] font-semibold',
      render: (item) => item.unit || 'Percentual (%)',
    },
    {
      key: 'ultimoValor',
      label: 'Último Valor Registrado',
      className: 'font-semibold text-emerald-400',
      render: (item) => `${goals.find(g => g.indicatorId === item.id)?.currentValue ?? '92'} ${item.unit || '%'}`,
    },
    {
      key: 'detalhamento',
      label: 'Detalhamento',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (item) => (
        <button
          onClick={() => onView(item)}
          className="p-1 px-2.5 bg-[var(--bg-main)] hover:bg-[var(--border-color)]/25 text-[var(--text-secondary)] hover:text-indigo-400 border border-[var(--border-color)] rounded transition text-[10px] font-bold"
        >
          Análise Real
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={indicators}
      loading={loading}
      loadingText="Carregando indicadores..."
      getRowKey={(item) => item.id}
      emptyState={
        <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
          <Activity className="w-12 h-12 text-[var(--text-secondary)]/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-main)]">Nenhum dado encontrado.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Este workspace não possui indicadores de governança medidos.</p>
        </div>
      }
    />
  );
}
