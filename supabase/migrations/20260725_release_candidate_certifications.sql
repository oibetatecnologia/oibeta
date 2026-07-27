-- Super Lote F — Certificação executiva RC-1

create table if not exists public.release_candidate_certifications (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id varchar not null,
  version varchar(100) not null,
  status varchar(30) not null default 'draft',
  controls_json jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  approved_controls integer not null default 0,
  pending_controls integer not null default 0,
  blocked_controls integer not null default 0,
  required_controls integer not null default 0,
  approved_by varchar(255),
  approved_at timestamp with time zone,
  created_by varchar(255) not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_release_candidate_certifications_scope
  on public.release_candidate_certifications (
    organization_id,
    workspace_id,
    created_at desc
  );

create index if not exists idx_release_candidate_certifications_status
  on public.release_candidate_certifications (status);
