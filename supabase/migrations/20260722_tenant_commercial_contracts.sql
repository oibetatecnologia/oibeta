create table if not exists public.tenant_commercial_contracts (
 id uuid primary key default gen_random_uuid(), tenant_id varchar not null, organization_id varchar not null,
 plan_name varchar(200) not null, status varchar(30) not null default 'draft', product_ids jsonb not null default '[]'::jsonb,
 monthly_value numeric(14,2) not null default 0, setup_value numeric(14,2) not null default 0, billing_day integer not null default 10,
 start_date date not null, end_date date, auto_renew boolean not null default true, responsible varchar(200) not null, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id)
);
create index if not exists idx_tenant_commercial_contracts_status on public.tenant_commercial_contracts(status);
create index if not exists idx_tenant_commercial_contracts_end_date on public.tenant_commercial_contracts(end_date);
