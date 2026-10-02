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
├──────────────────────────────────────────────────────────┤
│ AGPL-3.0 (→ gnu.org) · local inference, text never leaves device│
└──────────────────────────────────────────────────────────┘
```

Three visual layers (owner 2026-09-28): **header** (`py-4` + `border-b` hairline, theme `divider` color) / **content** (`flex-1`) / **footer** (AGPL-3.0 license link → GNU official + privacy line, `text-xs` muted). The header previously had only `pt-4` and touched the translation block.

**Locked viewport (owner 2026-09-30):** the page is `100vh` / `min-h-0` / `overflow-hidden` — header and footer are fixed, the middle row is `flex-1`, and **each column scrolls independently** (`overflow-y-auto`): input box, output box, and the history drawer (the drawer previously pushed the whole page to grow and scroll as one — fixed by giving it its own scroll).


## Header right cluster (owner spec, 2026-09-21)

Order, left → right: **UI language dropdown → theme toggle → GitHub icon → ⚙ Settings**.

- **Theme toggle (`◐`):** dark is the DEFAULT; icon switches dark↔light (MUI `DarkModeOutlined`/`LightModeOutlined`); choice persisted in localStorage, applied via MUI `ThemeProvider` mode + `class` on `<html>` so Tailwind dark styles follow. No first-paint flash (default dark = no FOUC concern).
- **GitHub icon (`🐙`):** links to the repo via the single URL constant `GITHUB_REPO_URL` in `src/lib/site.ts` (owner 2026-09-28: set to `https://github.com/Lawlietr/translate`; opens in a new tab, `rel="noreferrer"`). Empty string reverts it to the disabled reserved placeholder automatically — the render branch on the constant is already in place.

