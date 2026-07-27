export interface ExtractedEntities {
  projectName?: string;
  projectDescription?: string;
  projectStatus?: "active" | "paused" | "completed";
  lastStopPoint?: string;
  
  taskTitle?: string;
  taskStatus?: "pending" | "in_progress" | "completed";
  taskPriority?: "baixa" | "média" | "alta" | "crítica";
  taskDueDate?: string;
  taskId?: string;

  objectiveTitle?: string;
  objectiveDescription?: string;

  decisionTitle?: string;
  decisionDescription?: string;
  decisionContent?: string;
  decisionReason?: string;
  decisionImpact?: "baixo" | "médio" | "alto";
  decisionImportance?: "baixa" | "média" | "alta";

  memoryContent?: string;
  memoryType?: "contexto" | "fato" | "risco" | "objetivo";
  memoryImportance?: "baixa" | "média" | "alta" | "crítica";

  documentNoteTitle?: string;
  documentNoteContent?: string;

  projectId?: string;
}

export interface ParsedIntent {
  intent:
    | "CREATE_PROJECT"
    | "UPDATE_PROJECT"
    | "CREATE_TASK"
    | "UPDATE_TASK"
    | "COMPLETE_TASK"
    | "CREATE_OBJECTIVE"
    | "UPDATE_OBJECTIVE"
    | "CREATE_DECISION"
    | "CREATE_MEMORY"
    | "ASK_CONTEXT"
    | "ASK_DECISIONS"
    | "ASK_TASKS"
    | "ASK_STATUS"
    | "ASK_PROJECTS"
    | "ASK_MEMORIES"
    | "CREATE_DOCUMENT_NOTE"
    | "DELETE_PROJECT"
    | "DELETE_TASK"
    | "DELETE_DECISION"
    | "DELETE_MEMORY"
    | "GENERAL_CHAT";
  intentType:
    | "CREATE_PROJECT"
    | "UPDATE_PROJECT"
    | "CREATE_TASK"
    | "UPDATE_TASK"
    | "COMPLETE_TASK"
    | "CREATE_OBJECTIVE"
    | "UPDATE_OBJECTIVE"
    | "CREATE_DECISION"
    | "CREATE_MEMORY"
    | "ASK_CONTEXT"
    | "ASK_DECISIONS"
    | "ASK_TASKS"
    | "ASK_STATUS"
    | "ASK_PROJECTS"
    | "ASK_MEMORIES"
    | "CREATE_DOCUMENT_NOTE"
    | "DELETE_PROJECT"
    | "DELETE_TASK"
    | "DELETE_DECISION"
    | "DELETE_MEMORY"
    | "GENERAL_CHAT";
  confidence: number;
  entities: ExtractedEntities;
  payload: any;
}

export function buildPayload(intent: string, entities: ExtractedEntities): any {
  const payload: any = {};
  switch (intent) {
    case "CREATE_PROJECT":
      payload.name = entities.projectName || "";
      payload.description = entities.projectDescription || "";
      payload.status = entities.projectStatus || "active";
      payload.lastStopPoint = entities.lastStopPoint || "";
      break;
    case "UPDATE_PROJECT":
      payload.description = entities.projectDescription;
      payload.status = entities.projectStatus;
      payload.lastStopPoint = entities.lastStopPoint;
      break;
    case "CREATE_TASK":
    case "UPDATE_TASK":
    case "COMPLETE_TASK":
      payload.title = entities.taskTitle || "";
      payload.priority = entities.taskPriority?.toUpperCase() || "MÉDIA";
      payload.status = entities.taskStatus || (intent === "COMPLETE_TASK" ? "completed" : "pending");
      payload.dueDate = entities.taskDueDate;
      break;
    case "CREATE_OBJECTIVE":
    case "UPDATE_OBJECTIVE":
      payload.title = entities.objectiveTitle || "";
      payload.description = entities.objectiveDescription || "";
      break;
    case "CREATE_DECISION":
      payload.title = entities.decisionTitle || "";
      payload.description = entities.decisionDescription || "";
      payload.content = entities.decisionContent || "";
      payload.reason = entities.decisionReason || "";
      payload.impact = entities.decisionImpact || "médio";
      payload.importance = entities.decisionImportance || "média";
      break;
    case "CREATE_MEMORY":
      payload.content = entities.memoryContent || "";
      payload.type = entities.memoryType || "contexto";
      payload.importance = entities.memoryImportance || "média";
      break;
  }
  return payload;
}

