import React from 'react';
import { Bot, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react';

interface PainelBetaProps {
  aberta?: boolean;
  titulo?: string;
  subtitulo?: string;
  children?: React.ReactNode;
  onAlternar?: () => void;
}

/**
 * PainelBeta
 * Painel lateral permanente da assistente Beta.
 * Apenas apresenta conteúdo; não contém regras de negócio.
 */
export default function PainelBeta({
  aberta = true,
  titulo = 'Beta',
  subtitulo = 'Sua assistente operacional',
  children,
  onAlternar,
}: PainelBetaProps) {
  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)]">
      <div className="h-14 px-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20 text-[var(--blue-accent)]">
            <Bot className="w-4 h-4"/>
          </div>
          <div>
            <h2 className="text-sm font-black">{titulo}</h2>
            <p className="text-[10px] text-[var(--text-secondary)]">{subtitulo}</p>
          </div>
        </div>

        {onAlternar && (
          <button
            onClick={onAlternar}
            className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition"
            title="Ocultar Painel Beta"
          >
            {aberta ? <PanelRightClose className="w-4 h-4"/> : <PanelRightOpen className="w-4 h-4"/>}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {children ? (
          children
        ) : (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div className="space-y-3">
              <Sparkles className="w-8 h-8 mx-auto text-[var(--blue-accent)]"/>
              <h3 className="font-bold">Oi! Eu sou a Beta.</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Em breve este painel utilizará o Context Engine,
                Workspace Intelligence e Memory OS para acompanhar
                sua operação em tempo real.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
