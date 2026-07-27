import { AIConnectionManager } from "./AIConnectionManager";
import { decrypt } from "./providers/CryptoHelper";
import { BaseProvider } from "./providers/BaseProvider";

export class AIRouter {
  private connectionManager: AIConnectionManager;

  constructor(connectionManager: AIConnectionManager) {
    this.connectionManager = connectionManager;
  }

  // Seleciona automaticamente o melhor provedor de acordo com o contexto da conversa
  routeTask(contextText: string, preferences?: { provider?: string; model?: string; priority?: string }): { provider: string; model?: string } {
    // Se o usuário selecionou manualmente, respeitamos a sua decisão
    if (preferences && preferences.provider) {
      return { 
        provider: preferences.provider.toUpperCase(), 
        model: preferences.model 
      };
    }

    const cleanText = contextText.toLowerCase();

    // Regra: Programação -> GPT (OpenAI)
    if (
      cleanText.includes("código") || 
      cleanText.includes("programação") || 
      cleanText.includes("bug") || 
      cleanText.includes("função") || 
      cleanText.includes("script") ||
      cleanText.includes("database") ||
      cleanText.includes("sql") ||
      cleanText.includes("typescript") ||
      cleanText.includes("desenvolver")
    ) {
      return { provider: "OPENAI" };
    }

    // Regra: Documentos longos -> Claude
    if (
      cleanText.includes("documento") || 
      cleanText.includes("edital") || 
      cleanText.includes("texto longo") || 
      cleanText.includes("pdf") || 
      cleanText.includes("relatório") ||
      cleanText.includes("contrato") ||
      cleanText.includes("explicar edital")
    ) {
      return { provider: "CLAUDE" };
    }

    // Regra: Imagens -> Gemini
    if (
      cleanText.includes("imagem") || 
      cleanText.includes("foto") || 
      cleanText.includes("ilustração") || 
      cleanText.includes("desenho") || 
      cleanText.includes("gerar imagem") ||
      cleanText.includes("visão")
    ) {
      return { provider: "GEMINI" };
    }

    // Regra: Respostas rápidas -> Groq
    if (
      cleanText.includes("rápido") || 
      cleanText.includes("imediato") || 
      cleanText.includes("tempo real") || 
      cleanText.includes("chat rápido")
    ) {
      return { provider: "GROQ" };
    }

    // Regra: Modelos locais -> Ollama
    if (
      cleanText.includes("local") || 
      cleanText.includes("ollama") || 
      cleanText.includes("offline") || 
      cleanText.includes("modelo local")
    ) {
      return { provider: "OLLAMA" };
    }

    // Modelo genérico -> OpenRouter
    return { provider: "OPENROUTER" };
  }

  // Barramento central de geração inteligente com resiliência em cascata e Modo Local autônomo
  async generate(
    organizationId: string,
    prompt: string,
    systemInstruction?: string,
    preferences?: { provider?: string; model?: string; priority?: string }
  ): Promise<{ response: string; usedProvider: string }> {
    // 1. Determinar o provedor primário sugerido
    let primaryProvider = preferences?.provider;
    if (!primaryProvider) {
      const routeDecision = this.routeTask(prompt, preferences);
      primaryProvider = routeDecision.provider;
    }

    // 2. Coletar TODAS as conexões ativas cadastradas
    const activeConnections = await this.connectionManager.db.getAIConnections(organizationId);
    const healthyCandidates: any[] = [];

    // Prioridade 1: Adicionar a conexão correspondente ao provedor primário/selecionado
    const primaryConn = activeConnections.find(
      c => c.provider.toUpperCase() === primaryProvider!.toUpperCase() && c.status === "active"
    );
    if (primaryConn) {
      healthyCandidates.push(primaryConn);
    }

    // Prioridade 2: Adicionar a conexão marcada como padrão (se não estiver adicionada já)
    const defaultConn = activeConnections.find(c => c.isDefault && c.status === "active");
    if (defaultConn && !healthyCandidates.some(c => c.id === defaultConn.id)) {
      healthyCandidates.push(defaultConn);
    }

    // Prioridade 3: Adicionar qualquer outro provedor ativo de contingência
    for (const c of activeConnections) {
      if (c.status === "active" && !healthyCandidates.some(cand => cand.id === c.id)) {
        healthyCandidates.push(c);
      }
    }

    // 3. Loop Cascata de Contingência (Primary -> Secondary -> Tertiary)
    for (const conn of healthyCandidates) {
      try {
        const providerInstance = this.connectionManager.getProviderInstance(conn.provider);
        const rawApiKey = conn.apiKeyEncrypted ? decrypt(conn.apiKeyEncrypted) : "";
        
        // Emuladores/Ferramentas locais de Ollama não precisam necessariamente de chave
        if (!rawApiKey && conn.provider !== "OLLAMA") {
          continue;
        }

        const modelToUse = preferences?.model || conn.model || undefined;
        await providerInstance.initialize(rawApiKey, conn.baseUrl || undefined, modelToUse);
        
        const health = await providerInstance.healthCheck().catch(() => ({ ok: false }));
        if (!health.ok) {
          console.warn(`[AIRouter] Provedor ${conn.provider} falhou no healthcheck temporariamente. Transitando canal.`);
          continue;
        }

        const response = await providerInstance.generate(prompt, systemInstruction);
        if (response && response.trim().length > 0) {
          return { response: response.trim(), usedProvider: conn.provider };
        }
      } catch (err: any) {
        console.warn(`[AIRouter] Cascata falhou no provedor ${conn.provider}: ${err.message}. Avançando canal de contingência...`);
      }
    }

    // 4. Modo Local autônomo offline caso toda IA esteja fora do ar
    const localText = await this.generateLocalResponse(organizationId, prompt);
    return {
      response: localText,
      usedProvider: "LOCAL"
    };
  }

