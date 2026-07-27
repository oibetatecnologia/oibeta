import React from 'react';
import type { Task } from '../../types';

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : 'Sem prazo';

export default function ExecutiveTaskSpotlight({ tasks, onOpen }: { tasks: Task[]; onOpen: () => void }) {
  return <div className="space-y-2">{tasks.length === 0 ? <p className="text-xs text-[var(--text-secondary)]">Nenhuma tarefa com vencimento próximo.</p> : tasks.map((task) => (
    <button type="button" onClick={onOpen} key={task.id} className="w-full text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3 hover:border-indigo-500/30 transition-colors">
      <div className="text-xs font-black text-[var(--text-main)] line-clamp-1">{task.title}</div>
      <div className="text-[10px] text-[var(--text-secondary)] mt-1">Vencimento: {formatDate(task.dueDate)} · {task.status === 'in_progress' ? 'Em execução' : 'Pendente'}</div>
    </button>
  ))}</div>;
}
