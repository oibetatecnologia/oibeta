import { useState } from 'react';
import { Project, ProjectState } from '../types';

interface UseProjectStateArgs {
  projects: Project[];
  projectStates: ProjectState[];
  selectedProjectId: string;
  user?: any;
  onCreateProject: (proj: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateProjectStopPoint: (id: string, stopPoint: string) => Promise<void>;
  onUpdateProjectState: (id: string, objective: string, stage: string) => Promise<void>;
  onRecalculateState: (id: string) => Promise<void>;
}

/**
 * useProjectState
 * Estado operacional do projeto ativo.
 *
 * Responsabilidade:
 * - resolver projeto atual;
 * - resolver estado cognitivo do projeto;
 * - controlar edição de estado e ponto de parada;
 * - criar projeto;
 * - recalcular contexto do projeto.
 */
export default function useProjectState({
  projects,
  projectStates,
  selectedProjectId,
  user,
  onCreateProject,
  onUpdateProjectStopPoint,
  onUpdateProjectState,
  onRecalculateState,
}: UseProjectStateArgs) {
  const currentProject = projects.find((project) => project.id === selectedProjectId) || null;
  const currentProjectState = (projectStates || []).find((state) => state.projectId === selectedProjectId) || null;

  const [isEditingStopPoint, setIsEditingStopPoint] = useState(false);
  const [tempStopPoint, setTempStopPoint] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectStop, setNewProjectStop] = useState('');

  const [isEditingState, setIsEditingState] = useState(false);
  const [editObjective, setEditObjective] = useState('');
  const [editStage, setEditStage] = useState('');

  const [isRecalculating, setIsRecalculating] = useState(false);

  const [editingStopPointId, setEditingStopPointId] = useState<string | null>(null);
  const [tempStopPointText, setTempStopPointText] = useState('');

  const handleRecalculateContext = async () => {
    if (!currentProject) return;

    setIsRecalculating(true);
    try {
      await onRecalculateState(currentProject.id);
    } catch (error) {
      console.error('Error calling onRecalculateState:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  const startEditingState = () => {
    setEditObjective(currentProjectState?.currentObjective || 'Definição do escopo e metas iniciais.');
    setEditStage(currentProjectState?.currentStage || 'Fase de Planejamento Estratégico');
    setIsEditingState(true);
  };

  const handleSaveState = async () => {
    if (selectedProjectId) {
      await onUpdateProjectState(selectedProjectId, editObjective, editStage);
      setIsEditingState(false);
    }
  };

  const handleSaveStopPoint = async (event: React.FormEvent) => {
    event.preventDefault();

    if (currentProject) {
      await onUpdateProjectStopPoint(currentProject.id, tempStopPoint);
      setIsEditingStopPoint(false);
    }
  };

  const handleCreateProjectSubmit = async (event?: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    if (!newProjectName.trim()) return;

    try {
      await onCreateProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        status: 'active',
        lastStopPoint: newProjectStop.trim() || 'Espaço de governança iniciado.',
        userId: user?.id || 'dev-user-douglas',
      });

      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectStop('');
    } catch (error) {
      console.error('Erro ao criar projeto pela interface:', error);
    }
  };

  const startEditingStopPoint = (project: Project) => {
    setEditingStopPointId(project.id);
    setTempStopPointText(project.lastStopPoint || '');
  };

  const saveStopPoint = async (projectId: string) => {
    await onUpdateProjectStopPoint(projectId, tempStopPointText);
    setEditingStopPointId(null);
  };

  return {
    currentProject,
    currentProjectState,
    isEditingStopPoint,
    setIsEditingStopPoint,
    tempStopPoint,
    setTempStopPoint,
    newProjectName,
    setNewProjectName,
    newProjectDesc,
    setNewProjectDesc,
    newProjectStop,
    setNewProjectStop,
    isEditingState,
    setIsEditingState,
    editObjective,
    setEditObjective,
    editStage,
    setEditStage,
    isRecalculating,
    editingStopPointId,
    setEditingStopPointId,
    tempStopPointText,
    setTempStopPointText,
    handleRecalculateContext,
    startEditingState,
    handleSaveState,
    handleSaveStopPoint,
    handleCreateProjectSubmit,
    startEditingStopPoint,
    saveStopPoint,
  };
}
