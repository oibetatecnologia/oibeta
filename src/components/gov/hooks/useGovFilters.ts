import { useMemo } from 'react';

interface UseGovFiltersParams {
  programs: any[];
  projectsData: any[];
  actions: any[];
  goals: any[];
  searchTerm: string;
  statusFilter: string;
}

function includesSearch(value: unknown, searchTerm: string): boolean {
  return String(value || '').toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * useGovFilters
 *
 * Centraliza filtros de listas do Beta Gov.
 */
export function useGovFilters({
  programs,
  projectsData,
  actions,
  goals,
  searchTerm,
  statusFilter,
}: UseGovFiltersParams) {
  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchSearch =
        includesSearch(program.name, searchTerm) ||
        includesSearch(program.description, searchTerm) ||
        includesSearch(program.metadata?.secretaria, searchTerm);

      const matchStatus = statusFilter === 'ALL' || program.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [programs, searchTerm, statusFilter]);

  const filteredProjects = useMemo(() => {
    return projectsData.filter((project) => {
      const matchSearch =
        includesSearch(project.name, searchTerm) ||
        includesSearch(project.description, searchTerm) ||
        includesSearch(project.metadata?.responsavel, searchTerm);

      const matchStatus = statusFilter === 'ALL' || project.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [projectsData, searchTerm, statusFilter]);

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const matchSearch =
        includesSearch(action.name, searchTerm) ||
        includesSearch(action.description, searchTerm);

      const matchStatus = statusFilter === 'ALL' || action.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [actions, searchTerm, statusFilter]);

  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      const matchSearch =
        includesSearch(goal.metadata?.descricaoMeta, searchTerm) ||
        includesSearch(goal.status, searchTerm);

      const matchStatus = statusFilter === 'ALL' || goal.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [goals, searchTerm, statusFilter]);

  return {
    filteredPrograms,
    filteredProjects,
    filteredActions,
    filteredGoals,
  };
}
