export type RuntimeConfigurationScope = 'public_client' | 'server_only';
export type RuntimeConfigurationStatus = 'configured' | 'missing' | 'backend_required';
export type RuntimeConfigurationPriority = 'alta' | 'média' | 'baixa';

export interface RuntimeConfigurationDefinition {
  key: string;
  label: string;
  description: string;
  scope: RuntimeConfigurationScope;
  requiredForProduction: boolean;
  category: 'application' | 'database' | 'integrations' | 'storage' | 'ai' | 'security';
  targetTab: string;
}

export interface RuntimeConfigurationItem extends RuntimeConfigurationDefinition {
  status: RuntimeConfigurationStatus;
  maskedValue?: string;
}

export interface RuntimeConfigurationIssue {
  id: string;
  title: string;
  description: string;
  priority: RuntimeConfigurationPriority;
  targetTab: string;
  taskTitle: string;
}

export interface RuntimeConfigurationSummary {
  score: number;
  totalVariables: number;
  configuredVariables: number;
  missingVariables: number;
  backendRequiredVariables: number;
  requiredVariables: number;
  requiredConfiguredVariables: number;
  productionBlocked: boolean;
  items: RuntimeConfigurationItem[];
  issues: RuntimeConfigurationIssue[];
}
