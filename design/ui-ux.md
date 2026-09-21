# UI/UX — Google Translate clone

Single page, dark theme, MUI v9 + Tailwind v4. Text-only.

## Layout

```
┌──────────────────────────────────────────────────────────┐
│  Translate (logo)                          [⚙ Settings]  │
├──────────────────────────────────────────────────────────┤
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

- WebGPU tab: current model card, "Manage models" (download dialog: per-model size, per-file progress, speed, cancel — see design/webgpu-knowledge.md §2), model selection from downloaded models
- General tab: UI language (zh-TW / en), default source/target languages

## i18n

- UI strings via a small `t()` in `src/lib/i18n/` (zh-TW + en), persisted in localStorage — port the pattern from what-do-you-see
- **UI language and model instruction language are separate concerns** (webgpu-knowledge.md §5): the instruction to the model is always English; only the requested OUTPUT language changes

## Out of scope (v1)

- Speech input/output, document translation, auto-detect, glossaries, translation history, multiple concurrent requests
