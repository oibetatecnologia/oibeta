-- Macro Lote 23 — Diretório administrativo real

alter table if exists public.users
  add column if not exists tenant_id text,
  add column if not exists profile text,
  add column if not exists role_label text,
  add column if not exists department text,
  add column if not exists status text not null default 'active',
  add column if not exists superior_user_id text,
  add column if not exists product_ids jsonb not null default '[]'::jsonb;

create index if not exists idx_users_tenant_id
  on public.users (tenant_id);

create index if not exists idx_users_organization_status
  on public.users (organization_id, status);

alter table if exists public.organizations
  add column if not exists tenant_type text,
  add column if not exists status text not null default 'active',
  add column if not exists licensed_product_ids jsonb not null default '[]'::jsonb,
  add column if not exists primary_admin_name text,
  add column if not exists primary_admin_email text;

create index if not exists idx_organizations_status
  on public.organizations (status);

create index if not exists idx_organizations_tenant_type
  on public.organizations (tenant_type);
