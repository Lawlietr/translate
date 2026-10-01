# TODO

## Pending

### P0

_(none — #23 TTS done 2026-09-30, see Completed)_

### P2

| # | Task |
|---|------|
| 13 | **GitHub Actions CI/CD (Docker + GH Pages done 2026-09-29):** `main` push → Docker (amd64+arm64 → GHCR + Codeberg + Release) + GH Pages (static export → `lawlietr.github.io/translate/`); `DEV` push → Docker CI check. **Remaining:** exe workflow (D5, paused with #10); optional — auto-deploy CF Pages (`scripts/deploy-pages.mjs` exists; needs CF token in secrets) + HF Space (build+`hf upload`, `HF_TOKEN` **already in the repo secrets** 2026-09-29) on `main` push — design/ci-build.md, design/deployment.md |

### P3

| # | Task |
|---|------|
| 18 | vLLM provider (reserved — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md |
| 10a–10d | **PAUSED (owner 2026-09-26; blueprint stands)** — Windows 11 WebView2 wrapper (10a skeleton → 10b static server → 10c CI → 10d integration test) — design/local-deployment.md §Target 1, design/ci-build.md |

## Completed (most recent 6; older history lives in git log)

| Task |
|------|
| **Brand color system + landing CTA (owner 2026-10-01)** — single accent source from the title gradient: MUI `primary.main` = first stop (dark `#ff6b57` / light `#d64530`, one theme line recolors TRANSLATE/settings switches/history select/focus rings — “Plan A”); landing primary button = full title gradient (white text, `brightness(1.08)` hover, neutral-gray disabled); landing secondary buttons = middle stop (`#ffd9a0`/`#b97a1e`); footer links (model → HF, **Transformers.js → GitHub as a link**) = Material cyan (`#4dd0e1`/`#0097a7`); `footerBuiltWith` split into prefix/suffix (non-translated proper noun); **MUI v9 pitfall: bare `sx` colors lose to `.MuiButton-contained` specificity** — `&.MuiButton-contained` / `&.MuiLink-root` nested selectors required (caught via screenshot); design/ui-ux.md §Brand color system; **deployed to all 4 targets: CF PROD (`translate.avpclub.eu.org`, new-string verified) + HF Space (clone + new-string verified, RUNNING) + GH Pages + Docker (via `main` push → GHA)**; local test services 3443 (HTTPS proxy) + 3001 (`serve out`) killed |
| **Landing → permanent top block (owner 2026-10-01)** — webgpu landing no longer a full-screen gate: always-rendered top block (gradient title never collapses); translation block (`100vh`) renders below it only after in-session load (memory-only, refresh resets) + auto-scroll down; per-model `cachedModelIds` drives the button — cached → “Load model” (skips download, warms directly) / uncached → “Download model (size)”; `recheck()` on Settings close; 12 Playwright checks on the production export (8 render + 4 seeded-cache label) + 7/7 download-phase file list under a spoofed WebGPU — design/model-landing.md |
| **First-run model landing (TODO #28, 2026-10-01)** — full-screen gate when no WebGPU *translation* model is fully cached (TTS excluded): gradient title + info cards (Model/Size/Privacy) + primary download button (per-file progress, cancel/resume) + in-place warm-up phase + secondary buttons (`Use llama-server instead` → Settings Model tab, `Choose model` inline picker); 3-state `use-model-ready` hook (checking → landing → ready) gates the app root; `warmUpWebGpuModel` reuses the shared pipeline loader; 19 i18n keys × 4 locales; amends rule 2 (two download entry points now share `model-cache.ts`) — 29/29 Playwright regression on the production export — design/model-landing.md |
| **TTS on-demand read-aloud (TODO #23, 2026-09-30)** — dual engine: **Kokoro-82M v1.0 ONNX** (Path A: self-written flow-matching pipeline on the app's own ort 4.2.0, `src/lib/tts/{vocab,kokoro,audio,engine,tts-model-cache}.ts`; int64 `input_ids` + `(1,256)` style + `(1,)` speed → single forward → 24 kHz PCM) + **Web Speech API** (local voices only, opt-in); **automatic language routing** (EN → Kokoro when cached, auto-fallback to Web Speech on failure; non-EN → Web Speech — no manual engine switch, removed per owner); Settings → Model tab → TTS block (toggle + voice + dtype pickers + download/clear, `tts:kokoro`/`tts:voice` cache keys, cancel on unmount); **fp32 = the only usable WebGPU dtype** (owner A/B, Metal 3: fp16 mechanical, q4f16/q8f16 hang forever); stop always works (generation counter cancels in-flight load/decode); wasm footprint unchanged (asyncify 22.48 + jsep 24.89 MiB); co-resident with Hy-MT2 (no OOM) — design/tts.md |
| **Release + settings/layout polish (2026-09-30)** — settings tabs `General | Model` (Model = former “Inference”, renamed; TTS block moved there), tab order fixed + last-opened tab persisted (`translate:settingsTab`), type scale (row labels body1 16 px / section titles 16 px-600), page locked to `100vh` (header/footer fixed, input/output/history columns scroll independently, history drawer `overflow-y-auto`), `scripts/deploy-pages.mjs` wrangler-stderr fix (stdio pipe so “project already exists” is detected); **`main` = `a4da154`** pushed to all 3 remotes; deployed: CF Pages PROD (`translate.avpclub.eu.org`), HF Space (git clone + hash verified), GH Pages (workflow), Docker image (GHA `main` push → GHCR + Codeberg + Release) — design/deployment.md, design/ui-ux.md |
| **Public static hosts (TODO #9+24+25, 2026-09-29)** — all three live: **Cloudflare Pages** (`scripts/deploy-pages.mjs`; TEST `translate-test-9u0.pages.dev`, PROD `translate-4j9.pages.dev` + custom domain `translate.avpclub.eu.org`; wrangler 4.x `--force` static-Pages flag, CNAME + Google-CA TLS auto-issued), **GitHub Pages** (`pages.yml` workflow; `basePath=/translate` via `NEXT_BASE_PATH`; `build_type: workflow` enabled via API; `lawlietr.github.io/translate/`), **HF Space** (public static, `huggingface.co/spaces/lawlietr/translate`; `hf` CLI 2.0.0, pre-built `out/` + frontmatter `app_file: index.html`, same-origin model downloads) — design/deployment.md |

