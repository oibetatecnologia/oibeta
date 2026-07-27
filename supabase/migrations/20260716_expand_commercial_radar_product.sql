-- Super Lote I — Radar Comercial como produto oficial e análises auditáveis
alter table commercial_opportunities add column if not exists source_id varchar(255);
alter table commercial_opportunities add column if not exists source_label text;
alter table commercial_opportunities add column if not exists source_type varchar(64) default 'manual';
alter table commercial_opportunities add column if not exists external_id varchar(255);
alter table commercial_opportunities add column if not exists process_number varchar(255);
alter table commercial_opportunities add column if not exists captured_at timestamp with time zone;
alter table commercial_opportunities add column if not exists last_checked_at timestamp with time zone;
alter table commercial_opportunities add column if not exists source_published_at timestamp with time zone;
alter table commercial_opportunities add column if not exists source_updated_at timestamp with time zone;
alter table commercial_opportunities add column if not exists source_hash text;
alter table commercial_opportunities add column if not exists duplicate_key text;
alter table commercial_opportunities add column if not exists probable_duplicate_of varchar(255);
alter table commercial_opportunities add column if not exists qualification_status varchar(64) not null default 'unqualified';
alter table commercial_opportunities add column if not exists analysis jsonb;
alter table commercial_opportunities add column if not exists crm_opportunity_id varchar(255);
create index if not exists idx_commercial_opportunities_external_source on commercial_opportunities(organization_id, source_id, external_id);
create index if not exists idx_commercial_opportunities_duplicate_key on commercial_opportunities(organization_id, workspace_id, duplicate_key);
create index if not exists idx_commercial_opportunities_qualification on commercial_opportunities(organization_id, workspace_id, qualification_status);
