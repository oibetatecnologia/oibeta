import { AIRouter } from "./AIRouter";
import { AIConnectionManager } from "./AIConnectionManager";

export class CompositeReasoningEngine {
  private connectionManager: AIConnectionManager;
  private router: AIRouter;

  constructor(connectionManager: AIConnectionManager, router: AIRouter) {
    this.connectionManager = connectionManager;
    this.router = router;
  }

  // Processa uma pergunta acionando múltiplos especialistas em série para respostas de alta complexidade
  async processComposite(organizationId: string, prompt: string, systemInstruction?: string): Promise<string> {
    const cleanPrompt = prompt.toLowerCase();

    // Determina se de fato a complexidade requer inteligência composta
    const isCompositeNeeded = 
      cleanPrompt.includes("edital") || 
      cleanPrompt.includes("estratégia") || 
      cleanPrompt.includes("analise") || 
      cleanPrompt.includes("relatório técnico") ||
      cleanPrompt.includes("plano") ||
      cleanPrompt.includes("composto") ||
      cleanPrompt.includes("composta") ||
      cleanPrompt.includes("estratégico");

    if (!isCompositeNeeded) {
      const routingRes = await this.router.generate(organizationId, prompt, systemInstruction);
      return routingRes.response;
    }

    try {
      console.log("[CompositeReasoningEngine] Iniciando Inteligência Composta para demanda complexa...");

      // Etapa 1: Leitura de documento e Interpretação -> Claude
      const interpretationPrompt = `Como especialista em interpretação, analise a seguinte demanda do usuário e faça uma extração limpa dos pontos principais relevantes:\n\n"${prompt}"\n\nRetorne apenas a interpretação e dores identificadas.`;
      const interpretationRes = await this.router.generate(organizationId, interpretationPrompt, "Você é a Beta cognitivamente analítica.", { provider: "CLAUDE" });
      const interpretationResult = interpretationRes.response;

      // Etapa 2: Formulação do Plano Técnico -> GPT / OpenAI
      const planningPrompt = `Baseando-se na seguinte análise interpretativa estruturada:\n\n${interpretationResult}\n\nE no contexto geral: "${prompt}"\n\nFormule a melhor estratégia de execução prática e planos técnicos, com foco em entrega e robustez.`;
      const planningRes = await this.router.generate(organizationId, planningPrompt, "Você é a Beta cognitivamente planejadora.", { provider: "OPENAI" });
      const planningResult = planningRes.response;

      // Etapa 3: Consolidação da Resposta Final pela Beta (provedor padrão, roteador automático ou modo local)
      const consolidationPrompt = `Aja estritamente como a Beta, um Sistema Operacional de Inteligência altamente corporativo e unificado. 
Abaixo estão os relatórios de inteligência dos seus especialistas conectados em segundo plano. Consolide todas as informações de forma brilhante, fluida, executiva e altamente autônoma.
IMPORTANTE: Nunca mencione GPT, Claude, OpenAI ou os especialistas de IA que alimentaram este relatório. A resposta completa deve ser atribuída exclusivamente a você, a Beta.

[Resumo Técnico Dos Especialistas]:
${interpretationResult}

[Plano Estratégico Estruturado]:
${planningResult}

Responda agora como a Beta de forma amigável, polida e unificada.`;

      const finalConsolidatedResult = await this.router.generate(organizationId, consolidationPrompt, systemInstruction);
      return finalConsolidatedResult.response;
    } catch (e) {
      console.warn("Inteligência Composta falhou (usando fallback de etapa única):", e);
      const routingRes = await this.router.generate(organizationId, prompt, systemInstruction);
      return routingRes.response;
    }
  }
}
