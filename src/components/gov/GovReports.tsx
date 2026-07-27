import React from 'react';
import { Download, FileText } from 'lucide-react';
import StatusBadge from '../shared/badges/StatusBadge';

interface GovReportsProps {
  loading: boolean;
  reports: any[];
}

/**
 * GovReports
 *
 * Relatórios oficiais do Beta Gov.
 *
 * Responsabilidade:
 * - renderizar relatórios disponíveis;
 * - exibir estados de loading e vazio;
 * - não buscar dados;
 * - não alterar regra de negócio.
 */
export default function GovReports({
  loading,
  reports,
}: GovReportsProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden p-6 space-y-4">
      <div className="border-b border-[var(--border-color)] pb-3">
        <h3 className="text-base font-bold text-[var(--text-main)]">Relatórios Oficiais de Transparência</h3>
        <p className="text-xs text-[var(--text-secondary)]">Baixe ou visualize relatórios extraídos diretamente da base de dados sem mocks.</p>
      </div>
      {loading ? (
        <div className="text-xs text-[var(--text-secondary)] font-mono text-center py-8">Carregando base de relatórios públicos...</div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-12 h-12 text-[var(--text-secondary)]/40 mx-auto mb-3" />
          <p className="text-sm font-mono font-semibold text-[var(--text-main)]">NO_DATA</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Nenhum relatório oficial exportado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, index) => (
            <div key={report.id || index} className="p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition">
              <div className="space-y-1">
                <StatusBadge status="Oficial PDF" variant="DEFAULT" />
                <h4 className="text-sm font-bold text-[var(--text-main)]">{report.reportName || report.title || `Relatório Consolidado ${index + 1}`}</h4>
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{report.description || 'Controle interno sobre a eficiência das autarquias integradas.'}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/50">
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">{report.frequency || 'Mensal'}</span>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(report))}`}
                  download={`${report.reportName || 'relatorio'}.json`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:underline"
                >
                  <Download className="w-3 h-3" /> Baixar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
