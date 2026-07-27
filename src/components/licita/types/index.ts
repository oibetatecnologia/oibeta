export type LicitaCreateType = '' | 'bid' | 'supplier' | 'contract' | 'arp';
export type LicitaDetailType = '' | 'opportunity' | 'bid' | 'supplier' | 'contract' | 'arp' | 'compliance' | 'report';

export interface LicitaFormFields {
  title: string;
  description: string;
  status: string;
  number: string;
  modalidade: string;
  orgao: string;
  valorEstimado: string | number;
  supplierName: string;
  supplierId: string;
  bidId: string;
  documentNumber: string;
  value: string | number;
  gestor: string;
  vigenciaDe: string;
  vigenciaAte: string;
  origem: string;
  motivo: string;
  grauRisco: string;
}

export interface LicitaWorkspaceData {
  summary: any;
  opportunities: any[];
  bids: any[];
  suppliers: any[];
  contracts: any[];
  arps: any[];
  complianceSummary: any;
  auditEvents: any[];
  complianceEvents: any[];
  reports: any[];
}
