import { HttpRepositoryClient } from '../persistence/HttpRepositoryClient';
import type { BetaGovernanceAsset, BetaGovernanceSummary, UpsertBetaGovernanceAssetInput } from './BetaGovernanceTypes';
const ENDPOINT='/api/beta/governance';
export class BetaGovernanceService {
 static list():Promise<BetaGovernanceAsset[]>{return HttpRepositoryClient.get<BetaGovernanceAsset[]>(`${ENDPOINT}/assets`)}
 static overview():Promise<BetaGovernanceSummary>{return HttpRepositoryClient.get<BetaGovernanceSummary>(`${ENDPOINT}/overview`)}
 static upsert(input:UpsertBetaGovernanceAssetInput):Promise<BetaGovernanceAsset>{return HttpRepositoryClient.post<BetaGovernanceAsset>(`${ENDPOINT}/assets`,input)}
 static setStatus(id:string,status:BetaGovernanceAsset['status'],owner:string):Promise<BetaGovernanceAsset>{return HttpRepositoryClient.put<BetaGovernanceAsset>(`${ENDPOINT}/assets/${encodeURIComponent(id)}/status`,{status,owner})}
}
