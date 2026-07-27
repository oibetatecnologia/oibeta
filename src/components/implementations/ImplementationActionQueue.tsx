import React from 'react';
import { CheckCircle2, ListChecks } from 'lucide-react';
import type { ImplementationActionItem } from '../../core/implementations/ImplementationIntelligenceTypes';

export default function ImplementationActionQueue({ actions, creatingId, onCreateTask }: { actions: ImplementationActionItem[]; creatingId: string | null; onCreateTask: (action: ImplementationActionItem) => void }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="flex items-center gap-3"><ListChecks className="w-5 h-5 text-[var(--blue-accent)]" /><div><span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">Plano de recuperação</span><h3 className="text-base font-black text-[var(--text-main)] mt-1">Ações prioritárias</h3></div></div>
      {actions.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Nenhuma ação crítica identificada.</p> : (
        <div className="space-y-3">
          {actions.slice(0, 8).map((action) => (
            <article key={action.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-[var(--text-main)]">{action.title}</span><span className="text-[9px] uppercase font-black rounded-full border border-[var(--border-color)] px-2 py-1 text-[var(--text-secondary)]">{action.priority}</span></div><p className="text-xs text-[var(--text-secondary)] mt-1">{action.clientName} · {action.description}</p></div>
                <button type="button" disabled={action.alreadyCreated || creatingId === action.id} onClick={() => onCreateTask(action)} className="rounded-lg border border-[var(--blue-accent)]/30 bg-[var(--blue-accent)]/10 px-3 py-2 text-[10px] font-black text-[var(--cyan-accent)] disabled:opacity-50 disabled:cursor-not-allowed">
                  {action.alreadyCreated ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Encaminhada</span> : creatingId === action.id ? 'Criando...' : 'Criar tarefa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
