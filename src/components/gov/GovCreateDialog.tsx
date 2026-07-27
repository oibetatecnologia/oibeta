import React from 'react';
import { Landmark, X } from 'lucide-react';

interface GovCreateDialogProps {
  createType: string;
  formFields: any;
  setFormFields: (fields: any) => void;
  formError: string;
  formSubmitting: boolean;
  programs: any[];
  projectsData: any[];
  indicators: any[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

/**
 * GovCreateDialog
 *
 * Modal de criação de registros do Beta Gov.
 */
export default function GovCreateDialog({
  createType,
  formFields,
  setFormFields,
  formError,
  formSubmitting,
  programs,
  projectsData,
  indicators,
  onClose,
  onSubmit,
}: GovCreateDialogProps) {
  return (
<div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-lg rounded-xl overflow-hidden shadow-xl animate-scale-in">
    <div className="p-4 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between">
      <h3 className="text-sm font-bold text-[var(--text-main)] uppercase font-mono flex items-center gap-1.5">
        <Landmark className="w-4 h-4 text-indigo-400" /> Registrar {createType === 'program' ? 'Programa' : createType === 'project' ? 'Projeto' : createType === 'action' ? 'Ação' : 'Meta'}
      </h3>
      <button 
        onClick={() => onClose()}
        className="p-1 hover:bg-[var(--border-color)]/30 rounded text-[var(--text-secondary)] hover:text-[var(--text-main)]"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    <form onSubmit={onSubmit} className="p-6 space-y-4">
      {formError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg font-medium">
          {formError}
        </div>
      )}

      {/* PROGRAM FILDS */}
      {createType === 'program' && (
        <>
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Nome do Programa</label>
            <input 
              type="text"
              required
              placeholder="Ex: Programa Asfalto Novo"
              value={formFields.name}
              onChange={e => setFormFields({ ...formFields, name: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Secretaria de Destino</label>
            <input 
              type="text"
              placeholder="Ex: Secretaria de Obras"
              value={formFields.secretaria}
              onChange={e => setFormFields({ ...formFields, secretaria: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Período Fiscal</label>
            <input 
              type="text"
              placeholder="Ex: Exercício 2026"
              value={formFields.periodo}
              onChange={e => setFormFields({ ...formFields, periodo: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Descrição Técnica/Objetivos</label>
            <textarea 
              placeholder="Descreva as principais metas e impactos públicos deste programa..."
              value={formFields.description}
              onChange={e => setFormFields({ ...formFields, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </>
      )}

      {/* PROJECT FIELDS */}
      {createType === 'project' && (
        <>
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Vincular ao Programa</label>
            <select
              value={formFields.programId}
              onChange={e => setFormFields({ ...formFields, programId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
            >
              <option value="">Selecione um programa...</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Nome do Projeto</label>
            <input 
              type="text"
              required
              placeholder="Ex: Projeto Recapeamento Av. Principal"
              value={formFields.name}
              onChange={e => setFormFields({ ...formFields, name: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Responsável Técnico</label>
            <input 
              type="text"
              placeholder="Ex: Eng. Douglas Rezende"
              value={formFields.responsavel}
              onChange={e => setFormFields({ ...formFields, responsavel: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Detalhamento do Escopo</label>
            <textarea 
              placeholder="Especifique o cronograma, limites geográficos e impacto do projeto..."
              value={formFields.description}
              onChange={e => setFormFields({ ...formFields, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </>
      )}

      {/* ACTION FIELDS */}
      {createType === 'action' && (
        <>
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Vincular ao Projeto</label>
            <select
              value={formFields.projectId}
              onChange={e => setFormFields({ ...formFields, projectId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
            >
              <option value="">Selecione um projeto...</option>
              {projectsData.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Nome da Ação</label>
            <input 
              type="text"
              required
              placeholder="Ex: Mobilização de Canteiro de Obras"
              value={formFields.name}
              onChange={e => setFormFields({ ...formFields, name: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Prazo Máximo de Conclusão</label>
            <input 
              type="text"
              placeholder="Ex: 2026-08-30"
              value={formFields.prazo}
              onChange={e => setFormFields({ ...formFields, prazo: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Especificações</label>
            <textarea 
              placeholder="Descreva as instruções de controle..."
              value={formFields.description}
              onChange={e => setFormFields({ ...formFields, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none resize-none"
            />
          </div>
        </>
      )}

      {/* GOAL FIELDS */}
      {createType === 'goal' && (
        <>
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Selecione o Indicador Mapeado</label>
            <select
              value={formFields.indicatorId}
              onChange={e => setFormFields({ ...formFields, indicatorId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
            >
              <option value="">-- Criar novo indicador estratégico --</option>
              {indicators.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.indicatorName || ind.name}</option>
              ))}
            </select>
          </div>

          {!formFields.indicatorId && (
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg space-y-3">
              <p className="text-[10px] font-bold text-indigo-400 font-mono tracking-wide uppercase">Detalhes do Novo Indicador Autogerado</p>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">Nome do Indicador</label>
                <input 
                  type="text"
                  placeholder="Ex: Alinhamento Documental Interno"
                  value={formFields.indicatorName}
                  onChange={e => setFormFields({ ...formFields, indicatorName: e.target.value })}
                  className="w-full px-2 py-1 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded text-[var(--text-main)] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">Unidade de Medida</label>
                <input 
                  type="text"
                  placeholder="Ex: Percentual (%)"
                  value={formFields.unidade}
                  onChange={e => setFormFields({ ...formFields, unidade: e.target.value })}
                  className="w-full px-2 py-1 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded text-[var(--text-main)] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Descrição Completa da Meta</label>
            <input 
              type="text"
              required
              placeholder="Ex: Alcançar 100% de asfaltamento até o fim do semestre"
              value={formFields.descricaoMeta}
              onChange={e => setFormFields({ ...formFields, descricaoMeta: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono font-semibold">Valor Alvo (Target)</label>
              <input 
                type="number"
                required
                placeholder="Ex: 100"
                value={formFields.goalValue}
                onChange={e => setFormFields({ ...formFields, goalValue: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono font-semibold">Valor Atual (Realizado)</label>
              <input 
                type="number"
                placeholder="Ex: 0"
                value={formFields.currentValue}
                onChange={e => setFormFields({ ...formFields, currentValue: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 font-bold">
            <label className="block text-[10px] uppercase font-semibold text-[var(--text-secondary)] font-mono">Prazo Alvo</label>
            <input 
              type="text"
              placeholder="Ex: 2026-12-31"
              value={formFields.prazo}
              onChange={e => setFormFields({ ...formFields, prazo: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] text-xs border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
            />
          </div>
        </>
      )}

      <div className="p-4 bg-[var(--bg-sidebar)]/55 border border-[var(--border-color)]/60 rounded-xl flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={() => onClose()}
          className="px-4 py-1.5 bg-[var(--bg-main)] hover:bg-[var(--border-color)]/30 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] text-xs font-semibold rounded-lg transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={formSubmitting}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition shadow-sm"
        >
          {formSubmitting ? 'Salvando...' : 'Confirmar e Publicar'}
        </button>
      </div>
    </form>
  </div>
</div>
  );
}
