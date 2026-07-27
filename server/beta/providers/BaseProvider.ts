export interface BaseProvider {
  initialize(apiKey: string, baseUrl?: string, model?: string): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; latency: number }>;
  generate(prompt: string, systemInstruction?: string): Promise<string>;
  stream(prompt: string, systemInstruction?: string, onChunk?: (chunk: string) => void): Promise<string>;
  getModels(): Promise<string[]>;
}
