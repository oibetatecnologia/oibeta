import { SafeJsonStorage } from '../persistence/SafeJsonStorage';
import { buildTenantStorageKey, type TenantPersistenceContext } from '../persistence/TenantPersistence';
import { createOpportunityDraft } from './OpportunityRegistry';
import type { CommercialOpportunity, CommercialOpportunityInput } from './OpportunityTypes';

const STORAGE_KEY = 'oi-beta-commercial-opportunities-v1';

const resolveStorageKey = (context?: Partial<TenantPersistenceContext>): string =>
  buildTenantStorageKey(STORAGE_KEY, context);

/**
 * OpportunityStorage
 *
 * Fallback local tenant-aware do Radar Comercial.
 * Deve permanecer como camada temporária enquanto a persistência definitiva
 * migra para API/backend/Supabase.
 */
export class OpportunityStorage {
  static list(context?: Partial<TenantPersistenceContext>): CommercialOpportunity[] {
    const parsed = SafeJsonStorage.read<CommercialOpportunity[]>({
      key: resolveStorageKey(context),
      fallback: [],
      label: 'oportunidades comerciais locais',
    });

    return Array.isArray(parsed) ? parsed : [];
  }

  static create(
    input: CommercialOpportunityInput | CommercialOpportunity,
    context?: Partial<TenantPersistenceContext>,
  ): CommercialOpportunity {
    const opportunity = 'id' in input ? input as CommercialOpportunity : createOpportunityDraft(input);
    const current = this.list(context);

    this.saveAll([opportunity, ...current], context);

    return opportunity;
  }

  static update(
    opportunityId: string,
    changes: Partial<CommercialOpportunity>,
    context?: Partial<TenantPersistenceContext>,
  ): CommercialOpportunity {
    const current = this.list(context);
    const index = current.findIndex((item) => item.id === opportunityId);
    if (index < 0) throw new Error('Oportunidade não encontrada.');
    const updated = { ...current[index], ...changes, id: opportunityId, updatedAt: new Date().toISOString() };
    current[index] = updated;
    SafeJsonStorage.write(resolveStorageKey(context), current, 'oportunidades comerciais locais');
    return updated;
  }

  static delete(opportunityId: string, context?: Partial<TenantPersistenceContext>): void {
    this.saveAll(this.list(context).filter((opportunity) => opportunity.id !== opportunityId), context);
  }

  static saveAll(
    opportunities: CommercialOpportunity[],
    context?: Partial<TenantPersistenceContext>,
  ): void {
    SafeJsonStorage.write(resolveStorageKey(context), opportunities, 'oportunidades comerciais locais');
  }
}
