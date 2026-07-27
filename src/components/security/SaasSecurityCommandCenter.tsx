import React, { useState } from 'react';
import { CheckCircle2, Database, KeyRound, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import type { Task } from '../../types';
import type { SaasSecurityReadiness } from '../../core/security/SaasSecurityTypes';

const styles = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  attention: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
};
const labels = { healthy: 'Saudável', attention: 'Atenção', critical: 'Crítico' };

export default function SaasSecurityCommandCenter({ summary, tasks, onCreateTask, onRefresh }: { summary: SaasSecurityReadiness; tasks: Task[]; onCreateTask: (title: string) => Promise<void>; onRefresh: () => Promise<void> }) {
  const [creating, setCreating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const open = new Set(tasks.filter((task) => task.status !== 'completed').map((task) => task.title.trim().toLowerCase()));

  return <section className="space-y-4">
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div><span className="text-[10px] uppercase font-mono tracking-[0.28em] text-violet-300 font-black">Macro Lote 33</span><h2 className="mt-2 text-2xl font-black text-[var(--text-main)] flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-violet-300" />Segurança SaaS e RLS</h2><p className="mt-2 text-sm text-[var(--text-secondary)] max-w-3xl">Validação do vínculo real entre usuário, organização, workspace, produtos licenciados e políticas de isolamento no Supabase.</p></div>
        <div className="flex items-stretch gap-3"><button type="button" onClick={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }} className="rounded-2xl border border-[var(--border-color)] px-4 text-sm font-bold text-[var(--text-main)] flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Atualizar</button><div className={`rounded-2xl border px-5 py-4 ${styles[summary.status]}`}><span className="text-[10px] uppercase font-mono font-black block">Prontidão</span><strong className="text-3xl font-black block">{summary.score}%</strong><span className="text-xs font-bold">{labels[summary.status]}</span></div></div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Metric icon={<Database className="w-4 h-4" />} label="Banco" value={summary.databaseMode.toUpperCase()} helper={`${summary.tablesReady}/${summary.tablesRequired} tabelas de segurança`} />
      <Metric icon={<UsersRound className="w-4 h-4" />} label="Vínculos" value={summary.membershipTablesReady ? 'Prontos' : 'Pendentes'} helper="Usuário, organização e workspace" />
      <Metric icon={<KeyRound className="w-4 h-4" />} label="Sessão" value={summary.authenticated ? 'Validada' : 'Local'} helper={`Origem: ${summary.sessionSource}`} />
      <Metric icon={<CheckCircle2 className="w-4 h-4" />} label="RLS" value={`${summary.rlsEnabledTables}`} helper="Tabelas essenciais protegidas" />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{summary.gates.map((gate) => {
      const exists = open.has(gate.taskTitle.toLowerCase());
      return <article key={gate.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-black text-[var(--text-main)]">{gate.title}</h3><p className="text-xs text-[var(--text-secondary)] mt-1">{gate.evidence}</p></div><span className={`text-[10px] font-black uppercase rounded-full border px-2.5 py-1 ${styles[gate.status]}`}>{gate.score}%</span></div><div className="h-2 mt-4 rounded-full bg-[var(--bg-main)] overflow-hidden"><div className="h-full bg-violet-400" style={{ width: `${gate.score}%` }} /></div>{gate.status !== 'healthy' && <button type="button" disabled={exists || creating === gate.id} onClick={async () => { setCreating(gate.id); try { await onCreateTask(gate.taskTitle); } finally { setCreating(null); } }} className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-black text-violet-200 disabled:opacity-50">{exists ? 'Encaminhada' : creating === gate.id ? 'Criando...' : 'Criar tarefa de segurança'}</button>}</article>;
    })}</div>
  </section>;
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) { return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="text-violet-300">{icon}</div><span className="mt-3 block text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">{label}</span><strong className="mt-1 block text-xl font-black text-[var(--text-main)]">{value}</strong><span className="text-xs text-[var(--text-secondary)]">{helper}</span></div>; }
