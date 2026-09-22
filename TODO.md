# TODO

## Pending

| # | Task | Priority |
|---|------|----------|
| 17 | Custom system prompt (both backends): per-backend `systemPrompt` setting (llama-server config form + WebGPU settings panel); hy-mt2 = additive system (official user instruction untouched), generic = replaces default, **translategemma = disabled with hint** (template raises) — design/inference-providers.md §Prompts | P1 |
| 18 | vLLM provider (reserved, lowest priority — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client (OpenAI-compatible) + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md | P3 |
| 4 | Translation pipeline: `AutoTokenizer` + `AutoModelForCausalLM`, prompt-profile messages (#16), greedy, capped + source-sized `max_new_tokens`, AbortController cancel, `powerPreference` patch — design/webgpu-knowledge.md §3; routed through the provider registry (#14) so the llama-server backend works from the start. **IMPLEMENTED 2026-09-21 — harness page at `/` + webgpu provider + LAN https server; AWAITING OWNER BROWSER ACCEPTANCE** (download + load + translate in real browser); full UI (#5) only after | P0 |
| 5 | Core UI per design/ui-ux.md (input/output, language pickers, swap, states, status footer; dark-default + theme toggle, GitHub icon placeholder) | P1 |
| 6 | Settings per design/ui-ux.md: Inference tab (backend selector + WebGPU model block + llama-server config with connection test) + General tab (UI language, defaults) — persist to localStorage (`settings-manager.ts` from #14) | P1 |
| 7 | i18n zh-TW (default) + en: 1:1 port of what-do-you-see in-house pattern, header dropdown, instant switch — design/i18n.md | P2 |
| 8 | HTTPS LAN test server (`scripts/https-test-server.mjs` pattern) for browser verification — **bind `0.0.0.0`** (user tests over LAN from a different machine; dev/preview/proxy all non-localhost) + check dev-box disk before builds (filesystem >90% full; webgpu-knowledge.md §3) | P2 |
| 9 | Deploy script `scripts/deploy-pages.mjs` (secrets via env, `--branch main`, test/prod split) + Cloudflare projects/domains (TBD) — design/deployment.md | P2 |
| 10 | Windows 11 WebView2 wrapper .exe (C# .NET 8 **launcher**, embedded node + Next.js standalone → WebUI + API shim, D6): first-run `config.json` in exe dir (bind_ip/port + shim keys), launches embedded node child process, WebView on `http://127.0.0.1:<port>` — design/local-deployment.md; build host TBD (D5) | P1 |
| 11 | Docker multi-stage (node **full/standalone** build + wasm check → node runtime, nginx optional TLS, D6) + compose (env shim config + optional llama.cpp service) + buildx linux/amd64,arm64; self-signed TLS auto-generation on first boot required — design/local-deployment.md | P2 |
| 12 | Local non-Docker Linux serving (full build + `npm start`, Caddy/nginx optional TLS, D6): docs + optional `scripts/serve-local.sh` — design/local-deployment.md | P2 |
| 19 | OpenAI-compatible API shim for **all node targets** (Docker / local Linux / .exe — D6; CF stays static-only): `/api/v1/chat/completions` + `/v1/models`, server-side prompt-profile reuse (#16/#17), server config `LLAMA_BASE_URL`/`MODEL_PRESET`/`SYSTEM_PROMPT`/`API_TOKEN` (env/.env/config.json per target), optional llama.cpp compose service — design/local-deployment.md §API shim | P2 |
| 13 | Forgejo workflows: docker image build on runner `192.168.1.12` (multi-arch) publishing to Codeberg registry ONLY (local Forgejo never stores artifacts) + GitHub Actions mirror when repo lands; exe workflow once D5 build host decided — design/ci-build.md | P2 |

## Completed

| Task |
|------|
| Model download pipeline `src/lib/model-cache.ts` (+`src/lib/types.ts` `DownloadProgress`): 1:1 port of what-do-you-see core per webgpu-knowledge.md §2 plan — trims only (no IndexedDB path, no vision loader/loading phase → #4, no dead fallback); HF tree → `filePatterns` filter → abortable streamed fetch → Cache API `transformers-cache` (keys incl. `onnx/` subpaths), skip-if-cached, 10 GB/s speed clamp, `cachedModelState` gate, `clearWebGpuModelCache` — 39/39 mock tests; **live HF verification: both models' matched file lists sum byte-for-byte to catalog `sizeBytes`** (incl. translategemma `_data` external shards) |
| Prompt profiles `src/lib/prompt-profiles.ts`: hy-mt2 (official Default Translation single user message) / translategemma (structured list content, no system, `zh-TW→zh-Hant` + `zh-CN→zh-Hans` code mapping) / generic fallback; `modelPreset` config field (auto-detect from model id + override); **llama-server.ts refactored off the incompatible system+string format** — 32/32 mock tests (unit + e2e vs mock llama-server); `settings-manager.ts` normalizes `modelPreset` | 
| Provider layer: `AIProvider` + registry (webgpu/llama-server), llama-server client-side fetch (`/v1` auto, auto-detect, 10s/10min timeouts, thinking fallback, testConnection) — 16/16 smoke tests vs mock server; `settings-manager.ts` + `languages.ts`; webgpu `translate()` stubbed until #4 |
| `src/lib/model-catalog.ts`: both models (Hy-MT2 q4f16 default 1,383,140,565 B; translategemma q4 3,111,911,523 B) — filePatterns re-verified against live HF tree byte-for-byte at implementation; corrected doc sum (was 3,111,911,678, arithmetic error) |
| Scaffold: Next.js 16.3.4 + TS + Tailwind v4 + MUI 9.4.0 + EXACT `@huggingface/transformers@4.2.0` (ort-web 1.26.0-dev); dual build verified (self-hosted + `build:export` → 23K out/); lint clean; wasm <25 MiB check applies once inference code imports ort-wasm (no wasm chunks yet) |
| codeberg remote added (`Lawlietr/translate`) + pushed; remotes documented in design/deployment.md |
