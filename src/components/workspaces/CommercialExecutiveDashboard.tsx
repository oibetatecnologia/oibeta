import { AlertTriangle, Building2, CircleDollarSign, MapPin, PackageSearch, Target } from 'lucide-react';
import type { CommercialExecutiveSummary } from '../../core/commercial/CommercialExecutiveIntelligenceService';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
}).format(value);

function Ranking({ title, icon, items }: { title: string; icon: React.ReactNode; items: CommercialExecutiveSummary['topProducts'] }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 space-y-3">
      <h3 className="text-xs font-black text-[var(--text-main)] flex items-center gap-2">{icon}{title}</h3>
      {items.length === 0 ? <p className="text-[10px] text-[var(--text-secondary)]">Ainda não há dados suficientes.</p> : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-xl bg-[var(--bg-main)]/35 border border-[var(--border-color)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[var(--text-main)] truncate">{index + 1}. {item.label}</span>
                <span className="text-[9px] font-mono text-[var(--text-secondary)]">{item.opportunities} oportunidades</span>
              </div>
              <p className="text-[9px] text-[var(--text-secondary)] mt-1">Compatibilidade média {item.averageCompatibility}% • {formatCurrency(item.estimatedValue)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommercialExecutiveDashboard({ summary }: { summary: CommercialExecutiveSummary }) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><CircleDollarSign className="w-4 h-4 text-emerald-500"/><p className="text-[9px] uppercase font-black text-[var(--text-secondary)] mt-3">Pipeline estimado</p><strong className="text-lg text-[var(--text-main)]">{formatCurrency(summary.pipelineValue)}</strong></div>
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><Target className="w-4 h-4 text-blue-500"/><p className="text-[9px] uppercase font-black text-[var(--text-secondary)] mt-3">Pipeline qualificado</p><strong className="text-lg text-[var(--text-main)]">{formatCurrency(summary.qualifiedPipelineValue)}</strong></div>
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><PackageSearch className="w-4 h-4 text-violet-500"/><p className="text-[9px] uppercase font-black text-[var(--text-secondary)] mt-3">Compatibilidade média</p><strong className="text-lg text-[var(--text-main)]">{summary.averageCompatibility}%</strong></div>
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"><AlertTriangle className="w-4 h-4 text-amber-500"/><p className="text-[9px] uppercase font-black text-[var(--text-secondary)] mt-3">Prazos críticos</p><strong className="text-lg text-[var(--text-main)]">{summary.urgentOpportunities}</strong></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Ranking title="Produtos com maior demanda" icon={<PackageSearch className="w-4 h-4 text-blue-500"/>} items={summary.topProducts} />
        <Ranking title="Órgãos compradores" icon={<Building2 className="w-4 h-4 text-emerald-500"/>} items={summary.topBuyers} />
        <Ranking title="Municípios e estados" icon={<MapPin className="w-4 h-4 text-violet-500"/>} items={summary.topLocations} />
      </div>
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h3 className="text-xs font-black text-[var(--text-main)]">Recomendações executivas da Beta</h3>
        <div className="mt-2 space-y-1">{summary.recommendations.map((item) => <p key={item} className="text-[10px] text-[var(--text-secondary)]">• {item}</p>)}</div>
      </div>
    </section>
  );
}
