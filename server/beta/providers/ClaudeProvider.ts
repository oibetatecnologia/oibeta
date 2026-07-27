import { BaseProvider } from "./BaseProvider";

export class ClaudeProvider implements BaseProvider {
  private apiKey: string = "";
  private baseUrl: string = "https://api.anthropic.com/v1";
  private model: string = "claude-3-5-sonnet-latest";

  async initialize(apiKey: string, baseUrl?: string, model?: string): Promise<void> {
    this.apiKey = apiKey;
    if (baseUrl) this.baseUrl = baseUrl;
    if (model) this.model = model;
  }

  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      if (!this.apiKey || this.apiKey.includes("dummy")) {
        return { ok: true, latency: 180 };
      }
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5
        })
      });
      return { ok: response.ok, latency: Date.now() - start };
    } catch (e) {
      return { ok: false, latency: Date.now() - start };
    }
  }

  async generate(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey || this.apiKey.includes("dummy")) {
      return `[Claude ${this.model} Simulado] Processado com prompt: ${prompt}`;
    }
    const body: any = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024
    };
    if (systemInstruction) {
      body.system = systemInstruction;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text || "";
  }

  async stream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
    const response = await this.generate(prompt, systemInstruction);
    if (onChunk) {
      const chunks = response.split(" ");
      for (const chunk of chunks) {
        onChunk(chunk + " ");
        await new Promise(r => setTimeout(r, 20));
      }
    }
    return response;
  }

  async getModels(): Promise<string[]> {
    return [
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-opus-20240229"
    ];
  }
}
