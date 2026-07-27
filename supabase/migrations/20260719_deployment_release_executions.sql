-- Macro Lote 45 — Execução de deploy vinculada à aprovação

create table if not exists public.deployment_release_executions (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references public.deployment_release_approvals(id) on delete restrict,
  validation_run_id uuid not null references public.deployment_validation_runs(id) on delete restrict,
  environment_id uuid not null references public.deployment_environments(id) on delete restrict,
  organization_id varchar not null,
  target varchar(30) not null,
  version varchar(100) not null,
  status varchar(30) not null,
  responsible varchar(200) not null,
  notes text,
  deployment_record_id uuid not null references public.deployment_history(id) on delete restrict,
  executed_at timestamp with time zone not null default now()
);

create index if not exists idx_deployment_release_executions_approval
  on public.deployment_release_executions (approval_id);

create index if not exists idx_deployment_release_executions_environment
  on public.deployment_release_executions (environment_id);

create index if not exists idx_deployment_release_executions_date
  on public.deployment_release_executions (executed_at desc);
