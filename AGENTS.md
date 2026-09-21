# AGENTS.md — Translate (WebGPU)

## Project Overview

A local, privacy-first translation web app — a **"Google Translate" clone that runs entirely in the user's browser** on WebGPU. Type text → a small multilingual LLM (ONNX, via `@huggingface/transformers`) translates it locally → result shown in the output box.

**Key difference from cloud translation:** all inference runs on the user's own GPU (WebGPU). No text leaves the browser, no server-side processing, no tracking.

**This project inherits hard-won WebGPU knowledge from the sibling project `what-do-you-see` (same host, photo-privacy analyzer).** Every non-obvious rule in this file and in `design/` comes from a production bug we already hit and fixed there — read `design/webgpu-knowledge.md` before touching model loading, downloads, or inference code. Do NOT re-derive those pitfalls from scratch.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) — see `node_modules/next/dist/docs/` before writing code |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (CSS-first, no config file) + Material UI v9 |
| AI (Browser) | `@huggingface/transformers` + WebGPU (ONNX format) |
| Model Storage | Cache API (`transformers-cache`) for ONNX files |
| Settings | localStorage |

No EXIF, no image handling, no maps, no backend inference. Text in, text out.

## AI Models

Catalogued in `src/lib/model-catalog.ts`. **Sizes must be verified from the HF tree API before being hardcoded** — see `design/model-catalog.md` for method and current status.

| Mode | Model ID | Notes |
|------|----------|-------|
| Default (tentative) | `justinchuby/Hy-MT2-1.8B-ONNX` | smaller, faster on modest GPUs |
| Optional | `onnx-community/translategemma-text-4b-it-ONNX` | stronger translator; **files live in an `onnx/` SUBDIRECTORY of the repo** — file paths, HF tree queries, and cache keys all include that subpath |

Both are text-only causal-LM translation models: `AutoTokenizer` + `AutoModelForCausalLM` (NOT `AutoModelForImageTextToText`, no image processor). Translation is driven through each model's own chat template + a short instruction ("translate … to …"), greedy decoding, with a capped `max_new_tokens`.

## Non-negotiable rules (learned in what-do-you-see)

1. **Pin `@huggingface/transformers` to an EXACT version (no `^`).** The 4.3.0 bump pulled `onnxruntime-web` 1.24.1 → `ort-wasm-simd-threaded.async-*.wasm` = 25.6 MiB → Cloudflare Pages rejects any single file > 25 MiB (413 on the wasm, upload fails per-file). Baseline known-good: **4.2.0** (wasm 17.82 MiB). Before ANY upgrade: build, then `du -sh out/_next/static/chunks/*.wasm*` and check every file < 25 MiB.
2. **Never download a model implicitly.** The only download entry point is the user-initiated "Manage models" dialog in Settings. The inference path gates on a verified-complete cache and throws a clear "download it from Settings first" error when the cache is incomplete. `from_pretrained` (which silently fetches missing files from HF) only ever runs on a complete cache.
3. **Model downloads are streamed + cancellable.** HF tree API (`/api/models/{id}/tree/main?recursive=true`) lists files → filter per-model `filePatterns` → each file fetched with `AbortController`, chunk-by-chunk progress + speed → stored in the Cache API under key `https://huggingface.co/{modelId}/resolve/main/{path}` (transformers.js default `env.cacheKey` = `transformers-cache`) → then a separate `loading` phase (first WebGPU run compiles shaders, can take minutes — show a spinner, not a frozen progress bar). Speed display clamped to a 10 GB/s sanity cap. A partial cache is reported as "not downloaded"; re-download skips already-cached files.
4. **Verify model sizes from the HF tree API** (sum of the exact files transformers.js will load, per submodel + external-data shards + JSON/tokenizer files). Displayed bytes must match the cache verification bytes.
5. **Secure context required for WebGPU** (`https://` or `localhost`). LAN testing goes through a self-signed HTTPS proxy (`scripts/https-test-server.mjs` pattern; `fuser -k <port>/tcp` to stop — `pkill -f` self-matches its own command line).
6. **Never detect model classes by `constructor.name`** — the production bundle is minified (class names become `ut`, `A`, …) and the branch silently never fires. Detect by model-id string / repo prefix.
7. **Cap `max_new_tokens`.** Weak/translation LLMs in-browser grind the full budget when EOS comes late. 2048–3072 is the ceiling; a 4B model at 3072 tokens can take minutes on modest GPUs.
8. **Keep model-facing prompts/instructions in English; never mix UI language into the instruction text.** Small models (≤2B) can lock into an output-language loop (verified twice with LFM2.5 450M: zh instruction line → infinite repetition; English instruction + trailing output-language line → works). WebGPU fp16 failure modes are NOT reproducible on CPU — A/B-test prompt changes in the real browser, or not at all.
9. **No server-side routes in the public build.** Static export for Cloudflare Pages; self-hosted full build is a separate script that moves API routes out of the tree during `next build` when needed.
10. **Privacy:** zero external requests except (a) user-initiated model downloads from `huggingface.co`, (b) nothing else. No analytics, no cookies, no telemetry. Keys/settings in localStorage only.

## Development Conventions

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

- React Context for global state (inference model, languages)
- `localStorage` for settings persistence
- Cache API for WebGPU model files (`src/lib/model-cache.ts`)

### UI Guidelines

- Dark theme by default
- Material Design components via MUI
- Responsive: mobile-first, breakpoints at `sm`, `lg`, `xl`
- Loading states for all async operations
- Error boundaries for graceful failure

## Build & Run

```bash
# Install dependencies (transformers.js stays EXACT-pinned — see rule 1)
npm install

# Development (default port 3000)
npm run dev

# Production build — self-hosted (full)
npm run build && npm start

# Production build — static export for Cloudflare Pages
npm run build:export      # NEXT_STATIC_EXPORT=1; output in /out

# Optional — HTTPS test server (secure context so WebGPU works over LAN IP)
node scripts/https-test-server.mjs   # https://<lan-ip>:3443 -> http://127.0.0.1:3000
```

**Dual build mode:** `next.config.ts` reads `NEXT_STATIC_EXPORT=1` to toggle `output: 'export'`. If any API routes exist, the export build moves `src/app/api` out of the tree during the build (stale `.next/dev/types/validator.ts` will fail type-check otherwise — delete `.next/dev` first).

**Post-build check (mandatory for CF deploy):** `du -sh out/_next/static/chunks/*.wasm*` — every file must be < 25 MiB.

## Deployment

Cloudflare Pages, static export. See `design/deployment.md` for the deploy script pattern, secrets policy (no credentials in repo; `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from environment), and the two-project test/prod policy:

- **Default runs deploy to the TEST project only.** Production gets `--prod` only on explicit owner request.
- Deploy script passes `--branch main` to wrangler so deploys from any local branch (e.g. `DEV`) produce real PRODUCTION deployments of the target project — without it, a non-`main` local branch creates a PREVIEW deployment the custom domain never serves.
- One-command deploy: `node scripts/deploy-pages.mjs` / `--prod` (script to be written in phase 1; see TODO.md).

## Common Tasks

### Add a new translation model

1. Add to `WEBGPU_MODELS` (or equivalent) in `src/lib/model-catalog.ts` with HF-verified `sizeBytes` and per-model `filePatterns` (note subdirectory paths, e.g. `onnx/`)
2. Update the model list in Settings (download dialog + current-model display)
3. Test in a real browser (secure context): download progress, load phase, translate one short sentence + one long paragraph in at least two language pairs
