import React, { useMemo } from 'react';
import {
  BookOpen,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileText,
  Landmark,
  Layers3,
  Lightbulb,
  MemoryStick,
  Plus,
  Search,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/workspace/WorkspaceContext';
import type { Decision, Memory, Project, Task } from '../../types';

import BetaGovernancePanel from '../betaGovernance/BetaGovernancePanel';
const MEMORY_TYPE_LABELS: Record<NonNullable<Memory['type']>, string> = {
  decisão: 'Decisão',
  fato: 'Fato',
  objetivo: 'Objetivo',
  preferência: 'Preferência',
  risco: 'Risco',
  aprendizado: 'Aprendizado',
  fonte: 'Fonte',
  contexto: 'Contexto',
};

const IMPORTANCE_LABELS: Record<NonNullable<Memory['importance']>, string> = {
  baixa: 'Baixa',
  média: 'Média',
  alta: 'Alta',
  crítica: 'Crítica',
};

const IMPORTANCE_CLASSES: Record<NonNullable<Memory['importance']>, string> = {
  baixa: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  média: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  alta: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  crítica: 'bg-red-500/10 text-red-300 border-red-500/20',
};

const KNOWLEDGE_DOMAINS = [
  {
    id: 'memories',
    title: 'Memórias',
    description: 'Registros operacionais preservados para reutilização futura.',
    icon: MemoryStick,
  },
  {
    id: 'decisions',
    title: 'Decisões',
    description: 'Decisões formais e seus impactos na operação.',
    icon: ShieldCheck,
  },
  {
    id: 'documents',
    title: 'Documentos',
    description: 'Conteúdos e documentos gerados pela plataforma.',
    icon: FileText,
  },
  {
    id: 'learning',
    title: 'Aprendizados',
    description: 'Lições, padrões recorrentes e conhecimento institucional.',
    icon: Lightbulb,
  },
];

export default function EnterpriseKnowledgeWorkspace() {
  const workspace = useWorkspace();

  const {
    projects,
    currentProject,
  } = workspace.projects;

  const {
    tasks,
    pendingTasksCount,
  } = workspace.tasks;

  const {
    decisions,
    totalDecisions,
  } = workspace.decisions;

  const {
    memories,
    filteredMemories,
    totalMemories,
    newMemoryContent,
    setNewMemoryContent,
    handleCreateMemorySubmit,
  } = workspace.memories;

  const {
    generatedDoc,
  } = workspace.documents;

  const knowledgeMemories = filteredMemories.length > 0 ? filteredMemories : memories;

  const criticalMemories = knowledgeMemories.filter((memory) => memory.importance === 'crítica').length;
  const highMemories = knowledgeMemories.filter((memory) => memory.importance === 'alta').length;
  const learningMemories = knowledgeMemories.filter((memory) => memory.type === 'aprendizado').length;
  const sourceMemories = knowledgeMemories.filter((memory) => memory.type === 'fonte').length;

  const knowledgeTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const text = `${task.title} ${task.description || ''}`.toLowerCase();
        return text.includes('documento') || text.includes('conhecimento') || text.includes('memória') || text.includes('decisão') || text.includes('manual');
      }),
    [tasks]
  );

  const knowledgeCoverageScore = useMemo(() => {
    const memoryScore = Math.min(totalMemories * 4, 32);
    const decisionScore = Math.min(totalDecisions * 3, 24);
    const projectScore = Math.min(projects.length * 2, 14);
    const documentScore = generatedDoc ? 10 : 0;
    const learningScore = Math.min(learningMemories * 5, 15);
    const pendingPenalty = Math.min(pendingTasksCount * 1.5, 18);

    return Math.max(0, Math.min(100, Math.round(20 + memoryScore + decisionScore + projectScore + documentScore + learningScore - pendingPenalty)));
  }, [totalMemories, totalDecisions, projects.length, generatedDoc, learningMemories, pendingTasksCount]);

  const recentDecisions = useMemo(
    () =>
      [...decisions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [decisions]
  );


  const decisionsWithoutExplicitMemory = useMemo(
    () =>
      decisions
        .filter((decision) => {
          const decisionText = `${decision.title} ${decision.description || decision.content || ''}`.toLowerCase();
          return !memories.some((memory) => memory.content.toLowerCase().includes(decision.title.toLowerCase()) || decisionText.includes(memory.content.toLowerCase()));
        })
        .slice(0, 5),
    [decisions, memories]
  );

  const prepareDecisionMemory = (decision: Decision) => {
    const project = projects.find((item) => item.id === decision.projectId);
    const projectLabel = project ? ` no contexto ${project.name}` : '';
    const decisionContent = decision.description || decision.content || 'Decisão registrada sem descrição complementar.';

    setNewMemoryContent(
      `Decisão institucional${projectLabel}: ${decision.title}. Contexto: ${decisionContent}`
    );
  };

  const recentMemories = useMemo(
    () =>
      [...knowledgeMemories]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [knowledgeMemories]
  );

  const knowledgeRecommendations = useMemo(() => {
    const recommendations = [
      {
        title: 'Transformar decisões em memória',
        description: 'Toda decisão estratégica deve gerar uma memória reutilizável para a Beta consultar depois.',
        priority: 'alta',
      },
      {
        title: 'Organizar aprendizados por contexto',
        description: 'Aprendizados de implantação, suporte, comercial e desenvolvimento devem ficar ligados ao projeto ou cliente correto.',
        priority: 'média',
      },
      {
        title: 'Conectar documentos à operação',
        description: 'Documentos gerados precisam estar vinculados a decisões, clientes, propostas ou tarefas.',
        priority: 'média',
      },
    ];

    if (criticalMemories > 0) {
      recommendations.unshift({
        title: 'Revisar memórias críticas',
        description: 'Existem memórias críticas registradas. A Beta deve usá-las como referência prioritária nas próximas respostas.',
        priority: 'alta',
      });
    }

    return recommendations.slice(0, 4);
  }, [criticalMemories]);

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 lg:p-8 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.16),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-teal-300 font-black">
              Beta / Conhecimento Institucional
            </span>
            <h1 className="text-2xl lg:text-4xl font-black text-[var(--text-main)] mt-2 tracking-tight flex items-center gap-3">
              <Landmark className="w-7 h-7 text-teal-300" />
              Conhecimento
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
              Área para organizar memórias, decisões, documentos, aprendizados e referências que formam o patrimônio intelectual da Oi Beta.
            </p>
          </div>

          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 max-w-md">
            <h2 className="text-sm font-black text-teal-200 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Beta no conhecimento
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Eu uso esta base para responder com contexto, recuperar decisões, preservar aprendizados e evitar que a empresa repita erros.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
        <KnowledgeMetricCard icon={<MemoryStick className="w-4 h-4" />} label="Memórias" value={totalMemories} helper={`${criticalMemories} críticas`} />
        <KnowledgeMetricCard icon={<ShieldCheck className="w-4 h-4" />} label="Decisões" value={totalDecisions} helper="Base decisória" />
        <KnowledgeMetricCard icon={<Lightbulb className="w-4 h-4" />} label="Aprendizados" value={learningMemories} helper="Reutilizáveis" />
        <KnowledgeMetricCard icon={<Database className="w-4 h-4" />} label="Fontes" value={sourceMemories} helper="Referências" />
        <KnowledgeMetricCard icon={<Layers3 className="w-4 h-4" />} label="Projetos" value={projects.length} helper="Com contexto" />
        <KnowledgeMetricCard icon={<Tags className="w-4 h-4" />} label="Alta relevância" value={highMemories} helper="Memórias altas" />
        <KnowledgeMetricCard icon={<FileText className="w-4 h-4" />} label="Documento" value={generatedDoc ? 'OK' : '—'} helper="Geração atual" />
        <KnowledgeMetricCard icon={<BrainCircuit className="w-4 h-4" />} label="Cobertura" value={`${knowledgeCoverageScore}%`} helper="Conhecimento útil" />
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
        <div className="2xl:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                  Mapa de conhecimento
                </span>
                <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Domínios da base institucional</h2>
              </div>

              <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                Memory OS inicial
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {KNOWLEDGE_DOMAINS.map((domain) => {
                const Icon = domain.icon;

                return (
                  <article key={domain.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[var(--text-main)]">{domain.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{domain.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                  Memórias recentes
                </span>
                <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Conhecimento registrado</h2>
              </div>

              <span className="text-[10px] uppercase font-mono font-black px-3 py-1.5 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                {currentProject?.name || 'Contexto geral'}
              </span>
            </div>

            {recentMemories.length === 0 ? (
              <EmptyKnowledgeState />
            ) : (
              <div className="space-y-3">
                {recentMemories.map((memory) => (
                  <MemoryKnowledgeCard
                    key={memory.id}
                    memory={memory}
                    project={projects.find((project) => project.id === memory.projectId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleCreateMemorySubmit} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Novo conhecimento
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Registrar memória</h2>
            </div>

            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">Conteúdo</span>
              <textarea
                value={newMemoryContent}
                onChange={(event) => setNewMemoryContent(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none focus:border-teal-500 resize-none"
                placeholder="Registre um aprendizado, decisão, fonte, risco ou contexto importante para a Beta reutilizar depois."
              />
            </label>

            <button
              type="submit"
              disabled={!newMemoryContent.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar conhecimento
            </button>
          </form>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Decisões recentes
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Base decisória</h2>
            </div>

            {recentDecisions.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Nenhuma decisão registrada ainda. Quando decisões forem cadastradas, elas aparecerão aqui como parte do conhecimento institucional.
              </p>
            ) : (
              <div className="space-y-3">
                {recentDecisions.map((decision) => (
                  <DecisionKnowledgeCard
                    key={decision.id}
                    decision={decision}
                    project={projects.find((project) => project.id === decision.projectId)}
                    onPrepareMemory={() => prepareDecisionMemory(decision)}
                  />
                ))}
              </div>
            )}
          </div>

          {decisionsWithoutExplicitMemory.length > 0 && (
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5 space-y-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-teal-300 font-black">
                  Sincronização
                </span>
                <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Decisões sem memória explícita</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  A Beta identificou decisões que ainda podem virar memória operacional reutilizável.
                </p>
              </div>

              <div className="space-y-2">
                {decisionsWithoutExplicitMemory.map((decision) => (
                  <button
                    key={decision.id}
                    type="button"
                    onClick={() => prepareDecisionMemory(decision)}
                    className="w-full text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/65 p-3 hover:border-teal-500/50 transition cursor-pointer"
                  >
                    <span className="text-xs font-black text-[var(--text-main)] block">{decision.title}</span>
                    <span className="text-[10px] uppercase font-mono font-black text-teal-300 mt-2 block">
                      Preparar memória
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
                Fila da Beta
              </span>
              <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Próximas ações</h2>
            </div>

            <div className="space-y-3">
              {knowledgeRecommendations.map((recommendation) => (
                <div key={recommendation.title} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-[var(--text-main)]">{recommendation.title}</h3>
                    <span className={`text-[10px] uppercase font-mono font-black ${recommendation.priority === 'alta' ? 'text-red-300' : 'text-amber-300'}`}>
                      {recommendation.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {recommendation.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {knowledgeTasks.length > 0 && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[var(--text-secondary)] font-black">
              Tarefas relacionadas
            </span>
            <h2 className="text-lg font-black text-[var(--text-main)] mt-1">Pendências de conhecimento</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {knowledgeTasks.slice(0, 6).map((task) => (
              <KnowledgeTaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KnowledgeMetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 min-h-[120px]">
      <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--text-secondary)] font-black block mt-4">
        {label}
      </span>
      <strong className="text-2xl font-black text-[var(--text-main)] block mt-1">{value}</strong>
      <span className="text-xs text-[var(--text-secondary)]">{helper}</span>
    </div>
  );
}

function MemoryKnowledgeCard({ memory, project }: { memory: Memory; project?: Project }) {
  const importance = memory.importance || 'média';
  const type = memory.type || 'contexto';

  return (
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border bg-teal-500/10 text-teal-300 border-teal-500/20">
              {MEMORY_TYPE_LABELS[type]}
            </span>
            <span className={`text-[10px] uppercase font-mono font-black px-2.5 py-1 rounded-full border ${IMPORTANCE_CLASSES[importance]}`}>
              {IMPORTANCE_LABELS[importance]}
            </span>
          </div>

          <p className="text-sm text-[var(--text-main)] font-bold mt-3 leading-relaxed">
            {memory.content}
          </p>

          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {project?.name || 'Conhecimento geral'} • {formatDate(memory.createdAt)}
          </p>
        </div>

        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            {memory.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] font-mono text-[var(--text-secondary)] border border-[var(--border-color)] rounded-full px-2 py-1">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function DecisionKnowledgeCard({ decision, project, onPrepareMemory }: { decision: Decision; project?: Project; onPrepareMemory?: () => void }) {
  return (
    <article className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <h3 className="text-sm font-black text-[var(--text-main)]">{decision.title}</h3>
      <p className="text-xs text-[var(--text-secondary)] mt-1">
        {project?.name || 'Sem projeto'} • {formatDate(decision.createdAt)}
      </p>
      {(decision.description || decision.content) && (
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
          {decision.description || decision.content}
        </p>
      )}
      {onPrepareMemory && (
        <button
          type="button"
          onClick={onPrepareMemory}
          className="mt-3 text-[10px] uppercase font-mono font-black text-teal-300 hover:text-teal-200 transition cursor-pointer bg-transparent border-0 p-0"
        >
          Transformar em memória
        </button>
      )}
    </article>
  );
}

function KnowledgeTaskCard({ task }: { task: Task }) {
  return (
    <article className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)]/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-black text-[var(--text-main)]">{task.title}</h3>
        <span className="text-[10px] uppercase font-mono font-black text-[var(--text-secondary)]">
          {task.status}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{task.description}</p>
      )}
    </article>
  );
}

function EmptyKnowledgeState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-main)]/25 p-8 text-center">
      <BookOpen className="w-10 h-10 mx-auto text-teal-300" />
      <h3 className="text-lg font-black text-[var(--text-main)] mt-4">Nenhum conhecimento registrado</h3>
      <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl mx-auto leading-relaxed">
        Registre memórias, decisões, aprendizados e fontes para transformar a operação da Oi Beta em conhecimento reutilizável.
      </p>
    
      <BetaGovernancePanel />
</div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'sem data';

  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  } catch {
    return value;
  }
}