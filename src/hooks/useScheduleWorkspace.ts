import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

export interface ScheduleWorkspaceEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  project: string;
}

/**
 * useScheduleWorkspace
 *
 * Hook especializado da tela de Agenda.
 *
 * Responsabilidade:
 * - consumir o WorkspaceContext;
 * - expor apenas o domínio necessário para ScheduleWorkspace;
 * - normalizar eventos para garantir contrato estável na interface;
 * - remover o repasse manual de props pelo WorkspaceTabsRouter.
 */
export default function useScheduleWorkspace() {
  const workspace = useWorkspace();

  const { projects } = workspace.projects;

  const {
    events,
    setEvents,
    newEventTitle,
    setNewEventTitle,
    newEventDate,
    setNewEventDate,
    newEventTime,
    setNewEventTime,
    newEventProj,
    setNewEventProj,
    handleAddEvent,
  } = workspace.schedule;

  const normalizedEvents = useMemo<ScheduleWorkspaceEvent[]>(
    () =>
      events.map((event, index) => {
        const safeEvent = event as Partial<ScheduleWorkspaceEvent>;

        return {
          id: safeEvent.id ?? `event-${index}`,
          title: safeEvent.title ?? '',
          date: safeEvent.date ?? '',
          time: safeEvent.time ?? '',
          project: safeEvent.project ?? '',
        };
      }),
    [events]
  );

  const handleRemoveEvent = useCallback(
    (eventId: string) => {
      setEvents(events.filter((item) => item.id !== eventId));
    },
    [events, setEvents]
  );

  const handleCreateEvent = useCallback(
    (event: React.FormEvent) => {
      return handleAddEvent(event);
    },
    [handleAddEvent]
  );

  return useMemo(
    () => ({
      events: normalizedEvents,
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
    }),
    [
      normalizedEvents,
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
    ]
  );
}
