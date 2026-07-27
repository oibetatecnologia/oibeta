import { BETA_MARKET_SERVICES, PROCUREMENT_OPPORTUNITY_TYPES, PROCUREMENT_SOURCES, getMarketServiceStatusLabel, type BetaMarketServiceDefinition, type ProcurementSourceDefinition } from './CommercialRadarRegistry';
import { OpportunityService } from './OpportunityService';
import { validateCommercialCatalog } from './CommercialProductCatalogValidator';
import type { CommercialDomainSnapshot } from './CommercialInterfaces';
import type { CommercialOpportunity } from './OpportunityTypes';

export interface CommercialRadarSummary { totalOpportunities:number; qualifiedOpportunities:number; reviewRequired:number; expiringSoon:number; probableDuplicates:number; connectedSources:number; monitoredSources:number; mappedServices:number; sellableServices:number; domainReadiness:number; }
export interface CommercialRadarSnapshot { opportunities:CommercialOpportunity[]; sources:ProcurementSourceDefinition[]; services:BetaMarketServiceDefinition[]; summary:CommercialRadarSummary; domain:CommercialDomainSnapshot; catalogValidation:ReturnType<typeof validateCommercialCatalog>; }
export interface CommercialRadarBetaSnapshot { generatedAt:string; topOpportunities:Array<{id:string;title:string;iac:number;qualificationStatus:string;deadline?:string;productIds:string[];recommendedAction:string}>; expiringOpportunityIds:string[]; qualifiedOpportunityIds:string[]; demandByProduct:Record<string,number>; missingEvidence:number; }
export class CommercialRadarService {
  static buildSnapshot(opportunities: CommercialOpportunity[] = []): CommercialRadarSnapshot {
    const domain = OpportunityService.buildDomainSnapshot(opportunities);
    const readinessItems = Object.values(domain.readiness);
    const now = Date.now();
    const inSevenDays = now + 7 * 86400000;
    const catalogValidation = validateCommercialCatalog();
    return { opportunities: domain.opportunities, sources: PROCUREMENT_SOURCES, services: catalogValidation.validServices, summary: {
      totalOpportunities: domain.opportunities.length,
      qualifiedOpportunities: domain.opportunities.filter((item) => item.qualificationStatus === 'qualified').length,
      reviewRequired: domain.opportunities.filter((item) => item.qualificationStatus === 'review_required').length,
      expiringSoon: domain.opportunities.filter((item) => item.submissionDeadline && new Date(item.submissionDeadline).getTime() >= now && new Date(item.submissionDeadline).getTime() <= inSevenDays).length,
      probableDuplicates: domain.opportunities.filter((item) => Boolean(item.probableDuplicateOf)).length,
      connectedSources: PROCUREMENT_SOURCES.filter((source) => source.status === 'connected').length,
      monitoredSources: PROCUREMENT_SOURCES.length,
      mappedServices: catalogValidation.validServices.filter((service) => service.status === 'mapped').length,
      sellableServices: catalogValidation.validServices.filter((service) => service.status === 'sellable').length,
      domainReadiness: Math.round((readinessItems.filter(Boolean).length / readinessItems.length) * 100),
    }, domain, catalogValidation };
  }
  static buildBetaSnapshot(opportunities: CommercialOpportunity[]): CommercialRadarBetaSnapshot {
    const snapshot = this.buildSnapshot(opportunities);
    const demandByProduct: Record<string, number> = {};
    snapshot.domain.analyses.forEach((analysis) => analysis.bestMatches.forEach((match) => { demandByProduct[match.productId] = (demandByProduct[match.productId] || 0) + 1; }));
    const topOpportunities = snapshot.opportunities.map((item) => ({ item, analysis: item.analysis || snapshot.domain.analyses.find((analysis) => analysis.opportunityId === item.id)! })).sort((a,b) => b.analysis.iac-a.analysis.iac).slice(0,10).map(({item,analysis}) => ({ id:item.id,title:item.title,iac:analysis.iac,qualificationStatus:item.qualificationStatus,deadline:item.submissionDeadline,productIds:analysis.bestMatches.map((match)=>match.productId),recommendedAction:analysis.recommendedAction }));
    return { generatedAt:new Date().toISOString(), topOpportunities, expiringOpportunityIds:snapshot.opportunities.filter((item)=>item.submissionDeadline && new Date(item.submissionDeadline).getTime()-Date.now() <= 7*86400000 && new Date(item.submissionDeadline).getTime()>=Date.now()).map((item)=>item.id), qualifiedOpportunityIds:snapshot.opportunities.filter((item)=>item.qualificationStatus==='qualified').map((item)=>item.id), demandByProduct, missingEvidence:snapshot.domain.analyses.reduce((sum,item)=>sum+item.findings.filter((finding)=>finding.kind==='missing_information').length,0) };
  }
  static getOpportunityTypes(){ return PROCUREMENT_OPPORTUNITY_TYPES; }
  static getStatusLabel(status: BetaMarketServiceDefinition['status']):string { return getMarketServiceStatusLabel(status); }
  static getSearchKeywords(service:BetaMarketServiceDefinition):string { return service.procurementKeywords.slice(0,4).join(', '); }
}
