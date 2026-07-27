import React from 'react';
import { Project } from '../../types';

interface SidebarProjectsListProps {
  collapsed: boolean;
  projects: Project[];
  selectedProjectId: string;
  totalProjects: number;
  activeTab: string;
  onSelectProject: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

/**
 * SidebarProjectsList
 * Lista de projetos exibida no menu lateral.
 *
 * Responsabilidade:
 * - exibir projetos;
 * - indicar projeto ativo;
 * - selecionar projeto;
 * - não buscar dados.
 */
export default function SidebarProjectsList({
  collapsed,
  projects,
  selectedProjectId,
  totalProjects,
  activeTab,
  onSelectProject,
  setActiveTab,
}: SidebarProjectsListProps) {
  if (collapsed) return null;

  return (
    <>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-widest font-mono">
          Projetos da Oi Beta
        </span>
        <span className="text-[9px] bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] px-1.5 py-0.2 rounded font-mono font-bold leading-none">
          {totalProjects}
        </span>
      </div>

      <div className="px-2 space-y-0.5 max-h-[160px] overflow-y-auto">
        {projects.length === 0 ? (
          <div className="mx-2 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/25 px-3 py-3 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Nenhum projeto operacional criado ainda.
          </div>
        ) : (
          projects.map((project) => {
            const isSelected = project.id === selectedProjectId;

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  onSelectProject(project.id);
                  if (activeTab === 'settings') {
                    setActiveTab('dashboard');
                  }
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left rounded-md transition duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-card)] text-[var(--text-main)] font-semibold border border-[var(--border-color)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/45 hover:text-[var(--text-main)]'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    project.status === 'completed'
                      ? 'bg-[var(--green-accent)]'
                      : project.status === 'paused'
                        ? 'bg-amber-500'
                        : 'bg-[var(--blue-accent)]'
                  }`}
                />
                <span className="truncate flex-1 font-medium">
                  {project.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
