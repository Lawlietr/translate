# Inference providers — WebGPU + llama-server

Two inference backends, selectable in Settings. Pattern ported from what-do-you-see's
`src/lib/providers/` (registry + configSchema + testConnection), trimmed to two providers.

## Providers

| id | name | where inference runs | notes |
|----|------|---------------------|-------|
| `webgpu` | WebGPU (in-browser) | user's own GPU | default backend; models downloaded via the #3 pipeline, cache-gated |
| `llama-server` | llama-server (local) | user's own llama.cpp server | OpenAI-compatible HTTP API, **client-side fetch** |

### Client-side direct fetch (owner-decided deviation from what-do-you-see)

what-do-you-see routes llama-server calls through a server-side `/api/analyze` proxy
because it uploads image files. Translate is **text-only** — the browser calls the
llama-server endpoint directly:

- No Next.js API route exists anywhere (AGENTS rule 9 stays intact: public build has
  zero server-side routes, `out/` stays fully static).
- llama-server ships with **CORS enabled by default** (`--no-cors` opts out). If the
  user's server has CORS disabled, the browser fetch fails — the error message must
  say so explicitly ("start llama-server without `--no-cors`").
- Privacy: requests go only to (a) `huggingface.co` (user-initiated model downloads)
  and (b) the endpoint the user themselves configured. AGENTS rule 10 updated.

## `AIProvider` interface (adapted for translation)

```ts
interface TranslationRequest {
  text: string;
  sourceLang: string;   // language name/codes → instruction line
  targetLang: string;
  uiLanguage: Language; // for error messages only
}
interface TranslationResponse {
  text: string;         // translated output
  latencyMs: number;
}
interface AIProvider {
  id: string;
  name: string;
  enabled: boolean;
  configSchema: ProviderConfigField[];  // declarative → auto-generated form
  translate(request: TranslationRequest, config: ProviderConfig, signal: AbortSignal): Promise<TranslationResponse>;
  testConnection(config: ProviderConfig): Promise<boolean>;
}
```

`registry.ts`: `getProvider` / `listProviders` / `enabledProviders` — 1:1 port.

## llama-server provider (port of what-do-you-see `llama-server.ts`)

Config keys (`configSchema`):

| key | label | type | notes |
|-----|-------|------|-------|
| `baseUrl` | Server | text, required | `http://<host>:8080` — `/v1` auto-appended if missing, `http://` auto-prefixed |
| `model` | Model | text, optional | preset name or id from `GET /v1/models`; **blank = auto-detect** (first of the list) |
| `apiKey` | API Key | password, optional | only if started with `--api-key` |

Ported behavior, kept verbatim:

- `fetchWithTimeout` — 10 s connect timeout (config/test), 10 min inference timeout
- `chat_completion` body: `max_tokens` per the #4 cap policy (source-sized, hard ceiling),
  `temperature: 0` (translation = deterministic, unlike the sister project's 0.3),
  `chat_template_kwargs: { enable_thinking: false }` (llama.cpp honors it; non-Qwen
  templates ignore it)
- `reasoning_content` fallback when `content` is empty (thinking models that burn the
  budget in reasoning); error if both empty, with `finish_reason` + token usage in the message
- `testConnection` = `GET /v1/models` ok; UI additionally lists the detected model ids
- error surfaces the server's first 300 response chars (`safeBody`)

Chat messages (keep in English per AGENTS rule 8; UI language never enters the instruction):

- system: `You are a translation engine. Translate the user's message into {TargetLangName}. Reply with the translation only — no preamble, no commentary.`
- user: the raw source text
- `{TargetLangName}` is the English name of the target language (e.g. `Traditional Chinese`).
  Prompt finalization + A/B belongs to #4 (browser-verified), this is the starting point.

## webgpu provider

Thin wrapper over the #4 inference pipeline (tokenizer + `AutoModelForCausalLM`,
chat-template instruction, greedy, capped `max_new_tokens`, AbortController).
Config keys: none beyond `webgpuModelId` (model selection lives in the WebGPU settings
panel, cache-gated per AGENTS rule 2). `testConnection` = `isWebGpuSupported()` &&
secure context && active model cache verified-complete.

## Settings persistence (port of `settings-manager.ts`)

localStorage key `translate:settings`:

```ts
interface AppSettings {
  backend: "webgpu" | "llama-server";   // default "webgpu"
  webgpuModelId: string;                // validated against WEBGPU_MODELS, falls back to default
  llamaServerConfig: { baseUrl: string; model: string; apiKey: string };
  language: Language;                   // UI language (i18n, #7)
  defaultSourceLang: string;
  defaultTargetLang: string;
}
```

Same merge/validate pattern as the sister project (defaults + parsed, unknown model id →
default). No migration keys needed at first launch.

## UI (details in design/ui-ux.md)

- Settings → **Inference** tab: backend selector (MUI Select, `ProviderSelector` pattern)
  + the active backend's config block
- WebGPU block: 1:1 port of `WebGPUSettings.tsx` (model card with downloaded/partial/
  not-downloaded status + bytes, Manage models dialog, Clear cache, support warnings)
- llama-server block: `ProviderConfigForm.tsx` (form auto-generated from `configSchema`)
  + Connection test button with spinner → success shows detected model list / failure
  shows the reason (incl. the `--no-cors` hint)
- `ConnectionTest.tsx` ports 1:1

## Build impact

- No new API routes; `build:export` output stays fully static
- No new dependencies (fetch + existing stack)
- ort-wasm < 25 MiB gate unchanged (introduced when #4 imports transformers.js)

## Port source map (what-do-you-see)

| translate file | source |
|----------------|--------|
| `src/lib/providers/types.ts` (AIProvider + config schema types) | `src/lib/types.ts` (provider sections) |
| `src/lib/providers/registry.ts` | `src/lib/providers/registry.ts` (2 providers) |
| `src/lib/providers/llama-server.ts` | `src/lib/providers/llama-server.ts` (drop vision/image code) |
| `src/lib/providers/webgpu.ts` | `src/lib/providers/webgpu.ts` (text-only path, rewritten around #4) |
| `src/lib/settings-manager.ts` | `src/lib/settings-manager.ts` |
| `src/components/settings/ProviderSelector.tsx` | 1:1 |
| `src/components/settings/ProviderConfigForm.tsx` | 1:1 (schema-driven) |
| `src/components/settings/ConnectionTest.tsx` | 1:1 |
| `src/components/settings/WebGPUSettings.tsx` | 1:1 (drops `enableThinking` switch — translation models don't use it) |
