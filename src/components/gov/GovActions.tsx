import React from 'react';
import { CheckSquare } from 'lucide-react';
import DataTable, { DataTableColumn } from '../shared/tables/DataTable';
import StatusBadge from '../shared/badges/StatusBadge';

interface GovActionsProps {
  loading: boolean;
  actions: any[];
  getProjectName: (id: string) => string;
  onView: (item: any) => void;
}

/**
 * GovActions
 *
 * Lista de ações do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar a tabela de ações;
 * - exibir estados de loading e vazio;
 * - delegar ações para o GovWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovActions({
  loading,
  actions,
  getProjectName,
  onView,
}: GovActionsProps) {
  const columns: DataTableColumn<any>[] = [
    {
      key: 'acao',
      label: 'Ação',
      render: (item) => (
        <div className="font-semibold text-[var(--text-main)]">
          <div>{item.name}</div>
          <div className="text-[10px] text-[var(--text-secondary)] font-normal">{item.description}</div>
        </div>
      ),
    },
    {
      key: 'projeto',
      label: 'Projeto Vinculado',
      className: 'text-indigo-400 font-medium',
      render: (item) => getProjectName(item.projectId),
    },
    {
      key: 'prazo',
      label: 'Prazo Estimado',
      className: 'text-[var(--text-secondary)] font-mono',
      render: (item) => item.metadata?.prazo || '30 dias',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <StatusBadge
          status={item.status}
          variant={item.status === 'ACTIVE' ? 'ACTIVE' : 'COMPLETED'}
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
      data={actions}
      loading={loading}
      loadingText="Carregando ações..."
      getRowKey={(item) => item.id}
      emptyState={
        <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
          <CheckSquare className="w-12 h-12 text-[var(--text-secondary)]/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-main)]">Nenhum dado encontrado.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Nenhuma ação em monitoramento estrutural encontrada.</p>
        </div>
      }
    />
  );
}
