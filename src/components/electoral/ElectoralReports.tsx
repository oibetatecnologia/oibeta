import React from 'react';
import { Calendar, Download, Eye, FileText } from 'lucide-react';
import type { SavedAnalysis } from './types';
import { formatDate, formatShortId } from './utils/formatters';


interface ElectoralReportsProps {
  savedAnalyses: SavedAnalysis[];
  onNavigate: (tabId: string) => void;
  onView: (report: SavedAnalysis) => void;
  onDownload: (report: SavedAnalysis) => void;
}

/**
 * ElectoralReports
 *
 * Tela de relatórios do Beta Electoral.
 *
 * Responsabilidade:
 * - renderizar análises salvas;
 * - exibir estado vazio;
 * - delegar navegação, visualização e download ao ElectoralWorkspace;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function ElectoralReports({
  savedAnalyses,
  onNavigate,
  onView,
  onDownload,
}: ElectoralReportsProps) {
  return (
    <div className="space-y-6 animate-fade-in" id="electoral-tab-reports">
      <div>
        <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-wider font-mono">
          Relatórios de Governança e Inteligência
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Acesso a todas as análises computadas e salvas por esta organização.
        </p>
      </div>

      {savedAnalyses.length === 0 ? (
        <div className="border border-[var(--border-color)] rounded-xl p-12 text-center bg-[var(--bg-card)] max-w-xl mx-auto space-y-4">
          <FileText className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-[var(--text-main)]">Nenhum dado encontrado.</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Ainda não há relatórios eleitorais computados.
            </p>
          </div>
          <button
            onClick={() => onNavigate('analyses')}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
          >
            Disparar Primeiro Modelo de Análise
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedAnalyses.map((report) => (
            <div
              key={report.id}
              className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl relative overflow-hidden flex flex-col justify-between shadow-xs hover:border-[var(--blue-accent)]/30 transition"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] max-w-[80%] line-clamp-1">
                    {report.title}
                  </h4>
                  <span className="text-[8.5px] bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] border border-[var(--blue-accent)]/15 px-2 py-0.5 rounded font-mono font-bold leading-none uppercase">
                    {report.type}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-sans line-clamp-2 leading-relaxed">
                  {report.summary || 'Sem resumo disponível'}
                </p>
                <div className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center gap-1.5 pt-1">
                  <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                  Salvo em: {formatDate(report.createdAt)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-color)]/30 flex items-center justify-between text-xs font-sans">
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                  Doc ID: {formatShortId(report.id)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onView(report)}
                    className="flex items-center gap-1 p-1 px-2.5 bg-[var(--border-color)]/30 hover:bg-[var(--border-color)]/60 text-[var(--text-main)] font-semibold rounded-lg transition opacity-95 cursor-pointer text-[10px]"
                  >
                    <Eye className="w-3 h-3 text-[var(--text-main)]" />
                    Visualizar
                  </button>
                  <button
                    onClick={() => onDownload(report)}
                    className="flex items-center gap-1 p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/15 font-bold rounded-lg transition opacity-95 cursor-pointer text-[10px]"
                    title="Baixar Relatório JSON"
                  >
                    <Download className="w-3 h-3" />
                    Baixar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
