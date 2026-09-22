import type {
  AIProvider,
  ProviderConfig,
  ProviderConfigField,
  TranslationRequest,
  TranslationResponse,
} from "./types";
import { buildMessages, resolveProfile } from "../prompt-profiles";
import { toTraditionalChinese } from "../zh-variant";

const DEFAULT_BASE_URL = "http://localhost:8080";
const CONNECT_TIMEOUT_MS = 10_000;
const INFER_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_TOKENS_HARD_CAP = 2048;

export function normalizeBaseUrl(baseUrl: string): string {
  let base = baseUrl.trim().replace(/\/+$/, "");
  if (!base) base = DEFAULT_BASE_URL;
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
  if (!/\/v1$/i.test(base)) base += "/v1";
  return base;
}

export function estimateMaxTokens(text: string): number {
  return Math.min(MAX_TOKENS_HARD_CAP, Math.max(256, Math.ceil(text.length) + 256));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = CONNECT_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs
  );
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function authHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function safeBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return response.statusText;
  }
}

export async function fetchAvailableModels(
  baseUrl: string = DEFAULT_BASE_URL,
  apiKey?: string
): Promise<string[]> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(baseUrl)}/models`,
    { headers: authHeaders(apiKey) }
  );
  if (!response.ok) {
    throw new Error(`llama-server responded ${response.status}: ${await safeBody(response)}`);
  }
  const data = (await response.json()) as { data?: Array<{ id: string }> };
  return (data.data ?? []).map((m) => m.id);
}

async function chatCompletion(
  baseUrl: string,
  model: string,
  request: TranslationRequest,
  preset: ProviderConfig["modelPreset"],
  apiKey: string | undefined,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetchWithTimeout(
    `${normalizeBaseUrl(baseUrl)}/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
      body: JSON.stringify({
        model,
        messages: buildMessages(resolveProfile(model, preset), request),
        max_tokens: estimateMaxTokens(request.text),
        temperature: 0,
        chat_template_kwargs: { enable_thinking: false },
      }),
    },
    INFER_TIMEOUT_MS,
    signal
  );

  if (!response.ok) {
    throw new Error(`llama-server responded ${response.status}: ${await safeBody(response)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string; reasoning_content?: string };
      finish_reason?: string;
    }>;
    usage?: { completion_tokens?: number };
  };
  const choice = data.choices?.[0];
  let content = choice?.message?.content ?? "";
  if (!content.trim()) content = choice?.message?.reasoning_content ?? "";
  if (!content.trim()) {
    throw new Error(
      `llama-server returned no content (finish_reason: ${choice?.finish_reason ?? "?"}, ` +
        `${data.usage?.completion_tokens ?? "?"} tokens). If this is a "thinking" model ` +
        `its reasoning may have exhausted the token budget; try a non-thinking model.`
    );
  }
  return content;
}

const CONFIG_SCHEMA: ProviderConfigField[] = [
  {
    key: "baseUrl",
    label: "Server",
    type: "url",
    required: true,
    placeholder: "http://<your-llama-server-host>:8080",
    helperText: "host:port of your llama-server — the /v1 prefix is added automatically",
  },
  {
    key: "model",
    label: "Model",
    type: "text",
    required: false,
    placeholder: "preset name or model id from /v1/models (blank = auto-detect)",
  },
  {
    key: "apiKey",
    label: "API Key",
    type: "password",
    required: false,
    placeholder: "only if llama-server was started with --api-key",
  },
  {
    key: "modelPreset",
    label: "Prompt preset",
    type: "select",
    required: false,
    options: ["auto", "hy-mt2", "translategemma", "generic"],
    helperText:
      "how to format requests for the loaded model — auto-detect from the model id, override for renamed/repacked files",
  },
];

export const llamaServerProvider: AIProvider = {
  id: "llama-server",
  name: "llama-server (local)",
  enabled: true,
  configSchema: CONFIG_SCHEMA,

  async translate(
    request: TranslationRequest,
    config: ProviderConfig,
    signal?: AbortSignal
  ): Promise<TranslationResponse> {
    const started = Date.now();
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    let model = config.model ?? "";
    if (!model) {
      const models = await fetchAvailableModels(baseUrl, config.apiKey);
      if (models.length === 0) {
        throw new Error(
          "llama-server is reachable but exposes no models (GET /v1/models returned an empty list)."
        );
      }
      model = models[0];
    }
    const content = await chatCompletion(
      baseUrl,
      model,
      request,
      config.modelPreset,
      config.apiKey,
      signal
    );
    return {
      text: toTraditionalChinese(content, request.targetLang),
      latencyMs: Date.now() - started,
    };
  },

  async testConnection(config: ProviderConfig): Promise<boolean> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    try {
      const response = await fetchWithTimeout(
        `${normalizeBaseUrl(baseUrl)}/models`,
        { headers: authHeaders(config.apiKey) }
      );
      return response.ok;
    } catch {
      return false;
    }
  },
};
