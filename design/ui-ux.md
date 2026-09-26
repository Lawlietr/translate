# UI/UX — Google Translate clone

Single page, **dark mode by default (light mode toggleable)**, MUI v9 + Tailwind v4. Text-only.

## Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Translate (logo)      [UI lang ▾][◐ theme][🐙 github][⚙ Settings] │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐   ┌────────────────────────┐  │
│ │ Source [lang ▾][🔁swap]│   │ Target [lang ▾]        │  │
│ │                        │   │                        │  │
│ │  (input textarea)      │ → │  (output, read-only)   │  │
│ │                        │   │                        │  │
│ │ …chars · [Translate][⏹]│   │ [📋 copy] · elapsed t   │  │
│ └────────────────────────┘   └────────────────────────┘  │
│  model: Hy-MT2-1.8B (WebGPU) · [Manage models]           │
└──────────────────────────────────────────────────────────┘
```

## Header right cluster (owner spec, 2026-09-21)

Order, left → right: **UI language dropdown → theme toggle → GitHub icon → ⚙ Settings**.

- **Theme toggle (`◐`):** dark is the DEFAULT; icon switches dark↔light (MUI `DarkModeOutlined`/`LightModeOutlined`); choice persisted in localStorage, applied via MUI `ThemeProvider` mode + `class` on `<html>` so Tailwind dark styles follow. No first-paint flash (default dark = no FOUC concern).
- **GitHub icon (`🐙`):** **reserved placeholder — the repo is private, so the icon stays non-interactive for now.** The repo exists (`git@github.com:Lawlietr/translate.git`, landed 2026-09-26) but is **private** (owner will make it public when the project is ready, alongside creating the `main` branch + README). The icon is always rendered in its final position; while the repo is private it is non-interactive (no href, disabled cursor + aria-label from i18n) — linking to a private repo is pointless for public visitors. When the repo goes public: set the single URL constant, done — no layout move.

- **Mobile:** single column — input on top, output below; swap button between.
- **Language pickers:** source + target, sensible defaults (zh-TW / en), swap button exchanges them and the text. A fixed list of major languages (en, zh-TW, zh-CN, ja, ko, fr, de, es, …) — these map to the instruction line, NOT to UI translation. (Source auto-detection is out of scope for v1; the models don't do reliable detection.)
- **Status footer:** active model name + GPU backend always visible (see design/webgpu-knowledge.md §6).

## States

| State | UI |
|-------|-----|
| No model downloaded | Output pane shows a call-to-action: "Choose & download a model in Settings" + button |
| Model loading (first run) | Spinner + "Loading model into WebGPU — first run compiles shaders, can take minutes" |
| Translating | Indeterminate progress + elapsed seconds; ⏹ cancels (AbortController on generation) |
| Error (fp16 fallback / OOM / loop) | Clear error box with the actionable hint (e.g. "this model is too large for your GPU memory — switch to the smaller model in Settings") |

## Settings dialog

**Implemented 2026-09-22** — `settings-dialog.tsx` (opened from the header ⚙, Material close/X icon with `aria-label`) + `use-app-settings.tsx` (context over `settings-manager.ts`, so every pane re-renders on change). **Every change applies and persists to localStorage immediately** (no Apply button, no draft state) — tab switch keeps both tabs mounted (`display: none`) so in-flight download progress and test results survive. Tab bar = Inference | General.

- **Inference tab:** backend selector (WebGPU [default] / llama-server — `ProviderSelector` pattern) + the active backend's config block:
  - WebGPU block: current model card, "Manage models" (download dialog: per-model size, per-file progress, speed, cancel — see design/webgpu-knowledge.md §2), model switch (downloaded → instant), clear cache, WebGPU support warnings (1:1 port of what-do-you-see `WebGPUSettings.tsx`)
  - llama-server block: baseUrl (`/v1` auto), **model = `Autocomplete` (freeSolo)** — dropdown auto-fetches `GET {baseUrl}/models` on open + explicit "Detect models" button, free typing kept (1:1 port of what-do-you-see ModelField), optional apiKey; **connection test button** → success lists detected models, failure shows reason incl. the **`--cors-origins '*'`** hint (owner-corrected 2026-09-22 — the old "without `--no-cors`" hint was wrong; design/inference-providers.md)
- General tab: UI language (zh-TW / en), default source/target languages, **Diagnostics toggle** (switch, **off by default**)
  - Diagnostics on → the main page (`/`) shows the live activity log panel (translate stages, model load, fetches with status/timing, window errors) — the same logger the `/dev` harness uses, extracted to a shared module (`src/lib/activity-log.ts`) so both pages write to one log; the log panel reuses the harness's 100-line capped view
  - Off (default) → zero logging on the main page (no fetch patching, no panel) — the privacy-first default; `/dev` keeps its own always-on log (it is the debug page)
  - Persisted in settings (`diagnostics: boolean`, default `false`)
  - **Implementation note:** the main page applies the toggle live (`translation-app` calls `setActivityLogEnabled` from settings; the fetch patch itself is installed once unconditionally and is a no-op logger while off — only *entries* are suppressed, keeping the patch/restore bookkeeping out of the render cycle)

## i18n

- UI strings via a small `t()` in `src/lib/i18n/` (zh-TW + en), persisted in localStorage — port the pattern from what-do-you-see
- **UI language and model instruction language are separate concerns** (webgpu-knowledge.md §5): the instruction to the model is always English; only the requested OUTPUT language changes

## Workspace persistence (input + output survive reload — TODO #22)

**Owner-requested 2026-09-23** — Google Translate parity: type a translation, reload the page, and both the source text and the last result are still there (the result is restored, so no re-inference is needed).

- **What persists:** source text + output text only. **Languages persist already** — the pane selectors bind straight to the settings fields `defaultSourceLang`/`defaultTargetLang` (see Settings dialog above), which `AppSettingsProvider` saves to `translate:settings` on every change; verified, no extra work.
- **Storage:** separate key `translate:workspace` with `JSON { text, output }` — deliberately NOT folded into `translate:settings`: settings has a normalize/validate pipeline (`loadSettings`) meant for config, while the workspace is two plain strings. Quota/privacy-mode errors are swallowed (same `try/catch` pattern as `saveSettings`) — a full localStorage must never break the page.
- **Restore is post-mount** (hydration-safe): SSR and the client's first render both show empty panes (no mismatch), then a mount effect loads the stored workspace — the exact `AppSettingsProvider`/`useThemeMode` pattern, StrictMode-safe (the load happens before the hydrated gate opens, so the double mount cannot clobber stored text with empty strings).
- **Save is debounced (~400 ms)** — one localStorage write per typing burst, not per keystroke. The pending timer is cancelled on unmount.
- **Clear button wipes storage too** (owner decision 2026-09-23): `clear()` resets the in-memory state AND `removeItem`s the key, so a reload after Clear does not resurrect the text (that would feel like a bug). A subsequent debounced save of the empty state is harmless (equivalent to absent).
- **Swap** composes naturally: it sets `text = output, output = ""`, and the debounced save persists exactly that.
- **Mid-translation reload:** the in-flight phase is never persisted — a reload lands in `idle` with whatever output was last completed. No special handling needed.
- **Not doing:** URL-fragment persistence (`#src=...|text`) — no sharing need in a local-only app, URL length limits, and the text would sit in the address bar; if "share a translation link" is ever wanted it is a separate feature.

