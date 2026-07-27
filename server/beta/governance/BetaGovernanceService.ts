import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SupabaseDatabaseAdapter } from "../../database/SupabaseDatabaseAdapter";
import type { BetaGovernanceAsset, BetaGovernanceSummary, UpsertBetaGovernanceAssetInput } from "./BetaGovernanceTypes";

const JSON_PATH = path.join(process.cwd(), ".data", "beta-governance-assets.json");

export class BetaGovernanceService {
  constructor(private readonly mode: "json" | "supabase", private readonly supabase: SupabaseDatabaseAdapter) {}

  async list(organizationId: string, workspaceId: string): Promise<BetaGovernanceAsset[]> {
    if (this.mode === "json") return this.readJson().filter(i => i.organizationId === organizationId && i.workspaceId === workspaceId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    const { data, error } = await this.supabase.getClient().from("beta_governance_assets").select("*").eq("organization_id", organizationId).eq("workspace_id", workspaceId).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row:any)=>this.fromRow(row));
  }

  async upsert(organizationId: string, workspaceId: string, input: UpsertBetaGovernanceAssetInput): Promise<BetaGovernanceAsset> {
    if (!input.title.trim() || !input.owner.trim()) throw new Error("Título e responsável são obrigatórios.");
    if (input.type === "automation" && (!input.trigger?.trim() || !input.action?.trim())) throw new Error("Automações exigem gatilho e ação.");
    const now = new Date().toISOString();
    const asset: BetaGovernanceAsset = {
      id: input.id || crypto.randomUUID(), organizationId, workspaceId, type: input.type,
      title: input.title.trim(), description: input.description.trim(), status: input.status || "draft",
      sensitivity: input.sensitivity || "internal", owner: input.owner.trim(), source: input.source?.trim() || undefined,
      version: input.version?.trim() || "1.0", tags: (input.tags || []).map(t=>t.trim()).filter(Boolean),
      trigger: input.trigger?.trim() || undefined, action: input.action?.trim() || undefined,
      requiresApproval: input.type === "automation" ? input.requiresApproval !== false : Boolean(input.requiresApproval),
      lastReviewedAt: input.status === "active" ? now : undefined, nextReviewAt: input.nextReviewAt || undefined,
      createdAt: now, updatedAt: now,
    };
    if (this.mode === "json") {
      const items=this.readJson(); const idx=items.findIndex(i=>i.id===asset.id && i.organizationId===organizationId && i.workspaceId===workspaceId);
      if (idx>=0) { asset.createdAt=items[idx].createdAt; asset.lastReviewedAt=asset.lastReviewedAt || items[idx].lastReviewedAt; items[idx]=asset; } else items.unshift(asset);
      this.writeJson(items.slice(0,10000)); return asset;
    }
    const { data, error } = await this.supabase.getClient().from("beta_governance_assets").upsert(this.toRow(asset), { onConflict: "id" }).select().single();
    if (error) throw error; return this.fromRow(data);
  }

  async setStatus(organizationId:string, workspaceId:string, id:string, status:BetaGovernanceAsset["status"], owner:string):Promise<BetaGovernanceAsset> {
    const current=(await this.list(organizationId,workspaceId)).find(i=>i.id===id); if(!current) throw new Error("Ativo de governança não encontrado.");
    return this.upsert(organizationId,workspaceId,{...current,status,owner:owner.trim()||current.owner,nextReviewAt:current.nextReviewAt});
  }

  buildSummary(items: BetaGovernanceAsset[]): BetaGovernanceSummary {
    const now=Date.now(); const count=(s:BetaGovernanceAsset["status"])=>items.filter(i=>i.status===s).length;
    const overdueReviews=items.filter(i=>i.status==='active' && i.nextReviewAt && new Date(i.nextReviewAt).getTime()<now).length;
    const restrictedAssets=items.filter(i=>i.sensitivity==='restricted').length;
    const automationsWithoutApproval=items.filter(i=>i.type==='automation' && i.status==='active' && !i.requiresApproval).length;
    const coverage=Math.min(100, items.length*8); const penalty=overdueReviews*8+automationsWithoutApproval*20+count('draft')*2;
    return { total:items.length, active:count('active'), draft:count('draft'), paused:count('paused'), archived:count('archived'),
      knowledge:items.filter(i=>i.type==='knowledge').length, memories:items.filter(i=>i.type==='memory').length,
      automations:items.filter(i=>i.type==='automation').length, skills:items.filter(i=>i.type==='skill').length,
      overdueReviews, restrictedAssets, automationsWithoutApproval, governanceScore:Math.max(0,Math.min(100,coverage-penalty)) };
  }

  private readJson():BetaGovernanceAsset[]{ if(!fs.existsSync(JSON_PATH)) return []; try{const p=JSON.parse(fs.readFileSync(JSON_PATH,'utf-8'));return Array.isArray(p)?p:[]}catch{return []} }
  private writeJson(items:BetaGovernanceAsset[]){fs.mkdirSync(path.dirname(JSON_PATH),{recursive:true});fs.writeFileSync(JSON_PATH,JSON.stringify(items,null,2),'utf-8')}
  private toRow(i:BetaGovernanceAsset){return {id:i.id,organization_id:i.organizationId,workspace_id:i.workspaceId,type:i.type,title:i.title,description:i.description,status:i.status,sensitivity:i.sensitivity,owner:i.owner,source:i.source||null,version:i.version,tags:i.tags,trigger:i.trigger||null,action:i.action||null,requires_approval:i.requiresApproval,last_reviewed_at:i.lastReviewedAt||null,next_review_at:i.nextReviewAt||null,created_at:i.createdAt,updated_at:i.updatedAt}}
  private fromRow(r:any):BetaGovernanceAsset{return {id:r.id,organizationId:r.organization_id,workspaceId:r.workspace_id,type:r.type,title:r.title,description:r.description,status:r.status,sensitivity:r.sensitivity,owner:r.owner,source:r.source||undefined,version:r.version,tags:Array.isArray(r.tags)?r.tags:[],trigger:r.trigger||undefined,action:r.action||undefined,requiresApproval:Boolean(r.requires_approval),lastReviewedAt:r.last_reviewed_at||undefined,nextReviewAt:r.next_review_at||undefined,createdAt:r.created_at,updatedAt:r.updated_at}}
}
