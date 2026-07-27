import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../database/SupabaseDatabaseAdapter";
import type { AdminDirectoryService } from "../admin/AdminDirectoryService";
import type { SaveTenantCommercialContractInput, TenantCommercialContract, TenantCommercialContractSummary } from "./TenantCommercialContractTypes";
import { getInvalidOfficialProductIds, normalizeOfficialProductIds } from "../../src/products/officialProductIds";

const JSON_PATH = path.join(process.cwd(), ".data", "tenant-commercial-contracts.json");
const nowIso = () => new Date().toISOString();

export class TenantCommercialContractService {
  constructor(private readonly mode: "json" | "supabase", private readonly supabase: SupabaseDatabaseAdapter, private readonly directory: AdminDirectoryService) {}

  async list(tenantId?: string): Promise<TenantCommercialContract[]> {
    if (this.mode === "json") {
      return this.readJson().filter(item => !tenantId || item.tenantId === tenantId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    }
    let query = this.supabase.getClient().from("tenant_commercial_contracts").select("*").order("updated_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row:any)=>this.fromRow(row));
  }

  async save(input: SaveTenantCommercialContractInput): Promise<TenantCommercialContract> {
    const tenants = await this.directory.listTenants();
    const tenant = tenants.find(item => item.id === input.tenantId || item.organizationId === input.tenantId);
    if (!tenant) throw new Error("Tenant não encontrado.");
    if (!input.planName.trim() || !input.responsible.trim()) throw new Error("Plano e responsável são obrigatórios.");
    if (!Number.isFinite(input.monthlyValue) || input.monthlyValue < 0) throw new Error("Valor mensal inválido.");
    if (input.billingDay < 1 || input.billingDay > 28) throw new Error("Dia de cobrança deve ficar entre 1 e 28.");
    const invalidProductIds = getInvalidOfficialProductIds(input.productIds);
    if (invalidProductIds.length > 0) throw new Error(`Produtos não reconhecidos pelo catálogo oficial: ${invalidProductIds.join(", ")}`);
    const normalizedProductIds = normalizeOfficialProductIds(input.productIds);
    const timestamp = nowIso();
    const existing = (await this.list(tenant.id))[0];
    const contract: TenantCommercialContract = {
      id: existing?.id || crypto.randomUUID(), tenantId: tenant.id, organizationId: tenant.organizationId,
      planName: input.planName.trim(), status: input.status, productIds: normalizedProductIds,
      monthlyValue: input.monthlyValue, setupValue: input.setupValue || 0, billingDay: input.billingDay,
      startDate: input.startDate, endDate: input.endDate || undefined, autoRenew: input.autoRenew !== false,
      responsible: input.responsible.trim(), notes: input.notes?.trim() || undefined,
      createdAt: existing?.createdAt || timestamp, updatedAt: timestamp,
    };
    if (["trial","active","paused"].includes(contract.status)) {
      await this.directory.updateTenantProductLicenses(tenant.id, { productIds: contract.productIds, synchronizeUsers: true });
    }
    if (this.mode === "json") {
      const all=this.readJson(); const index=all.findIndex(item=>item.id===contract.id);
      if(index>=0) all[index]=contract; else all.unshift(contract); this.writeJson(all); return contract;
    }
    const { data, error } = await this.supabase.getClient().from("tenant_commercial_contracts").upsert(this.toRow(contract)).select().single();
    if(error) throw error; return this.fromRow(data);
  }

  buildSummary(items: TenantCommercialContract[]): TenantCommercialContractSummary {
    const activeItems=items.filter(i=>i.status==="active");
    const in90=Date.now()+90*86400000;
    const expiring=items.filter(i=>i.endDate && new Date(i.endDate).getTime()>=Date.now() && new Date(i.endDate).getTime()<=in90).length;
    const mrr=activeItems.reduce((s,i)=>s+i.monthlyValue,0);
    return { total:items.length, active:activeItems.length, trial:items.filter(i=>i.status==="trial").length,
      paused:items.filter(i=>i.status==="paused").length, expiringIn90Days:expiring,
      monthlyRecurringRevenue:mrr, annualRecurringRevenue:mrr*12,
      contractedSetupValue:items.reduce((s,i)=>s+i.setupValue,0),
      licensedProducts:new Set(items.flatMap(i=>i.productIds)).size,
      readinessScore: items.length===0?30:Math.max(0,Math.min(100,70+activeItems.length*8-expiring*3-items.filter(i=>i.status==="paused").length*5)) };
  }

  private readJson(): TenantCommercialContract[] { if(!fs.existsSync(JSON_PATH)) return []; try { const v=JSON.parse(fs.readFileSync(JSON_PATH,"utf-8")); return Array.isArray(v)?v:[];} catch{return [];} }
  private writeJson(v:TenantCommercialContract[]){fs.mkdirSync(path.dirname(JSON_PATH),{recursive:true});fs.writeFileSync(JSON_PATH,JSON.stringify(v,null,2),"utf-8");}
  private toRow(i:TenantCommercialContract){return {id:i.id,tenant_id:i.tenantId,organization_id:i.organizationId,plan_name:i.planName,status:i.status,product_ids:i.productIds,monthly_value:i.monthlyValue,setup_value:i.setupValue,billing_day:i.billingDay,start_date:i.startDate,end_date:i.endDate||null,auto_renew:i.autoRenew,responsible:i.responsible,notes:i.notes||null,created_at:i.createdAt,updated_at:i.updatedAt};}
  private fromRow(r:any):TenantCommercialContract{return {id:r.id,tenantId:r.tenant_id,organizationId:r.organization_id,planName:r.plan_name,status:r.status,productIds:Array.isArray(r.product_ids)?r.product_ids:[],monthlyValue:Number(r.monthly_value||0),setupValue:Number(r.setup_value||0),billingDay:Number(r.billing_day||1),startDate:r.start_date,endDate:r.end_date||undefined,autoRenew:Boolean(r.auto_renew),responsible:r.responsible,notes:r.notes||undefined,createdAt:r.created_at,updatedAt:r.updated_at};}
}
