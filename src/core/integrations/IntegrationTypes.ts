export type IntegrationProviderId = 'pncp' | 'compras_gov' | 'ai_gateway' | 'cloudflare_r2';
export type IntegrationStatus = 'ready' | 'attention' | 'pending' | 'offline';
export type IntegrationPriority = 'alta' | 'média' | 'baixa';

export interface IntegrationEndpointDefinition {
  id: string;
  label: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  required: boolean;
}

export interface IntegrationProviderDefinition {
  id: IntegrationProviderId;
  name: string;
  description: string;
  status: IntegrationStatus;
  targetModule: string;
  baseUrlEnv: string;
  apiKeyEnv?: string;
  endpoints: IntegrationEndpointDefinition[];
}

export interface IntegrationHealthSignal {
  id: string;
  providerId: IntegrationProviderId;
  title: string;
  description: string;
  status: IntegrationStatus;
  priority: IntegrationPriority;
  targetTab: string;
  taskTitle: string;
}

export interface IntegrationReadinessSummary {
  totalProviders: number;
  readyProviders: number;
  attentionProviders: number;
  pendingProviders: number;
  offlineProviders: number;
  readinessScore: number;
  healthSignals: IntegrationHealthSignal[];
}
