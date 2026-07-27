import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import { PersistenceFallbackPolicyService } from '../persistence/PersistenceFallbackPolicyService';
import { RepositoryHealthService } from '../persistence/RepositoryHealthService';
import { createOpportunityDraft } from './OpportunityRegistry';
import { ensureCurrentOpportunityAnalysis } from './OpportunityAnalyzer';
import { findProbableDuplicate } from './OpportunityNormalizer';
import { OpportunityStorage } from './OpportunityStorage';
import type { CommercialOpportunity, CommercialOpportunityInput } from './OpportunityTypes';
const API_BASE_PATH='/api/commercial/opportunities'; const REPOSITORY_ID='commercial-opportunities';
export class OpportunityRepository {
  static async list():Promise<CommercialOpportunity[]> { try { const items=await HttpRepositoryClient.get<CommercialOpportunity[]>(API_BASE_PATH); RepositoryHealthService.markApi(REPOSITORY_ID); return items.map(normalizeStored); } catch(error){ console.warn('[CommercialRadar] API indisponível. Usando fallback local.',error); if(!PersistenceFallbackPolicyService.canUseFallback()){RepositoryHealthService.markError(REPOSITORY_ID,error);throw error;} RepositoryHealthService.markFallback(REPOSITORY_ID,error); return OpportunityStorage.list().map(normalizeStored); } }
  static async create(input:CommercialOpportunityInput):Promise<CommercialOpportunity> { const current=await this.list(); const draft=createOpportunityDraft(input); const duplicate=findProbableDuplicate(draft,current); const payload={...draft, probableDuplicateOf:duplicate?.id}; try { const item=await HttpRepositoryClient.post<CommercialOpportunity>(API_BASE_PATH,payload); RepositoryHealthService.markApi(REPOSITORY_ID); return normalizeStored(item); } catch(error){ console.warn('[CommercialRadar] API indisponível. Salvando no fallback local.',error); if(!PersistenceFallbackPolicyService.canUseFallback()){RepositoryHealthService.markError(REPOSITORY_ID,error);throw error;} RepositoryHealthService.markFallback(REPOSITORY_ID,error); return OpportunityStorage.create(payload); } }
  static async update(id:string, changes:Partial<CommercialOpportunity>):Promise<CommercialOpportunity> { try { const item=await HttpRepositoryClient.patch<CommercialOpportunity>(`${API_BASE_PATH}/${encodeURIComponent(id)}`,changes); RepositoryHealthService.markApi(REPOSITORY_ID); return normalizeStored(item); } catch(error){ if(!PersistenceFallbackPolicyService.canUseFallback()){RepositoryHealthService.markError(REPOSITORY_ID,error);throw error;} RepositoryHealthService.markFallback(REPOSITORY_ID,error); return OpportunityStorage.update(id,changes); } }
  static async delete(id:string):Promise<void>{ try{await HttpRepositoryClient.delete(`${API_BASE_PATH}/${encodeURIComponent(id)}`);RepositoryHealthService.markApi(REPOSITORY_ID);}catch(error){if(!PersistenceFallbackPolicyService.canUseFallback()){RepositoryHealthService.markError(REPOSITORY_ID,error);throw error;}RepositoryHealthService.markFallback(REPOSITORY_ID,error);OpportunityStorage.delete(id);} }
}
function normalizeStored(item:CommercialOpportunity):CommercialOpportunity {
  const normalized={...item, qualificationStatus:item.qualificationStatus||'unqualified'};
  return {...normalized, analysis:ensureCurrentOpportunityAnalysis(normalized)};
}
