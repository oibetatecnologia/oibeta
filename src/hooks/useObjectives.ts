import { useCallback, useEffect, useState } from 'react';

interface UseObjectivesParams {
  selectedProjectId: string;
  tenantOnlyHeaders: () => Record<string, string>;
  tenantJsonHeaders: () => Record<string, string>;
}

export function useObjectives({
  selectedProjectId,
  tenantOnlyHeaders,
  tenantJsonHeaders
}: UseObjectivesParams) {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [isLoadingObjectives, setIsLoadingObjectives] = useState(false);

  const fetchObjectives = useCallback(async () => {
    if (!selectedProjectId) {
      setObjectives([]);
      return;
    }

    setIsLoadingObjectives(true);

    try {
      const res = await fetch(`/api/objectives?projectId=${encodeURIComponent(selectedProjectId)}`, {
        headers: tenantOnlyHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setObjectives(Array.isArray(data) ? data : []);
      } else if (res.status !== 429) {
        console.warn('Não foi possível carregar objetivos:', res.status, res.statusText);
      }
    } catch (e) {
      console.error('Erro ao carregar objetivos:', e);
    } finally {
      setIsLoadingObjectives(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchObjectives();
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [fetchObjectives]);

  const handleCreateObjectiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newObjectiveTitle.trim() || !selectedProjectId) return;

    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: tenantJsonHeaders(),
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: newObjectiveTitle.trim()
        })
      });

      if (response.ok) {
        setNewObjectiveTitle('');
        await fetchObjectives();
      }
    } catch (err) {
      console.error('Erro ao criar objetivo:', err);
    }
  };

  const handleToggleObjectiveStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: tenantJsonHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchObjectives();
      }
    } catch (err) {
      console.error('Erro ao atualizar objetivo:', err);
    }
  };

  const handleDeleteObjective = async (id: string) => {
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'DELETE',
        headers: tenantOnlyHeaders()
      });

      if (response.ok) {
        await fetchObjectives();
      }
    } catch (err) {
      console.error('Erro ao excluir objetivo:', err);
    }
  };

  return {
    objectives,
    newObjectiveTitle,
    setNewObjectiveTitle,
    isLoadingObjectives,
    fetchObjectives,
    handleCreateObjectiveSubmit,
    handleToggleObjectiveStatus,
    handleDeleteObjective
  };
}

export default useObjectives;
