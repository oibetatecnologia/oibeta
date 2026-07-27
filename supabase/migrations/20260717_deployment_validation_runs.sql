-- Macro Lote 43 — Gate persistente de publicação

create table if not exists public.deployment_validation_runs (
  id uuid primary key default gen_random_uuid(),
  status varchar(30) not null,
  score integer not null default 0,
  production_blocked boolean not null default true,
  configuration_score integer not null default 0,
  connectivity_score integer not null default 0,
  configured integer not null default 0,
  missing integer not null default 0,
  invalid integer not null default 0,
  warnings integer not null default 0,
  healthy_probes integer not null default 0,
  attention_probes integer not null default 0,
  critical_probes integer not null default 0,
  skipped_probes integer not null default 0,
  environment varchar(50),
  provider varchar(50),
  database_mode varchar(50),
  configuration_json jsonb not null default '{}'::jsonb,
  connectivity_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_deployment_validation_runs_created
  on public.deployment_validation_runs (created_at desc);

create index if not exists idx_deployment_validation_runs_status
  on public.deployment_validation_runs (status);
