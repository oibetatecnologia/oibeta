import React from 'react';
import SearchToolbar from '../../shared/forms/SearchToolbar';
import type { LicitaCreateType, LicitaDetailType } from '../types';

interface ArpsViewProps {
  arps: any[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setViewingDetail: (detail: any) => void;
  setDetailType: (type: LicitaDetailType) => void;
  openCreateModal: (type: LicitaCreateType) => void;
  openEditModal: (item: any, type: LicitaCreateType) => void;
}

export default function ArpsView({
  arps,
  searchTerm,
  setSearchTerm,
  setViewingDetail,
  setDetailType,
  openCreateModal,
  openEditModal,
}: ArpsViewProps) {
  return (
<div className="space-y-4">
              
              <SearchToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Filtrar Atas de Registro de Preços..."
                onCreate={() => openCreateModal('arp')}
                createLabel="Cadastrar Ata"
              />

              {/* LISTING */}
              {arps.filter(a => {
                const num = a.metadata?.number || a.id.substring(0, 8);
                const manager = a.metadata?.orgaoGerenciador || 'Administração Central';
                const supplier = a.metadata?.supplierName || 'Corporação Contratada';
                const matchesSearch = 
                  num.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  supplier.toLowerCase().includes(searchTerm.toLowerCase());
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
                          <th className="py-3.5 px-4">Ata / Registro</th>
                          <th className="py-3.5 px-4">Órgão Gerenciador</th>
                          <th className="py-3.5 px-4">Fornecedor Detentor</th>
                          <th className="py-3.5 px-4">Vigência Temporal</th>
                          <th className="py-3.5 px-4">Situação</th>
                          <th className="py-3.5 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]/75 text-xs">
                        {arps.filter(a => {
                          const num = a.metadata?.number || a.id.substring(0, 8);
                          const manager = a.metadata?.orgaoGerenciador || 'Administração Central';
                          const supplier = a.metadata?.supplierName || 'Corporação Contratada';
                          const matchesSearch = 
                            num.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            supplier.toLowerCase().includes(searchTerm.toLowerCase());
                          return matchesSearch;
                        }).map((a, idx) => {
                          const num = a.metadata?.number || a.id.substring(0, 8);
                          const manager = a.metadata?.orgaoGerenciador || 'Câmara Municipal';
                          const supplier = a.metadata?.supplierName || 'Detentor S.A.';
                          return (
                            <tr key={a.id || idx} className="hover:bg-[var(--bg-card)]/50 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                                ARP-{num}
                              </td>
                              <td className="py-3.5 px-4 text-[var(--text-secondary)] min-w-[150px]">
                                {manager}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-[var(--text-main)]">
                                {supplier}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-secondary)]">
                                {a.metadata?.vigenciaDe ? `${a.metadata.vigenciaDe} até ${a.metadata.vigenciaAte}` : '22/06/2026 - 22/06/2027'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  a.status === 'ACTIVE' || a.status === 'Vigente' 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                  {a.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex gap-1.5 justify-center">
                                  <button 
                                    onClick={() => {
                                      setViewingDetail(a);
                                      setDetailType('arp');
                                    }}
                                    className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 hover:bg-indigo-505/20 text-[10px] font-bold rounded transition cursor-pointer"
                                  >
                                    Visualizar
                                  </button>
                                  <button 
                                    onClick={() => openEditModal(a, 'arp')}
                                    className="px-2 py-1 bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-main)] text-[10px] font-bold rounded transition cursor-pointer"
                                  >
                                    Editar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
  );
}
