import React from 'react';
import { CheckSquare, LayoutDashboard, Plus } from 'lucide-react';
import { Project } from '../../types';
import NotificationBell from '../notifications/NotificationBell';

interface ProjectFocusHeaderProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProjectClick: () => void;
  onOpenMobileMenu: () => void;
  onNotificationNavigate?: (tabId: string) => void;
}

/**
 * ProjectFocusHeader
 * Cabeçalho interno da Área de Trabalho.
 *
 * Responsabilidade:
 * - exibir seletor de Projeto Ativo;
 * - abrir menu lateral no mobile;
 * - acionar a tela de criação de projeto;
 * - não buscar dados;
 * - não executar regra de negócio.
 */
export default function ProjectFocusHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProjectClick,
  onOpenMobileMenu,
  onNotificationNavigate,
}: ProjectFocusHeaderProps) {
  return (
    <div className="px-6 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3 bg-[var(--bg-sidebar)]/30">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-sidebar)]"
          title="Abrir navegação"
        >
          <LayoutDashboard className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono block mb-1">
            CONTEXTO OPERACIONAL
          </span>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[var(--blue-accent)] shrink-0 hidden sm:block" />
            <select
              value={selectedProjectId}
              onChange={(event) => onSelectProject(event.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:outline-none focus:border-[var(--blue-accent)] font-bold tracking-tight cursor-pointer transition max-w-full"
              id="global-project-picker"
            >
              <option value="" disabled className="text-slate-500">
                Nenhum projeto operacional criado
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.status === 'active' ? 'Ativo' : project.status === 'paused' ? 'Pausado' : 'Concluído'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <NotificationBell
          onNavigate={onNotificationNavigate}
        />
        <button
          type="button"
          onClick={onCreateProjectClick}
          className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova Tarefa</span>
        </button>
      </div>
    </div>
  );
}
