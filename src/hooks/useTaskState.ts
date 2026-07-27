import { useState } from 'react';
import { Task } from '../types';

interface UseTaskStateArgs {
  selectedProjectId: string;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
}

/**
 * useTaskState
 * Estado local de criação de tarefas/metas.
 *
 * Responsabilidade:
 * - manter título da nova tarefa;
 * - criar tarefa vinculada ao projeto ativo;
 * - expor criação programática segura para a Beta e outros workspaces;
 * - não buscar dados.
 */
export default function useTaskState({
  selectedProjectId,
  onCreateTask,
}: UseTaskStateArgs) {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const createTask = async (title: string) => {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || !selectedProjectId) return;

    await onCreateTask({
      projectId: selectedProjectId,
      title: normalizedTitle,
      status: 'pending',
    });

    setNewTaskTitle('');
  };

  const handleCreateTaskSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    await createTask(newTaskTitle);
  };

  return {
    newTaskTitle,
    setNewTaskTitle,
    createTask,
    handleCreateTaskSubmit,
  };
}
