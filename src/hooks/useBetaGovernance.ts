import { useCallback, useEffect, useState } from 'react';
import { BetaGovernanceService } from '../core/betaGovernance/BetaGovernanceService';
import type { BetaGovernanceAsset, BetaGovernanceSummary, UpsertBetaGovernanceAssetInput } from '../core/betaGovernance/BetaGovernanceTypes';
const EMPTY:BetaGovernanceSummary={total:0,active:0,draft:0,paused:0,archived:0,knowledge:0,memories:0,automations:0,skills:0,overdueReviews:0,restrictedAssets:0,automationsWithoutApproval:0,governanceScore:0};
export default function useBetaGovernance(){const [assets,setAssets]=useState<BetaGovernanceAsset[]>([]);const [summary,setSummary]=useState(EMPTY);const [isLoading,setIsLoading]=useState(true);const [isSaving,setIsSaving]=useState(false);const [error,setError]=useState<string>();
 const refresh=useCallback(async()=>{setIsLoading(true);setError(undefined);try{const [a,s]=await Promise.all([BetaGovernanceService.list(),BetaGovernanceService.overview()]);setAssets(a);setSummary(s)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setIsLoading(false)}},[]);
 useEffect(()=>{void refresh()},[refresh]);
 const upsert=useCallback(async(input:UpsertBetaGovernanceAssetInput)=>{setIsSaving(true);try{const v=await BetaGovernanceService.upsert(input);await refresh();return v}finally{setIsSaving(false)}},[refresh]);
 const setStatus=useCallback(async(id:string,status:BetaGovernanceAsset['status'],owner:string)=>{setIsSaving(true);try{const v=await BetaGovernanceService.setStatus(id,status,owner);await refresh();return v}finally{setIsSaving(false)}},[refresh]);
 return{assets,summary,isLoading,isSaving,error,refresh,upsert,setStatus};}
