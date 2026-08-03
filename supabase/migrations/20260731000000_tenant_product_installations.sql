create table if not exists public.tenant_product_installations (
  id uuid primary key,
  tenant_id text not null,
  organization_id text not null references public.organizations(id) on delete cascade,
  workspace_id text not null,
  product_id text not null,
  status text not null check (status in ('active', 'suspended')),
  capabilities_json jsonb not null default '[]'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id)
);
create index if not exists tenant_product_installations_org_idx on public.tenant_product_installations(organization_id);
create index if not exists tenant_product_installations_product_idx on public.tenant_product_installations(product_id, status);
alter table public.tenant_product_installations enable row level security;
drop policy if exists tenant_product_installations_isolation on public.tenant_product_installations;
create policy tenant_product_installations_isolation on public.tenant_product_installations
for all using (organization_id = coalesce(auth.jwt() ->> 'organizationId', auth.jwt() ->> 'organization_id'))
with check (organization_id = coalesce(auth.jwt() ->> 'organizationId', auth.jwt() ->> 'organization_id'));
