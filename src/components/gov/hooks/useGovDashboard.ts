import { useMemo } from 'react';
import type { GovDashboardMetrics, GovDashboardParams } from '../types/govViewModels';
import { calculateGovDashboardMetrics } from '../utils/govMetrics';

/**
 * useGovDashboard
 *
 * Hook oficial de métricas do Dashboard Gov.
 *
 * Responsabilidade:
 * - centralizar KPIs derivados;
 * - manter GovDashboard focado em renderização;
 * - evitar cálculos espalhados em JSX.
 */
export function useGovDashboard(params: GovDashboardParams): GovDashboardMetrics {
  return useMemo(() => calculateGovDashboardMetrics(params), [
    params.programs,
    params.projectsData,
    params.actions,
    params.indicators,
    params.goals,
    params.results,
    params.reports,
    params.progSummary,
    params.perfSummary,
  ]);
}
