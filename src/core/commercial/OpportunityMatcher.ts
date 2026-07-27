import { validateCommercialCatalog } from './CommercialProductCatalogValidator';
import { normalizeCommercialText } from './OpportunityNormalizer';
import type { CommercialFinding, CommercialOpportunity, OpportunityMatchResult } from './OpportunityTypes';

const GENERIC_TECH_TERMS = new Set([
  'software',
  'sistema',
  'plataforma',
  'tecnologia',
  'informatica',
  'servico',
  'servicos',
  'implantacao',
  'suporte',
  'digital',
]);

const TECHNOLOGY_CONTEXT_TERMS = [
  'software',
  'sistema',
  'plataforma',
  'saas',
  'solucao integrada',
  'sistema informatizado',
  'cessao de uso',
  'licenciamento',
  'aplicativo',
  'implantacao de sistema',
];

export class OpportunityMatcher {
  static match(opportunity: CommercialOpportunity): OpportunityMatchResult[] {
    const contentText = normalizeCommercialText([
      opportunity.title,
      opportunity.object,
      opportunity.notes,
    ].filter(Boolean).join(' '));
    const buyerText = normalizeCommercialText([
      opportunity.buyerName,
      opportunity.city,
      opportunity.state,
    ].filter(Boolean).join(' '));

    return validateCommercialCatalog().validServices
      .map((service): OpportunityMatchResult | undefined => {
        const anchors = matchTerms(contentText, service.anchorKeywords);
        const supports = matchTerms(contentText, service.supportingKeywords)
          .filter((term) => !GENERIC_TECH_TERMS.has(normalizeCommercialText(term)));
        const exclusions = matchTerms(contentText, service.exclusionKeywords || []);
        const technologySignals = matchTerms(contentText, TECHNOLOGY_CONTEXT_TERMS);
        const typeMatch = service.opportunityTypes.includes(opportunity.type);
        const buyerMatch = service.targetBuyers.some((buyer) => buyerText.includes(normalizeCommercialText(buyer)));

        // Modalidade e órgão nunca comprovam aderência sozinhos. A aderência exige
        // expressão âncora, duas evidências específicas ou uma evidência específica
        // acompanhada de contexto tecnológico explícito no objeto.
        const hasCommercialEvidence = anchors.length > 0
          || supports.length >= 2
          || (supports.length >= 1 && technologySignals.length >= 1);
        if (!hasCommercialEvidence) return undefined;

        const anchorContribution = Math.min(72, anchors.reduce((total, term) => total + termWeight(term), 0));
        const supportContribution = Math.min(52, supports.reduce((total, term) => total + Math.round(termWeight(term) * 0.7), 0));
        const technologyContribution = anchors.length === 0 && supports.length > 0 && technologySignals.length > 0 ? 14 : 0;
        const contextContribution = (typeMatch ? 5 : 0) + (buyerMatch ? 5 : 0);
        const exclusionPenalty = exclusions.length > 0 && anchors.length === 0
          ? 55
          : Math.min(30, exclusions.length * 15);
        const score = Math.max(0, Math.min(100, Math.round(anchorContribution + supportContribution + technologyContribution + contextContribution - exclusionPenalty)));
        const minimumScore = service.minimumMatchScore ?? 55;
        if (score < minimumScore) return undefined;

        const matchedKeywords = [...anchors, ...supports];
        const findings = buildFindings({ anchors, supports, exclusions, technologySignals, typeMatch, buyerMatch });
        return {
          serviceId: service.id,
          productId: service.productId,
          serviceName: service.shortName,
          score,
          matchedKeywords,
          findings,
          missingRequirements: findings
            .filter((item) => item.kind === 'missing_information' || item.kind === 'hypothesis')
            .map((item) => item.label),
        };
      })
      .filter((match): match is OpportunityMatchResult => Boolean(match))
      .sort((a, b) => b.score - a.score);
  }
}

function matchTerms(text: string, terms: string[]): string[] {
  return terms.filter((term) => {
    const normalized = normalizeCommercialText(term);
    return normalized.length >= 3 && text.includes(normalized);
  });
}

function termWeight(term: string): number {
  const words = normalizeCommercialText(term).split(/\s+/).filter(Boolean).length;
  if (words >= 4) return 58;
  if (words === 3) return 52;
  if (words === 2) return 46;
  return 36;
}

function buildFindings(input: {
  anchors: string[];
  supports: string[];
  exclusions: string[];
  technologySignals: string[];
  typeMatch: boolean;
  buyerMatch: boolean;
}): CommercialFinding[] {
  const findings: CommercialFinding[] = [];

  input.anchors.forEach((keyword) => findings.push({
    id: `anchor-${normalizeCommercialText(keyword)}`,
    kind: 'evidence',
    label: keyword,
    detail: `Expressão específica do produto identificada no objeto da contratação: ${keyword}.`,
    sourceField: 'object',
  }));

  input.supports.forEach((keyword) => findings.push({
    id: `support-${normalizeCommercialText(keyword)}`,
    kind: 'evidence',
    label: keyword,
    detail: `Evidência complementar identificada no conteúdo da oportunidade: ${keyword}.`,
    sourceField: 'object',
  }));


  if (input.technologySignals.length > 0 && input.supports.length > 0) findings.push({
    id: 'technology-context',
    kind: 'inference',
    label: 'Contexto tecnológico explícito',
    detail: `O objeto menciona contexto tecnológico (${input.technologySignals.slice(0, 3).join(', ')}) associado a evidência funcional específica do produto.`,
    sourceField: 'object',
  });

  if (input.typeMatch) findings.push({
    id: 'type-match',
    kind: 'inference',
    label: 'Modalidade comercialmente atendida',
    detail: 'A modalidade é compatível com a forma de contratação do produto, mas não comprova aderência ao objeto.',
    sourceField: 'metadata',
  });

  if (input.buyerMatch) findings.push({
    id: 'buyer-match',
    kind: 'inference',
    label: 'Perfil de comprador compatível',
    detail: 'O órgão é semelhante ao público-alvo cadastrado, mas essa informação não comprova aderência funcional.',
    sourceField: 'buyerName',
  });

  input.exclusions.forEach((keyword) => findings.push({
    id: `exclusion-${normalizeCommercialText(keyword)}`,
    kind: 'inference',
    label: `Objeto potencialmente fora do escopo: ${keyword}`,
    detail: 'O objeto contém item normalmente associado à aquisição de bens ou serviços não atendidos pelo produto. Exige revisão humana.',
    sourceField: 'object',
  }));

  return findings;
}
