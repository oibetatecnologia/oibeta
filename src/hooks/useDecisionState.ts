import { useState } from 'react';
import { Decision } from '../types';

interface UseDecisionStateArgs {
  selectedProjectId: string;
  onCreateDecision: (decision: Omit<Decision, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
}

/**
 * useDecisionState
 * Estado local de criação de decisões.
 *
 * Responsabilidade:
 * - manter título e descrição da nova decisão;
 * - criar decisão vinculada ao projeto ativo;
 * - limpar formulário após salvar;
 * - não buscar dados.
 */
export default function useDecisionState({
  selectedProjectId,
  onCreateDecision,
}: UseDecisionStateArgs) {
  const [newDecisionTitle, setNewDecisionTitle] = useState('');
  const [newDecisionDesc, setNewDecisionDesc] = useState('');

  const handleCreateDecisionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newDecisionTitle.trim() || !selectedProjectId) return;

    await onCreateDecision({
      projectId: selectedProjectId,
      title: newDecisionTitle.trim(),
      description: newDecisionDesc.trim(),
    });

    setNewDecisionTitle('');
    setNewDecisionDesc('');
  };

  return {
    newDecisionTitle,
    setNewDecisionTitle,
    newDecisionDesc,
    setNewDecisionDesc,
    handleCreateDecisionSubmit,
  };
}