- **Mobile:** single column — input on top, output below; swap button between.
- **Language pickers:** source + target, sensible defaults (zh-TW / en), swap button exchanges them and the text. A fixed list of major languages (en, zh-TW, zh-CN, ja, ko, fr, de, es, …) — these map to the instruction line, NOT to UI translation. (Source auto-detection is out of scope for v1; the models don't do reliable detection.)
- **Status footer:** active model name + GPU backend always visible (see design/webgpu-knowledge.md §6).

## States

| State | UI |
|-------|-----|
| No model downloaded | Output pane shows a call-to-action: "Choose & download a model in Settings" + button |
| Model loading (first run) | Spinner + "Loading model into WebGPU — first run compiles shaders, can take minutes" |
| Translating | Button-right status text (load/generate stages) + **live elapsed timer (0.1 s precision)**; ⏹ cancels (AbortController on generation) |
| Finished (success OR cancelled) | Status text **cleared** (never leaves a stale "generating" behind); the **final elapsed time persists** (precise terminal value, 0.1 s) until the next translation starts |
| Error (fp16 fallback / OOM / loop) | Clear error box with the actionable hint (e.g. "this model is too large for your GPU memory — switch to the smaller model in Settings") |

## Settings dialog

**Implemented 2026-09-22** — `settings-dialog.tsx` (opened from the header ⚙, Material close/X icon with `aria-label`) + `use-app-settings.tsx` (context over `settings-manager.ts`, so every pane re-renders on change). **Every change applies and persists to localStorage immediately** (no Apply button, no draft state) — tab switch keeps both tabs mounted (`display: none`) so in-flight download progress and test results survive. **Tab bar = `General | Model`** (renamed from `Inference | General` on 2026-09-30, owner: General left, Model right). The last-opened tab is persisted (`translate:settingsTab`); first-ever open defaults to General.

- **Model tab** (former Inference): backend selector (WebGPU [default] / llama-server — `ProviderSelector` pattern) + the active backend's config block + **the TTS read-aloud block** (toggle + system-voice picker + Kokoro voice/dtype pickers + download/clear — design/tts.md; moved here from General 2026-09-30):
  - WebGPU block: current model card, "Manage models" (download dialog: per-model size, per-file progress, speed, cancel — see design/webgpu-knowledge.md §2), model switch (downloaded → instant), clear cache, WebGPU support warnings (1:1 port of what-do-you-see `WebGPUSettings.tsx`)
  - llama-server block: baseUrl (`/v1` auto), **model = `Autocomplete` (freeSolo)** — dropdown auto-fetches `GET {baseUrl}/models` on open + explicit "Detect models" button, free typing kept (1:1 port of what-do-you-see ModelField), optional apiKey; **connection test button** → success lists detected models, failure shows reason incl. the **`--cors-origins '*'`** hint (owner-corrected 2026-09-22 — the old "without `--no-cors`" hint was wrong; design/inference-providers.md)
- General tab: **Privacy block (TODO #27, above Diagnostics)** + **Diagnostics toggle** (switch, **off by default**). (UI language moved to the header cluster; default source/target live in the main page's language pickers — removed from Settings 2026-09-30.)
  - Privacy block: **"Never record" switch** (binds `settings.historyDisabled`, default OFF = recording on; helper text: stops NEW entries, existing history stays until manually deleted) + **"Delete all history (N)" button** (red outlined, disabled at 0, opens the shared `HistoryClearDialog` with the live count). N is read from `getHistory().length` on mount; the main page's drawer re-reads localStorage when the Settings dialog closes, so a delete-all here is reflected immediately without a reload (design/history.md)
  - Diagnostics on → the main page (`/`) shows the live activity log panel (translate stages, model load, fetches with status/timing, window errors) — the same logger the `/dev` harness uses, extracted to a shared module (`src/lib/activity-log.ts`) so both pages write to one log; the log panel reuses the harness's 100-line capped view
  - **Sticky-bottom autoscroll (owner 2026-09-28):** while the view is at the bottom (within 8px), new lines auto-scroll it to the latest entry; scrolling up manually pauses following (`followRef` flips false via `onScroll`), scrolling back to the bottom resumes it. Implemented in `activity-log-panel.tsx` as a post-render `useEffect` on `lines` (deterministic, runs after commit) — not `requestAnimationFrame` inside the poll tick
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

## Translation button + timer (owner refinement, 2026-09-26)

- **Button size:** the Translate / Cancel buttons render at a larger size (font ~1.25rem, extra padding) than MUI's default `contained`. **Both states must share the same size** — while translating the button is swapped in place (Translate → Cancel), so a size mismatch would make the button jump on click.
- **`formatDuration` gained a `decimals` parameter (default 0)** in `src/lib/model-cache.ts` — it is shared with the model-download progress UI (settings dialog), which keeps whole-second display; only the translation timer passes `decimals: 1`. Do not change the default: other call sites rely on it.
- **Timer lifecycle:** while translating, a 500 ms interval updates a live `elapsed` readout. On finish (success **and** cancel — owner decision 2026-09-26: cancelled runs keep their timer too), the timer stops and the displayed value switches to the **precise terminal value** (`Date.now() - startedAt`, 0.1 s) — the last interval tick can lag up to 500 ms and `Math.ceil` rounds up, so the terminal value is always computed fresh, never read from the ticker. The terminal value persists after completion (so the user can compare runs); the next `startTranslate` resets it to 0.
- **Stale status bug (fixed 2026-09-26):** `status` was only cleared at the start of a new translation, so the last provider stage ("generating · token N") stayed on screen after completion. The `.finally()` of the translate call now clears `status` — finished state = button + terminal timer only.
- **Stale-closure pitfall in `.finally()` (fixed 2026-09-28):** the terminal value originally read `startedAt` **from state inside the `.finally()` closure** — the closure captured the pre-click render, where it was always `null`, so the terminal timer silently never appeared (the live ticker worked because its interval closure is recreated by the effect). Fix: capture `const started = Date.now()` locally in `startTranslate` and use it in `.finally()`. General rule: anything a long-running promise's callbacks need must come from a **local const, not state** — state inside an un-updated closure is the value from the render that created the closure, forever.

## Brand color system (owner decision 2026-10-01)

Single source of truth for the app accent, derived from the landing title gradient (`#ff6b57 → #ffd9a0 → #7ed9a2` dark / `#d64530 → #b97a1e → #1f8a55` light):

| Element | Color |
|---------|-------|
| MUI theme `primary.main` (TRANSLATE button, settings switches, history select mode, focus rings — everything using `primary`) | gradient **first** stop: dark `#ff6b57` / light `#d64530` — set in `translation-app.tsx` `createTheme`, 2026-10-01 ("Plan A": one theme line recolors the whole app; landing gradient CTA stays the only gradient) |
| Landing primary button (Download/Load model) | full title gradient as `backgroundImage`, white text, `&:hover` = `brightness(1.08)`, disabled = neutral gray fill (no gradient) |
| Landing secondary text buttons (Choose model / Use llama-server) | gradient **middle** stop: dark `#ffd9a0` / light `#b97a1e` (hover kept, no MUI blue) |
| Footer links (model id → HF, Transformers.js → github.com/huggingface/transformers.js) | Material cyan: dark `#4dd0e1` / light `#0097a7` |
| Error/warning semantics | unchanged (`color="error"` red, success green) |

`footerBuiltWith` i18n key was split into `footerBuiltWithPrefix` + `footerBuiltWithSuffix` so the **Transformers.js** proper noun can render as a (non-translated) link in all 4 locales.

### Landing visual language (owner decision 2026-10-01, `model-landing.tsx`)

Modeled on `Mako987/MiniCPM5-2B-WebGPU-Chat` (same reference as the landing layout):

- **Ambient radial glow** on the landing root `Box` (static, no animation): two overlapping radial gradients in `sx.background` — top-center `at 50% -10%` and bottom-right `at 80% 110%`, both centers pushed OFF-SCREEN so only the glow tails are visible; sizes in `ch` (`70ch 50ch` / `60ch 40ch`) so they scale with type. Colors = title-gradient endpoints at low alpha: dark `rgba(255,107,87,0.16)` + `rgba(126,217,162,0.12)`; light uses the darker gradient stops (`#d64530`/`#1f8a55`) at `0.10` alpha (light backgrounds need darker, more subtle glows to avoid washing out contrast).
- **Info cards (Model/Size/Privacy)**: no shadow-based elevation in dark — surface lift via `rgba(255,255,255,0.04)` bg + 1px `divider` border (same surface-elevation approach as the reference's `#16191c`-on-`#0f1113`); light theme uses `rgba(255,255,255,0.7)` + faint shadow `0 1px 3px rgba(0,0,0,0.08)` (white has no "one step lighter"). `borderRadius` 14 px (reference's `--radius` token). Card VALUES in `monospace` (matches the download progress list). The **Privacy card value** ("100% local") is the only accent-colored card text: dark `#7ed9a2` / light `#1f8a55` (title-gradient green endpoint).
- Deliberately NOT done: hover-lift on the cards (they are non-interactive), per-card accent hairlines (over-decorated next to the reference's restraint).

### Floating glyphs (drifting script background) — implemented on DEV (pending owner review, not deployed)

Inspired by `index-translate.bilibili.com` (bilibili's Index-Translate model page) — a “floating glyphs / ambient typography” background: script characters drifting slowly behind the content. **Implemented 2026-10-02 on DEV exactly per this spec (`src/components/landing-glyphs.tsx` + `@keyframes glyph-floaty` in globals.css) — owner visual review pending; NOT pushed to main / not deployed (Pages / HF Space) until the owner confirms.**

**DEV-mode verification (2026-10-02, headless Chromium via Playwright MCP):** 10 glyphs render (`A ü ß é ç ñ 文 译 あ 한`), all animate `glyph-floaty` (11–20.2 s, staggered negative delays), container `absolute` + `pointer-events: none` + `z-index: 0`, content on `z-10`, `prefers-reduced-motion` → `animation: none` (static). **Known pre-existing dev-mode issue (NOT caused by this feature, verified by baseline stash test):** a hydration-mismatch error fires on every reload of the landing page in the MUI ThemeProvider tree — dev-only, will be re-checked against the production export before any deploy.

- **Scope (owner decision):** the **landing block only** — NOT the translation workspace. The input/output columns are for focused reading; even near-invisible background motion would compete with long-translation readability.
- **The existing static glow stays UNCHANGED** — only the glyphs layer is added (minimal change, keeps the current visual language). The reference's animated aurora blobs are out of scope for v1.
- **Placement:** `absolute` inside the landing root (NOT `position: fixed` — the reference's fixed layer spans its whole page, but our landing is a top block in document flow ABOVE the translation block; fixed would make the glyphs show through behind the workspace). `inset: 0` + `overflow: hidden` + `pointer-events: none`, z-index below the landing content.
- **Glyph set (our differentiator vs the reference):** glyphs come **only from the scripts of the 8 languages the app actually translates** (en/zh-TW/zh-CN/ja/ko/fr/de/es) — the reference uses a generic world set (Arabic/Cyrillic/Devanagari) our models don't translate. ~8–12 spans; candidate set `ß é ñ 文 译 あ 한` plus a few more Latin (final list is an implementation design choice; deliberate option: both 譯 and 译 — the traditional/simplified pair the app translates between).
- **Mechanics (port of the reference's proven pattern):** each span positioned with **deterministic** modular arithmetic (e.g. `left = 5 + (i×83) % 90 %`, `top = 8 + (i×137) % 82 %` — **no `Math.random()`**, so SSR HTML matches the client: no hydration mismatch, no pop-in). Font sizes 30–80 px, per-glyph duration 11–18 s, **negative** `animation-delay` (i × 1.7 s) so every glyph is mid-motion on load.
- **Animation:** one `@keyframes` — `translateY(-26px) rotate(3deg)`, `ease-in-out infinite alternate`. The “some glyphs look static, some drift” appearance is NOT two behaviors: `alternate` + ease-in-out rests each glyph at its endpoints, and with staggered delays/durations some glyphs are always at rest while others move mid-cycle.
- **Color:** cycle the three title-gradient endpoints per glyph (coral → sand → green) at low alpha — dark ≈ `0.07–0.09`, light ≈ `0.10` with the darker stops (same “darker, more subtle” rule as the glow above). Exact values tuned via screenshots (dark + light).
- **`prefers-reduced-motion`:** media query kills the animation — glyphs stay at their static positions. The reference does NOT do this; we do.
- **Performance:** transform-only animation → compositor-only (no layout/paint), ~12 spans — negligible, zero impact on WebGPU inference. No new dependencies. No i18n keys (no text).
- **Verification:** Playwright on the production export — glyphs layer renders the expected span count in both themes; clicks land on content through glyph positions (pointer-events none); `prefers-reduced-motion` emulation → static.
- **Files (expected, at implementation time):** `model-landing.tsx` (or a small dedicated `landing-glyphs.tsx`) + the keyframes in the landing's CSS — decided at implementation.

## History drawer (TODO #27, owner spec 2026-09-28)

**Implemented 2026-09-29** — full design in design/history.md (decisions A–F, store, pitfalls).

- **Entry point:** "Translation history" button directly below the translation block (same container, below the model/chips row); a slim history icon button in the header is NOT part of the design — the drawer is page-scoped
- **Squeeze layout:** the page content wrapper is a flex ROW; the drawer is a ~360 px `Paper` (left) and the translation block re-centers in the remaining space. The drawer spans **full height** between header and footer (flex wrapper + sticky top) — content-height looked half-cut on mac (owner fix `c45a784`)
- **Entries:** source → output with a two-tier color (source full, output secondary) + language-pair caption + timestamp; dedupe by text+pair (move-to-top), 100-entry cap, >2,000-char inputs and failed/cancelled translations are never recorded
- **Deletion trio:** hover trash = single delete (no confirm); checklist icon = multi-select mode (checkboxes, bottom bar "Delete selected (N)" / cancel); sweep icon = clear-all via the shared `HistoryClearDialog` (confirm with count; reused by Settings)
- **Click-to-restore (F):** in non-select mode a row click fills the translation area — `workspace.set({ text, output })` + both language selects synced via `update({ defaultSourceLang, defaultTargetLang })` (same shape as `swap()`); in select mode the row click toggles the checkbox; the trash button `stopPropagation`s
- **Open state persists** in `translate:historyOpen` — read post-mount (hydration-safe), **written only in the explicit toggle handler** (a write-on-change effect breaks under StrictMode double-mount — design/history.md §Pitfalls)
- **Settings refresh:** the page's history state re-reads localStorage whenever the Settings dialog closes (deps: `settingsOpen`), so Settings' delete-all is visible in the drawer immediately

## Implementation notes (deviations / pitfalls)

- **Model row — now in Settings (since #6):** `/` used to carry a model row above the panes while Settings didn't exist; it moved into the Inference tab verbatim (picker + size + downloaded chip + Download/Cancel with streamed progress — same `prefetchModel` pipeline as `/dev`). **Deviation from the original spec:** there is NO separate "Manage models" sub-dialog — the model row IS the management UI (one row, inline), matching what the main page already had; Clear cache is per-model (`clearWebGpuModelCache(modelId)` deletes only that model's HF cache entries, not the whole cache) with a clearing state and a cache re-check afterwards.
- **llama-server Test connection:** fetches `GET {baseUrl}/models` directly from the browser (client-side, same origin rules as inference); success lists the detected models, failure shows the reason incl. the `--api --host 0.0.0.0` hint for LAN testing (design/inference-providers.md).
- **MUI v9 Select: never pass a Fragment as child.** `React.Children`-based value matching skips Fragment nodes (`SelectInput.mjs` logs "doesn't accept a Fragment as a child" in dev, and in production the value silently never matches) → the dropdown renders empty and selecting an item never updates the display. Language options must be a plain `map()` array.
- **MUI v9 `sx` color specificity (2026-10-01):** a bare `sx={{ color, backgroundColor, backgroundImage }}` on a `Button`/`Link` is LOSEable — MUI's `.MuiButton-contained.MuiButton-containedPrimary` (two-class) selector outranks the generated single-class `.css-xxx` rule when it appears later in the stylesheet, so the accent silently stays MUI blue (caught via screenshot: gradient button rendered blue). Fix: nest under the variant class — `sx={{ "&.MuiButton-contained": { ... } }}` (same for `&.MuiLink-root`) — the composite selector ties/outranks and the override sticks. Verified with headless screenshots (dark + light).
- **Hydration-safe client state (2026-09-22):** anything read from localStorage/window at render time is a hydration-mismatch source (SSR renders defaults, client renders stored values → "Hydration failed" dev overlay + client-side tree regeneration). `AppSettingsProvider` therefore initializes with `defaultSettings()` for BOTH server and first client render (identical paint), loads stored settings in a post-mount effect, and only persists once `hydrated` — a naive post-mount load + unconditional save-on-mount is NOT StrictMode-safe: dev's double effect mount lets the initial save overwrite stored settings between the two load invocations, silently resetting them to defaults (caught with a `Storage.prototype.setItem` trace 2026-09-22). The WebGPU error alert is additionally gated on `!gpu.checking` so the SSR HTML never contains the error before the check has run (webgpu-knowledge.md §3 — an unhydrated SSR shell showing that alert fakes "browser has no WebGPU"). `useThemeMode` already reads post-mount, but its mount-time WRITE still resets a stored light theme to dark on every reload under dev StrictMode — TODO #21, same fix pattern.

## Out of scope (v1)

- Speech input/output, document translation, auto-detect, glossaries, multiple concurrent requests, cloud API providers (OpenAI/Claude/…) — only WebGPU + user's local llama-server (design/inference-providers.md). (Translation history was out of scope for v1 but is now **done** — TODO #27 complete 2026-09-29: design/history.md, §History drawer above)
