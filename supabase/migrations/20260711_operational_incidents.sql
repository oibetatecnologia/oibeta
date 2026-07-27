-- Macro Lote 29 — Incidentes operacionais

create table if not exists public.operational_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id varchar,
  title varchar(240) not null,
  description text not null,
  source varchar(120) not null,
  severity varchar(30) not null,
  status varchar(30) not null default 'open',
  owner varchar(200),
  resolution_notes text,
  opened_at timestamp with time zone default now(),
  acknowledged_at timestamp with time zone,
  mitigated_at timestamp with time zone,
  resolved_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

create index if not exists idx_operational_incidents_org
  on public.operational_incidents (organization_id);

create index if not exists idx_operational_incidents_status
  on public.operational_incidents (status);

create index if not exists idx_operational_incidents_severity
  on public.operational_incidents (severity);

create index if not exists idx_operational_incidents_opened
  on public.operational_incidents (opened_at desc);
