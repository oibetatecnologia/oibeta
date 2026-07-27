-- Macro Lote 33: identidade SaaS, vínculos e isolamento multi-tenant
create extension if not exists pgcrypto;

create table if not exists public.user_organization_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id text not null references public.organizations(id) on delete cascade,
  role text not null default 'operator',
  status text not null default 'ACTIVE',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table if not exists public.user_workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id text not null references public.organizations(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  role text not null default 'operator',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);

create table if not exists public.product_licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  product_id text not null,
  status text not null default 'ACTIVE',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id)
);

create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id text,
  workspace_id text,
  actor_user_id uuid,
  action text not null,
  resource_type text not null,
  resource_id text,
  outcome text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_uom_user on public.user_organization_memberships(user_id);
create index if not exists idx_uom_org on public.user_organization_memberships(organization_id);
create index if not exists idx_uwm_user on public.user_workspace_memberships(user_id);
create index if not exists idx_uwm_workspace on public.user_workspace_memberships(workspace_id);
create index if not exists idx_product_licenses_org on public.product_licenses(organization_id);
create index if not exists idx_security_audit_org_created on public.security_audit_logs(organization_id, created_at desc);

create or replace function public.beta_is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.profile, u.role, '')) in ('master_admin','super_admin','superadmin','owner')
  );
$$;

create or replace function public.beta_user_belongs_to_org(target_org text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.beta_is_master_admin() or exists (
    select 1 from public.user_organization_memberships m
    where m.user_id = auth.uid()
      and m.organization_id = target_org
      and m.status = 'ACTIVE'
  );
$$;

create or replace function public.beta_user_belongs_to_workspace(target_workspace text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.beta_is_master_admin() or exists (
    select 1 from public.user_workspace_memberships m
    where m.user_id = auth.uid()
      and m.workspace_id = target_workspace
      and m.status = 'ACTIVE'
  );
$$;

create or replace function public.beta_security_readiness()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tables_ready integer := 0;
  rls_ready integer := 0;
  required text[] := array['users','organizations','workspaces','user_organization_memberships','user_workspace_memberships','product_licenses','security_audit_logs'];
  item text;
begin
  foreach item in array required loop
    if to_regclass('public.' || item) is not null then tables_ready := tables_ready + 1; end if;
  end loop;

  select count(*) into rls_ready
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname = any(required) and c.relrowsecurity;

  return jsonb_build_object(
    'tablesReady', tables_ready,
    'tablesRequired', cardinality(required),
    'rlsEnabledTables', rls_ready,
    'membershipTablesReady', to_regclass('public.user_organization_memberships') is not null and to_regclass('public.user_workspace_memberships') is not null,
    'licenseTableReady', to_regclass('public.product_licenses') is not null,
    'auditTableReady', to_regclass('public.security_audit_logs') is not null,
    'checkedAt', now()
  );
end;
$$;

grant execute on function public.beta_security_readiness() to authenticated;
grant execute on function public.beta_user_belongs_to_org(text) to authenticated;
grant execute on function public.beta_user_belongs_to_workspace(text) to authenticated;

alter table public.user_organization_memberships enable row level security;
alter table public.user_workspace_memberships enable row level security;
alter table public.product_licenses enable row level security;
alter table public.security_audit_logs enable row level security;

drop policy if exists uom_select_scope on public.user_organization_memberships;
create policy uom_select_scope on public.user_organization_memberships for select to authenticated
using (user_id = auth.uid() or public.beta_is_master_admin());

drop policy if exists uwm_select_scope on public.user_workspace_memberships;
create policy uwm_select_scope on public.user_workspace_memberships for select to authenticated
using (user_id = auth.uid() or public.beta_is_master_admin());

drop policy if exists product_licenses_select_scope on public.product_licenses;
create policy product_licenses_select_scope on public.product_licenses for select to authenticated
using (public.beta_user_belongs_to_org(organization_id));

drop policy if exists security_audit_select_scope on public.security_audit_logs;
create policy security_audit_select_scope on public.security_audit_logs for select to authenticated
using (public.beta_is_master_admin() or public.beta_user_belongs_to_org(organization_id));

-- Ativa RLS e aplica políticas padrão nas tabelas operacionais que já possuam organization_id.
do $$
declare t text;
begin
  foreach t in array array['projects','tasks','crm_gov_clients','commercial_opportunities','commercial_tasks','tenant_commercial_contracts','customer_operations_plans'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists beta_tenant_select on public.%I', t);
      execute format('create policy beta_tenant_select on public.%I for select to authenticated using (public.beta_user_belongs_to_org(organization_id::text))', t);
      execute format('drop policy if exists beta_tenant_insert on public.%I', t);
      execute format('create policy beta_tenant_insert on public.%I for insert to authenticated with check (public.beta_user_belongs_to_org(organization_id::text))', t);
      execute format('drop policy if exists beta_tenant_update on public.%I', t);
      execute format('create policy beta_tenant_update on public.%I for update to authenticated using (public.beta_user_belongs_to_org(organization_id::text)) with check (public.beta_user_belongs_to_org(organization_id::text))', t);
      execute format('drop policy if exists beta_tenant_delete on public.%I', t);
      execute format('create policy beta_tenant_delete on public.%I for delete to authenticated using (public.beta_user_belongs_to_org(organization_id::text))', t);
    end if;
  end loop;
end $$;
