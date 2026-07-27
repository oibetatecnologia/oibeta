-- Macro Lote 30 — Correlação automática de incidentes

alter table if exists public.operational_incidents
  add column if not exists fingerprint varchar(240),
  add column if not exists automated boolean not null default false,
  add column if not exists occurrence_count integer not null default 1,
  add column if not exists last_detected_at timestamp with time zone;

create unique index if not exists idx_operational_incidents_active_fingerprint
  on public.operational_incidents (organization_id, fingerprint)
  where fingerprint is not null and status <> 'resolved';

create index if not exists idx_operational_incidents_automated
  on public.operational_incidents (automated);
