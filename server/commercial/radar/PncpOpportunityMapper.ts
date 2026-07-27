import crypto from 'node:crypto';
import type { CommercialOpportunity, CommercialOpportunityInput, CommercialOpportunityPriority, CommercialOpportunitySphere } from '../../../src/core/commercial/OpportunityTypes';
import type { ProcurementOpportunityType } from '../../../src/core/commercial/CommercialRadarRegistry';
import { analyzeOpportunity } from '../../../src/core/commercial/OpportunityAnalyzer';
import { buildOpportunityDuplicateKey, findProbableDuplicate, normalizeOpportunityInput } from '../../../src/core/commercial/OpportunityNormalizer';

interface PncpRecord {
  numeroControlePNCP?: string;
  numeroCompra?: string;
  anoCompra?: number;
  processo?: string;
  numeroProcesso?: string;
  modalidadeId?: number;
  modalidadeNome?: string;
  objetoCompra?: string;
  informacaoComplementar?: string;
  valorTotalEstimado?: number;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
  dataPublicacaoPncp?: string;
  dataInclusao?: string;
  dataAtualizacao?: string;
  sequencialCompra?: number;
  srp?: boolean;
  linkSistemaOrigem?: string;
  orgaoEntidade?: { cnpj?: string; razaoSocial?: string; esferaId?: string };
  unidadeOrgao?: { ufSigla?: string; municipioNome?: string; nomeUnidade?: string };
}

export function mapPncpRecord(record: unknown): CommercialOpportunityInput | undefined {
  if (!record || typeof record !== 'object') return undefined;
  const item = record as PncpRecord;
  const externalId = clean(item.numeroControlePNCP);
  const object = clean(item.objetoCompra);
  const buyerName = clean(item.orgaoEntidade?.razaoSocial) || clean(item.unidadeOrgao?.nomeUnidade);
  const type = resolveOpportunityType(item.modalidadeNome, item.srp);
  if (!externalId || !object || !buyerName || !type) return undefined;

  const modality = clean(item.modalidadeNome) || 'Contratação pública';
  const titleObject = object.length > 120 ? `${object.slice(0, 117)}...` : object;
  const sourceUrl = clean(item.linkSistemaOrigem) || buildPncpPublicUrl(item);
  const sourceHash = crypto.createHash('sha256').update(JSON.stringify({ externalId, object, updated: item.dataAtualizacao, deadline: item.dataEncerramentoProposta, value: item.valorTotalEstimado })).digest('hex');

  return normalizeOpportunityInput({
    title: `${modality}: ${titleObject}`,
    buyerName,
    sphere: resolveSphere(item.orgaoEntidade?.esferaId),
    city: clean(item.unidadeOrgao?.municipioNome),
    state: clean(item.unidadeOrgao?.ufSigla),
    type,
    estimatedValue: toPositiveNumber(item.valorTotalEstimado),
    publicationDate: clean(item.dataPublicacaoPncp),
    submissionDeadline: clean(item.dataEncerramentoProposta),
    sourceUrl,
    sourceId: 'pncp',
    sourceLabel: 'PNCP',
    sourceType: 'api',
    externalId,
    processNumber: clean(item.processo) || clean(item.numeroProcesso) || clean(item.numeroCompra),
    capturedAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    sourcePublishedAt: clean(item.dataPublicacaoPncp),
    sourceUpdatedAt: clean(item.dataAtualizacao) || clean(item.dataInclusao),
    sourceHash,
    object,
    notes: clean(item.informacaoComplementar),
  });
}

export function buildImportedOpportunity(input: CommercialOpportunityInput, organizationId: string, workspaceId: string | undefined, current: CommercialOpportunity[]): CommercialOpportunity {
  const now = new Date().toISOString();
  const duplicate = findProbableDuplicate(input, current);
  const opportunity: CommercialOpportunity & { organizationId: string; workspaceId?: string } = {
    ...input,
    id: crypto.randomUUID(),
    organizationId,
    workspaceId,
    status: 'new',
    priority: resolvePriority(input.submissionDeadline),
    qualificationStatus: 'review_required',
    duplicateKey: buildOpportunityDuplicateKey(input),
    probableDuplicateOf: duplicate?.id,
    createdAt: now,
    updatedAt: now,
  };
  opportunity.analysis = analyzeOpportunity(opportunity);
  return opportunity;
}

function resolveOpportunityType(modalityName?: string, srp?: boolean): ProcurementOpportunityType | undefined {
  if (srp) return 'ata_registro_precos';
  const name = normalize(modalityName);
  if (name.includes('pregao')) return 'pregao';
  if (name.includes('dispensa')) return 'dispensa';
  if (name.includes('concorrencia')) return 'concorrencia';
  if (name.includes('credenciamento')) return 'credenciamento';
  if (name.includes('chamamento')) return 'chamamento';
  if (name.includes('inexigibilidade')) return 'inexigibilidade';
  return undefined;
}

function resolveSphere(value?: string): CommercialOpportunitySphere {
  const code = clean(value)?.toUpperCase();
  if (code === 'F') return 'federal';
  if (code === 'E') return 'state';
  if (code === 'M') return 'municipal';
  return 'other';
}

function resolvePriority(deadline?: string): CommercialOpportunityPriority {
  if (!deadline) return 'medium';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (!Number.isFinite(days)) return 'medium';
  if (days <= 3) return 'critical';
  if (days <= 7) return 'high';
  if (days <= 15) return 'medium';
  return 'low';
}

function buildPncpPublicUrl(item: PncpRecord): string {
  const cnpj = clean(item.orgaoEntidade?.cnpj);
  const year = item.anoCompra;
  const sequence = item.sequencialCompra;
  if (cnpj && year && sequence) return `https://pncp.gov.br/app/editais/${encodeURIComponent(cnpj)}/${year}/${sequence}`;
  return 'https://pncp.gov.br/app/editais';
}

function toPositiveNumber(value?: number): number | undefined { return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined; }
function clean(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function normalize(value?: string): string { return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
