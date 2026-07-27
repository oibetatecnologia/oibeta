import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  ativo?: boolean;
  badge?: string;
  onClick?: () => void;
}

interface MenuLateralProps {
  titulo?: string;
  grupos: {
    id: string;
    titulo: string;
    itens: MenuItem[];
  }[];
  recolhido?: boolean;
}

/**
 * MenuLateral
 * Estrutura permanente de navegação da Beta Platform.
 * Não contém regras de negócio; apenas renderiza os grupos recebidos.
 */
export default function MenuLateral({
  titulo = "Navegação",
  grupos,
  recolhido = false,
}: MenuLateralProps) {
  return (
    <aside className={`h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-all duration-300 ${recolhido ? "w-20" : "w-72"}`}>
      <div className="h-14 flex items-center px-4 border-b border-[var(--border-color)]">
        {!recolhido && (
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
            {titulo}
          </h2>
        )}
      </div>

      <div className="overflow-y-auto h-[calc(100%-56px)] px-2 py-3 space-y-5">
        {grupos.map((grupo) => (
          <div key={grupo.id}>
            {!recolhido && (
              <p className="px-2 mb-2 text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)]">
                {grupo.titulo}
              </p>
            )}

            <div className="space-y-1">
              {grupo.itens.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 transition ${
                    item.ativo
                      ? "bg-[var(--blue-accent)]/10 text-[var(--blue-accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    {!recolhido && (
                      <span className="truncate text-sm font-medium">
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!recolhido && (
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[9px] font-bold rounded-full px-2 py-0.5 bg-[var(--blue-accent)]/10 border border-[var(--blue-accent)]/20">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 opacity-40" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
