export interface PersistenceTableRequirement {
  table: string;
  label: string;
  domain: 'commercial' | 'crm';
  migrationFile: string;
  requiredForProduction: boolean;
}

export const PERSISTENCE_TABLE_REQUIREMENTS: PersistenceTableRequirement[] = [
  {
    table: 'commercial_opportunities',
    label: 'Oportunidades comerciais',
    domain: 'commercial',
    migrationFile: '20260707_create_commercial_opportunities.sql',
    requiredForProduction: true,
  },
  {
    table: 'commercial_tasks',
    label: 'Tarefas comerciais',
    domain: 'commercial',
    migrationFile: '20260707_create_commercial_tasks.sql',
    requiredForProduction: true,
  },
  {
    table: 'crm_gov_clients',
    label: 'Clientes CRM Gov',
    domain: 'crm',
    migrationFile: '20260707_create_crm_gov_clients.sql',
    requiredForProduction: true,
  },
  {
    table: 'deployment_environments',
    label: 'Ambientes de publicação',
    domain: 'crm',
    migrationFile: '20260711_deployment_environments.sql',
    requiredForProduction: true,
  },
  {
    table: 'deployment_history',
    label: 'Histórico de deploy',
    domain: 'crm',
    migrationFile: '20260711_deployment_environments.sql',
    requiredForProduction: true,
  },
  {
    table: 'operational_incidents',
    label: 'Incidentes operacionais',
    domain: 'crm',
    migrationFile: '20260711_operational_incidents.sql',
    requiredForProduction: true,
  },
  {
    table: 'notification_preferences',
    label: 'Preferências de notificações',
    domain: 'crm',
    migrationFile: '20260712_notification_preferences.sql',
    requiredForProduction: true,
  },
  {
    table: 'notification_deliveries',
    label: 'Entregas de notificações',
    domain: 'crm',
    migrationFile: '20260712_notification_deliveries.sql + 20260713_notification_delivery_retries.sql + 20260714_notification_delivery_scheduler.sql',
    requiredForProduction: true,
  },
  {
    table: 'notification_retry_runs',
    label: 'Histórico do scheduler de notificações',
    domain: 'crm',
    migrationFile: '20260715_notification_retry_runs.sql',
    requiredForProduction: true,
  },
  {
    table: 'notification_maintenance_runs',
    label: 'Histórico de manutenção das notificações',
    domain: 'crm',
    migrationFile: '20260716_notification_maintenance_runs.sql',
    requiredForProduction: true,
  },
  {
    table: 'deployment_validation_runs',
    label: 'Validações de publicação',
    domain: 'crm',
    migrationFile: '20260717_deployment_validation_runs.sql',
    requiredForProduction: true,
  },
  {
    table: 'deployment_release_approvals',
    label: 'Aprovações de release',
    domain: 'crm',
    migrationFile: '20260718_deployment_release_approvals.sql',
    requiredForProduction: true,
  },
  {
    table: 'deployment_release_executions',
    label: 'Execuções aprovadas de release',
    domain: 'crm',
    migrationFile: '20260719_deployment_release_executions.sql',
    requiredForProduction: true,
  },
  {
    table: 'deployment_release_lifecycles',
    label: 'Ciclo operacional de releases',
    domain: 'crm',
    migrationFile: '20260720_deployment_release_lifecycles.sql',
    requiredForProduction: true,
  },
  {
    table: 'admin_access_reviews',
    label: 'Revisões administrativas de acesso',
    domain: 'crm',
    migrationFile: '20260721_admin_access_reviews.sql',
    requiredForProduction: true,
  },
  {
    table: 'tenant_commercial_contracts',
    label: 'Contratos comerciais por tenant',
    domain: 'crm',
    migrationFile: '20260722_tenant_commercial_contracts.sql',
    requiredForProduction: true,
  },
  {
    table: 'customer_operations_plans',
    label: 'Operação e sucesso do cliente',
    domain: 'crm',
    migrationFile: '20260723_customer_operations_plans.sql',
    requiredForProduction: true,
  },
  { table: 'beta_governance_assets', label: 'Governança da Beta IA', domain: 'crm', migrationFile: '20260724_beta_governance_assets.sql', requiredForProduction: true },
  {
    table: 'release_candidate_certifications',
    label: 'Certificações executivas RC-1',
    domain: 'crm',
    migrationFile: '20260725_release_candidate_certifications.sql',
    requiredForProduction: true,
  },
];
