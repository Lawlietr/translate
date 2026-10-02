# Model landing (TODO #28)

Status: **implemented** (2026-10-01); **2026-10-01: converted from a full-screen gate to a permanent top block** (owner) — landing always visible in webgpu mode, translation block renders below it after in-session load. Playwright on the production export (8/8 + seeded-cache 4/4 + 7/7 download-phase file list under a spoofed WebGPU); owner's real-browser pass of the load flow still pending (Metal 3)

In webgpu mode the app shows a landing block at the top on **every** page load — big gradient title (never collapsed), one prominent load/download button. After the user loads a model (download + warm-up, or warm-up only if already cached), the translation UI (a full `100vh` block) renders **below** the landing in document flow — the page scrolls naturally; scrolling up reveals the landing's loaded state. Refresh → back to the landing-only state (session-load is memory-only). Modeled on `Mako987/MiniCPM5-2B-WebGPU-Chat` (screenshots in `/tmp/translate/`), adapted to this project's two-backend design.

## Why

Today a first-time visitor lands straight on the translation UI with no model cached. Their first "Translate" click fails with "download it first (Settings → Manage models)" — the download path is buried in Settings. The reference project's landing makes the one-time cost (a ~1.3 GB download) explicit *before* the UI, and turns the mandatory wait into a designed moment (per-file progress, warm-up). Same privacy pitch, same single-user decision.

## Visibility (when the landing shows — 2026-10-01 owner change)