## Implementation notes (deviations / pitfalls)

- **Model row — now in Settings (since #6):** `/` used to carry a model row above the panes while Settings didn't exist; it moved into the Inference tab verbatim (picker + size + downloaded chip + Download/Cancel with streamed progress — same `prefetchModel` pipeline as `/dev`). **Deviation from the original spec:** there is NO separate "Manage models" sub-dialog — the model row IS the management UI (one row, inline), matching what the main page already had; Clear cache is per-model (`clearWebGpuModelCache(modelId)` deletes only that model's HF cache entries, not the whole cache) with a clearing state and a cache re-check afterwards.
- **llama-server Test connection:** fetches `GET {baseUrl}/models` directly from the browser (client-side, same origin rules as inference); success lists the detected models, failure shows the reason incl. the `--api --host 0.0.0.0` hint for LAN testing (design/inference-providers.md).
- **MUI v9 Select: never pass a Fragment as child.** `React.Children`-based value matching skips Fragment nodes (`SelectInput.mjs` logs "doesn't accept a Fragment as a child" in dev, and in production the value silently never matches) → the dropdown renders empty and selecting an item never updates the display. Language options must be a plain `map()` array.
- **Hydration-safe client state (2026-09-22):** anything read from localStorage/window at render time is a hydration-mismatch source (SSR renders defaults, client renders stored values → "Hydration failed" dev overlay + client-side tree regeneration). `AppSettingsProvider` therefore initializes with `defaultSettings()` for BOTH server and first client render (identical paint), loads stored settings in a post-mount effect, and only persists once `hydrated` — a naive post-mount load + unconditional save-on-mount is NOT StrictMode-safe: dev's double effect mount lets the initial save overwrite stored settings between the two load invocations, silently resetting them to defaults (caught with a `Storage.prototype.setItem` trace 2026-09-22). The WebGPU error alert is additionally gated on `!gpu.checking` so the SSR HTML never contains the error before the check has run (webgpu-knowledge.md §3 — an unhydrated SSR shell showing that alert fakes "browser has no WebGPU"). `useThemeMode` already reads post-mount, but its mount-time WRITE still resets a stored light theme to dark on every reload under dev StrictMode — TODO #21, same fix pattern.

## Out of scope (v1)

- Speech input/output, document translation, auto-detect, glossaries, translation history, multiple concurrent requests, cloud API providers (OpenAI/Claude/…) — only WebGPU + user's local llama-server (design/inference-providers.md)
