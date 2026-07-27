import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type {
  CustomerOperationsPlan,
  CustomerOperationsSummary,
  UpsertCustomerOperationsPlanInput,
} from './CustomerOperationsTypes';

const ENDPOINT = '/api/customer-operations';

export class CustomerOperationsService {
  static list(): Promise<CustomerOperationsPlan[]> {
    return HttpRepositoryClient.get<CustomerOperationsPlan[]>(`${ENDPOINT}/plans`);
  }

  static summary(): Promise<CustomerOperationsSummary> {
    return HttpRepositoryClient.get<CustomerOperationsSummary>(`${ENDPOINT}/overview`);
  }

  static upsert(
    input: UpsertCustomerOperationsPlanInput,
  ): Promise<CustomerOperationsPlan> {
    return HttpRepositoryClient.post<CustomerOperationsPlan>(`${ENDPOINT}/plans`, input);
  }
}
