# Inference providers — WebGPU + llama-server

Two inference backends, selectable in Settings. Pattern ported from what-do-you-see's
`src/lib/providers/` (registry + configSchema + testConnection), trimmed to two providers.

## Providers

| id | name | where inference runs | notes |
|----|------|---------------------|-------|
| `webgpu` | WebGPU (in-browser) | user's own GPU | default backend; models downloaded via the #3 pipeline, cache-gated |
| `llama-server` | llama-server (local) | user's own llama.cpp server | OpenAI-compatible HTTP API, **client-side fetch** |
| `vllm` | vLLM (local) | user's own vLLM server | **RESERVED — not implemented** (lowest priority, TODO #18). Same OpenAI-compatible API as llama-server → thin client reuse; same prompt-profile mechanism (vLLM applies the model's chat template server-side, so the structural constraints of §Prompts apply identically). Gated: implement only after both the WebGPU and llama-server backends are verified working in a real browser. Open question to verify before implementation: vLLM's CORS behavior for browser clients (its OpenAI server is not browser-first — may need a flag or a local proxy) |

### Client-side direct fetch (owner-decided deviation from what-do-you-see)

what-do-you-see routes llama-server calls through a server-side `/api/analyze` proxy
because it uploads image files. Translate is **text-only** — the browser calls the
llama-server endpoint directly:

- No Next.js API route exists anywhere (AGENTS rule 9 stays intact: public build has
  zero server-side routes, `out/` stays fully static).
- **CORS hint (owner-corrected 2026-09-22):** when the user's llama-server has no
  CORS configured, the browser fetch fails (preflight blocked). Every failure message
  that touches reachability must say to add **`--cors-origins '*'`** when starting
  llama-server — the old "start without `--no-cors`" hint was wrong.
- **Model auto-detect:** the llama-server config's Model field is an `Autocomplete`
  (`freeSolo`) that fetches `GET {baseUrl}/models` when the dropdown opens AND via an
  explicit "Detect models" button; options are the returned ids, free typing stays
  possible (1:1 port of what-do-you-see `ProviderConfigForm.tsx` ModelField).
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
| `modelPreset` | Prompt preset | select, optional | `auto` (default) / `hy-mt2` / `translategemma` / `generic` — overrides prompt-profile auto-detection, see §Prompts |
| `systemPrompt` | Custom system prompt | multiline, optional | user's own system prompt for model tuning; **disabled with an explanatory hint when the effective profile is `translategemma`** (its chat template raises on system messages) — see §Prompts "Custom system prompt" |

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

Chat messages are built by the **prompt profile** selected for the loaded model — see §Prompts.

## Prompts (per-model prompt profiles)

**Both bundled models have verified, incompatible chat-template requirements** —
checked against the actual `chat_template.jinja` in each ONNX repo (2026-09):

| | Hy-MT2 1.8B (mirror) | TranslateGemma 4B (ONNX) |
|---|---|---|
| template nature | plain role wrapper, optional system | **translation instruction is BUILT INTO the template** |
| system message | allowed (official example omits it) | **FORBIDDEN** — template `raise_exception` unless `messages[0]` is user |
| user content type | plain string | **list with exactly one mapping**: `[{type: 'text', source_lang_code, target_lang_code, text}]` — a plain string raises |
| instruction text | written by us, per the model card's Default Translation format | **generated by the template** ("You are a professional {Source} ({code}) to {Target} ({code}) translator…") — do NOT write our own |
| language codes | full English name ("Traditional Chinese") via `languageName()` | BCP-47 code in the template's map — **per-profile mapping required**: `zh-TW`→`zh-Hant`, `zh-CN`→`zh-Hans` (the map has `zh-Hans`/`zh-Hant` but **NOT `zh-CN`** — a raw pass-through would raise); all other app codes (`en`, `ja`, `ko`, `fr`, `de`, `es`) pass through |

The Hy-MT2 format is the model card's **Default Translation** instruction (single user
message, plain string): `Translate the following text into {TargetLangName}. Note that
you should only output the translated result without any additional explanation:\n\n{text}`.
Other card formats (Terminology / Style / Personalization / Delimiters / Structured Data)
are out of scope for v1.

**Design — `src/lib/prompt-profiles.ts`** (new, no sister-project equivalent):

```ts
interface TranslationPromptProfile {
  id: "hy-mt2" | "translategemma" | "generic";
  matches(modelId: string): boolean;   // id-substring patterns, AGENTS rule 6 spirit
  buildMessages(req: TranslationRequest): ChatMessage[];
}
getPromptProfile(modelId: string): TranslationPromptProfile  // first match, else generic
```

- `hy-mt2` (pattern `/hy-mt2/i`): official Default Translation, single user message, string content.
- `translategemma` (pattern `/translat(e)?gemma/i`): single user message with structured list
  content, no system, no self-written instruction, app ISO codes passed through.
- `generic` (fallback, single user message + string instruction): any other GGUF a user
  points llama-server at — the current llama-server.ts system+string format is the
  starting point here minus the system line.

**Selection per backend:**

