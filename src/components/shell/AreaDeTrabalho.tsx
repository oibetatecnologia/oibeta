import React from 'react';
import { AlertCircle, Briefcase, Loader2, Lock, Search, Sparkles } from 'lucide-react';

export type AreaDeTrabalhoEstado =
  | 'pronta'
  | 'carregando'
  | 'sem-projeto'
  | 'sem-permissao'
  | 'erro'
  | 'vazia';

interface AreaDeTrabalhoProps {
  titulo?: string;
  subtitulo?: string;
  moduloAtual?: string;
  estado?: AreaDeTrabalhoEstado;
  children?: React.ReactNode;
  acoes?: React.ReactNode;
  mensagem?: string;
  detalhes?: string;
  onTentarNovamente?: () => void;
}

/**
 * AreaDeTrabalho
 * Container central da Beta Platform.
 *
 * Responsabilidade:
 * - servir como área única de renderização dos módulos;
 * - padronizar estados de carregamento, erro, vazio e sem permissão;
 * - manter consistência visual entre Gov, Licita, Eleitoral, CRM, Agenda etc.;
 * - não buscar dados;
 * - não executar regra de negócio.
 */
export default function AreaDeTrabalho({
  titulo = 'Área de Trabalho',
  subtitulo = 'Organize, acompanhe e execute suas operações em um único lugar.',
  moduloAtual = 'Painel Geral',
  estado = 'pronta',
  children,
  acoes,
  mensagem,
  detalhes,
  onTentarNovamente,
}: AreaDeTrabalhoProps) {
  const renderEstado = () => {
    if (estado === 'carregando') {
      return (
        <EstadoCentral
          icon={<Loader2 className="w-7 h-7 animate-spin" />}
          titulo="Sincronizando a Área de Trabalho..."
          texto="Estou carregando as informações necessárias para continuar."
        />
      );
    }

    if (estado === 'sem-projeto') {
      return (
        <EstadoCentral
          icon={<Briefcase className="w-8 h-8" />}
          titulo="Nenhum projeto ativo"
          texto="Selecione ou crie um projeto para começar a trabalhar neste módulo."
        />
      );
    }

    if (estado === 'sem-permissao') {
      return (
        <EstadoCentral
          icon={<Lock className="w-8 h-8" />}
          titulo="Módulo não disponível"
          texto={mensagem || 'Sua organização ainda não possui acesso a este módulo.'}
          detalhes={detalhes}
        />
      );
    }

    if (estado === 'erro') {
      return (
        <EstadoCentral
          icon={<AlertCircle className="w-8 h-8" />}
          titulo="Não consegui carregar esta área"
          texto={mensagem || 'Ocorreu um problema ao preparar este módulo.'}
          detalhes={detalhes}
          acao={onTentarNovamente ? (
            <button
              type="button"
              onClick={onTentarNovamente}
              className="mt-3 px-4 py-2 rounded-lg bg-[var(--blue-accent)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer"
            >
              Tentar novamente
            </button>
          ) : null}
        />
      );
    }

    if (estado === 'vazia') {
      return (
        <EstadoCentral
          icon={<Search className="w-8 h-8" />}
          titulo="Nada para mostrar ainda"
          texto={mensagem || 'Quando houver informações disponíveis, elas aparecerão aqui.'}
          detalhes={detalhes}
        />
      );
    }

    return children;
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
      <div className="shrink-0 px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]/30 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--blue-accent)] font-mono bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 rounded-full px-2 py-0.5">
              <Sparkles className="w-3 h-3" />
              {moduloAtual}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight truncate">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed max-w-3xl">
              {subtitulo}
            </p>
          )}
        </div>

        {acoes && (
          <div className="shrink-0 flex items-center gap-2">
            {acoes}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {renderEstado()}
      </div>
    </div>
  );
}

interface EstadoCentralProps {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
  detalhes?: string;
  acao?: React.ReactNode;
}

function EstadoCentral({ icon, titulo, texto, detalhes, acao }: EstadoCentralProps) {
  return (
    <div className="h-full min-h-[360px] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center space-y-4 select-none">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--blue-accent)] flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-[var(--text-main)]">
            {titulo}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
            {texto}
          </p>
          {detalhes && (
            <p className="text-xs text-[var(--text-secondary)]/80 mt-2 leading-relaxed font-mono">
              {detalhes}
            </p>
          )}
        </div>
        {acao}
      </div>
    </div>
  );
}
