-- Super Lote A — Cutover, evidências, pós-deploy e rollback

create table if not exists public.deployment_release_lifecycles (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.deployment_release_executions(id) on delete restrict,
  approval_id uuid not null references public.deployment_release_approvals(id) on delete restrict,
  validation_run_id uuid not null references public.deployment_validation_runs(id) on delete restrict,
  environment_id uuid not null references public.deployment_environments(id) on delete restrict,
  organization_id varchar not null,
  target varchar(30) not null,
  version varchar(100) not null,
  status varchar(40) not null default 'preparing',
  responsible varchar(200) not null,
  checklist_json jsonb not null default '[]'::jsonb,
  evidences_json jsonb not null default '[]'::jsonb,
  post_deploy_checks_json jsonb not null default '[]'::jsonb,
  rollback_json jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone
);

create unique index if not exists idx_deployment_release_lifecycles_execution
  on public.deployment_release_lifecycles (execution_id);

create index if not exists idx_deployment_release_lifecycles_status
  on public.deployment_release_lifecycles (status);

create index if not exists idx_deployment_release_lifecycles_updated
  on public.deployment_release_lifecycles (updated_at desc);
