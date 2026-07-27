-- Macro Lote 44 — Aprovação formal de release

create table if not exists public.deployment_release_approvals (
  id uuid primary key default gen_random_uuid(),
  validation_run_id uuid not null references public.deployment_validation_runs(id) on delete restrict,
  target varchar(30) not null,
  version varchar(100) not null,
  status varchar(30) not null default 'pending',
  requested_by varchar(255) not null,
  requested_at timestamp with time zone not null,
  decided_by varchar(255),
  decided_at timestamp with time zone,
  notes text,
  validation_score integer not null default 0,
  validation_status varchar(30) not null,
  production_blocked boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_deployment_release_approvals_created
  on public.deployment_release_approvals (created_at desc);

create index if not exists idx_deployment_release_approvals_status
  on public.deployment_release_approvals (status);

create index if not exists idx_deployment_release_approvals_target
  on public.deployment_release_approvals (target);
