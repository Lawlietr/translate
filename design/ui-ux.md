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
- **GitHub icon (`🐙`):** **reserved placeholder — there is no GitHub repo yet.** The icon is always rendered in its final position; until the repo URL is configured (single constant, e.g. in settings/site), it is non-interactive (no href, disabled cursor + aria-label from i18n). When the repo lands: set the constant, done — no layout move.

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

- **Inference tab:** backend selector (WebGPU [default] / llama-server — `ProviderSelector` pattern) + the active backend's config block:
  - WebGPU block: current model card, "Manage models" (download dialog: per-model size, per-file progress, speed, cancel — see design/webgpu-knowledge.md §2), model switch (downloaded → instant), clear cache, WebGPU support warnings (1:1 port of what-do-you-see `WebGPUSettings.tsx`)
  - llama-server block: baseUrl (`/v1` auto), model (blank = auto-detect from `GET /v1/models`), optional apiKey; **connection test button** → success lists detected models, failure shows reason incl. the `--no-cors` hint (see design/inference-providers.md)
- General tab: UI language (zh-TW / en), default source/target languages

## i18n

- UI strings via a small `t()` in `src/lib/i18n/` (zh-TW + en), persisted in localStorage — port the pattern from what-do-you-see
- **UI language and model instruction language are separate concerns** (webgpu-knowledge.md §5): the instruction to the model is always English; only the requested OUTPUT language changes

## Implementation notes (deviations / pitfalls)

- **Model row on the main page (until #6):** the dev box needs model selection + download before Settings exists, so `/` carries a model row above the panes (picker + size + downloaded chip + Download/Cancel with streamed progress — same `prefetchModel` pipeline as `/dev`). It moves into the Settings dialog when #6 lands.
- **MUI v9 Select: never pass a Fragment as child.** `React.Children`-based value matching skips Fragment nodes (`SelectInput.mjs` logs "doesn't accept a Fragment as a child" in dev, and in production the value silently never matches) → the dropdown renders empty and selecting an item never updates the display. Language options must be a plain `map()` array.

## Out of scope (v1)

- Speech input/output, document translation, auto-detect, glossaries, translation history, multiple concurrent requests, cloud API providers (OpenAI/Claude/…) — only WebGPU + user's local llama-server (design/inference-providers.md)
