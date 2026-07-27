import React from 'react';
import { Briefcase } from 'lucide-react';
import DataTable, { DataTableColumn } from '../shared/tables/DataTable';
import StatusBadge from '../shared/badges/StatusBadge';

interface GovProjectsProps {
  loading: boolean;
  projects: any[];
  getProgramName: (id: string) => string;
  onView: (item: any) => void;
  formatStatus: (status: string) => string;
}

/**
 * GovProjects
 *
 * Lista de projetos do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar a tabela de projetos;
 * - exibir estados de loading e vazio;
 * - delegar ações para o GovWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovProjects({
  loading,
  projects,
  getProgramName,
  onView,
  formatStatus,
}: GovProjectsProps) {
  const columns: DataTableColumn<any>[] = [
    {
      key: 'projeto',
      label: 'Projeto',
      render: (item) => (
        <div className="font-semibold text-[var(--text-main)]">
          <div>{item.name}</div>
          <div className="text-[10px] text-[var(--text-secondary)] font-normal">{item.description}</div>
        </div>
      ),
    },
    {
      key: 'programa',
      label: 'Programa',
      className: 'text-indigo-400 font-medium',
      render: (item) => getProgramName(item.programId),
    },
    {
      key: 'responsavel',
      label: 'Responsável',
      className: 'text-[var(--text-secondary)]',
      render: (item) => item.metadata?.responsavel || 'Assessor Técnico Gestor',
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <StatusBadge
          status={formatStatus(item.status)}
          variant={item.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'}
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
      data={projects}
      loading={loading}
      loadingText="Carregando projetos..."
      getRowKey={(item) => item.id}
      emptyState={
        <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
          <Briefcase className="w-12 h-12 text-[var(--text-secondary)]/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-main)]">Nenhum dado encontrado.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Este workspace não possui projetos associados.</p>
        </div>
      }
    />
  );
}
