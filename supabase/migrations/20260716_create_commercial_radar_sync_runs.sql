create table if not exists public.commercial_radar_sync_runs (
  id uuid primary key,
  organization_id uuid not null,
  workspace_id uuid,
  connector_id text not null,
  source_id text not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  cursor_before text,
  cursor_after text,
  metrics jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  initiated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commercial_radar_sync_runs_org_started_idx on public.commercial_radar_sync_runs (organization_id, started_at desc);
create index if not exists commercial_radar_sync_runs_connector_idx on public.commercial_radar_sync_runs (connector_id, status);
