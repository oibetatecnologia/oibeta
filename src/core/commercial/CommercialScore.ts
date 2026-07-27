import type { OpportunityMatchResult } from './OpportunityTypes';

export interface CommercialScoreInput {
  estimatedValue?: number;
  matches: OpportunityMatchResult[];
}

export interface CommercialScoreResult {
  iac: number;
  ipc: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * IAC = Índice de Aderência Comercial.
 * Mede o quanto a oportunidade combina com os serviços Beta.
 *
 * IPC = Índice de Potencial Comercial.
 * Nesta fase é uma estimativa simples baseada no valor informado e na aderência.
 */
export function calculateCommercialScore(input: CommercialScoreInput): CommercialScoreResult {
  const bestScore = input.matches.length > 0
    ? Math.max(...input.matches.map((match) => match.score))
    : 0;

  const iac = Math.min(100, Math.max(0, Math.round(bestScore)));
  const estimatedValue = input.estimatedValue || 0;
  const ipc = Math.round(estimatedValue * (iac / 100));

  return {
    iac,
    ipc,
    confidence: resolveConfidence(iac, input.matches.length),
  };
}

function resolveConfidence(iac: number, matchesCount: number): CommercialScoreResult['confidence'] {
  if (iac >= 80 && matchesCount > 0) return 'high';
  if (iac >= 50 && matchesCount > 0) return 'medium';
  return 'low';
}
