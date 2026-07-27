import React from 'react';
import type { ImplementationIntelligenceSummary } from '../../core/implementations/ImplementationIntelligenceTypes';
import ProgressBar from '../shared/ProgressBar';

export default function ImplementationRiskTable({ summary }: { summary: ImplementationIntelligenceSummary }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4 overflow-hidden">
      <div>
        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">Risco por implantação</span>
        <h3 className="text-base font-black text-[var(--text-main)] mt-1">Carteira monitorada</h3>
      </div>
      {summary.snapshots.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">Nenhuma implantação registrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead><tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--text-secondary)]"><th className="py-3 pr-4">Cliente / implantação</th><th className="py-3 pr-4">Risco</th><th className="py-3 pr-4">Progresso</th><th className="py-3 pr-4">Go-live</th><th className="py-3">Próximo marco</th></tr></thead>
            <tbody>
              {summary.snapshots.slice(0, 10).map((item) => (
                <tr key={item.id} className="border-b border-[var(--border-color)]/70 align-top">
                  <td className="py-4 pr-4"><div className="text-sm font-black text-[var(--text-main)]">{item.clientName}</div><div className="text-xs text-[var(--text-secondary)] mt-1">{item.title}</div></td>
                  <td className="py-4 pr-4"><span className={`text-[9px] uppercase font-black rounded-full border px-2 py-1 ${item.riskLevel === 'saudável' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : item.riskLevel === 'atenção' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>{item.riskLevel}</span></td>
                  <td className="py-4 pr-4 w-44"><ProgressBar value={item.progress} /><div className="text-[10px] text-[var(--text-secondary)] mt-1">{item.checklistCompleted}/{item.checklistTotal} itens · {item.readinessScore}% prontidão</div></td>
                  <td className="py-4 pr-4 text-xs text-[var(--text-secondary)]">{item.expectedGoLiveDate ? new Date(`${item.expectedGoLiveDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Não definida'}{typeof item.daysToGoLive === 'number' && item.daysToGoLive < 0 ? <div className="text-red-300 font-bold mt-1">{Math.abs(item.daysToGoLive)} dia(s) atrasado</div> : null}</td>
                  <td className="py-4 text-xs text-[var(--text-main)]">{item.nextMilestone}{item.blockers[0] ? <div className="text-[10px] text-amber-300 mt-1">{item.blockers[0]}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
