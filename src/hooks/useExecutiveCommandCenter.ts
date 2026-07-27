import { useMemo } from 'react';
import { ExecutiveCommandService } from '../core/executive/ExecutiveCommandService';
import type { CommercialOpportunity } from '../core/commercial/OpportunityTypes';
import type { Task } from '../types';

export default function useExecutiveCommandCenter(opportunities: CommercialOpportunity[], tasks: Task[]) {
  return useMemo(() => ExecutiveCommandService.build(opportunities, tasks), [opportunities, tasks]);
}
