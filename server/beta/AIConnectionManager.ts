import { DatabaseAdapter } from "../database/DatabaseAdapter";
import { encrypt, decrypt } from "./providers/CryptoHelper";
import { GeminiProvider } from "./providers/GeminiProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { ClaudeProvider } from "./providers/ClaudeProvider";
import { GroqProvider } from "./providers/GroqProvider";
import { OpenRouterProvider } from "./providers/OpenRouterProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { CustomProvider } from "./providers/CustomProvider";
import { BaseProvider } from "./providers/BaseProvider";

export class AIConnectionManager {
  public db: DatabaseAdapter;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  // Obter instância do provedor adequado
  getProviderInstance(provider: string): BaseProvider {
    const p = provider.toUpperCase();
    switch (p) {
      case "GEMINI":
        return new GeminiProvider();
      case "OPENAI":
        return new OpenAIProvider();
      case "CLAUDE":
        return new ClaudeProvider();
      case "GROQ":
        return new GroqProvider();
      case "OPENROUTER":
        return new OpenRouterProvider();
      case "OLLAMA":
        return new OllamaProvider();
      case "LM_STUDIO":
      case "CUSTOM":
        return new CustomProvider();
      default:
        return new CustomProvider();
    }
  }

  // Registrar ou atualizar uma conexão
  async registerConnection(organizationId: string, userId: string, data: {
    provider: string;
    connectionName: string;
    apiKey: string;
    baseUrl?: string;
    model?: string;
    isDefault?: boolean;
  }): Promise<any> {
    const encryptedKey = encrypt(data.apiKey);
    const connectionPayload = {
      organizationId,
      userId,
      provider: data.provider.toUpperCase(),
      connectionName: data.connectionName,
      apiKeyEncrypted: encryptedKey,
      baseUrl: data.baseUrl || null,
      model: data.model || null,
      status: "active",
      isDefault: !!data.isDefault
    };

    // Salvar no BD
    const created = await this.db.createAIConnection(connectionPayload);
    return created;
  }

  // Listar todas as conexões de uma organização
  async getConnections(organizationId: string): Promise<any[]> {
    const connections = await this.db.getAIConnections(organizationId);
    return connections.map(conn => ({
      ...conn,
      // Não expor a chave descriptografada por completo nas listagens
      apiKeyMasked: conn.apiKeyEncrypted ? "••••••••••••••••" : ""
    }));
  }

  // Obter conexão ativa ou padrão por provider
  async getConnectionByProvider(organizationId: string, provider: string): Promise<any | null> {
    const connections = await this.db.getAIConnections(organizationId);
    const match = connections.find(c => c.provider.toUpperCase() === provider.toUpperCase() && c.status === "active");
    return match || null;
  }

  // Obter conexão padrão geral
  async getDefaultConnection(organizationId: string): Promise<any | null> {
    const connections = await this.db.getAIConnections(organizationId);
    const defaultConn = connections.find(c => c.isDefault && c.status === "active");
    if (defaultConn) return defaultConn;
    // Se não houver padrão explicitamente marcado, retorna a primeira ativa
    return connections.find(c => c.status === "active") || null;
  }

  // Testar disponibilidade de uma conexão
  async testConnection(conn: any): Promise<{ ok: boolean; latency: number }> {
    try {
      const provider = this.getProviderInstance(conn.provider);
      const rawApiKey = decrypt(conn.apiKeyEncrypted);
      await provider.initialize(rawApiKey, conn.baseUrl || undefined, conn.model || undefined);
      return await provider.healthCheck();
    } catch (e) {
      console.error("Error testing AI connection:", e);
      return { ok: false, latency: 9999 };
    }
  }

  // Listar modelos por provedor
  async listAvailableModels(provider: string): Promise<string[]> {
    const instance = this.getProviderInstance(provider);
    return await instance.getModels();
  }
}
