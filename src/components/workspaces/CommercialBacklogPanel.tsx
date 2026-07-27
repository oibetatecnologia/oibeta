import React from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';
import { CommercialTaskRepository } from '../../core/commercial/CommercialTaskRepository';
import type { StoredCommercialTask } from '../../core/commercial/CommercialTaskStorage';

interface CommercialBacklogPanelProps {
  tasks: StoredCommercialTask[];
  onClear: () => void;
}

export default function CommercialBacklogPanel({ tasks, onClear }: CommercialBacklogPanelProps) {
  const handleClear = async () => {
    await CommercialTaskRepository.clear();
    onClear();
  };

  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[var(--blue-accent)]" />
            Backlog comercial gerado pela Beta
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Tarefas criadas a partir das análises de editais. No próximo ciclo, elas serão integradas ao módulo oficial de Desenvolvimento/Tarefas.
          </p>
        </div>

        {tasks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              handleClear();
            }}
            className="px-3 py-2 rounded-xl border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar backlog
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-2xl p-6 text-center bg-[var(--bg-main)]/20">
          <h3 className="text-sm font-black text-[var(--text-main)]">Nenhuma tarefa gerada</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            Analise uma oportunidade e clique em “Criar tarefas no desenvolvimento”.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="p-3 rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-[var(--text-main)]">{task.title}</h3>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">{task.description}</p>
                  {task.relatedProductId && (
                    <p className="text-[10px] text-[var(--blue-accent)] font-mono mt-1">
                      Produto: {task.relatedProductId}
                    </p>
                  )}
                </div>
                <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
