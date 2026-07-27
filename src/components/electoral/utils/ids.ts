/**
 * Utilidades de identificação do módulo Beta Electoral.
 */

export function getDisplayId(id?: string, length = 6): string {
  if (!id) return '#NO_ID';
  return `#${id.slice(0, length)}`;
}

export function getLocalStorageKey(organizationId?: string, suffix = 'electoral'): string {
  return `beta:${organizationId || 'default-organization'}:${suffix}`;
}

export function createTemporaryId(prefix = 'tmp'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
