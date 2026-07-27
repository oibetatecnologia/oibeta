import React from 'react';
import { Download } from 'lucide-react';
import type { LicitaDetailType } from '../types';

interface ReportsViewProps {
  reports: any[];
  setViewingDetail: (detail: any) => void;
  setDetailType: (type: LicitaDetailType) => void;
}

export default function ReportsView({
  reports,
  setViewingDetail,
  setDetailType,
}: ReportsViewProps) {
  return (
<div className="space-y-6">
              
              {reports.length === 0 ? (
                <div className="p-12 border border-[var(--border-color)] bg-[var(--bg-card)]/30 rounded-2xl text-center space-y-4">
                  <span className="text-3xl">📭</span>
                  <h3 className="text-lg font-black text-[var(--text-main)] font-mono uppercase tracking-wider">NO_DATA</h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto font-sans">
                    Não existem relatórios executivos compilados em arquivo para download no momento.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reports.map((rep, idx) => (
                    <div key={rep.id || idx} className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col justify-between space-y-4 hover:border-indigo-500/25 transition">
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase font-black text-[var(--text-secondary)]">Relatório Analítico</span>
                          <span className="text-[10px] font-mono text-[var(--text-secondary)] font-bold">{rep.metadata?.periodo || 'Mensal'}</span>
                        </div>
                        <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{rep.title || 'Análise consolidada de contratos'}</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed h-12 overflow-hidden">
                          {rep.description || 'Contém o sumário de todas as notas fiscais, inspeções operacionais e compliance licitatório.'}
                        </p>
                      </div>

                      <div className="border-t border-[var(--border-color)]/55 pt-3 flex justify-between items-center">
                        <span className="text-[10px] text-[var(--text-secondary)] font-sans">Emitido em: {rep.metadata?.emitidoEm || '22/06/2026'}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setViewingDetail(rep);
                              setDetailType('report');
                            }}
                            className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/15 text-indigo-400 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            Visualizar
                          </button>
                          <a 
                            href={`https://example.com/download/report-${rep.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Baixar
                          </a>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
  );
}
