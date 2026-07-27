import React from 'react';
import { Search, Filter, RefreshCw, Plus } from 'lucide-react';

export interface SearchToolbarStatusOption {
  value: string;
  label: string;
}

export interface SearchToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  statusOptions?: SearchToolbarStatusOption[];

  onRefresh?: () => void;
  refreshLabel?: string;

  onCreate?: () => void;
  createLabel?: string;

  className?: string;
}

/**
 * SearchToolbar
 *
 * Barra reutilizável oficial da Beta Platform para busca, filtros e ações rápidas.
 *
 * Responsabilidade:
 * - padronizar busca textual;
 * - padronizar filtro simples por status;
 * - oferecer ações opcionais de atualizar e criar;
 * - não buscar dados;
 * - não conter regra de negócio.
 */
export default function SearchToolbar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Pesquisar por nome, descrição...',
  statusFilter,
  onStatusFilterChange,
  statusOptions = [
    { value: 'ALL', label: 'Todos os status' },
    { value: 'ACTIVE', label: 'Ativo' },
    { value: 'PENDING', label: 'Pendente' },
    { value: 'COMPLETED', label: 'Concluído' },
  ],
  onRefresh,
  refreshLabel = 'Atualizar',
  onCreate,
  createLabel = 'Adicionar Registro',
  className = '',
}: SearchToolbarProps) {
  const showStatusFilter = typeof statusFilter === 'string' && !!onStatusFilterChange;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showStatusFilter && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className="py-2 px-3 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-main)] hover:bg-[var(--border-color)]/25 text-[var(--text-secondary)] hover:text-[var(--text-main)] border border-[var(--border-color)] rounded-lg text-xs font-semibold transition"
            title={refreshLabel}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{refreshLabel}</span>
          </button>
        )}

        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-semibold rounded-lg transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {createLabel}
          </button>
        )}
      </div>
    </div>
  );
}
