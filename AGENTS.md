# AGENTS.md — Translate (WebGPU)

## Project Overview

A local, privacy-first translation web app — a **"Google Translate" clone that runs entirely in the user's browser** on WebGPU.

**License: AGPL-3.0 (single license, owner decision 2026-09-21).** All app code + wrapper exe under AGPL (see `LICENSE`). Third-party components keep their own licenses (Next.js/MUI/transformers.js/etc. are MIT/Apache — compatible). The WebView2 Runtime is a preinstalled system component, never redistributed. **Models (Gemma/Hy-MT2) are user-downloaded from HF under their own terms — never bundle them in the exe or Docker image.** Type text → a small multilingual LLM (ONNX, via `@huggingface/transformers`) translates it locally → result shown in the output box.

**Key difference from cloud translation:** all inference runs on the user's own GPU (WebGPU). No text leaves the browser, no server-side processing, no tracking.

**This project inherits hard-won WebGPU knowledge from the sibling project `what-do-you-see` (same host, photo-privacy analyzer).** Every non-obvious rule in this file and in `design/` comes from a production bug we already hit and fixed there — read `design/webgpu-knowledge.md` before touching model loading, downloads, or inference code. Do NOT re-derive those pitfalls from scratch.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) — see `node_modules/next/dist/docs/` before writing code |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (CSS-first, no config file) + Material UI v9 |
| AI (Browser) | `@huggingface/transformers` + WebGPU (ONNX format); optional user's `llama-server` (OpenAI-compatible, client-side fetch) — `design/inference-providers.md` |
| Model Storage | Cache API (`transformers-cache`) for ONNX files |
| Settings | localStorage |

No EXIF, no image handling, no maps, no backend inference. Text in, text out.

## AI Models

Catalogued in `src/lib/model-catalog.ts`. **Sizes must be verified from the HF tree API before being hardcoded** — see `design/model-catalog.md` for method and current status.

| Mode | Model ID | Notes |
|------|----------|-------|
| Default (tentative) | `LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror` | Hy-MT2 1.8B, q4f16 single `onnx/model_q4f16.onnx`, ~1.29 GiB, fastest on modest GPUs; NOT the justinchuby repo (onnxruntime-genai layout, unloadable by transformers.js) — design/model-catalog.md |
| Optional | `onnx-community/translategemma-text-4b-it-ONNX` (**q4 variant only, tentative** — design/model-catalog.md) | stronger translator, ~2.90 GiB; **files live in an `onnx/` SUBDIRECTORY** (paths/tree queries/cache keys include the subpath). The repo holds fp16/q4/q4f16 + safetensors (48 GB); unpinned `from_pretrained` resolves **fp16 ≈ 7.6 GiB** — pin `dtype: 'q4'` and exact `model_q4*` filePatterns. Fallback: `m1cc0z/translategemma-4b-it-onnx-q4-webgpu` (WebGPU repack, ~3.3 GiB) |

