import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

/**
 * useMemoriesWorkspace
 *
 * Hook especializado da tela de Memórias.
 *
 * Responsabilidade:
 * - consumir o WorkspaceContext;
 * - expor apenas o domínio necessário para MemoriesWorkspace;
 * - impedir que MemoriesWorkspace dependa da estrutura completa do contexto;
 * - remover o repasse manual de props pelo WorkspaceTabsRouter.
 */
export default function useMemoriesWorkspace() {
  const workspace = useWorkspace();

  const {
    filteredMemories,
    newMemoryContent,
    setNewMemoryContent,
    handleCreateMemorySubmit,
    onDeleteMemory,
  } = workspace.memories;

  const handleCreateMemory = useCallback(
    (event: React.FormEvent) => {
      return handleCreateMemorySubmit(event);
    },
    [handleCreateMemorySubmit]
  );

  return useMemo(
    () => ({
      filteredMemories,
      newMemoryContent,
      setNewMemoryContent,
      handleCreateMemory,
      onDeleteMemory,
    }),
    [
      filteredMemories,
      newMemoryContent,
      setNewMemoryContent,
      handleCreateMemory,
      onDeleteMemory,
    ]
  );
}
