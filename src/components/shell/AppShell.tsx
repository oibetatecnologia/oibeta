import React from 'react';

interface AppShellProps {
  barraSuperior?: React.ReactNode;
  menuLateral?: React.ReactNode;
  areaDeTrabalho?: React.ReactNode;
  painelBeta?: React.ReactNode;
  barraInferior?: React.ReactNode;
  isPainelBetaCollapsed?: boolean;
  mobileBackdrop?: React.ReactNode;
}

/**
 * AppShell
 * Estrutura permanente da Beta Platform.
 *
 * Responsabilidade:
 * - organizar a interface principal;
 * - manter Barra Superior, Menu Lateral, Área de Trabalho, Painel Beta e Barra Inferior;
 * - não executar regras de negócio;
 * - não buscar dados;
 * - não conhecer módulos internos.
 *
 * Observação:
 * Este componente será conectado gradualmente ao App.tsx e ao ManagerPanel.tsx
 * sem quebrar a aplicação atual.
 */
export default function AppShell({
  barraSuperior,
  menuLateral,
  areaDeTrabalho,
  painelBeta,
  barraInferior,
  isPainelBetaCollapsed = false,
  mobileBackdrop,
}: AppShellProps) {
  return (
    <div className="h-screen w-full flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] font-sans overflow-hidden transition-colors duration-200">
      {barraSuperior && (
        <header className="shrink-0 z-40">
          {barraSuperior}
        </header>
      )}

      <main className="flex-1 w-full flex overflow-hidden min-h-0 relative bg-[var(--bg-main)]">
        {menuLateral && (
          <aside className="h-full shrink-0">
            {menuLateral}
          </aside>
        )}

        <section className="flex-1 h-full min-w-0 flex flex-col overflow-hidden relative">
          {areaDeTrabalho}
        </section>

        {painelBeta && (
          <aside
            className={`h-full border-l border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col overflow-hidden transition-all duration-300 z-30 absolute lg:relative right-0 top-0 shadow-xl lg:shadow-none ${
              isPainelBetaCollapsed
                ? 'w-[0px] translate-x-full lg:translate-x-0 lg:w-0 border-l-0 opacity-0 pointer-events-none'
                : 'w-[320px] sm:w-[380px] lg:w-[380px] translate-x-0'
            }`}
          >
            {painelBeta}
          </aside>
        )}

        {mobileBackdrop}
      </main>

      {barraInferior && (
        <footer className="shrink-0 z-45">
          {barraInferior}
        </footer>
      )}
    </div>
  );
}