- WebGPU: model id is always known (`webgpuModelId` from the catalog) → direct mapping.
- llama-server: model id may be unknown (auto-detected from `GET /v1/models` or the
  user's `model` field; GGUF filenames like `Hy-MT2-1.8B-Q4_K_M.gguf` are detectable)
  → auto-detect, overridable via the `modelPreset` config field (repacks/renamed files).

### Custom system prompt (user-tunable, both backends)

Users run arbitrary models (esp. via llama-server) and need to tune behavior —
style, terminology, persona — so **both backends expose an optional custom system
prompt** in Settings (stored in the settings object above; not code).

How it composes with the profiles:

| effective profile | system prompt behavior |
|---|---|
| `hy-mt2` | **allowed** (template accepts an optional system message). Unset → no system message (official example shape). Set → user text becomes the system message; the **official Default Translation instruction stays in the user message** (task format is card-verified; the custom text adds context, doesn't replace the task) |
| `translategemma` | **forbidden** — the template `raise_exception`s unless `messages[0]` is user. UI: field disabled with a hint ("this model's chat template does not accept system messages"). There is no workaround that doesn't pollute the source text — do NOT embed the custom text into the `text` field |
| `generic` | **allowed** (most GGUF chat templates accept system). Set → replaces the default generic instruction; unset → default. Some templates may ignore or reject a system message — surface the server/template error verbatim rather than silently dropping the prompt |

UI notes: multiline text area in each backend's settings block (llama-server: inside
the schema-driven config form; WebGPU: inside the WebGPU settings panel next to model
selection, hidden/disabled while the active model is the translategemma profile).
Per AGENTS rule 8, user-supplied prompts are the user's own text — the app never
injects UI language into them; no translation of the field itself.

Implementation status (verified 2026-09-26, TODO #17 done): both providers pass the
user's `systemPrompt` through to `buildMessages(profile, request, systemPrompt)` —
`hy-mt2` prepends the system message (official user instruction untouched),
`translategemma` is defensively ignored in `buildMessages` **and** UI-disabled, `generic`
replaces the default instruction (user message carries the raw text). Settings keys:
`llamaServerConfig.systemPrompt` + top-level `webgpuSystemPrompt` (both `""` = unset).
The llama-server field is UI-disabled whenever the **effective** profile is
translategemma (`modelPreset === 'translategemma'`, or `auto` + model field matching
the translategemma pattern); the WebGPU field is disabled when the active model's
profile is translategemma.

Prompt changes for the small models must be A/B-tested in a real browser (AGENTS rule 8)
— WebGPU fp16 failures are not reproducible on CPU.

## webgpu provider

Thin wrapper over the #4 inference pipeline (tokenizer + `AutoModelForCausalLM`,
prompt-profile messages, greedy, capped `max_new_tokens`, AbortController).
Config: `webgpuModelId` (model selection lives in the WebGPU settings panel, cache-gated
per AGENTS rule 2) + `systemPrompt` (custom system prompt — allowed for Hy-MT2 whose
template accepts an optional system message; **disabled for translategemma**, same
template constraint as §Prompts). `testConnection` = `isWebGpuSupported()` && secure
context && active model cache verified-complete.

## Settings persistence (port of `settings-manager.ts`)

localStorage key `translate:settings`:

```ts
interface AppSettings {
  backend: "webgpu" | "llama-server";   // default "webgpu"
  webgpuModelId: string;                // validated against WEBGPU_MODELS, falls back to default
  llamaServerConfig: { baseUrl: string; model: string; apiKey: string; modelPreset: "auto" | "hy-mt2" | "translategemma" | "generic"; systemPrompt: string };
  webgpuSystemPrompt: string;                 // "" = unset; ignored (UI-disabled) for the translategemma profile
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
  shows the reason (incl. the `--cors-origins '*'` hint) + Model field with `/v1/models`
  auto-detect dropdown (see §CORS/model auto-detect above)
- `ConnectionTest.tsx` ports 1:1

## Build impact

- Provider layer itself: no API routes (browser direct fetch). The **server-side OpenAI shim** exists only in the node-target full builds (Docker / local Linux / .exe, D6 — design/local-deployment.md §API shim) and reuses the §Prompts profile logic; `build:export` (CF) output stays fully static
- No new dependencies (fetch + existing stack)
- ort-wasm < 25 MiB gate unchanged (introduced when #4 imports transformers.js)

## Port source map (what-do-you-see)

| translate file | source |
|----------------|--------|
| `src/lib/providers/types.ts` (AIProvider + config schema types) | `src/lib/types.ts` (provider sections) |
| `src/lib/providers/registry.ts` | `src/lib/providers/registry.ts` (2 providers) |
| `src/lib/providers/llama-server.ts` | `src/lib/providers/llama-server.ts` (drop vision/image code) |
| `src/lib/providers/webgpu.ts` | `src/lib/providers/webgpu.ts` (text-only path, rewritten around #4) |
| `src/lib/prompt-profiles.ts` | **new** (no sister-project equivalent) — per-model message builders, see §Prompts |
| `src/lib/settings-manager.ts` | `src/lib/settings-manager.ts` |
| `src/components/settings/ProviderSelector.tsx` | 1:1 |
| `src/components/settings/ProviderConfigForm.tsx` | 1:1 (schema-driven) |
| `src/components/settings/ConnectionTest.tsx` | 1:1 |
| `src/components/settings/WebGPUSettings.tsx` | 1:1 (drops `enableThinking` switch — translation models don't use it) |
