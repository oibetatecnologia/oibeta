import React from 'react';
import { CheckCircle, MapPin, Pause, Play, Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../types';
import useProjectsWorkspace from '../../hooks/useProjectsWorkspace';

export default function ProjectsWorkspace() {
  const {
    projects,
    selectedProjectId,
    totalProjects,
    editingStopPointId,
    tempStopPointText,
    setTempStopPointText,
    setEditingStopPointId,
    startEditingStopPoint,
    saveStopPoint,
    onSelectProject,
    onToggleProjectStatus,
    onDeleteProject,
    newProjectName,
    setNewProjectName,
    newProjectDesc,
    setNewProjectDesc,
    newProjectStop,
    setNewProjectStop,
    handleCreateProject
  } = useProjectsWorkspace();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">📂 Gerenciador Analítico de Projetos</h3>
          <p className="text-xs text-slate-400">Ative, pause ou exclua projetos estruturais da Oi Beta.</p>
        </div>
        <div className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-mono font-bold">
          Total: {totalProjects}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {projects.map((project) => {
          const isSelected = project.id === selectedProjectId;
          const isEditingStop = editingStopPointId === project.id;

          return (
            <div
              key={project.id}
              className={`p-5 rounded-2xl border bg-white transition duration-150 ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/5 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  className="cursor-pointer flex-1 min-w-[200px] text-left bg-transparent border-0 p-0"
                  onClick={() => onSelectProject(project.id)}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-800 text-base">{project.name}</h4>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        project.status === 'active'
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : project.status === 'paused'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {project.status === 'active' ? 'Ativo' : project.status === 'paused' ? 'Pausado' : 'Concluído'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {project.description || 'Sem descrição.'}
                  </p>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleProjectStatus(project.id, 'active')}
                    className="p-1.5 rounded-lg text-xs bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 transition cursor-pointer"
                    title="Ativar"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleProjectStatus(project.id, 'paused')}
                    className="p-1.5 rounded-lg text-xs bg-slate-100 hover:bg-amber-500 text-slate-700 hover:text-white border border-slate-200 transition cursor-pointer"
                    title="Pausar"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleProjectStatus(project.id, 'completed')}
                    className="p-1.5 rounded-lg text-xs bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white border border-slate-200 transition cursor-pointer"
                    title="Concluir"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProject(project.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition ml-1 cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <MapPin className="w-4.5 h-4.5 text-blue-600" />
                    <span>PONTO DE PARADA (De onde paramos?):</span>
                  </div>
                  {!isEditingStop && (
                    <button
                      type="button"
                      onClick={() => startEditingStopPoint(project)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer hover:underline bg-transparent border-0"
                    >
                      Editar Ponto de Parada
                    </button>
                  )}
                </div>

                {isEditingStop ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={tempStopPointText}
                      onChange={(event) => setTempStopPointText(event.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      placeholder="Fomos até as rotas de banco de dados..."
                    />
                    <button
                      type="button"
                      onClick={() => saveStopPoint(project.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer shadow-sm"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStopPointId(null)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 font-medium italic mt-2 bg-white border border-slate-200 p-3 rounded-xl border-l-4 border-l-blue-600 shadow-inner">
                    "{project.lastStopPoint || 'Nenhum ponto registrado. Escreva no Chat ou edite aqui.'}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Plus className="w-5 h-5 text-blue-600" />
          <h4 className="font-extrabold text-slate-800 text-sm">Iniciar Nova Iniciativa Governamental / Corporativa</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 font-mono">Nome da Iniciativa *</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Ex: Oi Beta Licita v2, Monitoramento Operacional..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 font-mono">Descrição e Objetivos</label>
            <textarea
              value={newProjectDesc}
              onChange={(event) => setNewProjectDesc(event.target.value)}
              placeholder="Descreva o escopo e quem é o cliente ..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 font-mono">De onde paramos? (Estado Inicial)</label>
            <input
              type="text"
              value={newProjectStop}
              onChange={(event) => setNewProjectStop(event.target.value)}
              placeholder="Ex: Alinhados os pré-requisitos iniciais com o cliente..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleCreateProject(event);
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition uppercase tracking-widest flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Cadastrar Projeto
        </button>
      </div>
    </div>
  );
}
