import React, { useState } from 'react';
import { CheckCircle2, Database, ExternalLink, Globe2, LockKeyhole, ShieldAlert } from 'lucide-react';
import type { CutoverReadinessSummary, CutoverStatus } from '../../core/cutover/CutoverReadinessTypes';
import type { Task } from '../../types';

const statusLabel: Record<CutoverStatus, string> = { healthy: 'Saudável', attention: 'Atenção', critical: 'Crítico' };
const statusClass: Record<CutoverStatus, string> = {
  healthy: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
  attention: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
  critical: 'text-red-300 border-red-500/20 bg-red-500/10',
};

export default function CutoverCommandCenter({ summary, tasks, onCreateTask }: { summary: CutoverReadinessSummary; tasks: Task[]; onCreateTask: (title: string) => Promise<void> }) {
  const [creating, setCreating] = useState<string | null>(null);
  const openTitles = new Set(tasks.filter((task) => task.status !== 'completed').map((task) => task.title.trim().toLowerCase()));

  return <section className="space-y-4">
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-cyan-300 font-black">Macro Lote 32</span>
          <h2 className="text-2xl font-black text-[var(--text-main)] mt-2 flex items-center gap-3"><LockKeyhole className="w-6 h-6 text-cyan-300" />Centro de Cutover SaaS</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl">Prontidão para migrar a Beta Platform do modo local para autenticação, persistência e isolamento multi-tenant de produção.</p>
        </div>
        <div className={`rounded-2xl border px-5 py-4 ${statusClass[summary.status]}`}>
          <span className="text-[10px] uppercase font-mono font-black block">Prontidão geral</span>
          <strong className="text-3xl font-black block mt-1">{summary.score}%</strong>
          <span className="text-xs font-bold">{statusLabel[summary.status]}</span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Metric icon={<Database className="w-4 h-4" />} label="Banco ativo" value={summary.databaseMode.toUpperCase()} helper={`${summary.readyTables}/${summary.requiredTables} tabelas`} />
      <Metric icon={<LockKeyhole className="w-4 h-4" />} label="Sessão" value={`${summary.sessionScore}%`} helper="Autenticação e restauração" />
      <Metric icon={<ShieldAlert className="w-4 h-4" />} label="Multi-tenant" value={`${summary.tenantScore}%`} helper="Cobertura de acesso" />
      <Metric icon={<CheckCircle2 className="w-4 h-4" />} label="Produção" value={`${summary.productionScore}%`} helper={summary.fallbackProductionSafe ? 'Fallback seguro' : 'Fallback requer bloqueio'} />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {summary.gates.map((gate) => {
        const exists = openTitles.has(gate.taskTitle.toLowerCase());
        return <article key={gate.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-[var(--text-main)]">{gate.title}</h3><p className="text-xs text-[var(--text-secondary)] mt-1">{gate.description}</p></div><span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${statusClass[gate.status]}`}>{gate.score}%</span></div>
          <div className="mt-3 h-2 rounded-full bg-[var(--bg-main)] overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${gate.score}%` }} /></div>
          <p className="text-xs text-[var(--text-secondary)] mt-3">{gate.evidence}</p>
          {gate.status !== 'healthy' && <button type="button" disabled={exists || creating === gate.id} onClick={async () => { setCreating(gate.id); try { await onCreateTask(gate.taskTitle); } finally { setCreating(null); } }} className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-black text-cyan-200 disabled:opacity-50 cursor-pointer">{exists ? 'Encaminhada' : creating === gate.id ? 'Criando...' : 'Criar tarefa de cutover'}</button>}
        </article>;
      })}
    </div>

    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center gap-2"><Globe2 className="w-5 h-5 text-cyan-300" /><h3 className="text-lg font-black text-[var(--text-main)]">Arquitetura oficial de domínios</h3></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <DomainCard title="Página institucional" url={summary.domainPlan.institutionalUrl} stack={summary.domainPlan.institutionalStack} description="Site comercial em Next.js com apresentação da Oi Beta e botão de login." />
        <DomainCard title="Sistema SaaS" url={summary.domainPlan.applicationUrl} stack={summary.domainPlan.applicationStack} description="Aplicação autenticada da Beta Platform. O botão de login da página institucional apontará para este endereço." />
      </div>
    </div>
  </section>;
}

function Metric({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) { return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="text-cyan-300">{icon}</div><span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block mt-3">{label}</span><strong className="text-xl font-black text-[var(--text-main)] block mt-1">{value}</strong><span className="text-xs text-[var(--text-secondary)]">{helper}</span></div>; }
function DomainCard({ title, url, stack, description }: { title: string; url: string; stack: string; description: string }) { return <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-black text-[var(--text-main)]">{title}</h4><p className="text-xs text-[var(--text-secondary)] mt-1">{description}</p></div><ExternalLink className="w-4 h-4 text-cyan-300" /></div><code className="text-xs text-cyan-200 block mt-3 break-all">{url}</code><span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)] block mt-2">{stack}</span></article>; }
