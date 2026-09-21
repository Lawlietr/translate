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
}

export interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "url" | "password";
  required: boolean;
  placeholder?: string;
  helperText?: string;
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
