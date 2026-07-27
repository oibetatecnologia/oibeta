import type { IntegrationHealthSignal } from './IntegrationTypes';

export class IntegrationTaskService {
  static buildTaskTitle(signal: IntegrationHealthSignal): string {
    return signal.taskTitle;
  }

  static buildTaskDescription(signal: IntegrationHealthSignal): string {
    return `${signal.title}: ${signal.description}`;
  }

  static buildPriorityLabel(signal: IntegrationHealthSignal): string {
    if (signal.priority === 'alta') return 'Alta prioridade';
    if (signal.priority === 'média') return 'Média prioridade';

    return 'Baixa prioridade';
  }
}
