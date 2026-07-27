export const OFFICIAL_PRODUCT_IDS = [
  'beta-gov',
  'portal-transparencia-inteligente',
  'prefeitura-zero-papel',
  'beta-electoral',
  'beta-licita',
  'gestao-contratos-arp',
  'beta-amendments',
  'nucleo-operacional-beta',
  'dashboard-bi-estrategico',
] as const;

export type OfficialProductId = (typeof OFFICIAL_PRODUCT_IDS)[number];

const OFFICIAL_PRODUCT_ID_SET = new Set<string>(OFFICIAL_PRODUCT_IDS);

export function normalizeOfficialProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((item) => item.trim()).filter((item) => OFFICIAL_PRODUCT_ID_SET.has(item))));
}

export function getInvalidOfficialProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((item) => item.trim()).filter(Boolean).filter((item) => !OFFICIAL_PRODUCT_ID_SET.has(item))));
}
