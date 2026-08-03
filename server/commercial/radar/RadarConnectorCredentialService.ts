import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseDatabaseAdapter } from '../../database/SupabaseDatabaseAdapter';

export type ConnectorCredentialScope = 'global' | 'tenant';
export type ConnectorAuthPolicy = 'PUBLIC_NO_AUTH' | 'GLOBAL_PLATFORM' | 'TENANT_PROVIDED' | 'GLOBAL_OR_TENANT';

export interface ConnectorCredentialMetadata {
  connectorId: string;
  scope: ConnectorCredentialScope;
  organizationId?: string;
  configured: boolean;
  maskedValue?: string;
  label?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface StoredCredential extends ConnectorCredentialMetadata {
  id: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  createdAt: string;
}

const JSON_PATH = path.join(process.cwd(), '.data', 'radar-connector-credentials.json');
const nowIso = () => new Date().toISOString();

function getEncryptionKey(): Buffer {
  const raw = String(process.env.CONNECTOR_CREDENTIALS_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '').trim();
  if (!raw) {
    throw new Error('CONNECTOR_CREDENTIALS_ENCRYPTION_KEY is required to store connector credentials.');
  }
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

function maskSecret(secret: string): string {
  const clean = secret.trim();
  if (!clean) return '';
  const suffix = clean.slice(-4);
  return `••••••••••••${suffix}`;
}

function encryptSecret(secret: string): { encryptedValue: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return {
    encryptedValue: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptSecret(item: Pick<StoredCredential, 'encryptedValue' | 'iv' | 'authTag'>): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(item.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(item.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(item.encryptedValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export class RadarConnectorCredentialService {
  constructor(
    private readonly mode: 'json' | 'supabase',
    private readonly supabase: SupabaseDatabaseAdapter,
  ) {}

  async listMetadata(organizationId: string): Promise<ConnectorCredentialMetadata[]> {
    const items = await this.listStored();
    return items
      .filter((item) => item.scope === 'global' || item.organizationId === organizationId)
      .map((item) => this.toMetadata(item));
  }

  async upsert(input: {
    connectorId: string;
    scope: ConnectorCredentialScope;
    organizationId?: string;
    secret: string;
    label?: string;
    updatedBy: string;
  }): Promise<ConnectorCredentialMetadata> {
    const connectorId = input.connectorId.trim().toLowerCase();
    const secret = input.secret.trim();
    if (!connectorId) throw new Error('connectorId is required');
    if (!secret) throw new Error('Credential value is required');
    if (input.scope === 'tenant' && !input.organizationId) throw new Error('organizationId is required for tenant credentials');

    const all = await this.listStored();
    const existing = all.find((item) =>
      item.connectorId === connectorId &&
      item.scope === input.scope &&
      (input.scope === 'global' || item.organizationId === input.organizationId),
    );
    const encrypted = encryptSecret(secret);
    const timestamp = nowIso();
    const record: StoredCredential = {
      id: existing?.id || crypto.randomUUID(),
      connectorId,
      scope: input.scope,
      organizationId: input.scope === 'tenant' ? input.organizationId : undefined,
      configured: true,
      maskedValue: maskSecret(secret),
      label: input.label?.trim() || existing?.label,
      updatedAt: timestamp,
      updatedBy: input.updatedBy,
      createdAt: existing?.createdAt || timestamp,
      ...encrypted,
    };
    await this.persist(record, all);
    return this.toMetadata(record);
  }

  async revoke(input: { connectorId: string; scope: ConnectorCredentialScope; organizationId?: string }): Promise<void> {
    const all = await this.listStored();
    const filtered = all.filter((item) => !(
      item.connectorId === input.connectorId &&
      item.scope === input.scope &&
      (input.scope === 'global' || item.organizationId === input.organizationId)
    ));
    await this.replaceAll(filtered);
  }

  async resolve(connectorId: string, organizationId: string): Promise<{ value: string; scope: ConnectorCredentialScope } | undefined> {
    const items = await this.listStored();
    const tenant = items.find((item) => item.connectorId === connectorId && item.scope === 'tenant' && item.organizationId === organizationId);
    if (tenant) return { value: decryptSecret(tenant), scope: 'tenant' };
    const global = items.find((item) => item.connectorId === connectorId && item.scope === 'global');
    if (global) return { value: decryptSecret(global), scope: 'global' };
    return undefined;
  }

  private async listStored(): Promise<StoredCredential[]> {
    if (this.mode === 'json') return this.readJson();
    const { data, error } = await this.supabase.getClient().from('radar_connector_credentials').select('*');
    if (error) throw error;
    return (data || []).map((row: any) => this.fromRow(row));
  }

  private async persist(record: StoredCredential, current: StoredCredential[]): Promise<void> {
    if (this.mode === 'json') {
      const next = current.filter((item) => item.id !== record.id);
      next.push(record);
      this.writeJson(next);
      return;
    }
    const { error } = await this.supabase.getClient()
      .from('radar_connector_credentials')
      .upsert(this.toRow(record), { onConflict: 'credential_key' });
    if (error) throw error;
  }

  private async replaceAll(items: StoredCredential[]): Promise<void> {
    if (this.mode === 'json') {
      this.writeJson(items);
      return;
    }
    const existing = await this.listStored();
    const keep = new Set(items.map((item) => item.id));
    const removeIds = existing.filter((item) => !keep.has(item.id)).map((item) => item.id);
    if (removeIds.length) {
      const { error } = await this.supabase.getClient().from('radar_connector_credentials').delete().in('id', removeIds);
      if (error) throw error;
    }
  }

  private toMetadata(item: StoredCredential): ConnectorCredentialMetadata {
    return {
      connectorId: item.connectorId,
      scope: item.scope,
      organizationId: item.organizationId,
      configured: true,
      maskedValue: item.maskedValue,
      label: item.label,
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy,
    };
  }

  private readJson(): StoredCredential[] {
    if (!fs.existsSync(JSON_PATH)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeJson(items: StoredCredential[]): void {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(items, null, 2), 'utf8');
  }

  private toRow(item: StoredCredential) {
    return {
      id: item.id,
      credential_key: `${item.scope}:${item.scope === 'tenant' ? item.organizationId : 'platform'}:${item.connectorId}`,
      connector_id: item.connectorId,
      scope: item.scope,
      organization_id: item.organizationId || null,
      encrypted_value: item.encryptedValue,
      iv: item.iv,
      auth_tag: item.authTag,
      masked_value: item.maskedValue,
      label: item.label || null,
      updated_by: item.updatedBy || null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  private fromRow(row: any): StoredCredential {
    return {
      id: row.id,
      connectorId: row.connector_id,
      scope: row.scope === 'global' ? 'global' : 'tenant',
      organizationId: row.organization_id || undefined,
      configured: true,
      encryptedValue: row.encrypted_value,
      iv: row.iv,
      authTag: row.auth_tag,
      maskedValue: row.masked_value,
      label: row.label || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
