-- Super Lote D — CRM, implantação, suporte e sucesso do cliente

create table if not exists public.customer_operations_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id varchar not null,
  client_id varchar not null,
  client_name varchar not null,
  lifecycle_stage varchar(30) not null default 'onboarding',
  owner varchar(200) not null,
  health_status varchar(30) not null default 'attention',
  health_score integer not null default 70,
  onboarding_checklist_json jsonb not null default '[]'::jsonb,
  objectives_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  support_sla_hours integer not null default 24,
  next_review_at timestamp with time zone,
  renewal_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (organization_id, workspace_id, client_id)
);

create index if not exists idx_customer_operations_org
  on public.customer_operations_plans (organization_id, workspace_id);
create index if not exists idx_customer_operations_health
  on public.customer_operations_plans (health_status);
create index if not exists idx_customer_operations_review
  on public.customer_operations_plans (next_review_at);
