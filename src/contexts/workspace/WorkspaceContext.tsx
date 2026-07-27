import React, { createContext, useContext } from 'react';
import type { WorkspaceContextValue } from '../../types/workspace/WorkspaceState';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  value: WorkspaceContextValue;
  children: React.ReactNode;
}

/**
 * WorkspaceProvider
 * Camada compartilhada da Área de Trabalho da Beta Platform.
 *
 * Responsabilidade:
 * - disponibilizar o estado consolidado do workspace;
 * - reduzir o repasse manual de props entre ManagerPanel, WorkspaceTabsRouter e Workspaces;
 * - manter a lógica nos hooks/services já existentes;
 * - não buscar dados diretamente;
 * - não executar regra de negócio diretamente.
 */
export function WorkspaceProvider({ value, children }: WorkspaceProviderProps) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * useWorkspace
 * Hook oficial para consumo do estado compartilhado da Área de Trabalho.
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider.');
  }

  return context;
}

export default WorkspaceContext;
