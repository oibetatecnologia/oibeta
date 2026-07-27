import { useEffect, useState } from 'react';
import { GovService } from '../../../services/gov/GovService';

/**
 * useGovWorkspaceData
 *
 * Hook oficial de carregamento de dados do Beta Gov.
 *
 * Responsabilidade:
 * - carregar dados reais do GovService;
 * - centralizar estados de datasets;
 * - manter GovWorkspace focado em orquestração.
 */
export function useGovWorkspaceData(workspaceId: string) {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorOnLoad, setErrorOnLoad] = useState<boolean>(false);

  const [objectives, setObjectives] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [compliances, setCompliances] = useState<any[]>([]);
  const [monitorings, setMonitorings] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [govReviews, setGovReviews] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [progSummary, setProgSummary] = useState<any>(null);
  const [perfSummary, setPerfSummary] = useState<any>(null);

  const loadGovWorkspaceData = async () => {
    try {
      setLoading(true);
      setErrorOnLoad(false);

      const data = await GovService.loadWorkspaceData(workspaceId);

      setObjectives(data.objectives);
      setPrograms(data.programs);
      setProjectsData(data.projectsData);
      setActions(data.actions);
      setIndicators(data.indicators);
      setGoals(data.goals);
      setResults(data.results);
      setAudits(data.audits);
      setCompliances(data.compliances);
      setMonitorings(data.monitorings);
      setOccurrences(data.occurrences);
      setBriefs(data.briefs);
      setSnapshots(data.snapshots);
      setGovReviews(data.govReviews);
      setReports(data.reports);
      setProgSummary(data.progSummary);
      setPerfSummary(data.perfSummary);
    } catch (err) {
      console.error('Error reading strategic gov workspace database:', err);
      setErrorOnLoad(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGovWorkspaceData();
  }, [workspaceId]);

  return {
    loading,
    errorOnLoad,
    objectives,
    programs,
    projectsData,
    actions,
    indicators,
    goals,
    results,
    audits,
    compliances,
    monitorings,
    occurrences,
    briefs,
    snapshots,
    govReviews,
    reports,
    progSummary,
    perfSummary,
    loadGovWorkspaceData,
  };
}
