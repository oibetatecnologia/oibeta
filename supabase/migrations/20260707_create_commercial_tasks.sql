-- Sprint 20.2 - Commercial generated tasks persistence
-- Mantém as tarefas sugeridas pela Beta vinculadas à organização, workspace e oportunidade de origem.

create table if not exists public.commercial_tasks (
  id text primary key,
  organization_id text not null,
  workspace_id text not null,
  source_opportunity_id text not null,
  related_product_id text,
  title text not null,
  description text not null,
  priority text not null default 'medium',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_tasks_priority_check check (priority in ('low', 'medium', 'high', 'critical')),
  constraint commercial_tasks_status_check check (status in ('pending', 'accepted', 'discarded'))
);

create index if not exists idx_commercial_tasks_tenant_created_at
  on public.commercial_tasks (organization_id, workspace_id, created_at desc);

create index if not exists idx_commercial_tasks_source_opportunity
  on public.commercial_tasks (organization_id, workspace_id, source_opportunity_id);

create index if not exists idx_commercial_tasks_status
  on public.commercial_tasks (organization_id, workspace_id, status);
