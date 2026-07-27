import React from 'react';
import { Bot, ExternalLink, FileSearch, Trash2 } from 'lucide-react';
import { getOpportunityTypeLabel } from '../../core/commercial/CommercialRadarRegistry';
import {
  getOpportunityPriorityLabel,
  getOpportunityStatusLabel,
} from '../../core/commercial/OpportunityRegistry';
import { getOpportunitySphereLabel, type CommercialOpportunity } from '../../core/commercial/OpportunityTypes';
import { PRODUCT_REGISTRY } from '../../products/productRegistry';

interface OpportunitiesTableProps {
  opportunities: CommercialOpportunity[];
  onDelete: (opportunityId: string) => void;
  onAnalyze: (opportunity: CommercialOpportunity) => void;
}

export default function OpportunitiesTable({ opportunities, onDelete, onAnalyze }: OpportunitiesTableProps) {
  if (opportunities.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border-color)] rounded-2xl p-8 text-center bg-[var(--bg-main)]/20">
        <div className="w-12 h-12 rounded-2xl mx-auto bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)] flex items-center justify-center mb-4">
          <FileSearch className="w-5 h-5" />
        </div>
        <h3 className="text-base font-black text-[var(--text-main)]">Nenhuma oportunidade cadastrada</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md mx-auto leading-relaxed">
          Cadastre manualmente o primeiro edital real para testar análise, aderência comercial e geração de tarefas antes da integração com PNCP.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
      <table className="w-full min-w-[920px] text-left">
        <thead className="bg-[var(--bg-sidebar)] border-b border-[var(--border-color)]">
          <tr>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Oportunidade</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Órgão</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Tipo</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Valor</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Status</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Prioridade</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)]">Produto mais compatível</th>
            <th className="px-4 py-3 text-[10px] uppercase font-mono tracking-widest text-[var(--text-secondary)] text-right">Ações</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
          {opportunities.map((opportunity) => (
            <tr key={opportunity.id} className="hover:bg-[var(--bg-main)]/25 transition">
              <td className="px-4 py-4 align-top">
                <div className="max-w-sm">
                  <span className="text-sm font-black text-[var(--text-main)] block">{opportunity.title}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-1">{opportunity.object}</span>
                </div>
              </td>
              <td className="px-4 py-4 align-top">
                <span className="text-xs font-bold text-[var(--text-main)] block">{opportunity.buyerName}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {opportunity.city || 'Cidade não informada'}{opportunity.state ? `/${opportunity.state}` : ''} · {getOpportunitySphereLabel(opportunity.sphere)}
                </span>
              </td>
              <td className="px-4 py-4 align-top text-xs text-[var(--text-main)]">{getOpportunityTypeLabel(opportunity.type)}</td>
              <td className="px-4 py-4 align-top text-xs font-mono text-[var(--text-main)]">{formatCurrency(opportunity.estimatedValue)}</td>
              <td className="px-4 py-4 align-top">
                <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                  {getOpportunityStatusLabel(opportunity.status)}
                </span>
              </td>
              <td className="px-4 py-4 align-top">
                <span className="text-[9px] uppercase font-black font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                  {getOpportunityPriorityLabel(opportunity.priority)}
                </span>
              </td>
              <td className="px-4 py-4 align-top">
                {renderBestProduct(opportunity)}
              </td>
              <td className="px-4 py-4 align-top">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onAnalyze(opportunity)}
                    className="p-2 rounded-lg border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10"
                    title="Analisar com Beta"
                  >
                    <Bot className="w-3.5 h-3.5" />
                  </button>
                  {opportunity.sourceUrl && (
                    <a
                      href={opportunity.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                      title="Abrir edital"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(opportunity.id)}
                    className="p-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCurrency(value?: number): string {
  if (!value) return 'Não informado';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function renderBestProduct(opportunity: CommercialOpportunity): React.ReactNode {
  const match = opportunity.analysis?.bestMatches?.[0];
  if (!match) {
    return <span className="text-[10px] text-[var(--text-secondary)]">Não identificado</span>;
  }
  const product = PRODUCT_REGISTRY.find((item) => item.id === match.productId);
  return (
    <div className="min-w-[150px]">
      <span className="text-xs font-black text-[var(--text-main)] block">{product?.commercialName || match.serviceName}</span>
      <span className="text-[10px] text-[var(--blue-accent)] font-mono">{match.score}% compatível</span>
    </div>
  );
}
