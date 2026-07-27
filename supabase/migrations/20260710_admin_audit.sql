-- Macro Lote 24 — Auditoria administrativa

create table if not exists public.super_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id varchar not null,
  organization_id varchar default 'global' not null,
  action_type varchar(100) not null,
  entity_type varchar(100) not null,
  entity_id varchar not null,
  description text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_super_admin_audit_logs_actor
  on public.super_admin_audit_logs (actor_user_id);

create index if not exists idx_super_admin_audit_logs_org
  on public.super_admin_audit_logs (organization_id);

create index if not exists idx_super_admin_audit_logs_entity
  on public.super_admin_audit_logs (entity_type, entity_id);

create index if not exists idx_super_admin_audit_logs_created
  on public.super_admin_audit_logs (created_at desc);
