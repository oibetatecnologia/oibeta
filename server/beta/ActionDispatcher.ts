import { DatabaseAdapter } from "../database/DatabaseAdapter";
import { ParsedIntent } from "./BetaIntentParser";
import { KnowledgeGraphEngine } from "./KnowledgeGraphEngine";
import { ContinuityEngine } from "./ContinuityEngine";

export class ActionDispatcher {
  private knowledgeGraph: KnowledgeGraphEngine;
  private continuity: ContinuityEngine;

  constructor(private dbAdapter: DatabaseAdapter, private aiRouter?: any) {
    this.knowledgeGraph = new KnowledgeGraphEngine(dbAdapter);
    this.continuity = new ContinuityEngine(dbAdapter, aiRouter);
  }

  async dispatchAction(
    parsedIntent: ParsedIntent,
    userId: string,
    organizationId: string,
    currentProjectId: string | null,
    updateStateCallback: (projectId: string) => Promise<any>,
    workspaceId: string = "workspace-oi-beta"
  ): Promise<any> {
    const startTime = Date.now();
    const { intentType, confidence, entities, payload } = parsedIntent;
    
    let activeProjId = null;
    try {
      activeProjId = await this.resolveProjectId(entities.projectId || null, currentProjectId, userId, organizationId);
    } catch (e: any) {
      console.warn("Could not resolve active project ID automatically:", e.message);
    }

    let executed = false;
    let actionResult: any = null;
    let customMsg = "";

    try {
      switch (intentType) {
        case "CREATE_PROJECT": {
          const name = payload.name || entities.projectName;
          if (!name) {
            throw new Error("Nome do projeto é obrigatório para criação.");
          }
          const newProj = await this.dbAdapter.createProject({
            name,
            description: payload.description || entities.projectDescription || "Projeto iniciado via backend automatic dispatcher.",
            status: payload.status || entities.projectStatus || "active",
            lastStopPoint: payload.lastStopPoint || entities.lastStopPoint || "Projeto inicializado e mapeado no sistema.",
            userId,
            organizationId,
            workspaceId
          });
          
          await this.dbAdapter.createActionLog({
            projectId: newProj.id,
            userId,
            actionType: "CreateProjectAction",
            actionDescription: `Criado o projeto "${newProj.name}" no workspace corporativo.`
          });

          // Knowledge Graph integration
          await this.knowledgeGraph.onProjectCreated(newProj).catch(err => console.error("KG onProjectCreated failed:", err));
          // Continuity Engine integration
          await this.continuity.rebuild(newProj.id, organizationId).catch(err => console.error("Continuity rebuild failed:", err));

          await updateStateCallback(newProj.id);
          executed = true;
          actionResult = { id: newProj.id, name: newProj.name };
          
          customMsg = `Projeto criado com sucesso.\n\n` +
            `Nome:\n**${newProj.name}**\n\n` +
            `Resumo:\n${newProj.description}\n\n` +
            `Contexto e rede de conhecimento inicializados.`;
          break;
        }

        case "UPDATE_PROJECT": {
          if (!activeProjId) {
            throw new Error("ID do projeto não fornecido para atualização.");
          }
          const updateData: any = {};
          if (payload.description !== undefined) updateData.description = payload.description;
          if (payload.status !== undefined) updateData.status = payload.status;
          if (payload.lastStopPoint !== undefined) updateData.lastStopPoint = payload.lastStopPoint;

          if (Object.keys(updateData).length > 0) {
            await this.dbAdapter.updateProject(activeProjId, updateData);
            const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
            
            await this.dbAdapter.createActionLog({
              projectId: activeProjId,
              userId,
              actionType: "UpdateProjectAction",
              actionDescription: `Atualizados parâmetros do projeto "${project?.name || "Projeto"}": ${Object.keys(updateData).join(", ")}.`
            });

            // Continuity Engine integration on project updates
            await this.continuity.rebuild(activeProjId, organizationId).catch(err => console.error("Continuity rebuild failed:", err));

            await updateStateCallback(activeProjId);
            executed = true;
            actionResult = { id: activeProjId, name: project?.name };
            
            customMsg = `Projeto atualizado com sucesso.\n\n` +
              `Nome:\n**${project?.name || "Projeto"}**\n\n` +
              `Status:\n${project?.status || "active"}\n\n` +
              `Contexto e continuidade atualizados.`;
          } else {
            customMsg = "Nenhum parâmetro de alteração foi especificado.";
          }
          break;
        }

        case "CREATE_TASK": {
          if (!activeProjId) {
            throw new Error("ID do projeto é necessário para criação de tarefas.");
          }
          const title = payload.title || entities.taskTitle;
          if (!title) {
            throw new Error("Título da tarefa é obrigatório.");
          }

          const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
          const pPriority = payload.priority || entities.taskPriority || "média";
          const task = await this.dbAdapter.createTask({
            projectId: activeProjId,
            title,
            description: payload.description || entities.projectDescription || "Tarefa agendada via inteligência do Oi Beta.",
            status: payload.status || entities.taskStatus || "pending",
            priority: pPriority.toLowerCase(),
            dueDate: payload.dueDate || entities.taskDueDate || null,
            userId,
            organizationId,
            workspaceId
          });

          await this.dbAdapter.createActionLog({
            projectId: activeProjId,
            userId,
            actionType: "CreateTaskAction",
            actionDescription: `Cadastrada nova tarefa/meta prioritária: "${task.title}"`
          });

          // Knowledge Graph Integration
          await this.knowledgeGraph.onTaskCreated(task).catch(err => console.error("KG onTaskCreated failed:", err));
          // Continuity Engine Integration
          await this.continuity.rebuild(activeProjId, organizationId).catch(err => console.error("Continuity rebuild failed:", err));

          await updateStateCallback(activeProjId);
          executed = true;
          actionResult = { id: task.id, title: task.title, projectName: project?.name };
          
          let formattedPriority = String(task.priority);
          formattedPriority = formattedPriority.charAt(0).toUpperCase() + formattedPriority.slice(1);
          if (formattedPriority.toLowerCase() === "alta") {
            formattedPriority = "Alta";
          } else if (formattedPriority.toLowerCase() === "média") {
            formattedPriority = "Média";
          } else if (formattedPriority.toLowerCase() === "baixa") {
            formattedPriority = "Baixa";
          } else if (formattedPriority.toLowerCase() === "crítica") {
            formattedPriority = "Crítica";
          }

          customMsg = `Tarefa criada com sucesso.\n\n` +
            `Projeto:\n**${project?.name || "Beta Core"}**\n\n` +
            `Prioridade:\n**${formattedPriority}**\n\n` +
            `Conexões de conhecimento cognitivas e continuidade atualizadas.`;
          break;
        }

        case "UPDATE_TASK":
        case "COMPLETE_TASK": {
          if (!activeProjId) {
            throw new Error("ID do projeto é necessário para atualizar uma tarefa.");
          }
          const title = payload.title || entities.taskTitle;
          if (!title) {
            throw new Error("Título da tarefa é obrigatório para busca.");
          }

          const tasks = await this.dbAdapter.getTasks(activeProjId);
          const match = tasks.find(t => t.title.toLowerCase().includes(title.toLowerCase()));

          if (!match) {
            throw new Error(`Tarefa contendo "${title}" não encontrada no projeto.`);
          }

          const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
          const updateData: any = {};
          if (intentType === "COMPLETE_TASK") {
            updateData.status = "completed";
          } else {
            if (payload.status) updateData.status = payload.status;
            if (payload.priority) updateData.priority = payload.priority.toLowerCase();
          }

          await this.dbAdapter.updateTask(match.id, updateData);

          const isCompletedNow = intentType === "COMPLETE_TASK" || payload.status === "completed" || updateData.status === "completed";
          const actionType = isCompletedNow ? "CompleteTaskAction" : "UpdateTaskAction";
          const actionDesc = isCompletedNow 
            ? `Concluída com sucesso a meta prioritária: "${match.title}"`
            : `Atualizada a tarefa "${match.title}" com novos parâmetros.`;

          await this.dbAdapter.createActionLog({
            projectId: activeProjId,
            userId,
            actionType,
            actionDescription: actionDesc
          });

          // Continuity Engine Integration on task completion/update
          await this.continuity.rebuild(activeProjId, organizationId).catch(err => console.error("Continuity rebuild failed:", err));

          await updateStateCallback(activeProjId);
          executed = true;
          actionResult = { id: match.id, title: match.title, status: isCompletedNow ? "completed" : "updated" };
          
          let formattedPriority = String(match.priority);
          formattedPriority = formattedPriority.charAt(0).toUpperCase() + formattedPriority.slice(1);

          customMsg = isCompletedNow
            ? `Tarefa concluída com sucesso.\n\nProjeto:\n**${project?.name || "Beta Core"}**\n\nPrioridade:\n**${formattedPriority}**\n\nContinuidade e estado do projeto atualizados.`
            : `Parâmetros da meta corporativa sincronizados com sucesso.\n\nProjeto:\n**${project?.name || "Beta Core"}**\n\nTarefa:\n**${match.title}**\n\nContinuidade atualizada.`;
          break;
        }

        case "CREATE_OBJECTIVE": {
          if (!activeProjId) {
            throw new Error("ID do projeto é necessário para criação de objetivos.");
          }
          const title = payload.title || entities.objectiveTitle;
          if (!title) {
            throw new Error("Título do objetivo é obrigatório.");
          }

          const project = await this.dbAdapter.getProjectById(activeProjId, userId, organizationId);
          const objective = await this.dbAdapter.createObjective({
            projectId: activeProjId,
            title,
            description: payload.description || entities.objectiveDescription || "Objetivo estratégico alinhado para a governança do projeto.",
            status: payload.status || "pending",
            userId,
            organizationId
          });

          await this.dbAdapter.createActionLog({
            projectId: activeProjId,
            userId,
            actionType: "CreateObjectiveAction",
            actionDescription: `Cadastrado novo objetivo estratégico: "${objective.title}"`
          });

          // Knowledge Graph Integration
          await this.knowledgeGraph.onObjectiveCreated(objective).catch(err => console.error("KG onObjectiveCreated failed:", err));
          // Continuity Engine Integration
          await this.continuity.rebuild(activeProjId, organizationId).catch(err => console.error("Continuity rebuild failed:", err));

          await updateStateCallback(activeProjId);
          executed = true;
          actionResult = { id: objective.id, title: objective.title };

          customMsg = `Objetivo de governança estratégica criado com sucesso.\n\n` +
            `Projeto:\n**${project?.name || "Beta Core"}**\n\n` +
            `Objetivo:\n**${objective.title}**\n\n` +
            `Contexto e rede semântica atualizados.`;
          break;
        }

        case "CREATE_DECISION": {
          if (!activeProjId) {
            throw new Error("ID do projeto é necessário para registrar uma decisão.");
          }
          const title = payload.title || entities.decisionTitle;
          if (!title) {
            throw new Error("Título de decisão é obrigatório.");
          }

          const decision = await this.dbAdapter.createDecision({
            projectId: activeProjId,
            title,
            description: payload.description || entities.decisionDescription || "Decisão corporativa alinhada coletivamente.",
            content: payload.content || entities.decisionContent || payload.description || "Alinhamento homologado.",
            reason: payload.reason || entities.decisionReason || "Consensuado em sprint.",
            impact: payload.impact || entities.decisionImpact || "médio",
            importance: payload.importance || entities.decisionImportance || "média",
            userId,
            organizationId,
            workspaceId
          });

          await this.dbAdapter.createActionLog({
            projectId: activeProjId,
            userId,
            actionType: "CreateDecisionAction",
            actionDescription: `Oficializada decisão estratégica: "${decision.title}"`
          });

          // Knowledge Graph Integration
          await this.knowledgeGraph.onDecisionCreated(decision).catch(err => console.error("KG onDecisionCreated failed:", err));
          // Continuity Engine Integration
          await this.continuity.rebuild(activeProjId, organizationId).catch(err => console.error("Continuity rebuild failed:", err));

          await updateStateCallback(activeProjId);
          executed = true;
          actionResult = { id: decision.id, title: decision.title };
          
          customMsg = `Decisão estratégica formalizada com sucesso.\n\nMapeamento cognitivo e continuidade sincronizados de forma íntegra.`;
          break;
        }

        case "CREATE_MEMORY": {
          const content = payload.content || entities.memoryContent;
          if (!content) {
            throw new Error("Conteúdo da memória é obrigatório.");
          }

          const memory = await this.dbAdapter.createMemory({
            projectId: activeProjId || null,
            content,
            type: payload.type || entities.memoryType || "contexto",
            importance: payload.importance || entities.memoryImportance || "média",
            tags: [],
            source: "Canal Conversacional Oi Beta",
            userId,
            organizationId,
            workspaceId
          });

          await this.dbAdapter.createActionLog({
            projectId: activeProjId || null,
            userId,
            actionType: "CreateMemoryAction",
            actionDescription: `Armazenado conhecimento crítico em memória profunda: "${memory.content.substring(0, 60)}..."`
          });

          // Knowledge Graph Integration
          await this.knowledgeGraph.onMemoryCreated(memory).catch(err => console.error("KG onMemoryCreated failed:", err));
          
          // Continuity Engine Integration (only if project context is available)
          if (activeProjId) {
            await this.continuity.rebuild(activeProjId, organizationId).catch(err => console.error("Continuity rebuild failed:", err));
            await updateStateCallback(activeProjId);
          }

          executed = true;
          actionResult = { id: memory.id };
          
          customMsg = `Informação registrada com sucesso na memória de longo-prazo do Oi Beta.`;
          break;
        }

        case "CREATE_DOCUMENT_NOTE": {
          if (!activeProjId) {
            throw new Error("ID do projeto é necessário para anexar um documento técnico.");
          }
          const title = payload.title || entities.documentNoteTitle || "Documento Técnico Anexo";
          const content = payload.content || entities.documentNoteContent || "Conteúdo técnico em processamento cognitive.";

          // We'll simulate a document note creation (often it registers a memory or customized notes in tables)
          // To fulfill the document integration internally structured in Etapa 6:
          const docSimulated = {
            id: "doc_" + Math.random().toString(36).substr(2, 9),
            title,
            content,
            projectId: activeProjId,
            userId,
            organizationId
          };

          // We trigger the internal event for documentation on Knowledge Graph
          await this.knowledgeGraph.onDocumentCreated(docSimulated).catch(err => console.error("KG onDocumentCreated failed:", err));
          // Continuity Rebuild trigger
          await this.continuity.rebuild(activeProjId, organizationId).catch(err => console.error("Continuity rebuild failed:", err));

          await updateStateCallback(activeProjId);
          executed = true;
          actionResult = { id: docSimulated.id, title: docSimulated.title };

          customMsg = `Documento "${docSimulated.title}" processado internamente pela rede cognitiva e integrado ao Knowledge Graph de continuidade.`;
          break;
        }

        default:
          throw new Error(`Intenção executiva não suportada pelo Dispatcher direto: ${intentType}`);
      }
    } catch (e: any) {
      console.error("ActionDispatcher error:", e);
      executed = false;
      customMsg = `Erro ao executar ação automática no backend: ${e.message}`;
    }

    const executionTime = Date.now() - startTime;

    // Save ActionExecutionLog in DB
    await this.dbAdapter.createActionExecutionLog({
      projectId: activeProjId || null,
      intentType,
      confidence,
      executed,
      executionTime,
      errorReturned: executed ? null : customMsg,
      createdAt: new Date().toISOString()
    });

    return {
      success: executed,
      actionExecuted: intentType,
      projectUpdated: executed,
      contextUpdated: executed,
      message: customMsg,
      result: actionResult
    };
  }

