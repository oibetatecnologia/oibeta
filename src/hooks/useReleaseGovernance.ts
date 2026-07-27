import { useMemo } from 'react';
import type { Decision, Project, Task } from '../types';
import { ReleaseGovernanceService } from '../core/releases/ReleaseGovernanceService';

export default function useReleaseGovernance(
  projects: Project[],
  tasks: Task[],
  decisions: Decision[],
  scores: { production: number; persistence: number; observability: number; accessControl: number; session: number }
) {
  return useMemo(() => ReleaseGovernanceService.buildSummary({
    projects,
    tasks,
    decisions,
    productionScore: scores.production,
    persistenceScore: scores.persistence,
    observabilityScore: scores.observability,
    accessControlScore: scores.accessControl,
    sessionScore: scores.session,
  }), [projects, tasks, decisions, scores.production, scores.persistence, scores.observability, scores.accessControl, scores.session]);
}