export function parseIntentLocally(message: string, fallback: ParsedIntent): ParsedIntent {
  const lower = message.toLowerCase();
  const parsed = { ...fallback };
  
  if (lower.startsWith("crie um projeto chamado") || lower.startsWith("criar projeto")) {
    parsed.intent = "CREATE_PROJECT";
    const name = message.split(/chamado|projeto/i)[1]?.trim() || "Novo Projeto Heurístico";
    parsed.entities.projectName = name.replace(/["']/g, "");
  } else if (lower.includes("meta") || lower.includes("tarefa")) {
    if (lower.includes("crie") || lower.includes("criar") || lower.includes("adicione")) {
      parsed.intent = "CREATE_TASK";
      parsed.entities.taskTitle = message.replace(/crie uma tarefa para |crie uma tarefa |criar tarefa |adicione tarefa /gi, "").trim();
    } else {
      parsed.intent = "ASK_TASKS";
    }
  } else if (lower.includes("decisão") || lower.includes("decidimos")) {
    if (lower.includes("registre") || lower.includes("crie") || lower.includes("criar")) {
      parsed.intent = "CREATE_DECISION";
      parsed.entities.decisionTitle = message.replace(/registre a decisão |registre decisão |decidimos /gi, "").trim();
    } else {
      parsed.intent = "ASK_DECISIONS";
    }
  } else if (lower.includes("memória") || lower.includes("guarde") || lower.includes("anote")) {
    if (lower.includes("registre") || lower.includes("guarde") || lower.includes("anote")) {
      parsed.intent = "CREATE_MEMORY";
      parsed.entities.memoryContent = message;
    } else {
      parsed.intent = "ASK_MEMORIES";
    }
  } else if (lower.includes("status") || lower.includes("progresso") || lower.includes("fase atual")) {
    parsed.intent = "ASK_STATUS";
  } else if (lower.includes("listar projetos") || lower.includes("projetos existentes") || lower.includes("quais projetos")) {
    parsed.intent = "ASK_PROJECTS";
  } else if (lower.includes("parou") || lower.includes("de onde paramos") || lower.includes("onde paramos")) {
    parsed.intent = "ASK_CONTEXT";
  }
  
  parsed.intentType = parsed.intent;
  parsed.payload = buildPayload(parsed.intent, parsed.entities);
  return parsed;
}

export async function parseIntent(
  message: string,
  projectIdContext: string | null,
  availableProjects: any[],
  aiRouter: any,
  userId?: string,
  organizationId?: string,
  currentProjectId?: string | null
): Promise<ParsedIntent> {
  const fallback: ParsedIntent = {
    intent: "GENERAL_CHAT",
    intentType: "GENERAL_CHAT",
    confidence: 1.0,
    entities: {},
    payload: {}
  };

  if (!aiRouter) {
    return parseIntentLocally(message, fallback);
  }

  try {
    const projectsListSummary = availableProjects
      .map(p => `- ID: "${p.id}", Nome: "${p.name}"`)
      .join("\n");

    const systemInstruction = `Você é o "BetaIntentParser", o módulo de classificação sintática e semântica de intenções de negócio para o Oi Beta.
Sua missão é ler a mensagem do usuário e extrair qual ação executiva ele deseja realizar, se houver, bem como todas as propriedades de dados relevantes (entidades).

FORMATO DE INTENÇÃO (intent):
1. 'CREATE_PROJECT': Criar novo projeto (ex: "crie um projeto chamado X").
2. 'UPDATE_PROJECT': Atualizar projeto existente, editar descrição, status ou ponto de parada (ex: "o projeto parou em tal etapa", "mude o status de X para concluído").
3. 'CREATE_TASK': Criar uma nova tarefa ou meta pendente (ex: "adicione uma nova tarefa crítica de homologar segurança").
4. 'UPDATE_TASK': Atualizar status de uma tarefa existente (ex: "mude a prioridade da tarefa X para alta").
5. 'COMPLETE_TASK': Concluir ou dar baixa em uma tarefa existente (ex: "conclua a tarefa de revisar schema.sql", "marca de feito a tarefa X").
6. 'CREATE_DECISION': Registrar uma nova decisão corporativa/técnica tomada (ex: "registre uma decisão de continuar a Sprint 5 amanhã").
7. 'CREATE_MEMORY': Registrar uma memória importante de longo prazo (ex: "registre esta informação como memória: o cliente prefere contato no fim do dia").
8. 'CREATE_DOCUMENT_NOTE': Criar documento ou nota técnica (ex: "redija um ofício para prefeitura", "gere nota técnica de parceria").
9. 'DELETE_PROJECT': Excluir/deletar um projeto (ex: "excluir projeto X", "deletar projeto").
10. 'DELETE_TASK': Excluir/deletar uma tarefa (ex: "exclua a tarefa X", "remover tarefa").
11. 'DELETE_DECISION': Excluir/deletar uma decisão (ex: "excluir decisão X").
12. 'DELETE_MEMORY': Excluir/deletar uma memória (ex: "apagar memória X", "remover memória").
13. 'ASK_CONTEXT': Perguntar "De onde paramos?", pedir resumo do projeto, status atual ou diretrizes operacionais.
14. 'ASK_STATUS': Perguntar sobre o status ou progresso geral do projeto ativo ou do workspace.
15. 'ASK_PROJECTS': Perguntar sobre a listagem ou situation dos projetos disponíveis.
16. 'ASK_DECISIONS': Perguntar sobre decisões tomadas do projeto.
17. 'ASK_TASKS': Perguntar sobre as tarefas ou metas pendentes.
18. 'ASK_MEMORIES': Perguntar sobre memórias gerais ou específicas do projeto ativo.
19. 'GENERAL_CHAT': Conversa aberta, chat geral, saudações ordinárias sem solicitação de ações.

DIRETRIZES DE EXTRAÇÃO:
- Se houver 'projectIdContext' ativo ("${projectIdContext || ""}"), considere que as ações de tarefa, decisão, memória, documento ou atualização referem-se a este projeto, a menos que o usuário declare outro nome.
- Use a lista de projetos disponíveis para mapear o 'projectId' caso o usuário faça menção direta a algum nome de projeto conhecido:
${projectsListSummary || "Nenhum projeto cadastrado."}

Retorne um objeto JSON estrito com o seguinte esquema:
{
  "intent": "CREATE_PROJECT" | "UPDATE_PROJECT" | "CREATE_TASK" | "UPDATE_TASK" | "COMPLETE_TASK" | "CREATE_DECISION" | "CREATE_MEMORY" | "CREATE_DOCUMENT_NOTE" | "DELETE_PROJECT" | "DELETE_TASK" | "DELETE_DECISION" | "DELETE_MEMORY" | "ASK_CONTEXT" | "ASK_STATUS" | "ASK_PROJECTS" | "ASK_DECISIONS" | "ASK_TASKS" | "ASK_MEMORIES" | "GENERAL_CHAT",
  "confidence": 0.0 a 1.0,
  "entities": {
    "projectName": "...", 
    "projectDescription": "...",
    "projectStatus": "active" | "paused" | "completed",
    "lastStopPoint": "...",
    "taskTitle": "...",
    "taskStatus": "pending" | "completed",
    "taskPriority": "baixa" | "média" | "alta" | "crítica",
    "taskDueDate": "YYYY-MM-DD",
    "taskId": "...",
    "decisionTitle": "...",
    "decisionDescription": "...",
    "decisionContent": "...",
    "decisionReason": "...",
    "decisionImpact": "baixo" | "médio" | "alto",
    "decisionImportance": "baixa" | "média" | "alta",
    "memoryContent": "...",
    "memoryType": "contexto" | "fato" | "risco" | "objetivo",
    "memoryImportance": "baixa" | "média" | "alta" | "crítica",
    "documentNoteTitle": "...",
    "documentNoteContent": "...",
    "projectId": "..."
  }
}`;

    const promptMessage = `${systemInstruction}\n\nMENSAGEM DO USUÁRIO:\n"${message}"\n\nRetorne exclusivamente o JSON de forma limpa.`;

    const response = await aiRouter.generate(
      organizationId || "org-oi-beta",
      promptMessage,
      "Você é o BetaIntentParser."
    );

    const rawText = response?.response || "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0].trim());
      if (parsed.intent) {
        parsed.intentType = parsed.intent;
        parsed.payload = buildPayload(parsed.intent, parsed.entities);
        return parsed as ParsedIntent;
      }
    }
  } catch (error) {
    console.error("Error running BetaIntentParser:", error);
    return parseIntentLocally(message, fallback);
  }

  return fallback;
}
