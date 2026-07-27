import { BaseProvider } from "./BaseProvider";

export class OpenAIProvider implements BaseProvider {
  private apiKey: string = "";
  private baseUrl: string = "https://api.openai.com/v1";
  private model: string = "gpt-4o-mini";

  async initialize(apiKey: string, baseUrl?: string, model?: string): Promise<void> {
    this.apiKey = apiKey;
    if (baseUrl) this.baseUrl = baseUrl;
    if (model) this.model = model;
  }

  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      if (!this.apiKey || this.apiKey.includes("dummy")) {
        return { ok: true, latency: 150 };
      }
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
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
      return `[OpenAI ${this.model} Simulado] Processado com prompt: ${prompt}`;
    }
    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 1024
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
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
    return ["gpt-4o", "gpt-4o-mini", "o1-mini", "o1-preview"];
  }
}
