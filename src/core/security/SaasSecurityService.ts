import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { SaasSecurityReadiness } from './SaasSecurityTypes';

export class SaasSecurityService {
  static async load(): Promise<SaasSecurityReadiness> {
    return HttpRepositoryClient.get<SaasSecurityReadiness>('/api/admin/security/readiness');
  }
}
