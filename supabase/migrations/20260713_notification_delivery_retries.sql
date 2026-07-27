-- Macro Lote 36 — Reprocessamento de entregas com falha

alter table public.notification_deliveries
  add column if not exists last_retry_at timestamp with time zone;

alter table public.notification_deliveries
  add column if not exists next_retry_at timestamp with time zone;

create index if not exists idx_notification_deliveries_retry
  on public.notification_deliveries (status, next_retry_at);
