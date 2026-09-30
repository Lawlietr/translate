# TODO

## Pending

### P0

_(none — #23 TTS done 2026-09-30, see Completed)_

### P2

| # | Task |
|---|------|
| 28 | **First-run model landing (design done 2026-09-30, not implemented):** full-screen gate when no WebGPU translation model is cached (TTS excluded) — gradient title + info cards + primary download button (per-file progress, cancel/resume) + in-place warm-up phase + secondary buttons (`Use llama-server instead` → Settings Model tab, `Choose model` inline picker); amends rule 2 — design/model-landing.md |
| 13 | **GitHub Actions CI/CD (Docker + GH Pages done 2026-09-29):** `main` push → Docker (amd64+arm64 → GHCR + Codeberg + Release) + GH Pages (static export → `lawlietr.github.io/translate/`); `DEV` push → Docker CI check. **Remaining:** exe workflow (D5, paused with #10); optional — auto-deploy CF Pages (`scripts/deploy-pages.mjs` exists; needs CF token in secrets) + HF Space (build+`hf upload`, `HF_TOKEN` **already in the repo secrets** 2026-09-29) on `main` push — design/ci-build.md, design/deployment.md |

### P3

| # | Task |
|---|------|
| 18 | vLLM provider (reserved — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md |
| 10a–10d | **PAUSED (owner 2026-09-26; blueprint stands)** — Windows 11 WebView2 wrapper (10a skeleton → 10b static server → 10c CI → 10d integration test) — design/local-deployment.md §Target 1, design/ci-build.md |

## Completed (most recent 5; older history lives in git log)

| Task |
|------|
| **TTS on-demand read-aloud (TODO #23, 2026-09-30)** — dual engine: **Kokoro-82M v1.0 ONNX** (Path A: self-written flow-matching pipeline on the app's own ort 4.2.0, `src/lib/tts/{vocab,kokoro,audio,engine,tts-model-cache}.ts`; int64 `input_ids` + `(1,256)` style + `(1,)` speed → single forward → 24 kHz PCM) + **Web Speech API** (local voices only, opt-in); **automatic language routing** (EN → Kokoro when cached, auto-fallback to Web Speech on failure; non-EN → Web Speech — no manual engine switch, removed per owner); Settings → Model tab → TTS block (toggle + voice + dtype pickers + download/clear, `tts:kokoro`/`tts:voice` cache keys, cancel on unmount); **fp32 = the only usable WebGPU dtype** (owner A/B, Metal 3: fp16 mechanical, q4f16/q8f16 hang forever); stop always works (generation counter cancels in-flight load/decode); wasm footprint unchanged (asyncify 22.48 + jsep 24.89 MiB); co-resident with Hy-MT2 (no OOM) — design/tts.md |
| **Release + settings/layout polish (2026-09-30)** — settings tabs `General | Model` (Model = former “Inference”, renamed; TTS block moved there), tab order fixed + last-opened tab persisted (`translate:settingsTab`), type scale (row labels body1 16 px / section titles 16 px-600), page locked to `100vh` (header/footer fixed, input/output/history columns scroll independently, history drawer `overflow-y-auto`), `scripts/deploy-pages.mjs` wrangler-stderr fix (stdio pipe so “project already exists” is detected); **`main` = `a4da154`** pushed to all 3 remotes; deployed: CF Pages PROD (`translate.avpclub.eu.org`), HF Space (git clone + hash verified), GH Pages (workflow), Docker image (GHA `main` push → GHCR + Codeberg + Release) — design/deployment.md, design/ui-ux.md |
| **Public static hosts (TODO #9+24+25, 2026-09-29)** — all three live: **Cloudflare Pages** (`scripts/deploy-pages.mjs`; TEST `translate-test-9u0.pages.dev`, PROD `translate-4j9.pages.dev` + custom domain `translate.avpclub.eu.org`; wrangler 4.x `--force` static-Pages flag, CNAME + Google-CA TLS auto-issued), **GitHub Pages** (`pages.yml` workflow; `basePath=/translate` via `NEXT_BASE_PATH`; `build_type: workflow` enabled via API; `lawlietr.github.io/translate/`), **HF Space** (public static, `huggingface.co/spaces/lawlietr/translate`; `hf` CLI 2.0.0, pre-built `out/` + frontmatter `app_file: index.html`, same-origin model downloads) — design/deployment.md |
| **Docker deployment (TODO #11, 2026-09-29)** — multi-stage `Dockerfile` (`build:export` + wasm < 25 MiB gate → `nginx:alpine` + `apk add openssl`), nginx SPA-fallback + dual 80/443, first-boot self-signed cert entrypoint (D3 mode 2), compose (8080/8443 + cert volume + healthcheck); **all builds in GitHub Actions** (runner can't do arm64) → `main` push publishes amd64+arm64 to **both** `ghcr.io` + `codeberg.org` + GitHub Release, `DEV` push = CI check; amd64 verified on runner (HTTP/HTTPS/SPA/wasm/cert); **owner's real-browser LAN WebGPU acceptance PASSED** (`https://192.168.1.12:8443`); GHA `main` run published amd64+arm64 to both registries + Release `v2026.09.29-0df78d9`; runner leftovers cleaned — design/local-deployment.md, design/ci-build.md |
| **Translation history (TODO #27, owner spec 2026-09-28)** — left drawer (squeeze layout, full-height sticky) below the translation block; 100-entry localStorage store with dedupe-by-text+pair + 2,000-char gate + success-only; single/multi-select/clear-all deletion (shared confirm dialog); click-to-restore (text + output + both language selects); Settings → General → Privacy block above Diagnostics ("never record" switch + delete-all with count); drawer open state persists (`translate:historyOpen`, written only in the explicit toggle — StrictMode pitfall); history state refreshes when Settings closes; 12/12 Playwright regression on the production export — design/history.md, design/ui-ux.md |
| Activity-log sticky-bottom autoscroll (owner 2026-09-28) — follows new lines while view is at bottom (8 px tolerance), pauses on manual scroll-up, resumes on scroll-to-bottom; `followRef` (no re-render on scroll) + post-render `useEffect` on `lines` — design/ui-ux.md §Diagnostics |
| Three visual layers (owner 2026-09-28) — header `py-4` + hairline `border-b`; new `AppFooter` pinned to viewport bottom (`min-h-screen` + `flex-1` content wrapper) with **AGPL-3.0 → GNU official** + privacy line (2 i18n keys × 4 locales); redundant in-block "nothing leaves this device" caption removed (5 keys, 94 total); `<html lang>` follows UI language (server default zh-TW, client sync post-hydration); header GitHub icon now links to the repo (`GITHUB_REPO_URL`); timer terminal-value stale-closure bug fixed (local `started` const) — design/ui-ux.md, design/i18n.md |

