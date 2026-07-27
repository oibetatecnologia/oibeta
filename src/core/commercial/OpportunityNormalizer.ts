import type { CommercialOpportunity, CommercialOpportunityInput } from './OpportunityTypes';

export function normalizeCommercialText(value?: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizeOpportunityInput(input: CommercialOpportunityInput): CommercialOpportunityInput {
  return {
    ...input,
    title: input.title.trim(),
    buyerName: input.buyerName.trim(),
    city: input.city?.trim() || undefined,
    state: input.state?.trim().toUpperCase().slice(0, 2) || undefined,
    sourceUrl: normalizeUrl(input.sourceUrl),
    sourceId: input.sourceId || 'manual',
    sourceLabel: input.sourceLabel?.trim() || (input.sourceId === 'manual' || !input.sourceId ? 'Cadastro manual' : input.sourceId),
    sourceType: input.sourceType || 'manual',
    externalId: input.externalId?.trim() || undefined,
    processNumber: input.processNumber?.trim() || undefined,
    capturedAt: input.capturedAt || new Date().toISOString(),
    object: input.object.trim(),
    notes: input.notes?.trim() || undefined,
  };
}

export function buildOpportunityDuplicateKey(input: CommercialOpportunityInput): string {
  if (input.sourceId && input.externalId) return `source:${normalizeCommercialText(String(input.sourceId))}:${normalizeCommercialText(input.externalId)}`;
  if (input.processNumber && input.buyerName) return `process:${normalizeCommercialText(input.buyerName)}:${normalizeCommercialText(input.processNumber)}`;
  if (input.sourceHash) return `hash:${input.sourceHash}`;
  return `signature:${normalizeCommercialText(input.buyerName)}:${normalizeCommercialText(input.object).slice(0, 180)}`;
}

export function findProbableDuplicate(input: CommercialOpportunityInput, current: CommercialOpportunity[]): CommercialOpportunity | undefined {
  const key = buildOpportunityDuplicateKey(input);
  return current.find((item) => item.duplicateKey === key || buildOpportunityDuplicateKey(item) === key);
}

function normalizeUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  try { return new URL(value.trim()).toString(); } catch { return value.trim(); }
}
