import { Calendar, Plus, Trash2 } from 'lucide-react';
import useDecisionsWorkspace from '../../hooks/useDecisionsWorkspace';

export default function DecisionsWorkspace() {
  const {
    filteredDecisions,
    newDecisionTitle,
    setNewDecisionTitle,
    newDecisionDesc,
    setNewDecisionDesc,
    handleCreateDecision,
    onDeleteDecision,
  } = useDecisionsWorkspace();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">📜 Registro de Decisões do Conselho</h3>
          <p className="text-xs text-slate-400">
            Verifique ou formalize decisões cruciais para auditoria de gestores públicos.
          </p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-mono font-bold">
          {filteredDecisions.length} Ativas
        </span>
      </div>

      <form onSubmit={handleCreateDecision} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
          Formalizar Nova Decisão Coletiva
        </span>
        <div>
          <input
            type="text"
            value={newDecisionTitle}
            onChange={(event) => setNewDecisionTitle(event.target.value)}
            placeholder="Título da Decisão. Ex: Contratação de nuvem soberana GovTech..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
            required
          />
        </div>
        <div>
          <textarea
            value={newDecisionDesc}
            onChange={(event) => setNewDecisionDesc(event.target.value)}
            placeholder="Especifique a justificativa, leis envolvidas ou as prefeituras parceiras decididas..."
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Registrar Decisão no Livro do Projeto
        </button>
      </form>

      <div className="space-y-3">
        {filteredDecisions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic bg-white rounded-2xl border border-dashed border-slate-200">
            Nenhuma decisão formal de diretoria salva para este projeto. O Oi Beta no Chat irá sugerir o cadastro durante as conversas estratégicas.
          </div>
        ) : (
          filteredDecisions.map((decision) => (
            <div
              key={decision.id}
              className="p-5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 relative shadow-sm"
            >
              <button
                type="button"
                onClick={() => onDeleteDecision(decision.id)}
                className="absolute top-4 right-4 text-slate-450 hover:text-rose-500 p-1.5 rounded hover:bg-slate-100 transition duration-150 cursor-pointer"
                title="Remover Registro"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0 shadow-[0_0_8px_#10b981]" />
                <h4 className="font-extrabold text-slate-800 text-sm leading-tight pr-8">
                  {decision.title}
                </h4>
              </div>

              {decision.description && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-150 p-3 rounded-lg italic pr-3 leading-relaxed">
                  {decision.description}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {new Date(decision.createdAt).toLocaleDateString()} às{' '}
                  {new Date(decision.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
