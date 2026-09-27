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
| 13 | Forgejo workflows: docker image build on runner `192.168.1.12` (multi-arch) publishing to **Codeberg registry ONLY — not local Forgejo, not GHCR** (owner reconfirmed 2026-09-26) + GitHub Actions mirror (repo landed 2026-09-26 — `.forgejo/workflows/` and `.github/workflows/` kept in lockstep, GHA pushes to Codeberg too); exe workflow (D5 host settled) — design/ci-build.md |
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
| Activity-log sticky-bottom autoscroll (owner 2026-09-28) — follows new lines while view is at bottom (8 px tolerance), pauses on manual scroll-up, resumes on scroll-to-bottom; `followRef` (no re-render on scroll) + post-render `useEffect` on `lines` — design/ui-ux.md §Diagnostics |
| Three visual layers (owner 2026-09-28) — header `py-4` + hairline `border-b`; new `AppFooter` pinned to viewport bottom (`min-h-screen` + `flex-1` content wrapper) with **AGPL-3.0 → GNU official** + privacy line (2 i18n keys × 4 locales); redundant in-block "nothing leaves this device" caption removed (5 keys, 94 total); `<html lang>` follows UI language (server default zh-TW, client sync post-hydration); header GitHub icon now links to the repo (`GITHUB_REPO_URL`); timer terminal-value stale-closure bug fixed (local `started` const) — design/ui-ux.md, design/i18n.md |
| UI refinement: larger translate/cancel buttons (20px, same size both states) + persistent 0.1 s terminal timer (also on cancel) + stale "generating" status bug fixed (`formatDuration` gained `decimals` param, default 0 for download UI) — design/ui-ux.md §Translation button + timer |
| i18n ja + ko (owner 2026-09-26) — `Language` type + `SUPPORTED_LANGUAGES` + 93 keys × 2 locales; `settings-manager` `UILanguage` now reuses i18n `Language`/normalization (was hard-coded zh-TW/en only, would have silently coerced ja/ko back); verified 7/7 round-trip + persistence + 0 console errors — design/i18n.md |
| Export-only build (TODO #26, D8) — `next.config.ts` fixed to `output: 'export'`, removed `build`/`start` scripts + `NEXT_STATIC_EXPORT` toggle + dead api-stash logic; verified build + wasm 10M + dev smoke |

