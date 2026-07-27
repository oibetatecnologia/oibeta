import React from 'react';
import { X } from 'lucide-react';

interface LicitaDetailDialogProps {
  viewingDetail: any;
  detailType: string;
  onClose: () => void;
}

export default function LicitaDetailDialog({ viewingDetail, detailType, onClose }: LicitaDetailDialogProps) {
  if (!viewingDetail) return null;

  return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl max-w-lg w-full p-6 space-y-4 relative shadow-2xl animate-scale-in">
            <button 
              onClick={() => onClose()}
              className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[10px] font-mono uppercase font-black text-indigo-400 block tracking-widest">{detailType} detalhado</span>
            
            <div className="space-y-3">
              <h3 className="text-base font-black text-[var(--text-main)] uppercase border-b border-[var(--border-color)] pb-3">
                {viewingDetail.title || viewingDetail.name || `Registro ID: ${viewingDetail.id}`}
              </h3>

              <div className="space-y-2 text-xs text-[var(--text-main)] max-h-96 overflow-y-auto pr-1">
                {detailType === 'opportunity' && (
                  <>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Órgão</span>
                      <span className="font-bold">{viewingDetail.metadata?.orgao || viewingDetail.metadata?.organ || 'Não Definido'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Modalidade</span>
                      <span className="font-mono font-bold">{viewingDetail.metadata?.modalidade || 'Chamamento'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Status</span>
                      <span className="font-bold">{viewingDetail.status}</span>
                    </div>
                    <p className="p-3 border border-[var(--border-color)] bg-[var(--bg-card)]/30 rounded-xl mt-2 leading-relaxed">
                      {viewingDetail.description || 'Sem descrição complementar.'}
                    </p>
                  </>
                )}

                {detailType === 'bid' && (
                  <>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Nº do Edital</span>
                      <span className="font-mono font-bold">{viewingDetail.metadata?.number || 'Não Informado'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Órgão</span>
                      <span className="font-bold">{viewingDetail.metadata?.orgao || viewingDetail.metadata?.organ || 'Não Definido'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Valor Estimado</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {viewingDetail.metadata?.valorEstimado ? viewingDetail.metadata.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                      </span>
                    </div>
                    <p className="p-3 border border-[var(--border-color)] bg-[var(--bg-card)]/30 rounded-xl mt-2 leading-relaxed">
                      {viewingDetail.description || 'Sem descrição cadastrada para este edital de licitação.'}
                    </p>
                  </>
                )}

                {detailType === 'supplier' && (
                  <>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text(--text-secondary)">Razão Social</span>
                      <span className="font-bold">{viewingDetail.name}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text(--text-secondary)">Documento CNPJ/CPF</span>
                      <span className="font-mono font-semibold">{viewingDetail.documentNumber || '00.000.000/0001-00'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text(--text-secondary)">Situação Cadastral</span>
                      <span className="font-bold text-emerald-400">{viewingDetail.status || 'Habilitado'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text(--text-secondary)">Qualificação</span>
                      <span className="font-semibold">{viewingDetail.metadata?.qualificacion || 'Habilitação Plena'}</span>
                    </div>
                  </>
                )}

                {detailType === 'contract' && (
                  <>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Nº Contrato</span>
                      <span className="font-mono font-bold">{viewingDetail.number || 'Não Informado'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Fornecedor adjudicado</span>
                      <span className="font-bold">{viewingDetail.supplierName || 'Corporação Integrada'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Valor Financeiro</span>
                      <span className="font-mono font-extrabold text-indigo-400">
                        {viewingDetail.value ? viewingDetail.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Status Vigência</span>
                      <span className="font-bold">{viewingDetail.status}</span>
                    </div>
                  </>
                )}

                {detailType === 'arp' && (
                  <>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Número ARP</span>
                      <span className="font-mono font-bold">{viewingDetail.metadata?.number || viewingDetail.id.substring(0,8)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Órgão Regulador</span>
                      <span className="font-bold">{viewingDetail.metadata?.orgaoGerenciador || 'Diretoria de Administração'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-[var(--bg-card)]/50 rounded-lg">
                      <span className="text-[var(--text-secondary)]">Empresa Beneficiária</span>
                      <span className="font-bold">{viewingDetail.metadata?.supplierName || 'Detentora S.A.'}</span>
                    </div>
                  </>
                )}

                {detailType === 'report' && (
                  <>
                    <p className="p-3 border border-[var(--border-color)] bg-[var(--bg-card)]/35 rounded-xl text-xs leading-relaxed">
                      {viewingDetail.description}
                    </p>
                    <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-1 ml-1 leading-normal">
                      ID Report: {viewingDetail.id} <br/>
                      Emitido em: {viewingDetail.metadata?.emitidoEm || '22/06/2026'} <br/>
                      Organização ID: {viewingDetail.organizationId}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={() => onClose()}
              className="w-full text-xs py-2 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card)]/80 text-[var(--text-main)] font-bold rounded-lg transition cursor-pointer"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
  );
}
