export type Language = "en" | "zh-TW" | "ja" | "ko";

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
    "footer.license": string;
  "footer.privacy": string;
  "header.settingsTooltip": string;

  "common.cancel": string;
  "common.copy": string;
  "common.copied": string;
  "common.clear": string;
  "common.chars": string;
  "common.autoDetect": string;
  "common.retry": string;

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
  "settings.tabModel": string;
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
  "general.privacy": string;
  "general.neverRecord": string;
  "general.neverRecordHelper": string;
  "general.deleteAllHistory": string;
  "general.diagnostics": string;
  "general.diagnosticsHelper": string;

  "tts.title": string;
  "tts.toggle": string;
  "tts.toggleHelper": string;
  "tts.engine": string;
  "tts.engineWebSpeech": string;
  "tts.engineKokoro": string;
  "tts.voice": string;
  "tts.voiceAuto": string;
  "tts.noVoices": string;
  "tts.kokoroVoice": string;
  "tts.kokoroDownload": string;
  "tts.kokoroDownloaded": string;
  "tts.kokoroNotDownloaded": string;
  "tts.kokoroClear": string;
  "page.speakInput": string;
  "page.speakOutput": string;
  "page.stopSpeak": string;

  "activity.title": string;
  "activity.empty": string;

  "history.button": string;
  "history.title": string;
  "history.empty": string;
  "history.close": string;
  "history.select": string;
  "history.deleteSelected": string;
  "history.cancelSelect": string;
  "history.clearAll": string;
  "history.confirmClearTitle": string;
  "history.confirmClearBody": string;
  "history.deleteEntry": string;

  "landing.checking": string;
  "landing.tagline": string;
  "landing.title": string;
  "landing.subtitle": string;
  "landing.cardModel": string;
  "landing.cardSize": string;
  "landing.cardPrivacy": string;
  "landing.privacyValue": string;
  "landing.download": string;
  "landing.load": string;
  "landing.ready": string;
  "landing.downloading": string;
  "landing.done": string;
  "landing.warming": string;
  "landing.useLlamaServer": string;
  "landing.chooseModel": string;
  "landing.webgpuUnavailable": string;
  "landing.footerWeights": string;
  "landing.footerBuiltWithPrefix": string;
  "landing.footerBuiltWithSuffix": string;
}