A third backend, **vLLM, is reserved but NOT implemented** (lowest priority, TODO #18; gated until the WebGPU and llama-server backends are verified working in a real browser) — `design/inference-providers.md`.

Both are text-only causal-LM translation models: `AutoTokenizer` + `AutoModelForCausalLM` (NOT `AutoModelForImageTextToText`, no image processor). Translation is driven through each model's own chat template + a short instruction ("translate … to …"), greedy decoding, with a capped `max_new_tokens`.

## Non-negotiable rules (learned in what-do-you-see)

1. **Pin `@huggingface/transformers` to an EXACT version (no `^`).** The 4.3.0 bump pulled `onnxruntime-web` 1.24.1 → `ort-wasm-simd-threaded.async-*.wasm` = 25.6 MiB → Cloudflare Pages rejects any single file > 25 MiB (413 on the wasm, upload fails per-file). Baseline known-good: **4.2.0** (wasm 17.82 MiB). Before ANY upgrade: build, then `find out -name "*.wasm*" -exec du -h {} +` (in a Next 16 + transformers.js 4.2.0 build the ort wasm lands in `out/_next/static/media/`, not `chunks/`) and check every file < 25 MiB.
2. **Never download a model implicitly.** The only download entry point is the user-initiated "Manage models" dialog in Settings. The inference path gates on a verified-complete cache and throws a clear "download it from Settings first" error when the cache is incomplete. `from_pretrained` (which silently fetches missing files from HF) only ever runs on a complete cache.
3. **Model downloads are streamed + cancellable.** HF tree API (`/api/models/{id}/tree/main?recursive=true`) lists files → filter per-model `filePatterns` → each file fetched with `AbortController`, chunk-by-chunk progress + speed → stored in the Cache API under key `https://huggingface.co/{modelId}/resolve/main/{path}` (transformers.js default `env.cacheKey` = `transformers-cache`) → then a separate `loading` phase (first WebGPU run compiles shaders, can take minutes — show a spinner, not a frozen progress bar). Speed display clamped to a 10 GB/s sanity cap. A partial cache is reported as "not downloaded"; re-download skips already-cached files.
4. **Verify model sizes from the HF tree API** (sum of the exact files transformers.js will load, per submodel + external-data shards + JSON/tokenizer files). Displayed bytes must match the cache verification bytes. (Re-verified live 2026-09-21 during #3/#4: both models' matched file lists sum byte-for-byte to the catalog values.)
5. **Secure context required for WebGPU** (`https://` or `localhost`). LAN testing goes through a self-signed HTTPS proxy (`scripts/https-test-server.mjs` pattern; `fuser -k <port>/tcp` to stop — `pkill -f` self-matches its own command line). **The user tests from a DIFFERENT machine than the dev box** — every local server for browser testing (Next dev/preview, HTTPS proxy) must bind `0.0.0.0` (e.g. `npm run dev -H 0.0.0.0`), never localhost-only. **Watch dev-box disk space** (filesystem has run >90% full): node_modules ~1 GiB + `.next` per build; model files live in the BROWSER's Cache API (user's machine), not on the dev box, but `rm -rf .next out` after verification to reclaim space before the next build. **Dev mode + non-localhost hosts (Next 16, 2026-09-22):** dev servers block cross-origin requests to `/_next/*` dev resources, and when blocked the page SSRs but **never hydrates** (dead app, no errors) — `127.0.0.1` differs from `localhost` for this check, so `next.config.ts` carries `allowedDevOrigins` for `127.0.0.1` + the dev box's LAN IPs. Additionally the HTTPS proxy MUST forward WebSocket `upgrade` (handler in `scripts/https-test-server.mjs`) — Next 16 dev hydration depends on the HMR websocket, and without it the proxied LAN path stays unhydrated while direct access works. The ws upgrade must send exactly **ONE** `Host:` header (rewrite it, don't append a second) — a duplicate `Host` makes Next 16 dev reject the handshake (2026-09-22: my handler sent original + rewritten, page died). **The unhydrated-SSR-shell trap (2026-09-22, cost an owner incident):** the SSR HTML initially baked in the "WebGPU is not available" error alert (initial state `supported: false`, no "still checking" guard) and the inputs are disabled while checking — so a page that never hydrates looks EXACTLY like "this browser has no WebGPU" with dead buttons and untypeable inputs, while the browser is perfectly fine. Before ever blaming the user's browser/GPU/OS: (1) check hydration — `__reactFiber` key on the root element (Playwright `page.evaluate`); (2) `curl -sk https://<host>/` and grep the SSR HTML for the alert text (present = server-side artifact); (3) the real check is `navigator.gpu.requestAdapter()`, which only runs client-side AFTER hydration. Fixed: alert gated on `!gpu.checking`, settings loaded post-mount (hydration-safe provider, see ui-ux.md Implementation notes). Symptom set to watch for: "checking WebGPU…" chip frozen, dead buttons, untypeable inputs, spurious WebGPU error, HMR websocket errors in the browser console. **Automated browser verification:** drive the already-cached Chromium (`~/.cache/ms-playwright/`) with `playwright-core` installed in `/tmp` — never add test toolchains to the project. The Obscura containerized browser has a double-React-root quirk: a second (app-level) root sits behind the one scripts see, so synthetic click events are consumed there and never reach the app's React tree (verified 2026-09-22; the same page works flawlessly under real Chromium) — use Playwright for functional checks, Obscura at most for screenshots.
6. **Never detect model classes by `constructor.name`** — the production bundle is minified (class names become `ut`, `A`, …) and the branch silently never fires. Detect by model-id string / repo prefix.
7. **Cap `max_new_tokens`.** Weak/translation LLMs in-browser grind the full budget when EOS comes late. 2048–3072 is the ceiling; a 4B model at 3072 tokens can take minutes on modest GPUs.
8. **Keep model-facing prompts/instructions in English; never mix UI language into the instruction text. Message STRUCTURE is per-model — each model gets its own prompt profile (Hy-MT2 = official Default Translation single user message; TranslateGemma = structured list content, no system message, template-generated instruction; generic fallback), selected by model-id — see `design/inference-providers.md` §Prompts.** Small models (≤2B) can lock into an output-language loop (verified twice with LFM2.5 450M: zh instruction line → infinite repetition; English instruction + trailing output-language line → works). WebGPU fp16 failure modes are NOT reproducible on CPU — A/B-test prompt changes in the real browser, or not at all. **Verify chat-template requirements from the actual `chat_template.jinja` in the model repo before designing message formats** (TranslateGemma's template `raise_exception`s on system messages and plain-string user content — discovered 2026-09 by reading the shipped template).
9. **No server-side routes in the PUBLIC (CF) build; the server never runs inference.** The app is text-only and the WebUI calls the user's llama-server directly from the browser (client-side fetch, `design/inference-providers.md`). Static export for Cloudflare Pages; the export build moves `src/app/api` out of the tree during `next build`. The local **node targets** (Docker, local Linux, WebView2 .exe — D6) run the full build, which adds an **OpenAI-compatible translation shim** (`/api/v1/chat/completions`, `/v1/models`) for external clients (e.g. translation extensions): a proxy to the user's llama-server only — inference still never runs on the app's server, and CF stays static-only (a CF function couldn't reach a LAN llama-server, and relaying text through a third-party edge would break rule 10). design/local-deployment.md §API shim.
10. **Privacy:** zero external requests except (a) user-initiated model downloads from `huggingface.co`, (b) inference calls to a llama-server endpoint the user themselves configured in Settings (opt-in; never sent anywhere else; the endpoint string stays in localStorage). No analytics, no cookies, no telemetry. Keys/settings in localStorage only.
11. **Never install toolchains, compile, or package on the dev machine.** Docker images build on the Forgejo runner `root@192.168.1.12`; the Windows exe builds on GitHub Actions `windows-latest` (D5) once the GitHub repo lands — `design/ci-build.md`.
12. **Never change the local obscura container's port or restart it ad-hoc.** The obscura browser container (`obscura-cjk` compose) owns host port **3000**; the obscura skill (used by OTHER agents on this host) hardcodes `http://192.168.1.15:3000/mcp`, so remapping the port silently breaks every other agent's obscura calls. If another local service needs 3000, move THAT service — this is why the translate dev server runs on **3001** and the HTTPS proxy points there (`PROXY_TARGET=127.0.0.1:3001`). Restart obscura only via its own `docker compose` (default `0.0.0.0:3000:3000`), never `docker run`. Incident 2026-09-22: obscura was ad-hoc restarted on `-p 3010:3000` because the translate server held 3000, breaking all skill-based calls until it was restored from the compose file.

