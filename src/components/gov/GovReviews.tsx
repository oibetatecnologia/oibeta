import React from 'react';
import { Calendar, Clock, FileSignature } from 'lucide-react';
import StatusBadge from '../shared/badges/StatusBadge';

interface GovReviewsProps {
  loading: boolean;
  briefs: any[];
  govReviews: any[];
  snapshots: any[];
}

/**
 * GovReviews
 *
 * Revisões executivas do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar briefings, ciclos e snapshots;
 * - exibir estados de loading e vazio;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovReviews({
  loading,
  briefs,
  govReviews,
  snapshots,
}: GovReviewsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="md:col-span-2 p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
          <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2">
            <FileSignature className="w-4 h-4 text-indigo-400" /> Revisões Executivas (Briefings do Gabinete)
          </h4>
          {loading ? (
            <p className="text-xs text-[var(--text-secondary)]">Carregando briefings estratégicos...</p>
          ) : briefs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</div>
          ) : (
            <div className="space-y-3">
              {briefs.map(b => (
                <div key={b.id} className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)]/75 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-semibold text-sm text-[var(--text-main)]">{b.title}</span>
                    <StatusBadge status="Oficina Real" variant="DEFAULT" />
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{b.summaryContent || b.content}</p>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)]/70 flex justify-between">
                    <span>Fórmula: {b.author || 'Gabinete Beta'}</span>
                    <span>Data: {b.date || 'Hoje'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
            <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2">
              <Clock className="w-4 h-4 text-[#f59e0b]" /> Ciclos Estratégicos Atuais
            </h4>
            {loading ? (
              <p className="text-xs text-[var(--text-secondary)]">Carregando ciclos...</p>
            ) : govReviews.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
            ) : (
              <div className="space-y-2">
                {govReviews.map(r => (
                  <div key={r.id} className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-lg text-xs">
                    <div className="flex justify-between font-semibold text-[var(--text-main)]">
                      <span>{r.cycleName || 'Ciclo de Metas'}</span>
                      <span className="font-mono text-indigo-400">{r.progress}%</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-[11px] mt-1">{r.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-3">
            <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> Snapshots de Desempenho
            </h4>
            {loading ? (
              <p className="text-xs text-[var(--text-secondary)]">Carregando snapshots...</p>
            ) : snapshots.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map(s => (
                  <div key={s.id} className="p-3 bg-[var(--bg-main)] border border-[var(--border-color)]/60 rounded-lg text-xs">
                    <div className="flex justify-between font-semibold text-[var(--text-main)]">
                      <span>Amostra nº {s.id.slice(0, 5)}</span>
                      <span className="font-mono text-emerald-400">{s.healthScore}%</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-[11px] mt-1">Registros de progresso medidos sem score artificial.</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
