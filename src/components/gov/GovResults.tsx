import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import DataTable, { DataTableColumn } from '../shared/tables/DataTable';

interface GovResultsProps {
  loading: boolean;
  results: any[];
  goals: any[];
  getIndicatorName: (id: string) => string;
}

/**
 * GovResults
 *
 * Lista de resultados do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar os resultados vinculados às metas;
 * - exibir estados de loading e vazio;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovResults({
  loading,
  results,
  goals,
  getIndicatorName,
}: GovResultsProps) {
  const columns: DataTableColumn<any>[] = [
    {
      key: 'meta',
      label: 'Meta Vinculada',
      className: 'font-semibold text-[var(--text-main)]',
      render: (item) => {
        const goal = goals.find(g => g.indicatorId === item.indicatorId);
        return goal?.metadata?.descricaoMeta || getIndicatorName(item.indicatorId);
      },
    },
    {
      key: 'resultado',
      label: 'Resultado Alcançado Real',
      className: 'font-mono font-bold text-indigo-400',
      render: (item) => item.resultValue,
    },
    {
      key: 'atingimento',
      label: 'Porcentagem de Atingimento',
      className: 'font-mono font-bold text-emerald-400',
      render: (item) => {
        const goal = goals.find(g => g.indicatorId === item.indicatorId);
        const percent = goal ? Math.min(Math.round((item.resultValue / goal.goalValue) * 100), 100) : 100;
        return `${percent}%`;
      },
    },
    {
      key: 'data',
      label: 'Data de Referência',
      className: 'text-[var(--text-secondary)] font-mono',
      render: (item) => item.referenceDate || new Date().toISOString().split('T')[0],
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={results}
      loading={loading}
      loadingText="Carregando resultados..."
      getRowKey={(item, index) => item.id || String(index)}
      emptyState={
        <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
          <CheckCircle2 className="w-12 h-12 text-[var(--text-secondary)]/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-main)]">Nenhum dado encontrado.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Este workspace não possui logs de resultados registrados.</p>
        </div>
      }
    />
  );
}