## Development Conventions

### Change control (owner rule, 2026-09-22)

- **NEVER write or modify code without the owner's explicit permission.** Questions and "is this possible?" are discussion, not work orders — propose the approach, wait for the go-ahead, then implement. Incidental files (tests/docs) may only be touched as part of an explicitly approved change.

### Code Style

- **No comments** unless explicitly requested by user
- Use TypeScript `interface` over `type` for object shapes
- Prefer named exports over default exports
- Use `async/await` over raw Promises
- File naming: `kebab-case` for files, `PascalCase` for components

### File Organization

- `TODO.md` — pending work + priorities ONLY (no implementation details; last 5 completed items at the bottom, older history lives in git log)
- `design/` — implementation details, one .md per work unit
- `src/lib/` — Pure logic, no React
- `src/components/` — React components (one component per file)
- `src/hooks/` — Custom React hooks
- `src/app/` — Next.js App Router pages

### State Management

- React Context for global state (settings — `use-app-settings`, languages); theme via `use-theme` hook
- `localStorage` for settings persistence
- Cache API for WebGPU model files (`src/lib/model-cache.ts`)

### UI Guidelines

- Dark theme by default; top-right header cluster: UI language dropdown → dark/light toggle (persisted) → GitHub icon (reserved placeholder until repo URL set) → Settings — design/ui-ux.md
- Material Design components via MUI
- Responsive: mobile-first, breakpoints at `sm`, `lg`, `xl`
- Loading states for all async operations
- Error boundaries for graceful failure

