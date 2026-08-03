import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';

export interface RadarTenantProduct {
  id: string; organizationId: string; workspaceId: string; name: string; description: string;
  category?: string; manufacturer?: string; brand?: string; unit?: string;
  keywords: string[]; synonyms: string[]; classificationCodes: string[]; regions: string[];
  notes?: string; active: boolean; createdAt: string; updatedAt: string;
}
export interface RadarSavedSearch { id:string; organizationId:string; workspaceId:string; name:string; keywords:string[]; state?:string; city?:string; active:boolean; createdAt:string; updatedAt:string; }
export type RadarTenantProductInput = Omit<RadarTenantProduct,'id'|'organizationId'|'workspaceId'|'createdAt'|'updatedAt'> & { id?:string };
export type RadarSavedSearchInput = Omit<RadarSavedSearch,'id'|'organizationId'|'workspaceId'|'createdAt'|'updatedAt'> & { id?:string };

export class RadarTenantCatalogRepository {
  static listProducts():Promise<RadarTenantProduct[]> { return HttpRepositoryClient.get('/api/commercial/radar-catalog/products'); }
  static saveProduct(input:RadarTenantProductInput):Promise<RadarTenantProduct> { return HttpRepositoryClient.post('/api/commercial/radar-catalog/products',input); }
  static deleteProduct(id:string):Promise<void> { return HttpRepositoryClient.delete(`/api/commercial/radar-catalog/products/${encodeURIComponent(id)}`); }
  static listSearches():Promise<RadarSavedSearch[]> { return HttpRepositoryClient.get('/api/commercial/radar-catalog/searches'); }
  static saveSearch(input:RadarSavedSearchInput):Promise<RadarSavedSearch> { return HttpRepositoryClient.post('/api/commercial/radar-catalog/searches',input); }
  static deleteSearch(id:string):Promise<void> { return HttpRepositoryClient.delete(`/api/commercial/radar-catalog/searches/${encodeURIComponent(id)}`); }
}
