-- Macro Lote 35 — Rastreabilidade de entrega das notificações

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id varchar not null,
  channel varchar(30) not null default 'in_app',
  status varchar(30) not null default 'delivered',
  attempt_count integer not null default 1,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  failed_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (organization_id, notification_id, user_id, channel)
);

create index if not exists idx_notification_deliveries_org
  on public.notification_deliveries (organization_id);

create index if not exists idx_notification_deliveries_user
  on public.notification_deliveries (user_id);

create index if not exists idx_notification_deliveries_status
  on public.notification_deliveries (status);

create index if not exists idx_notification_deliveries_notification
  on public.notification_deliveries (notification_id);