  // Resposta inteligente mockada do Modo Local offline com leitura de dados reais
  async generateLocalResponse(organizationId: string, prompt: string): Promise<string> {
    const textLower = prompt.toLowerCase();
    
    // Consultar banco local real para relatar progresso fiel
    const projects = await this.connectionManager.db.getProjects("", organizationId).catch(() => []);
    const activeProj = projects.length > 0 ? projects[0] : null;

    let response = `🔒 **[Beta Modo Local]** Não foi possível estabelecer conexão estável com os provedores de inteligência (chaves inválidas/offline).\n`;
    response += `Meus módulos cogitativos ativaram o **Modo de Contingência Cognitiva Local**. Sendo assim, continuo operando de forma autônoma:\n\n`;

    if (textLower.includes("projeto") || textLower.includes("quais") || textLower.includes("situ")) {
      response += `💼 **Frentes de Trabalho e Projetos Mapeados no Sistema:**\n`;
      if (projects.length === 0) {
        response += `Nenhum projeto cadastrado no banco. Escreva "Crie um projeto chamado [Nome]" para registrar um.\n`;
      } else {
        projects.slice(0, 3).forEach((p: any) => {
          response += `- **${p.name}**\n  _Status:_ ${p.status?.toUpperCase() || "ATIVO"}\n  _Ponto de parada:_ ${p.lastStopPoint || "Não especificado"}\n`;
        });
      }
    } else if (textLower.includes("tarefa") || textLower.includes("meta") || textLower.includes("fazer")) {
      response += `📋 **Metas e Entregas Pendentes (Pipeline Táctico):**\n`;
      if (!activeProj) {
        response += `Crie um projeto para gerenciar o pipeline de metas.\n`;
      } else {
        const tasks = await this.connectionManager.db.getTasks(activeProj.id).catch(() => []);
        const pending = tasks.filter((t: any) => t.status !== "completed");
        if (pending.length === 0) {
          response += `Nenhuma tarefa pendente no projeto ativo. Tudo em ordem!\n`;
        } else {
          response += `Existem ${pending.length} metas urgentes registradas em "${activeProj.name}":\n`;
          pending.slice(0, 5).forEach((t: any) => {
            response += `- [${t.priority?.toUpperCase() || "MED"}] **${t.title}**\n`;
          });
        }
      }
    } else if (textLower.includes("decis") || textLower.includes("registre")) {
      response += `🔑 **Registro Histórico de Decisões do Projeto:**\n`;
      if (!activeProj) {
        response += `Não há projeto ativo.\n`;
      } else {
        const decisions = await this.connectionManager.db.getDecisions(activeProj.id).catch(() => []);
        if (decisions.length === 0) {
          response += `Nenhuma decisão corporativa ou técnica foi documentada ainda.\n`;
        } else {
          decisions.slice(0, 3).forEach((d: any) => {
            response += `- **${d.title}**: ${d.description || "Sem notas adicionais."}\n`;
          });
        }
      }
    } else {
      response += `Olá, sou a **Beta**. Meus canais externos de IA estão desconectados temporariamente, mas eu continuo ativa.\n\n`;
      response += `Todos os seus dados estruturados (Metas, Decisões, Registro de Memórias, Snapshot de Continuidade e Grafo) continuam 100% legíveis e seguros.\n`;
      response += `Você pode cadastrar e acompanhar seus projetos pelas abas de controle, ou inserir chaves de API válidas nas Configurações para restabelecer os modelos avançados.`;
    }

    return response;
  }
}
