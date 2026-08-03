import { normalizeCommercialText } from './OpportunityNormalizer';
import type { CommercialFinding, CommercialOpportunity, OpportunityMatchResult } from './OpportunityTypes';

export interface CompatibilityProfile {
  id: string;
  productId: string;
  name: string;
  anchorKeywords: string[];
  supportingKeywords: string[];
  exclusionKeywords?: string[];
  category?: string;
  regions?: string[];
  minimumScore?: number;
  origin: 'beta_catalog' | 'tenant_catalog';
}

export class CompatibilityEngine {
  static match(opportunity: CommercialOpportunity, profiles: CompatibilityProfile[]): OpportunityMatchResult[] {
    const content = normalizeCommercialText([opportunity.title, opportunity.object, opportunity.notes].filter(Boolean).join(' '));
    const location = normalizeCommercialText([opportunity.city, opportunity.state].filter(Boolean).join(' '));
    return profiles.map((profile) => this.matchProfile(content, location, profile)).filter((item): item is OpportunityMatchResult => Boolean(item)).sort((a,b)=>b.score-a.score);
  }

  private static matchProfile(content:string, location:string, profile:CompatibilityProfile):OpportunityMatchResult|undefined {
    const anchors = matchTerms(content, profile.anchorKeywords);
    const supports = matchTerms(content, profile.supportingKeywords);
    const exclusions = matchTerms(content, profile.exclusionKeywords || []);
    const categoryMatch = profile.category ? content.includes(normalizeCommercialText(profile.category)) : false;
    const regionMatch = !profile.regions?.length || profile.regions.some((region)=>location.includes(normalizeCommercialText(region)));
    if (anchors.length === 0 && supports.length === 0 && !categoryMatch) return undefined;
    const anchorScore = Math.min(75, anchors.reduce((sum,term)=>sum+termWeight(term),0));
    const supportScore = Math.min(45, supports.reduce((sum,term)=>sum+Math.round(termWeight(term)*0.55),0));
    const categoryScore = categoryMatch ? 15 : 0;
    const regionScore = regionMatch ? 5 : -12;
    const exclusionPenalty = Math.min(60, exclusions.length*25);
    const score = Math.max(0,Math.min(100,Math.round(anchorScore+supportScore+categoryScore+regionScore-exclusionPenalty)));
    if (score < (profile.minimumScore ?? 45)) return undefined;
    const findings:CommercialFinding[] = [
      ...anchors.map((term)=>finding(`anchor-${profile.id}-${term}`,'evidence',term,`Termo principal do produto identificado: ${term}.`)),
      ...supports.map((term)=>finding(`support-${profile.id}-${term}`,'evidence',term,`Termo relacionado ao produto identificado: ${term}.`)),
    ];
    if (categoryMatch) findings.push(finding(`category-${profile.id}`,'inference',profile.category || 'Categoria compatível',`A categoria ${profile.category} aparece no objeto da oportunidade.`));
    if (!regionMatch) findings.push(finding(`region-${profile.id}`,'hypothesis','Região fora do foco cadastrado','A oportunidade está fora das regiões preferenciais cadastradas para este produto.'));
    exclusions.forEach((term)=>findings.push(finding(`exclusion-${profile.id}-${term}`,'inference',`Possível exclusão: ${term}`,`O objeto contém termo configurado como exclusão: ${term}.`)));
    return { origin: profile.origin, serviceId:profile.id, productId:profile.productId, serviceName:profile.name, score, matchedKeywords:[...anchors,...supports], findings, missingRequirements:findings.filter((item)=>item.kind==='hypothesis'||item.kind==='missing_information').map((item)=>item.label) };
  }
}
function matchTerms(text:string,terms:string[]):string[]{ return [...new Set(terms.map((term)=>term.trim()).filter((term)=>normalizeCommercialText(term).length>=2 && text.includes(normalizeCommercialText(term))))]; }
function termWeight(term:string):number { const words=normalizeCommercialText(term).split(/\s+/).filter(Boolean).length; return words>=3?48:words===2?38:26; }
function finding(id:string,kind:CommercialFinding['kind'],label:string,detail:string):CommercialFinding { return {id:normalizeCommercialText(id).replace(/\s+/g,'-'),kind,label,detail,sourceField:'object'}; }
