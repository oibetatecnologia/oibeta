import { useMemo } from 'react';
import { TaskExecutionIntelligenceService } from '../core/tasks/TaskExecutionIntelligenceService';
import type { Task } from '../types';

export default function useTaskExecutionSummary(tasks: Task[]) {
  return useMemo(
    () => TaskExecutionIntelligenceService.buildSummary(tasks),
    [tasks],
  );
}
