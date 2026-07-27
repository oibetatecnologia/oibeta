import type { RepositoryHealthSignal } from './RepositoryHealthService';

export type PersistenceBackendMode = 'json' | 'supabase' | 'unknown';
export type PersistenceHealthStatus = 'healthy' | 'attention' | 'critical';
export type PersistenceSchemaTableStatus =
  | 'ready'
  | 'missing_or_inaccessible'
  | 'not_applicable'
  | 'unknown';

export interface PersistenceBackendHealth {
  mode: PersistenceBackendMode;
  adapter: string;
  configured: boolean;
  supabaseUrlConfigured: boolean;
  supabaseKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  checkedAt: string;
}

export interface PersistenceSchemaTableHealth {
  table: string;
  label: string;
  domain: 'commercial' | 'crm';
  migrationFile: string;
  requiredForProduction: boolean;
  status: PersistenceSchemaTableStatus;
  error?: string | null;
}

export interface PersistenceSchemaHealth {
  mode: PersistenceBackendMode;
  checkedAt: string;
  tables: PersistenceSchemaTableHealth[];
}

export interface PersistenceHealthIssue {
  id: string;
  title: string;
  description: string;
  priority: 'alta' | 'média' | 'baixa';
  targetTab: string;
  taskTitle: string;
}

export interface PersistenceFallbackPolicyHealth {
  mode: 'auto' | 'enabled' | 'disabled';
  enabled: boolean;
  productionSafe: boolean;
  description: string;
}

export interface PersistenceHealthSummary {
  score: number;
  status: PersistenceHealthStatus;
  backend: PersistenceBackendHealth;
  schema: PersistenceSchemaHealth;
  fallbackPolicy: PersistenceFallbackPolicyHealth;
  repositories: RepositoryHealthSignal[];
  apiRepositories: number;
  fallbackRepositories: number;
  errorRepositories: number;
  unknownRepositories: number;
  readyTables: number;
  missingTables: number;
  requiredTables: number;
  schemaReadinessScore: number;
  issues: PersistenceHealthIssue[];
}
