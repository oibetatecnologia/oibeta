import { FileSignature, Files } from 'lucide-react';
import useDocumentsWorkspace from '../../hooks/useDocumentsWorkspace';

export default function DocumentsWorkspace() {
  const {
    selecteddocTemplate,
    setSelectedDocTemplate,
    docCityName,
    setDocCityName,
    docSubject,
    setDocSubject,
    generatedDoc,
    handleGenerateDocument,
  } = useDocumentsWorkspace();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="text-lg lg:text-xl font-bold text-[var(--text-main)] font-sans">
            📄 Central de Gerador Litúrgico de Documentos
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)]">
            Gere ofícios municipais, atas de comissão e contratos sob o padrão Oi Beta S/A.
          </p>
        </div>
        <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold px-2.5 py-1 rounded-lg">
          Oficial GovTech
        </span>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-4">
        <span className="text-[10px] lg:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono">
          Parametrizador Inteligente
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
              Modelo Legal:
            </label>
            <select
              value={selecteddocTemplate}
              onChange={(event) => setSelectedDocTemplate(event.target.value)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--text-main)] font-semibold cursor-pointer"
            >
              <option value="oficio">Ofício Governamental (Prefeitura)</option>
              <option value="ata">Ata de Alinhamento e Metas</option>
              <option value="contrato">Contrato Provisório de Parceria</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
              Entidade/Cidade Parceira:
            </label>
            <input
              type="text"
              value={docCityName}
              onChange={(event) => setDocCityName(event.target.value)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--text-main)] font-semibold"
              placeholder="Ex: Prefeitura de Joinville"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
              Tema/Assunto Central:
            </label>
            <input
              type="text"
              value={docSubject}
              onChange={(event) => setDocSubject(event.target.value)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--text-main)] font-semibold"
              placeholder="Tema estratégico..."
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateDocument}
          className="bg-[var(--blue-accent)] hover:opacity-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer mx-auto shadow-sm border-0"
        >
          <FileSignature className="w-4 h-4" /> Compilar com Oi Beta inteligência
        </button>
      </div>

      {generatedDoc ? (
        <div className="space-y-3 bg-[#0d162d] text-cyan-50 p-6 rounded-2xl shadow-lg border border-blue-900/40">
          <div className="flex items-center justify-between border-b border-blue-900/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] font-bold text-cyan-300 font-mono uppercase tracking-widest">
                Compilador Jurídico Oficial Completo
              </span>
            </div>
            <button
              type="button"
              onClick={() => alert('Texto copiado para a área de transferência com sucesso!')}
              className="text-[10px] bg-blue-800/40 hover:bg-blue-800 text-cyan-200 font-bold px-2.5 py-1 rounded border border-blue-700/50"
            >
              Copiar Conteúdo
            </button>
          </div>
          <pre className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-mono px-2 py-1 scrollbar-thin overflow-auto max-h-[300px]">
            {generatedDoc}
          </pre>
        </div>
      ) : (
        <div className="text-center py-12 bg-[var(--bg-card)] rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center gap-2">
          <Files className="w-10 h-10 text-[var(--text-secondary)]/55" />
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic">
            Insira os parâmetros acima e clique em &quot;Compilar&quot; para gerar um modelo padrão para seu Gabinete.
          </p>
        </div>
      )}
    </div>
  );
}
