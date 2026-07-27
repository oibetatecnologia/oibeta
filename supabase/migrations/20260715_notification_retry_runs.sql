-- Macro Lote 38 — Histórico persistente do scheduler

create table if not exists public.notification_retry_runs (
  id uuid primary key default gen_random_uuid(),
  trigger varchar(30) not null,
  status varchar(30) not null,
  processed integer not null default 0,
  retried integer not null default 0,
  dead_lettered integer not null default 0,
  duration_ms integer not null default 0,
  error_message text,
  started_at timestamp with time zone not null,
  finished_at timestamp with time zone not null
);

create index if not exists idx_notification_retry_runs_started
  on public.notification_retry_runs (started_at desc);

create index if not exists idx_notification_retry_runs_status
  on public.notification_retry_runs (status);
