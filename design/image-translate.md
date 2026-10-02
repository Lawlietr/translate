# Image translation — upload an image → VLM reads + translates

**Status: PLANNED (owner scope decision 2026-10-02). NOT implemented.**
Implementation is gated on the owner's A/B validation in the real browser (§A/B plan) + explicit go-ahead.

**Scope (owner 2026-10-02, reduced from the camera proposal):** image UPLOAD only (file picker + drag-drop). **No camera, no `getUserMedia`, no live AR overlay, no video files** — all of those were explicitly dropped. Reference: Google Translate's photo/Lens *photo mode* only.

## Why VLM (route A)

Port the proven vision stack from the sibling project `what-do-you-see` (same host, same `@huggingface/transformers` **4.2.0** pin, same `model-cache.ts` download pattern). One inference does OCR + translation in a single VLM forward — no separate OCR pipeline, no new wasm, no new runtime.

Route B (dedicated OCR model, e.g. PP-OCRv5 ONNX → text → Hy-MT2) stays as the fallback if the A/B shows 450M CJK quality is poor OR the swap reload cycle is unacceptably slow.

## Models (sizes re-verified live from the HF tree API, 2026-10-02)

| Model ID | Size (matched files) | Files | dtype map | Notes |
|----------|---------------------|-------|-----------|-------|
| `LiquidAI/LFM2.5-VL-450M-ONNX` | **808,759,577 B (0.7532 GiB)** | 13 | `vision_encoder: fp16`, `embed_tokens: fp16`, `decoder_model_merged: q4` | default vision model; sibling-project measured ~10 s/image (owner Mac, WebGPU) |
| `LiquidAI/LFM2.5-VL-3B-ONNX` | **3,999,475,483 B (3.7248 GiB)** | 18 | same as 450M | optional higher-quality tier; expect 30–60 s/image (unmeasured) |

- `filePatterns` (both models, identical shape): `onnx/embed_tokens_fp16.onnx` + `_data(_N)` shards, `onnx/vision_encoder_fp16.onnx` + shards, `onnx/decoder_model_merged_q4.onnx` + shards, `*.json`, `*.jinja` — byte-for-byte equal to the sibling project's catalog values (re-verified against the live HF tree on 2026-10-02, both sums match to the byte).
- Meta files per repo: `chat_template.jinja`, `config.json`, `generation_config.json`, `preprocessor_config.json`, `processor_config.json`, `tokenizer.json`, `tokenizer_config.json`.
- **Qwen3.5-4B-ONNX is OUT of scope** — structurally slow on the ORT WebGPU EP (24 `If` + 16 `Range` nodes, no fused kernel; owner-measured 414–557 s/image in the sibling project, `design/webgpu-qwen-perf-tfjs43.md` over there). Do not port it.
- Both are **optional models**: managed in Settings → **Manage models** (download/delete), the same way the TTS model is — they do NOT appear on the landing block (rule 2).

## Chat template verification (rule 8 — read the actual `chat_template.jinja` from HF, 2026-10-02)

The 450M and 3B templates **differ** (3,836 B vs 5,436 B) but both:
- accept a leading **system** message (`messages[0].role == "system"` → rendered as the system block),
- accept user content as a **list** `[{ type: "image" }, { type: "text", text }]` → the image item renders as the `<image>` placeholder token,
- respect `add_generation_prompt`.

So the sibling project's exact message shape works for **both** models:

```
messages = [
  { role: "system", content: "<English instruction, rule 8>" },
  { role: "user",   content: [{ type: "image" }, { type: "text", text: "<English task + output-language line>" }] },
]
chatPrompt = processor.apply_chat_template(messages, { add_generation_prompt: true })
inputs     = processor(image, chatPrompt, { add_special_tokens: false })   // image FIRST for LFM2.5 (Qwen is the reverse — not used here)
outputs    = model.generate({ ...inputs, do_sample: false, max_new_tokens: 2048 })
text       = processor.batch_decode(outputs.slice(inputLength..), { skip_special_tokens: true })
```

