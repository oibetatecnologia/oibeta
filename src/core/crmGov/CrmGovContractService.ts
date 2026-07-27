import type { ClientProposalRecord } from '../../hooks/useClientState';

export type CrmGovContractStatus = 'draft' | 'ready' | 'signed' | 'active' | 'expired' | 'cancelled';

export interface CrmGovContractDraft {
  title: string;
  status: CrmGovContractStatus;
  contractValue: number;
  monthlyValue: number;
  setupValue: number;
  startDate: string;
  endDate: string;
  implementationDays: number;
  scope: string[];
  clauses: string[];
  notes: string;
}

/**
 * CrmGovContractService
 *
 * Gera uma minuta operacional de contrato a partir de uma proposta aceita ou em negociação.
 * Nesta fase não gera PDF nem substitui análise jurídica.
 */
export class CrmGovContractService {
  static generateFromProposal(clientName: string, proposal: ClientProposalRecord): CrmGovContractDraft {
    const now = new Date();
    const startDate = toDateInput(now);
    const endDate = toDateInput(addMonths(now, 12));

    const contractValue = proposal.estimatedValue || 0;
    const setupValue = Math.round(contractValue * 0.2);
    const monthlyValue = Math.round((contractValue - setupValue) / 12);

    return {
      title: `Contrato — ${clientName} — ${proposal.title}`,
      status: 'draft',
      contractValue,
      monthlyValue: monthlyValue > 0 ? monthlyValue : 0,
      setupValue: setupValue > 0 ? setupValue : 0,
      startDate,
      endDate,
      implementationDays: 60,
      scope: [
        'Licenciamento de uso da Beta Platform conforme proposta comercial.',
        'Implantação inicial do ambiente do cliente.',
        'Configuração dos produtos contratados.',
        'Treinamento inicial da equipe indicada pelo órgão.',
        'Suporte operacional durante a vigência contratual.',
      ],
      clauses: [
        'A vigência inicial sugerida é de 12 meses.',
        'Os valores gerados são referenciais e devem ser validados comercial e juridicamente.',
        'A implantação depende do envio das informações técnicas e administrativas pelo contratante.',
        'Novos módulos ou integrações poderão ser contratados por aditivo ou nova proposta.',
      ],
      notes: proposal.notes || 'Minuta inicial gerada pela Beta a partir da proposta comercial selecionada.',
    };
  }
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
