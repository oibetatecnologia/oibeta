import crypto from 'node:crypto';
import type { CommercialOpportunityInput, CommercialOpportunitySphere } from '../../../src/core/commercial/OpportunityTypes';
import type { ProcurementOpportunityType } from '../../../src/core/commercial/CommercialRadarRegistry';
import { normalizeOpportunityInput } from '../../../src/core/commercial/OpportunityNormalizer';

interface ComprasGovRecord extends Record<string, unknown> {
  idCompra?: string;
  numeroControlePncpCompra?: string;
  numeroControlePNCP?: string;
  numeroCompra?: string;
  anoCompra?: number | string;
  processo?: string;
  numeroProcesso?: string;
  codigoModalidade?: number | string;
  modalidadeId?: number | string;
  modalidadeNome?: string;
  nomeModalidadeCompra?: string;
  objetoCompra?: string;
  objeto?: string;
  informacaoComplementar?: string;
  valorTotalEstimado?: number | string;
  valorTotalHomologado?: number | string;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
  dataPublicacaoPncp?: string;
  dataInclusao?: string;
  dataAtualizacao?: string;
  dataHoraAtualizacao?: string;
  dataHoraInclusao?: string;
  srp?: boolean | number | string;
  linkSistemaOrigem?: string;
  linkCompraPNCP?: string;
  orgaoEntidadeRazaoSocial?: string;
  orgaoEntidadeCnpj?: string;
  unidadeOrgaoNomeUnidade?: string;
  unidadeOrgaoUfSigla?: string;
  unidadeOrgaoMunicipioNome?: string;
  unidadeOrgaoCodigoIbge?: string | number;
  esferaId?: string;
  orgaoEntidade?: { cnpj?: string; razaoSocial?: string; esferaId?: string };
  unidadeOrgao?: { ufSigla?: string; municipioNome?: string; nomeUnidade?: string };
}

export function mapComprasGovRecord(record: unknown): CommercialOpportunityInput | undefined {
  if (!record || typeof record !== 'object') return undefined;
  const item = record as ComprasGovRecord;

  const externalId = clean(item.numeroControlePncpCompra)
    || clean(item.numeroControlePNCP)
    || clean(item.idCompra);
  const object = clean(item.objetoCompra) || clean(item.objeto);
  const buyerName = clean(item.orgaoEntidadeRazaoSocial)
    || clean(item.orgaoEntidade?.razaoSocial)
    || clean(item.unidadeOrgaoNomeUnidade)
    || clean(item.unidadeOrgao?.nomeUnidade);
  const modalityName = clean(item.modalidadeNome) || clean(item.nomeModalidadeCompra);
  const type = resolveOpportunityType(modalityName, toBoolean(item.srp));

  if (!externalId || !object || !buyerName || !type) return undefined;

  const modality = modalityName || 'Contratação pública';
  const titleObject = object.length > 120 ? `${object.slice(0, 117)}...` : object;
  const sourceUrl = clean(item.linkSistemaOrigem)
    || clean(item.linkCompraPNCP)
    || buildPublicUrl(item, externalId);
  const sourceUpdatedAt = clean(item.dataAtualizacao) || clean(item.dataHoraAtualizacao) || clean(item.dataInclusao) || clean(item.dataHoraInclusao);
  const submissionDeadline = clean(item.dataEncerramentoProposta);
  const estimatedValue = toPositiveNumber(item.valorTotalEstimado) || toPositiveNumber(item.valorTotalHomologado);
  const sourceHash = crypto.createHash('sha256').update(JSON.stringify({
    externalId,
    object,
    updated: sourceUpdatedAt,
    deadline: submissionDeadline,
    value: estimatedValue,
  })).digest('hex');

  return normalizeOpportunityInput({
    title: `${modality}: ${titleObject}`,
    buyerName,
    sphere: resolveSphere(clean(item.esferaId) || clean(item.orgaoEntidade?.esferaId)),
    city: clean(item.unidadeOrgaoMunicipioNome) || clean(item.unidadeOrgao?.municipioNome),
    state: clean(item.unidadeOrgaoUfSigla) || clean(item.unidadeOrgao?.ufSigla),
    type,
    estimatedValue,
    publicationDate: clean(item.dataPublicacaoPncp),
    submissionDeadline,
    sourceUrl,
    sourceId: 'compras_gov',
    sourceLabel: 'Compras.gov.br',
    sourceType: 'api',
    externalId,
    processNumber: clean(item.processo) || clean(item.numeroProcesso) || clean(item.numeroCompra) || clean(item.idCompra),
    capturedAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    sourcePublishedAt: clean(item.dataPublicacaoPncp),
    sourceUpdatedAt,
    sourceHash,
    object,
    notes: clean(item.informacaoComplementar),
  });
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
  if (code === 'F' || code === 'FEDERAL') return 'federal';
  if (code === 'E' || code === 'ESTADUAL') return 'state';
  if (code === 'M' || code === 'MUNICIPAL') return 'municipal';
  return 'other';
}

function buildPublicUrl(item: ComprasGovRecord, externalId: string): string {
  const cnpj = clean(item.orgaoEntidadeCnpj) || clean(item.orgaoEntidade?.cnpj);
  const year = Number(item.anoCompra);
  const sequence = extractSequence(externalId);
  if (cnpj && Number.isInteger(year) && year > 2000 && sequence) {
    return `https://pncp.gov.br/app/editais/${encodeURIComponent(cnpj)}/${year}/${sequence}`;
  }
  const idCompra = clean(item.idCompra);
  if (idCompra) {
    return `https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=${encodeURIComponent(idCompra)}`;
  }
  return 'https://www.gov.br/compras/pt-br/cidadao/portal-de-dados-abertos/portal-de-dados-abertos';
}

function extractSequence(value: string): string | undefined {
  const match = value.match(/\/(\d+)$/) || value.match(/-(\d+)\/(\d{4})$/);
  return match?.[1];
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function toPositiveNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(String(value || '').replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function clean(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalize(value?: string): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
