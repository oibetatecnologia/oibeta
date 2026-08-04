-- ============================================================
-- BETA PLATFORM
-- Corrige os identificadores de contexto das execuções do Radar
--
-- Causa:
-- commercial_radar_sync_runs.organization_id e workspace_id
-- foram criados como UUID, mas a arquitetura oficial utiliza
-- identificadores textuais, por exemplo: org-oi-beta.
--
-- Escopo:
-- - altera organization_id de uuid para text;
-- - altera workspace_id de uuid para text;
-- - preserva registros existentes por conversão explícita;
-- - mantém id da execução como uuid;
-- - não cria workspace para usuários internos da Oi Beta.
-- ============================================================

BEGIN;

ALTER TABLE public.commercial_radar_sync_runs
  ALTER COLUMN organization_id TYPE text
  USING organization_id::text;

ALTER TABLE public.commercial_radar_sync_runs
  ALTER COLUMN workspace_id TYPE text
  USING workspace_id::text;

COMMENT ON COLUMN public.commercial_radar_sync_runs.organization_id IS
  'Identificador textual da organização/tenant. Exemplo: org-oi-beta.';

COMMENT ON COLUMN public.commercial_radar_sync_runs.workspace_id IS
  'Identificador textual opcional do workspace. Nulo para contexto interno da Oi Beta.';

COMMIT;

-- ============================================================
-- Validação pós-migration
-- ============================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'commercial_radar_sync_runs'
  AND column_name IN ('organization_id', 'workspace_id')
ORDER BY ordinal_position;
