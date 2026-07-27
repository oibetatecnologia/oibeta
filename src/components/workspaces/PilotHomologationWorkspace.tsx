import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, Rocket, Search, ShieldCheck, Users } from 'lucide-react';
import useAdminDirectory from '../../hooks/useAdminDirectory';
import { getTenantStatusLabel } from '../../core/tenants/TenantRegistry';

interface PilotRow {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  products: number;
  activeUsers: number;
  invitedUsers: number;
  hasActiveAdmin: boolean;
  score: number;
  blockers: string[];
}

export default function PilotHomologationWorkspace() {
  const directory = useAdminDirectory();
  const [query, setQuery] = useState('');

  const rows = useMemo<PilotRow[]>(() => directory.tenants.map((tenant) => {
    const users = directory.users.filter((user) => user.tenantId === tenant.id || user.organizationId === tenant.organizationId);
    const activeUsers = users.filter((user) => user.status === 'active').length;
    const invitedUsers = users.filter((user) => user.status === 'invited').length;
    const hasActiveAdmin = users.some((user) => user.profile === 'tenant_admin' && user.status === 'active');
    const checks = [tenant.status === 'active', tenant.licensedProductIds.length > 0, activeUsers > 0, hasActiveAdmin];
    const blockers = [
      tenant.status !== 'active' && 'Ativar tenant',
      tenant.licensedProductIds.length === 0 && 'Liberar produto',
      activeUsers === 0 && 'Ativar usuário',
      !hasActiveAdmin && 'Confirmar administrador',
    ].filter(Boolean) as string[];

    return {
      id: tenant.id,
      organizationId: tenant.organizationId,
      name: tenant.name,
      status: getTenantStatusLabel(tenant.status),
      products: tenant.licensedProductIds.length,
      activeUsers,
      invitedUsers,
      hasActiveAdmin,
      score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
      blockers,
    };
  }), [directory.tenants, directory.users]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return rows;
    return rows.filter((row) => `${row.name} ${row.organizationId} ${row.status}`.toLocaleLowerCase('pt-BR').includes(normalized));
  }, [query, rows]);

  const ready = rows.filter((row) => row.score === 100).length;
  const eligible = rows.filter((row) => row.score >= 75).length;
  const blocked = rows.filter((row) => row.score < 75).length;

  const exportReport = () => {
    const header = ['Organização', 'Organization ID', 'Status', 'Produtos', 'Usuários ativos', 'Convites pendentes', 'Administrador ativo', 'Prontidão', 'Pendências'];
    const body = rows.map((row) => [
      row.name,
      row.organizationId,
      row.status,
      String(row.products),
      String(row.activeUsers),
      String(row.invitedUsers),
      row.hasActiveAdmin ? 'Sim' : 'Não',
      `${row.score}%`,
      row.blockers.join(' | ') || 'Nenhuma',
    ]);
    const csv = [header, ...body].map((line) => line.map((value) => `"${value.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `homologacao-piloto-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
      <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-cyan-300 font-black">Oi Beta / Homologação</span>
      <div className="mt-2 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div>
          <h1 className="flex items-center gap-3 text-2xl lg:text-4xl font-black text-[var(--text-main)]"><Rocket className="w-7 h-7 text-cyan-300" />Clientes piloto</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-3xl">Seleção objetiva de organizações aptas à homologação, calculada somente com dados reais do diretório administrativo.</p>
        </div>
        <button type="button" onClick={exportReport} disabled={rows.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs font-black text-cyan-200 disabled:opacity-50"><Download className="w-4 h-4" />Exportar relatório</button>
      </div>
    </section>

    {directory.error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{directory.error}</div>}

    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Metric label="Prontos" value={ready} helper="100% dos critérios" />
      <Metric label="Elegíveis" value={eligible} helper="75% ou mais" />
      <Metric label="Bloqueados" value={blocked} helper="Abaixo de 75%" />
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
      <label className="relative block max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar organização, ID ou status" className="w-full rounded-xl border border-[var(--border-color)] bg-black/10 py-2.5 pl-10 pr-3 text-sm text-[var(--text-main)] outline-none focus:border-cyan-400/40" /></label>
    </section>

    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-[var(--border-color)] text-[var(--text-secondary)]"><tr><th className="p-4">Organização</th><th className="p-4">Estrutura</th><th className="p-4">Prontidão</th><th className="p-4">Decisão</th><th className="p-4">Próximas ações</th></tr></thead><tbody>
        {filteredRows.map((row) => <tr key={row.id} className="border-b border-[var(--border-color)] last:border-0"><td className="p-4"><div className="font-black text-[var(--text-main)]">{row.name}</div><div className="mt-1 text-[var(--text-secondary)]">{row.organizationId} • {row.status}</div></td><td className="p-4 text-[var(--text-secondary)]"><div>{row.products} produto(s)</div><div>{row.activeUsers} ativo(s) • {row.invitedUsers} convite(s)</div></td><td className="p-4 min-w-[170px]"><div className="flex items-center justify-between"><strong className="text-[var(--text-main)]">{row.score}%</strong>{row.score === 100 ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertTriangle className="w-4 h-4 text-amber-300" />}</div><div className="mt-2 h-2 rounded-full bg-black/20 overflow-hidden"><div className="h-full bg-cyan-300" style={{ width: `${row.score}%` }} /></div></td><td className="p-4">{row.score === 100 ? <Badge tone="ready" label="Pronto para piloto" /> : row.score >= 75 ? <Badge tone="attention" label="Piloto condicionado" /> : <Badge tone="blocked" label="Ainda não liberar" />}</td><td className="p-4 text-[var(--text-secondary)] max-w-sm">{row.blockers.length ? row.blockers.join(' • ') : 'Nenhuma pendência operacional.'}</td></tr>)}
      </tbody></table></div>
      {!directory.isLoading && filteredRows.length === 0 && <div className="p-8 text-center text-sm text-[var(--text-secondary)]">Nenhuma organização encontrada.</div>}
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Info icon={<ShieldCheck className="w-4 h-4" />} title="Critérios objetivos" text="Tenant ativo, produto licenciado, usuário ativo e administrador ativo." />
      <Info icon={<Users className="w-4 h-4" />} title="Uso controlado" text="A tela não cria clientes nem altera permissões; ela apenas consolida o estado atual." />
      <Info icon={<ClipboardCheck className="w-4 h-4" />} title="Evidência exportável" text="O CSV registra a situação usada para decidir o início da homologação." />
    </section>
  </div>;
}

function Metric({ label, value, helper }: { label: string; value: React.ReactNode; helper: string }) { return <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="text-[10px] uppercase tracking-[0.18em] font-black text-[var(--text-secondary)]">{label}</div><div className="mt-3 text-2xl font-black text-[var(--text-main)]">{value}</div><div className="mt-1 text-[10px] text-[var(--text-secondary)]">{helper}</div></div>; }
function Badge({ tone, label }: { tone: 'ready' | 'attention' | 'blocked'; label: string }) { const classes = tone === 'ready' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : tone === 'attention' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-red-500/20 bg-red-500/10 text-red-300'; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${classes}`}>{label}</span>; }
function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex items-center gap-2 text-sm font-black text-[var(--text-main)]">{icon}{title}</div><p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{text}</p></article>; }
