import type { ModelPreset } from "../prompt-profiles";

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationResponse {
  text: string;
  latencyMs: number;
}

export interface ProviderConfig {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  modelPreset?: ModelPreset;
  systemPrompt?: string;
  onStatus?: (status: string) => void;
}

export interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "url" | "password" | "select" | "multiline";
  required: boolean;
  placeholder?: string;
  helperText?: string;
  options?: string[];
}

export interface AIProvider {
  id: string;
  name: string;
  enabled: boolean;
  configSchema: ProviderConfigField[];
  translate(
    request: TranslationRequest,
    config: ProviderConfig,
    signal?: AbortSignal
  ): Promise<TranslationResponse>;
  testConnection(config: ProviderConfig): Promise<boolean>;
}
