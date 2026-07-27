import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Gauge,
  MemoryStick,
  RefreshCw,
  Search,
  ServerCog,
  TimerReset,
  XCircle,
} from 'lucide-react';
import useRuntimeObservability from '../../hooks/useRuntimeObservability';
import type { RuntimeEndpointMetric } from '../../core/observability/RuntimeObservabilityTypes';

type SortKey = 'risk' | 'p95' | 'average' | 'requests' | 'errors';

const statusLabel = {
  healthy: 'Operacional',
  attention: 'Atenção',
  critical: 'Crítico',
} as const;

const statusClass = {
  healthy: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  attention: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  critical: 'border-red-500/20 bg-red-500/10 text-red-300',
} as const;

function endpointRisk(endpoint: RuntimeEndpointMetric): number {
  return endpoint.errorCount * 10_000 + endpoint.p95DurationMs * 10 + endpoint.averageDurationMs;
}

function formatDuration(value: number): string {
  if (value < 1_000) return `${Math.round(value)} ms`;
  return `${(value / 1_000).toFixed(2)} s`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return [days > 0 ? `${days}d` : '', `${hours}h`, `${minutes}min`].filter(Boolean).join(' ');
}

export default function ApiPerformanceWorkspace() {
  const runtime = useRuntimeObservability();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [onlyAttention, setOnlyAttention] = useState(false);

  const endpoints = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return runtime.endpoints
      .filter((endpoint) => {
        if (normalizedQuery && !`${endpoint.method} ${endpoint.path}`.toLowerCase().includes(normalizedQuery)) {
          return false;
        }
        if (onlyAttention && endpoint.errorCount === 0 && endpoint.p95DurationMs < 1_500) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (sortKey === 'p95') return right.p95DurationMs - left.p95DurationMs;
        if (sortKey === 'average') return right.averageDurationMs - left.averageDurationMs;
        if (sortKey === 'requests') return right.requestCount - left.requestCount;
        if (sortKey === 'errors') return right.errorCount - left.errorCount;
        return endpointRisk(right) - endpointRisk(left);
      });
  }, [onlyAttention, query, runtime.endpoints, sortKey]);

  const attentionEndpoints = runtime.endpoints.filter(
    (endpoint) => endpoint.errorCount > 0 || endpoint.p95DurationMs >= 1_500,
  ).length;

  const exportCsv = () => {
    const rows = [
      ['Método', 'Endpoint', 'Requisições', 'Erros', 'Média (ms)', 'P95 (ms)', 'Último status', 'Última requisição'],
      ...endpoints.map((endpoint) => [
        endpoint.method,
        endpoint.path,
        endpoint.requestCount,
        endpoint.errorCount,
        endpoint.averageDurationMs,
        endpoint.p95DurationMs,
        endpoint.lastStatusCode,
        endpoint.lastRequestAt,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `beta-performance-api-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-sky-300 font-black">Oi Beta / Operação</span>
            <h1 className="mt-2 flex items-center gap-3 text-2xl lg:text-4xl font-black text-[var(--text-main)]">
              <Gauge className="w-8 h-8 text-sky-300" /> Performance das APIs
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
              Diagnóstico do tempo de resposta, erros e consumo de memória das APIs reais da plataforma nos últimos cinco minutos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void runtime.refresh()} disabled={runtime.isLoading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-black text-[var(--text-main)] disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${runtime.isLoading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
            <button onClick={exportCsv} disabled={endpoints.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-xs font-black text-sky-300 disabled:opacity-50">
              <Download className="h-4 w-4" /> Exportar CSV
            </button>
          </div>
        </div>
      </section>

      {runtime.error && (
        <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          Não foi possível carregar as métricas: {runtime.error}
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Activity} label="Estado do runtime" value={statusLabel[runtime.status]} helper={`${runtime.requestsLastFiveMinutes} requisição(ões) em 5 min`} badgeClass={statusClass[runtime.status]} />
        <Metric icon={Clock3} label="Tempo médio" value={formatDuration(runtime.averageDurationMs)} helper={`P95 em ${formatDuration(runtime.p95DurationMs)}`} />
        <Metric icon={XCircle} label="Taxa de erros" value={`${runtime.errorRate.toFixed(2)}%`} helper={`${runtime.errorsLastFiveMinutes} erro(s) em 5 min`} />
        <Metric icon={MemoryStick} label="Memória" value={`${runtime.memoryUsageMb} MB`} helper={`Heap em ${runtime.heapUsageMb} MB`} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Signal title="Requisições lentas" value={runtime.slowRequestCount} detail="Acima de 1,5 segundo nos últimos cinco minutos." status={runtime.slowRequestCount > 0 ? 'attention' : 'healthy'} icon={TimerReset} />
        <Signal title="Endpoints em atenção" value={attentionEndpoints} detail="Com erro ou P95 acima do limite operacional." status={attentionEndpoints > 0 ? 'attention' : 'healthy'} icon={AlertTriangle} />
        <Signal title="Tempo de atividade" value={formatUptime(runtime.uptimeSeconds)} detail={`Runtime iniciado em ${runtime.startedAt ? new Date(runtime.startedAt).toLocaleString('pt-BR') : 'não informado'}.`} status="healthy" icon={ServerCog} />
      </section>

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-[var(--text-main)]">Ranking de endpoints</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Ordenação inicial combina erros, P95 e tempo médio para priorizar os maiores riscos.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar endpoint" className="w-full rounded-xl border border-[var(--border-color)] bg-black/10 py-2 pl-9 pr-3 text-xs text-[var(--text-main)] outline-none sm:w-64" />
            </label>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-main)] outline-none">
              <option value="risk">Maior risco</option>
              <option value="p95">Maior P95</option>
              <option value="average">Maior média</option>
              <option value="errors">Mais erros</option>
              <option value="requests">Mais requisições</option>
            </select>
            <button onClick={() => setOnlyAttention((current) => !current)} className={`rounded-xl border px-3 py-2 text-xs font-black ${onlyAttention ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
              Somente atenção
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              <tr className="border-b border-[var(--border-color)]">
                <th className="px-3 py-3">Endpoint</th><th className="px-3 py-3">Requisições</th><th className="px-3 py-3">Erros</th><th className="px-3 py-3">Média</th><th className="px-3 py-3">P95</th><th className="px-3 py-3">Último status</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => {
                const isAttention = endpoint.errorCount > 0 || endpoint.p95DurationMs >= 1_500;
                return (
                  <tr key={`${endpoint.method}-${endpoint.path}`} className="border-b border-[var(--border-color)]/60 text-[var(--text-main)]">
                    <td className="px-3 py-3"><span className="mr-2 rounded bg-sky-500/10 px-2 py-1 font-mono text-[10px] font-black text-sky-300">{endpoint.method}</span><span className="font-mono">{endpoint.path}</span></td>
                    <td className="px-3 py-3">{endpoint.requestCount}</td>
                    <td className={`px-3 py-3 font-black ${endpoint.errorCount > 0 ? 'text-red-300' : ''}`}>{endpoint.errorCount}</td>
                    <td className="px-3 py-3">{formatDuration(endpoint.averageDurationMs)}</td>
                    <td className={`px-3 py-3 font-black ${isAttention ? 'text-amber-300' : ''}`}>{formatDuration(endpoint.p95DurationMs)}</td>
                    <td className="px-3 py-3">{endpoint.lastStatusCode}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!runtime.isLoading && endpoints.length === 0 && <div className="py-12 text-center text-sm text-[var(--text-secondary)]">Nenhum endpoint corresponde aos filtros atuais.</div>}
        </div>
      </section>

      {runtime.recentErrors.length > 0 && (
        <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-red-200"><XCircle className="h-4 w-4" /> Erros recentes</h2>
          <div className="mt-4 space-y-2">
            {runtime.recentErrors.slice(0, 10).map((error) => (
              <div key={error.id} className="rounded-xl border border-red-500/10 bg-black/10 p-3 text-xs text-[var(--text-secondary)]">
                <span className="font-black text-red-200">{error.statusCode}</span> · <span className="font-mono text-[var(--text-main)]">{error.method} {error.path}</span> · {formatDuration(error.durationMs)} · {new Date(error.occurredAt).toLocaleString('pt-BR')}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-secondary)]">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Nenhum polling foi adicionado. As métricas são atualizadas somente ao abrir a área ou usar o botão Atualizar.
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, helper, badgeClass }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; helper: string; badgeClass?: string }) {
  return <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-sky-300" />{badgeClass && <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${badgeClass}`}>{value}</span>}</div><div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-secondary)]">{label}</div>{!badgeClass && <div className="mt-2 text-2xl font-black text-[var(--text-main)]">{value}</div>}<div className="mt-1 text-[11px] text-[var(--text-secondary)]">{helper}</div></article>;
}

function Signal({ icon: Icon, title, value, detail, status }: { icon: React.ComponentType<{ className?: string }>; title: string; value: React.ReactNode; detail: string; status: 'healthy' | 'attention' }) {
  return <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"><div className="flex items-start justify-between gap-3"><Icon className="h-5 w-5 text-sky-300" /><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${statusClass[status]}`}>{status === 'healthy' ? 'Operacional' : 'Atenção'}</span></div><div className="mt-4 text-2xl font-black text-[var(--text-main)]">{value}</div><div className="mt-1 text-sm font-black text-[var(--text-main)]">{title}</div><p className="mt-2 text-xs text-[var(--text-secondary)]">{detail}</p></article>;
}
