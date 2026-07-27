import type { ClientContractRecord } from '../../hooks/useClientState';

export type CrmGovImplementationStatus =
  | 'preparation'
  | 'in_progress'
  | 'waiting_client'
  | 'training'
  | 'go_live'
  | 'completed'
  | 'blocked';

export interface CrmGovImplementationChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
}

export interface CrmGovImplementationPlan {
  title: string;
  status: CrmGovImplementationStatus;
  progress: number;
  responsible: string;
  expectedGoLiveDate: string;
  contractId?: string;
  checklist: CrmGovImplementationChecklistItem[];
  notes: string;
}

/**
 * CrmGovImplementationService
 *
 * Cria o plano operacional inicial de implantação a partir de um contrato.
 * Nesta fase não cria tarefas no backend oficial; apenas estrutura o dossiê do cliente.
 */
export class CrmGovImplementationService {
  static generateFromContract(clientName: string, contract: ClientContractRecord): CrmGovImplementationPlan {
    const implementationDays = contract.implementationDays || 60;

    return {
      title: `Implantação — ${clientName}`,
      status: 'preparation',
      progress: 0,
      responsible: 'Equipe de implantação Oi Beta',
      expectedGoLiveDate: toDateInput(addDays(new Date(), implementationDays)),
      contractId: contract.id,
      checklist: createDefaultChecklist(),
      notes: `Plano inicial gerado pela Beta a partir do contrato ${contract.title}.`,
    };
  }

  static calculateProgress(checklist: CrmGovImplementationChecklistItem[]): number {
    if (checklist.length === 0) return 0;

    const done = checklist.filter((item) => item.done).length;

    return Math.round((done / checklist.length) * 100);
  }

  static resolveStatus(progress: number): CrmGovImplementationStatus {
    if (progress >= 100) return 'completed';
    if (progress >= 80) return 'go_live';
    if (progress >= 55) return 'training';
    if (progress > 0) return 'in_progress';

    return 'preparation';
  }
}

function createDefaultChecklist(): CrmGovImplementationChecklistItem[] {
  return [
    {
      id: 'environment',
      label: 'Ambiente',
      description: 'Preparar ambiente do cliente e organização inicial.',
      done: false,
    },
    {
      id: 'database',
      label: 'Banco de Dados',
      description: 'Configurar estrutura inicial, schemas e políticas de acesso.',
      done: false,
    },
    {
      id: 'dns',
      label: 'DNS',
      description: 'Configurar domínio, subdomínio ou rota de acesso.',
      done: false,
    },
    {
      id: 'ssl',
      label: 'SSL',
      description: 'Validar certificado e acesso seguro.',
      done: false,
    },
    {
      id: 'backup',
      label: 'Backup',
      description: 'Configurar política mínima de backup operacional.',
      done: false,
    },
    {
      id: 'users',
      label: 'Usuários',
      description: 'Cadastrar usuários iniciais e estrutura hierárquica.',
      done: false,
    },
    {
      id: 'permissions',
      label: 'Permissões',
      description: 'Validar perfis, papéis e escopos por produto contratado.',
      done: false,
    },
    {
      id: 'training',
      label: 'Treinamento',
      description: 'Realizar treinamento inicial com usuários-chave.',
      done: false,
    },
    {
      id: 'go_live',
      label: 'Go Live',
      description: 'Publicar ambiente para uso oficial.',
      done: false,
    },
    {
      id: 'acceptance',
      label: 'Aceite',
      description: 'Registrar aceite operacional da implantação.',
      done: false,
    },
  ];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
