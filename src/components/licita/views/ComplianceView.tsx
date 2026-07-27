import React from 'react';
import { CheckCircle } from 'lucide-react';

interface ComplianceViewProps {
  auditEvents: any[];
  complianceEvents: any[];
}

export default function ComplianceView({
  auditEvents,
  complianceEvents,
}: ComplianceViewProps) {
  return (
<div className="space-y-6">
              
              {/* OPERATIONAL BANNER */}
              <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">Análise de Risco Municipal</h4>
                  <p className="text-sm font-black text-[var(--text-main)] mt-1">Conformidade e Monitoramento Operacional da Lei Federal nº 14.133/2021.</p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex items-center gap-1.5 font-mono text-xs font-extrabold text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  SISTEMA DE COMPLIANCE ADERENTE
                </div>
              </div>

              {/* AUDIT & RISK GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* AUDITORIAS PANEL */}
                <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
                  <span className="text-[10px] uppercase font-black tracking-wider text-[var(--text-secondary)] font-mono block border-b border-[var(--border-color)] pb-2">Auditorias em Andamento</span>
                  
                  {auditEvents.length === 0 ? (
                    <div className="p-8 border border-dashed border-[var(--border-color)] rounded-xl text-center">
                      <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditEvents.map((audit, idx) => (
                        <div key={audit.id || idx} className="p-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-[var(--text-main)]">{audit.metadata?.titulo || audit.id.substring(0, 8)}</span>
                            <span className="font-mono text-[10px] text-amber-500">{audit.status}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)]">{audit.metadata?.descricao || 'Análise sistemática de procedimentos licitatórios para identificação de não conformidades.'}</p>
                          <span className="text-[9.5px] font-mono font-bold text-[var(--text-secondary)]/70 block uppercase">Tipo: {audit.metadata?.tipo || 'Regulamentar'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RISCOS & OCORRÊNCIAS PANEL */}
                <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl space-y-4">
                  <span className="text-[10px] uppercase font-black tracking-wider text-[var(--text-secondary)] font-mono block border-b border-[var(--border-color)] pb-2">Ocorrências & Monitoramento de Risco</span>

                  {complianceEvents.length === 0 ? (
                    <div className="p-8 border border-dashed border-[var(--border-color)] rounded-xl text-center">
                      <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {complianceEvents.map((event, idx) => (
                        <div key={event.id || idx} className="p-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-rose-400">{event.metadata?.titulo || 'Ocorrência de Alerta'}</span>
                            <span className="font-mono text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/15">{event.status}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)]">{event.metadata?.descricao || 'Identificado desvio ou necessidade de reavaliação de conformidade.'}</p>
                          <span className="text-[9.5px] font-mono font-bold text-[var(--text-secondary)]/70 block uppercase">Gravidade: {event.metadata?.grauRisco || 'ALTA'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
  );
}
