import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, ExternalLink, Globe2, RefreshCw, Rocket, ShieldCheck } from 'lucide-react';
import type { Task } from '../../types';
import type { ProductionGateStatus, ProductionOperationsSummary } from '../../core/productionOperations/ProductionOperationsTypes';

const STATUS: Record<ProductionGateStatus, { label: string; classes: string }> = {
  healthy: { label: 'Saudável', classes: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  attention: { label: 'Atenção', classes: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  critical: { label: 'Crítico', classes: 'text-red-300 bg-red-500/10 border-red-500/20' },
};

interface Props {
  summary?: ProductionOperationsSummary;
  isLoading: boolean;
  error?: string;
  tasks: Task[];
  onRefresh: () => void;
  onCreateTask: (title: string) => Promise<void>;
}

export default function ProductionOperationsCommandCenter({ summary, isLoading, error, tasks, onRefresh, onCreateTask }: Props) {
  const [creating, setCreating] = useState<string>();
  const openTitles = useMemo(() => new Set(tasks.filter((task) => task.status !== 'completed').map((task) => task.title.trim().toLowerCase())), [tasks]);

  if (!summary) {
    return <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">{isLoading ? 'Carregando prontidão de produção...' : error || 'Não foi possível carregar a prontidão de produção.'}</section>;
  }

  return <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 lg:p-7 space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <span className="text-[10px] uppercase font-mono tracking-[0.26em] text-sky-300 font-black">Produção / Go-live</span>
        <h2 className="mt-2 flex items-center gap-3 text-xl lg:text-2xl font-black text-[var(--text-main)]"><Cloud className="w-6 h-6 text-sky-300" />Centro de Operação Online</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">Consolida configuração, conectividade, domínios, CORS, Supabase e condições mínimas para publicar a Beta Platform em app.oibeta.com.br.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl border px-4 py-3 ${STATUS[summary.status].classes}`}><div className="text-[10px] uppercase font-black">Prontidão</div><div className="text-2xl font-black">{summary.score}%</div><div className="text-xs">{STATUS[summary.status].label}</div></div>
        <button type="button" onClick={onRefresh} disabled={isLoading} className="rounded-xl border border-[var(--border-color)] p-3 text-[var(--text-secondary)] hover:text-[var(--text-main)] disabled:opacity-50" title="Atualizar"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
      </div>
    </div>

    {error && <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">{error}</div>}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {summary.domains.map((domain) => <article key={domain.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-4">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase font-black tracking-[0.18em] text-[var(--text-secondary)]">{domain.label}</div><div className="mt-1 flex items-center gap-2 font-black text-[var(--text-main)]"><Globe2 className="w-4 h-4 text-sky-300" />{domain.hostname}</div></div><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${STATUS[domain.status].classes}`}>{STATUS[domain.status].label}</span></div>
        <div className="mt-3 text-xs text-[var(--text-secondary)]"><strong className="text-[var(--text-main)]">Tecnologia:</strong> {domain.technology}</div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{domain.responsibility}</p>
        <p className="mt-2 text-[11px] text-[var(--text-secondary)]">{domain.evidence}</p>
        <a href={domain.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-sky-300">Abrir endereço <ExternalLink className="w-3.5 h-3.5" /></a>
      </article>)}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {summary.gates.map((gate) => {
        const exists = openTitles.has(gate.taskTitle.toLowerCase());
        return <article key={gate.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4">
          <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3">{gate.status === 'healthy' ? <CheckCircle2 className="mt-0.5 w-5 h-5 text-emerald-300" /> : <AlertTriangle className="mt-0.5 w-5 h-5 text-amber-300" />}<div><h3 className="text-sm font-black text-[var(--text-main)]">{gate.title}</h3><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{gate.description}</p></div></div><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${STATUS[gate.status].classes}`}>{gate.score}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20"><div className="h-full bg-sky-300" style={{ width: `${gate.score}%` }} /></div>
          {gate.status !== 'healthy' && <button type="button" disabled={exists || creating === gate.id} onClick={async () => { setCreating(gate.id); try { await onCreateTask(gate.taskTitle); } finally { setCreating(undefined); } }} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-black text-sky-200 disabled:opacity-50"><Rocket className="w-3.5 h-3.5" />{exists ? 'Encaminhada' : creating === gate.id ? 'Criando...' : 'Criar tarefa'}</button>}
        </article>;
      })}
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
      <Metric icon={<ShieldCheck className="w-4 h-4" />} label="Configuração" value={`${summary.configuration.score}%`} />
      <Metric icon={<Globe2 className="w-4 h-4" />} label="Conectividade" value={`${summary.connectivity.score}%`} />
      <Metric icon={<Cloud className="w-4 h-4" />} label="Banco" value={summary.configuration.databaseMode} />
      <Metric icon={<Rocket className="w-4 h-4" />} label="Liberação" value={summary.productionBlocked ? 'Bloqueada' : 'Liberável'} />
    </div>
  </section>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-3"><div className="flex items-center justify-center gap-2 text-[10px] uppercase font-black text-[var(--text-secondary)]">{icon}{label}</div><div className="mt-2 text-sm font-black text-[var(--text-main)]">{value}</div></div>;
}
