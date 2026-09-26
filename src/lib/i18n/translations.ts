export type Language = "en" | "zh-TW";

export interface Messages {
  "site.title": string;

  "header.languageAria": string;
  "header.themeAria": string;
  "header.toLight": string;
  "header.toDark": string;
  "header.githubAria": string;
  "header.githubReservedAria": string;
  "header.githubTooltip": string;
  "header.githubComingSoon": string;
  "header.settingsAria": string;
  "header.settingsTooltip": string;

  "common.cancel": string;
  "common.copy": string;
  "common.copied": string;
  "common.clear": string;
  "common.chars": string;
  "common.autoDetect": string;

  "page.insecureAlert": string;
  "page.unsupportedAlert": string;
  "page.sourceLangAria": string;
  "page.swapTooltip": string;
  "page.swapAria": string;
  "page.inputPlaceholder": string;
  "page.sourceTextAria": string;
  "page.copySource": string;
  "page.clearAria": string;
  "page.targetLangAria": string;
  "page.outputPlaceholderWebgpu": string;
  "page.outputPlaceholderLlama": string;
  "page.outputTextAria": string;
  "page.noModelShort": string;
  "page.chooseModel": string;
  "page.copyOutput": string;
  "page.translate": string;
  "page.noModelLong": string;
  "page.cancelled": string;
  "page.footerWebgpu": string;
  "page.footerLlama": string;
  "page.privacy": string;

  "chip.checking": string;
  "chip.notSecure": string;
  "chip.unavailable": string;
  "chip.notDownloaded": string;
  "chip.ready": string;
  "chip.llamaLocal": string;

  "hint.noDevice": string;
  "hint.secureContext": string;
  "hint.notDownloaded": string;
  "hint.outOfMemory": string;
  "hint.llamaUnreachable": string;

  "settings.title": string;
  "settings.closeAria": string;
  "settings.tabInference": string;
  "settings.tabGeneral": string;
  "settings.backend": string;
  "settings.backendWebgpu": string;
  "settings.backendLlama": string;
  "settings.webgpuModelAria": string;
  "settings.downloadedChip": string;
  "settings.notDownloadedChip": string;
  "settings.cancelDownload": string;
  "settings.downloaded": string;
  "settings.downloadModel": string;
  "settings.clearing": string;
  "settings.clearCached": string;
  "settings.systemPromptLabel": string;
  "settings.systemPromptPlaceholder": string;
  "settings.systemPromptTgHelper": string;
  "settings.systemPromptWebgpuHelper": string;
  "settings.systemPromptLlamaHelper": string;

  "provider.server": string;
  "provider.serverHelper": string;
  "provider.model": string;
  "provider.modelPlaceholder": string;
  "provider.detecting": string;
  "provider.detect": string;
  "provider.enterUrlFirst": string;
  "provider.noModels": string;
  "provider.apiKey": string;
  "provider.apiKeyPlaceholder": string;
  "provider.preset": string;
  "provider.testing": string;
  "provider.test": string;
  "provider.connectedModels": string;
  "provider.connectedEmpty": string;
  "provider.corsHint": string;

  "general.uiLanguage": string;
  "general.defaultSource": string;
  "general.defaultTarget": string;
  "general.diagnostics": string;
  "general.diagnosticsHelper": string;

  "activity.title": string;
  "activity.empty": string;
}

export const SUPPORTED_LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: "zh-TW", label: "繁體中文" },
  { id: "en", label: "English" },
];

