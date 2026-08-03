import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { TenantCommercialContract } from '../commercial/TenantCommercialContractTypes';
import type { TenantDefinition, TenantType } from '../tenants/TenantRegistry';
import type { ClientActivationReadiness } from './ClientActivationReadinessService';

export interface CreateClientOnboardingInput {
  organizationName: string;
  tenantType: TenantType;
  administratorName: string;
  administratorEmail: string;
  productIds: string[];
  planName: string;
  monthlyValue: number;
  setupValue: number;
  billingDay: number;
  startDate: string;
  responsible: string;
  notes?: string;
}

export interface ClientOnboardingResult {
  tenant: TenantDefinition;
  contract: TenantCommercialContract;
  readiness: ClientActivationReadiness;
  completedAt: string;
}

const ENDPOINT = '/api/admin/client-onboarding';

export class ClientOnboardingService {
  static create(input: CreateClientOnboardingInput): Promise<ClientOnboardingResult> {
    return HttpRepositoryClient.post<ClientOnboardingResult>(ENDPOINT, input);
  }

  static getReadiness(tenantId: string): Promise<ClientActivationReadiness> {
    return HttpRepositoryClient.get<ClientActivationReadiness>(`${ENDPOINT}/${encodeURIComponent(tenantId)}/readiness`);
  }

  static activate(tenantId: string): Promise<{ tenant: TenantDefinition; readiness: ClientActivationReadiness }> {
    return HttpRepositoryClient.post(`${ENDPOINT}/${encodeURIComponent(tenantId)}/activate`, {});
  }
}
