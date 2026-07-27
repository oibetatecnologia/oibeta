import React from 'react';
import { Edit } from 'lucide-react';
import SearchToolbar from '../../shared/forms/SearchToolbar';
import type { LicitaCreateType, LicitaDetailType } from '../types';

interface BidsViewProps {
  bids: any[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setViewingDetail: (detail: any) => void;
  setDetailType: (type: LicitaDetailType) => void;
  openCreateModal: (type: LicitaCreateType) => void;
  openEditModal: (item: any, type: LicitaCreateType) => void;
}

export default function BidsView({
  bids,
  searchTerm,
  setSearchTerm,
  setViewingDetail,
  setDetailType,
  openCreateModal,
  openEditModal,
}: BidsViewProps) {
  return (
<div className="space-y-4">
              
              <SearchToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Filtrar certames municipais..."
                onCreate={() => openCreateModal('bid')}
                createLabel="Cadastrar Certame"
              />

              {/* LISTING */}
              {bids.filter(b => {
                const matchesSearch = 
                  b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  b.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  b.metadata?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  b.metadata?.orgao?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
              }).length === 0 ? (
                <div className="p-12 border border-[var(--border-color)] bg-[var(--bg-card)]/50 rounded-xl text-center">
                  <p className="text-xs text-[var(--text-secondary)] font-mono">Nenhum dado encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bids.filter(b => {
                    const matchesSearch = 
                      b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      b.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      b.metadata?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      b.metadata?.orgao?.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  }).map((b, idx) => {
                    const num = b.metadata?.number || b.metadata?.biddingNumber || b.id.substring(0, 8);
                    const modality = b.metadata?.modalidade || 'Pregão Presencial';
                    const organ = b.metadata?.orgao || b.metadata?.organ || 'Prefeitura de Oi Beta';
                    const val = b.metadata?.valorEstimado || b.metadata?.estimatedValue || 0;
                    return (
                      <div key={b.id || idx} className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-indigo-500/25 transition rounded-2xl flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-mono tracking-wide font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/15 rounded">
                              Nº {num}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              b.status === 'ACTIVE' || b.status === 'HOMOLOGATED' || b.status === 'READY'
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          
                          <h4 className="text-xs font-black uppercase text-[var(--text-main)] truncate" title={b.title}>
                            {b.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 h-8">
                            {b.description || 'Nenhuma descrição complementar registrada para o edital.'}
                          </p>
                        </div>

                        <div className="space-y-1.5 border-t border-[var(--border-color)]/50 pt-3 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">Órgão:</span>
                            <span className="font-semibold text-right max-w-[150px] truncate">{organ}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-secondary)]">Modalidade:</span>
                            <span className="font-semibold font-mono text-[10px]">{modality}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--text-secondary)]">Valor Estimado:</span>
                            <span className="font-extrabold text-xs text-indigo-400">
                              {val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => {
                              setViewingDetail(b);
                              setDetailType('bid');
                            }}
                            className="flex-1 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card)]/85 text-[10px] font-mono font-bold text-[var(--text-main)] rounded-lg transition cursor-pointer"
                          >
                            Detalhes
                          </button>
                          <button 
                            onClick={() => openEditModal(b, 'bid')}
                            className="px-2.5 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/10 transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
  );
}
