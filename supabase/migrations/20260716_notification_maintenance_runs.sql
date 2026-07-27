-- Macro Lote 39 — Manutenção e retenção das notificações

create table if not exists public.notification_maintenance_runs (
  id uuid primary key default gen_random_uuid(),
  trigger varchar(30) not null default 'manual',
  read_notifications_removed integer not null default 0,
  read_deliveries_removed integer not null default 0,
  dead_letter_deliveries_removed integer not null default 0,
  retry_runs_removed integer not null default 0,
  total_removed integer not null default 0,
  duration_ms integer not null default 0,
  started_at timestamp with time zone not null,
  finished_at timestamp with time zone not null
);

create index if not exists idx_notification_maintenance_runs_started
  on public.notification_maintenance_runs (started_at desc);
