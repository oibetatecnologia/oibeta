import React from 'react';
import { Building2, X } from 'lucide-react';

interface SidebarBrandHeaderProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

/**
 * SidebarBrandHeader
 * Cabeçalho visual do menu lateral da Beta.
 *
 * Responsabilidade:
 * - exibir marca Oi Beta;
 * - controlar colapso desktop;
 * - fechar menu mobile;
 * - não buscar dados.
 */
export default function SidebarBrandHeader({
  collapsed,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarBrandHeaderProps) {
  return (
    <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
      {!collapsed ? (
        <div className="flex items-center gap-2">
          <div className="bg-[var(--blue-accent)] text-white p-1.5 rounded-lg shadow-inner">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-[var(--text-main)] text-sm tracking-widest block font-sans">
              OI BETA
            </span>
            <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
              TECNOLOGIA
            </span>
          </div>
        </div>
      ) : (
        <div className="mx-auto bg-[var(--blue-accent)] text-white p-1.5 rounded-lg shadow-inner">
          <Building2 className="w-4 h-4 text-white" />
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapsed}
        className="hidden lg:flex p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] cursor-pointer text-xs"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? '→' : '←'}
      </button>

      <button
        type="button"
        onClick={onCloseMobile}
        className="lg:hidden p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-card)] text-[var(--text-main)] cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
