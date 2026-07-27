import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

/**
 * useDecisionsWorkspace
 *
 * Hook especializado da tela de Decisões.
 *
 * Responsabilidade:
 * - consumir o WorkspaceContext;
 * - expor apenas o domínio necessário para DecisionsWorkspace;
 * - impedir que DecisionsWorkspace dependa da estrutura completa do contexto;
 * - remover o repasse manual de props pelo WorkspaceTabsRouter.
 */
export default function useDecisionsWorkspace() {
  const workspace = useWorkspace();

  const {
    filteredDecisions,
    newDecisionTitle,
    setNewDecisionTitle,
    newDecisionDesc,
    setNewDecisionDesc,
    handleCreateDecisionSubmit,
    onDeleteDecision,
  } = workspace.decisions;

  const handleCreateDecision = useCallback(
    (event: React.FormEvent) => {
      return handleCreateDecisionSubmit(event);
    },
    [handleCreateDecisionSubmit]
  );

  return useMemo(
    () => ({
      filteredDecisions,
      newDecisionTitle,
      setNewDecisionTitle,
      newDecisionDesc,
      setNewDecisionDesc,
      handleCreateDecision,
      onDeleteDecision,
    }),
    [
      filteredDecisions,
      newDecisionTitle,
      setNewDecisionTitle,
      newDecisionDesc,
      setNewDecisionDesc,
      handleCreateDecision,
      onDeleteDecision,
    ]
  );
}
