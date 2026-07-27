import { AIConnectionManager } from "./AIConnectionManager";
import { decrypt } from "./providers/CryptoHelper";

export class AIHealthMonitor {
  private connectionManager: AIConnectionManager;

  constructor(connectionManager: AIConnectionManager) {
    this.connectionManager = connectionManager;
  }

  // Faz auditoria completa de saúde em todas as conexões cadastradas
  async checkAllConnections(organizationId: string): Promise<any[]> {
    const connections = await this.connectionManager.getConnections(organizationId);
    const healthReports = [];

    for (const conn of connections) {
      const ping = await this.connectionManager.testConnection(conn);
      healthReports.push({
        id: conn.id,
        provider: conn.provider,
        connectionName: conn.connectionName,
        status: ping.ok ? "online" : "offline",
        latency: ping.latency,
        availability: ping.ok ? "100%" : "0%"
      });
    }

    // Se não houver nenhuma cadastrada, retorna um report de Modo Local autônomo offline
    if (healthReports.length === 0) {
      healthReports.push({
        id: "local_contingency",
        provider: "LOCAL",
        connectionName: "Beta Contingência Local (Autônomo)",
        status: "online",
        latency: 5,
        availability: "100%"
      });
    }

    return healthReports;
  }

  // Define a fila ordenada de substitutos saudáveis caso um especialista caia
  getFallbackQueue(primaryProvider: string): string[] {
    const defaultQueue = ["OPENAI", "CLAUDE", "GROQ", "OPENROUTER", "OLLAMA", "LOCAL"];
    return defaultQueue.filter(p => p !== primaryProvider.toUpperCase());
  }

  // Executa conclusão resiliente em cascata navegando na fila de backup
  async generateWithResilience(
    organizationId: string, 
    primaryProvider: string, 
    prompt: string, 
    systemInstruction?: string
  ): Promise<{ response: string; usedProvider: string }> {
    const fallbackQueue = [primaryProvider.toUpperCase(), ...this.getFallbackQueue(primaryProvider)];

    console.log(`[AIHealthMonitor] Fila de contingência ativa: ${fallbackQueue.join(" -> ")}`);

    for (const providerName of fallbackQueue) {
      if (providerName === "LOCAL") {
        return {
          response: `[Beta Modo Local] Processando demanda offline.\nEu sou a Beta e continuo ativa sem IA externa conectada. Suas metas, decisões e knowledge graph estão seguros localmente em meu banco cognitivo.`,
          usedProvider: "LOCAL"
        };
      }

      const connection = await this.connectionManager.getConnectionByProvider(organizationId, providerName);
      if (!connection) {
        continue;
      }

      try {
        const instance = this.connectionManager.getProviderInstance(connection.provider);
        const rawApiKey = connection.apiKeyEncrypted ? decrypt(connection.apiKeyEncrypted) : "";

        await instance.initialize(rawApiKey, connection.baseUrl || undefined, connection.model || undefined);
        const health = await instance.healthCheck();
        
        if (!health.ok) {
          console.warn(`[AIHealthMonitor] Provedor ${providerName} falhou na checagem. Próximo backup.`);
          continue;
        }

        const response = await instance.generate(prompt, systemInstruction);
        return { response, usedProvider: providerName };
      } catch (e) {
        console.warn(`[AIHealthMonitor] Falha no provedor ${providerName}: ${(e as Error).message}. Substituindo...`);
      }
    }

    return {
      response: `[Beta Modo Local] Todas as conexões externas de inteligências falharam ou estão offline no momento. Ativei meu modo local, seus dados de memória e projetos estão resguardados localmente conosco.`,
      usedProvider: "LOCAL"
    };
  }
}
