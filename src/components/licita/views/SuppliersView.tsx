import React from 'react';
import SearchToolbar from '../../shared/forms/SearchToolbar';
import type { LicitaCreateType, LicitaDetailType } from '../types';

interface SuppliersViewProps {
  suppliers: any[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setViewingDetail: (detail: any) => void;
  setDetailType: (type: LicitaDetailType) => void;
  openCreateModal: (type: LicitaCreateType) => void;
  openEditModal: (item: any, type: LicitaCreateType) => void;
}

export default function SuppliersView({
  suppliers,
  searchTerm,
  setSearchTerm,
  setViewingDetail,
  setDetailType,
  openCreateModal,
  openEditModal,
}: SuppliersViewProps) {
  return (
<div className="space-y-4">
              
              <SearchToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Filtrar fornecedores por razão social ou documento..."
                onCreate={() => openCreateModal('supplier')}
                createLabel="Cadastrar Fornecedor"
              />

              {/* LISTING */}
              {suppliers.filter(s => {
                const matchesSearch = 
                  s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
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
                          <th className="py-3.5 px-4">Razão Social</th>
                          <th className="py-3.5 px-4">Documento (CNPJ/CPF)</th>
                          <th className="py-3.5 px-4">Qualificação Técnica</th>
                          <th className="py-3.5 px-4">Situação / Habilitação</th>
                          <th className="py-3.5 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]/75 text-xs">
                        {suppliers.filter(s => {
                          const matchesSearch = 
                            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch;
                        }).map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-[var(--bg-card)]/50 transition">
                            <td className="py-3.5 px-4 font-bold text-[var(--text-main)] max-w-sm truncate">
                              {s.name || `Fornecedor Técnico S.A.`}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                              {s.documentNumber || '00.000.000/0001-00'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] font-mono leading-none border border-[var(--border-color)] px-2 py-0.5 rounded bg-[var(--bg-card)]">
                                {s.metadata?.qualificacion || 'Nível A - Máxima Relevância'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                s.status === 'ACTIVE' || s.status === 'Habilitado' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                {s.status || 'Habilitado'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <button 
                                  onClick={() => {
                                    setViewingDetail(s);
                                    setDetailType('supplier');
                                  }}
                                  className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 hover:bg-indigo-505/20 text-[10px] font-bold rounded transition cursor-pointer"
                                >
                                  Visualizar
                                </button>
                                <button 
                                  onClick={() => openEditModal(s, 'supplier')}
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