  private async resolveProjectId(
    entitiesProjId: string | null,
    currentProjId: string | null,
    userId: string,
    orgId: string
  ): Promise<string> {
    // 1. Explicitly defined in parsed entities
    if (entitiesProjId) return entitiesProjId;

    // 2. Persistent workspace state lookup
    try {
      const state = await this.dbAdapter.getWorkspaceState(userId, orgId, "workspace-oi-beta");
      if (state && state.activeProjectId) {
        return state.activeProjectId;
      }
    } catch (e) {
      console.warn("Error getting workspace state in ActionDispatcher resolveProjectId:", e);
    }

    // 3. Client active project passed explicitly
    if (currentProjId) return currentProjId;

    // 4. Default database lookups
    const projects = await this.dbAdapter.getProjects(userId, orgId);
    if (projects.length === 0) {
      throw new Error("Nenhum projeto cadastrado no sistema.");
    }

    // 5. Beta Core from organization
    const betaCore = projects.find(p => p.name.toLowerCase().includes("beta core"));
    if (betaCore) return betaCore.id;

    // 6. First active project of organization
    const activeProjects = projects.filter(p => p.status === "active");
    if (activeProjects.length > 0) {
      return activeProjects[0].id;
    }

    // 7. First project of organization
    return projects[0].id;
  }
}
