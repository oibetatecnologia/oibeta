import { Project, Decision, Task, Memory, ChatMessage, ProjectState } from '../types';

/**
 * BetaContextEngine
 * High-fidelity contextual engine that evaluates real project data 
 * to determine the actual strategic state of the initiative.
 */

export interface ContextEngineResult {
  projectId: string;
  projectName: string;
  currentObjective: string;
  currentStage: string;
  lastStopPoint: string;
  executiveSummary: string;
  nextRecommendedAction: string;
  pendingTasks: string[];
  recentDecisions: string[];
  importantMemories: string[];
  risks: string[];
  confidenceScore: number;
  updatedAt: string;
}

// Possible Stages
export type ProjectStage =
  | 'Ideação'
  | 'Planejamento'
  | 'Arquitetura'
  | 'Desenvolvimento'
  | 'Validação'
  | 'Implantação'
  | 'Comercialização'
  | 'Pausado'
  | 'Concluído';

/**
 * Structured Heuristics Engine
 */
export function calculateHeuristics(
  project: Project,
  decisions: Decision[],
  tasks: Task[],
  memories: Memory[],
  messages: ChatMessage[]
): Omit<ContextEngineResult, 'executiveSummary' | 'nextRecommendedAction' | 'risks'> & {
  suggestedObjective: string;
  suggestedStage: ProjectStage;
  heuristicsRisks: string[];
  heuristicsNextAction: string;
} {
  const pId = project.id;

  // 1. Filter project specific elements
  const projDecisions = decisions.filter(d => d.projectId === pId);
  const projTasks = tasks.filter(t => t.projectId === pId);
  const projMemories = memories.filter(m => m.projectId === pId);

  // 2. Determine Objective
  // Check memory of type 'objetivo'
  const objectiveMemory = projMemories.find(m => m.type === 'objetivo' || m.content.toLowerCase().includes('objetivo'));
  const currentObjective = objectiveMemory?.content || project.description || 'Definição do escopo e metas iniciais.';

  // 3. Determine Stage
  let stage: ProjectStage = 'Planejamento';
  if (project.status === 'completed') {
    stage = 'Concluído';
  } else if (project.status === 'paused') {
    stage = 'Pausado';
  } else if (projTasks.length === 0) {
    const hasConceptMemories = projMemories.some(m => m.type === 'contexto' || m.content.toLowerCase().includes('ideia') || m.content.toLowerCase().includes('draft'));
    stage = hasConceptMemories ? 'Ideação' : 'Planejamento';
  } else {
    // We have tasks. Check their statuses and keywords
    const completedTasks = projTasks.filter(t => t.status === 'completed');
    const architectureKeywords = ['db', 'banco', 'modelagem', 'arquitetura', 'api', 'backend', 'schema', 'setup', 'esquiço', 'wireframe'];
    const developmentKeywords = ['implementar', 'criar', 'desenvolver', 'construir', 'programar', 'escrever', 'código', 'frontend', 'tela', 'painel', 'componente'];
    const validationKeywords = ['testar', 'teste', 'validação', 'homologar', 'revisar', 'auditar', 'qa', 'debugging', 'ajustar'];
    const deploymentKeywords = ['deploy', 'implantação', 'produção', 'release', 'subir', 'hospedar', 'aws', 'cloud', 'docker'];
    const commercialKeywords = ['comercial', 'vendas', 'marketing', 'lançar', 'divulgar', 'comercialização', 'anúncio', 'monetizar'];

    const hasPendingMatch = (keywords: string[]) => 
      projTasks.some(t => t.status !== 'completed' && keywords.some(k => t.title.toLowerCase().includes(k) || (t.description || '').toLowerCase().includes(k)));

    if (completedTasks.length === projTasks.length) {
      stage = 'Validação'; // Everything done leads to validation or launch
    } else if (hasPendingMatch(commercialKeywords)) {
      stage = 'Comercialização';
    } else if (hasPendingMatch(deploymentKeywords)) {
      stage = 'Implantação';
    } else if (hasPendingMatch(validationKeywords)) {
      stage = 'Validação';
    } else if (hasPendingMatch(developmentKeywords)) {
      stage = 'Desenvolvimento';
    } else if (hasPendingMatch(architectureKeywords)) {
      stage = 'Arquitetura';
    } else {
      stage = 'Desenvolvimento'; // Default active stage
    }
  }

  // 4. Calculate Confidence Score (0 - 100)
  let confidenceScore = 20; // baseline
  if (project.name && project.description) confidenceScore += 15;
  if (projDecisions.length > 0) confidenceScore += 15;
  if (projTasks.length > 0) confidenceScore += 15;
  if (projMemories.length > 0) confidenceScore += 15;
  if (project.lastStopPoint && project.lastStopPoint.trim().length > 0) confidenceScore += 10;
  if (messages.filter(m => m.projectId === pId).length > 5) confidenceScore += 10;
  confidenceScore = Math.min(confidenceScore, 100);

  // 5. Derive Heuristic Risks
  const heuristicsRisks: string[] = [];
  // Overdue tasks or high priority unattended tasks
  const criticalTasks = projTasks.filter(t => t.status !== 'completed' && (t.priority === 'crítica' || t.priority === 'alta'));
  if (criticalTasks.length > 1) {
    heuristicsRisks.push(`Há ${criticalTasks.length} frentes de trabalho de prioridade crítica/alta ativas sem conclusão.`);
  }
  const riskMemories = projMemories.filter(m => m.type === 'risco' || m.importance === 'alta' || m.importance === 'crítica');
  riskMemories.forEach(m => heuristicsRisks.push(m.content));

  if (heuristicsRisks.length === 0) {
    heuristicsRisks.push('Nenhum risco operacional de alto impacto detectado atualmente.');
  }

  // 6. Derive Heuristic Next Action
  let heuristicsNextAction = '';
  const prioritizedTasks = [...projTasks]
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      const priorityWeight = { crítica: 4, alta: 3, média: 2, baixa: 1 };
      const wA = priorityWeight[a.priority || 'média'] || 2;
      const wB = priorityWeight[b.priority || 'média'] || 2;
      return wB - wA;
    });

  if (prioritizedTasks.length > 0) {
    heuristicsNextAction = `Executar e concluir a meta prioritária: "${prioritizedTasks[0].title}".`;
  } else {
    heuristicsNextAction = `Mapear novas metas e tarefas prioritárias para a etapa de "${stage}".`;
  }

  // Slice lists
  const pendingTasks = projTasks.filter(t => t.status !== 'completed').map(t => t.title);
  const recentDecisions = [...projDecisions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(d => d.title);
  
  const importantMemories = projMemories
    .filter(m => m.importance === 'alta' || m.importance === 'crítica' || m.type === 'fato')
    .slice(0, 5)
    .map(m => m.content);

  return {
    projectId: pId,
    projectName: project.name,
    currentObjective,
    suggestedObjective: currentObjective,
    currentStage: stage,
    suggestedStage: stage,
    lastStopPoint: project.lastStopPoint || 'Não registrado formalmente ainda.',
    pendingTasks,
    recentDecisions,
    importantMemories: importantMemories.length > 0 ? importantMemories : projMemories.slice(0, 3).map(m => m.content),
    heuristicsRisks,
    heuristicsNextAction,
    confidenceScore,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Main Dynamic Generator combining code heuristics & LLM contextualization
 */
export async function generateProjectContext(
  project: Project,
  decisions: Decision[],
  tasks: Task[],
  memories: Memory[],
  messages: ChatMessage[],
  aiRouter?: any, // passed down from server
  userId?: string,
  organizationId?: string,
  currentProjectId?: string | null
): Promise<ContextEngineResult> {
  // Always calculate structural heuristics first for absolute data-fidelity and fallback
  const h = calculateHeuristics(project, decisions, tasks, memories, messages);

  let executiveSummary = '';
  let nextRecommendedAction = h.heuristicsNextAction;
  let risks = h.heuristicsRisks;

  if (aiRouter) {
    try {
      const activeTasksText = tasks.filter(t => t.status !== 'completed' && t.projectId === project.id)
        .map(t => `- [Prioridade: ${t.priority || 'média'}] ${t.title}`)
        .join('\n');
      const recentDecText = decisions.filter(d => d.projectId === project.id)
        .map(d => `- [Impacto: ${d.impact || 'médio'}] ${d.title}: ${d.description || ""}`)
        .join('\n');
      const memoriesText = memories.filter(m => m.projectId === project.id)
        .map(m => `- [Tipo: ${m.type || 'contexto'}] ${m.content}`)
        .join('\n');

      const prompt = `Você é o kernel "BetaContextEngine" do ecossistema BETA CORE.
Sua tarefa é analisar os dados REAIS fornecidos e produzir o Sumário Executivo, a Próxima Ação recomendada e os principais riscos da iniciativa.

NOME DO PROJETO: "${project.name}"
DESCRIÇÃO: "${project.description || "Não especificada."}"
ESTÁGIO ATUAL CALCULADO: "${h.currentStage}"
ÚLTIMO PONTO DE PARADA REGISTRADO: "${h.lastStopPoint}"
OBJETIVO CALCULADO: "${h.currentObjective}"

DADOS EXTRAÍDOS DO SISTEMA:
- METAS E TAREFAS ATIVAS NO PIPELINE:
${activeTasksText || "Nenhuma registrada."}

- DECISÕES COMERCIAIS E TÉCNICAS:
${recentDecText || "Nenhuma registrada."}

- MEMÓRIAS E CONHECIMENTO CRÍTICO:
${memoriesText || "Nenhuma registrada."}

INSTRUÇÕES DE ESCRITA:
1. Resuma a situação real em um RESUMO EXECUTIVO de exatamente 2 parágrafos curtos, objetivos, sênior e altamente centrados em negócios. Não invente conquistas que não estão listadas.
2. Identifique os reais RISCOS prioritários (reais pendências de alta prioridade sem preenchimento, falta de dados ou gargalos descritos). Retorne no máximo 2 riscos bem explicados de forma sucinta.
3. Defina a PRÓXIMA AÇÃO recomendada com base na governança estratégica do estágio "${h.currentStage}".

Escreva em Português do Brasil com excelente redação executiva. Retorne no formato de um JSON estruturado seguindo EXATAMENTE este formato (não inclua trechos em Markdown, apenas o bloco JSON limpo):
{
  "executiveSummary": "texto do resumo...",
  "nextRecommendedAction": "ação recomendada...",
  "risks": ["risco 1", "risco 2"]
}`;

      const response = await aiRouter.generate(
        organizationId || "org-oi-beta",
        prompt,
        "Você é o kernel BetaContextEngine."
      );

      const textResponse = response?.response;

      if (textResponse) {
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0].trim());
          if (parsed.executiveSummary) executiveSummary = parsed.executiveSummary;
          if (parsed.nextRecommendedAction) nextRecommendedAction = parsed.nextRecommendedAction;
          if (parsed.risks && Array.isArray(parsed.risks)) risks = parsed.risks;
        }
      }
    } catch (e) {
      console.error("Error in BetaContextEngine router calculation, utilizing heuristics fallback:", e);
    }
  }

  // Fallback for executive summary if LLM was unavailable/failed
  if (!executiveSummary) {
    const decStats = h.recentDecisions.length > 0 
      ? `As frentes estratégicas consolidaram diretrizes fundamentais recentemente: ${h.recentDecisions.slice(0, 2).join(', ')}.` 
      : 'Novas decisões operacionais estão em processo de formalização.';
    const taskStats = h.pendingTasks.length > 0 
      ? `Identificamos ${h.pendingTasks.length} metas de trabalho ativas no pipeline no momento.` 
      : 'As metas do pipeline para esta fase foram plenamente atendidas.';
    
    executiveSummary = `A iniciativa "${project.name}" encontra-se atualmente mapeada sob o estágio de "${h.currentStage}". O objetivo prioritário direcionador estabelecido é "${h.currentObjective}". Com o último ponto de parada registrado em "${h.lastStopPoint}", o foco operacional mantém alinhamento regular.\n\n${decStats} ${taskStats} O acompanhamento é monitorado continuamente através do motor contextual inteligente Oi Beta.`;
  }

  return {
    projectId: h.projectId,
    projectName: h.projectName,
    currentObjective: h.currentObjective,
    currentStage: h.currentStage,
    lastStopPoint: h.lastStopPoint,
    executiveSummary,
    nextRecommendedAction,
    pendingTasks: h.pendingTasks,
    recentDecisions: h.recentDecisions,
    importantMemories: h.importantMemories,
    risks,
    confidenceScore: h.confidenceScore,
    updatedAt: h.updatedAt
  };
}
