# TODO

## Pending

| # | Task | Priority |
|---|------|----------|
| 18 | vLLM provider (reserved, lowest priority — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client (OpenAI-compatible) + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md | P3 |

| 9 | Deploy script `scripts/deploy-pages.mjs` (secrets via env, `--branch main`, test/prod split) + Cloudflare projects/domains (TBD) — design/deployment.md | P2 |
| 10a | **PAUSED (owner 2026-09-26; blueprint stands) —** Windows 11 WebView2 wrapper — C# launcher skeleton (code written in `wrapper/`, not compiled) — design/local-deployment.md §Target 1 sub-tasks | P3 |
| 10b | **PAUSED (owner 2026-09-26; blueprint stands) —** Windows 11 WebView2 wrapper — static payload + built-in C# `HttpListener` static server (D7), zip folder distribution — design/local-deployment.md §Target 1 sub-tasks | P3 |
| 10c | **PAUSED (owner 2026-09-26; blueprint stands) —** Windows 11 WebView2 wrapper — GitHub Actions workflow (`windows-latest`, zip folder packaging, smoke test) — design/ci-build.md | P3 |
| 10d | **PAUSED (owner 2026-09-26; blueprint stands) —** Windows 11 WebView2 wrapper — real Win11 integration test (owner provides the machine) — design/local-deployment.md §Target 1 acceptance criteria | P3 |
| 11 | Docker (D8 — **static**): multi-stage `build:export` + wasm check → `nginx:alpine` (self-signed TLS auto-generation on first boot required) + compose (port mapping, healthcheck, cert volume — no env config, no llama.cpp service) + buildx linux/amd64,arm64 — design/local-deployment.md | P2 |
| 12 | Local non-Docker Linux serving (D8 — **static**): `npm run build:export` → serve `/out` (any static server; Caddy/nginx optional TLS): docs + optional `scripts/serve-local.sh` — design/local-deployment.md | P2 |
| 24 | GitHub Pages deploy (static host, D8): Actions workflow publishing `/out` (build → deploy); decide repo-root vs subpath (`basePath`) — design/local-deployment.md §Target 4 | P2 |
| 25 | HF Space deploy (static host, D8): Static Space + workflow building `/out` and pushing it to the Space repo — design/local-deployment.md §Target 4 | P3 |
| 26 | Cleanup (D8): remove the legacy full-build mode — `next.config.ts` dual mode → export-only; `package.json` scripts (`build`/`start`) no longer needed by any target | P3 |
| 13 | Forgejo workflows: docker image build on runner `192.168.1.12` (multi-arch) publishing to Codeberg registry ONLY (local Forgejo never stores artifacts) + GitHub Actions mirror (repo landed 2026-09-26 — `.forgejo/workflows/` and `.github/workflows/` kept in lockstep); exe workflow (D5 host settled) — design/ci-build.md | P2 |
| 23 | TTS on-demand read-aloud (input + output text, user-initiated, never auto): **A** local Kokoro-82M ONNX (kokoro-js, English-only in mainline) + **B** Web Speech API (Chinese, opt-in, OS-dependent) — design/tts.md; **C** (uzen-zone zh fork) / **D** (MeloTTS standalone pipeline) = optional evaluation only; ZeroGPU excluded (privacy + feature mismatch) | P3 |

## Completed (most recent 5; older history lives in git log)

| Task |
|------|
| i18n zh-TW (default) + en (TODO #7) — `useI18n` hook + `translations.ts`, 7 components via `t()`, verified 12/12 — design/i18n.md |
| Custom system prompt (TODO #17) — both backends, profile-aware `buildMessages`, per-backend UI field, verified 13/13 — design/inference-providers.md §Prompts |
| **API provider DROPPED (D8, owner 2026-09-26)** — no server-side OpenAI shim: WebGPU is browser-only (server ONNX = CPU-only, too slow); extensions point at the user's own llama-server directly; **all targets static** — design/local-deployment.md §API provider |
| Workspace persistence (TODO #22) — input + output survive reload, verified 9/9 — design/ui-ux.md §Workspace persistence |
| Settings (TODO #6, owner-accepted) — `settings-dialog.tsx` tabs + `use-app-settings` hook — ui-ux.md Implementation notes |

