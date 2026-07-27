import React from 'react';
import type { WorkspaceContextValue } from '../../types/workspace/WorkspaceState';
import { WorkspaceProvider as WorkspaceContextProvider } from '../../contexts/workspace/WorkspaceContext';

interface WorkspaceProviderProps {
  value: WorkspaceContextValue;
  children: React.ReactNode;
}

/**
 * WorkspaceProvider
 * Provider oficial da Área de Trabalho da Beta Platform.
 *
 * Responsabilidade:
 * - encapsular o WorkspaceContext;
 * - receber o estado já composto pelo ManagerPanel ou por um composer dedicado;
 * - preparar a redução gradual de props entre ManagerPanel, WorkspaceTabsRouter e Workspaces;
 * - não buscar dados diretamente;
 * - não executar regra de negócio diretamente.
 */
export default function WorkspaceProvider({ value, children }: WorkspaceProviderProps) {
  return (
    <WorkspaceContextProvider value={value}>
      {children}
    </WorkspaceContextProvider>
  );
}
