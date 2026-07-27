-- SUPABASE SCHEMA DATABASE SCHEMA FOR BETA CORE

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tab 0: Organizations table
create table if not exists organizations (
  id varchar(255) primary key default uuid_generate_v4()::text,
  name varchar(255) not null,
  type varchar(100) not null check (type in ('empresa', 'prefeitura', 'campanha', 'consultoria', 'pessoal')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 1: Users table
create table if not exists users (
  id varchar(255) primary key default uuid_generate_v4()::text,
  name varchar(255) not null,
  email varchar(255) unique not null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  role varchar(100) not null default 'member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 2: Projects table
create table if not exists projects (
  id varchar(255) primary key default uuid_generate_v4()::text,
  name varchar(255) not null,
  description text,
  status varchar(100) not null check (status in ('active', 'paused', 'completed')) default 'active',
  last_stop_point text,
  user_id varchar(255) references users(id) on delete set null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 3: Tasks table
create table if not exists tasks (
  id varchar(255) primary key default uuid_generate_v4()::text,
  project_id varchar(255) references projects(id) on delete cascade not null,
  title varchar(255) not null,
  description text,
  status varchar(100) not null check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  priority varchar(100) default 'média'::text,
  due_date timestamp with time zone,
  user_id varchar(255) references users(id) on delete set null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 4: Decisions table
create table if not exists decisions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  project_id varchar(255) references projects(id) on delete cascade not null,
  title varchar(255) not null,
  description text,
  content text,
  reason text,
  impact varchar(100) default 'médio'::text,
  importance varchar(100) default 'média'::text,
  user_id varchar(255) references users(id) on delete set null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 5: Memories table
create table if not exists memories (
  id varchar(255) primary key default uuid_generate_v4()::text,
  project_id varchar(255) references projects(id) on delete cascade,
  content text not null,
  type varchar(100) default 'contexto'::text,
  importance varchar(100) default 'média'::text,
  tags text[] default array[]::text[],
  source varchar(255),
  user_id varchar(255) references users(id) on delete set null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 6: Messages table (for Chat History)
create table if not exists messages (
  id varchar(255) primary key default uuid_generate_v4()::text,
  project_id varchar(255) references projects(id) on delete cascade,
  user_id varchar(255) references users(id) on delete set null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  sender varchar(100) not null check (sender in ('user', 'beta')),
  content text not null,
  suggestions jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 7: Project Contexts (for ProjectState values calculated by BetaContextEngine)
create table if not exists project_contexts (
  project_id varchar(255) primary key references projects(id) on delete cascade,
  project_name varchar(255) not null,
  current_objective text,
  current_stage varchar(100) not null default 'Planejamento'::text,
  last_stop_point text,
  recent_decisions text[] default array[]::text[],
  pending_tasks text[] default array[]::text[],
  executive_summary text,
  next_recommended_action text,
  important_memories text[] default array[]::text[],
  risks text[] default array[]::text[],
  confidence_score int default 85,
  last_updated_date timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Initial Organization, User and Projects under new Multi-user and Org model
insert into organizations (id, name, type) 
values ('org-oi-beta', 'Oi Beta Tecnologia', 'empresa')
on conflict (id) do nothing;

insert into users (id, name, email, organization_id, role) 
values ('dev-user-douglas', 'Douglas', 'douglas.uis@gmail.com', 'org-oi-beta', 'admin')
on conflict (id) do nothing;

-- Create Indexes for optimization
create index if not exists idx_users_org_id on users(organization_id);
create index if not exists idx_projects_org_id on projects(organization_id);
create index if not exists idx_projects_user_id on projects(user_id);

create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_tasks_org_id on tasks(organization_id);
create index if not exists idx_tasks_user_id on tasks(user_id);

create index if not exists idx_decisions_project_id on decisions(project_id);
create index if not exists idx_decisions_org_id on decisions(organization_id);
create index if not exists idx_decisions_user_id on decisions(user_id);

create index if not exists idx_memories_project_id on memories(project_id);
create index if not exists idx_memories_org_id on memories(organization_id);
create index if not exists idx_memories_user_id on memories(user_id);

create index if not exists idx_messages_project_id on messages(project_id);
create index if not exists idx_messages_org_id on messages(organization_id);
create index if not exists idx_messages_user_id on messages(user_id);

-- Tab 8: Objectives table
create table if not exists objectives (
  id varchar(255) primary key default uuid_generate_v4()::text,
  project_id varchar(255) references projects(id) on delete cascade not null,
  title varchar(255) not null,
  description text,
  status varchar(100) not null check (status in ('pending', 'completed')) default 'pending',
  task_id varchar(255) references tasks(id) on delete cascade,
  user_id varchar(255) references users(id) on delete set null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tab 9: Workspace states table for persistence
create table if not exists workspace_states (
  id varchar(255) primary key default uuid_generate_v4()::text,
  user_id varchar(255) references users(id) on delete cascade not null,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  active_project_id varchar(255) references projects(id) on delete set null,
  active_specialization varchar(255),
  last_context jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_org_workspace unique (user_id, organization_id, workspace_id)
);

-- Create indexes for objectives and workspace_states
create index if not exists idx_objectives_project_id on objectives(project_id);
create index if not exists idx_objectives_org_id on objectives(organization_id);
create index if not exists idx_workspace_states_user_org_workspace on workspace_states(user_id, organization_id, workspace_id);

-- ==================== ROW LEVEL SECURITY (RLS) POLICIES ====================

-- Habilitar Row Level Security para todas as tabelas solicitadas
alter table organizations enable row level security;
alter table users enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table decisions enable row level security;
alter table memories enable row level security;
alter table messages enable row level security;
alter table project_contexts enable row level security;
alter table objectives enable row level security;
alter table workspace_states enable row level security;

-- Criar função auxiliar para extrair a organização do usuário logado de forma otimizada
create or replace function get_user_org_id()
returns varchar(255)
language sql
security definer
stable
as $$
  select organization_id from public.users where id = auth.uid()::text;
$$;

-- 1. Políticas de Organizações (Acesso apenas à própria organização)
create policy organizations_select_policy on organizations
  for select using (id = get_user_org_id());

create policy organizations_update_policy on organizations
  for update using (id = get_user_org_id());

-- 2. Políticas de Usuários (Acesso aos membros da própria organização)
create policy users_select_policy on users
  for select using (organization_id = get_user_org_id());

create policy users_insert_policy on users
  for insert with check (id = auth.uid()::text);

create policy users_update_policy on users
  for update using (id = auth.uid()::text);

create policy users_delete_policy on users
  for delete using (id = auth.uid()::text);

-- 3. Políticas de Projetos (Isolados por organização)
create policy projects_policy on projects
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- 4. Políticas de Tarefas (Isoladas por organização)
create policy tasks_policy on tasks
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- 5. Políticas de Decisões (Isoladas por organização)
create policy decisions_policy on decisions
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- 6. Políticas de Memórias (Isoladas por organização)
create policy memories_policy on memories
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- 7. Políticas de Mensagens / Chat History (Isoladas por organização)
create policy messages_policy on messages
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- 8. Políticas de Project Contexts / Estados Calculados
create policy project_contexts_policy on project_contexts
  for all using (project_id in (select id from projects where organization_id = get_user_org_id()));

-- 9. Políticas de Objetivos (Isolados por organização)
create policy objectives_policy on objectives
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- 10. Políticas de Workspace States (Apenas para o próprio usuário dentro de sua organização)
create policy workspace_states_policy on workspace_states
  for all using (user_id = auth.uid()::text and organization_id = get_user_org_id()) with check (user_id = auth.uid()::text and organization_id = get_user_org_id());

-- ==================== SPRINT 7: KNOWLEDGE GRAPH & CONTINUITY TABLES ====================

-- Tabela de nós de conhecimento
create table if not exists knowledge_nodes (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  node_type varchar(100) not null check (node_type in ('USER', 'ORGANIZATION', 'PROJECT', 'OBJECTIVE', 'TASK', 'DECISION', 'DOCUMENT', 'MEMORY', 'KNOWLEDGE')),
  title varchar(255) not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de relações entre nós de conhecimento
create table if not exists knowledge_relations (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  source_node_id varchar(255) references knowledge_nodes(id) on delete cascade not null,
  target_node_id varchar(255) references knowledge_nodes(id) on delete cascade not null,
  relation_type varchar(100) not null check (relation_type in ('BELONGS_TO', 'CREATED_BY', 'RELATED_TO', 'SUPPORTS', 'DEPENDS_ON', 'GENERATED_FROM', 'PART_OF', 'REFERENCES')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_source_target_relation unique (source_node_id, target_node_id, relation_type)
);

-- Tabela de snapshots de continuidade de projeto
create table if not exists project_continuity_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade not null,
  summary text,
  current_objective varchar(500),
  current_stage varchar(255),
  last_stop_point text,
  pending_items jsonb,
  risks jsonb,
  recommended_next_action text,
  confidence_score numeric default 1.0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_project_continuity unique (project_id)
);

-- Habilitar Row Level Security (RLS) para as novas tabelas
alter table knowledge_nodes enable row level security;
alter table knowledge_relations enable row level security;
alter table project_continuity_snapshots enable row level security;

-- Criar políticas RLS para as novas tabelas
create policy knowledge_nodes_policy on knowledge_nodes
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy knowledge_relations_policy on knowledge_relations
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy project_continuity_snapshots_policy on project_continuity_snapshots
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Criar índices de busca recomendados
create index if not exists idx_knowledge_nodes_org_proj on knowledge_nodes(organization_id, project_id);
create index if not exists idx_knowledge_relations_nodes on knowledge_relations(source_node_id, target_node_id);
create index if not exists idx_continuity_project on project_continuity_snapshots(project_id);

-- Tab 10: AI Connections table (Sprint 8)
create table if not exists ai_connections (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  user_id varchar(255) references users(id) on delete set null,
  provider varchar(100) not null check (provider in ('OPENAI', 'GEMINI', 'CLAUDE', 'GROQ', 'OPENROUTER', 'OLLAMA', 'LM_STUDIO', 'CUSTOM')),
  connection_name varchar(255) not null,
  api_key_encrypted text not null,
  base_url varchar(500),
  model varchar(255),
  status varchar(100) default 'active'::text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table ai_connections enable row level security;

create policy ai_connections_policy on ai_connections
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_ai_connections_org on ai_connections(organization_id);

-- Tab 11: Specializations (Sprint 9)
create table if not exists specializations (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  key varchar(100) not null,
  name varchar(255) not null,
  description text,
  status varchar(100) default 'active'::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (organization_id, key)
);

create table if not exists project_specializations (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade not null,
  specialization_key varchar(100) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (project_id)
);

-- Tab 12: Documents & Data
create table if not exists documents (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete set null,
  uploaded_by varchar(255) references profiles(id) on delete set null,
  filename varchar(255) not null,
  file_type varchar(100),
  file_size bigint,
  storage_path text,
  status varchar(100) default 'uploaded'::text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists document_chunks (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  document_id varchar(255) references documents(id) on delete cascade not null,
  chunk_index integer,
  content text,
  token_estimate integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists document_outputs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  source_document_id varchar(255) references documents(id) on delete set null,
  created_by varchar(255) references profiles(id) on delete set null,
  output_type varchar(100),
  filename varchar(255),
  storage_path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists document_jobs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  document_id varchar(255) references documents(id) on delete cascade not null,
  status varchar(50) default 'PENDING'::text,
  progress integer default 0,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists workspace_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  summary text,
  active_objectives jsonb default '[]'::jsonb,
  active_tasks jsonb default '[]'::jsonb,
  pending_decisions jsonb default '[]'::jsonb,
  blocked_items jsonb default '[]'::jsonb,
  recent_documents jsonb default '[]'::jsonb,
  next_recommended_actions jsonb default '[]'::jsonb
);

create table if not exists government_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  entities jsonb default '[]'::jsonb,
  contracts jsonb default '[]'::jsonb,
  bids jsonb default '[]'::jsonb,
  indicators jsonb default '[]'::jsonb,
  risks jsonb default '[]'::jsonb,
  recommendations jsonb default '[]'::jsonb
);

create table if not exists document_audit_logs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  document_id varchar(255) references documents(id) on delete set null,
  job_id varchar(255) references document_jobs(id) on delete set null,
  action varchar(100) not null,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table specializations enable row level security;
alter table project_specializations enable row level security;

create policy specializations_policy on specializations
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy project_specializations_policy on project_specializations
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_specializations_org on specializations(organization_id);
create index if not exists idx_project_specializations_proj on project_specializations(project_id);


-- ==================== SPRINT 14.0.2: ELECTORAL TABLES ====================

-- electoral_campaigns
create table if not exists electoral_campaigns (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  name text,
  candidate_name text,
  party text,
  office text,
  election_year integer,
  status text,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- electoral_territories
create table if not exists electoral_territories (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  campaign_id varchar(255) references electoral_campaigns(id) on delete cascade,
  parent_id varchar(255) references electoral_territories(id) on delete cascade,
  parent_territory_id varchar(255) references electoral_territories(id) on delete set null,
  coverage_status text,
  priority_level text,
  name text,
  type text,
  code text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- electoral_coordinators
create table if not exists electoral_coordinators (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  campaign_id varchar(255) references electoral_campaigns(id) on delete cascade,
  territory_id varchar(255) references electoral_territories(id) on delete cascade,
  parent_coordinator_id varchar(255) references electoral_coordinators(id) on delete set null,
  user_id varchar(255) references users(id) on delete set null,
  name text,
  email text,
  phone text,
  level text,
  status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- electoral_campaign_invites
create table if not exists electoral_campaign_invites (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  campaign_id varchar(255) references electoral_campaigns(id) on delete cascade,
  territory_id varchar(255) references electoral_territories(id) on delete cascade,
  email text,
  phone text,
  role text,
  level text,
  token text,
  status text,
  invited_by varchar(255),
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  declined_at timestamp with time zone,
  revoked_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- invite_audit_log
create table if not exists invite_audit_log (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  invite_id varchar(255) references electoral_campaign_invites(id) on delete cascade,
  action text not null,
  performed_by varchar(255),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- electoral_analyses
create table if not exists electoral_analyses (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  campaign_id varchar(255) references electoral_campaigns(id) on delete cascade,
  type text,
  title text,
  summary text,
  status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table electoral_campaigns enable row level security;
alter table electoral_territories enable row level security;
alter table electoral_coordinators enable row level security;
alter table electoral_campaign_invites enable row level security;
alter table electoral_analyses enable row level security;
alter table invite_audit_log enable row level security;

-- Policies
create policy electoral_campaigns_policy on electoral_campaigns
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy electoral_territories_policy on electoral_territories
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy electoral_coordinators_policy on electoral_coordinators
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy electoral_campaign_invites_policy on electoral_campaign_invites
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy electoral_analyses_policy on electoral_analyses
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy invite_audit_log_policy on invite_audit_log
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_electoral_campaigns_org_proj on electoral_campaigns(organization_id, project_id);
create index if not exists idx_electoral_campaigns_status on electoral_campaigns(status);

create index if not exists idx_electoral_territories_org_proj on electoral_territories(organization_id, project_id);
create index if not exists idx_electoral_territories_camp on electoral_territories(campaign_id);

create index if not exists idx_electoral_coordinators_org_proj on electoral_coordinators(organization_id, project_id);
create index if not exists idx_electoral_coordinators_camp on electoral_coordinators(campaign_id);
create index if not exists idx_electoral_coordinators_terr on electoral_coordinators(territory_id);

create index if not exists idx_electoral_campaign_invites_org_proj on electoral_campaign_invites(organization_id, project_id);
create index if not exists idx_electoral_campaign_invites_camp on electoral_campaign_invites(campaign_id);
create index if not exists idx_electoral_campaign_invites_status on electoral_campaign_invites(status);

create index if not exists idx_electoral_analyses_org_proj on electoral_analyses(organization_id, project_id);


-- ==================== SPRINT 14.1: CAMPAIGN OPERATIONAL CORE TABLES ====================

-- campaign_objectives
create table if not exists campaign_objectives (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  campaign_id varchar(255) references electoral_campaigns(id) on delete cascade not null,
  title text not null,
  description text,
  priority text, -- LOW, MEDIUM, HIGH, CRITICAL
  status text, -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  due_date timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- campaign_tasks
create table if not exists campaign_tasks (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  campaign_id varchar(255) references electoral_campaigns(id) on delete cascade not null,
  objective_id varchar(255) references campaign_objectives(id) on delete cascade,
  assigned_coordinator_id varchar(255) references electoral_coordinators(id) on delete set null,
  title text not null,
  description text,
  status text, -- PENDING, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED
  priority text, -- LOW, MEDIUM, HIGH, CRITICAL
  due_date timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table campaign_objectives enable row level security;
alter table campaign_tasks enable row level security;

-- Policies
create policy campaign_objectives_policy on campaign_objectives
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy campaign_tasks_policy on campaign_tasks
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_campaign_objectives_org_proj on campaign_objectives(organization_id, project_id);
create index if not exists idx_campaign_objectives_camp on campaign_objectives(campaign_id);
create index if not exists idx_campaign_objectives_status on campaign_objectives(status);

create index if not exists idx_campaign_tasks_org_proj on campaign_tasks(organization_id, project_id);
create index if not exists idx_campaign_tasks_camp on campaign_tasks(campaign_id);
create index if not exists idx_campaign_tasks_obj on campaign_tasks(objective_id);
create index if not exists idx_campaign_tasks_status on campaign_tasks(status);

-- ==================== SPRINT 14.4: OPPONENT & POLITICAL INTELLIGENCE TABLES ====================

-- electoral_opponents
create table if not exists electoral_opponents (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  name text not null,
  party text,
  position text,
  status text not null, -- ACTIVE, INACTIVE, MONITORED, ARCHIVED
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- electoral_political_groups
create table if not exists electoral_political_groups (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  name text not null,
  description text,
  status text not null, -- ACTIVE, INACTIVE, ARCHIVED
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- electoral_leaderships
create table if not exists electoral_leaderships (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  notes text,
  status text not null, -- ACTIVE, INACTIVE, MONITORED
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- electoral_relationships
create table if not exists electoral_relationships (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  project_id varchar(255) references projects(id) on delete cascade,
  source_id varchar(255) not null,
  source_type text not null, -- OPPONENT, POLITICAL_GROUP, LEADERSHIP
  target_id varchar(255) not null,
  target_type text not null, -- OPPONENT, POLITICAL_GROUP, LEADERSHIP, TERRITORY
  type text not null, -- SUPPORTS, OPPOSES, BELONGS_TO_GROUP, LEADS_GROUP, INFLUENCES, WORKS_WITH
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table electoral_opponents enable row level security;
alter table electoral_political_groups enable row level security;
alter table electoral_leaderships enable row level security;
alter table electoral_relationships enable row level security;

-- Policies
create policy electoral_opponents_policy on electoral_opponents
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy electoral_political_groups_policy on electoral_political_groups
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy electoral_leaderships_policy on electoral_leaderships
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create policy electoral_relationships_policy on electoral_relationships
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_electoral_opponents_org_proj on electoral_opponents(organization_id, project_id);
create index if not exists idx_electoral_opponents_status on electoral_opponents(status);

create index if not exists idx_electoral_political_groups_org_proj on electoral_political_groups(organization_id, project_id);
create index if not exists idx_electoral_political_groups_status on electoral_political_groups(status);

create index if not exists idx_electoral_leaderships_org_proj on electoral_leaderships(organization_id, project_id);
create index if not exists idx_electoral_leaderships_status on electoral_leaderships(status);

create index if not exists idx_electoral_relationships_org_proj on electoral_relationships(organization_id, project_id);
create index if not exists idx_electoral_relationships_source on electoral_relationships(source_id, source_type);
create index if not exists idx_electoral_relationships_target on electoral_relationships(target_id, target_type);
create index if not exists idx_electoral_relationships_type on electoral_relationships(type);

-- ==================== SPRINT 14.5.1: HISTORICAL ELECTORAL RESULTS ====================

create table if not exists electoral_historical_results (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade,
  project_id varchar(255) references projects(id) on delete cascade,
  ano_eleitoral integer not null,
  uf text not null,
  municipio text not null,
  zona text,
  cargo text not null,
  nome text not null,
  partido text,
  numero_votavel text,
  local_votacao text,
  endereco_local text,
  qt_votos integer not null default 0,
  turno integer,
  suplementar boolean default false,
  import_run_id text,
  record_hash text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table electoral_historical_results enable row level security;

-- Policies
create policy electoral_historical_results_select_policy on electoral_historical_results
  for select using (organization_id is null or organization_id = get_user_org_id());

create policy electoral_historical_results_modify_policy on electoral_historical_results
  for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create unique index if not exists idx_ehr_record_hash on electoral_historical_results(record_hash, coalesce(organization_id, 'global'));
create index if not exists idx_ehr_ano_eleitoral on electoral_historical_results(ano_eleitoral);
create index if not exists idx_ehr_uf on electoral_historical_results(uf);
create index if not exists idx_ehr_municipio on electoral_historical_results(municipio);
create index if not exists idx_ehr_cargo on electoral_historical_results(cargo);
create index if not exists idx_ehr_nome on electoral_historical_results(nome);
create index if not exists idx_ehr_partido on electoral_historical_results(partido);
create index if not exists idx_ehr_numero_votavel on electoral_historical_results(numero_votavel);
create index if not exists idx_ehr_zona on electoral_historical_results(zona);
create index if not exists idx_ehr_local_votacao on electoral_historical_results(local_votacao);
create index if not exists idx_ehr_import_run_id on electoral_historical_results(import_run_id);

create index if not exists idx_ehr_comp1 on electoral_historical_results(ano_eleitoral, uf, municipio, cargo);
create index if not exists idx_ehr_comp2 on electoral_historical_results(nome, ano_eleitoral);
create index if not exists idx_ehr_comp3 on electoral_historical_results(municipio, zona, local_votacao);

-- RPC for candidate ranking
create or replace function get_candidate_ranking(
  p_org_id text,
  p_ano integer,
  p_uf text,
  p_municipio text,
  p_zona text,
  p_cargo text,
  p_partido text,
  p_limit integer
) returns table(name text, votes bigint) as $$
begin
  return query
  select nome as name, sum(qt_votos) as votes
  from electoral_historical_results
  where (organization_id = p_org_id or organization_id is null)
    and (p_ano is null or ano_eleitoral = p_ano)
    and (p_uf is null or uf = p_uf)
    and (p_municipio is null or municipio ilike p_municipio)
    and (p_zona is null or zona = p_zona)
    and (p_cargo is null or cargo ilike p_cargo)
    and (p_partido is null or partido ilike p_partido)
  group by nome
  order by votes desc
  limit coalesce(p_limit, 10);
end;
$$ language plpgsql security definer;

-- RPC for party ranking
create or replace function get_party_ranking(
  p_org_id text,
  p_ano integer,
  p_uf text,
  p_municipio text,
  p_zona text,
  p_cargo text,
  p_nome text,
  p_limit integer
) returns table(name text, votes bigint) as $$
begin
  return query
  select partido as name, sum(qt_votos) as votes
  from electoral_historical_results
  where (organization_id = p_org_id or organization_id is null)
    and (p_ano is null or ano_eleitoral = p_ano)
    and (p_uf is null or uf = p_uf)
    and (p_municipio is null or municipio ilike p_municipio)
    and (p_zona is null or zona = p_zona)
    and (p_cargo is null or cargo ilike p_cargo)
    and (p_nome is null or nome ilike '%' || p_nome || '%')
    and partido is not null
  group by partido
  order by votes desc
  limit coalesce(p_limit, 10);
end;
$$ language plpgsql security definer;


-- ==================== SPRINT 14.5.2: HISTORICAL ELECTORAL BULK IMPORT ====================

create table if not exists electoral_import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade,
  project_id varchar(255) references projects(id) on delete cascade,
  import_run_id text not null,
  source_file_name text,
  source_file_path text,
  uf text,
  ano_eleitoral integer,
  status text,
  total_rows integer default 0,
  processed_rows integer default 0,
  inserted_rows integer default 0,
  invalid_rows integer default 0,
  duplicate_rows integer default 0,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table electoral_import_jobs enable row level security;
create policy electoral_import_jobs_select on electoral_import_jobs for select using (organization_id is null or organization_id = get_user_org_id());
create policy electoral_import_jobs_modify on electoral_import_jobs for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create table if not exists electoral_import_row_errors (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid references electoral_import_jobs(id) on delete cascade,
  row_number integer,
  raw_data jsonb,
  error_message text,
  created_at timestamptz default now()
);

alter table electoral_import_row_errors enable row level security;
create policy electoral_import_row_errors_select on electoral_import_row_errors for select using (
  exists (select 1 from electoral_import_jobs j where j.id = import_job_id and (j.organization_id is null or j.organization_id = get_user_org_id()))
);
create policy electoral_import_row_errors_modify on electoral_import_row_errors for all using (
  exists (select 1 from electoral_import_jobs j where j.id = import_job_id and (j.organization_id = get_user_org_id()))
);


-- ==================== SPRINT 19.3: GOVERNMENT AMENDMENT OPPORTUNITY & RESOURCE CAPTURE ====================

create table if not exists government_funding_opportunities (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  name text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_funding_programs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  name text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_funding_notices (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  program_id varchar(255) references government_funding_programs(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_funding_requirements (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  notice_id varchar(255) references government_funding_notices(id) on delete cascade not null,
  requirement text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_funding_proposals (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  opportunity_id varchar(255) references government_funding_opportunities(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_funding_submissions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  proposal_id varchar(255) references government_funding_proposals(id) on delete cascade not null,
  submission_date timestamp with time zone,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table government_funding_opportunities enable row level security;
alter table government_funding_programs enable row level security;
alter table government_funding_notices enable row level security;
alter table government_funding_requirements enable row level security;
alter table government_funding_proposals enable row level security;
alter table government_funding_submissions enable row level security;

create policy government_funding_opportunities_policy on government_funding_opportunities for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_funding_programs_policy on government_funding_programs for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_funding_notices_policy on government_funding_notices for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_funding_requirements_policy on government_funding_requirements for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_funding_proposals_policy on government_funding_proposals for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_funding_submissions_policy on government_funding_submissions for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_funding_opportunities_org_workspace on government_funding_opportunities(organization_id, workspace_id);
create index if not exists idx_funding_programs_org_workspace on government_funding_programs(organization_id, workspace_id);
create index if not exists idx_funding_notices_org_workspace on government_funding_notices(organization_id, workspace_id);
create index if not exists idx_funding_requirements_org_workspace on government_funding_requirements(organization_id, workspace_id);
create index if not exists idx_funding_proposals_org_workspace on government_funding_proposals(organization_id, workspace_id);
create index if not exists idx_funding_submissions_org_workspace on government_funding_submissions(organization_id, workspace_id);

-- ==================== SPRINT 19.4: GOVERNMENT AMENDMENT STRATEGIC PLANNING & PORTFOLIO FOUNDATION ====================

create table if not exists government_amendment_portfolios (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  name text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_amendment_portfolio_items (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  portfolio_id varchar(255) references government_amendment_portfolios(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_amendment_priorities (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  portfolio_item_id varchar(255) references government_amendment_portfolio_items(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_amendment_objectives (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  portfolio_item_id varchar(255) references government_amendment_portfolio_items(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_amendment_action_plans (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  objective_id varchar(255) references government_amendment_objectives(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_amendment_followups (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  action_plan_id varchar(255) references government_amendment_action_plans(id) on delete cascade not null,
  notes text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table government_amendment_portfolios enable row level security;
alter table government_amendment_portfolio_items enable row level security;
alter table government_amendment_priorities enable row level security;
alter table government_amendment_objectives enable row level security;
alter table government_amendment_action_plans enable row level security;
alter table government_amendment_followups enable row level security;

create policy government_amendment_portfolios_policy on government_amendment_portfolios for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_amendment_portfolio_items_policy on government_amendment_portfolio_items for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_amendment_priorities_policy on government_amendment_priorities for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_amendment_objectives_policy on government_amendment_objectives for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_amendment_action_plans_policy on government_amendment_action_plans for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_amendment_followups_policy on government_amendment_followups for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_amendment_portfolios_org_ws on government_amendment_portfolios(organization_id, workspace_id, status, created_at);
create index if not exists idx_amendment_portfolio_items_org_ws on government_amendment_portfolio_items(organization_id, workspace_id, status, created_at);
create index if not exists idx_amendment_priorities_org_ws on government_amendment_priorities(organization_id, workspace_id, status, created_at);
create index if not exists idx_amendment_objectives_org_ws on government_amendment_objectives(organization_id, workspace_id, status, created_at);
create index if not exists idx_amendment_action_plans_org_ws on government_amendment_action_plans(organization_id, workspace_id, status, created_at);
create index if not exists idx_amendment_followups_org_ws on government_amendment_followups(organization_id, workspace_id, status, created_at);


-- ==================== SPRINT 22.0: PORTAL DA TRANSPARENCIA INTELIGENTE FOUNDATION ====================

create table if not exists government_transparency_publications (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  title text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_transparency_categories (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  publication_id varchar(255) references government_transparency_publications(id) on delete cascade not null,
  name text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_transparency_datasets (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  category_id varchar(255) references government_transparency_categories(id) on delete cascade not null,
  name text not null,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_transparency_indicators (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  dataset_id varchar(255) references government_transparency_datasets(id) on delete cascade not null,
  name text not null,
  value text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_transparency_documents (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  publication_id varchar(255) references government_transparency_publications(id) on delete cascade not null,
  title text not null,
  url text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_transparency_reports (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  publication_id varchar(255) references government_transparency_publications(id) on delete cascade not null,
  title text not null,
  content text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table government_transparency_publications enable row level security;
alter table government_transparency_categories enable row level security;
alter table government_transparency_datasets enable row level security;
alter table government_transparency_indicators enable row level security;
alter table government_transparency_documents enable row level security;
alter table government_transparency_reports enable row level security;

create policy government_transparency_publications_policy on government_transparency_publications for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_categories_policy on government_transparency_categories for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_datasets_policy on government_transparency_datasets for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_indicators_policy on government_transparency_indicators for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_documents_policy on government_transparency_documents for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_reports_policy on government_transparency_reports for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_transparency_publications_org_ws on government_transparency_publications(organization_id, workspace_id, status, created_at);
create index if not exists idx_transparency_categories_org_ws on government_transparency_categories(organization_id, workspace_id, status, created_at);
create index if not exists idx_transparency_datasets_org_ws on government_transparency_datasets(organization_id, workspace_id, status, created_at);
create index if not exists idx_transparency_indicators_org_ws on government_transparency_indicators(organization_id, workspace_id, status, created_at);
create index if not exists idx_transparency_documents_org_ws on government_transparency_documents(organization_id, workspace_id, status, created_at);
create index if not exists idx_transparency_reports_org_ws on government_transparency_reports(organization_id, workspace_id, status, created_at);

-- ==================== SPRINT 22.1: GOVERNMENT OMBUDSMAN FOUNDATION ====================

create table if not exists government_ombudsman_requests (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  subject text not null,
  content text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_ombudsman_categories (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  request_id varchar(255) references government_ombudsman_requests(id) on delete cascade not null,
  name text not null,
  description text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_ombudsman_protocols (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  request_id varchar(255) references government_ombudsman_requests(id) on delete cascade not null,
  protocol_number text not null,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_ombudsman_responses (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  request_id varchar(255) references government_ombudsman_requests(id) on delete cascade not null,
  content text not null,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_ombudsman_attachments (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  request_id varchar(255) references government_ombudsman_requests(id) on delete cascade not null,
  file_name text not null,
  url text,
  status text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table government_ombudsman_requests enable row level security;
alter table government_ombudsman_categories enable row level security;
alter table government_ombudsman_protocols enable row level security;
alter table government_ombudsman_responses enable row level security;
alter table government_ombudsman_attachments enable row level security;

create policy government_ombudsman_requests_policy on government_ombudsman_requests for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_ombudsman_categories_policy on government_ombudsman_categories for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_ombudsman_protocols_policy on government_ombudsman_protocols for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_ombudsman_responses_policy on government_ombudsman_responses for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_ombudsman_attachments_policy on government_ombudsman_attachments for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_ombudsman_requests_org_ws on government_ombudsman_requests(organization_id, workspace_id, status, created_at);
create index if not exists idx_ombudsman_categories_org_ws on government_ombudsman_categories(organization_id, workspace_id, status, created_at);
create index if not exists idx_ombudsman_protocols_org_ws on government_ombudsman_protocols(organization_id, workspace_id, status, created_at);
create index if not exists idx_ombudsman_responses_org_ws on government_ombudsman_responses(organization_id, workspace_id, status, created_at);
create index if not exists idx_ombudsman_attachments_org_ws on government_ombudsman_attachments(organization_id, workspace_id, status, created_at);

-- 1. Validation Table
create table if not exists electoral_import_validation_summary (
  id uuid primary key default gen_random_uuid(),
  import_run_id text,
  validated_at timestamptz,
  total_rows integer,
  total_votes integer,
  available_years jsonb,
  available_ufs jsonb,
  available_municipalities jsonb,
  available_cargos jsonb,
  available_turnos jsonb,
  duplicate_rows integer,
  invalid_rows integer,
  status text,
  details_json jsonb,
  organization_id varchar(255) references organizations(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table electoral_import_validation_summary enable row level security;
create policy electoral_import_validation_summary_select on electoral_import_validation_summary for select using (organization_id is null or organization_id = get_user_org_id());
create policy electoral_import_validation_summary_modify on electoral_import_validation_summary for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());


-- 2. Materialized Views

create materialized view if not exists electoral_candidate_summary as
select 
  organization_id,
  ano_eleitoral,
  uf,
  municipio,
  cargo,
  nome as candidato,
  partido,
  turno,
  suplementar,
  sum(qt_votos) as total_votos
from electoral_historical_results
group by organization_id, ano_eleitoral, uf, municipio, cargo, nome, partido, turno, suplementar;

create index if not exists idx_mv_cand_sum_org on electoral_candidate_summary(organization_id);
create index if not exists idx_mv_cand_sum_ano_uf_mun on electoral_candidate_summary(ano_eleitoral, uf, municipio);
create index if not exists idx_mv_cand_sum_cand on electoral_candidate_summary(candidato);

create materialized view if not exists electoral_municipality_summary as
select 
  organization_id,
  ano_eleitoral,
  uf,
  municipio,
  cargo,
  turno,
  suplementar,
  sum(qt_votos) as total_votos
from electoral_historical_results
group by organization_id, ano_eleitoral, uf, municipio, cargo, turno, suplementar;

create index if not exists idx_mv_mun_sum_org on electoral_municipality_summary(organization_id);
create index if not exists idx_mv_mun_sum_ano_uf on electoral_municipality_summary(ano_eleitoral, uf, municipio);


create materialized view if not exists electoral_party_summary as
select 
  organization_id,
  ano_eleitoral,
  uf,
  municipio,
  cargo,
  partido,
  turno,
  suplementar,
  sum(qt_votos) as total_votos
from electoral_historical_results
group by organization_id, ano_eleitoral, uf, municipio, cargo, partido, turno, suplementar;

create index if not exists idx_mv_party_sum_org on electoral_party_summary(organization_id);
create index if not exists idx_mv_party_sum_ano_uf on electoral_party_summary(ano_eleitoral, uf, municipio);
create index if not exists idx_mv_party_sum_partido on electoral_party_summary(partido);


create materialized view if not exists electoral_location_summary as
select 
  organization_id,
  ano_eleitoral,
  uf,
  municipio,
  cargo,
  local_votacao,
  turno,
  suplementar,
  sum(qt_votos) as total_votos
from electoral_historical_results
group by organization_id, ano_eleitoral, uf, municipio, cargo, local_votacao, turno, suplementar;

create index if not exists idx_mv_loc_sum_org on electoral_location_summary(organization_id);
create index if not exists idx_mv_loc_sum_ano_uf on electoral_location_summary(ano_eleitoral, uf, municipio);
create index if not exists idx_mv_loc_sum_loc on electoral_location_summary(local_votacao);


create materialized view if not exists electoral_zone_summary as
select 
  organization_id,
  ano_eleitoral,
  uf,
  municipio,
  cargo,
  zona,
  turno,
  suplementar,
  sum(qt_votos) as total_votos
from electoral_historical_results
group by organization_id, ano_eleitoral, uf, municipio, cargo, zona, turno, suplementar;

create index if not exists idx_mv_zone_sum_org on electoral_zone_summary(organization_id);
create index if not exists idx_mv_zone_sum_ano_uf on electoral_zone_summary(ano_eleitoral, uf, municipio);
create index if not exists idx_mv_zone_sum_zona on electoral_zone_summary(zona);


-- 3. Additional Composite Indexes for base table
create index if not exists idx_ehr_ano_uf on electoral_historical_results(ano_eleitoral, uf);
create index if not exists idx_ehr_ano_uf_mun on electoral_historical_results(ano_eleitoral, uf, municipio);
create index if not exists idx_ehr_ano_uf_mun_cargo on electoral_historical_results(ano_eleitoral, uf, municipio, cargo);
create index if not exists idx_ehr_ano_uf_mun_cargo_turno on electoral_historical_results(ano_eleitoral, uf, municipio, cargo, turno);
create index if not exists idx_ehr_ano_uf_mun_cargo_nome on electoral_historical_results(ano_eleitoral, uf, municipio, cargo, nome);
create index if not exists idx_ehr_ano_uf_mun_cargo_partido on electoral_historical_results(ano_eleitoral, uf, municipio, cargo, partido);
create index if not exists idx_ehr_ano_uf_mun_zona on electoral_historical_results(ano_eleitoral, uf, municipio, zona);
create index if not exists idx_ehr_ano_uf_mun_local on electoral_historical_results(ano_eleitoral, uf, municipio, local_votacao);


-- 4. RPC refresh_electoral_aggregates
create or replace function refresh_electoral_aggregates() returns jsonb as $$
declare
  ts_start timestamptz := clock_timestamp();
  ts_end timestamptz;
begin
  refresh materialized view electoral_candidate_summary;
  refresh materialized view electoral_municipality_summary;
  refresh materialized view electoral_party_summary;
  refresh materialized view electoral_location_summary;
  refresh materialized view electoral_zone_summary;
  
  ts_end := clock_timestamp();
  
  return jsonb_build_object(
    'success', true,
    'started_at', ts_start,
    'finished_at', ts_end,
    'duration_ms', extract(epoch from (ts_end - ts_start)) * 1000
  );
end;
$$ language plpgsql security definer;


-- 5. RPC get_electoral_available_filters
create or replace function get_electoral_available_filters(p_org_id text) returns jsonb as $$
declare
  res jsonb;
begin
  select jsonb_build_object(
    'years', coalesce(jsonb_agg(distinct ano_eleitoral), '[]'::jsonb),
    'ufs', coalesce(jsonb_agg(distinct uf), '[]'::jsonb),
    'cargos', coalesce(jsonb_agg(distinct cargo), '[]'::jsonb),
    'turnos', coalesce(jsonb_agg(distinct turno), '[]'::jsonb)
  ) into res
  from electoral_historical_results where (organization_id = p_org_id or organization_id is null);
  
  return jsonb_set(res, '{municipalities}', coalesce((
    select jsonb_agg(distinct municipio)
    from electoral_historical_results
    where organization_id = p_org_id or organization_id is null
  ), '[]'::jsonb));
end;
$$ language plpgsql security definer;

-- 6. RPC compute_electoral_import_validation
create or replace function compute_electoral_import_validation(p_import_run_id text) returns jsonb as $$
declare
  v_job_id uuid;
  v_org_id varchar;
  v_total_rows integer := 0;
  v_total_votes integer := 0;
  v_years jsonb := '[]'::jsonb;
  v_ufs jsonb := '[]'::jsonb;
  v_municipios jsonb := '[]'::jsonb;
  v_cargos jsonb := '[]'::jsonb;
  v_turnos jsonb := '[]'::jsonb;
  v_duplicate_rows integer := 0;
  v_invalid_rows integer := 0;
  v_mun_count integer := 0;
  v_mun_truncated boolean := false;
  v_status text := 'NO_DATA';
begin
  -- get job info
  select id, organization_id into v_job_id, v_org_id
  from electoral_import_jobs
  where import_run_id = p_import_run_id
  limit 1;

  -- get invalid rows count
  if v_job_id is not null then
    select count(*) into v_invalid_rows
    from electoral_import_row_errors
    where import_job_id = v_job_id;
  end if;

  -- aggregates
  select 
    count(*),
    coalesce(sum(qt_votos), 0),
    coalesce(jsonb_agg(distinct ano_eleitoral), '[]'::jsonb),
    coalesce(jsonb_agg(distinct uf), '[]'::jsonb),
    coalesce(jsonb_agg(distinct cargo), '[]'::jsonb),
    coalesce(jsonb_agg(distinct turno), '[]'::jsonb)
  into 
    v_total_rows, v_total_votes, v_years, v_ufs, v_cargos, v_turnos
  from electoral_historical_results
  where import_run_id = p_import_run_id;

  -- fetch municipalities limited to 500
  select count(distinct municipio) into v_mun_count
  from electoral_historical_results
  where import_run_id = p_import_run_id;
  
  if v_mun_count > 500 then
    v_mun_truncated := true;
  end if;

  select coalesce(jsonb_agg(m.municipio), '[]'::jsonb) into v_municipios
  from (
    select distinct municipio
    from electoral_historical_results
    where import_run_id = p_import_run_id
    limit 500
  ) m;

  -- calculate duplicates
  select count(*) into v_duplicate_rows
  from (
    select record_hash
    from electoral_historical_results
    where import_run_id = p_import_run_id
    group by record_hash
    having count(*) > 1
  ) dupes;

  -- define status
  if v_total_rows > 0 then
    if v_invalid_rows > 0 or v_duplicate_rows > 0 then
      v_status := 'PARTIAL_DATA';
    else
      v_status := 'READY';
    end if;
  end if;

  return jsonb_build_object(
    'organizationId', coalesce(v_org_id, ''),
    'importRunId', p_import_run_id,
    'totalRows', v_total_rows,
    'totalVotes', v_total_votes,
    'availableYears', v_years,
    'availableUfs', v_ufs,
    'availableMunicipalities', v_municipios,
    'availableCargos', v_cargos,
    'availableTurnos', v_turnos,
    'duplicateRows', v_duplicate_rows,
    'invalidRows', v_invalid_rows,
    'status', v_status,
    'detailsJson', jsonb_build_object(
       'municipalities_truncated', v_mun_truncated,
       'municipalities_total_count', v_mun_count
    )
  );
end;
$$ language plpgsql security definer;

-- ==========================================
-- SPRINT 15.0 - BETA PLATFORM OPERATIONAL ENGINE
-- ==========================================

-- 1. Contacts
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  type text,
  name text not null,
  email text,
  phone text,
  document text,
  tags jsonb default '[]'::jsonb,
  status text default 'ACTIVE',
  notes text,
  metadata_json jsonb default '{}'::jsonb,
  created_by text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_contacts_org on contacts(organization_id);

-- 2. CRM Interactions
create table if not exists crm_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  contact_id uuid references contacts(id),
  interaction_type text,
  title text not null,
  description text,
  interaction_date timestamp with time zone,
  responsible_user_id text,
  status text default 'COMPLETED',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_crm_interactions_org on crm_interactions(organization_id);

-- 3. Calendar Events
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  title text not null,
  description text,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  location text,
  related_entity_type text,
  related_entity_id text,
  responsible_user_id text,
  status text default 'SCHEDULED',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_calendar_events_org on calendar_events(organization_id);

-- 4. Activities
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  activity_type text not null,
  title text not null,
  description text,
  related_entity_type text,
  related_entity_id text,
  territory_id text,
  responsible_user_id text,
  status text default 'PENDING',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_activities_org on activities(organization_id);

-- 5. Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  title text not null,
  description text,
  priority text default 'MEDIUM',
  due_date timestamp with time zone,
  assigned_to text,
  related_entity_type text,
  related_entity_id text,
  status text default 'PENDING',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_tasks_org on tasks(organization_id);

-- 6. Evidences
create table if not exists evidences (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  evidence_type text,
  title text not null,
  description text,
  related_entity_type text,
  related_entity_id text,
  source_type text,
  source_url text,
  confidence_level integer,
  metadata_json jsonb default '{}'::jsonb,
  created_by text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_evidences_org on evidences(organization_id);

-- 7. Attachments
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  file_name text not null,
  file_type text,
  mime_type text,
  storage_path text not null,
  size_bytes bigint,
  related_entity_type text,
  related_entity_id text,
  uploaded_by text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_attachments_org on attachments(organization_id);

-- 8. Workflow Instances
create table if not exists workflow_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workflow_type text not null,
  title text not null,
  current_step text,
  status text default 'ACTIVE',
  related_entity_type text,
  related_entity_id text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_workflow_instances_org on workflow_instances(organization_id);

-- 9. Workflow Steps
create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workflow_instance_id uuid references workflow_instances(id),
  step_order integer not null,
  title text not null,
  description text,
  assigned_to text,
  status text default 'PENDING',
  completed_at timestamp with time zone,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_workflow_steps_org on workflow_steps(organization_id);

-- 10. Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  user_id text not null,
  title text not null,
  message text,
  notification_type text,
  related_entity_type text,
  related_entity_id text,
  read_at timestamp with time zone,
  status text default 'UNREAD',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_org on notifications(organization_id);

-- ==========================================
-- SPRINT 15.1 — MODULE ACCESS LAYER TABLES
-- ==========================================

-- 1. Modules catalog
create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  code varchar(100) unique not null,
  name text not null,
  description text,
  status varchar(50) default 'ACTIVE',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for speedy lookups by module code
create index if not exists idx_modules_code on modules(code);

-- 2. Organization Module Enablement (Multi-Tenant Module Links)
create table if not exists organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  module_id uuid references modules(id) on delete cascade not null,
  is_enabled boolean default false not null,
  activated_at timestamp with time zone,
  expires_at timestamp with time zone,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_org_module unique (organization_id, module_id)
);

-- Indexes for performance and multi-tenant isolation
create index if not exists idx_organization_modules_org_id on organization_modules(organization_id);
create index if not exists idx_organization_modules_org_module on organization_modules(organization_id, module_id);
create index if not exists idx_organization_modules_enabled on organization_modules(organization_id, is_enabled);

-- 3. Features associated with a module
create table if not exists module_features (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade not null,
  feature_code varchar(100) unique not null,
  feature_name text not null,
  description text,
  status varchar(50) default 'ACTIVE',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_module_features_module on module_features(module_id);
create index if not exists idx_module_features_code on module_features(feature_code);

-- 4. Feature behavior overrides at the organization level overrides
create table if not exists organization_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  feature_id uuid references module_features(id) on delete cascade not null,
  is_enabled boolean default false not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_org_feature unique (organization_id, feature_id)
);

create index if not exists idx_org_feature_overrides_org_id on organization_feature_overrides(organization_id);
create index if not exists idx_org_feature_overrides_compound on organization_feature_overrides(organization_id, feature_id);

-- =========================================================================
-- RLS PREPARATION - SPRINT 15.1
-- =========================================================================
-- Note: As per architecture guidance, RLS is currently NOT activated immediately.
-- However, we have prepared the necessary policies. To enable, execute:
-- ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE organization_feature_overrides ENABLE ROW LEVEL SECURITY;
--
-- Example policy structure:
-- CREATE POLICY org_modules_tenant_access ON organization_modules
-- FOR ALL USING (organization_id = current_setting('app.current_organization_id', true));
--
-- CREATE POLICY org_features_tenant_access ON organization_feature_overrides
-- FOR ALL USING (organization_id = current_setting('app.current_organization_id', true));
-- =========================================================================


-- =========================================================================
-- SPRINT 15.2 — CLIENT WORKSPACE & SUPER ADMIN TABLES
-- =========================================================================

-- 1. Workspaces Catalog (Multi-Tenant)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  name text not null,
  description text,
  status varchar(50) default 'ACTIVE' not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Optimize workspaces querying by organization
create index if not exists idx_workspaces_organization_id on workspaces(organization_id);
create index if not exists idx_workspaces_status on workspaces(status);

-- 2. Organization Workspaces Mapping (Explicit link registry)
create table if not exists organization_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  is_enabled boolean default true not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_org_workspace unique (organization_id, workspace_id)
);

create index if not exists idx_organization_workspaces_org_id on organization_workspaces(organization_id);
create index if not exists idx_organization_workspaces_ws_id on organization_workspaces(workspace_id);

-- 3. Organization Settings Key-Value overrides
create table if not exists organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  setting_key varchar(200) not null,
  setting_value text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_org_setting unique (organization_id, setting_key)
);

create index if not exists idx_organization_settings_compound on organization_settings(organization_id, setting_key);

-- 4. Super Admin Audit Logs
create table if not exists super_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id varchar not null,
  organization_id varchar default 'global' not null,
  action_type varchar(100) not null,
  entity_type varchar(100) not null,
  entity_id varchar not null,
  description text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_super_admin_audit_logs_actor on super_admin_audit_logs(actor_user_id);
create index if not exists idx_super_admin_audit_logs_org on super_admin_audit_logs(organization_id);
create index if not exists idx_super_admin_audit_logs_entity on super_admin_audit_logs(entity_type, entity_id);
create index if not exists idx_super_admin_audit_logs_created on super_admin_audit_logs(created_at desc);

-- =========================================================================


-- =========================================================================
-- SPRINT 15.3 — SHARED IMPORT CENTER TABLES
-- =========================================================================

-- 1. Import Jobs Registry
create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  module_code varchar(100) not null,
  job_type varchar(100) not null,
  status varchar(50) default 'PENDING' not null,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  total_rows integer default 0 not null,
  processed_rows integer default 0 not null,
  success_rows integer default 0 not null,
  error_rows integer default 0 not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_import_jobs_organization_id on import_jobs(organization_id);
create index if not exists idx_import_jobs_workspace_id on import_jobs(workspace_id);
create index if not exists idx_import_jobs_status on import_jobs(status);
create index if not exists idx_import_jobs_module_code on import_jobs(module_code);

-- 2. Import Job Files Registry
create table if not exists import_job_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references import_jobs(id) on delete cascade not null,
  file_name text not null,
  file_type varchar(100) not null,
  file_size bigint not null,
  storage_path text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_import_job_files_job_id on import_job_files(job_id);

-- 3. Import Job Execution Logs
create table if not exists import_job_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references import_jobs(id) on delete cascade not null,
  level varchar(50) default 'INFO' not null,
  message text not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_import_job_logs_job_id on import_job_logs(job_id);

-- 4. Import Job Errors Queue
create table if not exists import_job_errors (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references import_jobs(id) on delete cascade not null,
  row_number integer not null,
  error_code varchar(100) not null,
  error_message text not null,
  raw_data_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_import_job_errors_job_id on import_job_errors(job_id);
create index if not exists idx_import_job_errors_row_number on import_job_errors(row_number);

-- =========================================================================
-- SPRINT 15.4 — BETA ELECTORAL OPERATIONAL TABLES
-- =========================================================================

-- 1. Electoral Campaigns Table
create table if not exists electoral_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  name varchar not null,
  description text,
  campaign_type varchar(100) not null,
  status varchar(50) default 'PENDING' not null,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_electoral_campaigns_org_id on electoral_campaigns(organization_id);
create index if not exists idx_electoral_campaigns_ws_id on electoral_campaigns(workspace_id);

-- 2. Campaign Members Table (role can be: candidate, coordinator, supporter, leader, advisor, etc.)
create table if not exists campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  contact_id uuid not null, -- references contacts(id) or similar, using uuid to ensure system integrity
  role varchar(100) not null,
  status varchar(50) default 'ACTIVE' not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_campaign_members_camp_id on campaign_members(campaign_id);
create index if not exists idx_campaign_members_contact_id on campaign_members(contact_id);

-- 3. Campaign Goals Table
create table if not exists campaign_goals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  title varchar not null,
  description text,
  goal_type varchar(100) not null,
  target_value numeric default 0 not null,
  current_value numeric default 0 not null,
  status varchar(50) default 'PENDING' not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_campaign_goals_camp_id on campaign_goals(campaign_id);

-- 4. Campaign Actions Table
create table if not exists campaign_actions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  activity_id uuid, -- references activities(id) if applicable
  task_id uuid, -- references tasks(id) if applicable
  title varchar not null,
  description text,
  status varchar(50) default 'PENDING' not null,
  scheduled_for timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_campaign_actions_camp_id on campaign_actions(campaign_id);

-- 5. Campaign Evidences Table
create table if not exists campaign_evidences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  evidence_id uuid not null, -- references evidences(id)
  description text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_campaign_evidences_camp_id on campaign_evidences(campaign_id);
create index if not exists idx_campaign_evidences_ev_id on campaign_evidences(evidence_id);

-- 6. Campaign Activity Links Table
create table if not exists campaign_activity_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  activity_id uuid not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_campaign_activity_links_camp_id on campaign_activity_links(campaign_id);
create index if not exists idx_campaign_activity_links_act_id on campaign_activity_links(activity_id);

-- =========================================================================
-- SPRINT 15.5 — COORDINATOR & TERRITORY OPERATIONAL TABLES
-- =========================================================================

-- 1. campaign_territories table
create table if not exists campaign_territories (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  parent_territory_id uuid references campaign_territories(id) on delete set null,
  territory_type varchar(100) not null, -- country, region, state, city, district, neighborhood, zone, polling_place, custom_area
  name varchar not null,
  description text,
  geo_code varchar(100),
  status varchar(50) default 'ACTIVE' not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_campaign_territories_org_id on campaign_territories(organization_id);
create index if not exists idx_campaign_territories_ws_id on campaign_territories(workspace_id);
create index if not exists idx_campaign_territories_camp_id on campaign_territories(campaign_id);
create index if not exists idx_campaign_territories_parent_id on campaign_territories(parent_territory_id);

-- 2. campaign_coordinators table
create table if not exists campaign_coordinators (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  contact_id uuid not null, -- references contacts(id) or similar
  coordinator_level varchar(100) not null, -- general, regional, city, district, zone, polling_place, team_leader
  role varchar(100) not null,
  status varchar(50) default 'ACTIVE' not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_campaign_coordinators_org_id on campaign_coordinators(organization_id);
create index if not exists idx_campaign_coordinators_ws_id on campaign_coordinators(workspace_id);
create index if not exists idx_campaign_coordinators_camp_id on campaign_coordinators(campaign_id);
create index if not exists idx_campaign_coordinators_contact_id on campaign_coordinators(contact_id);

-- 3. campaign_coordinator_assignments table
create table if not exists campaign_coordinator_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  coordinator_id uuid references campaign_coordinators(id) on delete cascade not null,
  territory_id uuid references campaign_territories(id) on delete cascade not null,
  assignment_type varchar(100) not null, -- primary, secondary, support, observer
  status varchar(50) default 'ACTIVE' not null,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_cca_org_id on campaign_coordinator_assignments(organization_id);
create index if not exists idx_cca_ws_id on campaign_coordinator_assignments(workspace_id);
create index if not exists idx_cca_camp_id on campaign_coordinator_assignments(campaign_id);
create index if not exists idx_cca_coord_id on campaign_coordinator_assignments(coordinator_id);
create index if not exists idx_cca_terr_id on campaign_coordinator_assignments(territory_id);

-- 4. campaign_territory_coverage table
create table if not exists campaign_territory_coverage (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  territory_id uuid references campaign_territories(id) on delete cascade not null,
  coordinators_count integer default 0 not null,
  members_count integer default 0 not null,
  actions_count integer default 0 not null,
  evidences_count integer default 0 not null,
  last_activity_at timestamp with time zone,
  coverage_status varchar(100) not null, -- NO_DATA, UNCOVERED, LOW_COVERAGE, PARTIAL_COVERAGE, COVERED
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_campaign_territory_coverage unique (campaign_id, territory_id)
);

create index if not exists idx_ctc_org_id on campaign_territory_coverage(organization_id);
create index if not exists idx_ctc_ws_id on campaign_territory_coverage(workspace_id);
create index if not exists idx_ctc_camp_id on campaign_territory_coverage(campaign_id);
create index if not exists idx_ctc_terr_id on campaign_territory_coverage(territory_id);

-- 5. campaign_territory_conflicts table
create table if not exists campaign_territory_conflicts (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  territory_id uuid references campaign_territories(id) on delete cascade not null,
  conflict_type varchar(100) not null, -- multiple_primary_coordinators, inactive_primary_coordinator, territory_without_coordinator, overlapping_assignment, data_inconsistency
  description text not null,
  status varchar(50) default 'ACTIVE' not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_ctf_org_id on campaign_territory_conflicts(organization_id);
create index if not exists idx_ctf_ws_id on campaign_territory_conflicts(workspace_id);
create index if not exists idx_ctf_camp_id on campaign_territory_conflicts(campaign_id);
create index if not exists idx_ctf_terr_id on campaign_territory_conflicts(territory_id);

-- 6. campaign_coordinator_health table
create table if not exists campaign_coordinator_health (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  coordinator_id uuid references campaign_coordinators(id) on delete cascade not null,
  assigned_territories_count integer default 0 not null,
  active_actions_count integer default 0 not null,
  completed_actions_count integer default 0 not null,
  pending_actions_count integer default 0 not null,
  last_activity_at timestamp with time zone,
  health_status varchar(100) not null, -- NO_DATA, INACTIVE, LOW_ACTIVITY, ACTIVE, OVERLOADED
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_campaign_coordinator_health unique (campaign_id, coordinator_id)
);

create index if not exists idx_cch_org_id on campaign_coordinator_health(organization_id);
create index if not exists idx_cch_ws_id on campaign_coordinator_health(workspace_id);
create index if not exists idx_cch_camp_id on campaign_coordinator_health(campaign_id);
create index if not exists idx_cch_coord_id on campaign_coordinator_health(coordinator_id);

-- =========================================================================
-- SPRINT 15.6 — CAMPAIGN CRM INTEGRATION TABLES
-- =========================================================================

-- 1. campaign_contacts table
create table if not exists campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  contact_type varchar(100) default 'supporter' not null, -- supporter, leader, influencer, advisor, volunteer, coordinator, donor, strategic_contact
  status varchar(50) default 'ACTIVE' not null,
  priority_level varchar(50) default 'MEDIUM' not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_campaign_contacts_org_id on campaign_contacts(organization_id);
create index if not exists idx_campaign_contacts_ws_id on campaign_contacts(workspace_id);
create index if not exists idx_campaign_contacts_camp_id on campaign_contacts(campaign_id);
create index if not exists idx_campaign_contacts_contact_id on campaign_contacts(contact_id);

-- 2. campaign_contact_relationships table
create table if not exists campaign_contact_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  source_contact_id uuid references contacts(id) on delete cascade not null,
  target_contact_id uuid references contacts(id) on delete cascade not null,
  relationship_type varchar(100) not null, -- indicated, recruited, influences, supports, coordinates, reports_to
  strength_level varchar(50) default 'medium' not null,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_cc_rel_org_id on campaign_contact_relationships(organization_id);
create index if not exists idx_cc_rel_ws_id on campaign_contact_relationships(workspace_id);
create index if not exists idx_cc_rel_camp_id on campaign_contact_relationships(campaign_id);
create index if not exists idx_cc_rel_source_id on campaign_contact_relationships(source_contact_id);
create index if not exists idx_cc_rel_target_id on campaign_contact_relationships(target_contact_id);

-- 3. campaign_contact_tags table
create table if not exists campaign_contact_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  name varchar not null,
  description text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_cc_tags_org_id on campaign_contact_tags(organization_id);
create index if not exists idx_cc_tags_ws_id on campaign_contact_tags(workspace_id);
create index if not exists idx_cc_tags_camp_id on campaign_contact_tags(campaign_id);

-- 4. campaign_contact_segments table
create table if not exists campaign_contact_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  name varchar not null,
  description text,
  status varchar(50) default 'ACTIVE' not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_cc_seg_org_id on campaign_contact_segments(organization_id);
create index if not exists idx_cc_seg_ws_id on campaign_contact_segments(workspace_id);
create index if not exists idx_cc_seg_camp_id on campaign_contact_segments(campaign_id);

-- 5. campaign_contact_engagement table
create table if not exists campaign_contact_engagement (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  interactions_count integer default 0 not null,
  activities_count integer default 0 not null,
  events_count integer default 0 not null,
  last_interaction_at timestamp with time zone,
  engagement_status varchar(100) default 'NO_DATA' not null, -- NO_DATA, INACTIVE, LOW, MEDIUM, HIGH
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint unique_campaign_contact_engagement unique (campaign_id, contact_id)
);

create index if not exists idx_cc_eng_org_id on campaign_contact_engagement(organization_id);
create index if not exists idx_cc_eng_ws_id on campaign_contact_engagement(workspace_id);
create index if not exists idx_cc_eng_camp_id on campaign_contact_engagement(campaign_id);
create index if not exists idx_cc_eng_contact_id on campaign_contact_engagement(contact_id);

-- =========================================================================
-- SPRINT 15.7 — CAMPAIGN CALENDAR & AGENDA INTEGRATION TABLES
-- =========================================================================

-- 1. campaign_events table
create table if not exists campaign_events (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  calendar_event_id uuid references calendar_events(id) on delete set null,
  event_type varchar(100) default 'meeting' not null, -- meeting, visit, campaign_event, coordination_meeting, public_event, private_event, field_activity
  title varchar not null,
  description text,
  status varchar(50) default 'ACTIVE' not null,
  scheduled_start timestamp with time zone not null,
  scheduled_end timestamp with time zone not null,
  location varchar,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_campaign_events_org_id on campaign_events(organization_id);
create index if not exists idx_campaign_events_ws_id on campaign_events(workspace_id);
create index if not exists idx_campaign_events_camp_id on campaign_events(campaign_id);
create index if not exists idx_campaign_events_cal_ev_id on campaign_events(calendar_event_id);

-- 2. campaign_event_participants table
create table if not exists campaign_event_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  event_id uuid references campaign_events(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  participant_type varchar(100) default 'guest' not null, -- candidate, coordinator, leader, supporter, advisor, guest
  status varchar(50) default 'PENDING' not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_cep_org_id on campaign_event_participants(organization_id);
create index if not exists idx_cep_ws_id on campaign_event_participants(workspace_id);
create index if not exists idx_cep_camp_id on campaign_event_participants(campaign_id);
create index if not exists idx_cep_evt_id on campaign_event_participants(event_id);
create index if not exists idx_cep_ctc_id on campaign_event_participants(contact_id);

-- 3. campaign_event_territories table
create table if not exists campaign_event_territories (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  event_id uuid references campaign_events(id) on delete cascade not null,
  territory_id uuid references campaign_territories(id) on delete cascade not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_cet_org_id on campaign_event_territories(organization_id);
create index if not exists idx_cet_ws_id on campaign_event_territories(workspace_id);
create index if not exists idx_cet_camp_id on campaign_event_territories(campaign_id);
create index if not exists idx_cet_evt_id on campaign_event_territories(event_id);
create index if not exists idx_cet_ter_id on campaign_event_territories(territory_id);

-- 4. campaign_event_evidences table
create table if not exists campaign_event_evidences (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  event_id uuid references campaign_events(id) on delete cascade not null,
  evidence_id uuid references evidences(id) on delete cascade not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_cee_org_id on campaign_event_evidences(organization_id);
create index if not exists idx_cee_ws_id on campaign_event_evidences(workspace_id);
create index if not exists idx_cee_camp_id on campaign_event_evidences(campaign_id);
create index if not exists idx_cee_evt_id on campaign_event_evidences(event_id);
create index if not exists idx_cee_ev_id on campaign_event_evidences(evidence_id);

-- 5. campaign_event_attendance table
create table if not exists campaign_event_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar not null,
  workspace_id uuid not null,
  campaign_id uuid references electoral_campaigns(id) on delete cascade not null,
  event_id uuid references campaign_events(id) on delete cascade not null,
  contact_id uuid references contacts(id) on delete cascade not null,
  attendance_status varchar(100) default 'confirmed' not null, -- confirmed, attended, absent, cancelled
  checkin_at timestamp with time zone,
  checkout_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_cea_org_id on campaign_event_attendance(organization_id);
create index if not exists idx_cea_ws_id on campaign_event_attendance(workspace_id);
create index if not exists idx_cea_camp_id on campaign_event_attendance(campaign_id);
create index if not exists idx_cea_evt_id on campaign_event_attendance(event_id);
create index if not exists idx_cea_ctc_id on campaign_event_attendance(contact_id);


-- SPRINT 15.8 - COMMUNICATION & ACTION DISPATCH LAYER

-- 1. communication_threads
create table if not exists communication_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  thread_type varchar(255) not null, -- direct, group, campaign, coordination, administrative
  title varchar(255) not null,
  status varchar(100) default 'ACTIVE' not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_cth_org_id on communication_threads(organization_id);
create index if not exists idx_cth_ws_id on communication_threads(workspace_id);

-- 2. communication_participants
create table if not exists communication_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  thread_id uuid references communication_threads(id) on delete cascade not null,
  user_id varchar(255) references users(id) on delete cascade not null,
  participant_role varchar(100) default 'member' not null,
  status varchar(100) default 'ACTIVE' not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_cp_org_id on communication_participants(organization_id);
create index if not exists idx_cp_ws_id on communication_participants(workspace_id);
create index if not exists idx_cp_thread_id on communication_participants(thread_id);
create index if not exists idx_cp_user_id on communication_participants(user_id);

-- 3. communication_messages
create table if not exists communication_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  thread_id uuid references communication_threads(id) on delete cascade not null,
  sender_user_id varchar(255) references users(id) on delete cascade not null,
  message_type varchar(100) default 'message' not null, -- message, request, notification, system
  content text not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_cm_org_id on communication_messages(organization_id);
create index if not exists idx_cm_ws_id on communication_messages(workspace_id);
create index if not exists idx_cm_thread_id on communication_messages(thread_id);
create index if not exists idx_cm_sender_id on communication_messages(sender_user_id);

-- 4. communication_requests
create table if not exists communication_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  request_type varchar(100) not null, -- meeting_request, report_request, task_request, information_request, approval_request
  requester_user_id varchar(255) references users(id) on delete cascade not null,
  target_user_id varchar(255) references users(id) on delete cascade not null,
  related_entity_type varchar(255),
  related_entity_id varchar(255),
  status varchar(100) default 'PENDING' not null,
  description text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_creq_org_id on communication_requests(organization_id);
create index if not exists idx_creq_ws_id on communication_requests(workspace_id);
create index if not exists idx_creq_req_id on communication_requests(requester_user_id);
create index if not exists idx_creq_tgt_id on communication_requests(target_user_id);

-- 5. communication_dispatches
create table if not exists communication_dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  dispatch_type varchar(100) not null, -- task_dispatch, agenda_dispatch, report_dispatch, coordination_dispatch
  source_user_id varchar(255) references users(id) on delete cascade not null,
  target_user_id varchar(255) references users(id) on delete cascade not null,
  related_entity_type varchar(255),
  related_entity_id varchar(255),
  status varchar(100) default 'DISPATCHED' not null,
  description text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_disp_org_id on communication_dispatches(organization_id);
create index if not exists idx_disp_ws_id on communication_dispatches(workspace_id);
create index if not exists idx_disp_src_id on communication_dispatches(source_user_id);
create index if not exists idx_disp_tgt_id on communication_dispatches(target_user_id);

-- 6. communication_logs
create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  event_type varchar(255) not null,
  entity_type varchar(255) not null,
  entity_id varchar(255) not null,
  description text not null,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_clog_org_id on communication_logs(organization_id);
create index if not exists idx_clog_ws_id on communication_logs(workspace_id);

-- ==========================================
-- SPRINT 15.9: USER PRESENCE & OPERATIONAL COMMUNICATION
-- ==========================================

-- 1. user_presence
create table if not exists user_presence (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  user_id varchar(255) not null,
  presence_status varchar(50) not null,
  last_seen_at timestamp with time zone,
  last_activity_at timestamp with time zone,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_upres_org_ws on user_presence(organization_id, workspace_id);
create index if not exists idx_upres_user on user_presence(user_id);

-- 2. user_sessions
create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  user_id varchar(255) not null,
  session_token varchar(512),
  started_at timestamp with time zone default now() not null,
  last_seen_at timestamp with time zone,
  ended_at timestamp with time zone,
  status varchar(50) not null,
  metadata_json jsonb
);

create index if not exists idx_usess_org_ws on user_sessions(organization_id, workspace_id);
create index if not exists idx_usess_user on user_sessions(user_id);

-- 3. user_activity_log
create table if not exists user_activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id uuid not null,
  user_id varchar(255) not null,
  activity_type varchar(255) not null,
  entity_type varchar(255),
  entity_id varchar(255),
  description text not null,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_uact_org_ws on user_activity_log(organization_id, workspace_id);
create index if not exists idx_uact_user on user_activity_log(user_id);

-- ==================== SPRINT 16.3: AI ROUTER FOUNDATION ====================

-- 1. ai_provider_registry
create table if not exists ai_provider_registry (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  provider_name varchar(255) not null,
  status varchar(100) not null default 'ACTIVE',
  configuration_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_ai_prov_org on ai_provider_registry(organization_id);
create index if not exists idx_ai_prov_ws on ai_provider_registry(workspace_id);
create index if not exists idx_ai_prov_name on ai_provider_registry(provider_name);
create index if not exists idx_ai_prov_status on ai_provider_registry(status);

-- 2. ai_router_policies
create table if not exists ai_router_policies (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  policy_name varchar(255) not null,
  status varchar(100) not null default 'ACTIVE',
  configuration_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_ai_pol_org on ai_router_policies(organization_id);
create index if not exists idx_ai_pol_ws on ai_router_policies(workspace_id);
create index if not exists idx_ai_pol_name on ai_router_policies(policy_name);
create index if not exists idx_ai_pol_status on ai_router_policies(status);

-- 3. ai_router_requests
create table if not exists ai_router_requests (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  user_id varchar(255) not null,
  provider_name varchar(255) not null,
  request_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_ai_req_org on ai_router_requests(organization_id);
create index if not exists idx_ai_req_ws on ai_router_requests(workspace_id);
create index if not exists idx_ai_req_user on ai_router_requests(user_id);
create index if not exists idx_ai_req_prov on ai_router_requests(provider_name);
create index if not exists idx_ai_req_type on ai_router_requests(request_type);
create index if not exists idx_ai_req_status on ai_router_requests(status);
create index if not exists idx_ai_req_cat on ai_router_requests(created_at);

-- 4. ai_router_audits
create table if not exists ai_router_audits (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  user_id varchar(255) not null,
  provider_name varchar(255) not null,
  request_type varchar(255) not null,
  status varchar(100) not null,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_ai_aud_org on ai_router_audits(organization_id);
create index if not exists idx_ai_aud_ws on ai_router_audits(workspace_id);
create index if not exists idx_ai_aud_user on ai_router_audits(user_id);
create index if not exists idx_ai_aud_prov on ai_router_audits(provider_name);
create index if not exists idx_ai_aud_type on ai_router_audits(request_type);
create index if not exists idx_ai_aud_status on ai_router_audits(status);
create index if not exists idx_ai_aud_cat on ai_router_audits(created_at);

-- ==================== SPRINT 16.4: BETA ACTION EXECUTION FOUNDATION ====================

-- 1. beta_action_requests
create table if not exists beta_action_requests (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  user_id varchar(255) not null,
  action_type varchar(255) not null,
  entity_type varchar(255),
  entity_id varchar(255),
  payload_json jsonb,
  status varchar(100) not null,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_req_org on beta_action_requests(organization_id);
create index if not exists idx_beta_req_ws on beta_action_requests(workspace_id);
create index if not exists idx_beta_req_user on beta_action_requests(user_id);
create index if not exists idx_beta_req_type on beta_action_requests(action_type);
create index if not exists idx_beta_req_status on beta_action_requests(status);
create index if not exists idx_beta_req_cat on beta_action_requests(created_at);

-- 2. beta_action_dispatches
create table if not exists beta_action_dispatches (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  request_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_disp_org on beta_action_dispatches(organization_id);
create index if not exists idx_beta_disp_ws on beta_action_dispatches(workspace_id);
create index if not exists idx_beta_disp_req on beta_action_dispatches(request_id);
create index if not exists idx_beta_disp_status on beta_action_dispatches(status);
create index if not exists idx_beta_disp_cat on beta_action_dispatches(created_at);

-- 3. beta_action_logs
create table if not exists beta_action_logs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  user_id varchar(255) not null,
  action_type varchar(255) not null,
  status varchar(100) not null,
  details_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_log_org on beta_action_logs(organization_id);
create index if not exists idx_beta_log_ws on beta_action_logs(workspace_id);
create index if not exists idx_beta_log_user on beta_action_logs(user_id);
create index if not exists idx_beta_log_type on beta_action_logs(action_type);
create index if not exists idx_beta_log_status on beta_action_logs(status);
create index if not exists idx_beta_log_cat on beta_action_logs(created_at);

-- ==================== SPRINT 16.5: BETA SKILLS FOUNDATION ====================

-- 1. beta_skills
create table if not exists beta_skills (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  skill_name varchar(255) not null,
  category varchar(255) not null,
  status varchar(100) not null default 'ACTIVE',
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_skill_org on beta_skills(organization_id);
create index if not exists idx_beta_skill_ws on beta_skills(workspace_id);
create index if not exists idx_beta_skill_name on beta_skills(skill_name);
create index if not exists idx_beta_skill_cat on beta_skills(category);
create index if not exists idx_beta_skill_status on beta_skills(status);

-- 2. beta_capabilities
create table if not exists beta_capabilities (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  capability_name varchar(255) not null,
  status varchar(100) not null default 'ACTIVE',
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_cap_org on beta_capabilities(organization_id);
create index if not exists idx_beta_cap_ws on beta_capabilities(workspace_id);
create index if not exists idx_beta_cap_name on beta_capabilities(capability_name);
create index if not exists idx_beta_cap_status on beta_capabilities(status);

-- 3. beta_skill_registry
create table if not exists beta_skill_registry (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  skill_id varchar(255) not null,
  module_code varchar(255) not null,
  status varchar(100) not null default 'ACTIVE',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_sreg_org on beta_skill_registry(organization_id);
create index if not exists idx_beta_sreg_ws on beta_skill_registry(workspace_id);
create index if not exists idx_beta_sreg_skill on beta_skill_registry(skill_id);
create index if not exists idx_beta_sreg_mod on beta_skill_registry(module_code);
create index if not exists idx_beta_sreg_status on beta_skill_registry(status);

-- ==================== SPRINT 16.6: BETA OPERATIONAL ORCHESTRATOR ====================

-- 1. beta_operational_intents
create table if not exists beta_operational_intents (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  user_id varchar(255) not null,
  intent_type varchar(255) not null,
  skill varchar(255),
  metadata_json jsonb,
  status varchar(100) not null,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_opintent_org on beta_operational_intents(organization_id);
create index if not exists idx_beta_opintent_ws on beta_operational_intents(workspace_id);
create index if not exists idx_beta_opintent_user on beta_operational_intents(user_id);
create index if not exists idx_beta_opintent_type on beta_operational_intents(intent_type);
create index if not exists idx_beta_opintent_status on beta_operational_intents(status);

-- 2. beta_operational_dispatches
create table if not exists beta_operational_dispatches (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  intent_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_opdisp_org on beta_operational_dispatches(organization_id);
create index if not exists idx_beta_opdisp_ws on beta_operational_dispatches(workspace_id);
create index if not exists idx_beta_opdisp_intent on beta_operational_dispatches(intent_id);
create index if not exists idx_beta_opdisp_status on beta_operational_dispatches(status);

-- 3. beta_operational_results
create table if not exists beta_operational_results (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  intent_id varchar(255) not null,
  status varchar(100) not null,
  details_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_beta_opresult_org on beta_operational_results(organization_id);
create index if not exists idx_beta_opresult_ws on beta_operational_results(workspace_id);
create index if not exists idx_beta_opresult_intent on beta_operational_results(intent_id);
create index if not exists idx_beta_opresult_status on beta_operational_results(status);

-- ==================== SPRINT 17.0: BETA GOV WORKSPACE FOUNDATION ====================

-- 1. government_workspaces
create table if not exists government_workspaces (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_ws_org on government_workspaces(organization_id);
create index if not exists idx_gov_ws_ws on government_workspaces(workspace_id);
create index if not exists idx_gov_ws_status on government_workspaces(status);

-- 2. government_workspace_snapshots
create table if not exists government_workspace_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  snapshot_type varchar(255) not null,
  snapshot_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_snap_org on government_workspace_snapshots(organization_id);
create index if not exists idx_gov_snap_ws on government_workspace_snapshots(workspace_id);
create index if not exists idx_gov_snap_type on government_workspace_snapshots(snapshot_type);
create index if not exists idx_gov_snap_cat on government_workspace_snapshots(created_at);

-- 3. government_workspace_logs
create table if not exists government_workspace_logs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  event_type varchar(255) not null,
  details_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_log_org on government_workspace_logs(organization_id);
create index if not exists idx_gov_log_ws on government_workspace_logs(workspace_id);
create index if not exists idx_gov_log_type on government_workspace_logs(event_type);
create index if not exists idx_gov_log_cat on government_workspace_logs(created_at);

-- ==================== SPRINT 17.1: GOV OBJECTIVES & PROGRAM MANAGEMENT ====================

-- 1. government_objectives
create table if not exists government_objectives (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  name varchar(500) not null,
  description text,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_obj_org on government_objectives(organization_id);
create index if not exists idx_gov_obj_ws on government_objectives(workspace_id);

-- 2. government_programs
create table if not exists government_programs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  objective_id varchar(255) not null,
  name varchar(500) not null,
  description text,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_prog_org on government_programs(organization_id);
create index if not exists idx_gov_prog_ws on government_programs(workspace_id);
create index if not exists idx_gov_prog_obj on government_programs(objective_id);

-- 3. government_projects
create table if not exists government_projects (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  program_id varchar(255) not null,
  name varchar(500) not null,
  description text,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_proj_org on government_projects(organization_id);
create index if not exists idx_gov_proj_ws on government_projects(workspace_id);
create index if not exists idx_gov_proj_prog on government_projects(program_id);

-- 4. government_actions
create table if not exists government_actions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  project_id varchar(255) not null,
  name varchar(500) not null,
  description text,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_act_org on government_actions(organization_id);
create index if not exists idx_gov_act_ws on government_actions(workspace_id);
create index if not exists idx_gov_act_proj on government_actions(project_id);

-- ==================== SPRINT 17.2: GOV INDICATORS & PERFORMANCE MANAGEMENT ====================

-- 1. government_indicators
create table if not exists government_indicators (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  objective_id varchar(255),
  program_id varchar(255),
  project_id varchar(255),
  indicator_name varchar(500) not null,
  description text,
  unit varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_ind_org on government_indicators(organization_id);
create index if not exists idx_gov_ind_ws on government_indicators(workspace_id);
create index if not exists idx_gov_ind_obj on government_indicators(objective_id);
create index if not exists idx_gov_ind_prog on government_indicators(program_id);
create index if not exists idx_gov_ind_proj on government_indicators(project_id);

-- 2. government_goals
create table if not exists government_goals (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  indicator_id varchar(255) not null,
  goal_value double precision not null,
  current_value double precision default 0 not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_goals_org on government_goals(organization_id);
create index if not exists idx_gov_goals_ws on government_goals(workspace_id);
create index if not exists idx_gov_goals_ind on government_goals(indicator_id);

-- 3. government_results
create table if not exists government_results (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  indicator_id varchar(255) not null,
  result_value double precision not null,
  reference_date varchar(255) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_res_org on government_results(organization_id);
create index if not exists idx_gov_res_ws on government_results(workspace_id);
create index if not exists idx_gov_res_ind on government_results(indicator_id);

-- 4. government_performance_snapshots
create table if not exists government_performance_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  snapshot_type varchar(255) not null,
  snapshot_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_perf_snap_org on government_performance_snapshots(organization_id);
create index if not exists idx_gov_perf_snap_ws on government_performance_snapshots(workspace_id);
create index if not exists idx_gov_perf_snap_type on government_performance_snapshots(snapshot_type);

-- ==================== SPRINT 17.3: GOV REPORTING & EXECUTIVE BRIEF FOUNDATION ====================

-- 1. government_reports
create table if not exists government_reports (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  report_type varchar(255) not null,
  title varchar(500) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_reports_org on government_reports(organization_id);
create index if not exists idx_gov_reports_ws on government_reports(workspace_id);

-- 2. government_executive_briefs
create table if not exists government_executive_briefs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  brief_type varchar(255) not null,
  title varchar(500) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_briefs_org on government_executive_briefs(organization_id);
create index if not exists idx_gov_briefs_ws on government_executive_briefs(workspace_id);

-- 3. government_monitoring_snapshots
create table if not exists government_monitoring_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  snapshot_type varchar(255) not null,
  snapshot_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_mon_snapshots_org on government_monitoring_snapshots(organization_id);
create index if not exists idx_gov_mon_snapshots_ws on government_monitoring_snapshots(workspace_id);

-- 4. government_report_logs
create table if not exists government_report_logs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  event_type varchar(255) not null,
  details_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_rep_logs_org on government_report_logs(organization_id);
create index if not exists idx_gov_rep_logs_ws on government_report_logs(workspace_id);


-- ==================== SPRINT 17.4: GOV GOVERNANCE & EXECUTIVE REVIEW FOUNDATION ====================

-- 1. government_governance_reviews
create table if not exists government_governance_reviews (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  review_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_gov_reviews_org on government_governance_reviews(organization_id);
create index if not exists idx_gov_gov_reviews_ws on government_governance_reviews(workspace_id);

-- 2. government_executive_meetings
create table if not exists government_executive_meetings (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  meeting_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_meetings_org on government_executive_meetings(organization_id);
create index if not exists idx_gov_meetings_ws on government_executive_meetings(workspace_id);

-- 3. government_strategic_cycles
create table if not exists government_strategic_cycles (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  cycle_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_cycles_org on government_strategic_cycles(organization_id);
create index if not exists idx_gov_cycles_ws on government_strategic_cycles(workspace_id);

-- 4. government_decisions
create table if not exists government_decisions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  decision_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_decisions_org on government_decisions(organization_id);
create index if not exists idx_gov_decisions_ws on government_decisions(workspace_id);

-- 5. government_monitoring_reviews
create table if not exists government_monitoring_reviews (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  review_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_mon_reviews_org on government_monitoring_reviews(organization_id);
create index if not exists idx_gov_mon_reviews_ws on government_monitoring_reviews(workspace_id);


-- --- SPRINT 18.0: BETA LICITA WORKSPACE FOUNDATION ---

-- 1. procurement_workspaces
create table if not exists procurement_workspaces (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_ws_org on procurement_workspaces(organization_id);
create index if not exists idx_proc_ws_ws on procurement_workspaces(workspace_id);
create index if not exists idx_proc_ws_status on procurement_workspaces(status);

-- 2. procurement_workspace_snapshots
create table if not exists procurement_workspace_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  snapshot_type varchar(255) not null,
  snapshot_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_snap_org on procurement_workspace_snapshots(organization_id);
create index if not exists idx_proc_snap_ws on procurement_workspace_snapshots(workspace_id);
create index if not exists idx_proc_snap_type on procurement_workspace_snapshots(snapshot_type);
create index if not exists idx_proc_snap_cat on procurement_workspace_snapshots(created_at);

-- 3. procurement_workspace_logs
create table if not exists procurement_workspace_logs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  event_type varchar(255) not null,
  details_json jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_log_org on procurement_workspace_logs(organization_id);
create index if not exists idx_proc_log_ws on procurement_workspace_logs(workspace_id);
create index if not exists idx_proc_log_type on procurement_workspace_logs(event_type);
create index if not exists idx_proc_log_cat on procurement_workspace_logs(created_at);


-- --- SPRINT 18.1: PROCUREMENT BID & OPPORTUNITY MANAGEMENT FOUNDATION ---

-- 1. procurement_opportunities
create table if not exists procurement_opportunities (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  title varchar(255) not null,
  description text,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_opp_org on procurement_opportunities(organization_id);
create index if not exists idx_proc_opp_ws on procurement_opportunities(workspace_id);
create index if not exists idx_proc_opp_status on procurement_opportunities(status);

-- 2. procurement_bids
create table if not exists procurement_bids (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  opportunity_id varchar(255) references procurement_opportunities(id) on delete set null,
  title varchar(255) not null,
  description text,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_bids_org on procurement_bids(organization_id);
create index if not exists idx_proc_bids_ws on procurement_bids(workspace_id);
create index if not exists idx_proc_bids_opp on procurement_bids(opportunity_id);
create index if not exists idx_proc_bids_status on procurement_bids(status);

-- 3. procurement_participations
create table if not exists procurement_participations (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  bid_id varchar(255) references procurement_bids(id) on delete cascade not null,
  supplier_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_part_org on procurement_participations(organization_id);
create index if not exists idx_proc_part_ws on procurement_participations(workspace_id);
create index if not exists idx_proc_part_bid on procurement_participations(bid_id);
create index if not exists idx_proc_part_status on procurement_participations(status);

-- 4. procurement_lots
create table if not exists procurement_lots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  bid_id varchar(255) references procurement_bids(id) on delete cascade not null,
  title varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_lots_org on procurement_lots(organization_id);
create index if not exists idx_proc_lots_ws on procurement_lots(workspace_id);
create index if not exists idx_proc_lots_bid on procurement_lots(bid_id);
create index if not exists idx_proc_lots_status on procurement_lots(status);

-- 5. procurement_proposals
create table if not exists procurement_proposals (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  bid_id varchar(255) references procurement_bids(id) on delete cascade not null,
  lot_id varchar(255) references procurement_lots(id) on delete set null,
  supplier_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_prop_org on procurement_proposals(organization_id);
create index if not exists idx_proc_prop_ws on procurement_proposals(workspace_id);
create index if not exists idx_proc_prop_bid on procurement_proposals(bid_id);
create index if not exists idx_proc_prop_lot on procurement_proposals(lot_id);
create index if not exists idx_proc_prop_status on procurement_proposals(status);


-- --- SPRINT 18.2: SUPPLIER & PROCUREMENT DOCUMENT MANAGEMENT FOUNDATION ---

-- 1. procurement_suppliers
create table if not exists procurement_suppliers (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  name varchar(255) not null,
  document_number varchar(100),
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_sup_org on procurement_suppliers(organization_id);
create index if not exists idx_proc_sup_ws on procurement_suppliers(workspace_id);
create index if not exists idx_proc_sup_status on procurement_suppliers(status);

-- 2. procurement_supplier_documents
create table if not exists procurement_supplier_documents (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  supplier_id varchar(255) references procurement_suppliers(id) on delete cascade not null,
  document_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_sup_doc_org on procurement_supplier_documents(organization_id);
create index if not exists idx_proc_sup_doc_ws on procurement_supplier_documents(workspace_id);
create index if not exists idx_proc_sup_doc_sup on procurement_supplier_documents(supplier_id);
create index if not exists idx_proc_sup_doc_status on procurement_supplier_documents(status);

-- 3. procurement_supplier_certificates
create table if not exists procurement_supplier_certificates (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  supplier_id varchar(255) references procurement_suppliers(id) on delete cascade not null,
  certificate_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_sup_cert_org on procurement_supplier_certificates(organization_id);
create index if not exists idx_proc_sup_cert_ws on procurement_supplier_certificates(workspace_id);
create index if not exists idx_proc_sup_cert_sup on procurement_supplier_certificates(supplier_id);
create index if not exists idx_proc_sup_cert_status on procurement_supplier_certificates(status);

-- 4. procurement_supplier_qualifications
create table if not exists procurement_supplier_qualifications (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  supplier_id varchar(255) references procurement_suppliers(id) on delete cascade not null,
  qualification_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_sup_qual_org on procurement_supplier_qualifications(organization_id);
create index if not exists idx_proc_sup_qual_ws on procurement_supplier_qualifications(workspace_id);
create index if not exists idx_proc_sup_qual_sup on procurement_supplier_qualifications(supplier_id);
create index if not exists idx_proc_sup_qual_status on procurement_supplier_qualifications(status);

-- 5. procurement_supplier_registries
create table if not exists procurement_supplier_registries (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  supplier_id varchar(255) references procurement_suppliers(id) on delete cascade not null,
  registry_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_sup_reg_org on procurement_supplier_registries(organization_id);
create index if not exists idx_proc_sup_reg_ws on procurement_supplier_registries(workspace_id);
create index if not exists idx_proc_sup_reg_sup on procurement_supplier_registries(supplier_id);
create index if not exists idx_proc_sup_reg_status on procurement_supplier_registries(status);


-- --- SPRINT 18.3: PROCUREMENT CONTRACT & CONTRACT EXECUTION FOUNDATION ---

-- 1. procurement_contracts
create table if not exists procurement_contracts (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  supplier_id varchar(255) references procurement_suppliers(id) on delete cascade not null,
  bid_id varchar(255) not null,
  status varchar(100) not null,
  title varchar(255),
  number varchar(100),
  value numeric,
  supplier_name varchar(255),
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_ctr_org on procurement_contracts(organization_id);
create index if not exists idx_proc_ctr_ws on procurement_contracts(workspace_id);
create index if not exists idx_proc_ctr_sup on procurement_contracts(supplier_id);
create index if not exists idx_proc_ctr_bid on procurement_contracts(bid_id);
create index if not exists idx_proc_ctr_status on procurement_contracts(status);

-- 2. procurement_contract_executions
create table if not exists procurement_contract_executions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  contract_id varchar(255) references procurement_contracts(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_exe_org on procurement_contract_executions(organization_id);
create index if not exists idx_proc_exe_ws on procurement_contract_executions(workspace_id);
create index if not exists idx_proc_exe_ctr on procurement_contract_executions(contract_id);
create index if not exists idx_proc_exe_status on procurement_contract_executions(status);

-- 3. procurement_inspections
create table if not exists procurement_inspections (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  contract_id varchar(255) references procurement_contracts(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_insp_org on procurement_inspections(organization_id);
create index if not exists idx_proc_insp_ws on procurement_inspections(workspace_id);
create index if not exists idx_proc_insp_ctr on procurement_inspections(contract_id);
create index if not exists idx_proc_insp_status on procurement_inspections(status);

-- 4. procurement_deliveries
create table if not exists procurement_deliveries (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  contract_id varchar(255) references procurement_contracts(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_del_org on procurement_deliveries(organization_id);
create index if not exists idx_proc_del_ws on procurement_deliveries(workspace_id);
create index if not exists idx_proc_del_ctr on procurement_deliveries(contract_id);
create index if not exists idx_proc_del_status on procurement_deliveries(status);

-- 5. procurement_measurements
create table if not exists procurement_measurements (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  contract_id varchar(255) references procurement_contracts(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_meas_org on procurement_measurements(organization_id);
create index if not exists idx_proc_meas_ws on procurement_measurements(workspace_id);
create index if not exists idx_proc_meas_ctr on procurement_measurements(contract_id);
create index if not exists idx_proc_meas_status on procurement_measurements(status);

-- 6. procurement_contract_issues
create table if not exists procurement_contract_issues (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  contract_id varchar(255) references procurement_contracts(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_iss_org on procurement_contract_issues(organization_id);
create index if not exists idx_proc_iss_ws on procurement_contract_issues(workspace_id);
create index if not exists idx_proc_iss_ctr on procurement_contract_issues(contract_id);
create index if not exists idx_proc_iss_status on procurement_contract_issues(status);


-- --- SPRINT 18.4: PROCUREMENT AUDIT, COMPLIANCE & ARP MANAGEMENT FOUNDATION ---

-- 1. procurement_arps
create table if not exists procurement_arps (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_arp_org on procurement_arps(organization_id);
create index if not exists idx_proc_arp_ws on procurement_arps(workspace_id);
create index if not exists idx_proc_arp_status on procurement_arps(status);

-- 2. procurement_arp_items
create table if not exists procurement_arp_items (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  arp_id varchar(255) references procurement_arps(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_arp_it_org on procurement_arp_items(organization_id);
create index if not exists idx_proc_arp_it_ws on procurement_arp_items(workspace_id);
create index if not exists idx_proc_arp_it_arp on procurement_arp_items(arp_id);
create index if not exists idx_proc_arp_it_status on procurement_arp_items(status);

-- 3. procurement_arp_consumptions
create table if not exists procurement_arp_consumptions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  arp_item_id varchar(255) references procurement_arp_items(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_arp_co_org on procurement_arp_consumptions(organization_id);
create index if not exists idx_proc_arp_co_ws on procurement_arp_consumptions(workspace_id);
create index if not exists idx_proc_arp_co_item on procurement_arp_consumptions(arp_item_id);
create index if not exists idx_proc_arp_co_status on procurement_arp_consumptions(status);

-- 4. procurement_arp_participants
create table if not exists procurement_arp_participants (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  arp_id varchar(255) references procurement_arps(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_arp_pa_org on procurement_arp_participants(organization_id);
create index if not exists idx_proc_arp_pa_ws on procurement_arp_participants(workspace_id);
create index if not exists idx_proc_arp_pa_arp on procurement_arp_participants(arp_id);
create index if not exists idx_proc_arp_pa_status on procurement_arp_participants(status);

-- 5. procurement_arp_caronas
create table if not exists procurement_arp_caronas (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  arp_id varchar(255) references procurement_arps(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_arp_ca_org on procurement_arp_caronas(organization_id);
create index if not exists idx_proc_arp_ca_ws on procurement_arp_caronas(workspace_id);
create index if not exists idx_proc_arp_ca_arp on procurement_arp_caronas(arp_id);
create index if not exists idx_proc_arp_ca_status on procurement_arp_caronas(status);

-- 6. procurement_audit_events
create table if not exists procurement_audit_events (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  event_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_aud_org on procurement_audit_events(organization_id);
create index if not exists idx_proc_aud_ws on procurement_audit_events(workspace_id);
create index if not exists idx_proc_aud_status on procurement_audit_events(status);

-- 7. procurement_compliance_events
create table if not exists procurement_compliance_events (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  event_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_com_org on procurement_compliance_events(organization_id);
create index if not exists idx_proc_com_ws on procurement_compliance_events(workspace_id);
create index if not exists idx_proc_com_status on procurement_compliance_events(status);

-- =========================================================================
-- SPRINT 18.5 — PROCUREMENT REPORTING & EXECUTIVE BRIEF tables
-- =========================================================================

-- 1. procurement_reports
create table if not exists procurement_reports (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  report_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_rep_org on procurement_reports(organization_id);
create index if not exists idx_proc_rep_ws on procurement_reports(workspace_id);
create index if not exists idx_proc_rep_type on procurement_reports(report_type);
create index if not exists idx_proc_rep_status on procurement_reports(status);

-- 2. procurement_executive_briefs
create table if not exists procurement_executive_briefs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  brief_type varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_brief_org on procurement_executive_briefs(organization_id);
create index if not exists idx_proc_brief_ws on procurement_executive_briefs(workspace_id);
create index if not exists idx_proc_brief_type on procurement_executive_briefs(brief_type);
create index if not exists idx_proc_brief_status on procurement_executive_briefs(status);

-- 3. procurement_monitoring_snapshots
create table if not exists procurement_monitoring_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  snapshot_data jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_msnap_org on procurement_monitoring_snapshots(organization_id);
create index if not exists idx_proc_msnap_ws on procurement_monitoring_snapshots(workspace_id);

-- 4. procurement_report_logs
create table if not exists procurement_report_logs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  report_id varchar(255) references procurement_reports(id) on delete cascade not null,
  log_level varchar(50) not null,
  message text not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_proc_replog_org on procurement_report_logs(organization_id);
create index if not exists idx_proc_replog_ws on procurement_report_logs(workspace_id);
create index if not exists idx_proc_replog_rep on procurement_report_logs(report_id);

-- =========================================================================
-- SPRINT 19.0 — GOVERNMENT AMENDMENTS tables
-- =========================================================================

-- 1. government_parliamentarians
create table if not exists government_parliamentarians (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_parl_org on government_parliamentarians(organization_id);
create index if not exists idx_gov_parl_ws on government_parliamentarians(workspace_id);
create index if not exists idx_gov_parl_status on government_parliamentarians(status);

-- 2. government_amendments
create table if not exists government_amendments (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  parliamentarian_id varchar(255) references government_parliamentarians(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_am_org on government_amendments(organization_id);
create index if not exists idx_gov_am_ws on government_amendments(workspace_id);
create index if not exists idx_gov_am_parl on government_amendments(parliamentarian_id);
create index if not exists idx_gov_am_status on government_amendments(status);

-- 3. government_amendment_beneficiaries
create table if not exists government_amendment_beneficiaries (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_ben_org on government_amendment_beneficiaries(organization_id);
create index if not exists idx_gov_ben_ws on government_amendment_beneficiaries(workspace_id);
create index if not exists idx_gov_ben_am on government_amendment_beneficiaries(amendment_id);
create index if not exists idx_gov_ben_status on government_amendment_beneficiaries(status);

-- 4. government_amendment_destinations
create table if not exists government_amendment_destinations (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_dest_org on government_amendment_destinations(organization_id);
create index if not exists idx_gov_dest_ws on government_amendment_destinations(workspace_id);
create index if not exists idx_gov_dest_am on government_amendment_destinations(amendment_id);
create index if not exists idx_gov_dest_status on government_amendment_destinations(status);

-- 5. government_amendment_executions
create table if not exists government_amendment_executions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_exec_org on government_amendment_executions(organization_id);
create index if not exists idx_gov_exec_ws on government_amendment_executions(workspace_id);
create index if not exists idx_gov_exec_am on government_amendment_executions(amendment_id);
create index if not exists idx_gov_exec_status on government_amendment_executions(status);

-- =========================================================================
-- SPRINT 19.1 — GOVERNMENT AMENDMENT MONITORING TABLES
-- =========================================================================

-- 1. government_amendment_milestones
create table if not exists government_amendment_milestones (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null, -- DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_milestone_org on government_amendment_milestones(organization_id);
create index if not exists idx_gov_milestone_ws on government_amendment_milestones(workspace_id);
create index if not exists idx_gov_milestone_am on government_amendment_milestones(amendment_id);
create index if not exists idx_gov_milestone_status on government_amendment_milestones(status);

-- 2. government_amendment_monitorings
create table if not exists government_amendment_monitorings (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null, -- DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_monitoring_org on government_amendment_monitorings(organization_id);
create index if not exists idx_gov_monitoring_ws on government_amendment_monitorings(workspace_id);
create index if not exists idx_gov_monitoring_am on government_amendment_monitorings(amendment_id);
create index if not exists idx_gov_monitoring_status on government_amendment_monitorings(status);

-- 3. government_amendment_evidences
create table if not exists government_amendment_evidences (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null, -- DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_evidence_org on government_amendment_evidences(organization_id);
create index if not exists idx_gov_evidence_ws on government_amendment_evidences(workspace_id);
create index if not exists idx_gov_evidence_am on government_amendment_evidences(amendment_id);
create index if not exists idx_gov_evidence_status on government_amendment_evidences(status);

-- 4. government_amendment_accountabilities
create table if not exists government_amendment_accountabilities (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null, -- DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_account_org on government_amendment_accountabilities(organization_id);
create index if not exists idx_gov_account_ws on government_amendment_accountabilities(workspace_id);
create index if not exists idx_gov_account_am on government_amendment_accountabilities(amendment_id);
create index if not exists idx_gov_account_status on government_amendment_accountabilities(status);

-- 5. government_amendment_issues
create table if not exists government_amendment_issues (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  amendment_id varchar(255) references government_amendments(id) on delete cascade not null,
  status varchar(100) not null, -- DRAFT, PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_issue_org on government_amendment_issues(organization_id);
create index if not exists idx_gov_issue_ws on government_amendment_issues(workspace_id);
create index if not exists idx_gov_issue_am on government_amendment_issues(amendment_id);
create index if not exists idx_gov_issue_status on government_amendment_issues(status);

-- ==================== SPRINT 19.2: GOVERNMENT AMENDMENT REPORTING ====================

create table if not exists government_amendment_reports (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_report_org on government_amendment_reports(organization_id);
create index if not exists idx_gov_report_ws on government_amendment_reports(workspace_id);
create index if not exists idx_gov_report_status on government_amendment_reports(status);
create index if not exists idx_gov_report_created on government_amendment_reports(created_at);

create table if not exists government_amendment_executive_briefs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_execbrief_org on government_amendment_executive_briefs(organization_id);
create index if not exists idx_gov_execbrief_ws on government_amendment_executive_briefs(workspace_id);
create index if not exists idx_gov_execbrief_status on government_amendment_executive_briefs(status);
create index if not exists idx_gov_execbrief_created on government_amendment_executive_briefs(created_at);

create table if not exists government_amendment_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_snapshot_org on government_amendment_snapshots(organization_id);
create index if not exists idx_gov_snapshot_ws on government_amendment_snapshots(workspace_id);
create index if not exists idx_gov_snapshot_status on government_amendment_snapshots(status);
create index if not exists idx_gov_snapshot_created on government_amendment_snapshots(created_at);

create table if not exists government_amendment_reviews (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_review_org on government_amendment_reviews(organization_id);
create index if not exists idx_gov_review_ws on government_amendment_reviews(workspace_id);
create index if not exists idx_gov_review_status on government_amendment_reviews(status);
create index if not exists idx_gov_review_created on government_amendment_reviews(created_at);

create table if not exists government_amendment_cycles (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_cycle_org on government_amendment_cycles(organization_id);
create index if not exists idx_gov_cycle_ws on government_amendment_cycles(workspace_id);
create index if not exists idx_gov_cycle_status on government_amendment_cycles(status);
create index if not exists idx_gov_cycle_created on government_amendment_cycles(created_at);

-- ==================== SPRINT 20.0: GOVERNMENT HEALTH INTELLIGENCE ====================

create table if not exists government_health_units (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_health_unit_org on government_health_units(organization_id);
create index if not exists idx_gov_health_unit_ws on government_health_units(workspace_id);
create index if not exists idx_gov_health_unit_status on government_health_units(status);

create table if not exists government_health_teams (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  unit_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_health_team_org on government_health_teams(organization_id);
create index if not exists idx_gov_health_team_ws on government_health_teams(workspace_id);
create index if not exists idx_gov_health_team_unit on government_health_teams(unit_id);
create index if not exists idx_gov_health_team_status on government_health_teams(status);

create table if not exists government_health_programs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_health_prog_org on government_health_programs(organization_id);
create index if not exists idx_gov_health_prog_ws on government_health_programs(workspace_id);
create index if not exists idx_gov_health_prog_status on government_health_programs(status);

create table if not exists government_health_indicators (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_health_ind_org on government_health_indicators(organization_id);
create index if not exists idx_gov_health_ind_ws on government_health_indicators(workspace_id);
create index if not exists idx_gov_health_ind_status on government_health_indicators(status);

create table if not exists government_health_coverages (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_health_cov_org on government_health_coverages(organization_id);
create index if not exists idx_gov_health_cov_ws on government_health_coverages(workspace_id);
create index if not exists idx_gov_health_cov_status on government_health_coverages(status);

create table if not exists government_health_productions (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) references organizations(id) on delete cascade not null,
  workspace_id varchar(255) not null,
  status varchar(100) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create index if not exists idx_gov_health_prod_org on government_health_productions(organization_id);
create index if not exists idx_gov_health_prod_ws on government_health_productions(workspace_id);
create index if not exists idx_gov_health_prod_status on government_health_productions(status);

-- ============================================================================
-- SPRINT 20.1 - HEALTH PERFORMANCE & MONITORING FOUNDATION
-- ============================================================================

create table if not exists government_health_goals (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_health_results (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_health_monitorings (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_health_evidences (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_health_issues (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_health_snapshots (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- SPRINT 21.0 - EDUCATION INTELLIGENCE FOUNDATION
-- ============================================================================

create table if not exists government_education_units (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_teams (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  unit_id varchar(255),
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_programs (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_indicators (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_coverages (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_productions (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SPRINT 21.1 - EDUCATION PERFORMANCE & MONITORING FOUNDATION
-- ============================================================================

create table if not exists government_education_goals (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_results (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_monitorings (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_evidences (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_issues (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists government_education_snapshots (
  id varchar(255) primary key default gen_random_uuid()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(100) default 'NO_DATA',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table government_education_goals enable row level security;
alter table government_education_results enable row level security;
alter table government_education_monitorings enable row level security;
alter table government_education_evidences enable row level security;
alter table government_education_issues enable row level security;
alter table government_education_snapshots enable row level security;

create policy government_education_goals_policy on government_education_goals for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_education_results_policy on government_education_results for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_education_monitorings_policy on government_education_monitorings for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_education_evidences_policy on government_education_evidences for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_education_issues_policy on government_education_issues for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_education_snapshots_policy on government_education_snapshots for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

-- Indexes
create index if not exists idx_edu_goals_org_work on government_education_goals(organization_id, workspace_id);
create index if not exists idx_edu_results_org_work on government_education_results(organization_id, workspace_id);
create index if not exists idx_edu_monitorings_org_work on government_education_monitorings(organization_id, workspace_id);
create index if not exists idx_edu_evidences_org_work on government_education_evidences(organization_id, workspace_id);
create index if not exists idx_edu_issues_org_work on government_education_issues(organization_id, workspace_id);
create index if not exists idx_edu_snapshots_org_work on government_education_snapshots(organization_id, workspace_id);

-- --- SPRINT 22.2: TRANSPARENCY ANALYTICS ---
create table if not exists government_transparency_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_transparency_kpis (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_transparency_compliance (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_transparency_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_transparency_monitorings (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table government_transparency_metrics enable row level security;
alter table government_transparency_kpis enable row level security;
alter table government_transparency_compliance enable row level security;
alter table government_transparency_audits enable row level security;
alter table government_transparency_monitorings enable row level security;

create policy government_transparency_metrics_policy on government_transparency_metrics for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_kpis_policy on government_transparency_kpis for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_compliance_policy on government_transparency_compliance for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_audits_policy on government_transparency_audits for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_transparency_monitorings_policy on government_transparency_monitorings for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_gov_trans_metr_org on government_transparency_metrics(organization_id, workspace_id);
create index if not exists idx_gov_trans_kpis_org on government_transparency_kpis(organization_id, workspace_id);
create index if not exists idx_gov_trans_compl_org on government_transparency_compliance(organization_id, workspace_id);
create index if not exists idx_gov_trans_audits_org on government_transparency_audits(organization_id, workspace_id);
create index if not exists idx_gov_trans_monit_org on government_transparency_monitorings(organization_id, workspace_id);

-- --- SPRINT 22.3: PUBLIC TRANSPARENCY PORTAL CONSOLIDATION FOUNDATION ---
create table if not exists government_public_portals (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_public_catalogs (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_public_datasets (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_public_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_public_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_public_access_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table government_public_portals enable row level security;
alter table government_public_catalogs enable row level security;
alter table government_public_datasets enable row level security;
alter table government_public_publications enable row level security;
alter table government_public_queries enable row level security;
alter table government_public_access_logs enable row level security;

create policy government_public_portals_policy on government_public_portals for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_public_catalogs_policy on government_public_catalogs for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_public_datasets_policy on government_public_datasets for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_public_publications_policy on government_public_publications for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_public_queries_policy on government_public_queries for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_public_access_logs_policy on government_public_access_logs for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_gov_pub_port_org on government_public_portals(organization_id, workspace_id);
create index if not exists idx_gov_pub_cat_org on government_public_catalogs(organization_id, workspace_id);
create index if not exists idx_gov_pub_data_org on government_public_datasets(organization_id, workspace_id);
create index if not exists idx_gov_pub_publ_org on government_public_publications(organization_id, workspace_id);
create index if not exists idx_gov_pub_quer_org on government_public_queries(organization_id, workspace_id);
create index if not exists idx_gov_pub_acc_org on government_public_access_logs(organization_id, workspace_id);

-- --- SPRINT 23.0: PREFEITURA ZERO PAPEL FOUNDATION ---
create table if not exists government_protocols (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_processes (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_document_records (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_routings (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_process_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_process_history (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table government_protocols enable row level security;
alter table government_processes enable row level security;
alter table government_document_records enable row level security;
alter table government_dispatches enable row level security;
alter table government_routings enable row level security;
alter table government_process_steps enable row level security;
alter table government_process_history enable row level security;

create policy government_protocols_policy on government_protocols for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_processes_policy on government_processes for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_document_records_policy on government_document_records for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_dispatches_policy on government_dispatches for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_routings_policy on government_routings for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_process_steps_policy on government_process_steps for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_process_history_policy on government_process_history for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_gov_protocols_org on government_protocols(organization_id, workspace_id);
create index if not exists idx_gov_processes_org on government_processes(organization_id, workspace_id);
create index if not exists idx_gov_document_records_org on government_document_records(organization_id, workspace_id);
create index if not exists idx_gov_dispatches_org on government_dispatches(organization_id, workspace_id);
create index if not exists idx_gov_routings_org on government_routings(organization_id, workspace_id);
create index if not exists idx_gov_process_steps_org on government_process_steps(organization_id, workspace_id);
create index if not exists idx_gov_process_history_org on government_process_history(organization_id, workspace_id);


-- --- SPRINT 23.1: PROTOCOL & PROCESS MANAGEMENT FOUNDATION ---
create table if not exists government_departments (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_protocol_queues (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_process_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_process_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_process_responsibles (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_process_sectors (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table government_departments enable row level security;
alter table government_protocol_queues enable row level security;
alter table government_process_assignments enable row level security;
alter table government_process_movements enable row level security;
alter table government_process_responsibles enable row level security;
alter table government_process_sectors enable row level security;

create policy government_departments_policy on government_departments for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_protocol_queues_policy on government_protocol_queues for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_process_assignments_policy on government_process_assignments for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_process_movements_policy on government_process_movements for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_process_responsibles_policy on government_process_responsibles for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_process_sectors_policy on government_process_sectors for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_gov_departments_org on government_departments(organization_id, workspace_id);
create index if not exists idx_gov_protocol_queues_org on government_protocol_queues(organization_id, workspace_id);
create index if not exists idx_gov_process_assignments_org on government_process_assignments(organization_id, workspace_id);
create index if not exists idx_gov_process_movements_org on government_process_movements(organization_id, workspace_id);
create index if not exists idx_gov_process_responsibles_org on government_process_responsibles(organization_id, workspace_id);
create index if not exists idx_gov_process_sectors_org on government_process_sectors(organization_id, workspace_id);


-- --- SPRINT 23.2: WORKFLOW & ROUTING FOUNDATION ---
create table if not exists government_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_workflow_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_workflow_queues (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_workflow_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_workflow_routes (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table government_workflows enable row level security;
alter table government_workflow_stages enable row level security;
alter table government_workflow_transitions enable row level security;
alter table government_workflow_queues enable row level security;
alter table government_workflow_executions enable row level security;
alter table government_workflow_routes enable row level security;

create policy government_workflows_policy on government_workflows for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_workflow_stages_policy on government_workflow_stages for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_workflow_transitions_policy on government_workflow_transitions for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_workflow_queues_policy on government_workflow_queues for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_workflow_executions_policy on government_workflow_executions for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_workflow_routes_policy on government_workflow_routes for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_gov_workflows_org on government_workflows(organization_id, workspace_id);
create index if not exists idx_gov_workflow_stages_org on government_workflow_stages(organization_id, workspace_id);
create index if not exists idx_gov_workflow_transitions_org on government_workflow_transitions(organization_id, workspace_id);
create index if not exists idx_gov_workflow_queues_org on government_workflow_queues(organization_id, workspace_id);
create index if not exists idx_gov_workflow_executions_org on government_workflow_executions(organization_id, workspace_id);
create index if not exists idx_gov_workflow_routes_org on government_workflow_routes(organization_id, workspace_id);


-- --- SPRINT 23.3: DOCUMENT LIFECYCLE FOUNDATION ---
create table if not exists government_document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_document_classifications (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_document_retentions (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_document_archives (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_document_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_document_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table government_document_versions enable row level security;
alter table government_document_classifications enable row level security;
alter table government_document_retentions enable row level security;
alter table government_document_archives enable row level security;
alter table government_document_movements enable row level security;
alter table government_document_audits enable row level security;

create policy government_document_versions_policy on government_document_versions for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_document_classifications_policy on government_document_classifications for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_document_retentions_policy on government_document_retentions for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_document_archives_policy on government_document_archives for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_document_movements_policy on government_document_movements for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_document_audits_policy on government_document_audits for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_gov_document_versions_org on government_document_versions(organization_id, workspace_id);
create index if not exists idx_gov_document_classifications_org on government_document_classifications(organization_id, workspace_id);
create index if not exists idx_gov_document_retentions_org on government_document_retentions(organization_id, workspace_id);
create index if not exists idx_gov_document_archives_org on government_document_archives(organization_id, workspace_id);
create index if not exists idx_gov_document_movements_org on government_document_movements(organization_id, workspace_id);
create index if not exists idx_gov_document_audits_org on government_document_audits(organization_id, workspace_id);


-- --- SPRINT 23.4: ADMINISTRATIVE GOVERNANCE FOUNDATION ---
create table if not exists government_administrative_indicators (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_administrative_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_administrative_compliances (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_administrative_responsibilities (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_administrative_monitorings (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists government_administrative_occurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id varchar(255) not null,
  workspace_id varchar(255) not null,
  status varchar(255) not null,
  metadata_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table government_administrative_indicators enable row level security;
alter table government_administrative_audits enable row level security;
alter table government_administrative_compliances enable row level security;
alter table government_administrative_responsibilities enable row level security;
alter table government_administrative_monitorings enable row level security;
alter table government_administrative_occurrences enable row level security;

create policy government_administrative_indicators_policy on government_administrative_indicators for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_administrative_audits_policy on government_administrative_audits for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_administrative_compliances_policy on government_administrative_compliances for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_administrative_responsibilities_policy on government_administrative_responsibilities for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_administrative_monitorings_policy on government_administrative_monitorings for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create policy government_administrative_occurrences_policy on government_administrative_occurrences for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());

create index if not exists idx_gov_administrative_indicators_org on government_administrative_indicators(organization_id, workspace_id);
create index if not exists idx_gov_administrative_audits_org on government_administrative_audits(organization_id, workspace_id);
create index if not exists idx_gov_administrative_compliances_org on government_administrative_compliances(organization_id, workspace_id);
create index if not exists idx_gov_administrative_responsibilities_org on government_administrative_responsibilities(organization_id, workspace_id);
create index if not exists idx_gov_administrative_monitorings_org on government_administrative_monitorings(organization_id, workspace_id);
create index if not exists idx_gov_administrative_occurrences_org on government_administrative_occurrences(organization_id, workspace_id);-- HOTFIX 24.1-A — GLOBAL MULTI-TENANT HARDENING MIGRATIONS
-- Adding workspace_id to traditional systems with a safe default value to avoid data issues
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE knowledge_relations ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE electoral_campaigns ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE electoral_territories ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS workspace_id varchar(255) DEFAULT 'default-workspace' NOT null;

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_org_id_hardened ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id_hardened ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_workspace_hardened ON projects(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_status_hardened ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at_hardened ON projects(created_at);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org_id_hardened ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id_hardened ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_workspace_hardened ON tasks(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_hardened ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at_hardened ON tasks(created_at);

-- Indexes for decisions
CREATE INDEX IF NOT EXISTS idx_decisions_org_id_hardened ON decisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_decisions_workspace_id_hardened ON decisions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_decisions_org_workspace_hardened ON decisions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at_hardened ON decisions(created_at);

-- Indexes for memories
CREATE INDEX IF NOT EXISTS idx_memories_org_id_hardened ON memories(organization_id);
CREATE INDEX IF NOT EXISTS idx_memories_workspace_id_hardened ON memories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_memories_org_workspace_hardened ON memories(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at_hardened ON memories(created_at);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_org_id_hardened ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id_hardened ON messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_workspace_hardened ON messages(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at_hardened ON messages(created_at);

-- Indexes for knowledge_nodes
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_org_id_hardened ON knowledge_nodes(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_workspace_id_hardened ON knowledge_nodes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_org_workspace_hardened ON knowledge_nodes(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_created_at_hardened ON knowledge_nodes(created_at);

-- Indexes for knowledge_relations
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_org_id_hardened ON knowledge_relations(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_workspace_id_hardened ON knowledge_relations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_org_workspace_hardened ON knowledge_relations(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_created_at_hardened ON knowledge_relations(created_at);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_org_id_hardened ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id_hardened ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_workspace_hardened ON documents(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_status_hardened ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at_hardened ON documents(created_at);

-- Indexes for document_chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_org_id_hardened ON document_chunks(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_workspace_id_hardened ON document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_org_workspace_hardened ON document_chunks(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at_hardened ON document_chunks(created_at);

-- Indexes for electoral_campaigns
CREATE INDEX IF NOT EXISTS idx_electoral_campaigns_org_id_hardened ON electoral_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_electoral_campaigns_workspace_id_hardened ON electoral_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_electoral_campaigns_org_workspace_hardened ON electoral_campaigns(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_electoral_campaigns_status_hardened ON electoral_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_electoral_campaigns_created_at_hardened ON electoral_campaigns(created_at);

-- Indexes for electoral_territories
CREATE INDEX IF NOT EXISTS idx_electoral_territories_org_id_hardened ON electoral_territories(organization_id);
CREATE INDEX IF NOT EXISTS idx_electoral_territories_workspace_id_hardened ON electoral_territories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_electoral_territories_org_workspace_hardened ON electoral_territories(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_electoral_territories_created_at_hardened ON electoral_territories(created_at);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_org_id_hardened ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id_hardened ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_workspace_hardened ON contacts(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status_hardened ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at_hardened ON contacts(created_at);

-- Indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_id_hardened ON calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id_hardened ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_workspace_hardened ON calendar_events(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status_hardened ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_at_hardened ON calendar_events(created_at);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_activities_org_id_hardened ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_workspace_id_hardened ON activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_workspace_hardened ON activities(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_status_hardened ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_created_at_hardened ON activities(created_at);

-- Indexes for attachments
CREATE INDEX IF NOT EXISTS idx_attachments_org_id_hardened ON attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_attachments_workspace_id_hardened ON attachments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attachments_org_workspace_hardened ON attachments(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at_hardened ON attachments(created_at);

-- Indexes for workflow_instances
CREATE INDEX IF NOT EXISTS idx_workflow_instances_org_id_hardened ON workflow_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workspace_id_hardened ON workflow_instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_org_workspace_hardened ON workflow_instances(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status_hardened ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_created_at_hardened ON workflow_instances(created_at);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_org_id_hardened ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id_hardened ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_workspace_hardened ON notifications(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_hardened ON notifications(created_at);

-- Reinforcing RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE electoral_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE electoral_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Creating select & write policies for all of them ensuring isolation by organization_id
-- We drop existing policies if they exist first, then recreate them cleanly.
DROP POLICY IF EXISTS projects_policy ON projects;
CREATE POLICY projects_policy ON projects FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS tasks_policy ON tasks;
CREATE POLICY tasks_policy ON tasks FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS decisions_policy ON decisions;
CREATE POLICY decisions_policy ON decisions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS memories_policy ON memories;
CREATE POLICY memories_policy ON memories FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS messages_policy ON messages;
CREATE POLICY messages_policy ON messages FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS knowledge_nodes_policy ON knowledge_nodes;
CREATE POLICY knowledge_nodes_policy ON knowledge_nodes FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS knowledge_relations_policy ON knowledge_relations;
CREATE POLICY knowledge_relations_policy ON knowledge_relations FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS documents_policy ON documents;
CREATE POLICY documents_policy ON documents FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS document_chunks_policy ON document_chunks;
CREATE POLICY document_chunks_policy ON document_chunks FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS electoral_campaigns_policy ON electoral_campaigns;
CREATE POLICY electoral_campaigns_policy ON electoral_campaigns FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS electoral_territories_policy ON electoral_territories;
CREATE POLICY electoral_territories_policy ON electoral_territories FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS contacts_policy ON contacts;
CREATE POLICY contacts_policy ON contacts FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS calendar_events_policy ON calendar_events;
CREATE POLICY calendar_events_policy ON calendar_events FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS activities_policy ON activities;
CREATE POLICY activities_policy ON activities FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS attachments_policy ON attachments;
CREATE POLICY attachments_policy ON attachments FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS workflow_instances_policy ON workflow_instances;
CREATE POLICY workflow_instances_policy ON workflow_instances FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS notifications_policy ON notifications;
CREATE POLICY notifications_policy ON notifications FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- =========================================================================
-- HOTFIX 24.2 — SCHEMAS & RLS INTENSIFICATION
-- =========================================================================

-- First, enable Row Level Security on ALL Sprint 15.x to 23.x tables that had gap
ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_job_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_activity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_coordinator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_territory_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_territory_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_coordinator_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contact_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contact_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contact_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_event_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_event_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_router_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_router_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_router_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_action_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_skill_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_operational_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_operational_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_operational_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_workspace_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_workspace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_executive_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_monitoring_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_governance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_executive_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_strategic_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_monitoring_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_workspace_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_workspace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_supplier_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_supplier_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_supplier_registries ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_contract_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_contract_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_arps ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_arp_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_arp_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_arp_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_arp_caronas ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_executive_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_monitoring_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_parliamentarians ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_monitorings ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_accountabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_executive_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_amendment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_coverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_monitorings ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_education_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_education_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_education_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_education_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_education_coverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_education_productions ENABLE ROW LEVEL SECURITY;

-- Creating select & write policies ensuring multi-tenant data isolation by organization_id
DROP POLICY IF EXISTS organization_modules_policy ON organization_modules;
CREATE POLICY organization_modules_policy ON organization_modules FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS organization_feature_overrides_policy ON organization_feature_overrides;
CREATE POLICY organization_feature_overrides_policy ON organization_feature_overrides FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS workspaces_policy ON workspaces;
CREATE POLICY workspaces_policy ON workspaces FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS organization_workspaces_policy ON organization_workspaces;
CREATE POLICY organization_workspaces_policy ON organization_workspaces FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS organization_settings_policy ON organization_settings;
CREATE POLICY organization_settings_policy ON organization_settings FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS import_jobs_policy ON import_jobs;
CREATE POLICY import_jobs_policy ON import_jobs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Joins for Import Job files / logs / errors
DROP POLICY IF EXISTS import_job_files_policy ON import_job_files;
CREATE POLICY import_job_files_policy ON import_job_files FOR ALL USING (EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = job_id AND import_jobs.organization_id = get_user_org_id()));

DROP POLICY IF EXISTS import_job_logs_policy ON import_job_logs;
CREATE POLICY import_job_logs_policy ON import_job_logs FOR ALL USING (EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = job_id AND import_jobs.organization_id = get_user_org_id()));

DROP POLICY IF EXISTS import_job_errors_policy ON import_job_errors;
CREATE POLICY import_job_errors_policy ON import_job_errors FOR ALL USING (EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = job_id AND import_jobs.organization_id = get_user_org_id()));

-- Joins for Campaign members / goals / actions / evidences / activity links
DROP POLICY IF EXISTS campaign_members_policy ON campaign_members;
CREATE POLICY campaign_members_policy ON campaign_members FOR ALL USING (EXISTS (SELECT 1 FROM electoral_campaigns WHERE electoral_campaigns.id = campaign_id AND electoral_campaigns.organization_id = get_user_org_id()));

DROP POLICY IF EXISTS campaign_goals_policy ON campaign_goals;
CREATE POLICY campaign_goals_policy ON campaign_goals FOR ALL USING (EXISTS (SELECT 1 FROM electoral_campaigns WHERE electoral_campaigns.id = campaign_id AND electoral_campaigns.organization_id = get_user_org_id()));

DROP POLICY IF EXISTS campaign_actions_policy ON campaign_actions;
CREATE POLICY campaign_actions_policy ON campaign_actions FOR ALL USING (EXISTS (SELECT 1 FROM electoral_campaigns WHERE electoral_campaigns.id = campaign_id AND electoral_campaigns.organization_id = get_user_org_id()));

DROP POLICY IF EXISTS campaign_evidences_policy ON campaign_evidences;
CREATE POLICY campaign_evidences_policy ON campaign_evidences FOR ALL USING (EXISTS (SELECT 1 FROM electoral_campaigns WHERE electoral_campaigns.id = campaign_id AND electoral_campaigns.organization_id = get_user_org_id()));

DROP POLICY IF EXISTS campaign_activity_links_policy ON campaign_activity_links;
CREATE POLICY campaign_activity_links_policy ON campaign_activity_links FOR ALL USING (EXISTS (SELECT 1 FROM electoral_campaigns WHERE electoral_campaigns.id = campaign_id AND electoral_campaigns.organization_id = get_user_org_id()));

-- Campaign territorial, coordinators and contact tables
DROP POLICY IF EXISTS campaign_territories_policy ON campaign_territories;
CREATE POLICY campaign_territories_policy ON campaign_territories FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_coordinators_policy ON campaign_coordinators;
CREATE POLICY campaign_coordinators_policy ON campaign_coordinators FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_coordinator_assignments_policy ON campaign_coordinator_assignments;
CREATE POLICY campaign_coordinator_assignments_policy ON campaign_coordinator_assignments FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_territory_coverage_policy ON campaign_territory_coverage;
CREATE POLICY campaign_territory_coverage_policy ON campaign_territory_coverage FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_territory_conflicts_policy ON campaign_territory_conflicts;
CREATE POLICY campaign_territory_conflicts_policy ON campaign_territory_conflicts FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_coordinator_health_policy ON campaign_coordinator_health;
CREATE POLICY campaign_coordinator_health_policy ON campaign_coordinator_health FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_contacts_policy ON campaign_contacts;
CREATE POLICY campaign_contacts_policy ON campaign_contacts FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_contact_relationships_policy ON campaign_contact_relationships;
CREATE POLICY campaign_contact_relationships_policy ON campaign_contact_relationships FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_contact_tags_policy ON campaign_contact_tags;
CREATE POLICY campaign_contact_tags_policy ON campaign_contact_tags FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_contact_segments_policy ON campaign_contact_segments;
CREATE POLICY campaign_contact_segments_policy ON campaign_contact_segments FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_contact_engagement_policy ON campaign_contact_engagement;
CREATE POLICY campaign_contact_engagement_policy ON campaign_contact_engagement FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_events_policy ON campaign_events;
CREATE POLICY campaign_events_policy ON campaign_events FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_event_participants_policy ON campaign_event_participants;
CREATE POLICY campaign_event_participants_policy ON campaign_event_participants FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_event_territories_policy ON campaign_event_territories;
CREATE POLICY campaign_event_territories_policy ON campaign_event_territories FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_event_evidences_policy ON campaign_event_evidences;
CREATE POLICY campaign_event_evidences_policy ON campaign_event_evidences FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS campaign_event_attendance_policy ON campaign_event_attendance;
CREATE POLICY campaign_event_attendance_policy ON campaign_event_attendance FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Communication policy rules
DROP POLICY IF EXISTS communication_threads_policy ON communication_threads;
CREATE POLICY communication_threads_policy ON communication_threads FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS communication_participants_policy ON communication_participants;
CREATE POLICY communication_participants_policy ON communication_participants FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS communication_messages_policy ON communication_messages;
CREATE POLICY communication_messages_policy ON communication_messages FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS communication_requests_policy ON communication_requests;
CREATE POLICY communication_requests_policy ON communication_requests FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS communication_dispatches_policy ON communication_dispatches;
CREATE POLICY communication_dispatches_policy ON communication_dispatches FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS communication_logs_policy ON communication_logs;
CREATE POLICY communication_logs_policy ON communication_logs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Presence and activities
DROP POLICY IF EXISTS user_presence_policy ON user_presence;
CREATE POLICY user_presence_policy ON user_presence FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS user_sessions_policy ON user_sessions;
CREATE POLICY user_sessions_policy ON user_sessions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS user_activity_log_policy ON user_activity_log;
CREATE POLICY user_activity_log_policy ON user_activity_log FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- AI Services and configurations
DROP POLICY IF EXISTS ai_provider_registry_policy ON ai_provider_registry;
CREATE POLICY ai_provider_registry_policy ON ai_provider_registry FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS ai_router_policies_policy ON ai_router_policies;
CREATE POLICY ai_router_policies_policy ON ai_router_policies FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS ai_router_requests_policy ON ai_router_requests;
CREATE POLICY ai_router_requests_policy ON ai_router_requests FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS ai_router_audits_policy ON ai_router_audits;
CREATE POLICY ai_router_audits_policy ON ai_router_audits FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Actions, intent and skill engines
DROP POLICY IF EXISTS beta_action_requests_policy ON beta_action_requests;
CREATE POLICY beta_action_requests_policy ON beta_action_requests FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_action_dispatches_policy ON beta_action_dispatches;
CREATE POLICY beta_action_dispatches_policy ON beta_action_dispatches FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_action_logs_policy ON beta_action_logs;
CREATE POLICY beta_action_logs_policy ON beta_action_logs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_skills_policy ON beta_skills;
CREATE POLICY beta_skills_policy ON beta_skills FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_capabilities_policy ON beta_capabilities;
CREATE POLICY beta_capabilities_policy ON beta_capabilities FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_skill_registry_policy ON beta_skill_registry;
CREATE POLICY beta_skill_registry_policy ON beta_skill_registry FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_operational_intents_policy ON beta_operational_intents;
CREATE POLICY beta_operational_intents_policy ON beta_operational_intents FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_operational_dispatches_policy ON beta_operational_dispatches;
CREATE POLICY beta_operational_dispatches_policy ON beta_operational_dispatches FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS beta_operational_results_policy ON beta_operational_results;
CREATE POLICY beta_operational_results_policy ON beta_operational_results FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Government workspace module
DROP POLICY IF EXISTS government_workspaces_policy ON government_workspaces;
CREATE POLICY government_workspaces_policy ON government_workspaces FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_workspace_snapshots_policy ON government_workspace_snapshots;
CREATE POLICY government_workspace_snapshots_policy ON government_workspace_snapshots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_workspace_logs_policy ON government_workspace_logs;
CREATE POLICY government_workspace_logs_policy ON government_workspace_logs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_objectives_policy ON government_objectives;
CREATE POLICY government_objectives_policy ON government_objectives FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_programs_policy ON government_programs;
CREATE POLICY government_programs_policy ON government_programs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_projects_policy ON government_projects;
CREATE POLICY government_projects_policy ON government_projects FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_actions_policy ON government_actions;
CREATE POLICY government_actions_policy ON government_actions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_indicators_policy ON government_indicators;
CREATE POLICY government_indicators_policy ON government_indicators FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_goals_policy ON government_goals;
CREATE POLICY government_goals_policy ON government_goals FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_results_policy ON government_results;
CREATE POLICY government_results_policy ON government_results FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_performance_snapshots_policy ON government_performance_snapshots;
CREATE POLICY government_performance_snapshots_policy ON government_performance_snapshots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_reports_policy ON government_reports;
CREATE POLICY government_reports_policy ON government_reports FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_executive_briefs_policy ON government_executive_briefs;
CREATE POLICY government_executive_briefs_policy ON government_executive_briefs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_monitoring_snapshots_policy ON government_monitoring_snapshots;
CREATE POLICY government_monitoring_snapshots_policy ON government_monitoring_snapshots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_report_logs_policy ON government_report_logs;
CREATE POLICY government_report_logs_policy ON government_report_logs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_governance_reviews_policy ON government_governance_reviews;
CREATE POLICY government_governance_reviews_policy ON government_governance_reviews FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_executive_meetings_policy ON government_executive_meetings;
CREATE POLICY government_executive_meetings_policy ON government_executive_meetings FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_strategic_cycles_policy ON government_strategic_cycles;
CREATE POLICY government_strategic_cycles_policy ON government_strategic_cycles FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_decisions_policy ON government_decisions;
CREATE POLICY government_decisions_policy ON government_decisions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_monitoring_reviews_policy ON government_monitoring_reviews;
CREATE POLICY government_monitoring_reviews_policy ON government_monitoring_reviews FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Procurement and bids module
DROP POLICY IF EXISTS procurement_workspaces_policy ON procurement_workspaces;
CREATE POLICY procurement_workspaces_policy ON procurement_workspaces FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_workspace_snapshots_policy ON procurement_workspace_snapshots;
CREATE POLICY procurement_workspace_snapshots_policy ON procurement_workspace_snapshots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_workspace_logs_policy ON procurement_workspace_logs;
CREATE POLICY procurement_workspace_logs_policy ON procurement_workspace_logs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_opportunities_policy ON procurement_opportunities;
CREATE POLICY procurement_opportunities_policy ON procurement_opportunities FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_bids_policy ON procurement_bids;
CREATE POLICY procurement_bids_policy ON procurement_bids FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_participations_policy ON procurement_participations;
CREATE POLICY procurement_participations_policy ON procurement_participations FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_lots_policy ON procurement_lots;
CREATE POLICY procurement_lots_policy ON procurement_lots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_proposals_policy ON procurement_proposals;
CREATE POLICY procurement_proposals_policy ON procurement_proposals FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_suppliers_policy ON procurement_suppliers;
CREATE POLICY procurement_suppliers_policy ON procurement_suppliers FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_supplier_documents_policy ON procurement_supplier_documents;
CREATE POLICY procurement_supplier_documents_policy ON procurement_supplier_documents FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_supplier_certificates_policy ON procurement_supplier_certificates;
CREATE POLICY procurement_supplier_certificates_policy ON procurement_supplier_certificates FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_supplier_qualifications_policy ON procurement_supplier_qualifications;
CREATE POLICY procurement_supplier_qualifications_policy ON procurement_supplier_qualifications FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_supplier_registries_policy ON procurement_supplier_registries;
CREATE POLICY procurement_supplier_registries_policy ON procurement_supplier_registries FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_contracts_policy ON procurement_contracts;
CREATE POLICY procurement_contracts_policy ON procurement_contracts FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_contract_executions_policy ON procurement_contract_executions;
CREATE POLICY procurement_contract_executions_policy ON procurement_contract_executions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_inspections_policy ON procurement_inspections;
CREATE POLICY procurement_inspections_policy ON procurement_inspections FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_deliveries_policy ON procurement_deliveries;
CREATE POLICY procurement_deliveries_policy ON procurement_deliveries FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_measurements_policy ON procurement_measurements;
CREATE POLICY procurement_measurements_policy ON procurement_measurements FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_contract_issues_policy ON procurement_contract_issues;
CREATE POLICY procurement_contract_issues_policy ON procurement_contract_issues FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_arps_policy ON procurement_arps;
CREATE POLICY procurement_arps_policy ON procurement_arps FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_arp_items_policy ON procurement_arp_items;
CREATE POLICY procurement_arp_items_policy ON procurement_arp_items FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_arp_consumptions_policy ON procurement_arp_consumptions;
CREATE POLICY procurement_arp_consumptions_policy ON procurement_arp_consumptions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_arp_participants_policy ON procurement_arp_participants;
CREATE POLICY procurement_arp_participants_policy ON procurement_arp_participants FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_arp_caronas_policy ON procurement_arp_caronas;
CREATE POLICY procurement_arp_caronas_policy ON procurement_arp_caronas FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_audit_events_policy ON procurement_audit_events;
CREATE POLICY procurement_audit_events_policy ON procurement_audit_events FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_compliance_events_policy ON procurement_compliance_events;
CREATE POLICY procurement_compliance_events_policy ON procurement_compliance_events FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_reports_policy ON procurement_reports;
CREATE POLICY procurement_reports_policy ON procurement_reports FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_executive_briefs_policy ON procurement_executive_briefs;
CREATE POLICY procurement_executive_briefs_policy ON procurement_executive_briefs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_monitoring_snapshots_policy ON procurement_monitoring_snapshots;
CREATE POLICY procurement_monitoring_snapshots_policy ON procurement_monitoring_snapshots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS procurement_report_logs_policy ON procurement_report_logs;
CREATE POLICY procurement_report_logs_policy ON procurement_report_logs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Legislative core
DROP POLICY IF EXISTS government_parliamentarians_policy ON government_parliamentarians;
CREATE POLICY government_parliamentarians_policy ON government_parliamentarians FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendments_policy ON government_amendments;
CREATE POLICY government_amendments_policy ON government_amendments FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_beneficiaries_policy ON government_amendment_beneficiaries;
CREATE POLICY government_amendment_beneficiaries_policy ON government_amendment_beneficiaries FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_destinations_policy ON government_amendment_destinations;
CREATE POLICY government_amendment_destinations_policy ON government_amendment_destinations FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_executions_policy ON government_amendment_executions;
CREATE POLICY government_amendment_executions_policy ON government_amendment_executions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_milestones_policy ON government_amendment_milestones;
CREATE POLICY government_amendment_milestones_policy ON government_amendment_milestones FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_monitorings_policy ON government_amendment_monitorings;
CREATE POLICY government_amendment_monitorings_policy ON government_amendment_monitorings FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_evidences_policy ON government_amendment_evidences;
CREATE POLICY government_amendment_evidences_policy ON government_amendment_evidences FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_accountabilities_policy ON government_amendment_accountabilities;
CREATE POLICY government_amendment_accountabilities_policy ON government_amendment_accountabilities FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_issues_policy ON government_amendment_issues;
CREATE POLICY government_amendment_issues_policy ON government_amendment_issues FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_reports_policy ON government_amendment_reports;
CREATE POLICY government_amendment_reports_policy ON government_amendment_reports FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_executive_briefs_policy ON government_amendment_executive_briefs;
CREATE POLICY government_amendment_executive_briefs_policy ON government_amendment_executive_briefs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_snapshots_policy ON government_amendment_snapshots;
CREATE POLICY government_amendment_snapshots_policy ON government_amendment_snapshots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_reviews_policy ON government_amendment_reviews;
CREATE POLICY government_amendment_reviews_policy ON government_amendment_reviews FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_amendment_cycles_policy ON government_amendment_cycles;
CREATE POLICY government_amendment_cycles_policy ON government_amendment_cycles FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Gov Health Program
DROP POLICY IF EXISTS government_health_units_policy ON government_health_units;
CREATE POLICY government_health_units_policy ON government_health_units FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_teams_policy ON government_health_teams;
CREATE POLICY government_health_teams_policy ON government_health_teams FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_programs_policy ON government_health_programs;
CREATE POLICY government_health_programs_policy ON government_health_programs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_indicators_policy ON government_health_indicators;
CREATE POLICY government_health_indicators_policy ON government_health_indicators FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_coverages_policy ON government_health_coverages;
CREATE POLICY government_health_coverages_policy ON government_health_coverages FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_productions_policy ON government_health_productions;
CREATE POLICY government_health_productions_policy ON government_health_productions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_goals_policy ON government_health_goals;
CREATE POLICY government_health_goals_policy ON government_health_goals FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_results_policy ON government_health_results;
CREATE POLICY government_health_results_policy ON government_health_results FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_monitorings_policy ON government_health_monitorings;
CREATE POLICY government_health_monitorings_policy ON government_health_monitorings FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_evidences_policy ON government_health_evidences;
CREATE POLICY government_health_evidences_policy ON government_health_evidences FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_issues_policy ON government_health_issues;
CREATE POLICY government_health_issues_policy ON government_health_issues FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_health_snapshots_policy ON government_health_snapshots;
CREATE POLICY government_health_snapshots_policy ON government_health_snapshots FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

-- Gov Education Program
DROP POLICY IF EXISTS government_education_units_policy ON government_education_units;
CREATE POLICY government_education_units_policy ON government_education_units FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_education_teams_policy ON government_education_teams;
CREATE POLICY government_education_teams_policy ON government_education_teams FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_education_programs_policy ON government_education_programs;
CREATE POLICY government_education_programs_policy ON government_education_programs FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_education_indicators_policy ON government_education_indicators;
CREATE POLICY government_education_indicators_policy ON government_education_indicators FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_education_coverages_policy ON government_education_coverages;
CREATE POLICY government_education_coverages_policy ON government_education_coverages FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS government_education_productions_policy ON government_education_productions;
CREATE POLICY government_education_productions_policy ON government_education_productions FOR ALL USING (organization_id = get_user_org_id()) WITH CHECK (organization_id = get_user_org_id());


-- Create Composite Indexes on (organization_id, workspace_id) to ensure swift queries and maximum index performance
-- Check and create if not exist
CREATE INDEX IF NOT EXISTS idx_org_mod_composite ON organization_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_feat_composite ON organization_feature_overrides(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_composite ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_workspaces_composite ON organization_workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_settings_composite ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_composite ON import_jobs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_territories_composite ON campaign_territories(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_coordinators_composite ON campaign_coordinators(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_coordinator_assign_composite ON campaign_coordinator_assignments(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_terr_cov_composite ON campaign_territory_coverage(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_terr_conflicts_composite ON campaign_territory_conflicts(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_coord_health_composite ON campaign_coordinator_health(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_composite ON campaign_contacts(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contact_rel_composite ON campaign_contact_relationships(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contact_tags_composite ON campaign_contact_tags(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contact_seg_composite ON campaign_contact_segments(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_contact_eng_composite ON campaign_contact_engagement(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_composite ON campaign_events(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_part_composite ON campaign_event_participants(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_terr_composite ON campaign_event_territories(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_evid_composite ON campaign_event_evidences(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_attend_composite ON campaign_event_attendance(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_threads_composite ON communication_threads(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_participants_composite ON communication_participants(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_messages_composite ON communication_messages(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_requests_composite ON communication_requests(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_dispatches_composite ON communication_dispatches(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_composite ON communication_logs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_composite ON user_presence(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_composite ON user_sessions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_composite ON user_activity_log(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_reg_composite ON ai_provider_registry(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_router_policies_composite ON ai_router_policies(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_router_requests_composite ON ai_router_requests(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_router_audits_composite ON ai_router_audits(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_act_req_composite ON beta_action_requests(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_act_disp_composite ON beta_action_dispatches(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_act_logs_composite ON beta_action_logs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_skills_composite ON beta_skills(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_caps_composite ON beta_capabilities(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_skill_reg_composite ON beta_skill_registry(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_op_intents_composite ON beta_operational_intents(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_op_disp_composite ON beta_operational_dispatches(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_beta_op_res_composite ON beta_operational_results(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ws_composite ON government_workspaces(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ws_snap_composite ON government_workspace_snapshots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ws_logs_composite ON government_workspace_logs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_obj_composite ON government_objectives(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_prog_composite ON government_programs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_proj_composite ON government_projects(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_act_composite ON government_actions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ind_composite ON government_indicators(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_goals_composite ON government_goals(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_res_composite ON government_results(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_perf_composite ON government_performance_snapshots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_reports_composite ON government_reports(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_exec_briefs_composite ON government_executive_briefs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_mon_snapshots_composite ON government_monitoring_snapshots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_rep_logs_composite ON government_report_logs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_gov_reviews_composite ON government_governance_reviews(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_exec_meetings_composite ON government_executive_meetings(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_strat_cycles_composite ON government_strategic_cycles(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_decisions_composite ON government_decisions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_mon_reviews_composite ON government_monitoring_reviews(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_ws_composite ON procurement_workspaces(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_ws_snap_composite ON procurement_workspace_snapshots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_ws_logs_composite ON procurement_workspace_logs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_opp_composite ON procurement_opportunities(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_bids_composite ON procurement_bids(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_part_composite ON procurement_participations(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_lots_composite ON procurement_lots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_prop_composite ON procurement_proposals(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_supp_composite ON procurement_suppliers(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_supp_docs_composite ON procurement_supplier_documents(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_supp_cert_composite ON procurement_supplier_certificates(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_supp_qual_composite ON procurement_supplier_qualifications(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_supp_reg_composite ON procurement_supplier_registries(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_contracts_composite ON procurement_contracts(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_cont_execs_composite ON procurement_contract_executions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_insp_composite ON procurement_inspections(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_deliv_composite ON procurement_deliveries(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_meas_composite ON procurement_measurements(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_cont_issues_composite ON procurement_contract_issues(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_arps_composite ON procurement_arps(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_arp_items_composite ON procurement_arp_items(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_arp_cons_composite ON procurement_arp_consumptions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_arp_parts_composite ON procurement_arp_participants(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_arp_caronas_composite ON procurement_arp_caronas(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_aud_events_composite ON procurement_audit_events(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_comp_events_composite ON procurement_compliance_events(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_reports_composite ON procurement_reports(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_exec_briefs_composite ON procurement_executive_briefs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_mon_snapshots_composite ON procurement_monitoring_snapshots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_proc_rep_composite ON procurement_report_logs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_parl_composite ON government_parliamentarians(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_composite ON government_amendments(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_benef_composite ON government_amendment_beneficiaries(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_dest_composite ON government_amendment_destinations(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_exec_composite ON government_amendment_executions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_miles_composite ON government_amendment_milestones(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_mon_composite ON government_amendment_monitorings(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_evid_composite ON government_amendment_evidences(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_acc_composite ON government_amendment_accountabilities(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_issue_composite ON government_amendment_issues(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_rep_composite ON government_amendment_reports(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_exbr_composite ON government_amendment_executive_briefs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_snap_composite ON government_amendment_snapshots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_rev_composite ON government_amendment_reviews(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_amend_cycle_composite ON government_amendment_cycles(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_units_composite ON government_health_units(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_teams_composite ON government_health_teams(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_progs_composite ON government_health_programs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_ind_composite ON government_health_indicators(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_cov_composite ON government_health_coverages(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_prod_composite ON government_health_productions(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_goals_composite ON government_health_goals(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_res_composite ON government_health_results(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_mon_composite ON government_health_monitorings(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_evid_composite ON government_health_evidences(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_issue_composite ON government_health_issues(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_hl_snap_composite ON government_health_snapshots(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ed_units_composite ON government_education_units(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ed_teams_composite ON government_education_teams(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ed_progs_composite ON government_education_programs(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ed_ind_composite ON government_education_indicators(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_gov_ed_cov_composite ON government_education_coverages(organization_id, workspace_id);
-- HOTFIX 25.1-A: BLOCKS 1 AND 2 --

create table if not exists action_history (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255),
  entity_type varchar(255) not null,
  entity_id varchar(255) not null,
  action_type varchar(255) not null,
  actor_id varchar(255) not null,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null
);

alter table action_history enable row level security;
drop policy if exists action_history_policy on action_history;
create policy action_history_policy on action_history for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create index if not exists idx_action_history_composite on action_history(organization_id, workspace_id);
create index if not exists idx_action_history_entity on action_history(entity_type, entity_id);

create table if not exists action_execution_logs (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255),
  execution_type varchar(255) not null,
  execution_status varchar(255) not null,
  execution_result text,
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null
);

alter table action_execution_logs enable row level security;
drop policy if exists action_execution_logs_policy on action_execution_logs;
create policy action_execution_logs_policy on action_execution_logs for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create index if not exists idx_action_execution_logs_composite on action_execution_logs(organization_id, workspace_id);

create table if not exists procurement_snapshots (
  id varchar(255) primary key default uuid_generate_v4()::text,
  organization_id varchar(255) not null,
  workspace_id varchar(255),
  metadata_json jsonb,
  created_at timestamp with time zone default now() not null
);

alter table procurement_snapshots enable row level security;
drop policy if exists procurement_snapshots_policy on procurement_snapshots;
create policy procurement_snapshots_policy on procurement_snapshots for all using (organization_id = get_user_org_id()) with check (organization_id = get_user_org_id());
create index if not exists idx_procurement_snapshots_composite on procurement_snapshots(organization_id, workspace_id);

