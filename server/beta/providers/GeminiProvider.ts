import { GoogleGenAI } from "@google/genai";
import { BaseProvider } from "./BaseProvider";

export class GeminiProvider implements BaseProvider {
  private client: GoogleGenAI | null = null;
  private model: string = "gemini-3.5-flash";

  async initialize(apiKey: string, baseUrl?: string, model?: string): Promise<void> {
    this.client = new GoogleGenAI({
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    if (model) {
      this.model = model;
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    if (!this.client) return { ok: false, latency: 9999 };
    const start = Date.now();
    try {
      await this.client.models.generateContent({
        model: this.model,
        contents: "healthcheck",
        config: { maxOutputTokens: 5 }
      });
      return { ok: true, latency: Date.now() - start };
    } catch (e) {
      return { ok: false, latency: Date.now() - start };
    }
  }

  async generate(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.client) throw new Error("Gemini client not initialized");
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined
    });
    return response.text || "";
  }

  async stream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string> {
    if (!this.client) throw new Error("Gemini client not initialized");
    const responseStream = await this.client.models.generateContentStream({
      model: this.model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined
    });
    let fullText = "";
    for await (const chunk of responseStream) {
      const txt = chunk.text || "";
      fullText += txt;
      if (onChunk) onChunk(txt);
    }
    return fullText;
  }

  async getModels(): Promise<string[]> {
    return [
      "gemini-3.5-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash-image"
    ];
  }
}
