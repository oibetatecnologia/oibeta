import { DatabaseAdapter } from "../database/DatabaseAdapter";
import { ParsedIntent, ExtractedEntities } from "./BetaIntentParser";

export interface ActionResponse {
  success: boolean;
  message: string;
  actionExecuted?: string;
  requiresConfirmation?: boolean;
  confirmationDetails?: {
    type: string;
    description: string;
    payload: any;
  };
  suggestions?: any;
}

export class BetaActionEngine {
  constructor(
    private dbAdapter: DatabaseAdapter,
    private aiRouter: any = null
  ) {}

  /**
   * Evaluates if a chat history contains a pending confirmation and processes it.
   */
  async processPendingConfirmation(
    userMessage: string,
    lastBetaMessage: any,
    userId: string,
    organizationId: string,
    updateStateCallback: (projectId: string) => Promise<any>,
    workspaceId: string = "workspace-oi-beta"
  ): Promise<ActionResponse | null> {
    if (!lastBetaMessage || !lastBetaMessage.suggestions || !lastBetaMessage.suggestions.pendingAction) {
      return null;
    }

    const pending = lastBetaMessage.suggestions.pendingAction;
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Check for affirmative confirmation
    const isAffirmative = [
      "sim", "yes", "confirmar", "confirmo", "prosseguir", "concordo", 
      "claro", "ok", "pode", "pode ser", "deleta", "exclui", "deletar", "apagar", "remover"
    ].some(word => lowerMessage.includes(word));

    const isNegative = [
      "não", "no", "cancelar", "cancela", "parar", "abortar"
    ].some(word => lowerMessage === word || lowerMessage.includes(word));

    if (isAffirmative) {
      if (pending.type === "DELETE_PROJECT") {
        const projectId = pending.projectId;
        const project = await this.dbAdapter.getProjectById(projectId, userId, organizationId);
        const pName = project?.name || "Projeto";

        // Execute destructive action
        await this.dbAdapter.deleteProject(projectId);

        // Record Action History
        await this.dbAdapter.createActionLog({
          projectId: null,
          userId,
          actionType: "DeleteProjectAction",
          actionDescription: `Removido permanentemente o projeto ${pName} (ID: ${projectId}) e todos os seus vínculos.`
        });

        return {
          success: true,
          message: `✨ **Douglas! Ação executada com sucesso pela Beta.**\n\nO projeto **${pName}** (ID: ${projectId}) foi removido permanentemente de nosso espaço de trabalho, limpando com segurança todas as metas, decisões e memórias sintonizadas.`,
          actionExecuted: "DeleteProjectAction"
        };
      }

      if (pending.type === "DELETE_TASK") {
        const { taskId, taskTitle, projectId } = pending;
        await this.dbAdapter.deleteTask(taskId);

        await this.dbAdapter.createActionLog({
          projectId: projectId || null,
          userId,
          actionType: "DeleteTaskAction",
          actionDescription: `Removida a tarefa/meta de trabalho: "${taskTitle}"`
        });

        if (projectId) {
          await updateStateCallback(projectId);
        }

        return {
          success: true,
          message: `✨ **Ação executada pela Beta.**\n\nA tarefa de trabalho **"${taskTitle}"** foi excluída permanentemente de nossa governança. Os índices e os estados estratégicos correspondentes foram atualizados.`,
          actionExecuted: "DeleteTaskAction"
        };
      }

      if (pending.type === "DELETE_DECISION") {
        const { decisionId, decisionTitle, projectId } = pending;
        await this.dbAdapter.deleteDecision(decisionId);

        await this.dbAdapter.createActionLog({
          projectId: projectId || null,
          userId,
          actionType: "DeleteDecisionAction",
          actionDescription: `Removida a decisão estratégica memorizada: "${decisionTitle}"`
        });

        if (projectId) {
          await updateStateCallback(projectId);
        }

        return {
          success: true,
          message: `✨ **Ação executada pela Beta.**\n\nA decisão estratégica **"${decisionTitle}"** foi removida de nosso banco corporativo. Sincronizei os relatórios de status correspondentes.`,
          actionExecuted: "DeleteDecisionAction"
        };
      }

      if (pending.type === "DELETE_MEMORY") {
        const { memoryId, memoryContent, projectId } = pending;
        await this.dbAdapter.deleteMemory(memoryId);

        const summaryText = memoryContent.length > 50 ? memoryContent.substring(0, 50) + "..." : memoryContent;
        await this.dbAdapter.createActionLog({
          projectId: projectId || null,
          userId,
          actionType: "DeleteMemoryAction",
          actionDescription: `Removido fato ou conhecimento do cérebro corporativo: "${summaryText}"`
        });

        if (projectId) {
          await updateStateCallback(projectId);
        }

        return {
          success: true,
          message: `✨ **Ação executada pela Beta.**\n\nA memória registrada **"${summaryText}"** foi excluída permanentemente de nosso cérebro corporativo com segurança.`,
          actionExecuted: "DeleteMemoryAction"
        };
      }
    } else if (isNegative) {
      return {
        success: true,
        message: "✔ **Entendido! Ação cancelada pela Beta.**\n\nTodos os seus dados corporativos e diretrizes do projeto permanecem intactos com absoluta segurança."
      };
    }

    return null;
  }

