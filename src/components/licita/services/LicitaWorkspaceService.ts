import type { LicitaCreateType, LicitaFormFields, LicitaWorkspaceData } from '../types';

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const readJsonWhenOk = async (response: Response) => {
  if (!response.ok) return null;
  return response.json();
};

export const initializeLicitaWorkspace = async (workspaceId: string) => {
  const response = await fetch(`/api/licita/workspace?workspaceId=${workspaceId}`);

  if (!response.ok) {
    throw new Error(`Failed to initialize workspace context: ${response.status}`);
  }
};

export const loadLicitaWorkspaceData = async (workspaceId: string): Promise<LicitaWorkspaceData> => {
  const [
    resSummary,
    resOpps,
    resBids,
    resSuppliers,
    resContracts,
    resArps,
    resComplianceSummary,
    resAuditEvents,
    resComplianceEvents,
    resReports
  ] = await Promise.all([
    fetch(`/api/licita/summary?workspaceId=${workspaceId}`),
    fetch(`/api/licita/opportunities?workspaceId=${workspaceId}`),
    fetch(`/api/licita/bids?workspaceId=${workspaceId}`),
    fetch(`/api/licita/suppliers?workspaceId=${workspaceId}`),
    fetch(`/api/licita/contracts?workspaceId=${workspaceId}`),
    fetch(`/api/licita/arps?workspaceId=${workspaceId}`),
    fetch(`/api/licita/compliance-summary?workspaceId=${workspaceId}`),
    fetch(`/api/licita/audit-events?workspaceId=${workspaceId}`),
    fetch(`/api/licita/compliance-events?workspaceId=${workspaceId}`),
    fetch(`/api/licita/reports?workspaceId=${workspaceId}`)
  ]);

  return {
    summary: await readJsonWhenOk(resSummary),
    opportunities: (await readJsonWhenOk(resOpps)) || [],
    bids: (await readJsonWhenOk(resBids)) || [],
    suppliers: (await readJsonWhenOk(resSuppliers)) || [],
    contracts: (await readJsonWhenOk(resContracts)) || [],
    arps: (await readJsonWhenOk(resArps)) || [],
    complianceSummary: await readJsonWhenOk(resComplianceSummary),
    auditEvents: (await readJsonWhenOk(resAuditEvents)) || [],
    complianceEvents: (await readJsonWhenOk(resComplianceEvents)) || [],
    reports: (await readJsonWhenOk(resReports)) || []
  };
};

export const buildLicitaCreatePayload = (createType: LicitaCreateType, formFields: LicitaFormFields) => {
  if (createType === 'bid') {
    return {
      endpoint: '/api/licita/bids',
      payload: {
        title: formFields.title || `Certame nº ${formFields.number}`,
        description: formFields.description,
        status: formFields.status || 'ACTIVE',
        metadata: {
          number: formFields.number,
          modalidade: formFields.modalidade,
          orgao: formFields.orgao,
          valorEstimado: Number(formFields.valorEstimado) || 0
        }
      }
    };
  }

  if (createType === 'supplier') {
    return {
      endpoint: '/api/licita/suppliers',
      payload: {
        name: formFields.title,
        documentNumber: formFields.documentNumber,
        status: formFields.status || 'ACTIVE',
        metadata: {
          qualificacion: formFields.modalidade || 'Nível A - Elevada',
          situacao: formFields.status || 'Habilitado'
        }
      }
    };
  }

  if (createType === 'contract') {
    return {
      endpoint: '/api/licita/contracts',
      payload: {
        title: formFields.title || `Contrato nº ${formFields.number}`,
        number: formFields.number,
        status: formFields.status || 'ACTIVE',
        supplierId: formFields.supplierId || 'sup-manual-id',
        bidId: formFields.bidId || 'bid-manual-id',
        value: Number(formFields.value) || 0,
        supplierName: formFields.supplierName,
        metadata: {
          vigenciaDe: formFields.vigenciaDe,
          vigenciaAte: formFields.vigenciaAte,
          gestor: formFields.gestor
        }
      }
    };
  }

  if (createType === 'arp') {
    return {
      endpoint: '/api/licita/arps',
      payload: {
        status: formFields.status || 'ACTIVE',
        metadata: {
          number: formFields.number,
          orgaoGerenciador: formFields.orgao,
          supplierName: formFields.supplierName,
          vigenciaDe: formFields.vigenciaDe,
          vigenciaAte: formFields.vigenciaAte
        }
      }
    };
  }

  return { endpoint: '', payload: {} };
};

export const createLicitaRecord = async (workspaceId: string, createType: LicitaCreateType, formFields: LicitaFormFields) => {
  const { endpoint, payload } = buildLicitaCreatePayload(createType, formFields);

  if (!endpoint) {
    throw new Error('Tipo de cadastro inválido para o módulo Licita.');
  }

  const response = await fetch(`${endpoint}?workspaceId=${workspaceId}`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Execution error: ${response.statusText}`);
  }
};