export const SUPPORTED_LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: "zh-TW", label: "繁體中文" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
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
"footer.license": "Released under",
    "footer.privacy": "All inference runs locally in your browser — your text never leaves your device.",

    "common.cancel": "Cancel",
    "common.copy": "Copy",
    "common.copied": "Copied",
    "common.clear": "Clear",
    "common.chars": "{n} chars",
    "common.autoDetect": "auto-detect",
    "common.retry": "Retry",

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
    "settings.tabModel": "Model",
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
    "general.privacy": "Privacy",
    "general.neverRecord": "Never record",
    "general.neverRecordHelper":
      "Stops new entries. Existing history stays until you delete it manually.",
    "general.deleteAllHistory": "Delete all history ({n})",
    "general.diagnostics": "Diagnostics",
    "general.diagnosticsHelper":
      "Show the live activity log (stages, fetches, errors) on the main page",

    "tts.title": "TTS Read-aloud",
    "tts.toggle": "Enable read-aloud",
    "tts.toggleHelper":
      "Speaks the input or output using voices built into your device or a local AI model. Audio never leaves your device.",
    "tts.engine": "Engine",
    "tts.engineWebSpeech": "System voices",
    "tts.engineKokoro": "Kokoro (AI model)",
    "tts.voice": "Voice",
    "tts.voiceAuto": "Automatic (match text language)",
    "tts.noVoices": "No local voices found on this system.",
    "tts.kokoroVoice": "Kokoro voice",
    "tts.kokoroDownload": "Download",
    "tts.kokoroDownloaded": "Downloaded",
    "tts.kokoroNotDownloaded": "Not downloaded",
    "tts.kokoroClear": "Clear",
    "page.speakInput": "Read input aloud",
    "page.speakOutput": "Read output aloud",
    "page.stopSpeak": "Stop read-aloud",

    "activity.title":
      "diagnostics — stages + fetches (requests without a ← line are still pending)",
    "activity.empty": "no entries yet",
    "history.button": "Translation history",
    "history.title": "Translation history",
    "history.empty": "No translation history yet",
    "history.close": "Close translation history",
    "history.select": "Select multiple",
    "history.deleteSelected": "Delete selected ({n})",
    "history.cancelSelect": "Cancel",
    "history.clearAll": "Clear all",
    "history.confirmClearTitle": "Delete all translation history?",
    "history.confirmClearBody":
      "This will permanently delete {n} entries. This cannot be undone.",
    "history.deleteEntry": "Delete this entry",

    "landing.checking": "Checking…",
    "landing.tagline": "RUNS ON YOUR GPU · NOTHING IS SENT TO A SERVER",
    "landing.title": "Translate",
    "landing.subtitle":
      "A multilingual translator that runs entirely in your browser — nothing you type ever leaves.",
    "landing.cardModel": "Model",
    "landing.cardSize": "Size",
    "landing.cardPrivacy": "Privacy",
    "landing.privacyValue": "100% local",
    "landing.download": "Download model ({size})",
    "landing.load": "Load model",
    "landing.ready": "Model ready",
    "landing.downloading": "Downloading…",
    "landing.done": "done",
    "landing.warming": "Warming up…",
    "landing.useLlamaServer": "Use llama-server instead",
    "landing.chooseModel": "Choose model",
    "landing.webgpuUnavailable":
      "This browser does not support WebGPU (or the page is not served over HTTPS) — model download is disabled. You can use llama-server instead.",
    "landing.footerWeights": "Weights:",
    "landing.footerBuiltWithPrefix": "Built with ",
    "landing.footerBuiltWithSuffix": "",
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
"footer.license": "本專案以",
    "footer.privacy": "所有推理均在你的瀏覽器本機執行,文字不會離開你的裝置。",

    "common.cancel": "取消",
    "common.copy": "複製",
    "common.copied": "已複製",
    "common.clear": "清除",
    "common.chars": "{n} 字元",
    "common.autoDetect": "自動偵測",
    "common.retry": "重試",

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
    "settings.tabModel": "模型",
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
    "general.privacy": "隱私",
    "general.neverRecord": "永不紀錄",
    "general.neverRecordHelper": "停止新增紀錄。既有紀錄會保留，直到你手動刪除。",
    "general.deleteAllHistory": "刪除所有紀錄 ({n})",
    "general.diagnostics": "診斷",
    "general.diagnosticsHelper": "在主頁面顯示即時活動記錄（階段、抓取、錯誤）",

    "tts.title": "TTS 朗讀",
    "tts.toggle": "啟用朗讀",
    "tts.toggleHelper":
      "使用裝置內建語音或本地 AI 模型朗讀輸入或輸出內容。音訊不會離開你的裝置。",
    "tts.engine": "引擎",
    "tts.engineWebSpeech": "系統語音",
    "tts.engineKokoro": "Kokoro（AI 模型）",
    "tts.voice": "語音",
    "tts.voiceAuto": "自動（依文字語言）",
    "tts.noVoices": "此系統找不到本地語音。",
    "tts.kokoroVoice": "Kokoro 語音",
    "tts.kokoroDownload": "下載",
    "tts.kokoroDownloaded": "已下載",
    "tts.kokoroNotDownloaded": "未下載",
    "tts.kokoroClear": "清除",
    "page.speakInput": "朗讀輸入內容",
    "page.speakOutput": "朗讀輸出內容",
    "page.stopSpeak": "停止朗讀",

    "activity.title": "診斷 — 階段 + 抓取（沒有 ← 列的請求仍在進行中）",
    "activity.empty": "尚無記錄",
    "history.button": "翻譯紀錄",
    "history.title": "翻譯紀錄",
    "history.empty": "尚無翻譯紀錄",
    "history.close": "關閉翻譯紀錄",
    "history.select": "多選",
    "history.deleteSelected": "刪除已選 ({n})",
    "history.cancelSelect": "取消",
    "history.clearAll": "全部刪除",
    "history.confirmClearTitle": "刪除所有翻譯紀錄？",
    "history.confirmClearBody": "將永久刪除 {n} 條紀錄，此動作無法復原。",
    "history.deleteEntry": "刪除這條紀錄",

    "landing.checking": "檢查中…",
    "landing.tagline": "在你的 GPU 上執行 · 沒有任何內容送往伺服器",
    "landing.title": "Translate",
    "landing.subtitle": "多語系翻譯器,完全在你的瀏覽器內執行——你輸入的內容絕不會離開此裝置。",
    "landing.cardModel": "模型",
    "landing.cardSize": "大小",
    "landing.cardPrivacy": "隱私",
    "landing.privacyValue": "100% 本機",
    "landing.download": "下載模型({size})",
    "landing.load": "載入模型",
    "landing.ready": "模型已就緒",
    "landing.downloading": "下載中…",
    "landing.done": "完成",
    "landing.warming": "暖機中…",
    "landing.useLlamaServer": "改用 llama-server",
    "landing.chooseModel": "選取模型",
    "landing.webgpuUnavailable":
      "此瀏覽器不支援 WebGPU(或頁面未透過 HTTPS 提供)——模型下載已停用。可改用 llama-server。",
    "landing.footerWeights": "權重:",
    "landing.footerBuiltWithPrefix": "使用 ",
    "landing.footerBuiltWithSuffix": " 打造",
  },

  ja: {
    "site.title": "Translate",

    "header.languageAria": "UI言語",
    "header.themeAria": "テーマ切替",
    "header.toLight": "ライトモードに切替",
    "header.toDark": "ダークモードに切替",
    "header.githubAria": "GitHub リポジトリ",
    "header.githubReservedAria": "GitHub リポジトリ（予約）",
    "header.githubTooltip": "GitHub",
    "header.githubComingSoon": "GitHub リポジトリ — 近日公開",
    "header.settingsAria": "設定",
    "header.settingsTooltip": "設定",
"footer.license": "本プロジェクトは",
    "footer.privacy": "すべての推論はブラウザ内でローカルに実行され、テキストはデバイスから離れません。",

    "common.cancel": "キャンセル",
    "common.copy": "コピー",
    "common.copied": "コピーしました",
    "common.clear": "クリア",
    "common.chars": "{n} 文字",
    "common.autoDetect": "自動検出",
    "common.retry": "再試行",

    "page.insecureAlert":
      "WebGPU はセキュアなコンテキストが必要です — https:// または http://localhost で開いてください。",
    "page.unsupportedAlert":
      "このブラウザは WebGPU を利用できません。WebGPU 有効の比較的新しい Chrome/Edge/Chromium を使用するか、設定でバックエンドを llama-server に切替してください。",
    "page.sourceLangAria": "元の言語",
    "page.swapTooltip": "言語を入れ替え（結果を入力欄へ移動）",
    "page.swapAria": "言語を入れ替え",
    "page.inputPlaceholder": "翻訳するテキストを入力または貼り付け…",
    "page.sourceTextAria": "元のテキスト",
    "page.copySource": "元テキストをコピー",
    "page.clearAria": "クリア",
    "page.targetLangAria": "目標言語",
    "page.outputPlaceholderWebgpu": "ここに翻訳結果が表示されます（編集可能）。",
    "page.outputPlaceholderLlama":
      "ここに翻訳結果が表示されます（編集可能）— llama-server に送信されます。",
    "page.outputTextAria": "翻訳テキスト",
    "page.noModelShort": "このブラウザにはまだモデルがダウンロードされていません。",
    "page.chooseModel": "設定でモデルを選択してダウンロード",
    "page.copyOutput": "翻訳をコピー",
    "page.translate": "翻訳",
    "page.noModelLong":
      "このブラウザにはまだモデルがダウンロードされていません。設定（推論タブ）を開いて、先にモデルをダウンロードしてください。",
    "page.cancelled": "キャンセルしました。",
    "page.footerWebgpu": "{model} · WebGPU（ブラウザ内）",
    "page.footerLlama": "llama-server · {model}",

    "chip.checking": "WebGPU を確認中…",
    "chip.notSecure": "セキュアなコンテキストではありません",
    "chip.unavailable": "WebGPU 利用不可",
    "chip.notDownloaded": "モデル未ダウンロード",
    "chip.ready": "WebGPU 準備完了",
    "chip.llamaLocal": "llama-server（ローカル）",

    "hint.noDevice":
      "このブラウザには WebGPU デバイスがありません。新しい Chrome/Edge/Chromium を使用し、無効になっている場合は WebGPU を有効にするか、設定でバックエンドを llama-server に切替してください。",
    "hint.secureContext":
      "WebGPU はセキュアなコンテキストが必要です — LAN 上の素の HTTP ではなく、HTTPS または http://localhost で開いてください。",
    "hint.notDownloaded":
      "モデルがこのブラウザに完全にダウンロードされていません — 設定（推論タブ）を開いて先にダウンロードしてください。",
    "hint.outOfMemory":
      "このモデルに GPU メモリが不足しています — 設定（推論タブ）で小さいモデルに切替するか、GPU を多用するタブを閉じて再試行してください。",
    "hint.llamaUnreachable":
      "llama-server に接続できません — 設定（推論タブ）の「接続テスト」でサーバー、URL、CORS を確認してください。",

    "settings.title": "設定",
    "settings.closeAria": "設定を閉じる",
    "settings.tabModel": "モデル",
    "settings.tabGeneral": "一般",
    "settings.backend": "バックエンド",
    "settings.backendWebgpu": "WebGPU（ブラウザ内）",
    "settings.backendLlama": "llama-server（ローカル）",
    "settings.webgpuModelAria": "WebGPU モデル",
    "settings.downloadedChip": "ダウンロード済み · {bytes}",
    "settings.notDownloadedChip": "未ダウンロード",
    "settings.cancelDownload": "ダウンロードをキャンセル",
    "settings.downloaded": "ダウンロード済み",
    "settings.downloadModel": "モデルをダウンロード",
    "settings.clearing": "削除中…",
    "settings.clearCached": "キャッシュされたモデルを削除",
    "settings.systemPromptLabel": "カスタムシステムプロンプト",
    "settings.systemPromptPlaceholder": "任意 — 例：用語、スタイル、ペルソナ",
    "settings.systemPromptTgHelper": "このモデルのチャットテンプレートはシステムメッセージを受け付けません",
    "settings.systemPromptWebgpuHelper": "システムメッセージとして追加されます — 公式のタスク指示は保持されます",
    "settings.systemPromptLlamaHelper":
      "hy-mt2：システムメッセージとして追加（タスク指示は保持）· generic：デフォルト指示を置き換え",

    "provider.server": "サーバー",
    "provider.serverHelper":
      "llama-server の host:port — /v1 プレフィックスは自動で追加されます",
    "provider.model": "モデル",
    "provider.modelPlaceholder": "プリセット名または /v1/models のモデル ID（空白＝自動検出）",
    "provider.detecting": "検出中…",
    "provider.detect": "モデルを検出",
    "provider.enterUrlFirst": "先にサーバー URL を入力してください",
    "provider.noModels": "接続済みですが、モデルが公開されていません（リストが空です）。",
    "provider.apiKey": "API キー",
    "provider.apiKeyPlaceholder": "llama-server を --api-key で起動した場合のみ",
    "provider.preset": "プロンプトプリセット",
    "provider.testing": "テスト中…",
    "provider.test": "接続をテスト",
    "provider.connectedModels": "接続済み — モデル：{list}",
    "provider.connectedEmpty":
      "接続済みですが、モデルが公開されていません（GET /v1/models が空のリストを返しました）。",
    "provider.corsHint":
      "— サーバーが起動して接続可能か確認してください。別のマシン上で起動している場合は CORS の設定を（llama-server を --cors-origins '*' で起動）。",

    "general.uiLanguage": "UI 言語",
    "general.defaultSource": "デフォルトの元の言語",
    "general.defaultTarget": "デフォルトの目標言語",
    "general.privacy": "プライバシー",
    "general.neverRecord": "記録しない",
    "general.neverRecordHelper": "新しい履歴の記録を停止します。既存の履歴は手動で削除するまで保持されます。",
    "general.deleteAllHistory": "全履歴を削除 ({n})",
    "general.diagnostics": "診断",
    "general.diagnosticsHelper": "メインページにライブのアクティビティログ（段階、フェッチ、エラー）を表示",

    "tts.title": "TTS 読み上げ",
    "tts.toggle": "読み上げを有効にする",
    "tts.toggleHelper":
      "デバイス内蔵の音声またはローカルAIモデルで入力や出力を読み上げます。音声はデバイス外に送信されません。",
    "tts.engine": "エンジン",
    "tts.engineWebSpeech": "システム音声",
    "tts.engineKokoro": "Kokoro（AIモデル）",
    "tts.voice": "音声",
    "tts.voiceAuto": "自動（テキストの言語に合わせる）",
    "tts.noVoices": "このシステムにローカル音声が見つかりません。",
    "tts.kokoroVoice": "Kokoro 音声",
    "tts.kokoroDownload": "ダウンロード",
    "tts.kokoroDownloaded": "ダウンロード済み",
    "tts.kokoroNotDownloaded": "未ダウンロード",
    "tts.kokoroClear": "クリア",
    "page.speakInput": "入力を読み上げる",
    "page.speakOutput": "出力を読み上げる",
    "page.stopSpeak": "読み上げを停止",

    "activity.title": "診断 — 段階 + フェッチ（← 行のないリクエストは保留中）",
    "activity.empty": "まだエントリがありません",
    "history.button": "翻訳履歴",
    "history.title": "翻訳履歴",
    "history.empty": "翻訳履歴はまだありません",
    "history.close": "翻訳履歴を閉じる",
    "history.select": "複数選択",
    "history.deleteSelected": "選択を削除 ({n})",
    "history.cancelSelect": "キャンセル",
    "history.clearAll": "すべて削除",
    "history.confirmClearTitle": "翻訳履歴をすべて削除しますか？",
    "history.confirmClearBody":
      "{n} 件の履歴を恒久的に削除します。この操作は元に戻せません。",
    "history.deleteEntry": "この履歴を削除",

    "landing.checking": "確認中…",
    "landing.tagline": "あなたのGPUで動作 · サーバーに送信されるのは何もない",
    "landing.title": "Translate",
    "landing.subtitle": "ブラウザ内で完全に動作する多言語翻訳ツール——入力した内容は一切外部に送信されません。",
    "landing.cardModel": "モデル",
    "landing.cardSize": "サイズ",
    "landing.cardPrivacy": "プライバシー",
    "landing.privacyValue": "100% ローカル",
    "landing.download": "モデルをダウンロード({size})",
    "landing.load": "モデルを読み込む",
    "landing.ready": "モデルの準備ができました",
    "landing.downloading": "ダウンロード中…",
    "landing.done": "完了",
    "landing.warming": "ウォームアップ中…",
    "landing.useLlamaServer": "llama-server を使う",
    "landing.chooseModel": "モデルを選択",
    "landing.webgpuUnavailable":
      "このブラウザはWebGPUに対応していません(またはページがHTTPS経由で提供されていません)——モデルのダウンロードは無効です。llama-serverを使うことができます。",
    "landing.footerWeights": "重み:",
    "landing.footerBuiltWithPrefix": "",
    "landing.footerBuiltWithSuffix": " で構築",
  },

  ko: {
    "site.title": "Translate",

    "header.languageAria": "UI 언어",
    "header.themeAria": "테마 전환",
    "header.toLight": "라이트 모드로 전환",
    "header.toDark": "다크 모드로 전환",
    "header.githubAria": "GitHub 저장소",
    "header.githubReservedAria": "GitHub 저장소 (예약)",
    "header.githubTooltip": "GitHub",
    "header.githubComingSoon": "GitHub 저장소 — 곧 공개 예정",
    "header.settingsAria": "설정",
    "header.settingsTooltip": "설정",
"footer.license": "본 프로젝트는",
    "footer.privacy": "모든 추론은 브라우저에서 로컬로 실행되며, 텍스트는 장치에서 나가지 않습니다.",

    "common.cancel": "취소",
    "common.copy": "복사",
    "common.copied": "복사됨",
    "common.clear": "지우기",
    "common.chars": "{n}자",
    "common.autoDetect": "자동 감지",
    "common.retry": "다시 시도",

    "page.insecureAlert":
      "WebGPU는 보안 컨텍스트가 필요합니다 — https:// 또는 http://localhost 로 여세요.",
    "page.unsupportedAlert":
      "이 브라우저에서는 WebGPU를 사용할 수 없습니다. WebGPU가 켜진 최신 Chrome/Edge/Chromium을 사용하거나, 설정에서 백엔드를 llama-server로 전환하세요.",
    "page.sourceLangAria": "원래 언어",
    "page.swapTooltip": "언어 교환 (결과를 입력 칸으로 이동)",
    "page.swapAria": "언어 교환",
    "page.inputPlaceholder": "번역할 텍스트를 입력하거나 붙여넣기…",
    "page.sourceTextAria": "원래 텍스트",
    "page.copySource": "원래 텍스트 복사",
    "page.clearAria": "지우기",
    "page.targetLangAria": "목표 언어",
    "page.outputPlaceholderWebgpu": "번역 결과가 여기에 표시됩니다 (편집 가능).",
    "page.outputPlaceholderLlama":
      "번역 결과가 여기에 표시됩니다 (편집 가능) — llama-server로 전송됩니다.",
    "page.outputTextAria": "번역된 텍스트",
    "page.noModelShort": "이 브라우저에는 아직 다운로드된 모델이 없습니다.",
    "page.chooseModel": "설정에서 모델을 선택해 다운로드",
    "page.copyOutput": "번역 복사",
    "page.translate": "번역",
    "page.noModelLong":
      "이 브라우저에는 아직 다운로드된 모델이 없습니다. 설정(추론 탭)을 열어서 먼저 모델을 다운로드하세요.",
    "page.cancelled": "취소됨.",
    "page.footerWebgpu": "{model} · WebGPU (브라우저 내)",
    "page.footerLlama": "llama-server · {model}",

    "chip.checking": "WebGPU 확인 중…",
    "chip.notSecure": "보안 컨텍스트 아님",
    "chip.unavailable": "WebGPU 사용 불가",
    "chip.notDownloaded": "모델 미다운로드",
    "chip.ready": "WebGPU 준비 완료",
    "chip.llamaLocal": "llama-server (로컬)",

    "hint.noDevice":
      "이 브라우저에는 WebGPU 장치가 없습니다. 최신 Chrome/Edge/Chromium을 사용하고, 비활성화된 경우 WebGPU를 활성화하거나, 설정에서 백엔드를 llama-server로 전환하세요.",
    "hint.secureContext":
      "WebGPU는 보안 컨텍스트가 필요합니다 — LAN의 일반 HTTP가 아니라 HTTPS 또는 http://localhost로 앱을 여세요.",
    "hint.notDownloaded":
      "모델이 이 브라우저에 완전히 다운로드되지 않았습니다 — 설정(추론 탭)을 열어서 먼저 다운로드하세요.",
    "hint.outOfMemory":
      "이 모델을 실행할 GPU 메모리가 부족합니다 — 설정(추론 탭)에서 더 작은 모델로 전환하거나, GPU를 많이 쓰는 탭을 닫고 다시 시도하세요.",
    "hint.llamaUnreachable":
      "llama-server에 연결할 수 없습니다 — 설정(추론 탭)의 '연결 테스트'로 서버, URL, CORS를 확인하세요.",

    "settings.title": "설정",
    "settings.closeAria": "설정 닫기",
    "settings.tabModel": "모델",
    "settings.tabGeneral": "일반",
    "settings.backend": "백엔드",
    "settings.backendWebgpu": "WebGPU (브라우저 내)",
    "settings.backendLlama": "llama-server (로컬)",
    "settings.webgpuModelAria": "WebGPU 모델",
    "settings.downloadedChip": "다운로드됨 · {bytes}",
    "settings.notDownloadedChip": "다운로드 안 됨",
    "settings.cancelDownload": "다운로드 취소",
    "settings.downloaded": "다운로드됨",
    "settings.downloadModel": "모델 다운로드",
    "settings.clearing": "삭제 중…",
    "settings.clearCached": "캐시된 모델 지우기",
    "settings.systemPromptLabel": "사용자 정의 시스템 프롬프트",
    "settings.systemPromptPlaceholder": "선택 — 예: 용어, 스타일, 페르소나",
    "settings.systemPromptTgHelper": "이 모델의 채팅 템플릿은 시스템 메시지를 받지 않습니다",
    "settings.systemPromptWebgpuHelper": "시스템 메시지로 추가됩니다 — 공식 작업 지시 사항은 유지됩니다",
    "settings.systemPromptLlamaHelper":
      "hy-mt2: 시스템 메시지로 추가 (작업 지시 유지) · generic: 기본 지시 사항 대체",

    "provider.server": "서버",
    "provider.serverHelper": "llama-server의 host:port — /v1 접두사는 자동 추가됩니다",
    "provider.model": "모델",
    "provider.modelPlaceholder": "프리셋 이름 또는 /v1/models의 모델 id (빈 값 = 자동 감지)",
    "provider.detecting": "감지 중…",
    "provider.detect": "모델 감지",
    "provider.enterUrlFirst": "먼저 서버 URL을 입력하세요",
    "provider.noModels": "연결되었지만 공개된 모델이 없습니다 (목록이 비어 있음).",
    "provider.apiKey": "API 키",
    "provider.apiKeyPlaceholder": "llama-server를 --api-key로 시작한 경우에만",
    "provider.preset": "프롬프트 프리셋",
    "provider.testing": "테스트 중…",
    "provider.test": "연결 테스트",
    "provider.connectedModels": "연결됨 — 모델: {list}",
    "provider.connectedEmpty": "연결되었지만 공개된 모델이 없습니다 (GET /v1/models가 빈 목록을 반환).",
    "provider.corsHint":
      "— 서버가 실행 중이고 접속 가능한지 확인하세요. 다른 기계에서 실행 중인 경우 CORS가 설정되어 있는지 확인 (llama-server를 --cors-origins '*'으로 시작).",

    "general.uiLanguage": "UI 언어",
    "general.defaultSource": "기본 원래 언어",
    "general.defaultTarget": "기본 목표 언어",
    "general.privacy": "개인정보",
    "general.neverRecord": "기록하지 않음",
    "general.neverRecordHelper": "새 항목 기록을 중단합니다. 기존 기록은 수동으로 삭제할 때까지 유지됩니다.",
    "general.deleteAllHistory": "모든 기록 삭제 ({n})",
    "general.diagnostics": "진단",
    "general.diagnosticsHelper": "메인 페이지에 실시간 활동 로그(단계, fetch, 오류) 표시",

    "tts.title": "TTS 읽어주기",
    "tts.toggle": "읽어주기 사용",
    "tts.toggleHelper":
      "장치에 내장된 음성 또는 로컬 AI 모델로 입력 또는 출력을 읽어 줍니다. 오디오는 장치 밖으로 나가지 않습니다.",
    "tts.engine": "엔진",
    "tts.engineWebSpeech": "시스템 음성",
    "tts.engineKokoro": "Kokoro(AI 모델)",
    "tts.voice": "음성",
    "tts.voiceAuto": "자동(텍스트 언어에 맞춤)",
    "tts.noVoices": "이 시스템에서 로컬 음성을 찾을 수 없습니다.",
    "tts.kokoroVoice": "Kokoro 음성",
    "tts.kokoroDownload": "다운로드",
    "tts.kokoroDownloaded": "다운로드 완료",
    "tts.kokoroNotDownloaded": "미다운로드",
    "tts.kokoroClear": "삭제",
    "page.speakInput": "입력 읽어 주기",
    "page.speakOutput": "출력 읽어 주기",
    "page.stopSpeak": "읽어 주기 중지",

    "activity.title": "진단 — 단계 + fetch (← 행이 없는 요청은 대기 중)",
    "activity.empty": "아직 항목이 없습니다",
    "history.button": "번역 기록",
    "history.title": "번역 기록",
    "history.empty": "번역 기록이 없습니다",
    "history.close": "번역 기록 닫기",
    "history.select": "다중 선택",
    "history.deleteSelected": "선택 항목 삭제 ({n})",
    "history.cancelSelect": "취소",
    "history.clearAll": "모두 삭제",
    "history.confirmClearTitle": "번역 기록을 모두 삭제할까요?",
    "history.confirmClearBody":
      "{n}개 항목이 영구적으로 삭제됩니다. 되돌릴 수 없습니다.",
    "history.deleteEntry": "이 기록 삭제",

    "landing.checking": "확인 중…",
    "landing.tagline": "내 GPU에서 실행 · 서버로 전송되는 것은 아무것도 없음",
    "landing.title": "Translate",
    "landing.subtitle": "브라우저 안에서 완전히 동작하는 다국어 번역기 — 입력한 내용은 절대 외부로 나가지 않습니다.",
    "landing.cardModel": "모델",
    "landing.cardSize": "크기",
    "landing.cardPrivacy": "프라이버시",
    "landing.privacyValue": "100% 로컬",
    "landing.download": "모델 다운로드({size})",
    "landing.load": "모델 로드",
    "landing.ready": "모델 준비 완료",
    "landing.downloading": "다운로드 중…",
    "landing.done": "완료",
    "landing.warming": "워밍업 중…",
    "landing.useLlamaServer": "llama-server 사용",
    "landing.chooseModel": "모델 선택",
    "landing.webgpuUnavailable":
      "이 브라우저는 WebGPU를 지원하지 않거나(또는 페이지가 HTTPS로 제공되지 않음) 모델 다운로드가 비활성화되었습니다 — llama-server를 대신 사용할 수 있습니다.",
    "landing.footerWeights": "가중치:",
    "landing.footerBuiltWithPrefix": "",
    "landing.footerBuiltWithSuffix": "로 작성",
  },
};

export function normalizeLanguage(value: string): Language {
  if (value === "zh-TW" || value === "ja" || value === "ko") return value;
  return "en";
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
