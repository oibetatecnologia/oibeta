import type { ExecutiveReportSnapshot } from './ExecutiveReportTypes';

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export const ExecutiveReportExportService = {
  exportJson(snapshot: ExecutiveReportSnapshot) {
    download(JSON.stringify(snapshot, null, 2), `relatorio-executivo-${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8');
  },
  exportCsv(snapshot: ExecutiveReportSnapshot) {
    const rows = [['Seção', 'Pontuação', 'Risco', 'Resumo']];
    snapshot.sections.forEach((section) => rows.push([section.title, String(section.score), section.risk, section.summary]));
    download(rows.map((row) => row.map(escapeCsv).join(';')).join('\n'), `relatorio-executivo-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
  },
  print(snapshot: ExecutiveReportSnapshot) {
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) return;
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório Executivo</title><style>body{font-family:Arial,sans-serif;color:#111;padding:32px}h1{margin-bottom:4px}.score{font-size:32px;font-weight:700}.section{border-top:1px solid #ddd;padding:18px 0}.metric{display:inline-block;margin-right:28px}.muted{color:#666;font-size:12px}</style></head><body><h1>${snapshot.organizationName}</h1><p>Relatório executivo consolidado</p><div class="score">${snapshot.executiveScore}% · ${snapshot.risk}</div><p>${snapshot.headline}</p>${snapshot.sections.map((section) => `<div class="section"><h2>${section.title} — ${section.score}%</h2><p>${section.summary}</p>${section.metrics.map((metric) => `<div class="metric"><strong>${metric.formattedValue}</strong><div class="muted">${metric.label}</div></div>`).join('')}</div>`).join('')}<div class="section"><h2>Recomendações</h2><ol>${snapshot.recommendations.map((item) => `<li>${item}</li>`).join('')}</ol></div><script>window.print()</script></body></html>`);
    popup.document.close();
  },
};