  /**
   * Main executor that turns an intent on the database and returns the result.
   */
  async executeIntent(
    parsed: ParsedIntent,
    userId: string,
    organizationId: string,
    currentProjectId: string | null,
    updateStateCallback: (projectId: string) => Promise<any>,
    workspaceId: string = "workspace-oi-beta"
  ): Promise<ActionResponse> {
    const { intent, entities } = parsed;
    let activeProjId = entities.projectId;
    if (!activeProjId) {
      try {
        const wsState = await this.dbAdapter.getWorkspaceState(userId, organizationId, workspaceId);
        if (wsState && wsState.activeProjectId) {
          activeProjId = wsState.activeProjectId;
        }
      } catch (e) {
        console.warn("Could not retrieve persistent active project ID in BetaActionEngine:", e);
      }
    }
    if (!activeProjId) {
      activeProjId = currentProjectId;
    }

    switch (intent) {
      case "CREATE_PROJECT": {
        if (!entities.projectName) {
          return {
            success: false,
            message: "Minhas redes estratégicas interpretaram a intenção de criar um projeto, mas não consegui identificar um nome claro. Poderia especificar o nome desejado?"
          };
        }

        const newProject = await this.dbAdapter.createProject({
          name: entities.projectName,
          description: entities.projectDescription || "Projeto iniciado via comando cognitivo da Beta.",
          status: "active",
          lastStopPoint: entities.lastStopPoint || "Projeto inicializado e mapeado no sistema.",
          userId,
          organizationId,
          workspaceId
        });

        // Record event
        await this.dbAdapter.createActionLog({
          projectId: newProject.id,
          userId,
          actionType: "CreateProjectAction",
          actionDescription: `Criado o projeto "${newProject.name}" no workspace corporativo.`
        });

        // Trigger automatic state recalculation
        await updateStateCallback(newProject.id);

        return {
          success: true,
          message: `🚀 **Iniciativa mapeada e integrada por mim com sucesso!**\n\nCriei o projeto **${newProject.name}** no sistema corporativo.\n\n` +
            `* **Descrição:** ${newProject.description}\n` +
            `* **Ponto de Parada Inicial:** "${newProject.lastStopPoint}"\n\n` +
            `O estado conceitual estratégico da governança (ProjectState) já foi provisionado para análise instantânea.`,
          actionExecuted: "CreateProjectAction",
          suggestions: {
            activeProjectId: newProject.id
          }
        };
      }

      case "UPDATE_PROJECT": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não consegui determinar em qual projeto realizar as atualizações necessárias. Certifique-se de ter um projeto selecionado ou informe o nome."
          };
        }