The full-screen gate is gone: the landing is a **permanent top block in webgpu mode** — visible on every load, the gradient title never collapses (owner wants the reference site's "perfectly flush" feel: landing on top, translation below, natural page scroll). It is only ever hidden when the backend is llama-server.

`src/hooks/use-model-ready.ts` → returns `{ checking, cachedModelIds, preselectModelId, recheck }`:

| Condition | Result |
|-----------|--------|
| `settings.backend === "llama-server"` | landing not rendered at all (translation UI only); `cachedModelIds` stays empty |
| `backend === "webgpu"` | landing always rendered at the top; button label is per-model — fully cached → **Load model**, not cached → **Download model (size)** |
| cache check in flight (a few hundred ms) | `checking` — button shows “Checking…” and is disabled; the rest of the landing renders normally |

- `cachedModelIds` = per-model `Set<string>` of fully-cached `WEBGPU_MODELS` (each via `cachedModelState`) — not a single gate flag: the landing needs per-model state to label the button of the *selected* model.
- **Translation models only.** The check iterates `WEBGPU_MODELS` (model-catalog.ts). The Kokoro TTS model (`tts:kokoro` cache key, managed in Settings → Model tab) is **excluded** — it is optional, lazy, and never blocks entry (owner decision 2026-09-30).
- **Partial cache** → that model is *not cached* → “Download model”; preselect = the model with the most cached bytes; the download resumes (already-cached files are skipped by `downloadModelFiles`).
- `recheck()` re-runs the cache check — `translation-app.tsx` calls it when Settings closes (e.g. after the user downloaded/cleared a model in Manage models) so the button label updates.

`translation-app.tsx`: in webgpu mode it renders `<ModelLanding />` **always**, then renders the translation block (the former `AppShell` layout: header + TranslationPage + footer, locked to `100vh`) only when `sessionLoaded && cachedModelIds.size > 0`. `sessionLoaded` is in-memory state set by `onLoaded` after warm-up succeeds — **lost on refresh**. When the block appears, the app `scrollIntoView`s down to it; scrolling up reveals the landing's loaded state (intentional — “not discoverable unless you scroll up”). The landing is keyed on `cached/none` so a recheck that flips cache state remounts it fresh.

## Landing layout (mirrors the reference, our branding)

Dark and light themes both supported (reference is dark-only). MUI + Tailwind v4.

```
RUNS ON YOUR GPU · NOTHING IS SENT TO A SERVER     ← letter-spaced uppercase tagline (i18n)
Translate                                          ← giant gradient title (bg-clip-text)
A multilingual translator that runs entirely in
your browser — nothing you type ever leaves.       ← subtitle
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   MODEL     │ │    SIZE     │ │  PRIVACY    │   ← 3 info cards
│ Hy-MT2 1.8B │ │ ~1.29 GB    │ │ 100% local  │     (values from model-catalog.ts)
└─────────────┘ └─────────────┘ └─────────────┘
        [ Download model (~1.29 GB) ]              ← primary, large accent Button
        Use llama-server instead  ·  Choose model  ← secondary text buttons
Weights: <HF repo link> · Built with Transformers.js   ← footer links (i18n)
```

- Gradient: coral → sand → green in dark mode; an analogous readable variant in light mode. `bg-clip-text text-transparent bg-gradient-to-r`.
- Title = app name `Translate` (we have no model-brand hero like "MiniCPM5-2B"; the model name lives in the MODEL card).
- **Ambient radial glow + card surface language (2026-10-01)**: two off-center radial-gradient glows on the landing root (title-gradient endpoints, low alpha, `ch`-sized — see design/ui-ux.md §Landing visual language for exact values); the 3 info cards use surface lift (dark `rgba(255,255,255,0.04)` / light white + faint shadow), 14 px radius, monospace values, and an accent-green Privacy value. No hover effects (cards are non-interactive).
- **Floating glyphs (implemented on DEV 2026-10-02, pending owner review, not deployed):** a drifting-script background layer on top of the (still static) glow — **landing only, never the translation workspace**, glyph set restricted to the app's 8 supported languages, `prefers-reduced-motion` → static. Implemented per spec (`src/components/landing-glyphs.tsx` + `@keyframes glyph-floaty`); full spec + verification status: design/ui-ux.md §Floating glyphs.

### Secondary buttons (owner decision 2026-09-30)

1. **`Use llama-server instead`** — opens the Settings dialog on the **Model** tab (where llama-server endpoint config lives). If the user configures an endpoint and sets the backend to llama-server, the gate re-evaluates → main UI. This is the escape hatch for users whose GPU is weak or who refuse the 1.3 GB download.
2. **`Choose model`** — inline mini-picker (Q2-A): toggles a small list of `VISIBLE_WEBGPU_MODELS` (name + size); selecting one changes the primary button's target and label (size updates). No navigation to Settings.

### WebGPU unavailable

`use-webgpu.ts` already returns `supported` + `secureContext`. If unsupported (or not a secure context): primary download button disabled with a clear message (browser doesn't support WebGPU / HTTPS required), and the llama-server path is the highlighted option. The download button is disabled — downloading would succeed but the model could never run.

## Phases (single component, state machine)

`src/components/model-landing.tsx` — phases `idle → downloading → warming → loaded`, plus `error` reachable from `downloading`/`warming`. (The former `ready` phase is `loaded`: the landing no longer unmounts — it stays on top with a success alert.)

### 1. idle
Layout above. Primary button label: `Checking…` (disabled, cache check in flight) / **`Load model`** (selected model fully cached) / **`Download model (size)`** (not cached). Cached → `startLoad()` (skips the download entirely, warms directly — `downloadModelFiles` is never called); not cached → `start()` (download → warm-up).

### 2. downloading
- Primary button → disabled `Downloading…` (label i18n).
- **Per-file progress list** (the reference's signature element): each `ModelFile` gets a row — monospace path on the left, `done`/percent on the right, thin gradient bar below.
- Overall line: `formatBytes(loaded) / formatBytes(total)` + speed (`formatBytes(speedBps)/s`) + ETA (`formatDuration`).
- **No core changes** — per-file state is *derived in the UI*: the landing calls `listModelFiles(modelId, patterns)` **itself** and passes that exact array to `downloadModelFiles(modelId, files, onProgress, signal)` (NOT `prefetchModel`, which would list files again — same order in practice, but passing one array removes any mismatch risk). Keep a running cursor: file *i* owns byte range `[cumStartᵢ, cumStartᵢ+sizeᵢ)`; given the global `loaded` from `DownloadProgress`, current file = first where `cumEnd > loaded`, per-file percent = `(loaded − cumStart)/size`. Already-cached files are skipped instantly by `downloadModelFiles` (it reports `doneBytes += size` without fetching) → their rows snap to `done` in the same tick.
- Cancel: `AbortController` (core already supports `signal`); partial cache stays; button returns to idle (resume).
- **error** phase: message + `Retry` button (resumes from partial cache). Never a white screen.

### 3. warming (owner decision Q3-B)
After the last file lands, the landing does NOT exit — it warms up in place:
- `Warming up…` monospace line + indeterminate progress (first WebGPU run compiles shaders — minutes on modest GPUs; rule 3).
- Implementation: new export in `src/lib/providers/webgpu.ts`:
  `export async function warmUpWebGpuModel(modelId: string, onStatus?: (s: string) => void): Promise<void>` — a thin wrapper over the existing private `loadPipeline(modelId, onStatus)` (result stays in the `pipelines` Map → the first translation reuses it, no second load).
- VRAM note: the pipeline stays resident after `ready` — intended (that's the point: first translation is instant). Co-residency with the later Kokoro TTS load was verified in #23 (no OOM).
- **error** phase here too (shader-compile/load failure): message + `Retry` (files are cached — retry re-runs only the load).

### 4. loaded
`onLoaded()` → the translation block renders **below** the landing (the landing itself stays, button back to idle). A success alert (`landing.ready`) shows on the landing. No persistence key — cached state is re-derived from the cache on every load (a few hundred ms); the session-load flag is memory-only (refresh → landing-only again).

## Files

| File | Change |
|------|--------|
| `src/components/model-landing.tsx` | landing (all phases; `loaded` phase; cached → Load button, `startLoad` skips download) |
| `src/hooks/use-model-ready.ts` | per-model `cachedModelIds` + `preselectModelId` + `recheck()` (2026-10-01: no more 3-state gate) |
| `src/components/translation-app.tsx` | landing always on top; translation block below after in-session load; scroll-down on appear; `recheck()` on Settings close |
| `src/lib/providers/webgpu.ts` | export `warmUpWebGpuModel` (1-line wrapper) |
| `src/lib/i18n/translations.ts` | new keys × 4 locales (en/zh-TW/ja/ko) |
| `AGENTS.md` | rule 2 amended (see below) |
| `src/lib/model-cache.ts` | **unchanged** (per-file progress is UI derivation) |

## Rule 2 amendment (AGENTS.md)

"The only download entry point is the Settings → Manage models dialog" becomes:

> **Never download a model implicitly.** Every download is user-initiated, via exactly two entry points: (a) the **model landing** — a **permanent top block in webgpu mode** (always visible, the gradient title never collapses; button reads *Load model* when the selected model is fully cached / *Download model* otherwise; the translation block renders below it only after in-session load, memory-only, refresh resets; the TTS model is excluded, it's optional and managed in Settings), and (b) Settings → **Manage models** (manage/switch/delete/resume). Both share the same core (`model-cache.ts`, streaming + cancellable + partial-cache-aware). The inference path gates on a verified-complete cache and throws a clear "download it first" error when incomplete; `from_pretrained` (which silently fetches missing files from HF) only ever runs on a complete cache.

## Edge cases

1. **Refresh mid-download** → landing reappears (it always does), preselects the partially-cached model, “Download model”, resume (cached files skipped).
2. **WebGPU unsupported / non-secure context** → download button disabled + message; llama-server path highlighted.
3. **llama-server configured** → no landing, ever (until backend switched back to webgpu with no cache).
4. **Download fails (network)** → error phase, Retry, partial cache preserved.
5. **Warm-up fails** → error phase, Retry (load only).
6. **User picks the 4B model on the landing** → button/size/cards update; the 4B warm-up can take much longer — the indeterminate phase must not look frozen (status line from `loadPipeline`'s `onStatus`).
7. **Second visit, model cached** → landing appears with **Load model** (warm-up only, no download); the translation block appears after the click.
8. **Refresh after a successful load** → landing-only again (session-load is memory-only) — intentional; the owner re-clicks Load (warm pipeline still resident in the module-scope `pipelines` Map, so the second warm-up is fast).
9. **StrictMode double-effect** — the cache check is idempotent; the download/load is user-initiated (button click), not effect-driven, so double-mount can't start two downloads.
10. **Dev vs production DOM** — verify with Playwright on the `build:export` output (dev ghost nodes), per rule 5; functional WebGPU check in the owner's real browser.
11. **Cached model + user expects the file list** — the per-file list only renders in the `downloading` phase; `Load model` goes straight to `warming` (one indeterminate bar + status line). Owner confusion 2026-10-01: “only one progress bar” = the warming phase of an already-cached model, not a regression — the download-phase file list is byte-identical to the pre-change version and was re-verified 7/7 (headless, spoofed WebGPU).

## DoD

- [x] First run (no cache, webgpu backend): landing shows; tagline/title/cards/both secondary buttons render in all 4 locales + both themes (Playwright A1–A9, D, E)
- [ ] Download: per-file rows track correctly (incl. instant-skip of cached files), speed + ETA sane, cancel works, resume after refresh works — headless 7/7 file list + cancel verified under a spoofed WebGPU (2026-10-01); full-speed/ETA pass **pending owner's real browser** (1.3 GB download not feasible headless)
- [ ] Warm-up: runs in place after download, translation block appears below only after load succeeds; first translation reuses the warm pipeline (no second load) — **pending owner's real browser**
- [x] Landing visibility: webgpu → landing always on top; llama-server → no landing; TTS model state never affects it
- [x] Permanent block (2026-10-01): Playwright on the production export — 8/8 (landing renders on refresh; translation block hidden pre-load; WebGPU-unsupported state correct) + seeded-cache 4/4 (cached model → “Load model” label); per-file download list re-verified 7/7 (spoofed `navigator.gpu` init-script, real HF file list, partial download, cancel)
- [x] WebGPU-unsupported + non-secure-context states render the disabled-download message (A8)
- [x] `build:export` clean; wasm check unchanged (no new runtime deps)
- [x] Playwright regression on the production export (landing visible with empty cache; hidden with seeded cache) — 29/29
- [ ] Owner's real browser: full idle → load (cached + uncached) → block-below → translate pass (Metal 3)
