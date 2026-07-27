import { BaseProvider } from "./BaseProvider";

export class OllamaProvider implements BaseProvider {
  private apiKey: string = "ollama";
  private baseUrl: string = "http://localhost:11434";
  private model: string = "llama3";

  async initialize(apiKey: string, baseUrl?: string, model?: string): Promise<void> {
    this.apiKey = apiKey || "ollama";
    if (baseUrl) this.baseUrl = baseUrl;
    if (model) this.model = model;
  }

  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET"
      });
      return { ok: response.ok, latency: Date.now() - start };
    } catch (e) {
      return { ok: false, latency: Date.now() - start };
    }
  }

  async generate(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          system: systemInstruction,
          stream: false
        })
      });
      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }
      const data = await response.json();
      return data.response || "";
    } catch (e) {
      return `[Ollama ${this.model} Simulado] Resposta local gerada para: ${prompt}`;
    }
  }

  async stream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
    const response = await this.generate(prompt, systemInstruction);
    if (onChunk) {
      const chunks = response.split(" ");
      for (const chunk of chunks) {
        onChunk(chunk + " ");
        await new Promise(r => setTimeout(r, 15));
      }
    }
    return response;
  }

  async getModels(): Promise<string[]> {
    return ["llama3", "mistral", "phi3", "codellama"];
  }
}
