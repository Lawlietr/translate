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
| Default (tentative) | `LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror` | Hy-MT2 1.8B, q4f16, ~1.29 GiB, fastest on modest GPUs — design/model-catalog.md |
| Optional | `onnx-community/translategemma-text-4b-it-ONNX` (**q4 variant only, tentative**) | stronger translator, ~2.90 GiB, files under an `onnx/` subdir, pin `dtype: 'q4'` — design/model-catalog.md |

A third backend, **vLLM, is reserved but NOT implemented** (lowest priority, TODO #18; gated until the WebGPU and llama-server backends are verified working in a real browser) — `design/inference-providers.md`. Both WebGPU models are text-only causal LMs (`AutoModelForCausalLM`, greedy, capped `max_new_tokens`, chat-template-driven) — loader/size/dtype details in `design/model-catalog.md`.

## Non-negotiable rules (learned in what-do-you-see)

1. **Pin `@huggingface/transformers` to an EXACT version (no `^`).** The 4.3.0 bump pulled `onnxruntime-web` 1.24.1 → `ort-wasm-simd-threaded.async-*.wasm` = 25.6 MiB → Cloudflare Pages rejects any single file > 25 MiB (413 on the wasm, upload fails per-file). Baseline known-good: **4.2.0** (wasm 17.82 MiB). Before ANY upgrade: build, then `find out -name "*.wasm*" -exec du -h {} +` (in a Next 16 + transformers.js 4.2.0 build the ort wasm lands in `out/_next/static/media/`, not `chunks/`) and check every file < 25 MiB.
2. **Never download a model implicitly.** The only download entry point is the user-initiated "Manage models" dialog in Settings. The inference path gates on a verified-complete cache and throws a clear "download it from Settings first" error when the cache is incomplete. `from_pretrained` (which silently fetches missing files from HF) only ever runs on a complete cache.
3. **Model downloads are streamed + cancellable.** HF tree API (`/api/models/{id}/tree/main?recursive=true`) lists files → filter per-model `filePatterns` → each file fetched with `AbortController`, chunk-by-chunk progress + speed → stored in the Cache API under key `https://huggingface.co/{modelId}/resolve/main/{path}` (transformers.js default `env.cacheKey` = `transformers-cache`) → then a separate `loading` phase (first WebGPU run compiles shaders, can take minutes — show a spinner, not a frozen progress bar). Speed display clamped to a 10 GB/s sanity cap. A partial cache is reported as "not downloaded"; re-download skips already-cached files.
4. **Verify model sizes from the HF tree API** (sum of the exact files transformers.js will load, per submodel + external-data shards + JSON/tokenizer files). Displayed bytes must match the cache verification bytes. (Re-verified live 2026-09-21 during #3/#4: both models' matched file lists sum byte-for-byte to the catalog values.)
5. **Secure context required for WebGPU** (`https://` or `localhost`). **The user tests from a DIFFERENT machine than the dev box** — every local server for browser testing (Next dev/preview, HTTPS proxy) must bind `0.0.0.0` (e.g. `npm run dev -H 0.0.0.0`), never localhost-only; LAN testing goes through the self-signed HTTPS proxy (`scripts/https-test-server.mjs`, `PROXY_TARGET=127.0.0.1:3001`). **Watch dev-box disk space** (`rm -rf .next out` after verification). **A dead-looking page (frozen "checking WebGPU…", dead buttons, spurious WebGPU error) is almost always NOT hydrated, not a GPU problem** — check hydration before blaming browser/GPU/OS (`webgpu-knowledge.md` §3). **Automated browser verification: use the `playwright` skill** (remote MCP, headless Chromium) — full setup, the 3001-vs-3443 rule, the stale-browser `force-recreate` fix, the Next-16 dev hydration preconditions, and the Obscura quirk are in `design/browser-testing.md`. **WebGPU functional / A/B verification happens in the owner's real browser** (SwiftShader on 12 is too slow).
6. **Never detect model classes by `constructor.name`** — the production bundle is minified (class names become `ut`, `A`, …) and the branch silently never fires. Detect by model-id string / repo prefix.
7. **Cap `max_new_tokens`.** Weak/translation LLMs in-browser grind the full budget when EOS comes late. 2048–3072 is the ceiling; a 4B model at 3072 tokens can take minutes on modest GPUs.
8. **Keep model-facing prompts/instructions in English; never mix UI language into the instruction text. Message STRUCTURE is per-model — each model gets its own prompt profile (Hy-MT2 = official Default Translation single user message; TranslateGemma = structured list content, no system message, template-generated instruction; generic fallback), selected by model-id — see `design/inference-providers.md` §Prompts.** Small models (≤2B) can lock into an output-language loop (verified twice with LFM2.5 450M: zh instruction line → infinite repetition; English instruction + trailing output-language line → works). WebGPU fp16 failure modes are NOT reproducible on CPU — A/B-test prompt changes in the real browser, or not at all. **Verify chat-template requirements from the actual `chat_template.jinja` in the model repo before designing message formats** (TranslateGemma's template `raise_exception`s on system messages and plain-string user content — discovered 2026-09 by reading the shipped template).
9. **No server-side routes in ANY build; no target runs inference.** The app is text-only and the WebUI calls the user's llama-server directly from the browser (client-side fetch, `design/inference-providers.md`). **Every deployment target serves the static export** (`build:export` → `/out`): Cloudflare Pages, GitHub Pages, HF Space, Docker (nginx), local Linux (serve `/out`), Windows .exe (C# `HttpListener` — D7, paused). The API-provider idea (server-side OpenAI shim, was #19) was **dropped 2026-09-26 (D8)**: WebGPU is browser-only and extensions point at the user's own llama-server directly. design/local-deployment.md §API provider.
10. **Privacy:** zero external requests except (a) user-initiated model downloads from `huggingface.co`, (b) inference calls to a llama-server endpoint the user themselves configured in Settings (opt-in; never sent anywhere else; the endpoint string stays in localStorage). No analytics, no cookies, no telemetry. Keys/settings in localStorage only.
11. **Never install toolchains, compile, or package on the dev machine.** Docker images build on the Forgejo runner `root@192.168.1.12`; the Windows exe builds on GitHub Actions `windows-latest` (D5) — `design/ci-build.md`.
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

- Dark theme by default; top-right header cluster: UI language dropdown → dark/light toggle (persisted) → GitHub icon → repo (`src/lib/site.ts` `GITHUB_REPO_URL`) → Settings — design/ui-ux.md
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

# Production build — ALL targets (static export; D8)
npm run build:export      # static export; output in /out; serve /out with any static server

# Optional — HTTPS test server (secure context so WebGPU works over LAN IP)
HTTPS_PORT=3443 PROXY_TARGET=127.0.0.1:3001 node scripts/https-test-server.mjs   # https://<lan-ip>:3443 -> dev server on 3001
```

**Export-only build (D8):** `next.config.ts` is fixed to `output: 'export'` — the full-build mode was removed (TODO #26, 2026-09-26). If API routes are ever added, the export build fails loudly — that is the intended signal.

**Post-build check (mandatory for CF deploy):** `find out -name "*.wasm*" -exec du -h {} +` — every file must be < 25 MiB (ort wasm lands in `out/_next/static/media/`).

## Deployment

All targets serve the **static export** (D1–D8 settled; see `design/local-deployment.md`): **Docker/compose** (nginx + self-signed TLS, linux/amd64 + arm64), **local non-Docker Linux** (serve `/out`), **Windows 11 WebView2 .exe** (C# .NET 8, zip folder + built-in C# HTTP server — D7, **paused**). Public static hosts: **Cloudflare Pages**, **GitHub Pages**, **HF Space**.

Build location (rule 11): Forgejo runner `192.168.1.12` for Docker images; GitHub Actions `windows-latest` for the exe (paused) — `design/ci-build.md`.

Cloudflare deploy policy — `design/deployment.md` for the deploy-script pattern + secrets policy (no credentials in repo; `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from env):

- **Default runs deploy to the TEST project only.** Production gets `--prod` only on explicit owner request.
- Deploy script passes `--branch main` to wrangler so deploys from any local branch (e.g. `DEV`) produce real PRODUCTION deployments — without it, a non-`main` branch creates a PREVIEW deployment the custom domain never serves.
- One-command deploy: `node scripts/deploy-pages.mjs` / `--prod` (TODO #9).

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
