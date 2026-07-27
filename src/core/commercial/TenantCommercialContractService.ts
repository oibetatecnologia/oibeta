import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { SaveTenantCommercialContractInput, TenantCommercialContract, TenantCommercialContractSummary } from './TenantCommercialContractTypes';
const ENDPOINT='/api/admin/commercial-contracts';
export class TenantCommercialContractService {
 static list(tenantId?:string):Promise<TenantCommercialContract[]>{return HttpRepositoryClient.get(`${ENDPOINT}${tenantId?`?tenantId=${encodeURIComponent(tenantId)}`:''}`);}
 static save(input:SaveTenantCommercialContractInput):Promise<TenantCommercialContract>{return HttpRepositoryClient.post(ENDPOINT,input);}
 static buildSummary(items:TenantCommercialContract[]):TenantCommercialContractSummary{const active=items.filter(i=>i.status==='active');const in90=Date.now()+90*86400000;const expiring=items.filter(i=>i.endDate&&new Date(i.endDate).getTime()>=Date.now()&&new Date(i.endDate).getTime()<=in90).length;const mrr=active.reduce((s,i)=>s+i.monthlyValue,0);return {total:items.length,active:active.length,trial:items.filter(i=>i.status==='trial').length,paused:items.filter(i=>i.status==='paused').length,expiringIn90Days:expiring,monthlyRecurringRevenue:mrr,annualRecurringRevenue:mrr*12,contractedSetupValue:items.reduce((s,i)=>s+i.setupValue,0),licensedProducts:new Set(items.flatMap(i=>i.productIds)).size,readinessScore:items.length===0?30:Math.max(0,Math.min(100,70+active.length*8-expiring*3-items.filter(i=>i.status==='paused').length*5))};}
}
