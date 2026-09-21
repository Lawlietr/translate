# TODO

## Pending

| # | Task | Priority |
|---|------|----------|
| 1 | Write `src/lib/model-catalog.ts` with the verified entries from design/model-catalog.md (both models verified 2026-09-21) | P0 |
| 2 | Scaffold: Next.js 16 + TS + Tailwind v4 + MUI v9 + EXACT-pinned `@huggingface/transformers@4.2.0`; dual build (self-hosted / `build:export` with wasm <25 MiB check); git init + remotes (TBD) | P0 |
| 3 | Model download pipeline (HF tree → filtered abortable streamed fetch → Cache API `transformers-cache`, keys incl. subpaths; `cachedModelState` gate; user-initiated only) — design/webgpu-knowledge.md §2 | P0 |
| 4 | Translation pipeline: `AutoTokenizer` + `AutoModelForCausalLM`, chat-template instruction (English), greedy, capped + source-sized `max_new_tokens`, AbortController cancel, `powerPreference` patch — design/webgpu-knowledge.md §3 | P0 |
| 5 | Core UI per design/ui-ux.md (input/output, language pickers, swap, states, status footer) | P1 |
| 6 | Settings: model selection + Manage models dialog, UI language, defaults — persist to localStorage | P1 |
| 7 | i18n zh-TW + en (port pattern from what-do-you-see) | P2 |
| 8 | HTTPS LAN test server (`scripts/https-test-server.mjs` pattern) for browser verification | P2 |
| 9 | Deploy script `scripts/deploy-pages.mjs` (secrets via env, `--branch main`, test/prod split) + Cloudflare projects/domains (TBD) — design/deployment.md | P2 |

## Completed

| Task |
|------|
| Project docs created: AGENTS.md, TODO.md, design/ (webgpu-knowledge, model-catalog, deployment, ui-ux) — WebGPU knowledge transferred from what-do-you-see |
| Decision: translategemma pinned to q4 variant (3,111,911,678 B) — file lists + bytes verified via HF tree API, rationale in design/model-catalog.md |
| Decision: default model = `LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror` (1,383,140,565 B); justinchuby original rejected (onnxruntime-genai layout, no root model files) — rationale in design/model-catalog.md |
