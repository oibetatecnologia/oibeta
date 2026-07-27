import React from 'react';
import { Activity, AlertCircle, ShieldAlert } from 'lucide-react';
import StatusBadge from '../shared/badges/StatusBadge';

interface GovGovernanceProps {
  loading: boolean;
  audits: any[];
  compliances: any[];
  monitorings: any[];
  occurrences: any[];
}

/**
 * GovGovernance
 *
 * Área de governança do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar auditorias, conformidades, monitoramentos e ocorrências;
 * - exibir estados de loading e vazio;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovGovernance({
  loading,
  audits,
  compliances,
  monitorings,
  occurrences,
}: GovGovernanceProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" /> Auditorias de Processo Administrativas
          </h4>
          {loading ? (
            <p className="text-xs text-[var(--text-secondary)]">Carregando auditorias...</p>
          ) : audits.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {audits.map(a => (
                <div key={a.id} className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)]/70 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-[var(--text-main)] gap-3">
                    <span>{a.auditType || 'Regulamentar'}</span>
                    <StatusBadge status={a.status} variant="ACTIVE" />
                  </div>
                  <p className="text-[var(--text-secondary)] text-[11px]">{a.description}</p>
                  <p className="text-[10px] font-mono text-[var(--text-secondary)]/70 pt-1">Responsável: {a.auditor || 'CGM'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2">
            <AlertCircle className="w-4 h-4 text-indigo-400" /> Registros de Conformidades e Riscos
          </h4>
          {loading ? (
            <p className="text-xs text-[var(--text-secondary)]">Carregando dados estruturais...</p>
          ) : compliances.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {compliances.map(c => (
                <div key={c.id} className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)]/70 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-[var(--text-main)] gap-3">
                    <span>{c.ruleName || 'Regra de Compliance'}</span>
                    <StatusBadge status={c.status} variant={c.status === 'COMPLIANT' ? 'ACTIVE' : 'CRITICAL'} />
                  </div>
                  <p className="text-[var(--text-secondary)] text-[11px]">{c.notes || 'Iniciativa auditada pela Controladoria Geral'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Monitoramento de Alinhamento e Instruções
          </h4>
          {loading ? (
            <p className="text-xs text-[var(--text-secondary)]">Carregando monitoramentos...</p>
          ) : monitorings.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {monitorings.map(m => (
                <div key={m.id} className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)]/70 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-[var(--text-main)]">
                    <span>{m.title || 'Acompanhamento Estratégico'}</span>
                    <span className="text-[10px] font-mono text-indigo-400">{m.frequency}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] text-[11px]">Meta de monitoramento: {m.targetValue}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2 text-red-400">
            <ShieldAlert className="w-4 h-4" /> Riscos e Ocorrências Mapeadas de Forma Direta
          </h4>
          {loading ? (
            <p className="text-xs text-[var(--text-secondary)]">Carregando ocorrências...</p>
          ) : occurrences.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {occurrences.map(o => (
                <div key={o.id} className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)]/70 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-[var(--text-main)] gap-3">
                    <span>{o.title || 'Inconformidade Analisada'}</span>
                    <StatusBadge status={o.severity} variant="CRITICAL" />
                  </div>
                  <p className="text-[var(--text-secondary)] text-[11px]">{o.impactDescription}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
