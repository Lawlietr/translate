# TODO

## Pending

| # | Task | Priority |
|---|------|----------|
| 1 | Write `src/lib/model-catalog.ts` with the verified entries from design/model-catalog.md (both models verified 2026-09-21) | P0 |
| 2 | Scaffold: Next.js 16 + TS + Tailwind v4 + MUI v9 + EXACT-pinned `@huggingface/transformers@4.2.0`; dual build (self-hosted / `build:export` with wasm <25 MiB check); git init + remotes (TBD) | P0 |
| 3 | Model download pipeline (HF tree → filtered abortable streamed fetch → Cache API `transformers-cache`, keys incl. subpaths; `cachedModelState` gate; user-initiated only) — design/webgpu-knowledge.md §2 | P0 |
| 4 | Translation pipeline: `AutoTokenizer` + `AutoModelForCausalLM`, chat-template instruction (English), greedy, capped + source-sized `max_new_tokens`, AbortController cancel, `powerPreference` patch — design/webgpu-knowledge.md §3. Build order: minimal harness page first (model pick, download, translate I/O, status) to prove the stack in a real browser; full UI (#5) only after | P0 |
| 5 | Core UI per design/ui-ux.md (input/output, language pickers, swap, states, status footer) | P1 |
| 6 | Settings: model selection + Manage models dialog, UI language, defaults — persist to localStorage | P1 |
| 7 | i18n zh-TW (default) + en: 1:1 port of what-do-you-see in-house pattern, header dropdown, instant switch — design/i18n.md | P2 |
| 8 | HTTPS LAN test server (`scripts/https-test-server.mjs` pattern) for browser verification | P2 |
| 9 | Deploy script `scripts/deploy-pages.mjs` (secrets via env, `--branch main`, test/prod split) + Cloudflare projects/domains (TBD) — design/deployment.md | P2 |
| 10 | Windows 11 WebView2 wrapper .exe (C# .NET 8, statics embedded): first-run `config.json` in exe dir (bind_ip/port), in-process static server, WebView on `http://127.0.0.1:<port>` — design/local-deployment.md; build host TBD (D5) | P1 |
| 11 | Docker multi-stage (node build + wasm check → nginx) + compose + buildx linux/amd64,arm64; self-signed TLS auto-generation on first boot required — design/local-deployment.md | P2 |
| 12 | Local non-Docker Linux serving: docs + optional `scripts/serve-local.sh` — design/local-deployment.md | P2 |
| 13 | Forgejo workflows: docker image build on runner `192.168.1.12` (multi-arch) publishing to Codeberg registry ONLY (local Forgejo never stores artifacts) + GitHub Actions mirror when repo lands; exe workflow once D5 build host decided — design/ci-build.md | P2 |

## Completed

| Task |
|------|
| Project docs created: AGENTS.md, TODO.md, design/ (webgpu-knowledge, model-catalog, deployment, ui-ux) — WebGPU knowledge transferred from what-do-you-see |
| Decision: translategemma pinned to q4 variant (3,111,911,678 B) — file lists + bytes verified via HF tree API, rationale in design/model-catalog.md |
| Decision: default model = `LunarOilRig/Hy-MT2-1.8B-ONNX-q4f16-mirror` (1,383,140,565 B); justinchuby original rejected (onnxruntime-genai layout, no root model files) — rationale in design/model-catalog.md |
| Local-deployment decisions D1–D4 settled (C# .NET 8 / embedded / self-signed required / builds on Forgejo runner 192.168.1.12, never local) + D5 (exe build host) opened — design/local-deployment.md, design/ci-build.md |
| codeberg remote added (`Lawlietr/translate`) + pushed; remotes documented in design/deployment.md |
| License finalized: **AGPL-3.0 single license** — `LICENSE` added (full GNU text); scope + third-party/WebView2/model boundaries noted in AGENTS.md |