## Build & Run

```bash
# Install dependencies (transformers.js stays EXACT-pinned — see rule 1)
npm install

# Development (port 3001 — host 3000 belongs to the obscura container, rule 12)
npm run dev -H 0.0.0.0 -p 3001

# Production build — self-hosted (full)
npm run build && npm start

# Production build — static export for Cloudflare Pages
npm run build:export      # NEXT_STATIC_EXPORT=1; output in /out

# Optional — HTTPS test server (secure context so WebGPU works over LAN IP)
HTTPS_PORT=3443 PROXY_TARGET=127.0.0.1:3001 node scripts/https-test-server.mjs   # https://<lan-ip>:3443 -> dev server on 3001
```

**Dual build mode:** `next.config.ts` reads `NEXT_STATIC_EXPORT=1` to toggle `output: 'export'`. If any API routes exist, the export build moves `src/app/api` out of the tree during the build (stale `.next/dev/types/validator.ts` will fail type-check otherwise — delete `.next/dev` first).

**Post-build check (mandatory for CF deploy):** `find out -name "*.wasm*" -exec du -h {} +` — every file must be < 25 MiB (ort wasm lands in `out/_next/static/media/`).

## Deployment

Local targets (decisions D1–D4 settled 2026-09-21, D5 2026-09-22): **Windows 11 WebView2 .exe wrapper** (C# .NET 8, config.json in exe dir → bind IP/port, statics embedded, WebView loads `127.0.0.1` for WebGPU), **Docker/compose** (linux/amd64 + arm64, multi-stage node→nginx, self-signed TLS mode required), **local non-Docker Linux** (serve `/out`; localhost is a secure context) — `design/local-deployment.md`. Docker images build on the Forgejo runner `root@192.168.1.12`; the Windows exe on GitHub Actions `windows-latest` (D5) once the GitHub repo lands — **never on the dev machine** — `design/ci-build.md`.

Cloudflare Pages, static export. See `design/deployment.md` for the deploy script pattern, secrets policy (no credentials in repo; `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from environment), and the two-project test/prod policy:

- **Default runs deploy to the TEST project only.** Production gets `--prod` only on explicit owner request.
- Deploy script passes `--branch main` to wrangler so deploys from any local branch (e.g. `DEV`) produce real PRODUCTION deployments of the target project — without it, a non-`main` local branch creates a PREVIEW deployment the custom domain never serves.
- One-command deploy: `node scripts/deploy-pages.mjs` / `--prod` (script to be written in phase 1; see TODO.md).

## Common Tasks

### Add a new translation model

1. Add to `WEBGPU_MODELS` (or equivalent) in `src/lib/model-catalog.ts` with HF-verified `sizeBytes` and per-model `filePatterns` (note subdirectory paths, e.g. `onnx/`)
2. Update the model list in Settings (download dialog + current-model display)
3. Test in a real browser (secure context): download progress, load phase, translate one short sentence + one long paragraph in at least two language pairs

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
