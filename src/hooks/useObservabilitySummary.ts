import { useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';
import { ObservabilityService } from '../core/observability/ObservabilityService';
import useProductionReadiness from './useProductionReadiness';
import useRuntimeObservability from './useRuntimeObservability';

export default function useObservabilitySummary() {
  const workspace = useWorkspace();
  const productionReadiness = useProductionReadiness();
  const runtime = useRuntimeObservability();

  return useMemo(
    () =>
      ObservabilityService.buildSummary({
        actionLogs: workspace.logs.actionLogs,
        debugLogs: workspace.logs.debugLogs,
        isFetchingDebug: workspace.logs.isFetchingDebug,
        isApiError: workspace.modules.isApiError,
        pendingTasksCount: workspace.tasks.pendingTasksCount,
        productionReadinessScore: productionReadiness.score,
        runtime,
        runtimeError: runtime.error,
      }),
    [
      productionReadiness.score,
      runtime,
      workspace.logs.actionLogs,
      workspace.logs.debugLogs,
      workspace.logs.isFetchingDebug,
      workspace.modules.isApiError,
      workspace.tasks.pendingTasksCount,
    ],
  );
}
