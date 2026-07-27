import React from 'react';
import { Download, FileJson, Printer } from 'lucide-react';
import type { ExecutiveReportSnapshot } from '../../core/reports/ExecutiveReportTypes';
import { ExecutiveReportExportService } from '../../core/reports/ExecutiveReportExportService';

export default function ExecutiveReportHeader({ snapshot }: { snapshot: ExecutiveReportSnapshot }) {
  return <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
    <div><p className="text-xs font-bold uppercase tracking-widest text-[var(--blue-accent)]">Inteligência executiva consolidada</p><h3 className="text-xl lg:text-2xl font-extrabold text-[var(--text-main)]">Relatórios e prestação de contas</h3><p className="text-sm text-[var(--text-secondary)] mt-1">Gerado em {new Date(snapshot.generatedAt).toLocaleString('pt-BR')} com dados atuais da operação.</p></div>
    <div className="flex flex-wrap gap-2">
      <button onClick={() => ExecutiveReportExportService.exportCsv(snapshot)} className="px-3 py-2 rounded-xl border border-[var(--border-color)] text-sm font-bold text-[var(--text-main)] flex items-center gap-2"><Download className="w-4 h-4"/>CSV</button>
      <button onClick={() => ExecutiveReportExportService.exportJson(snapshot)} className="px-3 py-2 rounded-xl border border-[var(--border-color)] text-sm font-bold text-[var(--text-main)] flex items-center gap-2"><FileJson className="w-4 h-4"/>JSON</button>
      <button onClick={() => ExecutiveReportExportService.print(snapshot)} className="px-3 py-2 rounded-xl bg-[var(--blue-accent)] text-white text-sm font-bold flex items-center gap-2"><Printer className="w-4 h-4"/>Imprimir / PDF</button>
    </div>
  </div>;
}
