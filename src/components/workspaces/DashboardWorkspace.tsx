import React from 'react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import {
  Activity,
  Target,
  MapPin,
  CheckSquare,
  FileText,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Circle
} from 'lucide-react';

export default function DashboardWorkspace() {
  const workspace = useWorkspace();

  const { setActiveTab } = workspace.navigation;
  const {
    currentProject,
    currentProjectState,
    isEditingState,
    setIsEditingState,
    editObjective,
    setEditObjective,
    editStage,
    setEditStage,
    handleSaveState,
    startEditingState,
    handleRecalculateContext,
    isRecalculating,
    activeProjectsCount,
    totalProjects,
    tempStopPoint,
    setTempStopPoint,
    isEditingStopPoint,
    setIsEditingStopPoint,
    handleSaveStopPoint,
  } = workspace.projects;

  const { filteredTasks, onToggleTaskStatus } = workspace.tasks;
  const { filteredDecisions } = workspace.decisions;
  const { filteredMemories } = workspace.memories;
  const { actionLogs } = workspace.logs;
  return (
    <div className="space-y-6">
              
              {currentProject ? (
                <div className="space-y-6">
                  {/* Markdown Display Title Block */}
                  <div className="border-b border-[var(--border-color)] pb-3">
                    <h1 className="text-2xl font-black text-[var(--text-main)] font-sans"># {currentProject.name}</h1>
                    <p className="text-xs text-[var(--text-secondary)] italic mt-1">*Núcleo de inteligência, memória e automação da Oi Beta.*</p>
                  </div>

                  {/* Objective & Stage details (Header indicators) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] block font-mono">Alinhamento</span>
                      <h4 className="text-xs font-semibold text-[var(--text-main)] mt-2 block leading-snug">
                        {currentProjectState?.currentObjective || "Alinhamento preliminar de objetivos operacionais."}
                      </h4>
                      <span className="text-[9px] text-[var(--blue-accent)] font-semibold block mt-1">Objetivo Direcionador</span>
                    </div>

                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] block font-mono">Fase Corrente</span>
                      <h4 className="text-xs font-semibold text-[var(--text-main)] mt-2 block leading-snug">
                        {currentProjectState?.currentStage || "Fase de Planejamento Estratégico"}
                      </h4>
                      <span className="text-[9px] text-[var(--cyan-accent)] font-semibold block mt-1">Etapa de Pipeline</span>
                    </div>

                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm select-none">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] block font-mono">Confiança</span>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[var(--green-accent)] animate-pulse" />
                        <span className="text-xs font-bold text-[var(--text-main)]">
                          Score: {currentProjectState?.confidenceScore ?? 85}%
                        </span>
                      </div>
                      <span className="text-[9px] text-[var(--green-accent)] font-semibold block mt-1.5">Qualidade de Contexto</span>
                    </div>
                  </div>

                  {/* Dynamic Action / Edit aligned controllers */}
                  <div className="flex items-center justify-between gap-4 py-2 border-y border-[var(--border-color)]">
                    <span className="text-xs text-[var(--text-secondary)] font-semibold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-[var(--blue-accent)] shrink-0" />
                      BetaMemoryEngine Ativo
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {isEditingState ? (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={handleSaveState}
                            className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                            id="btn-save-aligned"
                          >
                            Salvar Alinhamento
                          </button>
                          <button 
                            onClick={() => setIsEditingState(false)}
                            className="bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] text-[11px] font-bold px-2 a py-1.5 rounded-lg"
                            id="btn-cancel-aligned"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={startEditingState}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-sidebar)] text-[var(--text-main)] text-[11px] font-bold px-3 py-1.5 rounded-lg transition"
                            id="btn-edit-aligned"
                          >
                            Editar Diretrizes
                          </button>
                          <button 
                            onClick={handleRecalculateContext}
                            disabled={isRecalculating}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-sidebar)] text-[var(--text-main)] text-[11px] font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-55"
                            id="btn-recalculate-context-beta"
                          >
                            {isRecalculating ? "Analisando..." : "Recalcular Contexto"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strategic objective/stage editor inputs */}
                  {isEditingState && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Objetivo Estratégico do Projeto</label>
                        <input 
                          type="text" 
                          value={editObjective}
                          onChange={(e) => setEditObjective(e.target.value)}
                          className="w-full text-xs p-2.5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Etapa do Pipeline</label>
                        <input 
                          type="text" 
                          value={editStage}
                          onChange={(e) => setEditStage(e.target.value)}
                          className="w-full text-xs p-2.5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Executive Header Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-3 select-none">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main)] font-sans tracking-tight"># {currentProject.name}</h1>
                      <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                        Centro de Controle e Gestão da Inteligência Executiva Oi Beta.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {isEditingState ? (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={handleSaveState}
                            className="bg-[var(--blue-accent)] hover:opacity-90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm border-0 cursor-pointer"
                            id="btn-save-aligned"
                          >
                            Salvar Alinhamento
                          </button>
                          <button 
                            onClick={() => setIsEditingState(false)}
                            className="bg-[var(--bg-card)] hover:bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-color)] text-[11px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                            id="btn-cancel-aligned"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={startEditingState}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-sidebar)] text-[var(--text-main)] text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                            id="btn-edit-aligned"
                          >
                            Editar Diretrizes
                          </button>
                          <button 
                            onClick={handleRecalculateContext}
                            disabled={isRecalculating}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-sidebar)] text-[var(--text-main)] text-[11px] font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-55 cursor-pointer"
                            id="btn-recalculate-context-beta"
                          >
                            {isRecalculating ? "Analisando..." : "Recalcular Contexto"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strategic objective/stage editor inputs */}
                  {isEditingState && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-inner">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Objetivo Estratégico do Projeto</label>
                        <input 
                          type="text" 
                          value={editObjective}
                          onChange={(e) => setEditObjective(e.target.value)}
                          className="w-full text-xs p-2.5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Etapa do Pipeline</label>
                        <input 
                          type="text" 
                          value={editStage}
                          onChange={(e) => setEditStage(e.target.value)}
                          className="w-full text-xs p-2.5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-[var(--blue-accent)]"
                        />
                      </div>
                    </div>
                  )}

                  {/* 2. NOVO TOPO EXECUTIVO */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="faixa-executiva-dashboard">
                    {/* Card 1: Projetos Ativos */}
                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm hover:scale-[1.01] transition duration-150 select-none">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] font-mono flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-[var(--blue-accent)]" /> Projetos Ativos
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] mt-2 font-mono">
                        {activeProjectsCount} <span className="text-xs font-semibold text-[var(--text-secondary)]">/ {totalProjects}</span>
                      </h3>
                      <span className="text-[9px] text-[var(--text-secondary)] mt-1.5 font-medium">Ativos no ecossistema</span>
                    </div>

                    {/* Card 2: Tarefas Projeto */}
                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm hover:scale-[1.01] transition duration-150 select-none">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] font-mono flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Tarefas Pendentes
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] mt-2 font-mono">
                        {filteredTasks.filter(t => t.status !== 'completed').length} <span className="text-xs font-semibold text-[var(--text-secondary)]">/ {filteredTasks.length}</span>
                      </h3>
                      <span className="text-[9px] text-amber-500 mt-1.5 font-bold">Por sintonizar</span>
                    </div>

                    {/* Card 3: Decisões Registradas */}
                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm hover:scale-[1.01] transition duration-150 select-none">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] font-mono flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-400" /> Decisões Resolvidas
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] mt-2 font-mono">
                        {filteredDecisions.length}
                      </h3>
                      <span className="text-[9px] text-[var(--text-secondary)] mt-1.5 font-medium">Sons de consenso</span>
                    </div>

                    {/* Card 4: Memórias Salvas */}
                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm hover:scale-[1.01] transition duration-150 select-none">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] font-mono flex items-center gap-1">
                        <BrainCircuit className="w-3.5 h-3.5 text-[var(--cyan-accent)]" /> Memórias Ativas
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] mt-2 font-mono">
                        {filteredMemories.length}
                      </h3>
                      <span className="text-[9px] text-[var(--cyan-accent)] mt-1.5 font-bold">Base corporativa</span>
                    </div>

                    {/* Card 5: Confiança IA */}
                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between shadow-sm hover:scale-[1.01] transition duration-150 select-none col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] font-mono flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-[var(--green-accent)] animate-pulse" /> Sincronismo IA
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] mt-2 font-mono">
                        {currentProjectState?.confidenceScore ?? 90}%
                      </h3>
                      <div className="h-1 text-full bg-[var(--bg-sidebar)] rounded-full overflow-hidden mt-2 text-left">
                        <div 
                          className="h-full bg-[var(--green-accent)] transition-all duration-300" 
                          style={{ width: `${currentProjectState?.confidenceScore ?? 90}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1. REDUZIR TEXTO EM 70% — Compact layout of Estado Atual with quote block style */}
                  <div className="p-4 bg-[var(--bg-card)]/30 border border-[var(--border-color)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-[var(--blue-accent)] shrink-0 animate-pulse mt-1.5" />
                      <div className="text-xs sm:text-sm">
                        <span className="font-bold text-[var(--text-secondary)] mr-2 font-mono uppercase tracking-wider">ESTADO ATUAL:</span>
                        <span className="text-[var(--text-main)] italic font-semibold">
                          "{currentProjectState?.executiveSummary || `Minha rede de memória está catalogando as informações do projeto "${currentProject.name}".`}"
                        </span>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-mono text-[var(--text-secondary)] shrink-0 select-none whitespace-nowrap">
                      Sincronizado: {currentProjectState ? new Date(currentProjectState.lastUpdatedDate).toLocaleDateString('pt-BR') : 'Hoje'}
                    </span>
                  </div>

                  {/* 8. GRID EXECUTIVO COCKPIT */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-4">
                    
                    {/* ROW 1 LEFT: 4. WIDGET PRÓXIMA AÇÃO */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] border-l-4 border-l-[var(--blue-accent)] rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] md:text-xs font-bold text-[var(--blue-accent)] uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" /> 🎯 Diretriz Recomendada
                          </span>
                          <span className="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded font-mono bg-rose-500/10 text-rose-500 border border-rose-500/15 tracking-wider font-sans shrink-0">
                            ALTA
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] leading-snug">
                            {currentProjectState?.nextRecommendedAction || "Executar e certificar os pontos de checagem do pipeline."}
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                            Mapeada de forma autônoma pelo cérebro em conformidade com as discussões corporativas.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[var(--border-color)]/30">
                        <button
                          onClick={() => setActiveTab('tasks')}
                          className="bg-[var(--blue-accent)] hover:opacity-95 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all w-full md:w-auto cursor-pointer shadow-sm border-0"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Abrir tarefa
                        </button>
                      </div>
                    </div>

                    {/* ROW 1 RIGHT: 3. WIDGET DE ONDE PARAMOS */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" /> 📍 ÚLTIMO MARCO
                          </span>
                          <button 
                            type="button"
                            onClick={() => {
                              setTempStopPoint(currentProject.lastStopPoint || '');
                              setIsEditingStopPoint(true);
                            }}
                            className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-[var(--blue-accent)] hover:underline border border-[var(--border-color)] bg-[var(--bg-sidebar)] px-2.5 py-1 rounded-lg cursor-pointer"
                          >
                            EDITAR
                          </button>
                        </div>

                        {isEditingStopPoint ? (
                          <form onSubmit={handleSaveStopPoint} className="flex gap-2 bg-[var(--bg-sidebar)] p-2 rounded-xl border border-[var(--border-color)]">
                            <input 
                              type="text" 
                              value={tempStopPoint}
                              onChange={(e) => setTempStopPoint(e.target.value)}
                              className="flex-1 text-xs sm:text-sm p-1.5 bg-transparent text-[var(--text-main)] focus:outline-none font-semibold border-0"
                              placeholder="Descreva onde o trabalho parou..."
                            />
                            <button type="submit" className="px-3 bg-[var(--blue-accent)] text-white text-xs font-bold rounded-lg hover:opacity-90 border-0 cursor-pointer">Salvar</button>
                            <button type="button" onClick={() => setIsEditingStopPoint(false)} className="px-1.5 text-[var(--text-main)] text-xs rounded-lg cursor-pointer">X</button>
                          </form>
                        ) : (
                          <div className="space-y-4">
                            <blockquote className="text-sm font-semibold text-[var(--text-main)] italic leading-relaxed pl-3 border-l-2 border-amber-500">
                              "{currentProject.lastStopPoint || "Sem ponto de parada estrategicamente mapeado."}"
                            </blockquote>

                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--border-color)]/30 text-xs select-none">
                              <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block font-mono">Sprint Atual</span>
                                <span className="font-bold text-[var(--text-main)] block font-sans">Sprint 8</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block font-mono">Atualizado</span>
                                <span className="font-bold text-[var(--text-main)] block font-sans">Hoje</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ROW 2 LEFT: 5. WIDGET TAREFAS */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-[var(--blue-accent)]" /> 📋 TAREFAS CORPORATIVAS
                          </span>
                          <button 
                            onClick={() => setActiveTab('tasks')}
                            className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-[var(--blue-accent)] hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Backlog ({filteredTasks.length})
                          </button>
                        </div>

                        <div className="space-y-2 select-none">
                          {filteredTasks.length === 0 ? (
                            <p className="text-xs text-[var(--text-secondary)] italic p-4 text-center">Nenhuma tarefa catalogada para este projeto.</p>
                          ) : (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {filteredTasks.slice(0, 5).map(task => {
                                const isCompleted = task.status === 'completed';
                                return (
                                  <div 
                                    key={task.id} 
                                    onClick={() => onToggleTaskStatus(task.id, task.status)}
                                    className="flex items-center gap-3 py-2 px-3 bg-[var(--bg-sidebar)]/35 border border-[var(--border-color)]/30 rounded-xl hover:border-[var(--blue-accent)]/30 cursor-pointer transition"
                                  >
                                    <div className="shrink-0 flex items-center justify-center">
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-[var(--text-secondary)]" />
                                      )}
                                    </div>
                                    <span className={`text-xs sm:text-xs font-semibold flex-1 truncate ${isCompleted ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-main)]'}`}>
                                      {task.title}
                                    </span>
                                    <span className={`text-[8.5px] uppercase font-bold px-1.5 py-0.5 rounded font-mono border tracking-wider shrink-0 select-none ${
                                      task.priority === 'alta' || task.priority === 'crítica'
                                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/15'
                                        : 'bg-[var(--blue-accent)]/15 text-[var(--blue-accent)] border-[var(--blue-accent)]/20'
                                    }`}>
                                      {task.priority || 'média'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ROW 2 RIGHT: 6. WIDGET DECISÕES */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-400" /> 📜 ÚLTIMAS DECISÕES
                          </span>
                          <button 
                            onClick={() => setActiveTab('decisions')}
                            className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-[var(--blue-accent)] hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Visualizar
                          </button>
                        </div>

                        <div className="space-y-2">
                          {filteredDecisions.length === 0 ? (
                            <p className="text-xs text-[var(--text-secondary)] italic p-4 text-center">Nenhuma decisão formal corporativa listada.</p>
                          ) : (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                              {filteredDecisions.slice(0, 4).map(dec => (
                                <div key={dec.id} className="flex items-start gap-2.5 p-3 bg-[var(--bg-sidebar)]/30 border border-[var(--border-color)]/30 rounded-xl">
                                  <span className="text-[var(--blue-accent)] font-bold mt-0.5 text-base leading-none shrink-0">•</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-extrabold text-xs text-[var(--text-main)] block mb-0.5 truncate">{dec.title}</span>
                                    <span className="text-[var(--text-secondary)] text-[10.5px] leading-relaxed block line-clamp-2">{dec.description}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ROW 3 LEFT: 7. WIDGET MEMÓRIAS */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <BrainCircuit className="w-3.5 h-3.5 text-[var(--cyan-accent)]" /> 🧠 MEMÓRIAS IMPORTANTES
                          </span>
                          <button 
                            onClick={() => setActiveTab('memories')}
                            className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-[var(--blue-accent)] hover:underline cursor-pointer bg-transparent border-0"
                          >
                            Gerenciar
                          </button>
                        </div>

                        <div className="space-y-2">
                          {filteredMemories.length === 0 ? (
                            <p className="text-xs text-[var(--text-secondary)] italic p-4 text-center">Nenhum evento sintonizado na inteligência.</p>
                          ) : (
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                              {filteredMemories.slice(0, 3).map(mem => (
                                <div key={mem.id} className="p-3 bg-[var(--bg-sidebar)]/35 border border-[var(--border-color)]/30 rounded-xl relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--cyan-accent)]/80" />
                                  <p className="text-xs italic font-semibold text-[var(--text-main)] leading-relaxed pl-1.5">
                                    "{mem.content}"
                                  </p>
                                  <div className="flex items-center gap-2.5 mt-2 pl-1.5 select-none font-mono">
                                    <span className="text-[8px] text-[var(--text-secondary)] uppercase font-bold tracking-wide">TIPO: {mem.type || 'Fato'}</span>
                                    <span className="text-[8px] text-[var(--cyan-accent)] uppercase font-bold tracking-wide">• IMPACTO: {mem.importance || 'alta'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ROW 3 RIGHT: 9. IA INSIGHTS */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between select-none">
                          <span className="text-[10px] md:text-xs font-bold text-[var(--cyan-accent)] uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 animate-pulse" /> 🤖 INSIGHTS DA BETA
                          </span>
                          <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded font-mono bg-[var(--cyan-accent)]/10 text-[var(--cyan-accent)] border border-[var(--cyan-accent)]/15 select-none font-bold">
                            Live Telemetry
                          </span>
                        </div>

                        <div className="space-y-4 font-sans select-none">
                          <div className="grid grid-cols-2 gap-3.5">
                            
                            <div className="p-3 bg-[var(--bg-sidebar)]/40 border border-[var(--border-color)]/40 rounded-xl">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] block font-mono">Confiança</span>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black text-[var(--text-main)] font-mono">
                                  {currentProjectState?.confidenceScore ?? 90}%
                                </span>
                                <span className="text-[9px] text-[var(--green-accent)] font-semibold font-mono font-bold">ALTA</span>
                              </div>
                            </div>

                            <div className="p-3 bg-[var(--bg-sidebar)]/40 border border-[var(--border-color)]/40 rounded-xl">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] block font-mono">Risco</span>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black text-rose-400 font-mono">Baixo</span>
                                <span className="text-[8px] uppercase font-bold text-[var(--green-accent)] bg-emerald-500/10 px-1 rounded font-mono font-bold">Ok</span>
                              </div>
                            </div>

                            <div className="p-3 bg-[var(--bg-sidebar)]/40 border border-[var(--border-color)]/40 rounded-xl col-span-2">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] block font-mono">Próximo Marco Operacional</span>
                              <span className="text-xs font-bold text-[var(--text-main)] block mt-1 truncate">
                                {currentProjectState?.currentStage || "Alinhamento & Integração Supabase"}
                              </span>
                            </div>

                            <div className="p-3 bg-[var(--bg-sidebar)]/40 border border-[var(--border-color)]/40 rounded-xl col-span-2 select-none">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] block font-mono font-bold">Status de Entrega</span>
                                <span className="text-[9px] font-mono text-[var(--green-accent)] font-bold">EM CONFORMIDADE</span>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ## 7. Histórico de Ações */}
                  <div className="space-y-2 lg:space-y-3 mt-6">
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] font-mono block">## 7. Histórico de Ações</h2>
                    <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm">
                      {actionLogs.length === 0 ? (
                        <p className="text-sm text-[var(--text-secondary)] italic">Nenhuma ação recente auditada.</p>
                      ) : (
                        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 select-none">
                          {actionLogs.slice(-5).reverse().map((log: any) => (
                            <div key={log.id} className="p-3 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded uppercase leading-none tracking-wider shrink-0 select-none ${
                                  log.actionType.includes("Task") ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" :
                                  log.actionType.includes("Decision") ? "bg-amber-500/10 text-amber-400 border border-amber-500/10" :
                                  log.actionType.includes("Project") ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" :
                                  "bg-purple-500/10 text-purple-400 border border-purple-500/10"
                                }`}>
                                  {log.actionType.replace("Action", "")}
                                </span>
                                <span className="text-xs sm:text-sm text-[var(--text-main)] font-semibold truncate leading-tight">{log.actionDescription}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-secondary)] shrink-0 select-none">{new Date(log.createdAt).toLocaleTimeString("pt-BR")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-20 text-center text-[var(--text-secondary)] font-mono">
                  Selecione um projeto de foco estratégico para abrir o cérebro da Oi Beta corporativo.
                </div>
              )}

            </div>
  );
}
