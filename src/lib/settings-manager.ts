import { DEFAULT_WEBGPU_MODEL, WEBGPU_MODELS } from "./model-catalog";

export type Backend = "webgpu" | "llama-server";

export type UILanguage = "zh-TW" | "en";

export interface LlamaServerConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AppSettings {
  backend: Backend;
  webgpuModelId: string;
  llamaServerConfig: LlamaServerConfig;
  language: UILanguage;
  defaultSourceLang: string;
  defaultTargetLang: string;
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
    },
    language: "zh-TW",
    defaultSourceLang: "zh-TW",
    defaultTargetLang: "en",
  };
}

function normalizeBackend(value: unknown): Backend {
  return value === "llama-server" ? "llama-server" : "webgpu";
}

function normalizeLanguage(value: unknown): UILanguage {
  return value === "en" ? "en" : "zh-TW";
}

function normalizeModelId(value: unknown): string {
  return WEBGPU_MODELS.some((m) => m.id === value) ? (value as string) : DEFAULT_WEBGPU_MODEL;
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
      language: normalizeLanguage(parsed.language),
      llamaServerConfig: {
        ...defaults.llamaServerConfig,
        ...(parsed.llamaServerConfig ?? {}),
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
