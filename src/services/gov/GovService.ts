export interface GovWorkspaceData {
  objectives: any[];
  programs: any[];
  projectsData: any[];
  actions: any[];
  indicators: any[];
  goals: any[];
  results: any[];
  audits: any[];
  compliances: any[];
  monitorings: any[];
  occurrences: any[];
  briefs: any[];
  snapshots: any[];
  govReviews: any[];
  reports: any[];
  progSummary: any;
  perfSummary: any;
}

export interface GovCreateRecordParams {
  workspaceId: string;
  createType: string;
  formFields: any;
  programs: any[];
  projectsData: any[];
  indicators: any[];
}

const jsonHeaders = { 'Content-Type': 'application/json' };

async function safeFetchJson(endpoint: string): Promise<any | null> {
  const response = await fetch(endpoint).catch(() => null);
  if (!response?.ok) return null;
  return response.json();
}

async function postJson(endpoint: string, payload: any): Promise<any> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Erro ao salvar no banco: ${response.statusText}`);
  }

  return response.json().catch(() => null);
}

export class GovService {
  static async loadWorkspaceData(workspaceId: string): Promise<GovWorkspaceData> {
    const [
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
      reportsPrimary,
      progSummary,
      perfSummary
    ] = await Promise.all([
      safeFetchJson(`/api/gov/objectives?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/programs?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/projects?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/actions?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/indicators?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/goals?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/results?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/administrative-audits?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/administrative-compliances?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/administrative-monitorings?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/administrative-occurrences?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/briefs?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/monitoring?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/governance/reviews?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/reports?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/program-summary?workspaceId=${workspaceId}`),
      safeFetchJson(`/api/gov/performance-summary?workspaceId=${workspaceId}`)
    ]);

    const reports = reportsPrimary || await safeFetchJson(`/api/gov/transparency/reports?workspaceId=${workspaceId}`);

    return {
      objectives: objectives || [],
      programs: programs || [],
      projectsData: projectsData || [],
      actions: actions || [],
      indicators: indicators || [],
      goals: goals || [],
      results: results || [],
      audits: audits || [],
      compliances: compliances || [],
      monitorings: monitorings || [],
      occurrences: occurrences || [],
      briefs: briefs || [],
      snapshots: snapshots || [],
      govReviews: govReviews || [],
      reports: reports || [],
      progSummary: progSummary || null,
      perfSummary: perfSummary || null
    };
  }

  static async createRecord({
    workspaceId,
    createType,
    formFields,
    programs,
    projectsData,
    indicators
  }: GovCreateRecordParams): Promise<any> {
    const { endpoint, payload } = await this.buildCreatePayload({
      workspaceId,
      createType,
      formFields,
      programs,
      projectsData,
      indicators
    });

    if (!endpoint) {
      throw new Error('Tipo de registro Gov não reconhecido.');
    }

    return postJson(endpoint, payload);
  }

  private static async buildCreatePayload(params: GovCreateRecordParams): Promise<{ endpoint: string; payload: any }> {
    const { workspaceId, createType, formFields, programs, projectsData, indicators } = params;

    if (createType === 'program') {
      let targetObjectiveId = formFields.objectiveId;
      if (!targetObjectiveId) {
        targetObjectiveId = await this.createDefaultObjective(workspaceId);
      }

      return {
        endpoint: '/api/gov/programs',
        payload: {
          workspaceId,
          objectiveId: targetObjectiveId,
          name: formFields.name,
          description: formFields.description,
          status: formFields.status || 'ACTIVE',
          metadata: {
            secretaria: formFields.secretaria || 'Administração Geral',
            periodo: formFields.periodo || 'Anual 2026'
          }
        }
      };
    }

    if (createType === 'project') {
      return {
        endpoint: '/api/gov/projects',
        payload: {
          workspaceId,
          programId: formFields.programId || (programs && programs.length > 0 ? programs[0].id : 'prog-default'),
          name: formFields.name,
          description: formFields.description,
          status: formFields.status || 'ACTIVE',
          metadata: {
            responsavel: formFields.responsavel || 'Assessor Técnico'
          }
        }
      };
    }

    if (createType === 'action') {
      return {
        endpoint: '/api/gov/actions',
        payload: {
          workspaceId,
          projectId: formFields.projectId || (projectsData && projectsData.length > 0 ? projectsData[0].id : 'proj-default'),
          name: formFields.name,
          description: formFields.description,
          status: formFields.status || 'ACTIVE',
          metadata: {
            prazo: formFields.prazo || '30 dias'
          }
        }
      };
    }

    if (createType === 'goal') {
      let targetIndicatorId = formFields.indicatorId;
      if (!targetIndicatorId) {
        targetIndicatorId = await this.createDefaultIndicator(workspaceId, formFields);
      }

      return {
        endpoint: '/api/gov/goals',
        payload: {
          workspaceId,
          indicatorId: targetIndicatorId,
          goalValue: Number(formFields.goalValue) || 100,
          currentValue: Number(formFields.currentValue) || 0,
          status: formFields.status || 'PENDING',
          metadata: {
            descricaoMeta: formFields.descricaoMeta || formFields.description || 'Cumprimento de 100% das etapas planejadas',
            prazo: formFields.prazo || '2026-12-31'
          }
        }
      };
    }

    return { endpoint: '', payload: {} };
  }

  private static async createDefaultObjective(workspaceId: string): Promise<string> {
    try {
      const created = await postJson('/api/gov/objectives', {
        workspaceId,
        name: 'Objetivo Estratégico Municipal',
        description: 'Diretrizes gerais corporativas e do governo',
        status: 'ACTIVE'
      });
      return created?.id || 'obj-default';
    } catch {
      return 'obj-default';
    }
  }

  private static async createDefaultIndicator(workspaceId: string, formFields: any): Promise<string> {
    try {
      const created = await postJson('/api/gov/indicators', {
        workspaceId,
        indicatorName: formFields.indicatorName || 'Indicador Geral de Monitoramento',
        description: 'Indicador estratégico de metas governamentais',
        unit: formFields.unidade || 'Percentual (%)',
        metadata: { createdBy: 'Prefeitura' }
      });
      return created?.id || 'ind-default';
    } catch {
      return 'ind-default';
    }
  }
}
