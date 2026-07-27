import React from 'react';
import { X } from 'lucide-react';

interface LicitaEditDialogProps {
  createType: string;
  formFields: any;
  setFormFields: (fields: any) => void;
  formSubmitting: boolean;
  handleEditSubmit: (event: React.FormEvent) => void | Promise<void>;
  onClose: () => void;
}

export default function LicitaEditDialog({
  createType,
  formFields,
  setFormFields,
  formSubmitting,
  handleEditSubmit,
  onClose,
}: LicitaEditDialogProps) {
  return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleEditSubmit}
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
              <h3 className="text-base font-black text-[var(--text-main)] uppercase border-b border-[var(--border-color)] pb-2.5">
                Editar Registro — {createType === 'bid' ? 'Certame' : createType === 'supplier' ? 'Fornecedor' : createType === 'contract' ? 'Contrato' : 'Ata ARP'}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              
              {createType === 'bid' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Título / Objeto</label>
                    <input 
                      type="text"
                      required
                      value={formFields.title}
                      onChange={(e) => setFormFields({...formFields, title: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Número Edital</label>
                      <input 
                        type="text"
                        required
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
                        value={formFields.valorEstimado}
                        onChange={(e) => setFormFields({...formFields, valorEstimado: e.target.value})}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
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
                      value={formFields.title}
                      onChange={(e) => setFormFields({...formFields, title: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">CNPJ/CPF</label>
                    <input 
                      type="text"
                      required
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
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Objeto Contratual</label>
                    <input 
                      type="text"
                      required
                      value={formFields.title}
                      onChange={(e) => setFormFields({...formFields, title: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Nº Contrato</label>
                      <input 
                        type="text"
                        required
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
                        value={formFields.value}
                        onChange={(e) => setFormFields({...formFields, value: e.target.value})}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Fornecedor Adjudicado</label>
                    <input 
                      type="text"
                      required
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
                      value={formFields.number}
                      onChange={(e) => setFormFields({...formFields, number: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Órgão Regulador</label>
                    <input 
                      type="text"
                      required
                      value={formFields.orgao}
                      onChange={(e) => setFormFields({...formFields, orgao: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Detentor ARP</label>
                    <input 
                      type="text"
                      required
                      value={formFields.supplierName}
                      onChange={(e) => setFormFields({...formFields, supplierName: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">Situação</label>
                <select
                  value={formFields.status}
                  onChange={(e) => setFormFields({...formFields, status: e.target.value})}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="ACTIVE">ATIVO / EFICAZ</option>
                  <option value="SUSPENDED">SUSPENSO</option>
                  <option value="CLOSED">ENCERRADO</option>
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
                {formSubmitting ? 'Salvando...' : 'Aplicar Mudança'}
              </button>
            </div>
          </form>
        </div>
  );
}
