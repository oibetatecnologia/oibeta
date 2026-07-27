export type DeploymentConfigurationStatus =
  | 'configured'
  | 'missing'
  | 'invalid'
  | 'warning';

export interface DeploymentConfigurationCheck {
  key: string;
  label: string;
  category:
    | 'application'
    | 'database'
    | 'security'
    | 'deployment';
  requiredForProduction: boolean;
  status: DeploymentConfigurationStatus;
  description: string;
  maskedValue?: string;
}

export interface DeploymentConfigurationSummary {
  provider: 'vercel' | 'local' | 'unknown';
  environment: 'development' | 'preview' | 'production' | 'unknown';
  databaseMode: string;
  score: number;
  productionBlocked: boolean;
  configured: number;
  missing: number;
  invalid: number;
  warnings: number;
  checks: DeploymentConfigurationCheck[];
  checkedAt: string;
}
