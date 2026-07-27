create table if not exists public.crm_gov_clients (
  id text primary key,
  organization_id text not null,
  workspace_id text not null,
  name text not null default '',
  city text not null default '',
  state text not null default '',
  entity text not null default '',
  entity_type text not null default 'other',
  manager text not null default '',
  status text not null default 'lead',
  contact text not null default '',
  cnpj text,
  population text,
  website text,
  pncp_url text,
  notes text,
  contacts jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  products jsonb not null default '[]'::jsonb,
  proposals jsonb not null default '[]'::jsonb,
  contracts jsonb not null default '[]'::jsonb,
  implementations jsonb not null default '[]'::jsonb,
  financial_records jsonb not null default '[]'::jsonb,
  support_tickets jsonb not null default '[]'::jsonb,
  next_action jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_gov_clients_tenant
  on public.crm_gov_clients (organization_id, workspace_id);

create index if not exists idx_crm_gov_clients_status
  on public.crm_gov_clients (organization_id, workspace_id, status);

create index if not exists idx_crm_gov_clients_updated_at
  on public.crm_gov_clients (organization_id, workspace_id, updated_at desc);
