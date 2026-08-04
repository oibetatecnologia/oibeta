-- Beta Platform: Radar interno da Oi Beta sem workspace artificial
BEGIN;

ALTER TABLE public.commercial_opportunities
  ALTER COLUMN workspace_id DROP NOT NULL;

ALTER TABLE public.radar_tenant_products
  ALTER COLUMN workspace_id DROP NOT NULL;

ALTER TABLE public.radar_saved_searches
  ALTER COLUMN workspace_id DROP NOT NULL;

COMMENT ON COLUMN public.commercial_opportunities.workspace_id IS
  'Workspace opcional. Nulo para o Radar interno organizacional da Oi Beta.';
COMMENT ON COLUMN public.radar_tenant_products.workspace_id IS
  'Workspace opcional. Nulo para o catálogo interno organizacional da Oi Beta.';
COMMENT ON COLUMN public.radar_saved_searches.workspace_id IS
  'Workspace opcional. Nulo para pesquisas internas organizacionais da Oi Beta.';

COMMIT;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('commercial_opportunities','radar_tenant_products','radar_saved_searches')
  AND column_name='workspace_id'
ORDER BY table_name;
