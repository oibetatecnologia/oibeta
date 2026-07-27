import React, { useMemo, useState } from 'react';
import { Activity, Download, Filter, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import useAdminAudit from '../../hooks/useAdminAudit';

const ACTION_LABELS: Record<string, string> = {
  tenant_created: 'Organização criada',
  user_invited: 'Usuário convidado',
  user_updated: 'Usuário atualizado',
  user_invitation_resent: 'Convite reenviado',
  user_invitation_cancelled: 'Convite cancelado',
  product_licenses_updated: 'Licenças atualizadas',
  environment_updated: 'Ambiente atualizado',
  deployment_recorded: 'Implantação registrada',
  directory_viewed: 'Diretório consultado',
  access_review_created: 'Revisão de acesso criada',
  access_review_decided: 'Revisão de acesso decidida',
  commercial_contract_updated: 'Contrato atualizado',
  customer_operations_updated: 'Operação atualizada',
};

export default function ClientAuditWorkspace() {
  const { entries, summary, isLoading, error, refresh } = useAdminAudit(250);
  const [query, setQuery] = useState('');
  const [entity, setEntity] = useState('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return entries.filter((entry) => {
      const matchesEntity = entity === 'all' || entry.entityType === entity;
      const matchesQuery = !normalized || [entry.description, entry.actorName, entry.actionType, entry.entityId]
        .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(normalized));
      return matchesEntity && matchesQuery;
    });
  }, [entries, entity, query]);

  const exportCsv = () => {
    const rows = [
      ['Data', 'Usuário', 'Ação', 'Entidade', 'Descrição'],
      ...filtered.map((entry) => [
        new Date(entry.createdAt).toLocaleString('pt-BR'),
        entry.actorName || entry.actorUserId,
        ACTION_LABELS[entry.actionType] || entry.actionType,
        entry.entityType,
        entry.description,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Governança do tenant</p>
          <h1 className="mt-2 text-2xl font-black text-[var(--text-main)]">Histórico de auditoria</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Ações críticas registradas exclusivamente no contexto da organização atual.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void refresh()} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-bold text-[var(--text-main)]"><RefreshCw className="h-4 w-4" />Atualizar</button>
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-2 rounded-xl bg-[var(--blue-accent)] px-3 py-2 text-xs font-black text-white disabled:opacity-50"><Download className="h-4 w-4" />Exportar CSV</button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><Activity className="h-5 w-5 text-[var(--blue-accent)]" /><p className="mt-3 text-xs text-[var(--text-secondary)]">Eventos carregados</p><p className="mt-1 text-2xl font-black text-[var(--text-main)]">{summary.totalEntries}</p></article>
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><UserRound className="h-5 w-5 text-[var(--blue-accent)]" /><p className="mt-3 text-xs text-[var(--text-secondary)]">Atores identificados</p><p className="mt-1 text-2xl font-black text-[var(--text-main)]">{summary.activeActors}</p></article>
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><ShieldCheck className="h-5 w-5 text-[var(--blue-accent)]" /><p className="mt-3 text-xs text-[var(--text-secondary)]">Eventos de usuários</p><p className="mt-1 text-2xl font-black text-[var(--text-main)]">{summary.userEvents}</p></article>
      </section>

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3"><Search className="h-4 w-4 text-[var(--text-secondary)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por usuário, ação ou descrição" className="w-full bg-transparent py-2.5 text-sm text-[var(--text-main)] outline-none" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3"><Filter className="h-4 w-4 text-[var(--text-secondary)]" /><select value={entity} onChange={(event) => setEntity(event.target.value)} className="w-full bg-transparent py-2.5 text-sm text-[var(--text-main)] outline-none"><option value="all">Todas as entidades</option><option value="user">Usuários</option><option value="tenant">Organização</option><option value="directory">Diretórios</option></select></label>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      <section className="space-y-3">
        {isLoading && <p className="text-sm text-[var(--text-secondary)]">Carregando auditoria...</p>}
        {!isLoading && filtered.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-bold text-[var(--text-main)]">{ACTION_LABELS[entry.actionType] || entry.actionType}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{entry.description}</p></div>
              <time className="text-xs text-[var(--text-secondary)]">{new Date(entry.createdAt).toLocaleString('pt-BR')}</time>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]"><span>{entry.actorName || entry.actorUserId}</span><span>•</span><span>{entry.entityType}</span><span>•</span><span>{entry.entityId}</span></div>
          </article>
        ))}
        {!isLoading && filtered.length === 0 && <p className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">Nenhum evento encontrado para os filtros selecionados.</p>}
      </section>
    </div>
  );
}
