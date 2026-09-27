# TODO

## Pending

### P1

| # | Task |
|---|------|
| 11 | Docker (D8 — **static**): multi-stage `build:export` + wasm check → `nginx:alpine` (self-signed TLS auto-generation on first boot required) + compose (port mapping, healthcheck, cert volume — no env config, no llama.cpp service) + buildx linux/amd64,arm64 — design/local-deployment.md |

### P2

| # | Task |
|---|------|
| 9+24+25 | **Public static hosts (do together)**: Cloudflare Pages (`scripts/deploy-pages.mjs`, secrets via env, `--branch main`) + GitHub Pages (Actions workflow, decide repo-root vs subpath) + HF Space (Static Space + workflow pushing `/out`) — design/deployment.md, design/local-deployment.md §Target 4 |
| 13 | Forgejo workflows: docker image build on runner `192.168.1.12` (multi-arch) publishing to Codeberg registry ONLY + GitHub Actions mirror (repo landed 2026-09-26 — `.forgejo/workflows/` and `.github/workflows/` kept in lockstep); exe workflow (D5 host settled) — design/ci-build.md |
| 12 | Local non-Docker Linux serving (D8 — **static**): `npm run build:export` → serve `/out` (any static server; Caddy/nginx optional TLS): docs + optional `scripts/serve-local.sh` — design/local-deployment.md |

### P3

| # | Task |
|---|------|
| 18 | vLLM provider (reserved — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md |
| 23 | TTS on-demand read-aloud (input + output text, user-initiated, never auto): **A** local Kokoro-82M ONNX (kokoro-js, English-only in mainline) + **B** Web Speech API (Chinese, opt-in, OS-dependent) — design/tts.md; **C** / **D** = optional evaluation only; ZeroGPU excluded |
| 10a–10d | **PAUSED (owner 2026-09-26; blueprint stands)** — Windows 11 WebView2 wrapper (10a skeleton → 10b static server → 10c CI → 10d integration test) — design/local-deployment.md §Target 1, design/ci-build.md |

## Completed (most recent 5; older history lives in git log)

| Task |
|------|
| Export-only build (TODO #26, D8) — `next.config.ts` fixed to `output: 'export'`, removed `build`/`start` scripts + `NEXT_STATIC_EXPORT` toggle + dead api-stash logic; verified build + wasm 10M + dev smoke |
| i18n zh-TW (default) + en (TODO #7) — `useI18n` hook + `translations.ts`, 7 components via `t()`, verified 12/12 — design/i18n.md |
| Custom system prompt (TODO #17) — both backends, profile-aware `buildMessages`, per-backend UI field, verified 13/13 — design/inference-providers.md §Prompts |
| **API provider DROPPED (D8, owner 2026-09-26)** — no server-side OpenAI shim: WebGPU is browser-only (server ONNX = CPU-only, too slow); extensions point at the user's own llama-server directly; **all targets static** — design/local-deployment.md §API provider |
| Workspace persistence (TODO #22) — input + output survive reload, verified 9/9 — design/ui-ux.md §Workspace persistence |

