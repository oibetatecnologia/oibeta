import React, { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';
import type { Project } from '../types';

/**
 * useProjectsWorkspace
 *
 * Hook especializado da tela de Projetos.
 *
 * Responsabilidade:
 * - consumir o WorkspaceContext;
 * - expor apenas o domínio de projetos para ProjectsWorkspace;
 * - impedir que ProjectsWorkspace dependa da estrutura completa do contexto;
 * - remover o repasse manual de props pelo WorkspaceTabsRouter.
 */
export default function useProjectsWorkspace() {
  const workspace = useWorkspace();

  const {
    projects,
    selectedProjectId,
    totalProjects,
    editingStopPointId,
    tempStopPointText,
    setTempStopPointText,
    setEditingStopPointId,
    startEditingStopPoint,
    saveStopPoint,
    onSelectProject,
    onToggleProjectStatus,
    onDeleteProject,
    newProjectName,
    setNewProjectName,
    newProjectDesc,
    setNewProjectDesc,
    newProjectStop,
    setNewProjectStop,
    handleCreateProjectSubmit,
  } = workspace.projects;

  const handleCreateProject = useCallback(
    (event?: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      return handleCreateProjectSubmit(event as React.FormEvent);
    },
    [handleCreateProjectSubmit]
  );

  return useMemo(
    () => ({
      projects,
      selectedProjectId,
      totalProjects,
      editingStopPointId,
      tempStopPointText,
      setTempStopPointText,
      setEditingStopPointId,
      startEditingStopPoint: startEditingStopPoint as (project: Project) => void,
      saveStopPoint,
      onSelectProject,
      onToggleProjectStatus,
      onDeleteProject,
      newProjectName,
      setNewProjectName,
      newProjectDesc,
      setNewProjectDesc,
      newProjectStop,
      setNewProjectStop,
      handleCreateProject,
    }),
    [
      projects,
      selectedProjectId,
      totalProjects,
      editingStopPointId,
      tempStopPointText,
      setTempStopPointText,
      setEditingStopPointId,
      startEditingStopPoint,
      saveStopPoint,
      onSelectProject,
      onToggleProjectStatus,
      onDeleteProject,
      newProjectName,
      setNewProjectName,
      newProjectDesc,
      setNewProjectDesc,
      newProjectStop,
      setNewProjectStop,
      handleCreateProject,
    ]
  );
}