        const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
        if (!project) {
          return {
            success: false,
            message: "O projeto especificado para atualização não foi localizado em nossa base organizacional do Oi Beta."
          };
        }

        const updateData: any = {};
        if (entities.projectDescription) updateData.description = entities.projectDescription;
        if (entities.projectStatus) updateData.status = entities.projectStatus;
        if (entities.lastStopPoint) updateData.lastStopPoint = entities.lastStopPoint;

        if (Object.keys(updateData).length === 0) {
          return {
            success: false,
            message: "Identifiquei a intenção de ajustar as diretrizes do projeto, mas nenhum novo parâmetro foi detectado na sua instrução recente."
          };
        }

        await this.dbAdapter.updateProject(activeProjId, updateData);

        // Record event
        await this.dbAdapter.createActionLog({
          projectId: activeProjId,
          userId,
          actionType: "UpdateProjectAction",
          actionDescription: `Atualizados parâmetros do projeto "${project.name}": ${Object.keys(updateData).join(", ")}.`
        });

        // Trigger automatic recalculation
        await updateStateCallback(activeProjId);

        return {
          success: true,
          message: `⚙ **Diretrizes e sincronizações operacionais atualizadas para o projeto ${project.name}!**\n\nParâmetros reconfigurados com absoluto sucesso:\n` +
            Object.entries(updateData).map(([key, val]) => `* **${key}:** ${val}`).join("\n") + 
            `\n\nNossos algoritmos do BetaContextEngine já recalcularam e alinharam o resumo estratégico correspondente.`,
          actionExecuted: "UpdateProjectAction"
        };
      }

      case "DELETE_PROJECT": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Para remover um projeto, primeiro selecione-o no painel ou descreva seu nome explicitamente."
          };
        }

        const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
        if (!project) {
          return {
            success: false,
            message: "Não encontrei o projeto solicitado para exclusão em nossa base autorizada."
          };
        }

        // Action is destructive -> Require Confirmation Flow
        return {
          success: true,
          message: `Tem certeza?`,
          requiresConfirmation: true,
          suggestions: {
            pendingAction: {
              type: "DELETE_PROJECT",
              projectId: activeProjId
            }
          }
        };
      }

      case "DELETE_TASK": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Por favor, selecione um projeto para remover uma tarefa."
          };
        }
        if (!entities.taskTitle) {
          return {
            success: false,
            message: "Indique o título ou termo identificador da tarefa que deseja remover."
          };
        }
        const tasks = await this.dbAdapter.getTasks(activeProjId);
        const match = tasks.find(t => t.title.toLowerCase().includes(entities.taskTitle!.toLowerCase()));
        if (!match) {
          return {
            success: false,
            message: `Não encontrei nenhuma tarefa contendo "${entities.taskTitle}" para ser excluída.`
          };
        }
        return {
          success: true,
          message: `Tem certeza?`,
          requiresConfirmation: true,
          suggestions: {
            pendingAction: {
              type: "DELETE_TASK",
              taskId: match.id,
              taskTitle: match.title,
              projectId: activeProjId
            }
          }
        };
      }

      case "DELETE_DECISION": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Por favor, selecione um projeto para remover uma decisão."
          };
        }
        if (!entities.decisionTitle) {
          return {
            success: false,
            message: "Indique o título ou termo da decisão que deseja remover."
          };
        }
        const decisions = await this.dbAdapter.getDecisions(activeProjId);
        const match = decisions.find(d => d.title.toLowerCase().includes(entities.decisionTitle!.toLowerCase()));
        if (!match) {
          return {
            success: false,
            message: `Não encontrei nenhuma decisão contendo "${entities.decisionTitle}" para ser excluída.`
          };
        }
        return {
          success: true,
          message: `Tem certeza?`,
          requiresConfirmation: true,
          suggestions: {
            pendingAction: {
              type: "DELETE_DECISION",
              decisionId: match.id,
              decisionTitle: match.title,
              projectId: activeProjId
            }
          }
        };
      }

      case "DELETE_MEMORY": {
        const memories = await this.dbAdapter.getMemories(activeProjId || "global");
        if (!entities.memoryContent) {
          return {
            success: false,
            message: "Por favor, indique um termo ou conteúdo da memória que deseja remover."
          };
        }
        const match = memories.find(m => m.content.toLowerCase().includes(entities.memoryContent!.toLowerCase()));
        if (!match) {
          return {
            success: false,
            message: `Não encontrei nenhuma memória correspondente a "${entities.memoryContent}" para ser excluída.`
          };
        }
        return {
          success: true,
          message: `Tem certeza?`,
          requiresConfirmation: true,
          suggestions: {
            pendingAction: {
              type: "DELETE_MEMORY",
              memoryId: match.id,
              memoryContent: match.content,
              projectId: activeProjId
            }
          }
        };
      }

      case "CREATE_TASK": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não foi possível criar a tarefa porque o projectId está ausente."
          };
        }

        if (!entities.taskTitle) {
          return {
            success: false,
            message: "A intenção de criar uma tarefa foi identificada, mas não encontrei um título descritivo. Como deseja nomear a meta?"
          };
        }

        const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
        const task = await this.dbAdapter.createTask({
          projectId: activeProjId,
          title: entities.taskTitle,
          description: entities.projectDescription || "Tarefa agendada via inteligência do Oi Beta.",
          status: entities.taskStatus || "pending",
          priority: entities.taskPriority || "média",
          dueDate: entities.taskDueDate || null,
          userId,
          organizationId,
          workspaceId
        });

        // Record event
        await this.dbAdapter.createActionLog({
          projectId: activeProjId,
          userId,
          actionType: "CreateTaskAction",
          actionDescription: `Cadastrada nova tarefa/meta prioritária: "${task.title}"`
        });

        // Recalculate context automatically
        await updateStateCallback(activeProjId);

        return {
          success: true,
          message: `Tarefa criada com sucesso.\n\n` +
            `Projeto:\n**${project?.name || "Beta Core"}**\n\n` +
            `Prioridade:\n**${(task.priority || "média").toUpperCase()}**\n\n` +
            `Contexto atualizado.`,
          actionExecuted: "CreateTaskAction"
        };
      }

      case "COMPLETE_TASK":
      case "UPDATE_TASK": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não consegui deduzir o espaço de trabalho do projeto para atualizar a tarefa especificada."
          };
        }

        if (!entities.taskTitle) {
          return {
            success: false,
            message: "Por favor, indique o título ou termo identificador da tarefa que deseja alterar."
          };
        }

        // Gather tasks for the project to search matching title
        const tasks = await this.dbAdapter.getTasks(activeProjId);
        const match = tasks.find(t => t.title.toLowerCase().includes(entities.taskTitle!.toLowerCase()));

        if (!match) {
          return {
            success: false,
            message: `Não localizei nenhuma tarefa em andamento contendo o nome "${entities.taskTitle}" no projeto atual.`
          };
        }

        const updateData: any = {};
        if (intent === "COMPLETE_TASK") {
          updateData.status = "completed";
        } else {
          if (entities.taskStatus) updateData.status = entities.taskStatus;
          if (entities.taskPriority) updateData.priority = entities.taskPriority;
        }

        await this.dbAdapter.updateTask(match.id, updateData);

        const isCompletedNow = intent === "COMPLETE_TASK" || entities.taskStatus === "completed";
        const actionType = isCompletedNow ? "CompleteTaskAction" : "UpdateTaskAction";
        const actionDesc = isCompletedNow 
          ? `Concluída com sucesso a meta prioritária: "${match.title}"`
          : `Atualizada a tarefa "${match.title}" com novos parâmetros.`;

        // Record Action Log
        await this.dbAdapter.createActionLog({
          projectId: activeProjId,
          userId,
          actionType,
          actionDescription: actionDesc
        });

        // Recalculate context automatically
        await updateStateCallback(activeProjId);

        return {
          success: true,
          message: isCompletedNow 
            ? `Tarefa concluída com sucesso.\n\nProjeto:\n**${entities.projectName || "Beta Core"}**\n\nPrioridade:\n**${match.priority.toUpperCase()}**\n\nContexto atualizado.`
            : `✏ **Parâmetros da meta corporativa sincronizados!**\n\nAtualizei os detalhes de **"${match.title}"** conforme instruído.`,
          actionExecuted: actionType
        };
      }

      case "CREATE_DECISION": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não foi possível registrar a decisão porque o projectId está ausente."
          };
        }

        if (!entities.decisionTitle) {
          return {
            success: false,
            message: "Qual o título ou manchete da decisão estratégica que deseja homologar?"
          };
        }

        const decision = await this.dbAdapter.createDecision({
          projectId: activeProjId,
          title: entities.decisionTitle,
          description: entities.decisionDescription || "Decisão corporativa alinhada coletivamente no canal institucional.",
          content: entities.decisionContent || entities.decisionDescription || "Alinhamento homologado.",
          reason: entities.decisionReason || "Consensuado em sprint.",
          impact: entities.decisionImpact || "médio",
          importance: entities.decisionImportance || "média",
          userId,
          organizationId,
          workspaceId
        });

        // Record Action Log
        await this.dbAdapter.createActionLog({
          projectId: activeProjId,
          userId,
          actionType: "CreateDecisionAction",
          actionDescription: `Oficializada decisão estratégica: "${decision.title}"`
        });

        // Recalculate context automatically
        await updateStateCallback(activeProjId);

        return {
          success: true,
          message: `Decisão registrada.\n\nProjectState atualizado.`,
          actionExecuted: "CreateDecisionAction"
        };
      }

      case "CREATE_MEMORY": {
        if (!entities.memoryContent) {
          return {
            success: false,
            message: "O que você gostaria de registrar ? Descreva os fatos ou conhecimentos para eu salvar em nossa memória profunda."
          };
        }

        const memory = await this.dbAdapter.createMemory({
          projectId: activeProjId,
          content: entities.memoryContent,
          type: entities.memoryType || "contexto",
          importance: entities.memoryImportance || "média",
          tags: [],
          source: "Canal Conversacional Oi Beta",
          userId,
          organizationId,
          workspaceId
        });

        // Record Action Log
        await this.dbAdapter.createActionLog({
          projectId: activeProjId,
          userId,
          actionType: "CreateMemoryAction",
          actionDescription: `Armazenado conhecimento crítico em memória profunda: "${memory.content.substring(0, 60)}..."`
        });

        if (activeProjId) {
          // Recalculate context automatically
          await updateStateCallback(activeProjId);
        }

        return {
          success: true,
          message: `Memória registrada.`,
          actionExecuted: "CreateMemoryAction"
        };
      }

      case "CREATE_DOCUMENT_NOTE": {
        const docTitle = entities.documentNoteTitle || "Ofício de Parceria Inteligente";
        const docContent = entities.documentNoteContent || "Parceria estratégica governamental.";

        const project = activeProjId ? await this.dbAdapter.getProjectById(activeProjId, userId, organizationId) : null;
        
        // Save documents inside general memories database folder of type "documento"
        await this.dbAdapter.createMemory({
          projectId: activeProjId,
          content: `REDAÇÃO DE DOCUMENTO OFICIAL: [${docTitle}]\nConteúdo:\n${docContent}`,
          type: "documento",
          importance: "média",
          source: "Central de Documentos Oi Beta",
          userId,
          organizationId,
          workspaceId
        });

        // Record action history log
        await this.dbAdapter.createActionLog({
          projectId: activeProjId,
          userId,
          actionType: "CreateDocumentNoteAction",
          actionDescription: `Gerado e redigido documento oficial/nota técnica: "${docTitle}"`
        });

        if (activeProjId) {
          await updateStateCallback(activeProjId);
        }

        return {
          success: true,
          message: `📄 **Documento Oficial redigido e armazenado em nossa base com sucesso!**\n\nConsolidei a ata/documento **"${docTitle}"** no repositório de governança${project ? ` do projeto **${project.name}**` : ""}.`,
          actionExecuted: "CreateDocumentNoteAction"
        };
      }

      case "ASK_TASKS": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não encontrei um projeto ativo selecionado. Por favor, selecione um projeto no workspace para visualizar a listagem completa de metas e tarefas."
          };
        }
        const tasks = await this.dbAdapter.getTasks(activeProjId);
        if (tasks.length === 0) {
          return {
            success: true,
            message: "Não temos nenhuma tarefa cadastrada para o projeto atual no momento."
          };
        }
        let list = `📋 **Aqui estão as tarefas e metas ativas do projeto:**\n\n`;
        tasks.forEach((t, i) => {
          list += `${i + 1}. **${t.title}**\n   * Status: ${t.status === "completed" ? "✅ Concluída" : "⏳ Pendente"} (Prioridade: ${t.priority.toUpperCase()})\n\n`;
        });
        return {
          success: true,
          message: list
        };
      }

      case "ASK_DECISIONS": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não encontrei um projeto ativo selecionado. Por favor, selecione um projeto no workspace para que eu recupere o histórico estruturado de decisões."
          };
        }
        const decisions = await this.dbAdapter.getDecisions(activeProjId);
        if (decisions.length === 0) {
          return {
            success: true,
            message: "Não temos nenhuma decisão estratégica formalmente homologada neste projeto."
          };
        }
        let list = `📜 **Relatório de decisões estratégicas consolidadas no projeto:**\n\n`;
        decisions.forEach((d, i) => {
          list += `${i + 1}. **${d.title}**\n   * Impacto: ${d.impact.toUpperCase()} | Motivação: *${d.reason}*\n\n`;
        });
        return {
          success: true,
          message: list
        };
      }

      case "ASK_CONTEXT": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não encontrei um projeto ativo selecionado. Selecione um projeto para analisar o contexto estratégico unificado da Oi Beta."
          };
        }
        const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
        const state = await this.dbAdapter.getProjectContext(activeProjId);
        const tasks = await this.dbAdapter.getTasks(activeProjId);
        const completedCount = tasks.filter(t => t.status === "completed").length;
        const totalCount = tasks.length;

        let resText = `📊 **Douglas, aqui está a radiografia de progresso e contexto atualizado do projeto ${project?.name || "Selecionado"}:**\n\n`;
        resText += `* **Ponto de Parada Atual:** "${project?.lastStopPoint || "Não especificado"}"\n`;
        resText += `* **Status Geral:** ${project?.status === "active" ? "🟢 Ativo" : "🟡 Pausado"}\n`;
        resText += `* **Pipeline de Atividades:** ${completedCount}/${totalCount} metas concluídas.\n\n`;
        
        if (state) {
          resText += `### Resumo Executivo Recalculado (Cognitivo):\n${state.executiveSummary || "Processando indexação..."}\n\n`;
          resText += `### Próxima Ação recomendada:\n👉 *${state.nextRecommendedAction || "Definir próximos passos"}* (Nível de confiança: **${Math.round((state.contextConfidence || 0.8) * 100)}%**)`;
        } else {
          resText += `*Os algoritmos da Beta estão reindexando a árvore semântica do projeto em background para gerar o relatório estratégico.*`;
        }
        return {
          success: true,
          message: resText
        };
      }

      case "ASK_STATUS": {
        if (!activeProjId) {
          return {
            success: false,
            message: "Não encontrei um projeto ativo selecionado. Selecione um projeto no workspace para visualizar os detalhes de status operacional."
          };
        }
        const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
        if (!project) {
          return {
            success: false,
            message: "Não encontrei um projeto ativo selecionado de forma válida."
          };
        }
        const context = await this.dbAdapter.getProjectContext(activeProjId);
        const tasks = await this.dbAdapter.getTasks(activeProjId);
        const completed = tasks.filter(t => t.status === "completed").length;
        const total = tasks.length;
        
        let msg = `📊 **Status do Projeto: ${project.name}**\n\n`;
        msg += `* **Fase Atual:** ${context ? context.currentStage : "Planejamento"}\n`;
        msg += `* **Situação operacional:** ${project.status === "active" ? "🟢 Ativo e em andamento" : project.status === "paused" ? "🟡 Pausado" : "✅ Concluído"}\n`;
        msg += `* **Objetivo principal:** ${context ? context.currentObjective : project.description || "Não definido"}\n`;
        msg += `* **Conclusão de metas:** ${completed} de ${total} concluídas (${total > 0 ? Math.round((completed/total)*100) : 0}%).\n\n`;
        if (context && context.executiveSummary) {
          msg += `📝 **Resumo executivo:**\n${context.executiveSummary}`;
        }
        return {
          success: true,
          message: msg
        };
      }

      case "ASK_PROJECTS": {
        const projects = await this.dbAdapter.getProjects(userId, organizationId);
        if (projects.length === 0) {
          return {
            success: true,
            message: "Não existem projetos cadastrados em seu espaço de trabalho."
          };
        }
        let msg = `📁 **Projetos e pastas registrados em nosso cérebro corporativo:**\n\n`;
        for (const p of projects) {
          const state = await this.dbAdapter.getProjectContext(p.id);
          const stage = state ? state.currentStage : "Inicial";
          msg += `- **${p.name}** \n  * Status: ${p.status === "active" ? "🟢 Ativo" : "🟡 Pausado"}\n  * Etapa: ${stage}\n  * Resumo: ${p.description || "Nenhuma descrição fornecida."}\n\n`;
        }
        return {
          success: true,
          message: msg
        };
      }

      case "ASK_MEMORIES": {
        const memories = await this.dbAdapter.getMemories(activeProjId || "");
        if (memories.length === 0) {
          return {
            success: true,
            message: activeProjId 
              ? "Não localizei memórias específicas ou fatos corporativos salvos para este projeto." 
              : "Não encontrei memórias gerais registradas no cérebro do espaço corporativo."
          };
        }
        let msg = `🧠 **Memórias e conhecimentos persistidos no cérebro corporativo:**\n\n`;
        memories.forEach((m, idx) => {
          msg += `${idx + 1}. **[${m.type.toUpperCase()}]** *${m.content}*\n   _Importância: ${m.importance}_ \n\n`;
        });
        return {
          success: true,
          message: msg
        };
      }

      default:
        return {
          success: false,
          message: "Esta ação executiva ainda está sendo assimilada por minhas frentes de computação."
        };
    }
  }

  /**
   * Explores the Action Logs history and summarizes it.
   */
  async generateActionsSummary(organizationId: string, workspaceId: string): Promise<string> {
    const logs = await this.dbAdapter.getActionLogs(organizationId, workspaceId);
    if (!logs || logs.length === 0) {
      return "Analisando meu histórico de governança recente, não identifiquei nenhuma ação ou transação executiva realizada diretamente por mim nas últimas sessões. Estamos com a base totalmente limpa e de onde paramos pronta para as primeiras instruções reais!";
    }

    // Sort descending by date
    const sorted = [...logs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    let summary = `💼 **Douglas, aqui está o relatório de ações que acabei de processar recentemente em nosso sistema de governança:**\n\n`;
    sorted.forEach((l, index) => {
      const dateStr = new Date(l.createdAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" });
      summary += `${index + 1}. **[${dateStr}]** • _${l.actionType}_:\n   *${l.actionDescription}*\n\n`;
    });

    summary += `_Todas as transações foram devidamente persistidas no banco local e os resumos de estados cognitivos foram recalculados automaticamente por mim para manter sua governança sempre consistente!_`;
    return summary;
  }
}
