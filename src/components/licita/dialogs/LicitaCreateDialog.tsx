import React from 'react';
import { X } from 'lucide-react';

interface LicitaCreateDialogProps {
  createType: string;
  formFields: any;
  setFormFields: (fields: any) => void;
  formError: string;
  formSubmitting: boolean;
  handleCreateSubmit: (event: React.FormEvent) => void | Promise<void>;
  onClose: () => void;
}

export default function LicitaCreateDialog({
  createType,
  formFields,
  setFormFields,
  formError,
  formSubmitting,
  handleCreateSubmit,
  onClose,
}: LicitaCreateDialogProps) {
  return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateSubmit}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 space-y-4 relative shadow-2xl animate-scale-in"
          >
            <button 
              type="button"
              onClick={() => onClose()}
              className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-black text-[var(--text-main)] uppercase">
                Novo Registro — {createType === 'bid' ? 'Certame' : createType === 'supplier' ? 'Fornecedor' : createType === 'contract' ? 'Contrato' : 'Ata ARP'}
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-sans">Forneça os dados reais para sincronização imediata na base e no grafo.</p>
            </div>

            {formError && (
              <div className="p-2 border border-rose-500/10 bg-rose-500/5 text-rose-400 rounded-lg text-xs font-mono">
                {formError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              
              {createType === 'bid' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Título / Objeto do Certame</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Aquisição de Ambulâncias de Suporte Direto"
                      value={formFields.title}
                      onChange={(e) => setFormFields({...formFields, title: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Número do Edital</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: PE 104/2026"
                        value={formFields.number}
                        onChange={(e) => setFormFields({...formFields, number: e.target.value})}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Valor Estimado (R$)</label>
                      <input 
                        type="number"
                        required
                        placeholder="Ex: 850000"
                        value={formFields.valorEstimado}
                        onChange={(e) => setFormFields({...formFields, valorEstimado: e.target.value})}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Órgão Solicitante</label>
                    <input 
                      type="text"
                      value={formFields.orgao}
                      onChange={(e) => setFormFields({...formFields, orgao: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Descrição</label>
                    <textarea 
                      placeholder="Informações complementares..."
                      value={formFields.description}
                      onChange={(e) => setFormFields({...formFields, description: e.target.value})}
                      className="w-full h-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition text-[11px]"
                    />
                  </div>
                </>
              )}

              {createType === 'supplier' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Razão Social</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Comércio e Serviços de Logística Ltda"
                      value={formFields.title}
                      onChange={(e) => setFormFields({...formFields, title: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Documento (CNPJ)</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: 12.345.678/0001-90"
                      value={formFields.documentNumber}
                      onChange={(e) => setFormFields({...formFields, documentNumber: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </>
              )}

              {createType === 'contract' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Título / Objeto Contratual</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Aquisição e fornecimento de material hospitalar"
                      value={formFields.title}
                      onChange={(e) => setFormFields({...formFields, title: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Nº do Contrato</label>
                      <input 
                        type="text"
                        required
                        placeholder="Ex: CO 05/2026"
                        value={formFields.number}
                        onChange={(e) => setFormFields({...formFields, number: e.target.value})}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Valor (R$)</label>
                      <input 
                        type="number"
                        required
                        placeholder="Ex: 50000"
                        value={formFields.value}
                        onChange={(e) => setFormFields({...formFields, value: e.target.value})}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Fornecedor adjudicado</label>
                    <input 
                      type="text"
                      required
                      placeholder="Nome do Fornecedor"
                      value={formFields.supplierName}
                      onChange={(e) => setFormFields({...formFields, supplierName: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </>
              )}

              {createType === 'arp' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Número ARP</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: ARP 55/2026"
                      value={formFields.number}
                      onChange={(e) => setFormFields({...formFields, number: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Órgão Regulador / Gerenciador</label>
                    <input 
                      type="text"
                      required
                      placeholder="Secretaria Mun. de Educação"
                      value={formFields.orgao}
                      onChange={(e) => setFormFields({...formFields, orgao: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Fornecedor Detentor</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Construtora Federal S.A."
                      value={formFields.supplierName}
                      onChange={(e) => setFormFields({...formFields, supplierName: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Situação inicial</label>
                <select
                  value={formFields.status}
                  onChange={(e) => setFormFields({...formFields, status: e.target.value})}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="ACTIVE">ATIVO / EFICAZ</option>
                  <option value="PENDING">PENDENTE</option>
                  <option value="HOMOLOGATED">HOMOLOGADO</option>
                </select>
              </div>

            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button"
                onClick={() => onClose()}
                className="flex-1 text-xs py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card)]/80 text-[var(--text-main)] font-bold rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={formSubmitting}
                className="flex-1 text-xs py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {formSubmitting ? 'Salvando...' : 'Sincronizar'}
              </button>
            </div>
          </form>
        </div>
  );
}
