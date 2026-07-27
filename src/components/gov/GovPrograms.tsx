import React from 'react';
import { Layers } from 'lucide-react';
import DataTable, { DataTableColumn } from '../shared/tables/DataTable';
import StatusBadge from '../shared/badges/StatusBadge';

interface GovProgramsProps {
  loading: boolean;
  programs: any[];
  onView: (item: any) => void;
  formatStatus: (status: string) => string;
}

/**
 * GovPrograms
 *
 * Lista de programas do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar a tabela de programas;
 * - exibir estados de loading e vazio;
 * - delegar ações para o GovWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovPrograms({
  loading,
  programs,
  onView,
  formatStatus,
}: GovProgramsProps) {
  const columns: DataTableColumn<any>[] = [
    {
      key: 'programa',
      label: 'Programa',
      render: (item) => (
        <div className="font-semibold text-[var(--text-main)]">
          <div>{item.name}</div>
          <div className="text-[10px] text-[var(--text-secondary)] font-normal">{item.description}</div>
        </div>
      ),
    },
    {
      key: 'secretaria',
      label: 'Secretaria',
      className: 'text-[var(--text-secondary)]',
      render: (item) => item.metadata?.secretaria || 'Administração Geral',
    },
    {
      key: 'periodo',
      label: 'Período',
      className: 'font-mono text-[var(--text-secondary)]',
      render: (item) => item.metadata?.periodo || 'Anual 2026',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <StatusBadge
          status={formatStatus(item.status)}
          variant={item.status === 'ACTIVE' || item.status === 'ATIVO' ? 'ACTIVE' : 'PENDING'}
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
      data={programs}
      loading={loading}
      loadingText="Carregando programas..."
      getRowKey={(item) => item.id}
      emptyState={
        <div className="p-12 text-center">
          <Layers className="w-12 h-12 text-[var(--text-secondary)]/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-main)]">Nenhum dado encontrado.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Não há programas cadastrados para este workspace.</p>
        </div>
      }
    />
  );
}
