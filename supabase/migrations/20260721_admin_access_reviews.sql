-- Super Lote B — Governança administrativa de acessos

create table if not exists public.admin_access_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  status varchar(30) not null default 'open',
  items_json jsonb not null default '[]'::jsonb,
  created_by varchar(255) not null,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_admin_access_reviews_org
  on public.admin_access_reviews (organization_id, created_at desc);

create index if not exists idx_admin_access_reviews_status
  on public.admin_access_reviews (status);
