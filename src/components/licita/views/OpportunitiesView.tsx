import React from 'react';
import SearchToolbar from '../../shared/forms/SearchToolbar';
import type { LicitaDetailType } from '../types';

interface OpportunitiesViewProps {
  opportunities: any[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  setViewingDetail: (detail: any) => void;
  setDetailType: (type: LicitaDetailType) => void;
}

export default function OpportunitiesView({
  opportunities,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  setViewingDetail,
  setDetailType,
}: OpportunitiesViewProps) {
  return (
<div className="space-y-4">
              <SearchToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Filtrar por objeto, órgão, modalidade..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={[
                  { value: 'ALL', label: 'Todos os estados' },
                  { value: 'ACTIVE', label: 'Ativo / Aberto' },
                  { value: 'SUSPENDED', label: 'Suspenso' },
                  { value: 'CLOSED', label: 'Encerrado' },
                ]}
              />

              {/* LISTING TABLE */}
              {opportunities.filter(opp => {
                const matchesSearch = 
                  opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  opp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  opp.metadata?.orgao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  opp.metadata?.organ?.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = statusFilter === 'ALL' || opp.status === statusFilter;
                return matchesSearch && matchesStatus;
              }).length === 0 ? (
                <div className="p-12 border border-[var(--border-color)] bg-[var(--bg-card)]/50 rounded-xl text-center">
                  <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
                </div>
              ) : (
                <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-card)]/80 text-[10px] font-black uppercase tracking-wider font-mono text-[var(--text-secondary)]">
                          <th className="py-3.5 px-4">Órgão</th>
                          <th className="py-3.5 px-4">Modalidade</th>
                          <th className="py-3.5 px-4">Objeto</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Data de Cadastro</th>
                          <th className="py-3.5 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]/75 text-xs">
                        {opportunities.filter(opp => {
                          const matchesSearch = 
                            opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            opp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            opp.metadata?.orgao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            opp.metadata?.organ?.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesStatus = statusFilter === 'ALL' || opp.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        }).map((opp, idx) => (
                          <tr key={opp.id || idx} className="hover:bg-[var(--bg-card)]/50 transition">
                            <td className="py-3 px-4 font-semibold text-[var(--text-main)] min-w-[150px]">
                              {opp.metadata?.orgao || opp.metadata?.organ || 'Secretaria Executiva'}
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)]">
                              <span className="border border-[var(--border-color)] px-2 py-0.5 rounded bg-[var(--bg-card)] font-mono text-[10px] font-semibold">
                                {opp.metadata?.modalidade || 'Chamamento Público'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans max-w-xs truncate" title={opp.description || opp.title}>
                              {opp.description || opp.title}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                opp.status === 'ACTIVE' || opp.status === 'ABERTO' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                {opp.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-secondary)] font-mono">
                              {opp.metadata?.data || opp.metadata?.createdAt ? new Date(opp.metadata?.data || opp.metadata?.createdAt).toLocaleDateString('pt-BR') : '22/06/2026'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button 
                                onClick={() => {
                                  setViewingDetail(opp);
                                  setDetailType('opportunity');
                                }}
                                className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 hover:bg-indigo-505/20 text-[10px] font-bold rounded-md transition cursor-pointer"
                              >
                                Visualizar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
  );
}
