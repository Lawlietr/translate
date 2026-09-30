# First-run model landing (TODO #28)

Status: **design only — not implemented** (owner 2026-09-30)

A full-screen first-run gate: before any WebGPU translation model is fully cached, the app shows a landing page (big gradient title + one prominent download button) instead of the translation UI. Modeled on `Mako987/MiniCPM5-2B-WebGPU-Chat` (screenshots in `/tmp/translate/`), adapted to this project's two-backend design.

## Why

Today a first-time visitor lands straight on the translation UI with no model cached. Their first "Translate" click fails with "download it first (Settings → Manage models)" — the download path is buried in Settings. The reference project's landing makes the one-time cost (a ~1.3 GB download) explicit *before* the UI, and turns the mandatory wait into a designed moment (per-file progress, warm-up). Same privacy pitch, same single-user decision.

## Gate (when the landing shows)

New hook `src/hooks/use-model-ready.ts` → status `checking | landing | ready`:

| Condition | Result |
|-----------|--------|
| `settings.backend === "llama-server"` | `ready` immediately (no local model needed) |
| `backend === "webgpu"` AND any `WEBGPU_MODELS` model is fully cached (`cachedModelState`) | `ready` |
| `backend === "webgpu"` AND nothing fully cached | `landing` |
| cache check in flight (a few hundred ms) | `checking` — minimal centered spinner, not the full landing |

- **Translation models only.** The gate iterates `WEBGPU_MODELS` (model-catalog.ts). The Kokoro TTS model (`tts:kokoro` cache key, managed in Settings → Model tab) is **excluded** — it is optional, lazy, and never blocks entry (owner decision 2026-09-30).
- **Partial cache** → `landing`, with the model that has the most cached bytes preselected; the download resumes (already-cached files are skipped by `downloadModelFiles`).
- Re-evaluates when settings change (e.g. user switches to llama-server from the landing → landing unmounts, main UI appears).

`translation-app.tsx` wraps the existing `AppShell` (header/footer/SettingsDialog) with the gate: `landing` renders `<ModelLanding />` full-screen **instead of** the shell; `ready` renders the shell exactly as today.

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

### Secondary buttons (owner decision 2026-09-30)

1. **`Use llama-server instead`** — opens the Settings dialog on the **Model** tab (where llama-server endpoint config lives). If the user configures an endpoint and sets the backend to llama-server, the gate re-evaluates → main UI. This is the escape hatch for users whose GPU is weak or who refuse the 1.3 GB download.
2. **`Choose model`** — inline mini-picker (Q2-A): toggles a small list of `VISIBLE_WEBGPU_MODELS` (name + size); selecting one changes the primary button's target and label (size updates). No navigation to Settings.

### WebGPU unavailable

`use-webgpu.ts` already returns `supported` + `secureContext`. If unsupported (or not a secure context): primary download button disabled with a clear message (browser doesn't support WebGPU / HTTPS required), and the llama-server path is the highlighted option. The download button is disabled — downloading would succeed but the model could never run.

## Phases (single component, state machine)

`src/components/model-landing.tsx` — phases `idle → downloading → warming → ready`, plus `error` reachable from `downloading`/`warming`.

### 1. idle
Layout above. Primary button starts the download.

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

### 4. ready
`onReady()` → the gate flips to `ready` → main UI. No persistence key needed — "ready" is re-derived from the cache on every load (a few hundred ms).

## Files

| File | Change |
|------|--------|
| `src/components/model-landing.tsx` | **new** — landing (all phases) |
| `src/hooks/use-model-ready.ts` | **new** — gate hook |
| `src/components/translation-app.tsx` | wrap shell with the gate |
| `src/lib/providers/webgpu.ts` | export `warmUpWebGpuModel` (1-line wrapper) |
| `src/lib/i18n/translations.ts` | new keys × 4 locales (en/zh-TW/ja/ko) |
| `AGENTS.md` | rule 2 amended (see below) |
| `src/lib/model-cache.ts` | **unchanged** (per-file progress is UI derivation) |

## Rule 2 amendment (AGENTS.md)

"The only download entry point is the Settings → Manage models dialog" becomes:

> **Never download a model implicitly.** Every download is user-initiated, via exactly two entry points: (a) the first-run **model landing** (the primary path — full-screen gate shown when no WebGPU translation model is fully cached), and (b) Settings → **Manage models** (manage/switch/delete/resume). Both share the same core (`model-cache.ts`, streaming + cancellable + partial-cache-aware). The TTS model is excluded from the landing gate (optional, managed in Settings). The inference path gates on a verified-complete cache and throws a clear "download it first" error when incomplete; `from_pretrained` (which silently fetches missing files from HF) only ever runs on a complete cache.

## Edge cases

1. **Refresh mid-download** → landing reappears, preselects the partially-cached model, resume (cached files skipped).
2. **WebGPU unsupported / non-secure context** → download button disabled + message; llama-server path highlighted.
3. **llama-server configured** → no landing, ever (until backend switched back to webgpu with no cache).
4. **Download fails (network)** → error phase, Retry, partial cache preserved.
5. **Warm-up fails** → error phase, Retry (load only).
6. **User picks the 4B model on the landing** → button/size/cards update; the 4B warm-up can take much longer — the indeterminate phase must not look frozen (status line from `loadPipeline`'s `onStatus`).
7. **Second visit, model cached** → landing never appears (gate = `ready` after the cache check).
8. **StrictMode double-effect** — the gate's cache check is idempotent; the download is user-initiated (button click), not effect-driven, so double-mount can't start two downloads.
9. **Dev vs production DOM** — verify with Playwright on the `build:export` output (dev ghost nodes), per rule 5; functional WebGPU check in the owner's real browser.

## DoD

- [ ] First run (no cache, webgpu backend): landing shows; tagline/title/cards/both secondary buttons render in all 4 locales + both themes
- [ ] Download: per-file rows track correctly (incl. instant-skip of cached files), speed + ETA sane, cancel works, resume after refresh works
- [ ] Warm-up: runs in place after download, main UI appears only after load succeeds; first translation reuses the warm pipeline (no second load)
- [ ] Gate: llama-server backend → no landing; cached model → no landing; TTS model state never affects the gate
- [ ] WebGPU-unsupported + non-secure-context states render the disabled-download message
- [ ] `build:export` clean; wasm check unchanged (no new runtime deps)
- [ ] Playwright regression on the production export (landing visible with empty cache; hidden with seeded cache)
- [ ] Owner's real browser: full idle → download → warm → translate pass (Metal 3)
