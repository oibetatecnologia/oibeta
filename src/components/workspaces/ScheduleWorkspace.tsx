import { Clock, Plus, Trash2 } from 'lucide-react';
import useScheduleWorkspace from '../../hooks/useScheduleWorkspace';

export default function ScheduleWorkspace() {
  const {
    events,
    projects,
    newEventTitle,
    setNewEventTitle,
    newEventDate,
    setNewEventDate,
    newEventTime,
    setNewEventTime,
    newEventProj,
    setNewEventProj,
    handleCreateEvent,
    handleRemoveEvent,
  } = useScheduleWorkspace();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div>
          <h3 className="text-lg lg:text-xl font-bold text-[var(--text-main)] font-sans">
            📅 Agenda de Compromissos e Audiências
          </h3>
          <p className="text-xs lg:text-sm text-[var(--text-secondary)]">
            Monitore as audiências públicas, reuniões e lançamentos de editais.
          </p>
        </div>
        <span className="text-xs bg-[var(--blue-accent)]/10 text-[var(--blue-accent)] border border-[var(--blue-accent)]/20 font-bold px-2.5 py-1 rounded-lg">
          Calendário Hoje
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm hover:shadow-md transition flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[var(--blue-accent)]/15 text-[var(--blue-accent)] rounded-xl mt-0.5 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-[var(--text-main)] text-sm sm:text-base leading-snug">
                  {event.title}
                </h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                  <span className="bg-[var(--bg-sidebar)] text-[var(--text-main)] border border-[var(--border-color)] px-2 py-0.5 rounded text-[11px] font-bold">
                    {event.project}
                  </span>
                  <span>•</span>
                  <span>
                    {event.date} às {event.time}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRemoveEvent(event.id)}
              className="text-[var(--text-secondary)] hover:text-rose-500 p-1.5 rounded-lg hover:bg-[var(--bg-sidebar)] transition cursor-pointer"
              title="Deletar da Agenda"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreateEvent} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-color)] shadow-sm space-y-4">
        <span className="text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono">
          Agendar Novo Alinhamento de Metas
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
              Título do Compromisso *
            </label>
            <input
              type="text"
              value={newEventTitle}
              onChange={(event) => setNewEventTitle(event.target.value)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--text-main)]"
              placeholder="Ex: Audiência Pública de Demonstração Oi Beta Gov"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
              Data *
            </label>
            <input
              type="date"
              value={newEventDate}
              onChange={(event) => setNewEventDate(event.target.value)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--text-main)] cursor-pointer"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
              Horário (HH:MM)
            </label>
            <input
              type="time"
              value={newEventTime}
              onChange={(event) => setNewEventTime(event.target.value)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--text-main)] cursor-pointer"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">
              Iniciativa Relacionada
            </label>
            <select
              value={newEventProj}
              onChange={(event) => setNewEventProj(event.target.value)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--text-main)] cursor-pointer"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="bg-[var(--blue-accent)] hover:opacity-95 text-white font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 w-full border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Agendar Alinhamento
        </button>
      </form>
    </div>
  );
}
