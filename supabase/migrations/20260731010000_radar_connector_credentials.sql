create table if not exists public.radar_connector_credentials (
  id uuid primary key,
  credential_key text not null unique,
  connector_id text not null,
  scope text not null check (scope in ('global', 'tenant')),
  organization_id text null references public.organizations(id) on delete cascade,
  encrypted_value text not null,
  iv text not null,
  auth_tag text not null,
  masked_value text not null,
  label text null,
  updated_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint radar_connector_credentials_scope_org_check check (
    (scope = 'global' and organization_id is null) or
    (scope = 'tenant' and organization_id is not null)
  )
);

create index if not exists radar_connector_credentials_org_connector_idx
  on public.radar_connector_credentials (organization_id, connector_id);

alter table public.radar_connector_credentials enable row level security;

revoke all on table public.radar_connector_credentials from anon, authenticated;
grant select, insert, update, delete on table public.radar_connector_credentials to service_role;

comment on table public.radar_connector_credentials is
  'Encrypted server-side credentials for Radar connectors. Secret values must never be returned to clients.';
