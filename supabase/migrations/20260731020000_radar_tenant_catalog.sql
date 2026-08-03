create table if not exists public.radar_tenant_products (
  id uuid primary key,
  organization_id text not null,
  workspace_id text not null,
  name text not null,
  description text not null default '',
  category text,
  manufacturer text,
  brand text,
  unit text,
  keywords jsonb not null default '[]'::jsonb,
  synonyms jsonb not null default '[]'::jsonb,
  classification_codes jsonb not null default '[]'::jsonb,
  regions jsonb not null default '[]'::jsonb,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists radar_tenant_products_scope_idx on public.radar_tenant_products(organization_id, workspace_id, active);
alter table public.radar_tenant_products enable row level security;
revoke all on public.radar_tenant_products from anon, authenticated;
grant all on public.radar_tenant_products to service_role;

create table if not exists public.radar_saved_searches (
  id uuid primary key,
  organization_id text not null,
  workspace_id text not null,
  name text not null,
  keywords jsonb not null default '[]'::jsonb,
  state text,
  city text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists radar_saved_searches_scope_idx on public.radar_saved_searches(organization_id, workspace_id, active);
alter table public.radar_saved_searches enable row level security;
revoke all on public.radar_saved_searches from anon, authenticated;
grant all on public.radar_saved_searches to service_role;
