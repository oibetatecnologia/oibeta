import React from 'react';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey?: (item: T, index: number) => string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  className?: string;
}

/**
 * DataTable
 *
 * Tabela reutilizável oficial da Beta Platform.
 *
 * Responsabilidade:
 * - renderizar tabelas de dados;
 * - padronizar estrutura visual;
 * - manter comportamento simples e previsível;
 * - não buscar dados;
 * - não conter regra de negócio.
 */
export default function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyState,
  loading = false,
  loadingText = 'Carregando dados...',
  className = ''
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden ${className}`}>
        <div className="p-8 text-center text-xs text-[var(--text-secondary)] font-mono">
          {loadingText}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden ${className}`}>
        {emptyState || (
          <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
            Nenhum dado encontrado.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]/35 text-[10px] font-mono text-[var(--text-secondary)] uppercase">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`p-4 font-bold ${column.headerClassName || column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)] text-xs">
            {data.map((item, index) => (
              <tr
                key={getRowKey ? getRowKey(item, index) : index}
                className="hover:bg-[var(--bg-sidebar)]/10 transition"
              >
                {columns.map((column) => (
                  <td key={column.key} className={`p-4 ${column.className || ''}`}>
                    {column.render ? column.render(item, index) : (item as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
