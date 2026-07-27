import { CheckCircle2, Circle, PlayCircle, Plus, Trash2 } from 'lucide-react';
import useTasksWorkspace from '../../hooks/useTasksWorkspace';
import useTaskExecutionSummary from '../../hooks/useTaskExecutionSummary';
import TaskExecutionOverview from './TaskExecutionOverview';

export default function TasksWorkspace() {
  const {
    currentProject,
    filteredTasks,
    newTaskTitle,
    setNewTaskTitle,
    handleCreateTask,
    onToggleTaskStatus,
    onDeleteTask,
    objectives,
    newObjectiveTitle,
    setNewObjectiveTitle,
    handleCreateObjective,
    handleToggleObjectiveStatus,
    handleDeleteObjective,
  } = useTasksWorkspace();

  const executionSummary = useTaskExecutionSummary(filteredTasks);

  if (!currentProject) {
    return (
      <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
          <Plus className="w-5 h-5" />
        </div>
        <h3 className="text-base font-black text-slate-800">Nenhuma tarefa criada.</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          Comece criando sua primeira tarefa operacional da Oi Beta. Em seguida, ela poderá ser vinculada a um projeto, cliente, oportunidade ou implantação.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            📋 Tarefas de <span className="text-blue-600">{currentProject.name}</span>
          </h3>
          <p className="text-xs text-slate-400">
            Verifique e conclua as tarefas do respectivo plano de execução.
          </p>
        </div>
        <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-mono font-bold">
          {filteredTasks.length} Registradas
        </span>
      </div>

      <TaskExecutionOverview summary={executionSummary} />

      <form onSubmit={handleCreateTask} className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.target.value)}
          placeholder="Ex: Pesquisar editais PNCP para Portal da Transparência..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-400 shadow-inner"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl text-xs transition flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1" /> Adicionar Tarefa
        </button>
      </form>

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic bg-white rounded-2xl border border-dashed border-slate-200">
            Nenhuma tarefa criada para este projeto.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 bg-white hover:bg-slate-100/50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-700 shadow-sm"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleTaskStatus(task.id, task.status)}
                  className="text-slate-400 hover:text-blue-600 transition shrink-0 cursor-pointer"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />
                  ) : task.status === 'in_progress' ? (
                    <PlayCircle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <span
                  className={`font-semibold truncate flex-1 min-w-0 text-[13px] ${
                    task.status === 'completed'
                      ? 'line-through text-slate-400 font-normal'
                      : 'text-slate-800'
                  }`}
                >
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className={`text-[9px] font-mono shrink-0 ${task.status !== 'completed' && new Date(task.dueDate).getTime() < Date.now() ? 'text-rose-600 font-black' : 'text-slate-400'}`}>
                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-450 hover:text-rose-500 p-1.5 rounded hover:bg-slate-100 transition cursor-pointer"
                title="Deletar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="pt-6 border-t border-slate-200 mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            🎯 Objetivos Estratégicos Vinculados (Sprint 6)
          </h3>
          <p className="text-xs text-slate-400">
            Gerencie objetivos estruturais de alto nível vinculados a este plano de ação de forma persistente no conselho.
          </p>
        </div>

        <form onSubmit={handleCreateObjective} className="flex gap-2">
          <input
            type="text"
            value={newObjectiveTitle}
            onChange={(event) => setNewObjectiveTitle(event.target.value)}
            placeholder="Novo objetivo corporativo estratégico persistente..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-400 shadow-inner"
            required
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-xs transition flex items-center justify-center shrink-0 cursor-pointer animate-scale-in"
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar Objetivo
          </button>
        </form>

        <div className="grid grid-cols-1 gap-2">
          {objectives.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs italic bg-white rounded-xl border border-dashed border-slate-200">
              Nenhum objetivo estratégico cadastrado neste projeto. Cadastre acima seus alvos de governança de alta camada.
            </div>
          ) : (
            objectives.map((objective) => (
              <div
                key={objective.id}
                className="p-3.5 bg-white hover:bg-slate-100/50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-700 shadow-sm animate-fade-in"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleObjectiveStatus(objective.id, objective.status)}
                    className="text-slate-400 hover:text-emerald-600 transition shrink-0 cursor-pointer"
                  >
                    {objective.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <span
                    className={`font-semibold truncate flex-1 min-w-0 text-[13px] ${
                      objective.status === 'completed'
                        ? 'line-through text-slate-400 font-normal'
                        : 'text-slate-800'
                    }`}
                  >
                    {objective.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteObjective(objective.id)}
                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded hover:bg-slate-100 transition cursor-pointer"
                  title="Excluir Objetivo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
