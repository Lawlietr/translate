import { normalizeLanguage as normalizeUILanguage, type Language } from "./i18n/translations";
import { DEFAULT_WEBGPU_MODEL, WEBGPU_MODELS } from "./model-catalog";
import { normalizeModelPreset, type ModelPreset } from "./prompt-profiles";

export type Backend = "webgpu" | "llama-server";

export type UILanguage = Language;

export interface LlamaServerConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  modelPreset: ModelPreset;
  systemPrompt: string;
}

export interface AppSettings {
  backend: Backend;
  webgpuModelId: string;
  llamaServerConfig: LlamaServerConfig;
  webgpuSystemPrompt: string;
  language: UILanguage;
  defaultSourceLang: string;
  defaultTargetLang: string;
  historyDisabled: boolean;
  diagnostics: boolean;
}

const STORAGE_KEY = "translate:settings";

export function defaultSettings(): AppSettings {
  return {
    backend: "webgpu",
    webgpuModelId: DEFAULT_WEBGPU_MODEL,
    llamaServerConfig: {
      baseUrl: "http://localhost:8080",
      model: "",
      apiKey: "",
      modelPreset: "auto",
      systemPrompt: "",
    },
    webgpuSystemPrompt: "",
    language: "zh-TW",
    defaultSourceLang: "zh-TW",
    defaultTargetLang: "en",
    historyDisabled: false,
    diagnostics: false,
  };
}

function normalizeBackend(value: unknown): Backend {
  return value === "llama-server" ? "llama-server" : "webgpu";
}

function normalizeLanguage(value: unknown): UILanguage {
  return normalizeUILanguage(typeof value === "string" ? value : "");
}

function normalizeModelId(value: unknown): string {
  return WEBGPU_MODELS.some((m) => m.id === value) ? (value as string) : DEFAULT_WEBGPU_MODEL;
}

function normalizeLlamaServerConfig(
  value: unknown
): Partial<LlamaServerConfig> {
  if (!value || typeof value !== "object") return {};
  const parsed = value as Partial<LlamaServerConfig>;
  const normalized: Partial<LlamaServerConfig> = { ...parsed };
  if ("modelPreset" in parsed) {
    normalized.modelPreset = normalizeModelPreset(parsed.modelPreset);
  }
  if ("systemPrompt" in parsed) {
    normalized.systemPrompt =
      typeof parsed.systemPrompt === "string" ? parsed.systemPrompt : "";
  }
  return normalized;
}

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const defaults = defaultSettings();
    const merged: AppSettings = {
      ...defaults,
      ...parsed,
      backend: normalizeBackend(parsed.backend),
      webgpuModelId: normalizeModelId(parsed.webgpuModelId),
      webgpuSystemPrompt:
        typeof parsed.webgpuSystemPrompt === "string"
          ? parsed.webgpuSystemPrompt
          : "",
      language: normalizeLanguage(parsed.language),
      historyDisabled: parsed.historyDisabled === true,
      diagnostics: parsed.diagnostics === true,
      llamaServerConfig: {
        ...defaults.llamaServerConfig,
        ...normalizeLlamaServerConfig(parsed.llamaServerConfig),
      },
    };
    return merged;
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota / privacy-mode errors
  }
}
