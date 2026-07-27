import React from 'react';
import { Building2, Briefcase, Layers, Bell, Search, UserCircle, Settings, Wifi } from 'lucide-react';

export interface BarraSuperiorUsuario {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  workspaceId?: string;
}

export interface BarraSuperiorProjeto {
  id: string;
  name: string;
  status?: 'active' | 'paused' | 'completed' | string;
}

interface BarraSuperiorProps {
  organizacaoNome?: string;
  areaDeTrabalhoNome?: string;
  moduloAtual?: string;
  usuario?: BarraSuperiorUsuario | null;
  projetoAtivo?: BarraSuperiorProjeto | null;
  projetos?: BarraSuperiorProjeto[];
  onSelectProject?: (id: string) => void;
  onToggleBeta?: () => void;
  onOpenSettings?: () => void;
  betaAberta?: boolean;
  statusConexao?: 'online' | 'offline' | 'sincronizando';
}

/**
 * BarraSuperior
 * Cabeçalho permanente da Beta Platform.
 *
 * Responsabilidade:
 * - exibir contexto operacional;
 * - exibir organização, área de trabalho, projeto ativo e usuário;
 * - permitir troca de projeto quando uma lista for fornecida;
 * - não buscar dados;
 * - não executar regra de negócio.
 */
export default function BarraSuperior({
  organizacaoNome = 'Oi Beta Tecnologia',
  areaDeTrabalhoNome = 'Área de Trabalho',
  moduloAtual = 'Painel Geral',
  usuario = null,
  projetoAtivo = null,
  projetos = [],
  onSelectProject,
  onToggleBeta,
  onOpenSettings,
  betaAberta = true,
  statusConexao = 'online',
}: BarraSuperiorProps) {
  const statusLabel =
    statusConexao === 'online'
      ? 'Online'
      : statusConexao === 'sincronizando'
        ? 'Sincronizando'
        : 'Offline';

  const statusClass =
    statusConexao === 'online'
      ? 'bg-[var(--green-accent)]'
      : statusConexao === 'sincronizando'
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <div className="h-[56px] shrink-0 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center justify-between px-4 gap-4 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-[var(--blue-accent)]/15 border border-[var(--blue-accent)]/30 text-[var(--blue-accent)] p-1.5 rounded-lg flex items-center justify-center shadow-sm">
          <Building2 className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-extrabold tracking-wider text-sm text-[var(--text-main)] font-sans truncate">
              OI BETA
            </h1>
            <span className="text-[9px] bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] font-semibold border border-[var(--blue-accent)]/20 px-1.5 py-0.2 rounded-full tracking-wider uppercase font-mono">
              {areaDeTrabalhoNome}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-mono tracking-tight font-medium leading-none mt-0.5 min-w-0">
            <span className="truncate">{organizacaoNome}</span>
            <span>•</span>
            <span className="truncate">{moduloAtual}</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3 flex-1 justify-center min-w-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] min-w-[260px] max-w-[420px]">
          <Briefcase className="w-4 h-4 text-[var(--blue-accent)] shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono leading-none mb-1">
              Projeto Ativo
            </span>
            {projetos.length > 0 && onSelectProject ? (
              <select
                value={projetoAtivo?.id || ''}
                onChange={(event) => onSelectProject(event.target.value)}
                className="w-full bg-transparent text-[var(--text-main)] text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="" disabled>Selecione um projeto...</option>
                {projetos.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="block text-xs font-bold text-[var(--text-main)] truncate">
                {projetoAtivo?.name || 'Nenhum projeto selecionado'}
              </span>
            )}
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] min-w-[220px]">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs truncate">Buscar na Área de Trabalho...</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[10px] font-bold text-[var(--text-secondary)] font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${statusClass} ${statusConexao === 'online' ? 'animate-pulse' : ''}`} />
          <Wifi className="w-3.5 h-3.5" />
          {statusLabel}
        </div>

        <button
          type="button"
          className="hidden sm:flex p-2 rounded-lg border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition cursor-pointer"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleBeta}
          className={`p-2 rounded-lg border transition-all duration-150 flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
            betaAberta
              ? 'bg-[var(--blue-accent)]/10 border-[var(--blue-accent)]/30 text-[var(--blue-accent)]'
              : 'bg-transparent border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
          }`}
          title="Abrir ou ocultar a Beta"
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">Beta</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-lg border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition cursor-pointer"
          title="Configurações"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-[var(--border-color)] min-w-0">
          <UserCircle className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-[var(--text-main)] truncate max-w-[130px]">
              {usuario?.name || 'Usuário'}
            </span>
            <span className="block text-[9px] text-[var(--text-secondary)] font-mono truncate max-w-[130px]">
              {usuario?.role || 'operador'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
