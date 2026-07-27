-- Sprint 20.1 — Radar Comercial: persistência inicial de oportunidades

create table if not exists commercial_opportunities (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  title text not null,
  buyer_name text not null,
  sphere varchar(64),
  city varchar(255),
  state varchar(32),
  type varchar(128) not null,
  estimated_value numeric,
  publication_date date,
  submission_deadline date,
  source_url text,
  object text not null,
  notes text,
  status varchar(64) not null default 'new',
  priority varchar(64) not null default 'medium',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table commercial_opportunities enable row level security;

drop policy if exists commercial_opportunities_policy on commercial_opportunities;
create policy commercial_opportunities_policy on commercial_opportunities
  for all
  using (organization_id = get_user_org_id())
  with check (organization_id = get_user_org_id());

create index if not exists idx_commercial_opportunities_tenant
  on commercial_opportunities(organization_id, workspace_id);

create index if not exists idx_commercial_opportunities_status
  on commercial_opportunities(organization_id, workspace_id, status);

create index if not exists idx_commercial_opportunities_deadline
  on commercial_opportunities(organization_id, workspace_id, submission_deadline);
