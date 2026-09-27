# TODO

## Pending

| # | Task | Priority |
|---|------|----------|
| 18 | vLLM provider (reserved, lowest priority — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client (OpenAI-compatible) + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md | P3 |

| 9 | Deploy script `scripts/deploy-pages.mjs` (secrets via env, `--branch main`, test/prod split) + Cloudflare projects/domains (TBD) — design/deployment.md | P2 |
| 10a | Windows 11 WebView2 wrapper — **C# launcher skeleton**: WinForms + `Microsoft.Web.WebView2` NuGet, `config.json` read/write (first-run defaults: bind_ip, port, shim keys), node child-process launch + port-ready HTTP poll, WebView2 window → `http://127.0.0.1:<port>`, clean shutdown (kill child on window close). Deliverable: `dotnet run` opens a WebView pointing at the dev box 3001 — design/local-deployment.md §Target 1 sub-tasks | P1 |
| 10b | Windows 11 WebView2 wrapper — **static payload + built-in HTTP server (D7)**: `npm run build:export` → `web/` folder next to the exe; C# `HttpListener` static file server (MIME + SPA fallback); launcher `serve` mode replaces 10a's node `managed` mode; distribution = **zip folder** (exe + `web/`, no embedded resources, no node) — design/local-deployment.md §Target 1 sub-tasks | P1 |
| 10c | Windows 11 WebView2 wrapper — **GitHub Actions workflow** (`.github/workflows/exe.yml`, `windows-latest`): `dotnet publish -r win-x64 --self-contained -c Release` + `npm run build:export` → package **zip folder** (exe + `web/`) → smoke test job (launch exe, wait port-ready, `curl /` = 200 — static build, no API routes) → upload to Codeberg generic package — design/ci-build.md | P1 |
| 10d | Windows 11 WebView2 wrapper — **real Win11 integration test**: double-click on clean machine → `config.json` created → WebView opens → WebGPU translation works (loopback) → LAN device can reach the server; owner provides the test machine — design/local-deployment.md §Target 1 acceptance criteria | P1 |
| 11 | Docker multi-stage (node **full/standalone** build + wasm check → node runtime, nginx optional TLS, D6) + compose (env shim config + optional llama.cpp service) + buildx linux/amd64,arm64; self-signed TLS auto-generation on first boot required — design/local-deployment.md | P2 |
| 12 | Local non-Docker Linux serving (full build + `npm start`, Caddy/nginx optional TLS, D6): docs + optional `scripts/serve-local.sh` — design/local-deployment.md | P2 |
| 19 | OpenAI-compatible API shim for the **node targets** (Docker / local Linux — D6; the .exe is static per D7 — a future .exe shim would be a C# `HttpListener` sub-task; CF stays static-only): `/api/v1/chat/completions` + `/v1/models`, server-side prompt-profile reuse (#16/#17), server config `LLAMA_BASE_URL`/`MODEL_PRESET`/`SYSTEM_PROMPT`/`API_TOKEN` (env/.env/config.json per target), optional llama.cpp compose service — design/local-deployment.md §API shim | P2 |
| 13 | Forgejo workflows: docker image build on runner `192.168.1.12` (multi-arch) publishing to Codeberg registry ONLY (local Forgejo never stores artifacts) + GitHub Actions mirror (repo landed 2026-09-26 — `.forgejo/workflows/` and `.github/workflows/` kept in lockstep); exe workflow (D5 host settled) — design/ci-build.md | P2 |
| 23 | TTS on-demand read-aloud (input + output text, user-initiated, never auto): **A** local Kokoro-82M ONNX (kokoro-js, English-only in mainline) + **B** Web Speech API (Chinese, opt-in, OS-dependent) — design/tts.md; **C** (uzen-zone zh fork) / **D** (MeloTTS standalone pipeline) = optional evaluation only; ZeroGPU excluded (privacy + feature mismatch) | P3 |

## Completed (most recent 5; older history lives in git log)

| Task |
|------|
| i18n zh-TW (default) + en (TODO #7) — `useI18n` hook + `translations.ts`, 7 components via `t()`, verified 12/12 — design/i18n.md |
| Custom system prompt (TODO #17) — both backends, profile-aware `buildMessages`, per-backend UI field, verified 13/13 — design/inference-providers.md §Prompts |
| Workspace persistence (TODO #22) — input + output survive reload, verified 9/9 — design/ui-ux.md §Workspace persistence |
| Settings (TODO #6, owner-accepted) — `settings-dialog.tsx` tabs + `use-app-settings` hook — ui-ux.md Implementation notes |
| HTTPS LAN test server (TODO #8) — `scripts/https-test-server.mjs`, single-Host ws forwarding — AGENTS rule 5, design/browser-testing.md |

