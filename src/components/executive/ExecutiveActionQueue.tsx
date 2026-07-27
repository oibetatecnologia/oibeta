import React from 'react';
import { ArrowRight, CheckSquare2, Radar } from 'lucide-react';
import type { ExecutiveActionItem } from '../../core/executive/ExecutiveCommandTypes';
import SeverityBadge from '../shared/SeverityBadge';

export default function ExecutiveActionQueue({ items, creatingId, onOpen, onCreateTask }: {
  items: ExecutiveActionItem[];
  creatingId: string | null;
  onOpen: (tab: string) => void;
  onCreateTask: (item: ExecutiveActionItem) => void;
}) {
  return <div className="space-y-3">
    {items.length === 0 ? <p className="text-xs text-[var(--text-secondary)]">Nenhuma ação crítica identificada neste momento.</p> : items.map((item) => (
      <div key={item.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2 min-w-0">{item.kind === 'commercial' ? <Radar className="w-4 h-4 mt-0.5 text-blue-300 shrink-0" /> : <CheckSquare2 className="w-4 h-4 mt-0.5 text-indigo-300 shrink-0" />}<div className="min-w-0"><h4 className="text-xs font-black text-[var(--text-main)] truncate">{item.title}</h4><p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{item.description}</p></div></div>
          <SeverityBadge severity={item.severity} />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={() => onOpen(item.targetTab)} className="text-[10px] font-black px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-main)] hover:bg-white/5 inline-flex items-center gap-1">Abrir área <ArrowRight className="w-3 h-3" /></button>
          <button type="button" disabled={creatingId === item.id} onClick={() => onCreateTask(item)} className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-200 disabled:opacity-50">{creatingId === item.id ? 'Criando...' : 'Criar ação'}</button>
        </div>
      </div>
    ))}
  </div>;
}
