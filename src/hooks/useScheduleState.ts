import { useState } from 'react';

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  project: string;
}

/**
 * useScheduleState
 * Estado local da agenda operacional.
 *
 * Responsabilidade:
 * - manter eventos locais;
 * - manter formulário de novo evento;
 * - adicionar evento localmente;
 * - não buscar dados.
 */
export default function useScheduleState() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventProj, setNewEventProj] = useState('');

  const handleAddEvent = (event: React.FormEvent) => {
    event.preventDefault();

    if (!newEventTitle || !newEventDate) return;

    const newEvent: ScheduleEvent = {
      id: Math.random().toString(),
      title: newEventTitle,
      date: newEventDate,
      time: newEventTime || '09:00',
      project: newEventProj,
    };

    setEvents([newEvent, ...events]);
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventTime('');
  };

  return {
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
  };
}