export const translations: Record<Language, Messages> = {
  en: {
    "site.title": "Translate",

    "header.languageAria": "UI language",
    "header.themeAria": "Toggle theme",
    "header.toLight": "Switch to light mode",
    "header.toDark": "Switch to dark mode",
    "header.githubAria": "GitHub repository",
    "header.githubReservedAria": "GitHub repository (reserved)",
    "header.githubTooltip": "GitHub",
    "header.githubComingSoon": "GitHub repository — coming soon",
    "header.settingsAria": "Settings",
    "header.settingsTooltip": "Settings",

    "common.cancel": "Cancel",
    "common.copy": "Copy",
    "common.copied": "Copied",
    "common.clear": "Clear",
    "common.chars": "{n} chars",
    "common.autoDetect": "auto-detect",

    "page.insecureAlert":
      "WebGPU needs a secure context — open over https:// or http://localhost.",
    "page.unsupportedAlert":
      "WebGPU is not available in this browser. Use a recent Chrome/Edge/Chromium build with WebGPU enabled, or switch the backend to llama-server in Settings.",
    "page.sourceLangAria": "Source language",
    "page.swapTooltip": "Swap languages (moves the result into the source box)",
    "page.swapAria": "Swap languages",
    "page.inputPlaceholder": "Type or paste text to translate…",
    "page.sourceTextAria": "Source text",
    "page.copySource": "Copy source",
    "page.clearAria": "Clear",
    "page.targetLangAria": "Target language",
    "page.outputPlaceholderWebgpu": "Translation appears here (editable).",
    "page.outputPlaceholderLlama":
      "Translation appears here (editable) — sent to your llama-server.",
    "page.outputTextAria": "Translated text",
    "page.noModelShort": "No model downloaded in this browser yet.",
    "page.chooseModel": "Choose & download a model in Settings",
    "page.copyOutput": "Copy translation",
    "page.translate": "Translate",
    "page.noModelLong":
      "No model downloaded in this browser yet. Open Settings (Inference tab) and download the model first.",
    "page.cancelled": "Cancelled.",
    "page.footerWebgpu": "{model} · WebGPU (in-browser)",
    "page.footerLlama": "llama-server · {model}",
    "page.privacy": "nothing leaves this device",

    "chip.checking": "checking WebGPU…",
    "chip.notSecure": "NOT a secure context",
    "chip.unavailable": "WebGPU unavailable",
    "chip.notDownloaded": "model not downloaded",
    "chip.ready": "WebGPU ready",
    "chip.llamaLocal": "llama-server (local)",

    "hint.noDevice":
      "This browser has no WebGPU device. Use a recent Chrome/Edge/Chromium build, enable WebGPU if it is disabled, or switch the backend to llama-server in Settings.",
    "hint.secureContext":
      "WebGPU requires a secure context — open the app over HTTPS or http://localhost, not plain http over the LAN.",
    "hint.notDownloaded":
      "The model is not fully downloaded in this browser — open Settings (Inference tab) and download it there first.",
    "hint.outOfMemory":
      "The GPU ran out of memory for this model — open Settings (Inference tab), switch to the smaller model, or close GPU-heavy tabs and retry.",
    "hint.llamaUnreachable":
      "Could not reach llama-server — open Settings (Inference tab) and use Test connection to check the server, URL, and CORS.",

    "settings.title": "Settings",
    "settings.closeAria": "Close settings",
    "settings.tabInference": "Inference",
    "settings.tabGeneral": "General",
    "settings.backend": "Backend",
    "settings.backendWebgpu": "WebGPU (in-browser)",
    "settings.backendLlama": "llama-server (local)",
    "settings.webgpuModelAria": "WebGPU model",
    "settings.downloadedChip": "downloaded · {bytes}",
    "settings.notDownloadedChip": "not downloaded",
    "settings.cancelDownload": "Cancel download",
    "settings.downloaded": "Downloaded",
    "settings.downloadModel": "Download model",
    "settings.clearing": "Clearing…",
    "settings.clearCached": "Clear cached model",
    "settings.systemPromptLabel": "Custom system prompt",
    "settings.systemPromptPlaceholder": "optional — e.g. terminology, style, persona",
    "settings.systemPromptTgHelper":
      "this model's chat template does not accept system messages",
    "settings.systemPromptWebgpuHelper":
      "added as a system message — the official task instruction is kept",
    "settings.systemPromptLlamaHelper":
      "hy-mt2: added as a system message (task instruction kept) · generic: replaces the default instruction",

    "provider.server": "Server",
    "provider.serverHelper":
      "host:port of your llama-server — the /v1 prefix is added automatically",
    "provider.model": "Model",
    "provider.modelPlaceholder":
      "preset name or model id from /v1/models (blank = auto-detect)",
    "provider.detecting": "Detecting…",
    "provider.detect": "Detect models",
    "provider.enterUrlFirst": "Enter the server URL first",
    "provider.noModels": "Connected, but no models are exposed (empty list).",
    "provider.apiKey": "API Key",
    "provider.apiKeyPlaceholder": "only if llama-server was started with --api-key",
    "provider.preset": "Prompt preset",
    "provider.testing": "Testing…",
    "provider.test": "Test connection",
    "provider.connectedModels": "Connected — models: {list}",
    "provider.connectedEmpty":
      "Connected, but no models are exposed (GET /v1/models returned an empty list).",
    "provider.corsHint":
      "— check the server is running and reachable; if it runs on another machine, make sure CORS is configured (start llama-server with --cors-origins '*').",

    "general.uiLanguage": "UI language",
    "general.defaultSource": "Default source language",
    "general.defaultTarget": "Default target language",
    "general.diagnostics": "Diagnostics",
    "general.diagnosticsHelper":
      "Show the live activity log (stages, fetches, errors) on the main page",

    "activity.title":
      "diagnostics — stages + fetches (requests without a ← line are still pending)",
    "activity.empty": "no entries yet",
  },

  "zh-TW": {
    "site.title": "Translate",

    "header.languageAria": "介面語言",
    "header.themeAria": "切換主題",
    "header.toLight": "切換為明亮模式",
    "header.toDark": "切換為深色模式",
    "header.githubAria": "GitHub 儲存庫",
    "header.githubReservedAria": "GitHub 儲存庫（預留）",
    "header.githubTooltip": "GitHub",
    "header.githubComingSoon": "GitHub 儲存庫 — 即將推出",
    "header.settingsAria": "設定",
    "header.settingsTooltip": "設定",

    "common.cancel": "取消",
    "common.copy": "複製",
    "common.copied": "已複製",
    "common.clear": "清除",
    "common.chars": "{n} 字元",
    "common.autoDetect": "自動偵測",

    "page.insecureAlert":
      "WebGPU 需要安全情境——請以 https:// 或 http://localhost 開啟。",
    "page.unsupportedAlert":
      "此瀏覽器不支援 WebGPU。請使用啟用 WebGPU 的較新版本 Chrome/Edge/Chromium，或在設定中改用 llama-server 後端。",
    "page.sourceLangAria": "來源語言",
    "page.swapTooltip": "切換語言（將結果移至輸入框）",
    "page.swapAria": "切換語言",
    "page.inputPlaceholder": "輸入或貼上要翻譯的文字…",
    "page.sourceTextAria": "來源文字",
    "page.copySource": "複製來源",
    "page.clearAria": "清除",
    "page.targetLangAria": "目標語言",
    "page.outputPlaceholderWebgpu": "翻譯結果會顯示在這裡（可編輯）。",
    "page.outputPlaceholderLlama":
      "翻譯結果會顯示在這裡（可編輯）— 會傳送到你的 llama-server。",
    "page.outputTextAria": "翻譯文字",
    "page.noModelShort": "此瀏覽器尚未下載任何模型。",
    "page.chooseModel": "到設定選取並下載模型",
    "page.copyOutput": "複製翻譯",
    "page.translate": "翻譯",
    "page.noModelLong":
      "此瀏覽器尚未下載任何模型。請開啟設定（推理分頁）先下載模型。",
    "page.cancelled": "已取消。",
    "page.footerWebgpu": "{model} · WebGPU（瀏覽器內）",
    "page.footerLlama": "llama-server · {model}",
    "page.privacy": "資料不會離開此裝置",

    "chip.checking": "正在檢查 WebGPU…",
    "chip.notSecure": "非安全情境",
    "chip.unavailable": "WebGPU 不可用",
    "chip.notDownloaded": "模型尚未下載",
    "chip.ready": "WebGPU 就緒",
    "chip.llamaLocal": "llama-server（本機）",

    "hint.noDevice":
      "此瀏覽器沒有 WebGPU 裝置。請使用較新版本的 Chrome/Edge/Chromium、若已停用 WebGPU 請啟用，或在設定中改用 llama-server 後端。",
    "hint.secureContext":
      "WebGPU 需要安全情境——請以 HTTPS 或 http://localhost 開啟本應用程式，不要用區域網路的純 HTTP。",
    "hint.notDownloaded":
      "模型尚未在此瀏覽器完整下載——請開啟設定（推理分頁）先下載。",
    "hint.outOfMemory":
      "GPU 記憶體不足以執行此模型——請開啟設定（推理分頁）換較小的模型，或關閉耗用 GPU 的分頁後重試。",
    "hint.llamaUnreachable":
      "無法連線到 llama-server——請開啟設定（推理分頁）用「測試連線」檢查伺服器、URL 與 CORS。",

    "settings.title": "設定",
    "settings.closeAria": "關閉設定",
    "settings.tabInference": "推理",
    "settings.tabGeneral": "一般",
    "settings.backend": "後端",
    "settings.backendWebgpu": "WebGPU（瀏覽器內）",
    "settings.backendLlama": "llama-server（本機）",
    "settings.webgpuModelAria": "WebGPU 模型",
    "settings.downloadedChip": "已下載 · {bytes}",
    "settings.notDownloadedChip": "尚未下載",
    "settings.cancelDownload": "取消下載",
    "settings.downloaded": "已下載",
    "settings.downloadModel": "下載模型",
    "settings.clearing": "清除中…",
    "settings.clearCached": "清除快取模型",
    "settings.systemPromptLabel": "自訂系統提示詞",
    "settings.systemPromptPlaceholder": "選填——例如術語、風格、角色",
    "settings.systemPromptTgHelper": "此模型的聊天模板不接受系統訊息",
    "settings.systemPromptWebgpuHelper": "會附加為系統訊息——保留官方任務指示",
    "settings.systemPromptLlamaHelper":
      "hy-mt2：附加為系統訊息（保留任務指示）· generic：取代預設指示",

    "provider.server": "伺服器",
    "provider.serverHelper": "你 llama-server 的 host:port——會自動加上 /v1 前綴",
    "provider.model": "模型",
    "provider.modelPlaceholder": "預設名稱或 /v1/models 的模型 id（留空＝自動偵測）",
    "provider.detecting": "偵測中…",
    "provider.detect": "偵測模型",
    "provider.enterUrlFirst": "請先輸入伺服器 URL",
    "provider.noModels": "已連線，但未暴露任何模型（清單為空）。",
    "provider.apiKey": "API 金鑰",
    "provider.apiKeyPlaceholder": "僅在 llama-server 以 --api-key 啟動時需要",
    "provider.preset": "提示詞預設",
    "provider.testing": "測試中…",
    "provider.test": "測試連線",
    "provider.connectedModels": "已連線 — 模型：{list}",
    "provider.connectedEmpty": "已連線，但未暴露任何模型（GET /v1/models 回傳空清單）。",
    "provider.corsHint":
      "— 請確認伺服器正在執行且可連線；若伺服器在另一台機器上，務必設定 CORS（以 --cors-origins '*' 啟動 llama-server）。",

    "general.uiLanguage": "介面語言",
    "general.defaultSource": "預設來源語言",
    "general.defaultTarget": "預設目標語言",
    "general.diagnostics": "診斷",
    "general.diagnosticsHelper": "在主頁面顯示即時活動記錄（階段、抓取、錯誤）",

    "activity.title": "診斷 — 階段 + 抓取（沒有 ← 列的請求仍在進行中）",
    "activity.empty": "尚無記錄",
  },
};

export function normalizeLanguage(value: string): Language {
  return value === "zh-TW" ? "zh-TW" : "en";
}

export function getMessages(language: string): Messages {
  return translations[normalizeLanguage(language)];
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
