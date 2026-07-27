import React, { useState } from 'react';
import { Bot, BrainCircuit, Database, PlayCircle, ShieldCheck } from 'lucide-react';
import useBetaGovernance from '../../hooks/useBetaGovernance';
import type { BetaGovernanceAssetType } from '../../core/betaGovernance/BetaGovernanceTypes';

export default function BetaGovernancePanel() {
  const governance = useBetaGovernance();
  const [type, setType] = useState<BetaGovernanceAssetType>('knowledge');
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !owner.trim()) return;
    await governance.upsert({ type, title, owner, description, trigger: type === 'automation' ? trigger : undefined, action: type === 'automation' ? action : undefined, requiresApproval: type === 'automation', status: 'draft' });
    setTitle(''); setDescription(''); setTrigger(''); setAction('');
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-4">
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">Governança cognitiva</span>
        <h2 className="text-lg font-black text-[var(--text-main)] mt-1 flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-fuchsia-300" />Beta IA, conhecimento, memória e automações</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Catálogo auditável de fontes, memórias, habilidades e automações autorizadas.</p>
      </div>

      {governance.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{governance.error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Metric label="Ativos" value={governance.summary.total} />
        <Metric label="Em uso" value={governance.summary.active} />
        <Metric label="Conhecimento" value={governance.summary.knowledge} />
        <Metric label="Memórias" value={governance.summary.memories} />
        <Metric label="Automações" value={governance.summary.automations} />
        <Metric label="Habilidades" value={governance.summary.skills} />
        <Metric label="Revisões vencidas" value={governance.summary.overdueReviews} />
        <Metric label="Governança" value={`${governance.summary.governanceScore}%`} />
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <select value={type} onChange={e => setType(e.target.value as BetaGovernanceAssetType)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]">
          <option value="knowledge">Conhecimento</option><option value="memory">Memória</option><option value="automation">Automação</option><option value="skill">Habilidade</option>
        </select>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" />
        <input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Responsável" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" />
        <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descrição" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" />
        {type === 'automation' && <><input value={trigger} onChange={e=>setTrigger(e.target.value)} placeholder="Gatilho" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" /><input value={action} onChange={e=>setAction(e.target.value)} placeholder="Ação controlada" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-main)]" /></>}
        <button disabled={governance.isSaving} className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2 text-xs font-black text-fuchsia-200 disabled:opacity-50">Cadastrar ativo</button>
      </form>

      <div className="space-y-2">
        {governance.assets.slice(0, 12).map(asset => (
          <article key={asset.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/25 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-start gap-3">
              {asset.type === 'automation' ? <PlayCircle className="w-4 h-4 text-fuchsia-300 mt-0.5" /> : asset.type === 'knowledge' ? <Database className="w-4 h-4 text-cyan-300 mt-0.5" /> : asset.type === 'memory' ? <BrainCircuit className="w-4 h-4 text-amber-300 mt-0.5" /> : <Bot className="w-4 h-4 text-emerald-300 mt-0.5" />}
              <div><h3 className="text-sm font-black text-[var(--text-main)]">{asset.title}</h3><p className="text-[10px] text-[var(--text-secondary)] mt-1">{asset.type} · {asset.status} · responsável {asset.owner} · v{asset.version}</p><p className="text-[10px] text-[var(--text-secondary)] mt-1">{asset.description}</p></div>
            </div>
            <div className="flex gap-2">
              {asset.status !== 'active' && <button onClick={()=>void governance.setStatus(asset.id,'active',asset.owner)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-black text-emerald-200">Ativar</button>}
              {asset.status === 'active' && <button onClick={()=>void governance.setStatus(asset.id,'paused',asset.owner)} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-black text-amber-200">Pausar</button>}
            </div>
          </article>
        ))}
      </div>
      <div className="rounded-xl border border-fuchsia-500/15 bg-fuchsia-500/5 p-3 text-[10px] text-fuchsia-100 flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" />Automações ativas exigem aprovação por padrão. O cadastro não executa ações automaticamente.</div>
    </section>
  );
}
function Metric({label,value}:{label:string;value:React.ReactNode}){return <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 p-3"><span className="block text-[9px] uppercase font-black text-[var(--text-secondary)]">{label}</span><strong className="block mt-1 text-sm font-black text-[var(--text-main)]">{value}</strong></div>}
