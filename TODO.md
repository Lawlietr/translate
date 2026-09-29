# TODO

## Pending

### P2

| # | Task |
|---|------|
| 13 | **GitHub Actions CI/CD (Docker + GH Pages done 2026-09-29):** `main` push → Docker (amd64+arm64 → GHCR + Codeberg + Release) + GH Pages (static export → `lawlietr.github.io/translate/`); `DEV` push → Docker CI check. **Remaining:** exe workflow (D5, paused with #10); optional — auto-deploy CF Pages (`scripts/deploy-pages.mjs` exists; needs CF token in secrets) + HF Space (build+`hf upload`, `HF_TOKEN` **already in the repo secrets** 2026-09-29) on `main` push — design/ci-build.md, design/deployment.md |

### P3

| # | Task |
|---|------|
| 18 | vLLM provider (reserved — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md |
| 23 | TTS on-demand read-aloud (input + output text, user-initiated, never auto): **A** local Kokoro-82M ONNX (kokoro-js, English-only in mainline) + **B** Web Speech API (Chinese, opt-in, OS-dependent) — design/tts.md; **C** / **D** = optional evaluation only; ZeroGPU excluded |
| 10a–10d | **PAUSED (owner 2026-09-26; blueprint stands)** — Windows 11 WebView2 wrapper (10a skeleton → 10b static server → 10c CI → 10d integration test) — design/local-deployment.md §Target 1, design/ci-build.md |

## Completed (most recent 5; older history lives in git log)

| Task |
|------|
| **Public static hosts (TODO #9+24+25, 2026-09-29)** — all three live: **Cloudflare Pages** (`scripts/deploy-pages.mjs`; TEST `translate-test-9u0.pages.dev`, PROD `translate-4j9.pages.dev` + custom domain `translate.avpclub.eu.org`; wrangler 4.x `--force` static-Pages flag, CNAME + Google-CA TLS auto-issued), **GitHub Pages** (`pages.yml` workflow; `basePath=/translate` via `NEXT_BASE_PATH`; `build_type: workflow` enabled via API; `lawlietr.github.io/translate/`), **HF Space** (public static, `huggingface.co/spaces/lawlietr/translate`; `hf` CLI 2.0.0, pre-built `out/` + frontmatter `app_file: index.html`, same-origin model downloads) — design/deployment.md |
| **Docker deployment (TODO #11, 2026-09-29)** — multi-stage `Dockerfile` (`build:export` + wasm < 25 MiB gate → `nginx:alpine` + `apk add openssl`), nginx SPA-fallback + dual 80/443, first-boot self-signed cert entrypoint (D3 mode 2), compose (8080/8443 + cert volume + healthcheck); **all builds in GitHub Actions** (runner can't do arm64) → `main` push publishes amd64+arm64 to **both** `ghcr.io` + `codeberg.org` + GitHub Release, `DEV` push = CI check; amd64 verified on runner (HTTP/HTTPS/SPA/wasm/cert); **owner's real-browser LAN WebGPU acceptance PASSED** (`https://192.168.1.12:8443`); GHA `main` run published amd64+arm64 to both registries + Release `v2026.09.29-0df78d9`; runner leftovers cleaned — design/local-deployment.md, design/ci-build.md |
| **Translation history (TODO #27, owner spec 2026-09-28)** — left drawer (squeeze layout, full-height sticky) below the translation block; 100-entry localStorage store with dedupe-by-text+pair + 2,000-char gate + success-only; single/multi-select/clear-all deletion (shared confirm dialog); click-to-restore (text + output + both language selects); Settings → General → Privacy block above Diagnostics ("never record" switch + delete-all with count); drawer open state persists (`translate:historyOpen`, written only in the explicit toggle — StrictMode pitfall); history state refreshes when Settings closes; 12/12 Playwright regression on the production export — design/history.md, design/ui-ux.md |
| Activity-log sticky-bottom autoscroll (owner 2026-09-28) — follows new lines while view is at bottom (8 px tolerance), pauses on manual scroll-up, resumes on scroll-to-bottom; `followRef` (no re-render on scroll) + post-render `useEffect` on `lines` — design/ui-ux.md §Diagnostics |
| Three visual layers (owner 2026-09-28) — header `py-4` + hairline `border-b`; new `AppFooter` pinned to viewport bottom (`min-h-screen` + `flex-1` content wrapper) with **AGPL-3.0 → GNU official** + privacy line (2 i18n keys × 4 locales); redundant in-block "nothing leaves this device" caption removed (5 keys, 94 total); `<html lang>` follows UI language (server default zh-TW, client sync post-hydration); header GitHub icon now links to the repo (`GITHUB_REPO_URL`); timer terminal-value stale-closure bug fixed (local `started` const) — design/ui-ux.md, design/i18n.md |

