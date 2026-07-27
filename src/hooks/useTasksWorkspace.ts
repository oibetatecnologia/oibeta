import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

interface TasksWorkspaceObjective {
  id: string;
  title: string;
  status?: string;
}

/**
 * useTasksWorkspace
 *
 * Hook especializado da tela de Tarefas e Objetivos.
 */
export default function useTasksWorkspace() {
  const workspace = useWorkspace();

  const { currentProject } = workspace.projects;

  const {
    filteredTasks,
    newTaskTitle,
    setNewTaskTitle,
    handleCreateTaskSubmit,
    onToggleTaskStatus,
    onDeleteTask,
  } = workspace.tasks;

  const {
    objectives,
    newObjectiveTitle,
    setNewObjectiveTitle,
    handleCreateObjectiveSubmit,
    handleToggleObjectiveStatus,
    handleDeleteObjective,
  } = workspace.objectives;

  const normalizedObjectives = useMemo((): TasksWorkspaceObjective[] => {
    return objectives.map((objective, index) => {
      const safeObjective = objective as {
        id?: string;
        title: string;
        status?: string;
      };

      return {
        id: safeObjective.id ?? `objective-${index}`,
        title: safeObjective.title,
        status: safeObjective.status,
      };
    });
  }, [objectives]);

  const handleCreateTask = useCallback(
    (event: React.FormEvent) => {
      return handleCreateTaskSubmit(event);
    },
    [handleCreateTaskSubmit]
  );

  const handleCreateObjective = useCallback(
    (event: React.FormEvent) => {
      return handleCreateObjectiveSubmit(event);
    },
    [handleCreateObjectiveSubmit]
  );

  return useMemo(
    () => ({
      currentProject,
      filteredTasks,
      newTaskTitle,
      setNewTaskTitle,
      handleCreateTask,
      onToggleTaskStatus,
      onDeleteTask,
      objectives: normalizedObjectives,
      newObjectiveTitle,
      setNewObjectiveTitle,
      handleCreateObjective,
      handleToggleObjectiveStatus,
      handleDeleteObjective,
    }),
    [
      currentProject,
      filteredTasks,
      newTaskTitle,
      setNewTaskTitle,
      handleCreateTask,
      onToggleTaskStatus,
      onDeleteTask,
      normalizedObjectives,
      newObjectiveTitle,
      setNewObjectiveTitle,
      handleCreateObjective,
      handleToggleObjectiveStatus,
      handleDeleteObjective,
    ]
  );
}
