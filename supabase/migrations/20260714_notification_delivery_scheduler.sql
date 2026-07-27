-- Macro Lote 37 — Retry automático e dead-letter

alter table public.notification_deliveries
  add column if not exists dead_letter_at timestamp with time zone;

create index if not exists idx_notification_deliveries_dead_letter
  on public.notification_deliveries (status, dead_letter_at);

create index if not exists idx_notification_deliveries_due_retry
  on public.notification_deliveries (status, next_retry_at)
  where status = 'failed';
