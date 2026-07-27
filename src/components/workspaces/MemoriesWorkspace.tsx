import { Plus, Trash2 } from 'lucide-react';
import useMemoriesWorkspace from '../../hooks/useMemoriesWorkspace';

export default function MemoriesWorkspace() {
  const {
    filteredMemories,
    newMemoryContent,
    setNewMemoryContent,
    handleCreateMemory,
    onDeleteMemory,
  } = useMemoriesWorkspace();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="text-lg lg:text-xl font-bold text-[var(--text-main)] font-sans">
            🧠 Memórias Importantes de Longo Prazo
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)] mt-1">
            Banco de diretrizes fundamentais guardadas para guiar as respostas da inteligência.
          </p>
        </div>
        <span className="text-xs bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] px-3 py-1 rounded-lg font-mono font-bold">
          {filteredMemories.length} Ativas
        </span>
      </div>

      <form onSubmit={handleCreateMemory} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-color)] shadow-sm space-y-3.5">
        <span className="text-[10px] lg:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono">
          Gravar Nova Diretriz na Memória Principal
        </span>
        <div>
          <textarea
            value={newMemoryContent}
            onChange={(event) => setNewMemoryContent(event.target.value)}
            placeholder="Ex: O Prefeito prefere foco no atendimento de saúde digital e dados financeiros consolidados nas segundas-feiras às 08h..."
            rows={3}
            className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--blue-accent)] focus:bg-[var(--bg-card)] text-[var(--text-main)] placeholder:text-[var(--text-secondary)]/50"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-[var(--blue-accent)] hover:opacity-95 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer border-0"
        >
          <Plus className="w-4 h-4" /> Gravar na Memória da Beta
        </button>
      </form>

      <div className="space-y-3">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-secondary)] text-sm italic bg-[var(--bg-card)] rounded-2xl border border-dashed border-[var(--border-color)]">
            Nenhuma diretriz de memória salva para este projeto. Peça para a Beta lembrar no chat para salvar automaticamente.
          </div>
        ) : (
          filteredMemories.map((memory) => (
            <div
              key={memory.id}
              className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--blue-accent)]/30 rounded-xl flex gap-3 text-sm justify-between group shadow-sm transition"
            >
              <div className="space-y-1 my-0.5">
                <p className="font-semibold text-base text-[var(--text-main)] leading-relaxed italic">
                  "{memory.content}"
                </p>
                <p className="text-[10px] lg:text-xs text-[var(--text-secondary)] font-mono tracking-tight">
                  {new Date(memory.createdAt).toLocaleDateString()} {new Date(memory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDeleteMemory(memory.id)}
                className="text-[var(--text-secondary)] hover:text-rose-500 p-1.5 rounded hover:bg-[var(--bg-sidebar)] transition shrink-0 self-start cursor-pointer"
                title="Apagar diretriz"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
