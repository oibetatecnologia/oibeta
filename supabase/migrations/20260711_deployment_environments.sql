-- Macro Lote 27 — Ambientes e histórico de deploy

create table if not exists public.deployment_environments (
  id uuid primary key default gen_random_uuid(),
  tenant_id varchar not null,
  organization_id varchar not null,
  workspace_id varchar,
  kind varchar(30) not null,
  name varchar(200) not null,
  status varchar(30) not null default 'pending',
  version varchar(100) not null default 'A preparar',
  url text not null default '',
  database_status varchar(30) not null default 'pending',
  storage_status varchar(30) not null default 'pending',
  api_status varchar(30) not null default 'pending',
  notes text not null default '',
  last_deploy_at timestamp with time zone,
  last_deploy_version varchar(100),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (organization_id, kind)
);

create index if not exists idx_deployment_environments_tenant
  on public.deployment_environments (tenant_id);

create index if not exists idx_deployment_environments_org
  on public.deployment_environments (organization_id);

create index if not exists idx_deployment_environments_status
  on public.deployment_environments (status);

create table if not exists public.deployment_history (
  id uuid primary key default gen_random_uuid(),
  environment_id uuid not null references public.deployment_environments(id) on delete cascade,
  tenant_id varchar not null,
  organization_id varchar not null,
  version varchar(100) not null,
  status varchar(30) not null,
  responsible varchar(200) not null,
  notes text,
  deployed_at timestamp with time zone default now()
);

create index if not exists idx_deployment_history_environment
  on public.deployment_history (environment_id);

create index if not exists idx_deployment_history_org
  on public.deployment_history (organization_id);

create index if not exists idx_deployment_history_date
  on public.deployment_history (deployed_at desc);
