-- Radar Comercial — decisões operacionais do usuário por oportunidade
alter table commercial_opportunities
  add column if not exists engagement_status varchar(32) not null default 'new',
  add column if not exists engagement_updated_at timestamp with time zone;

alter table commercial_opportunities
  drop constraint if exists commercial_opportunities_engagement_status_check;

alter table commercial_opportunities
  add constraint commercial_opportunities_engagement_status_check
  check (engagement_status in ('new', 'favorite', 'monitoring', 'ignored'));

create index if not exists idx_commercial_opportunities_engagement
  on commercial_opportunities(organization_id, workspace_id, engagement_status);
