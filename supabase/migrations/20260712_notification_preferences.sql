-- Macro Lote 34 — Preferências de notificações por usuário

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  user_id varchar not null,
  in_app_enabled boolean not null default true,
  incident_alerts_enabled boolean not null default true,
  minimum_escalation_level varchar(30) not null default 'standard',
  mark_read_on_open boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_notification_preferences_org
  on public.notification_preferences (organization_id);

create index if not exists idx_notification_preferences_user
  on public.notification_preferences (user_id);
