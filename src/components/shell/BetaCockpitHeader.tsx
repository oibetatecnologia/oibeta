import React from 'react';
import { Briefcase, LayoutDashboard, Plus } from 'lucide-react';
import { Project } from '../../types';

interface BetaCockpitHeaderProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  setActiveTab: (tab: string) => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
}

export default function BetaCockpitHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  setActiveTab,
  setIsMobileSidebarOpen
}: BetaCockpitHeaderProps) {
  return (
    <div className="px-6 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--bg-sidebar)]/30">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Mobile Hamburger menu */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-sidebar)]"
          title="Open Navigation"
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        {/* Project Picker dropdown */}
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono block mb-1">
            PROJETO DE FOCO OPERACIONAL
          </span>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--blue-accent)] shrink-0 hidden sm:block" />
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-[var(--blue-accent)] font-bold tracking-tight cursor-pointer transition max-w-full"
              id="global-project-picker"
            >
              <option value="" disabled className="text-slate-500">
                Selecione o projeto ativo...
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status === 'active' ? 'Ativo' : p.status === 'paused' ? 'Pausado' : 'Concluído'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('projects');
            setIsMobileSidebarOpen(false);
          }}
          className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition"
        >
          <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Novo Projeto</span>
        </button>
      </div>
    </div>
  );
}
