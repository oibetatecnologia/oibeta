import React from 'react';
import SearchToolbar from '../../shared/forms/SearchToolbar';
import type { LicitaCreateType, LicitaDetailType } from '../types';

interface ContractsViewProps {
  contracts: any[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setViewingDetail: (detail: any) => void;
  setDetailType: (type: LicitaDetailType) => void;
  openCreateModal: (type: LicitaCreateType) => void;
  openEditModal: (item: any, type: LicitaCreateType) => void;
}

export default function ContractsView({
  contracts,
  searchTerm,
  setSearchTerm,
  setViewingDetail,
  setDetailType,
  openCreateModal,
  openEditModal,
}: ContractsViewProps) {
  return (
<div className="space-y-4">
              
              <SearchToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Filtrar contratos municipais..."
                onCreate={() => openCreateModal('contract')}
                createLabel="Cadastrar Contrato"
              />

              {/* LISTING */}
              {contracts.filter(c => {
                const matchesSearch = 
                  c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
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
                          <th className="py-3.5 px-4">Contrato / Número</th>
                          <th className="py-3.5 px-4">Fornecedor Associado</th>
                          <th className="py-3.5 px-4">Valor Total</th>
                          <th className="py-3.5 px-4">Vigência Temporal</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]/75 text-xs">
                        {contracts.filter(c => {
                          const matchesSearch = 
                            c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch;
                        }).map((c, idx) => (
                          <tr key={c.id || idx} className="hover:bg-[var(--bg-card)]/50 transition">
                            <td className="py-3.5 px-4 font-bold text-[var(--text-main)]">
                              <div>{c.title || `Objeto de Aquisição Técnica`}</div>
                              <span className="text-[10px] font-mono text-indigo-400 mt-1 block">Nº {c.number || c.id.substring(0, 8)}</span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[var(--text-secondary)] min-w-[150px]">
                              {c.supplierName || 'Empresa Adjudicada Co.'}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                              {c.value ? c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                            </td>
                            <td className="py-3.5 px-4 text-[var(--text-secondary)] font-mono whitespace-nowrap">
                              {c.metadata?.vigenciaDe ? `${c.metadata.vigenciaDe} até ${c.metadata.vigenciaAte}` : '22/06/2026 - 22/06/2027'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                c.status === 'ACTIVE' || c.status === 'Eficaz' || c.status === 'VIGENTE'
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <button 
                                  onClick={() => {
                                    setViewingDetail(c);
                                    setDetailType('contract');
                                  }}
                                  className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 hover:bg-indigo-505/20 text-[10px] font-bold rounded transition cursor-pointer"
                                >
                                  Visualizar
                                </button>
                                <button 
                                  onClick={() => openEditModal(c, 'contract')}
                                  className="px-2 py-1 bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-main)] text-[10px] font-bold rounded transition cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
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
