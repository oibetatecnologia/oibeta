import { useState } from 'react';
import { Memory } from '../types';

interface UseMemoryStateArgs {
  selectedProjectId: string;
  onCreateMemory: (memory: Omit<Memory, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
}

/**
 * useMemoryState
 * Estado local de criação de memórias.
 *
 * Responsabilidade:
 * - manter conteúdo da nova memória;
 * - criar memória vinculada ao projeto ativo;
 * - limpar formulário após salvar;
 * - não buscar dados.
 */
export default function useMemoryState({
  selectedProjectId,
  onCreateMemory,
}: UseMemoryStateArgs) {
  const [newMemoryContent, setNewMemoryContent] = useState('');

  const handleCreateMemorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newMemoryContent.trim() || !selectedProjectId) return;

    await onCreateMemory({
      projectId: selectedProjectId,
      content: newMemoryContent.trim(),
    });

    setNewMemoryContent('');
  };

  return {
    newMemoryContent,
    setNewMemoryContent,
    handleCreateMemorySubmit,
  };
}
