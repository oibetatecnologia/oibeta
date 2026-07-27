import React from 'react';
import { DatabaseZap, History, Play, ShieldAlert } from 'lucide-react';
import type { RadarConnectorDescriptor, RadarSyncRun } from '../../core/commercial/connectors/RadarConnectorTypes';

interface RadarConnectorPanelProps {
  connectors: RadarConnectorDescriptor[];
  runs: RadarSyncRun[];
  runningConnectorId?: string;
  onRun: (connectorId: string) => Promise<void>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border-color)] px-1 py-1">
      <div className="text-[10px] font-black text-[var(--text-main)]">{value}</div>
      <div className="text-[8px] uppercase text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

const statusLabel: Record<RadarSyncRun['status'], string> = {
  idle: 'Aguardando',
  running: 'Executando',
  completed: 'Concluída',
  completed_with_warnings: 'Concluída com alertas',
  failed: 'Falhou',
};

export default function RadarConnectorPanel({ connectors, runs, runningConnectorId, onRun }: RadarConnectorPanelProps) {
  const latestByConnector = new Map<string, RadarSyncRun>();
  for (const run of runs) {
    if (!latestByConnector.has(run.connectorId)) latestByConnector.set(run.connectorId, run);
  }

  return (
    <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-3">
        <h2 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
          <DatabaseZap className="w-4 h-4 text-[var(--blue-accent)]" />
          Conectores e sincronização
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Infraestrutura preparada para fontes externas, com histórico, controle de concorrência e execução auditável.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {connectors.map((connector) => {
          const latest = latestByConnector.get(connector.id);
          const isRunning = runningConnectorId === connector.id || latest?.status === 'running';
          return (
            <div key={connector.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-[var(--text-main)]">{connector.label}</h3>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">{connector.description}</p>
                </div>
                <span className={`text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border ${connector.available ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                  {connector.available ? 'Disponível' : 'Planejado'}
                </span>
              </div>

              {latest && (
                <div className="space-y-2">
                  <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-2">
                    <History className="w-3.5 h-3.5" />
                    Última execução: {statusLabel[latest.status]} em {new Date(latest.startedAt).toLocaleString('pt-BR')}
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <Metric label="Recebidos" value={latest.metrics.received} />
                    <Metric label="Criados" value={latest.metrics.created} />
                    <Metric label="Atualizados" value={latest.metrics.updated} />
                    <Metric label="Ignorados" value={latest.metrics.ignored} />
                  </div>
                  {latest.warnings.length > 0 && (
                    <p className="text-[9px] text-amber-300/90 leading-relaxed">{latest.warnings[0]}</p>
                  )}
                  {latest.errors.length > 0 && (
                    <p className="text-[9px] text-red-300/90 leading-relaxed">{latest.errors[0]}</p>
                  )}
                </div>
              )}

              {!connector.available && connector.unavailableReason && (
                <div className="flex items-start gap-2 text-[10px] text-amber-300/90">
                  <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{connector.unavailableReason}</span>
                </div>
              )}

              <button
                type="button"
                disabled={!connector.available || isRunning}
                onClick={() => onRun(connector.id)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] text-[10px] font-black uppercase tracking-widest font-mono flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                {isRunning ? 'Sincronizando' : 'Sincronizar agora'}
              </button>
              {connector.available && connector.defaultLookbackDays && (
                <p className="text-[9px] text-[var(--text-secondary)] text-center">
                  Janela padrão: últimos {connector.defaultLookbackDays} dias. Execução manual, sem polling automático.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div id="radar-sync-history" className="rounded-xl border border-[var(--blue-accent)]/25 bg-[var(--blue-accent)]/5 p-4 space-y-3 scroll-mt-24">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2"><History className="w-4 h-4 text-[var(--blue-accent)]" />Histórico de sincronizações do Radar</h3><p className="text-[10px] text-[var(--text-secondary)] mt-1">Cada linha abaixo representa uma execução do conector, não a quantidade total de oportunidades.</p></div>
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">{runs.length} execução(ões)</span>
        </div>
        {runs.length === 0 ? (
          <p className="text-[10px] text-[var(--text-secondary)]">Nenhuma sincronização executada ainda.</p>
        ) : (
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <div key={run.id} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2">
                <div>
                  <span className="text-[10px] font-black text-[var(--text-main)]">{connectors.find((item) => item.id === run.connectorId)?.label || run.connectorId}</span>
                  <span className="text-[9px] text-[var(--text-secondary)] block">{statusLabel[run.status]} · {new Date(run.startedAt).toLocaleString('pt-BR')}</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--text-secondary)]">{run.metrics.received} recebidos · {run.metrics.created} criados · {run.metrics.updated} atualizados</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
