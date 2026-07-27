-- Super Lote E — Governança da Beta IA, conhecimento, memória e automações
create table if not exists public.beta_governance_assets (
 id uuid primary key default gen_random_uuid(), organization_id varchar not null, workspace_id varchar not null,
 type varchar(30) not null, title varchar(255) not null, description text not null default '', status varchar(30) not null default 'draft',
 sensitivity varchar(30) not null default 'internal', owner varchar(255) not null, source text, version varchar(50) not null default '1.0',
 tags jsonb not null default '[]'::jsonb, trigger text, action text, requires_approval boolean not null default false,
 last_reviewed_at timestamptz, next_review_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_beta_governance_scope on public.beta_governance_assets (organization_id, workspace_id);
create index if not exists idx_beta_governance_status on public.beta_governance_assets (status, type);
