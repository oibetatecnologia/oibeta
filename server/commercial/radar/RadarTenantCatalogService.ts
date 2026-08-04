import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SupabaseDatabaseAdapter } from '../../database/SupabaseDatabaseAdapter';

export interface RadarTenantProduct {
  id: string;
  organizationId: string;
  workspaceId?: string;
  name: string;
  description: string;
  category?: string;
  manufacturer?: string;
  brand?: string;
  unit?: string;
  keywords: string[];
  synonyms: string[];
  classificationCodes: string[];
  regions: string[];
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RadarSavedSearch {
  id: string;
  organizationId: string;
  workspaceId?: string;
  name: string;
  keywords: string[];
  state?: string;
  city?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JsonState {
  products: RadarTenantProduct[];
  searches: RadarSavedSearch[];
}

const JSON_PATH = path.join(process.cwd(), '.data', 'radar-tenant-catalog.json');

export class RadarTenantCatalogService {
  constructor(
    private readonly mode: 'supabase' | 'json',
    private readonly adapter: SupabaseDatabaseAdapter,
  ) {}

  async listProducts(organizationId: string, workspaceId?: string): Promise<RadarTenantProduct[]> {
    if (this.mode === 'json') return this.readJson().products.filter((item) => item.organizationId === organizationId && item.workspaceId === workspaceId);
    let query = this.adapter.getClient().from('radar_tenant_products').select('*').eq('organization_id', organizationId);
    query = workspaceId ? query.eq('workspace_id', workspaceId) : query.is('workspace_id', null);
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.fromProductRow);
  }

  async saveProduct(input: Partial<RadarTenantProduct> & Pick<RadarTenantProduct, 'organizationId' | 'name'>): Promise<RadarTenantProduct> {
    const now = new Date().toISOString();
    const item: RadarTenantProduct = {
      id: input.id || randomUUID(),
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      name: String(input.name || '').trim(),
      description: String(input.description || '').trim(),
      category: cleanOptional(input.category),
      manufacturer: cleanOptional(input.manufacturer),
      brand: cleanOptional(input.brand),
      unit: cleanOptional(input.unit),
      keywords: cleanList(input.keywords),
      synonyms: cleanList(input.synonyms),
      classificationCodes: cleanList(input.classificationCodes),
      regions: cleanList(input.regions),
      notes: cleanOptional(input.notes),
      active: input.active !== false,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    if (!item.name) throw new Error('Nome do produto é obrigatório.');
    if (this.mode === 'json') {
      const state = this.readJson();
      const existing = state.products.find((current) => current.id === item.id);
      if (existing && (existing.organizationId !== item.organizationId || existing.workspaceId !== item.workspaceId)) {
        throw new Error('Produto não pertence ao tenant e workspace autenticados.');
      }
      const index = state.products.findIndex((current) => current.id === item.id);
      if (index >= 0) {
        item.createdAt = state.products[index].createdAt;
        state.products[index] = item;
      } else {
        state.products.unshift(item);
      }
      this.writeJson(state);
      return item;
    }
    if (input.id) {
      const { data: existing, error: existingError } = await this.adapter.getClient()
        .from('radar_tenant_products')
        .select('id,organization_id,workspace_id,created_at')
        .eq('id', input.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing && (existing.organization_id !== item.organizationId || (existing.workspace_id || undefined) !== item.workspaceId)) {
        throw new Error('Produto não pertence ao tenant e workspace autenticados.');
      }
      if (existing?.created_at) item.createdAt = existing.created_at;
    }
    const { data, error } = await this.adapter.getClient().from('radar_tenant_products').upsert(this.toProductRow(item), { onConflict: 'id' }).select('*').single();
    if (error) throw error;
    return this.fromProductRow(data);
  }

  async deleteProduct(id: string, organizationId: string, workspaceId?: string): Promise<void> {
    if (this.mode === 'json') {
      const state = this.readJson();
      state.products = state.products.filter((item) => !(item.id === id && item.organizationId === organizationId && item.workspaceId === workspaceId));
      this.writeJson(state);
      return;
    }
    const { error } = await this.adapter.getClient().from('radar_tenant_products').delete().eq('id', id).eq('organization_id', organizationId).eq('workspace_id', workspaceId);
    if (error) throw error;
  }

  async listSearches(organizationId: string, workspaceId?: string): Promise<RadarSavedSearch[]> {
    if (this.mode === 'json') return this.readJson().searches.filter((item) => item.organizationId === organizationId && item.workspaceId === workspaceId);
    let query = this.adapter.getClient().from('radar_saved_searches').select('*').eq('organization_id', organizationId);
    query = workspaceId ? query.eq('workspace_id', workspaceId) : query.is('workspace_id', null);
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(this.fromSearchRow);
  }

  async saveSearch(input: Partial<RadarSavedSearch> & Pick<RadarSavedSearch, 'organizationId' | 'name'>): Promise<RadarSavedSearch> {
    const now = new Date().toISOString();
    const item: RadarSavedSearch = {
      id: input.id || randomUUID(), organizationId: input.organizationId, workspaceId: input.workspaceId,
      name: String(input.name || '').trim(), keywords: cleanList(input.keywords), state: cleanOptional(input.state), city: cleanOptional(input.city),
      active: input.active !== false, createdAt: input.createdAt || now, updatedAt: now,
    };
    if (!item.name || item.keywords.length === 0) throw new Error('Nome e ao menos uma palavra-chave são obrigatórios.');
    if (this.mode === 'json') {
      const state = this.readJson();
      const existing = state.searches.find((current) => current.id === item.id);
      if (existing && (existing.organizationId !== item.organizationId || existing.workspaceId !== item.workspaceId)) {
        throw new Error('Pesquisa não pertence ao tenant e workspace autenticados.');
      }
      const index = state.searches.findIndex((current) => current.id === item.id);
      if (index >= 0) {
        item.createdAt = state.searches[index].createdAt;
        state.searches[index] = item;
      } else {
        state.searches.unshift(item);
      }
      this.writeJson(state);
      return item;
    }
    if (input.id) {
      const { data: existing, error: existingError } = await this.adapter.getClient()
        .from('radar_saved_searches')
        .select('id,organization_id,workspace_id,created_at')
        .eq('id', input.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing && (existing.organization_id !== item.organizationId || (existing.workspace_id || undefined) !== item.workspaceId)) {
        throw new Error('Pesquisa não pertence ao tenant e workspace autenticados.');
      }
      if (existing?.created_at) item.createdAt = existing.created_at;
    }
    const { data, error } = await this.adapter.getClient().from('radar_saved_searches').upsert(this.toSearchRow(item), { onConflict: 'id' }).select('*').single();
    if (error) throw error; return this.fromSearchRow(data);
  }

  async deleteSearch(id: string, organizationId: string, workspaceId?: string): Promise<void> {
    if (this.mode === 'json') { const state = this.readJson(); state.searches = state.searches.filter((item) => !(item.id === id && item.organizationId === organizationId && item.workspaceId === workspaceId)); this.writeJson(state); return; }
    let query = this.adapter.getClient().from('radar_saved_searches').delete().eq('id', id).eq('organization_id', organizationId);
    query = workspaceId ? query.eq('workspace_id', workspaceId) : query.is('workspace_id', null);
    const { error } = await query; if (error) throw error;
  }

  private readJson(): JsonState { try { if (!fs.existsSync(JSON_PATH)) return { products: [], searches: [] }; const parsed = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')); return { products: Array.isArray(parsed.products) ? parsed.products : [], searches: Array.isArray(parsed.searches) ? parsed.searches : [] }; } catch { return { products: [], searches: [] }; } }
  private writeJson(state: JsonState): void { fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true }); fs.writeFileSync(JSON_PATH, JSON.stringify(state, null, 2)); }
  private toProductRow(item: RadarTenantProduct) { return { id:item.id, organization_id:item.organizationId, workspace_id:item.workspaceId||null, name:item.name, description:item.description, category:item.category||null, manufacturer:item.manufacturer||null, brand:item.brand||null, unit:item.unit||null, keywords:item.keywords, synonyms:item.synonyms, classification_codes:item.classificationCodes, regions:item.regions, notes:item.notes||null, active:item.active, created_at:item.createdAt, updated_at:item.updatedAt }; }
  private fromProductRow = (row:any):RadarTenantProduct => ({ id:row.id, organizationId:row.organization_id, workspaceId:row.workspace_id||undefined, name:row.name, description:row.description||'', category:row.category||undefined, manufacturer:row.manufacturer||undefined, brand:row.brand||undefined, unit:row.unit||undefined, keywords:Array.isArray(row.keywords)?row.keywords:[], synonyms:Array.isArray(row.synonyms)?row.synonyms:[], classificationCodes:Array.isArray(row.classification_codes)?row.classification_codes:[], regions:Array.isArray(row.regions)?row.regions:[], notes:row.notes||undefined, active:row.active!==false, createdAt:row.created_at, updatedAt:row.updated_at });
  private toSearchRow(item: RadarSavedSearch) { return { id:item.id, organization_id:item.organizationId, workspace_id:item.workspaceId||null, name:item.name, keywords:item.keywords, state:item.state||null, city:item.city||null, active:item.active, created_at:item.createdAt, updated_at:item.updatedAt }; }
  private fromSearchRow = (row:any):RadarSavedSearch => ({ id:row.id, organizationId:row.organization_id, workspaceId:row.workspace_id||undefined, name:row.name, keywords:Array.isArray(row.keywords)?row.keywords:[], state:row.state||undefined, city:row.city||undefined, active:row.active!==false, createdAt:row.created_at, updatedAt:row.updated_at });
}

function cleanList(value: unknown): string[] { const input = Array.isArray(value) ? value : String(value || '').split(','); return [...new Set(input.map((item) => String(item).trim()).filter(Boolean))]; }
function cleanOptional(value: unknown): string | undefined { const normalized = String(value || '').trim(); return normalized || undefined; }
