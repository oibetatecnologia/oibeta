import React, { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
} from 'lucide-react';
import useOperationalIncidents from '../../hooks/useOperationalIncidents';
import type {
  OperationalIncident,
  OperationalIncidentSeverity,
  OperationalIncidentStatus,
} from '../../core/observability/OperationalIncidentTypes';

const STATUS_LABELS: Record<OperationalIncidentStatus, string> = {
  open: 'Aberto',
  investigating: 'Em investigação',
  mitigated: 'Mitigado',
  resolved: 'Resolvido',
};

const SEVERITY_LABELS: Record<OperationalIncidentSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

const SEVERITY_CLASSES: Record<OperationalIncidentSeverity, string> = {
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  low: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function OperationalIncidentsWorkspace() {
  const {
    incidents,
    summary,
    isLoading,
    isSaving,
    error,
    refresh,
    synchronizeDetected,
    updateIncident,
  } = useOperationalIncidents(250);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | OperationalIncidentStatus>('all');
  const [severity, setSeverity] = useState<'all' | OperationalIncidentSeverity>('all');
  const [editingId, setEditingId] = useState<string>();
  const [owner, setOwner] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesQuery = !normalized || [
        incident.title,
        incident.description,
        incident.source,
        incident.owner,
      ].some((value) => value?.toLowerCase().includes(normalized));
      return matchesQuery
        && (status === 'all' || incident.status === status)
        && (severity === 'all' || incident.severity === severity);
    });
  }, [incidents, query, severity, status]);

  const beginEdit = (incident: OperationalIncident) => {
    setEditingId(incident.id);
    setOwner(incident.owner || '');
    setResolutionNotes(incident.resolutionNotes || '');
  };

  const changeStatus = async (
    incident: OperationalIncident,
    nextStatus: OperationalIncidentStatus,
  ) => {
    await updateIncident(incident.id, {
      status: nextStatus,
      owner: editingId === incident.id ? owner : incident.owner,
      resolutionNotes: editingId === incident.id
        ? resolutionNotes
        : incident.resolutionNotes,
    });
    setEditingId(undefined);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-red-300">
            <Siren size={20} />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Operação RC-1</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Central de incidentes</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Registro, triagem, responsabilização e encerramento de incidentes operacionais por organização.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button
            type="button"
            onClick={() => void synchronizeDetected()}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-50"
          >
            <ShieldAlert size={16} /> Verificar agora
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {([
          ['Ativos', summary.open + summary.investigating + summary.mitigated, AlertTriangle],
          ['Críticos abertos', summary.criticalOpen, ShieldAlert],
          ['Em investigação', summary.investigating, Clock3],
          ['Resolvidos', summary.resolved, CheckCircle2],
          ['Prontidão', `${summary.readinessScore}%`, CheckCircle2],
        ] as Array<[string, string | number, LucideIcon]>).map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase tracking-wide">{label}</span>
              <Icon size={17} />
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:grid-cols-[1fr_190px_190px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, origem, responsável ou descrição"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-sky-500"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value as typeof severity)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="all">Todas as severidades</option>
          {Object.entries(SEVERITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="space-y-3">
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
            Nenhum incidente encontrado para os filtros selecionados.
          </div>
        )}

        {filtered.map((incident) => (
          <article key={incident.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${SEVERITY_CLASSES[incident.severity]}`}>
                    {SEVERITY_LABELS[incident.severity]}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    {STATUS_LABELS[incident.status]}
                  </span>
                  {incident.automated && <span className="text-xs text-sky-300">Detecção automática</span>}
                  {incident.occurrenceCount > 1 && <span className="text-xs text-amber-300">{incident.occurrenceCount} ocorrências</span>}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-white">{incident.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">{incident.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  <span>Origem: {incident.source}</span>
                  <span>Aberto em: {formatDate(incident.openedAt)}</span>
                  <span>Responsável: {incident.owner || 'não definido'}</span>
                  <span>Atualizado: {formatDate(incident.updatedAt)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => beginEdit(incident)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Tratar incidente
              </button>
            </div>

            {editingId === incident.id && (
              <div className="mt-5 grid gap-3 border-t border-slate-800 pt-5 lg:grid-cols-2">
                <input
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  placeholder="Responsável pelo incidente"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <textarea
                  value={resolutionNotes}
                  onChange={(event) => setResolutionNotes(event.target.value)}
                  placeholder="Diagnóstico, mitigação ou notas de resolução"
                  rows={3}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white lg:col-span-2"
                />
                <div className="flex flex-wrap gap-2 lg:col-span-2">
                  {(['investigating', 'mitigated', 'resolved'] as OperationalIncidentStatus[]).map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      disabled={isSaving}
                      onClick={() => void changeStatus(incident, nextStatus)}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Marcar como {STATUS_LABELS[nextStatus].toLowerCase()}
                    </button>
                  ))}
                  <button type="button" onClick={() => setEditingId(undefined)} className="px-3 py-2 text-sm text-slate-400">Cancelar</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
