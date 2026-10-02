# TODO

## Pending

### P0

| # | Task |
|---|------|
| 30 | **Image translation — upload image → VLM reads + translates** (owner scope 2026-10-02; NO camera / live AR / video): port **LFM2.5-VL-450M** (808,759,577 B) + **LFM2.5-VL-3B** (3,999,475,483 B) ONNX from `what-do-you-see` (same 4.2.0 vision stack; sizes re-verified live from HF 2026-10-02); two-part result `{source_text, translation}` → output box (history + TTS free); memory mode resident (default) / swap (batched) — WebGPU OOM = fatal device loss, explicit switch; optional models, Settings → Manage models; **gated on owner A/B: CJK quality, VRAM co-residency, reload cycle** — design/image-translate.md |

### P2

| # | Task |
|---|------|
| 13 | **GitHub Actions CI/CD (Docker + GH Pages done 2026-09-29):** `main` push → Docker (amd64+arm64 → GHCR + Codeberg + Release) + GH Pages (static export → `lawlietr.github.io/translate/`); `DEV` push → Docker CI check. **Remaining:** exe workflow (D5, paused with #10); optional — auto-deploy CF Pages (`scripts/deploy-pages.mjs` exists; needs CF token in secrets) + HF Space (build+`hf upload`, `HF_TOKEN` **already in the repo secrets** 2026-09-29) on `main` push — design/ci-build.md, design/deployment.md |

### P3

| # | Task |
|---|------|
| 18 | vLLM provider (reserved — **do NOT implement before WebGPU + llama-server are verified working in a real browser**): thin reuse of the llama-server client + same prompt profiles; verify vLLM browser CORS behavior first — design/inference-providers.md |
| 29 | llama.cpp WebGPU provider (reserved — **awareness only, owner 2026-10-02; no implementation without explicit go-ahead**): llama.cpp's in-browser WebGPU backend (WASM via Emscripten + emdawnwebgpu, GGUF models) as a candidate third backend — decode +45–69 % vs Transformers.js, peak memory −29–33 %, but prefill weaker and the WASM size unverified against the CF 25 MiB cap; adoption gates (stability / wasm size / CI toolchain / GGUF verification) — design/inference-providers.md §llama.cpp WebGPU (reserved) |
| 10a–10d | **PAUSED (owner 2026-09-26; blueprint stands)** — Windows 11 WebView2 wrapper (10a skeleton → 10b static server → 10c CI → 10d integration test) — design/local-deployment.md §Target 1, design/ci-build.md |

## Completed (most recent 5; older history lives in git log)

| Task |
|------|
| **Floating-glyphs drifting script background (owner 2026-10-02)** — webgpu landing only (never the translation workspace): 10 deterministic glyphs covering the 8 supported languages (`A ü ß é ç ñ 文 译 あ 한`), modular placement, transform-only CSS drift 11–20 s (`@keyframes glyph-floaty`, staggered negative delays), 8–12 % alpha per theme, container `absolute` + `pointer-events: none` behind content (`z-0` vs content `z-10`), `prefers-reduced-motion` → static, SSR-deterministic (no `Math.random`) — `src/components/landing-glyphs.tsx` + `globals.css`; reference: index-translate.bilibili.com; verified headless (Playwright: count / anim / reduced-motion / both themes; a baseline stash test isolated a pre-existing dev-mode hydration mismatch, unrelated to this feature) — **deployed to all 4 targets: CF PROD (`translate.avpclub.eu.org`) + HF Space (local `/out` build + `hf upload`), GH Pages + Docker (via `main` push → GHA)** — design/ui-ux.md §Floating glyphs, design/model-landing.md |
| **Landing visual polish — ambient glow + card restyle (owner 2026-10-01)** — modeled on `Mako987/MiniCPM5-2B-WebGPU-Chat` (the landing's original reference): (1) static **ambient radial glow** on the landing root — two overlapping radial gradients, centers off-screen (`50% -10%` / `80% 110%`), `ch`-sized, title-gradient endpoints at low alpha (dark `0.16`/`0.12`, light darker stops at `0.10`); (2) info cards restyled in the reference's **surface-elevation language** — dark `rgba(255,255,255,0.04)` lift (no shadow) / light white + faint shadow, `borderRadius` 8→14 px, monospace values, **accent-green Privacy value** (`#7ed9a2`/`#1f8a55`); no hover (non-interactive), no per-card hairlines (reference restraint); single file `model-landing.tsx` — **deployed to all targets: CF TEST + PROD (`--prod`, owner request), HF Space (clone + md5 verified), GH Pages + Docker (via `main` push → GHA)** — design/ui-ux.md §Landing visual language, design/model-landing.md |
| **Brand color system + landing CTA (owner 2026-10-01)** — single accent source from the title gradient: MUI `primary.main` = first stop (dark `#ff6b57` / light `#d64530`, one theme line recolors TRANSLATE/settings switches/history select/focus rings — “Plan A”); landing primary button = full title gradient (white text, `brightness(1.08)` hover, neutral-gray disabled); landing secondary buttons = middle stop (`#ffd9a0`/`#b97a1e`); footer links (model → HF, **Transformers.js → GitHub as a link**) = Material cyan (`#4dd0e1`/`#0097a7`); `footerBuiltWith` split into prefix/suffix (non-translated proper noun); **MUI v9 pitfall: bare `sx` colors lose to `.MuiButton-contained` specificity** — `&.MuiButton-contained` / `&.MuiLink-root` nested selectors required (caught via screenshot); design/ui-ux.md §Brand color system; **deployed to all 4 targets: CF PROD (`translate.avpclub.eu.org`, new-string verified) + HF Space (clone + new-string verified, RUNNING) + GH Pages + Docker (via `main` push → GHA)**; local test services 3443 (HTTPS proxy) + 3001 (`serve out`) killed |
| **Landing → permanent top block (owner 2026-10-01)** — webgpu landing no longer a full-screen gate: always-rendered top block (gradient title never collapses); translation block (`100vh`) renders below it only after in-session load (memory-only, refresh resets) + auto-scroll down; per-model `cachedModelIds` drives the button — cached → “Load model” (skips download, warms directly) / uncached → “Download model (size)”; `recheck()` on Settings close; 12 Playwright checks on the production export (8 render + 4 seeded-cache label) + 7/7 download-phase file list under a spoofed WebGPU — design/model-landing.md |
| **First-run model landing (TODO #28, 2026-10-01)** — full-screen gate when no WebGPU *translation* model is fully cached (TTS excluded): gradient title + info cards (Model/Size/Privacy) + primary download button (per-file progress, cancel/resume) + in-place warm-up phase + secondary buttons (`Use llama-server instead` → Settings Model tab, `Choose model` inline picker); 3-state `use-model-ready` hook (checking → landing → ready) gates the app root; `warmUpWebGpuModel` reuses the shared pipeline loader; 19 i18n keys × 4 locales; amends rule 2 (two download entry points now share `model-cache.ts`) — 29/29 Playwright regression on the production export — design/model-landing.md |