Template vars `keep_past_thinking` / `preserve_thinking` / `continue_final_message` default to sane values — **no thinking switch needed** (that was Qwen-specific). `max_new_tokens: 2048` (rule 7 ceiling; 2048 instead of the sibling's 1536 because the two-part JSON answer is longer than a privacy analysis).

## Prompt profile (rule 8)

- System + user instructions **in English**, UI language never mixed in.
- Two-part output (owner-confirmed direction): `{"source_text": "<all visible text, verbatim, original language>", "translation": "<translation into {LanguageName}>"}` — the `source_text` part lets the user verify what the model actually read (recognition errors become visible).
- Trailing output-language line (the LFM2.5 loop-locking lesson from rule 8: English instruction + explicit trailing output-language line).
- Parse with a resilient JSON extractor (sibling's `parseAnalysisResilient` pattern) — small models occasionally wrap JSON in prose.

## Pipeline

1. Upload (picker / drag-drop): `image/jpeg|png|webp`
2. `browser-image-compression` (new npm dep, MIT, canvas-based, **no wasm**): max 3000 px, 0.5 MB, `preserveExif: false` (EXIF = GPS — privacy rule 10) — sibling's `compress.ts` defaults verbatim
3. `RawImage.from_blob` → processor → generate (single forward, non-autoregressive vision encoder + autoregressive decoder)
4. Decode → parse `{source_text, translation}`
5. `translation` goes into the **existing output box** → translation history and TTS read-aloud come for free (it's just text)

## Memory modes (OOM strategy)

WebGPU OOM is **device loss — fatal for the whole page's GPU context, not a catchable exception**. There is no "try both, fall back on OOM"; the mode is an explicit user switch:

| Mode | Behavior | For |
|------|----------|-----|
| **Resident (default)** | Hy-MT2 + selected vision model both stay loaded; recognize + translate back-to-back | ≥ 4 GB VRAM (TTS co-residency precedent: no OOM with the 82M model) |
| **Swap** | Unload translation model → load/recognize with VLM → unload VLM → reload translation model → translate | tight VRAM |

**Swap must be BATCHED, never per-image:** user uploads N images → VLM loaded once, recognizes all N → **one** swap → Hy-MT2 loaded once, translates all N. Rationale: a reload = weights H2D re-upload (1.29 GiB) + **shader recompilation** (the "loading phase" can take minutes, rule 3) — per-image swapping would cost as much as the inference itself; per-batch amortizes it to 2 reloads per batch.

Settings location: Model tab, a new "Memory mode" control (default `resident`). UI shows honest phase labels in swap mode: *Loading vision model → Recognizing (3/10) → Loading translation model → Translating*.

**Whether swap is even needed is an A/B outcome** (§below). If resident works on the owner's machine, V1 ships resident-only and swap is P2.

## Integration points (port map)

| New in translate | Modeled on (sibling) |
|------------------|----------------------|
| `src/lib/model-catalog.ts` — 2 vision entries (dtype map + `filePatterns` copied — same file sets) | `model-catalog.ts` `LFM2_5_VL_*` consts |
| `src/lib/providers/vision.ts` — `loadPipeline` (cache-gated `from_pretrained`, pipeline cache Map), `analyzeImage` (messages → template → processor → generate → decode) | `providers/webgpu.ts` |
| prompt profile module (per-model, English, two-part JSON) | `providers/system-prompt.ts` pattern |
| image compress helper | `compress.ts` |
| upload panel + preview + two-part result component | `PhotoUpload.tsx` patterns |
| Settings → Manage models: vision models list | existing TTS model management |

Unchanged: wasm footprint (4.2.0 stays pinned → no new wasm → CF 25 MiB cap untouched), privacy rule 10 (the image never leaves the browser), static-export-only builds.

## A/B plan (owner's real browser — SwiftShader on 12 is too slow, rule 5)

Three measurements decide the remaining design branches. The sibling project can run ① immediately with zero code changes (both models already catalogued there):

1. **CJK recognition quality** — the make-or-break. Photos/screenshots of text in zh-TW/zh-CN, ja, ko, en (signs, menus, documents): does 450M *read* the text accurately, and translate it correctly? 3B as comparison.
2. **VRAM co-residency** — DevTools GPU memory panel: (a) Hy-MT2 alone, (b) Hy-MT2 + 450M both resident, (c) after `dispose()` of the VLM. (c) < (b) confirms unload actually frees memory (swap is viable); (b) fitting without device loss confirms resident mode.
3. **Unload → reload cycle time** — full dispose + `from_pretrained` (from complete cache) of Hy-MT2: H2D + shader recompilation wall time. Sets the real cost number for swap mode.

**Branches:** ① poor CJK → route B (PP-OCR ONNX, ~10–20 MB, trivially co-resident) becomes the plan. ② resident OOMs → swap is V1-required. ③ reload cycle in minutes → swap UX gets batch-only + strong warning, or route B again.

## Out of scope (deliberately dropped, owner 2026-10-02)

- Camera / `getUserMedia` viewfinder
- Live AR text overlay (not feasible on browser WebGPU anyway: ~10 s/image floor)
- Video files / frame sampling / subtitles
- Quasi-live throttled camera refresh
- Qwen3.5-4B (WebGPU-EP structural slowness)
